const express = require('express');
const router = express.Router();
const pool = require('../db');

function normJson(v, fallback = '["*"]') {
  if (v == null || v === '') return fallback;
  if (typeof v === 'string') {
    try { JSON.parse(v); return v; } catch { return JSON.stringify([v]); }
  }
  return JSON.stringify(v);
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

router.post('/', async (req, res, next) => {
  try {
    const {
      group_code, group_name, description, is_active,
      satinalma_onay, purchase_requisition_ref, kalite_control,
      module_permissions, warehouse_yetkileri,
    } = req.body;
    if (!group_code || !group_name) {
      return res.status(400).json({ hata: 'group_code ve group_name zorunlu.' });
    }
    const result = await pool.query(
      `
      INSERT INTO user_groups
        (group_code, group_name, description, is_active, satinalma_onay, purchase_requisition_ref, kalite_control,
         module_permissions, warehouse_yetkileri)
      VALUES ($1,$2,$3,COALESCE($4,TRUE),COALESCE($5,FALSE),COALESCE($6,TRUE),COALESCE($7,FALSE),$8,$9)
      RETURNING *
      `,
      [
        group_code, group_name, description || null, is_active,
        satinalma_onay, purchase_requisition_ref, kalite_control,
        normJson(module_permissions), normJson(warehouse_yetkileri),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const {
      group_name, description, is_active,
      satinalma_onay, purchase_requisition_ref, kalite_control,
      module_permissions, warehouse_yetkileri,
    } = req.body;
    const result = await pool.query(
      `
      UPDATE user_groups SET
        group_name = COALESCE($2, group_name),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active),
        satinalma_onay = COALESCE($5, satinalma_onay),
        purchase_requisition_ref = COALESCE($6, purchase_requisition_ref),
        kalite_control = COALESCE($7, kalite_control),
        module_permissions = COALESCE($8, module_permissions),
        warehouse_yetkileri = COALESCE($9, warehouse_yetkileri)
      WHERE id=$1 RETURNING *
      `,
      [
        req.params.id, group_name, description, is_active,
        satinalma_onay, purchase_requisition_ref, kalite_control,
        module_permissions !== undefined ? normJson(module_permissions) : null,
        warehouse_yetkileri !== undefined ? normJson(warehouse_yetkileri) : null,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM user_groups WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
