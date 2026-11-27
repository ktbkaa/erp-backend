const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(
            'SELECT * FROM olcu_birimleri ORDER BY birim_kodu ASC'
        );
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Ölçü birimi listeleme hatası:', err);
        res.status(500).json({ hata: 'Ölçü birimleri çekilirken bir pürüz çıktı.', detay: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { birim_kodu, birim_adi } = req.body;
        if (!birim_kodu || !birim_adi) {
            return res.status(400).json({ hata: 'birim_kodu ve birim_adi zorunludur.' });
        }

        const sonuc = await pool.query(
            `
            INSERT INTO olcu_birimleri (birim_kodu, birim_adi)
            VALUES ($1, $2)
            RETURNING *;
            `,
            [birim_kodu, birim_adi]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Ölçü birimi kayıt hatası:', err);
        res.status(500).json({ hata: 'Ölçü birimi eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
