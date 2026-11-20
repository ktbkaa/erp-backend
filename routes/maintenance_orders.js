/**
 * CMMS hafif — bakım emirleri (P2 iskelet).
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq, requireCompanyRecord } = require('../src/utils/firmaScope');
const { nextDocumentNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`m.company_id=$${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`m.status=$${params.length}`);
    }
    if (req.query.order_type) {
      params.push(req.query.order_type);
      where.push(`m.order_type=$${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT m.*, w.center_code, w.center_name, p.plant_code
      FROM maintenance_orders m
      LEFT JOIN work_centers w ON w.id = m.work_center_id
      LEFT JOIN plants p ON p.id = m.plant_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY m.id DESC LIMIT 300
      `,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', requireCompanyRecord('maintenance_orders'), async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM maintenance_orders WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Bakım emri bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = companyIdFromReq(req) || b.company_id || null;
    const no = b.order_no || await nextDocumentNo(pool, 'BAKIM_EMIR').catch(() => `MNT${Date.now()}`);
    const r = await pool.query(
      `INSERT INTO maintenance_orders
        (company_id, plant_id, order_no, order_type, status, work_center_id,
         equipment_code, equipment_name, priority, due_date, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        firmaId, b.plant_id || null, no, b.order_type || 'Ariza', b.status || 'Acik',
        b.work_center_id || null, b.equipment_code || null, b.equipment_name || null,
        b.priority || 'Normal', b.due_date || null, b.description || null,
        req.user?.user_code || req.get?.('x-kullanici-kodu') || null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.put('/:id', requireCompanyRecord('maintenance_orders'), async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE maintenance_orders SET
        status=COALESCE($2, status),
        priority=COALESCE($3, priority),
        due_date=COALESCE($4, due_date),
        description=COALESCE($5, description),
        resolution_notes=COALESCE($6, resolution_notes),
        completed_at=CASE WHEN $2 IN ('Tamam','Kapali') THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
        updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, b.status, b.priority, b.due_date, b.description, b.resolution_notes],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Bakım emri bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.post('/:id/kapat', requireCompanyRecord('maintenance_orders'), async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE maintenance_orders SET status='Tamam', completed_at=NOW(),
        resolution_notes=COALESCE($2, resolution_notes), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, req.body?.resolution_notes || null],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Bakım emri bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

module.exports = router;
