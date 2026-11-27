const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.sales_order_id) {
      params.push(Number(req.query.sales_order_id));
      where.push(`r.sales_order_id = $${params.length}`);
    }
    if (req.query.item_id) {
      params.push(Number(req.query.item_id));
      where.push(`r.item_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`r.status = $${params.length}`);
    } else {
      where.push(`r.status = 'Aktif'`);
    }
    const r = await pool.query(
      `
      SELECT r.*, s.item_code, s.item_name, sp.order_no, d.warehouse_code
      FROM item_reservations r
      JOIN items s ON s.id = r.item_id
      LEFT JOIN sales_orders sp ON sp.id = r.sales_order_id
      LEFT JOIN warehouses d ON d.id = r.warehouse_id
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
