const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];

    const tablo = req.query.table_name || req.query.tablo;
    if (tablo) {
      params.push(String(tablo));
      where.push(`table_name = $${params.length}`);
    }
    if (req.query.record_id) {
      params.push(Number(req.query.record_id));
      where.push(`record_id = $${params.length}`);
    }
    if (req.query.user_code) {
      params.push(String(req.query.user_code));
      where.push(`user_code = $${params.length}`);
    }
    if (req.query.action) {
      params.push(String(req.query.action));
      where.push(`action = $${params.length}`);
    }
    // Ekran adı / endpoint parçası — yol veya table_name üzerinde ara
    const ekran = req.query.ekran || req.query.screen_name || req.query.q;
    if (ekran) {
      params.push(`%${String(ekran)}%`);
      where.push(`(table_name ILIKE $${params.length} OR yol ILIKE $${params.length})`);
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const r = await pool.query(
      `
      SELECT * FROM audit_logs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT ${limit}
      `,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
