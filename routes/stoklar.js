const express = require('express');
const router = express.Router();
const dbClient = require('../db');

// Stokları ve ürün özellik detaylarını listeleyen rota
router.get('/', async (req, res) => {
    try {
        const stoklarRes = await dbClient.query('SELECT * FROM stoklar ORDER BY id DESC');
        const stoklar = [];
        for (let stok of stoklarRes.rows) {
            const detaylarRes = await dbClient.query('SELECT * FROM stok_detaylari WHERE stok_id = $1', [stok.id]);
            stoklar.push({
                ...stok,
                stok_detaylari: detaylarRes.rows
            });
        }
        res.json(stoklar);
    } catch (err) {
        console.error('Stok listeleme hatası:', err);
        res.status(500).send('Stoklar çekilirken bir pürüz çıktı.');
    }
});

// Master-Detail Yeni Stok Ekleme Rota (Boyut ve Ağırlık Özellikli)
router.post('/', async (req, res) => {
    const client = await dbClient.connect();
    try {
        await client.query('BEGIN');

        const { stok_kodu, stok_adi, birim, satis_fiyati, stok_detaylari } = req.body;

        // 1. Master (Stok Kartı) Kaydı
        const stokSorgu = `
            INSERT INTO stoklar (stok_kodu, stok_adi, birim, satis_fiyati) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const stokSonuc = await client.query(stokSorgu, [stok_kodu, stok_adi, birim, satis_fiyati]);
        const yeniStok = stokSonuc.rows[0];

        // 2. Detail (Boyut / Ağırlık Özellikleri) Kayıtları
        const eklenenDetaylar = [];
        if (stok_detaylari && stok_detaylari.length > 0) {
            for (const d of stok_detaylari) {
                const detaySorgu = `
                    INSERT INTO stok_detaylari (stok_id, boyut, agirlik)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const detaySonuc = await client.query(detaySorgu, [yeniStok.id, d.boyut, d.agirlik]);
                eklenenDetaylar.push(detaySonuc.rows[0]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({
            stok: yeniStok,
            stok_detaylari: eklenenDetaylar
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Stok kayıt hatası:', err);
        res.status(500).send('Stok eklenirken bir pürüz çıktı.');
    } finally {
        client.release();
    }
});

module.exports = router;