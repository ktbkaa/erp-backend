const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin } = require('../src/middleware/authorize');
const { validateQuery, schemas } = require('../src/utils/validate');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

router.get('/', requireAdmin, validateQuery(schemas.auditLogQuery), async (req, res, next) => {
  try {
    const q = req.validatedQuery;
    const where = [];
    const params = [];

    const tablo = q.table_name || q.tablo;
    if (tablo) {
      params.push(tablo);
      where.push(`table_name = $${params.length}`);
    }
    if (q.record_id != null) {
      params.push(q.record_id);
      where.push(`record_id = $${params.length}`);
    }
    if (q.user_code) {
      params.push(q.user_code);
      where.push(`user_code = $${params.length}`);
    }
    if (q.action) {
      params.push(q.action);
      where.push(`action = $${params.length}`);
    }
    // Ekran adı / endpoint parçası — request_path veya table_name üzerinde ara
    const ekran = q.ekran || q.screen_name || q.q;
    if (ekran) {
      params.push(`%${ekran}%`);
      where.push(`(table_name ILIKE $${params.length} OR request_path ILIKE $${params.length})`);
    }

    params.push(Math.min(q.limit || DEFAULT_LIMIT, MAX_LIMIT));
    const limitIdx = params.length;
    params.push(q.offset || 0);
    const offsetIdx = params.length;
    const r = await pool.query(
      `
      SELECT * FROM audit_logs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
