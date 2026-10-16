const express = require('express');
const router = express.Router();
const pool = require('../db');
const { depoBakiyeListesi } = require('../src/services/stokHareketService');

router.get('/', async (req, res) => {
    try {
        const liste = await depoBakiyeListesi(pool, {
            depoId: req.query.depo_id ? Number(req.query.depo_id) : null,
            stokId: req.query.stok_id ? Number(req.query.stok_id) : null,
            stokStatu: req.query.stok_statu || null,
        });
        res.json(liste);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
