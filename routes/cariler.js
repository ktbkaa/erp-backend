const express = require('express');
const router = express.Router();
const dbClient = require('../db');

// Carileri ve adres/yetkili detaylarını listeleyen rota
router.get('/', async (req, res) => {
    try {
        const carilerRes = await dbClient.query('SELECT * FROM cariler ORDER BY id DESC');
        const cariler = [];
        for (let cari of carilerRes.rows) {
            const detaylarRes = await dbClient.query('SELECT * FROM cari_detaylari WHERE cari_id = $1', [cari.id]);
            cariler.push({
                ...cari,
                cari_detaylari: detaylarRes.rows
            });
        }
        res.json(cariler);
    } catch (err) {
        console.error('Cari listeleme hatası:', err);
        res.status(500).send('Cariler çekilirken bir pürüz çıktı.');
    }
});

// Master-Detail Yeni Cari Ekleme Rota (Transaction Güvenceli)
router.post('/', async (req, res) => {
    const client = await dbClient.connect();
    try {
        await client.query('BEGIN');

        const { cari_kodu, cari_adi, cari_turu, telefon, cari_detaylari } = req.body;

        // 1. Master (Cari Kartı) Kaydı
        const cariSorgu = `
            INSERT INTO cariler (cari_kodu, cari_adi, cari_turu, telefon) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const cariSonuc = await client.query(cariSorgu, [cari_kodu, cari_adi, cari_turu, telefon]);
        const yeniCari = cariSonuc.rows[0];

        // 2. Detail (Adres ve Yetkili Bilgileri) Kayıtları
        const eklenenDetaylar = [];
        if (cari_detaylari && cari_detaylari.length > 0) {
            for (const d of cari_detaylari) {
                const detaySorgu = `
                    INSERT INTO cari_detaylari (cari_id, adres, fatura_adresi, yetkili_adi, yetkili_telefon)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const detaySonuc = await client.query(detaySorgu, [
                    yeniCari.id, 
                    d.adres, 
                    d.fatura_adresi, 
                    d.yetkili_adi, 
                    d.yetkili_telefon
                ]);
                eklenenDetaylar.push(detaySonuc.rows[0]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({
            cari: yeniCari,
            cari_detaylari: eklenenDetaylar
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Cari kayıt hatası:', err);
        res.status(500).send('Cari eklenirken bir pürüz çıktı.');
    } finally {
        client.release();
    }
});

module.exports = router;