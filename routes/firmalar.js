const express = require('express');
const router = express.Router(); // <--- İŞTE KAÇAN BALIK BU!
const dbClient = require('../db');

// Listeleme rotası
router.get('/', async (req, res) => {
    try {
        const sonuc = await dbClient.query('SELECT * FROM firmalar ORDER BY id DESC');
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Listeleme hatası:', err);
        res.send('Firmaları çekerken bir pürüz çıktı.');
    }
});

// Yeni firma ekleme rotası
router.post('/', async (req, res) => {
    try {
        const { firma_kodu, firma_adi } = req.body;
        const sorgu = `
            INSERT INTO firmalar (firma_kodu, firma_adi) 
            VALUES ($1, $2) 
            RETURNING *;
        `;
        const degerler = [firma_kodu, firma_adi];
        const sonuc = await dbClient.query(sorgu, degerler);
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Kayıt hatası:', err);
        res.status(500).send('Firma eklerken bir pürüz çıktı.');
    }
});

module.exports = router;