const express = require('express');
const router = express.Router();
const pool = require('../db');
const { cariEkstre, cariBakiye, cariHareketEkle } = require('../src/services/cariHareketService');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res, next) => {
  try {
    const cariId = req.query.cari_id ? Number(req.query.cari_id) : null;
    if (!cariId) {
      // UI liste: son hareketler
      const r = await pool.query(
        `SELECT h.*, c.cari_kodu, c.cari_adi
         FROM cari_hareketleri h
         JOIN cariler c ON c.id = h.cari_id
         ORDER BY h.id DESC LIMIT 200`
      );
      return res.json(r.rows);
    }
    const data = await cariEkstre(pool, cariId, {
      baslangic: req.query.baslangic || null,
      bitis: req.query.bitis || null,
    });
    // UI liste uyumu: hareketler dizisi
    res.json(data.hareketler || data);
  } catch (err) {
    next(err);
  }
});

router.get('/bakiye/:cariId', async (req, res, next) => {
  try {
    res.json(await cariBakiye(pool, Number(req.params.cariId)));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const row = await withTransaction(pool, (client) =>
      cariHareketEkle(client, {
        cariId: body.cari_id,
        yon: body.yon,
        tutar: body.tutar,
        paraBirimi: body.para_birimi,
        kur: body.kur,
        belgeTipi: body.belge_tipi,
        belgeId: body.belge_id,
        aciklama: body.aciklama,
        hareketTarihi: body.hareket_tarihi,
      })
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
