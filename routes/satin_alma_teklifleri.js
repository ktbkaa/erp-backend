const express = require('express');
const pool = require('../db');
const { createBelgeRouter } = require('./_belgeCrud');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

const router = createBelgeRouter({
  table: 'satin_alma_teklifleri',
  lineTable: 'satin_alma_teklif_satirlari',
  fk: 'teklif_id',
  noField: 'teklif_no',
  seri: 'SATINALMA_TEKLIF',
  notFound: 'Teklif bulunamadı.',
  allowedDurum: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'SipariseDonustu', 'Iptal', 'Kapali'],
  requireCari: true,
  linePrice: true,
  extraFields: ['istek_id', 'talep_id', 'gecerlilik_tarihi', 'durum', 'firma_id', 'is_yeri_id', 'para_birimi', 'kur'],
});

/**
 * Teklif onay — yalnızca Onaylı tekliften sipariş açılır
 * POST /satin-alma-teklifleri/:id/onayla
 */
router.post('/:id/onayla', async (req, res, next) => {
  try {
    const teklifId = Number(req.params.id);
    const r = await pool.query(
      `UPDATE satin_alma_teklifleri SET durum = 'Onayli'
       WHERE id = $1 AND durum IN ('Taslak','Acik')
       RETURNING id`,
      [teklifId]
    );
    if (!r.rows[0]) {
      const cur = await pool.query(`SELECT durum FROM satin_alma_teklifleri WHERE id = $1`, [teklifId]);
      if (!cur.rows[0]) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
      return res.status(409).json({ hata: `Teklif onaylanamaz. Durum: ${cur.rows[0].durum}` });
    }
    const row = await pool.query(
      `SELECT t.*, c.cari_kodu, c.cari_adi FROM satin_alma_teklifleri t
       JOIN cariler c ON c.id = t.cari_id WHERE t.id = $1`,
      [teklifId]
    );
    const satirlar = await pool.query(
      `SELECT ls.*, s.stok_kodu, s.stok_adi FROM satin_alma_teklif_satirlari ls
       JOIN stoklar s ON s.id = ls.stok_id WHERE ls.teklif_id = $1 ORDER BY ls.id`,
      [teklifId]
    );
    res.json({ ...row.rows[0], satirlar: satirlar.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Teklif → Satınalma siparişi (REQ-PUR-004 / P40)
 * POST /satin-alma-teklifleri/:id/siparise-donustur
 * Önkoşul: durum = Onayli
 */
router.post('/:id/siparise-donustur', async (req, res, next) => {
  try {
    const teklifId = Number(req.params.id);
    const siparisId = await withTransaction(pool, async (client) => {
      const t = await client.query(
        `SELECT * FROM satin_alma_teklifleri WHERE id = $1 FOR UPDATE`,
        [teklifId]
      );
      if (!t.rows[0]) throw Object.assign(new Error('Teklif bulunamadı.'), { status: 404 });
      if (t.rows[0].durum !== 'Onayli') {
        throw Object.assign(
          new Error(`Yalnızca onaylı teklif siparişe dönüştürülür. Durum: ${t.rows[0].durum}`),
          { status: 409 }
        );
      }
      const satirlar = await client.query(
        `SELECT * FROM satin_alma_teklif_satirlari WHERE teklif_id = $1 ORDER BY id`,
        [teklifId]
      );
      if (!satirlar.rows.length) throw Object.assign(new Error('Teklif satırı yok.'), { status: 400 });

      const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
      let toplam = 0;
      const sip = await client.query(
        `INSERT INTO satin_alma_siparisleri
          (siparis_no, cari_id, is_yeri_id, firma_id, teklif_id, durum, toplam_tutar, odeme_kosulu,
           kaynak_belge_tipi, kaynak_belge_id)
         VALUES ($1,$2,$3,$4,$5,'Onayli',0,$6,'SATINALMA_TEKLIF',$5) RETURNING id`,
        [
          no,
          t.rows[0].cari_id,
          t.rows[0].is_yeri_id || null,
          t.rows[0].firma_id || null,
          teklifId,
          req.body.odeme_kosulu || null,
        ]
      );
      const id = sip.rows[0].id;
      for (const s of satirlar.rows) {
        const fiyat = Number(s.birim_fiyat || 0);
        toplam += Number(s.miktar) * fiyat;
        await client.query(
          `INSERT INTO satin_alma_siparis_satirlari
            (siparis_id, stok_id, miktar, birim_fiyat, birim)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, s.stok_id, s.miktar, fiyat, s.birim || null]
        );
      }
      await client.query(
        `UPDATE satin_alma_siparisleri SET toplam_tutar = $1 WHERE id = $2`,
        [toplam, id]
      );
      await client.query(
        `UPDATE satin_alma_teklifleri SET durum = 'SipariseDonustu' WHERE id = $1`,
        [teklifId]
      );
      return id;
    });

    const row = await pool.query(
      `SELECT sas.*, c.cari_kodu, c.cari_adi FROM satin_alma_siparisleri sas
       JOIN cariler c ON c.id = sas.cari_id WHERE sas.id = $1`,
      [siparisId]
    );
    const satirlar = await pool.query(
      `SELECT ss.*, st.stok_kodu, st.stok_adi FROM satin_alma_siparis_satirlari ss
       JOIN stoklar st ON st.id = ss.stok_id WHERE ss.siparis_id = $1 ORDER BY ss.id`,
      [siparisId]
    );
    res.status(201).json({ ...row.rows[0], satirlar: satirlar.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
