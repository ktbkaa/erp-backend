const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(`
            SELECT m.*, i.is_yeri_kodu, i.is_yeri_adi
            FROM is_merkezleri m
            JOIN is_yerleri i ON i.id = m.is_yeri_id
            ORDER BY m.id
        `);
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { is_yeri_id, merkez_kodu, merkez_adi } = req.body;
        if (!is_yeri_id || !merkez_kodu || !merkez_adi) {
            return res.status(400).json({ hata: 'is_yeri_id, merkez_kodu, merkez_adi zorunlu.' });
        }
        const sonuc = await pool.query(
            `INSERT INTO is_merkezleri (is_yeri_id, merkez_kodu, merkez_adi)
             VALUES ($1,$2,$3) RETURNING *`,
            [is_yeri_id, merkez_kodu, merkez_adi]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
