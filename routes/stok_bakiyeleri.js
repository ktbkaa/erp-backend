const express = require('express');
const router = express.Router();
const pool = require('../db');
const { depoBakiyeListesi } = require('../src/services/stokHareketService');

router.get('/', async (req, res) => {
    try {
        const depoId = req.query.depo_id ? Number(req.query.depo_id) : null;
        const liste = await depoBakiyeListesi(pool, depoId);
        res.json(liste);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
