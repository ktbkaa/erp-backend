const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT * FROM belge_tipleri WHERE aktif IS DISTINCT FROM FALSE ORDER BY modul, belge_tipi_kodu`
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:kod', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT * FROM belge_tipleri WHERE belge_tipi_kodu=$1`,
            [req.params.kod]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Belge tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
