const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin } = require('../src/middleware/authorize');

function normJson(v, fallback = '["*"]') {
  if (v == null || v === '') return fallback;
  if (typeof v === 'string') {
    try { JSON.parse(v); return v; } catch { return JSON.stringify([v]); }
  }
  return JSON.stringify(v);
}

/** ADMIN grubu tam yetkili kalır: pasifleştirilemez, silinemez, modül/depo listesi '*' dışına çekilemez. */
function adminGrubuKorumasi(row, body = {}) {
  if (row?.group_code !== 'ADMIN') return null;
  if (body.is_active === false) return 'ADMIN grubu pasifleştirilemez.';
  for (const key of ['module_permissions', 'warehouse_permissions']) {
    if (body[key] === undefined) continue;
    let list;
    try { list = JSON.parse(normJson(body[key])); } catch { list = []; }
    if (!Array.isArray(list) || !list.includes('*')) return `ADMIN grubunun ${key} değeri ["*"] kalmalı.`;
  }
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM user_groups ORDER BY group_code');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM user_groups WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      group_code, group_name, description, is_active,
      can_approve_purchase, purchase_requisition_ref, can_quality_control,
      module_permissions, warehouse_permissions,
    } = req.body;
    if (!group_code || !group_name) {
      return res.status(400).json({ hata: 'group_code ve group_name zorunlu.' });
    }
    const result = await pool.query(
      `
      INSERT INTO user_groups
        (group_code, group_name, description, is_active, can_approve_purchase, purchase_requisition_ref, can_quality_control,
         module_permissions, warehouse_permissions)
      VALUES ($1,$2,$3,COALESCE($4,TRUE),COALESCE($5,FALSE),COALESCE($6,TRUE),COALESCE($7,FALSE),$8,$9)
      RETURNING *
      `,
      [
        group_code, group_name, description || null, is_active,
        can_approve_purchase, purchase_requisition_ref, can_quality_control,
        normJson(module_permissions), normJson(warehouse_permissions),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const {
      group_name, description, is_active,
      can_approve_purchase, purchase_requisition_ref, can_quality_control,
      module_permissions, warehouse_permissions,
    } = req.body;
    const mevcut = await pool.query('SELECT * FROM user_groups WHERE id=$1', [req.params.id]);
    if (!mevcut.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
    const koruma = adminGrubuKorumasi(mevcut.rows[0], req.body);
    if (koruma) return res.status(409).json({ hata: koruma, kod: 'ADMIN_GRUP_KORUMA' });
    const result = await pool.query(
      `
      UPDATE user_groups SET
        group_name = COALESCE($2, group_name),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active),
        can_approve_purchase = COALESCE($5, can_approve_purchase),
        purchase_requisition_ref = COALESCE($6, purchase_requisition_ref),
        can_quality_control = COALESCE($7, can_quality_control),
        module_permissions = COALESCE($8, module_permissions),
        warehouse_permissions = COALESCE($9, warehouse_permissions)
      WHERE id=$1 RETURNING *
      `,
      [
        req.params.id, group_name, description, is_active,
        can_approve_purchase, purchase_requisition_ref, can_quality_control,
        module_permissions !== undefined ? normJson(module_permissions) : null,
        warehouse_permissions !== undefined ? normJson(warehouse_permissions) : null,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const mevcut = await pool.query('SELECT group_code FROM user_groups WHERE id=$1', [req.params.id]);
    if (mevcut.rows[0]?.group_code === 'ADMIN') {
      return res.status(409).json({ hata: 'ADMIN grubu silinemez.', kod: 'ADMIN_GRUP_KORUMA' });
    }
    const result = await pool.query('DELETE FROM user_groups WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
