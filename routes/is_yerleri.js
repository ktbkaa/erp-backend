const express = require('express');
const router = express.Router();
const dbClient = require('../db');

// İş yerlerini bağlı oldukları firma bilgisiyle listeleyen rota
router.get('/', async (req, res) => {
    try {
        const sonuc = await dbClient.query(`
            SELECT i.*, f.firma_adi 
            FROM is_yerleri i 
            JOIN firmalar f ON i.firma_id = f.id 
            ORDER BY i.id DESC
        `);
        res.json(sonuc.rows);
    } catch (err) {
        console.error('İş yeri listeleme hatası:', err);
        res.status(500).send('İş yerleri çekilirken bir pürüz çıktı.');
    }
});

// Yeni iş yeri tanımlayan rota
router.post('/', async (req, res) => {
    try {
        const { firma_id, is_yeri_kodu, is_yeri_adi, adres } = req.body;
        const sorgu = `
            INSERT INTO is_yerleri (firma_id, is_yeri_kodu, is_yeri_adi, adres) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const degerler = [firma_id, is_yeri_kodu, is_yeri_adi, adres];
        const sonuc = await dbClient.query(sorgu, degerler);
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('İş yeri kayıt hatası:', err);
        res.status(500).send('İş yeri eklenirken bir pürüz çıktı.');
    }
});

module.exports = router;