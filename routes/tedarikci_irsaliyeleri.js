/**
 * Tedarikçi irsaliyeleri — mal kabul kaynağı.
 * Açık/kısmi irsaliyeler seçilebilir; tamamen işlenenler listeden düşer.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function getir(id) {
  const t = await pool.query(
    `
    SELECT ti.*, c.cari_kodu, c.cari_adi, sas.siparis_no
    FROM tedarikci_irsaliyeleri ti
    JOIN cariler c ON c.id = ti.cari_id
    LEFT JOIN satin_alma_siparisleri sas ON sas.id = ti.siparis_id
    WHERE ti.id = $1
    `,
    [id]
  );
  if (!t.rows[0]) return null;
  const satirlar = await pool.query(
    `
    SELECT s.*, st.stok_kodu, st.stok_adi,
           (s.miktar - COALESCE(s.kabul_edilen,0)) AS kalan_miktar
    FROM tedarikci_irsaliye_satirlari s
    JOIN stoklar st ON st.id = s.stok_id
    WHERE s.irsaliye_id = $1
    ORDER BY s.id
    `,
    [id]
  );
  return { ...t.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`ti.firma_id = $${params.length}`);
    }
    if (req.query.cari_id) {
      params.push(Number(req.query.cari_id));
      where.push(`ti.cari_id = $${params.length}`);
    }
    if (req.query.siparis_id) {
      params.push(Number(req.query.siparis_id));
      where.push(`ti.siparis_id = $${params.length}`);
    }
    // varsayılan: yalnızca işlenebilir (Acik/Kismi)
    if (req.query.acik !== '0' && req.query.hepsi !== '1') {
      where.push(`ti.durum IN ('Acik','Kismi')`);
    }
    const sql = `
      SELECT ti.id FROM tedarikci_irsaliyeleri ti
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ti.id DESC`;
    const liste = await pool.query(sql, params);
    const sonuc = [];
    for (const r of liste.rows) sonuc.push(await getir(r.id));
    res.json(sonuc);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Tedarikçi irsaliyesi bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      cari_id, siparis_id, irsaliye_no, irsaliye_tarihi, aciklama, satirlar, is_yeri_id,
    } = req.body;
    if (!cari_id) return res.status(400).json({ hata: 'cari_id zorunlu.' });
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const firmaId = firmaIdFromReq(req);
    const id = await withTransaction(pool, async (client) => {
      let no = irsaliye_no;
      if (!no) no = await sonrakiBelgeNo(client, 'TEDARIKCI_IRSALIYE');
      const baslik = await client.query(
        `INSERT INTO tedarikci_irsaliyeleri
          (irsaliye_no, firma_id, is_yeri_id, cari_id, siparis_id, irsaliye_tarihi, aciklama, durum)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6,CURRENT_DATE),$7,'Acik') RETURNING id`,
        [no, firmaId, is_yeri_id || null, cari_id, siparis_id || null, irsaliye_tarihi || null, aciklama || null]
      );
      const docId = baslik.rows[0].id;
      for (const s of satirlar) {
        if (!s.stok_id || s.miktar == null) continue;
        await client.query(
          `INSERT INTO tedarikci_irsaliye_satirlari
            (irsaliye_id, siparis_satir_id, stok_id, miktar, birim, birim_fiyat, satir_aciklama)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            docId, s.siparis_satir_id || null, s.stok_id, s.miktar,
            s.birim || null, s.birim_fiyat ?? 0, s.satir_aciklama || null,
          ]
        );
      }
      return docId;
    });
    res.status(201).json(await getir(id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

module.exports = router;
