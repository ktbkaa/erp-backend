const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { normalizeParams } = require('../src/services/productionParamsService');

async function getRow(id) {
  const r = await pool.query(
    `
    SELECT p.*,
           c.company_code, c.company_name,
           iy.plant_code, iy.plant_name
    FROM production_parameters p
    JOIN companies c ON c.id = p.company_id
    LEFT JOIN plants iy ON iy.id = p.plant_id
    WHERE p.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = ['p.is_active = TRUE OR TRUE']; // liste: aktif+pasif
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`p.company_id = $${params.length}`);
    }
    if (req.query.company_id) {
      params.push(Number(req.query.company_id));
      where.push(`p.company_id = $${params.length}`);
    }
    const rows = await pool.query(
      `
      SELECT p.*,
             c.company_code, c.company_name,
             iy.plant_code, iy.plant_name
      FROM production_parameters p
      JOIN companies c ON c.id = p.company_id
      LEFT JOIN plants iy ON iy.id = p.plant_id
      WHERE ${where.join(' AND ')}
      ORDER BY c.company_code, iy.plant_code NULLS FIRST, p.id
      `,
      params
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Üretim parametresi bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const companyId = Number(b.company_id || companyIdFromReq(req));
    if (!companyId) return res.status(400).json({ hata: 'company_id zorunlu.' });
    const plantId = b.plant_id != null && b.plant_id !== '' ? Number(b.plant_id) : null;
    const n = normalizeParams({ ...b, company_id: companyId, plant_id: plantId });
    const ins = await pool.query(
      `
      INSERT INTO production_parameters (
        company_id, plant_id,
        allow_over_production, over_production_pct,
        allow_under_production, under_production_pct,
        enforce_op_sequence, require_material_consume, auto_close_on_complete,
        description, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,TRUE))
      RETURNING id
      `,
      [
        companyId,
        plantId,
        n.allow_over_production,
        n.over_production_pct,
        n.allow_under_production,
        n.under_production_pct,
        n.enforce_op_sequence,
        n.require_material_consume,
        n.auto_close_on_complete,
        b.description || null,
        b.is_active,
      ]
    );
    res.status(201).json(await getRow(ins.rows[0].id));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        hata: 'Bu firma / iş yeri için üretim parametresi zaten var.',
        kod: 'ERR-DUP-PARAM',
      });
    }
    res.status(400).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const cur = await getRow(req.params.id);
    if (!cur) return res.status(404).json({ hata: 'Üretim parametresi bulunamadı.' });
    const n = normalizeParams({ ...cur, ...b });
    const plantId = b.plant_id !== undefined
      ? (b.plant_id != null && b.plant_id !== '' ? Number(b.plant_id) : null)
      : cur.plant_id;
    await pool.query(
      `
      UPDATE production_parameters SET
        company_id = COALESCE($2, company_id),
        plant_id = $3,
        allow_over_production = $4,
        over_production_pct = $5,
        allow_under_production = $6,
        under_production_pct = $7,
        enforce_op_sequence = $8,
        require_material_consume = $9,
        auto_close_on_complete = $10,
        description = COALESCE($11, description),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [
        req.params.id,
        b.company_id != null ? Number(b.company_id) : null,
        plantId,
        n.allow_over_production,
        n.over_production_pct,
        n.allow_under_production,
        n.under_production_pct,
        n.enforce_op_sequence,
        n.require_material_consume,
        n.auto_close_on_complete,
        b.description !== undefined ? b.description : null,
        typeof b.is_active === 'boolean' ? b.is_active : null,
      ]
    );
    res.json(await getRow(req.params.id));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        hata: 'Bu firma / iş yeri için üretim parametresi zaten var.',
        kod: 'ERR-DUP-PARAM',
      });
    }
    res.status(400).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      'DELETE FROM production_parameters WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Üretim parametresi bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
