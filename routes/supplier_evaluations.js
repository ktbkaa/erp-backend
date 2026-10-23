const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      where.push(`t.partner_id = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT t.*, c.partner_code, c.partner_name
      FROM supplier_evaluations t
      JOIN partners c ON c.id = t.partner_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.id DESC
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { partner_id, period, kalite_puan, delivery_puan, fiyat_puan, grand_puan, description } = req.body || {};
    if (!partner_id || !period) return res.status(400).json({ hata: 'partner_id ve period zorunlu.' });
    const genel =
      grand_puan != null
        ? Number(grand_puan)
        : ((Number(kalite_puan) || 0) + (Number(delivery_puan) || 0) + (Number(fiyat_puan) || 0)) / 3;
    const r = await pool.query(
      `
      INSERT INTO supplier_evaluations
        (partner_id, period, kalite_puan, delivery_puan, fiyat_puan, grand_puan, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [partner_id, period, kalite_puan, delivery_puan, fiyat_puan, genel, description || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
