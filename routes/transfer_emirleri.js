const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { trimOrNull } = require('../src/utils/tanimCrud');

async function emirGetir(id) {
  const e = await pool.query(
    `SELECT te.*,
            kd.depo_kodu AS kaynak_depo_kodu, kd.depo_adi AS kaynak_depo_adi,
            hd.depo_kodu AS hedef_depo_kodu, hd.depo_adi AS hedef_depo_adi
     FROM transfer_emirleri te
     JOIN depolar kd ON kd.id = te.kaynak_depo_id
     JOIN depolar hd ON hd.id = te.hedef_depo_id
     WHERE te.id = $1`,
    [id]
  );
  if (!e.rows[0]) return null;
  const satirlar = await pool.query(
    `SELECT ts.*, s.stok_kodu, s.stok_adi, s.birim AS stok_birimi
     FROM transfer_emri_satirlari ts
     JOIN stoklar s ON s.id = ts.stok_id
     WHERE ts.emir_id = $1 ORDER BY ts.id`,
    [id]
  );
  return { ...e.rows[0], satirlar: satirlar.rows };
}

function assertFirma(row, req) {
  const firmaId = firmaIdFromReq(req);
  if (firmaId && row.firma_id != null && Number(row.firma_id) !== Number(firmaId)) {
    return false;
  }
  return true;
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const where = ['1=1'];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`te.firma_id = $${params.length}`);
    }
    if (req.query.durum) {
      params.push(req.query.durum);
      where.push(`te.durum = $${params.length}`);
    }
    const liste = await pool.query(
      `SELECT te.id FROM transfer_emirleri te
       WHERE ${where.join(' AND ')} ORDER BY te.id DESC LIMIT 200`,
      params
    );
    const out = [];
    for (const r of liste.rows) out.push(await emirGetir(r.id));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const emir = await emirGetir(req.params.id);
    if (!emir || !assertFirma(emir, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    res.json(emir);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const kaynak = Number(req.body.kaynak_depo_id);
    const hedef = Number(req.body.hedef_depo_id);
    const satirlar = req.body.satirlar || [];
    if (!kaynak || !hedef) return res.status(400).json({ hata: 'kaynak_depo_id ve hedef_depo_id zorunlu.' });
    if (kaynak === hedef) return res.status(400).json({ hata: 'Kaynak ve hedef depo aynı olamaz.' });
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'TRANSFER_EMRI');
      const firmaId = firmaIdFromReq(req) || Number(req.body.firma_id) || null;
      const ins = await client.query(
        `INSERT INTO transfer_emirleri
            (emir_no, firma_id, is_yeri_id, kaynak_depo_id, hedef_depo_id,
             talep_tarihi, planlanan_tarih, aciklama, olusturan, durum)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8,$9,'Taslak')
         RETURNING id`,
        [
          no, firmaId, req.body.is_yeri_id || null, kaynak, hedef,
          req.body.talep_tarihi || null, req.body.planlanan_tarih || null,
          trimOrNull(req.body.aciklama),
          req.headers['x-kullanici-kodu'] || req.body.olusturan || null,
        ]
      );
      const emirId = ins.rows[0].id;
      for (const s of satirlar) {
        if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
        const stok = await client.query('SELECT birim FROM stoklar WHERE id=$1', [s.stok_id]);
        if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
        await client.query(
          `INSERT INTO transfer_emri_satirlari
              (emir_id, stok_id, miktar, birim, parti_id, raf_kodu, aciklama)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            emirId, s.stok_id, Number(s.miktar),
            s.birim || stok.rows[0].birim, s.parti_id || null,
            trimOrNull(s.raf_kodu), trimOrNull(s.aciklama),
          ]
        );
      }
      return emirId;
    });
    res.status(201).json(await emirGetir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const mevcut = await emirGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    if (mevcut.durum !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak emir düzenlenebilir.' });
    }
    await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE transfer_emirleri SET
            kaynak_depo_id = COALESCE($2, kaynak_depo_id),
            hedef_depo_id = COALESCE($3, hedef_depo_id),
            is_yeri_id = COALESCE($4, is_yeri_id),
            planlanan_tarih = COALESCE($5::date, planlanan_tarih),
            aciklama = COALESCE($6, aciklama)
         WHERE id=$1`,
        [
          req.params.id,
          req.body.kaynak_depo_id || null,
          req.body.hedef_depo_id || null,
          req.body.is_yeri_id || null,
          req.body.planlanan_tarih || null,
          trimOrNull(req.body.aciklama),
        ]
      );
      if (Array.isArray(req.body.satirlar)) {
        await client.query('DELETE FROM transfer_emri_satirlari WHERE emir_id=$1', [req.params.id]);
        for (const s of req.body.satirlar) {
          if (!s.stok_id || !s.miktar) throw new Error('Satırda stok_id ve miktar zorunlu.');
          await client.query(
            `INSERT INTO transfer_emri_satirlari
                (emir_id, stok_id, miktar, birim, parti_id, raf_kodu, aciklama)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              req.params.id, s.stok_id, Number(s.miktar), s.birim || null,
              s.parti_id || null, trimOrNull(s.raf_kodu), trimOrNull(s.aciklama),
            ]
          );
        }
      }
    });
    res.json(await emirGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

/** Onayla → kaynak depodan çıkış + hedef depoya giriş */
router.post('/:id/onayla', async (req, res, next) => {
  try {
    const sonuc = await withTransaction(pool, async (client) => {
      const lock = await client.query(
        `SELECT * FROM transfer_emirleri WHERE id=$1 FOR UPDATE`,
        [req.params.id]
      );
      const emir = lock.rows[0];
      if (!emir) {
        const e = new Error('Transfer emri bulunamadı.');
        e.status = 404;
        throw e;
      }
      if (emir.durum !== 'Taslak') {
        throw Object.assign(new Error(`Durum ${emir.durum}; yalnız Taslak onaylanır.`), { status: 400 });
      }
      const sat = await client.query(
        `SELECT * FROM transfer_emri_satirlari WHERE emir_id=$1`,
        [emir.id]
      );
      if (!sat.rows.length) throw new Error('Emirde satır yok.');

      const satirHazir = sat.rows.map((s) => ({
        stok_id: s.stok_id,
        miktar: Number(s.miktar),
        birim: s.birim,
        parti_id: s.parti_id,
        raf_kodu: s.raf_kodu,
      }));

      // Emir onayında stok_depo master zorunluluğu kalkar; yetersiz stok yine engellenir
      const cikis = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId: emir.is_yeri_id,
        depoId: emir.kaynak_depo_id,
        hedefDepoId: emir.hedef_depo_id,
        belgeTipi: 'TRANSFER_EMRI',
        belgeId: emir.id,
        aciklama: `Transfer emri ${emir.emir_no}`,
        satirlar: satirHazir.map((s) => ({ ...s, yon: -1 })),
        depoZorunluAtla: true,
      });
      const giris = await stokHareketOlustur(client, {
        hareketTipi: 'TRANSFER',
        isYeriId: emir.is_yeri_id,
        depoId: emir.hedef_depo_id,
        belgeTipi: 'TRANSFER_EMRI',
        belgeId: emir.id,
        bagliHareketId: cikis.hareket.id,
        aciklama: `Transfer emri ${emir.emir_no} (giriş)`,
        satirlar: satirHazir.map((s) => ({ ...s, yon: 1 })),
        depoZorunluAtla: true,
      });
      await client.query(
        `UPDATE stok_hareketleri SET bagli_hareket_id=$2, hedef_depo_id=$3 WHERE id=$1`,
        [cikis.hareket.id, giris.hareket.id, emir.hedef_depo_id]
      );

      const onaylayan = req.headers['x-kullanici-kodu'] || req.body.onaylayan || null;
      await client.query(
        `UPDATE transfer_emirleri SET
            durum='Tamamlandi',
            onay_tarihi=CURRENT_TIMESTAMP,
            onaylayan=$2,
            kaynak_hareket_id=$3,
            hedef_hareket_id=$4
         WHERE id=$1`,
        [emir.id, onaylayan, cikis.hareket.id, giris.hareket.id]
      );
      return emir.id;
    });
    res.json(await emirGetir(sonuc));
  } catch (err) {
    const status = err.status || (err.code === 'YETERSIZ_STOK' ? 400 : 500);
    res.status(status).json({
      hata: err.message,
      kod: err.code || undefined,
      detay: err.detay || undefined,
    });
  }
});

router.post('/:id/iptal', async (req, res, next) => {
  try {
    const mevcut = await emirGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    if (mevcut.durum !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak emir iptal edilebilir.' });
    }
    await pool.query(`UPDATE transfer_emirleri SET durum='Iptal' WHERE id=$1`, [req.params.id]);
    res.json(await emirGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const mevcut = await emirGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Transfer emri bulunamadı.' });
    }
    if (mevcut.durum !== 'Taslak' && mevcut.durum !== 'Iptal') {
      return res.status(400).json({ hata: 'Tamamlanmış emir silinemez.' });
    }
    await pool.query('DELETE FROM transfer_emirleri WHERE id=$1', [req.params.id]);
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
