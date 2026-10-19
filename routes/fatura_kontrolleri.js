const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.durum || req.query.sonuc) {
      params.push(req.query.durum || req.query.sonuc);
      where.push(`e.sonuc = $${params.length}`);
    }
    if (req.query.fatura_id) {
      params.push(Number(req.query.fatura_id));
      where.push(`e.fatura_id = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT e.*, f.fatura_no, f.fatura_turu, f.toplam_tutar, c.cari_kodu, c.cari_adi,
             mk.kabul_no, sas.siparis_no
      FROM fatura_eslestirme e
      JOIN faturalar f ON f.id = e.fatura_id
      LEFT JOIN cariler c ON c.id = f.cari_id
      LEFT JOIN mal_kabuller mk ON mk.id = e.mal_kabul_id
      LEFT JOIN satin_alma_siparisleri sas ON sas.id = e.siparis_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.id DESC
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
