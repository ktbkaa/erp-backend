const express = require('express');
const router = express.Router();
const dbClient = require('../db');

// Kişileri listeleyen rota
router.get('/', async (req, res) => {
    try {
        const sonuc = await dbClient.query('SELECT * FROM kisiler ORDER BY id DESC');
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Kişi listeleme hatası:', err);
        res.status(500).send('Kişiler çekilirken bir pürüz çıktı.');
    }
});

// Yeni kişi / personel ekleyen rota (Ayrı ad ve soyad ile)
router.post('/', async (req, res) => {
    try {
        const { ad, soyad, eposta, telefon, rol } = req.body;
        const sorgu = `
            INSERT INTO kisiler (ad, soyad, eposta, telefon, rol) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *;
        `;
        const degerler = [ad, soyad, eposta, telefon, rol];
        const sonuc = await dbClient.query(sorgu, degerler);
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Kişi kayıt hatası:', err);
        res.status(500).send('Kişi eklenirken bir pürüz çıktı.');
    }
});

module.exports = router;