const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const ulke = (req.query.ulke_kodu || 'TR').toUpperCase();
    const r = await pool.query(
      `
      SELECT vk.*,
        (SELECT oran FROM finans_vergi_oranlari vo
         WHERE vo.vergi_kod_id=vk.id
           AND vo.gecerlilik_baslangic<=CURRENT_DATE
           AND (vo.gecerlilik_bitis IS NULL OR vo.gecerlilik_bitis>=CURRENT_DATE)
         ORDER BY vo.gecerlilik_baslangic DESC LIMIT 1) AS oran
      FROM finans_vergi_kodlari vk
      WHERE vk.aktif AND vk.ulke_kodu=$1
      ORDER BY vk.vergi_kodu
      `,
      [ulke]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/oranlar', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM finans_vergi_oranlari WHERE vergi_kod_id=$1 ORDER BY gecerlilik_baslangic DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
