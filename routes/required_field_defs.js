'use strict';

const express = require('express');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

const router = express.Router();

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.is_active === 'true') where.push('is_active = TRUE');
    if (req.query.is_active === 'false') where.push('is_active = FALSE');
    if (req.query.is_required === 'true') where.push('is_required = TRUE');
    if (req.query.screen_id) {
      params.push(String(req.query.screen_id));
      where.push(`screen_id = $${params.length}`);
    }
    const sql = `
      SELECT * FROM required_field_defs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY screen_title NULLS LAST, screen_id, field_label NULLS LAST, field_key
    `;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM required_field_defs WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Zorunlu alan tanımı bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const screenId = trimOrNull(req.body.screen_id);
    const fieldKey = trimOrNull(req.body.field_key);
    if (!screenId) return res.status(400).json({ hata: 'screen_id zorunlu.' });
    if (!fieldKey) return res.status(400).json({ hata: 'field_key zorunlu.' });
    const row = await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        INSERT INTO required_field_defs
          (screen_id, screen_title, field_key, field_label, is_required, is_active)
        VALUES ($1,$2,$3,$4,COALESCE($5,TRUE),COALESCE($6,TRUE))
        ON CONFLICT (screen_id, field_key) DO UPDATE SET
          screen_title = EXCLUDED.screen_title,
          field_label = EXCLUDED.field_label,
          is_required = EXCLUDED.is_required,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING *
        `,
        [
          screenId,
          trimOrNull(req.body.screen_title),
          fieldKey,
          trimOrNull(req.body.field_label),
          req.body.is_required,
          req.body.is_active,
        ],
      );
      return r.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      UPDATE required_field_defs SET
        screen_id = COALESCE($2, screen_id),
        screen_title = COALESCE($3, screen_title),
        field_key = COALESCE($4, field_key),
        field_label = COALESCE($5, field_label),
        is_required = COALESCE($6, is_required),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id=$1
      RETURNING *
      `,
      [
        req.params.id,
        trimOrNull(req.body.screen_id),
        trimOrNull(req.body.screen_title),
        trimOrNull(req.body.field_key),
        trimOrNull(req.body.field_label),
        req.body.is_required,
        req.body.is_active,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Zorunlu alan tanımı bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE required_field_defs SET is_active=FALSE, updated_at=NOW() WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Zorunlu alan tanımı bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
