const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.tablo) {
      params.push(req.query.tablo);
      where.push(`tablo_adi = $${params.length}`);
    }
    if (req.query.kayit_id) {
      params.push(Number(req.query.kayit_id));
      where.push(`kayit_id = $${params.length}`);
    }
    if (req.query.kullanici_kodu) {
      params.push(req.query.kullanici_kodu);
      where.push(`kullanici_kodu = $${params.length}`);
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const r = await pool.query(
      `
      SELECT * FROM audit_log
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT ${limit}
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
