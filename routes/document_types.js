const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const onlyActive = req.query.is_active === 'true';
    const stockOnly = req.query.stock_etkisi === 'true';
    const where = [];
    const params = [];
    if (onlyActive) where.push('is_active IS DISTINCT FROM FALSE');
    if (stockOnly) where.push('stock_etkisi IS TRUE');
    const sql = `SELECT * FROM document_types
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY module, document_type_code`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const byId = /^\d+$/.test(String(req.params.id));
    const r = await pool.query(
      byId
        ? `SELECT * FROM document_types WHERE id=$1`
        : `SELECT * FROM document_types WHERE document_type_code=$1`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Belge tipi bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.document_type_code || !b.document_type_name) {
      return res.status(400).json({ hata: 'document_type_code ve document_type_name zorunlu.' });
    }
    const r = await pool.query(
      `INSERT INTO document_types (
         document_type_code, document_type_name, module, stock_etkisi, is_active
       ) VALUES ($1,$2,$3,COALESCE($4,FALSE),COALESCE($5,TRUE))
       RETURNING *`,
      [b.document_type_code, b.document_type_name, b.module || null, b.stock_etkisi, b.is_active],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE document_types SET
         document_type_name = COALESCE($2, document_type_name),
         module = COALESCE($3, module),
         stock_etkisi = COALESCE($4, stock_etkisi),
         is_active = COALESCE($5, is_active)
       WHERE id=$1 RETURNING *`,
      [req.params.id, b.document_type_name, b.module, b.stock_etkisi, b.is_active],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Belge tipi bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE document_types SET is_active=FALSE WHERE id=$1 RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Belge tipi bulunamadı.' });
    res.json({ silindi: false, pasife_alindi: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
