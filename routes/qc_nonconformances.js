const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const where = [];
    if (req.query.order_id) {
      params.push(Number(req.query.order_id));
      where.push(`u.order_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`u.status = $${params.length}`);
    }
    const sql = `
      SELECT u.*, e.order_no, e.direction, s.item_code, s.item_name,
             r.reason_code AS ret_kodu, r.reason_name AS ret_adi
      FROM qc_nonconformances u
      JOIN qc_orders e ON e.id = u.order_id
      LEFT JOIN items s ON s.id = e.item_id
      LEFT JOIN qc_rejection_reasons r ON r.id = u.rejection_reason_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY u.id DESC
    `;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { order_id, rejection_reason_id, quantity, description, corrective_action } = req.body || {};
    if (!order_id) return res.status(400).json({ hata: 'order_id zorunlu.' });
    const r = await pool.query(
      `INSERT INTO qc_nonconformances (order_id, rejection_reason_id, quantity, description, corrective_action, status)
       VALUES ($1,$2,$3,$4,$5,'Acik') RETURNING *`,
      [order_id, rejection_reason_id || null, quantity || null, description || null, corrective_action || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rejection_reason_id, quantity, description, corrective_action, status } = req.body || {};
    const r = await pool.query(
      `UPDATE qc_nonconformances SET
         rejection_reason_id = COALESCE($2, rejection_reason_id),
         quantity = COALESCE($3, quantity),
         description = COALESCE($4, description),
         corrective_action = COALESCE($5, corrective_action),
         status = COALESCE($6, status)
       WHERE id=$1 RETURNING *`,
      [req.params.id, rejection_reason_id, quantity, description, corrective_action, status]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Uygunsuzluk bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
