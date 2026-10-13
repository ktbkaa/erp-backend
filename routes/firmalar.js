const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM firmalar ORDER BY id DESC');
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Listeleme hatası:', err);
        res.status(500).json({ hata: 'Firmaları çekerken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { firma_kodu, firma_adi } = req.body;
        if (!firma_kodu || !firma_adi) {
            return res.status(400).json({ hata: 'firma_kodu ve firma_adi zorunludur.' });
        }

        const sonuc = await pool.query(
            `
            INSERT INTO firmalar (firma_kodu, firma_adi)
            VALUES ($1, $2)
            RETURNING *;
            `,
            [firma_kodu, firma_adi]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Kayıt hatası:', err);
        res.status(500).json({ hata: 'Firma eklerken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
