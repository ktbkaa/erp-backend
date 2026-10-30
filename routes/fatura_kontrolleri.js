const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.status || req.query.result) {
      params.push(req.query.status || req.query.result);
      where.push(`e.result = $${params.length}`);
    }
    if (req.query.invoice_id) {
      params.push(Number(req.query.invoice_id));
      where.push(`e.invoice_id = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT e.*, f.invoice_no, f.invoice_type, f.total_amount, c.partner_code, c.partner_name,
             mk.receipt_no, sas.order_no
      FROM invoice_matches e
      JOIN invoices f ON f.id = e.invoice_id
      LEFT JOIN partners c ON c.id = f.partner_id
      LEFT JOIN goods_receipts mk ON mk.id = e.goods_receipt_id
      LEFT JOIN purchase_orders sas ON sas.id = e.purchase_order_id
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
