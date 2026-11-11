const express = require('express');
const router = express.Router();
const pool = require('../db');
const { registerIdCrud } = require('../src/utils/registerIdCrud');

router.get('/', async (_req, res) => {
    try {
        const r = await pool.query('SELECT * FROM qc_rejection_reasons ORDER BY reason_code');
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { reason_code, reason_name, is_active } = req.body;
        if (!reason_code || !reason_name) return res.status(400).json({ hata: 'reason_code ve reason_name zorunlu.' });
        const r = await pool.query(
            `INSERT INTO qc_rejection_reasons (reason_code, reason_name, is_active) VALUES ($1,$2,COALESCE($3,TRUE)) RETURNING *`,
            [reason_code, reason_name, is_active]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { reason_name, is_active } = req.body;
        const r = await pool.query(
            `UPDATE qc_rejection_reasons SET reason_name=COALESCE($2,reason_name), is_active=COALESCE($3,is_active) WHERE id=$1 RETURNING *`,
            [req.params.id, reason_name, is_active]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

registerIdCrud(router, pool, {
  path: '',
  table: 'qc_rejection_reasons',
  notFound: 'Ret nedeni bulunamadı.',
  skipGet: true,
  skipPut: true,
  softDelete: true,
});

module.exports = router;
