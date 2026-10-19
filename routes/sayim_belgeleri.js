const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, depoBakiyeListesi } = require('../src/services/stokHareketService');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { trimOrNull } = require('../src/utils/tanimCrud');

async function belgeGetir(id) {
  const b = await pool.query(
    `SELECT sb.*, d.depo_kodu, d.depo_adi
     FROM sayim_belgeleri sb
     JOIN depolar d ON d.id = sb.depo_id
     WHERE sb.id = $1`,
    [id]
  );
  if (!b.rows[0]) return null;
  const satirlar = await pool.query(
    `SELECT ss.*, s.stok_kodu, s.stok_adi, s.birim AS stok_birimi
     FROM sayim_belge_satirlari ss
     JOIN stoklar s ON s.id = ss.stok_id
     WHERE ss.belge_id = $1 ORDER BY ss.id`,
    [id]
  );
  return { ...b.rows[0], satirlar: satirlar.rows };
}

function assertFirma(row, req) {
  const firmaId = firmaIdFromReq(req);
  if (firmaId && row.firma_id != null && Number(row.firma_id) !== Number(firmaId)) return false;
  return true;
}

async function sistemBakiye(clientOrPool, depoId, stokId) {
  const bakiyeler = await depoBakiyeListesi(clientOrPool, {
    depoId,
    stokId,
    stokStatu: 'Kullanilabilir',
  });
  return bakiyeler.reduce((sum, b) => sum + Number(b.bakiye || 0), 0);
}

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const where = ['1=1'];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`sb.firma_id = $${params.length}`);
    }
    if (req.query.durum) {
      params.push(req.query.durum);
      where.push(`sb.durum = $${params.length}`);
    }
    if (req.query.depo_id) {
      params.push(Number(req.query.depo_id));
      where.push(`sb.depo_id = $${params.length}`);
    }
    const liste = await pool.query(
      `SELECT sb.id FROM sayim_belgeleri sb
       WHERE ${where.join(' AND ')} ORDER BY sb.id DESC LIMIT 200`,
      params
    );
    const out = [];
    for (const r of liste.rows) out.push(await belgeGetir(r.id));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const belge = await belgeGetir(req.params.id);
    if (!belge || !assertFirma(belge, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    res.json(belge);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const depoId = Number(req.body.depo_id);
    const satirlar = req.body.satirlar || [];
    if (!depoId) return res.status(400).json({ hata: 'depo_id zorunlu.' });
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'SAYIM_BELGE');
      const firmaId = firmaIdFromReq(req) || Number(req.body.firma_id) || null;
      const ins = await client.query(
        `INSERT INTO sayim_belgeleri
            (belge_no, firma_id, is_yeri_id, depo_id, sayim_tarihi, aciklama, olusturan, durum)
         VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6,$7,'Taslak')
         RETURNING id`,
        [
          no, firmaId, req.body.is_yeri_id || null, depoId,
          req.body.sayim_tarihi || null,
          trimOrNull(req.body.aciklama),
          req.headers['x-kullanici-kodu'] || req.body.olusturan || null,
        ]
      );
      const belgeId = ins.rows[0].id;
      for (const s of satirlar) {
        if (!s.stok_id) throw new Error('Satırda stok_id zorunlu.');
        const stok = await client.query('SELECT birim FROM stoklar WHERE id=$1', [s.stok_id]);
        if (!stok.rows[0]) throw new Error(`Stok bulunamadı: ${s.stok_id}`);
        let sistem = s.sistem_miktar;
        if (sistem == null || sistem === '') {
          sistem = await sistemBakiye(client, depoId, s.stok_id);
        }
        const sayilan = s.sayilan_miktar != null ? Number(s.sayilan_miktar) : Number(sistem);
        await client.query(
          `INSERT INTO sayim_belge_satirlari
              (belge_id, stok_id, sistem_miktar, sayilan_miktar, birim, parti_id, raf_kodu, aciklama)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            belgeId, s.stok_id, Number(sistem), sayilan,
            s.birim || stok.rows[0].birim, s.parti_id || null,
            trimOrNull(s.raf_kodu), trimOrNull(s.aciklama),
          ]
        );
      }
      return belgeId;
    });
    res.status(201).json(await belgeGetir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const mevcut = await belgeGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    if (mevcut.durum !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak belge düzenlenebilir.' });
    }
    await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE sayim_belgeleri SET
            aciklama = COALESCE($2, aciklama),
            sayim_tarihi = COALESCE($3::date, sayim_tarihi),
            is_yeri_id = COALESCE($4, is_yeri_id)
         WHERE id=$1`,
        [
          req.params.id,
          trimOrNull(req.body.aciklama),
          req.body.sayim_tarihi || null,
          req.body.is_yeri_id || null,
        ]
      );
      if (Array.isArray(req.body.satirlar)) {
        await client.query('DELETE FROM sayim_belge_satirlari WHERE belge_id=$1', [req.params.id]);
        for (const s of req.body.satirlar) {
          if (!s.stok_id) throw new Error('Satırda stok_id zorunlu.');
          let sistem = s.sistem_miktar;
          if (sistem == null || sistem === '') {
            sistem = await sistemBakiye(client, mevcut.depo_id, s.stok_id);
          }
          const sayilan = s.sayilan_miktar != null ? Number(s.sayilan_miktar) : Number(sistem);
          await client.query(
            `INSERT INTO sayim_belge_satirlari
                (belge_id, stok_id, sistem_miktar, sayilan_miktar, birim, parti_id, raf_kodu, aciklama)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              req.params.id, s.stok_id, Number(sistem), sayilan,
              s.birim || null, s.parti_id || null,
              trimOrNull(s.raf_kodu), trimOrNull(s.aciklama),
            ]
          );
        }
      }
    });
    res.json(await belgeGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

/** Onayla → fark kadar SAYIM hareketi (giriş veya çıkış) */
router.post('/:id/onayla', async (req, res, next) => {
  try {
    const sonuc = await withTransaction(pool, async (client) => {
      const lock = await client.query(
        `SELECT * FROM sayim_belgeleri WHERE id=$1 FOR UPDATE`,
        [req.params.id]
      );
      const belge = lock.rows[0];
      if (!belge) {
        throw Object.assign(new Error('Sayım belgesi bulunamadı.'), { status: 404 });
      }
      if (belge.durum !== 'Taslak') {
        throw Object.assign(new Error(`Durum ${belge.durum}; yalnız Taslak onaylanır.`), { status: 400 });
      }
      const sat = await client.query(
        `SELECT * FROM sayim_belge_satirlari WHERE belge_id=$1`,
        [belge.id]
      );
      const farkSatirlar = [];
      for (const s of sat.rows) {
        const fark = Number(s.sayilan_miktar) - Number(s.sistem_miktar);
        if (Math.abs(fark) < 0.0000001) continue;
        farkSatirlar.push({
          stok_id: s.stok_id,
          miktar: Math.abs(fark),
          birim: s.birim,
          parti_id: s.parti_id,
          raf_kodu: s.raf_kodu,
          yon: fark > 0 ? 1 : -1,
        });
      }
      let hareketId = null;
      if (farkSatirlar.length) {
        const hareket = await stokHareketOlustur(client, {
          hareketTipi: 'SAYIM',
          isYeriId: belge.is_yeri_id,
          depoId: belge.depo_id,
          belgeTipi: 'SAYIM_BELGE',
          belgeId: belge.id,
          aciklama: `Sayım ${belge.belge_no}`,
          satirlar: farkSatirlar,
          depoZorunluAtla: true,
        });
        hareketId = hareket.hareket.id;
      }
      const onaylayan = req.headers['x-kullanici-kodu'] || req.body.onaylayan || null;
      await client.query(
        `UPDATE sayim_belgeleri SET
            durum='Onayli',
            onay_tarihi=CURRENT_TIMESTAMP,
            onaylayan=$2,
            hareket_id=$3
         WHERE id=$1`,
        [belge.id, onaylayan, hareketId]
      );
      return belge.id;
    });
    res.json(await belgeGetir(sonuc));
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
    const mevcut = await belgeGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    if (mevcut.durum !== 'Taslak') {
      return res.status(400).json({ hata: 'Yalnız Taslak belge iptal edilebilir.' });
    }
    await pool.query(`UPDATE sayim_belgeleri SET durum='Iptal' WHERE id=$1`, [req.params.id]);
    res.json(await belgeGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const mevcut = await belgeGetir(req.params.id);
    if (!mevcut || !assertFirma(mevcut, req)) {
      return res.status(404).json({ hata: 'Sayım belgesi bulunamadı.' });
    }
    if (mevcut.durum === 'Onayli') {
      return res.status(400).json({ hata: 'Onaylı sayım silinemez.' });
    }
    await pool.query('DELETE FROM sayim_belgeleri WHERE id=$1', [req.params.id]);
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
