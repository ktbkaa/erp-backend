const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.item_id) {
      params.push(Number(req.query.item_id));
      where.push(`sr.item_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`sr.status = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT sr.*, s.item_code, s.item_name, d.warehouse_code, p.lot_no
      FROM item_serials sr
      JOIN items s ON s.id = sr.item_id
      LEFT JOIN warehouses d ON d.id = sr.warehouse_id
      LEFT JOIN item_lots p ON p.id = sr.lot_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY sr.id DESC
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
    const { item_id, serial_no, lot_id, warehouse_id, status } = req.body || {};
    if (!item_id) return res.status(400).json({ hata: 'item_id zorunlu.' });
    const no = serial_no || (await sonrakiBelgeNo(pool, 'SERI'));
    const r = await pool.query(
      `
      INSERT INTO item_serials (serial_no, item_id, lot_id, warehouse_id, status)
      VALUES ($1,$2,$3,$4,COALESCE($5,'Depoda'))
      RETURNING *
      `,
      [no, item_id, lot_id || null, warehouse_id || null, status]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { status, warehouse_id, lot_id } = req.body || {};
    const r = await pool.query(
      `
      UPDATE item_serials SET
        status = COALESCE($2, status),
        warehouse_id = COALESCE($3, warehouse_id),
        lot_id = COALESCE($4, lot_id)
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, status, warehouse_id, lot_id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Seri bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/toplu', async (req, res, next) => {
  try {
    const { item_id, adet, warehouse_id, lot_id } = req.body || {};
    const n = Math.min(Number(adet) || 0, 200);
    if (!item_id || n < 1) return res.status(400).json({ hata: 'item_id ve adet zorunlu.' });
    const olusan = await withTransaction(pool, async (client) => {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const no = await sonrakiBelgeNo(client, 'SERI');
        const r = await client.query(
          `INSERT INTO item_serials (serial_no, item_id, lot_id, warehouse_id, status)
           VALUES ($1,$2,$3,$4,'Depoda') RETURNING *`,
          [no, item_id, lot_id || null, warehouse_id || null]
        );
        rows.push(r.rows[0]);
      }
      return rows;
    });
    res.status(201).json(olusan);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
