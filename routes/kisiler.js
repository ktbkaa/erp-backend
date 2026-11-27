const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM kisiler ORDER BY id DESC');
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Kişi listeleme hatası:', err);
        res.status(500).json({ hata: 'Kişiler çekilirken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { ad, soyad, eposta, telefon, rol } = req.body;
        if (!ad || !soyad) {
            return res.status(400).json({ hata: 'ad ve soyad zorunludur.' });
        }

        const sonuc = await pool.query(
            `
            INSERT INTO kisiler (ad, soyad, eposta, telefon, rol)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
            `,
            [ad, soyad, eposta || null, telefon || null, rol || 'Personel']
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Kişi kayıt hatası:', err);
        res.status(500).json({ hata: 'Kişi eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
