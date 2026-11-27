/**
 * PRJ tanım ekranları — ortak CRUD.
 * Query: ?resource=project-types|project-categories|...
 * Ayrı path mount için factory.
 */
const express = require('express');
const pool = require('../db');

const RESOURCES = {
  'project-types': {
    table: 'prj_project_types',
    codeCol: 'type_code',
    nameCol: 'type_name',
    extra: ['line_no', 'description', 'company_id'],
  },
  'project-categories': {
    table: 'prj_project_categories',
    codeCol: 'category_code',
    nameCol: 'category_name',
    extra: ['line_no', 'description', 'company_id'],
  },
  'project-statuses': {
    table: 'prj_project_statuses',
    codeCol: 'status_code',
    nameCol: 'status_name',
    extra: ['line_no', 'is_terminal', 'is_cancelled', 'description', 'company_id'],
  },
  'project-priorities': {
    table: 'prj_project_priorities',
    codeCol: 'priority_code',
    nameCol: 'priority_name',
    extra: ['rank_no', 'description', 'company_id'],
  },
  'project-roles': {
    table: 'prj_project_roles',
    codeCol: 'role_code',
    nameCol: 'role_name',
    extra: [
      'can_view_budget', 'can_edit_budget', 'can_view_costs',
      'can_manage_team', 'can_close_project', 'description',
    ],
  },
  'work-item-types': {
    table: 'prj_work_item_types',
    codeCol: 'type_code',
    nameCol: 'type_name',
    extra: ['hierarchy_level', 'description', 'company_id'],
  },
  'work-item-statuses': {
    table: 'prj_work_item_statuses',
    codeCol: 'status_code',
    nameCol: 'status_name',
    extra: ['line_no', 'category', 'is_done', 'is_cancelled', 'description', 'company_id'],
  },
  'work-item-priorities': {
    table: 'prj_work_item_priorities',
    codeCol: 'priority_code',
    nameCol: 'priority_name',
    extra: ['rank_no', 'description', 'company_id'],
  },
  'relation-types': {
    table: 'prj_relation_types',
    codeCol: 'relation_code',
    nameCol: 'relation_name',
    extra: ['inverse_code', 'blocks_schedule', 'description'],
  },
};

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

function createPrjDefRouter(resourceKey) {
  const cfg = RESOURCES[resourceKey];
  if (!cfg) throw new Error(`Unknown PRJ def resource: ${resourceKey}`);
  const router = express.Router();
  const { table, codeCol, nameCol, extra } = cfg;

  router.get('/', async (req, res, next) => {
    try {
      const where = [];
      const params = [];
      if (req.query.is_active === 'true') where.push('is_active = TRUE');
      if (req.query.is_active === 'false') where.push('is_active = FALSE');
      const sql = `SELECT * FROM ${table} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${extra.includes('line_no') ? 'line_no,' : ''} ${codeCol}`;
      res.json((await pool.query(sql, params)).rows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
      res.json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const code = trimOrNull(req.body[codeCol]);
      const name = trimOrNull(req.body[nameCol]);
      if (!code || !name) return res.status(400).json({ hata: `${codeCol} ve ${nameCol} zorunlu.` });
      const cols = [codeCol, nameCol, ...extra, 'is_active'];
      const vals = [code, name];
      for (const c of extra) vals.push(req.body[c] ?? null);
      vals.push(req.body.is_active !== false);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      const r = await pool.query(
        `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) RETURNING *`,
        vals
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const sets = [];
      const params = [req.params.id];
      const bump = (col, val) => {
        if (val === undefined) return;
        params.push(val);
        sets.push(`${col}=$${params.length}`);
      };
      bump(nameCol, trimOrNull(req.body[nameCol]));
      for (const c of extra) {
        if (Object.prototype.hasOwnProperty.call(req.body, c)) bump(c, req.body[c]);
      }
      if (req.body.is_active !== undefined) bump('is_active', !!req.body.is_active);
      if (!sets.length) return res.status(400).json({ hata: 'Güncellenecek alan yok.' });
      const r = await pool.query(
        `UPDATE ${table} SET ${sets.join(', ')} WHERE id=$1 RETURNING *`,
        params
      );
      if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
      res.json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const r = await pool.query(
        `UPDATE ${table} SET is_active=FALSE WHERE id=$1 RETURNING id`,
        [req.params.id]
      );
      if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
      res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createPrjDefRouter, RESOURCES };
