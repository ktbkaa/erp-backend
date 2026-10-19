const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.siparis_id) {
      params.push(Number(req.query.siparis_id));
      where.push(`r.siparis_id = $${params.length}`);
    }
    if (req.query.stok_id) {
      params.push(Number(req.query.stok_id));
      where.push(`r.stok_id = $${params.length}`);
    }
    if (req.query.durum) {
      params.push(req.query.durum);
      where.push(`r.durum = $${params.length}`);
    } else {
      where.push(`r.durum = 'Aktif'`);
    }
    const r = await pool.query(
      `
      SELECT r.*, s.stok_kodu, s.stok_adi, sp.siparis_no, d.depo_kodu
      FROM stok_rezervasyonlari r
      JOIN stoklar s ON s.id = r.stok_id
      LEFT JOIN siparisler sp ON sp.id = r.siparis_id
      LEFT JOIN depolar d ON d.id = r.depo_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.id DESC
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
