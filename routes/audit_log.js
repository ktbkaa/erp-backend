const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];

    const tablo = req.query.tablo_adi || req.query.tablo;
    if (tablo) {
      params.push(String(tablo));
      where.push(`tablo_adi = $${params.length}`);
    }
    if (req.query.kayit_id) {
      params.push(Number(req.query.kayit_id));
      where.push(`kayit_id = $${params.length}`);
    }
    if (req.query.kullanici_kodu) {
      params.push(String(req.query.kullanici_kodu));
      where.push(`kullanici_kodu = $${params.length}`);
    }
    if (req.query.islem) {
      params.push(String(req.query.islem));
      where.push(`islem = $${params.length}`);
    }
    // Ekran adı / endpoint parçası — yol veya tablo_adi üzerinde ara
    const ekran = req.query.ekran || req.query.ekran_adi || req.query.q;
    if (ekran) {
      params.push(`%${String(ekran)}%`);
      where.push(`(tablo_adi ILIKE $${params.length} OR yol ILIKE $${params.length})`);
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const r = await pool.query(
      `
      SELECT * FROM audit_log
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
