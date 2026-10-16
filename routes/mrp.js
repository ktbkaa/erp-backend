const express = require('express');
const router = express.Router();
const pool = require('../db');
const { mrpHesapla } = require('../src/services/mrpService');

router.get('/', async (req, res) => {
    try {
        const liste = await mrpHesapla(pool, {
            isYeriId: req.query.is_yeri_id ? Number(req.query.is_yeri_id) : null,
            stokId: req.query.stok_id ? Number(req.query.stok_id) : null,
        });
        res.json(liste);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:stokId', async (req, res) => {
    try {
        const liste = await mrpHesapla(pool, { stokId: Number(req.params.stokId) });
        res.json(liste[0] || null);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
