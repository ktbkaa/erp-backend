const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (_req, res) => {
    try {
        const r = await pool.query('SELECT * FROM kk_ret_nedenleri ORDER BY neden_kodu');
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { neden_kodu, neden_adi, aktif } = req.body;
        if (!neden_kodu || !neden_adi) return res.status(400).json({ hata: 'neden_kodu ve neden_adi zorunlu.' });
        const r = await pool.query(
            `INSERT INTO kk_ret_nedenleri (neden_kodu, neden_adi, aktif) VALUES ($1,$2,COALESCE($3,TRUE)) RETURNING *`,
            [neden_kodu, neden_adi, aktif]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { neden_adi, aktif } = req.body;
        const r = await pool.query(
            `UPDATE kk_ret_nedenleri SET neden_adi=COALESCE($2,neden_adi), aktif=COALESCE($3,aktif) WHERE id=$1 RETURNING *`,
            [req.params.id, neden_adi, aktif]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
