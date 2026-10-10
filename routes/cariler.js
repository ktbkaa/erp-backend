const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res) => {
    try {
        const carilerRes = await pool.query('SELECT * FROM cariler ORDER BY id DESC');
        const cariler = [];
        for (const cari of carilerRes.rows) {
            const detaylarRes = await pool.query(
                'SELECT * FROM cari_detaylari WHERE cari_id = $1',
                [cari.id]
            );
            cariler.push({
                ...cari,
                cari_detaylari: detaylarRes.rows,
            });
        }
        res.json(cariler);
    } catch (err) {
        console.error('Cari listeleme hatası:', err);
        res.status(500).json({ hata: 'Cariler çekilirken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { cari_kodu, cari_adi, cari_turu, telefon, cari_detaylari } = req.body;
        if (!cari_kodu || !cari_adi) {
            return res.status(400).json({ hata: 'cari_kodu ve cari_adi zorunludur.' });
        }

        const sonuc = await withTransaction(pool, async (client) => {
            const cariSonuc = await client.query(
                `
                INSERT INTO cariler (cari_kodu, cari_adi, cari_turu, telefon)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
                `,
                [cari_kodu, cari_adi, cari_turu || null, telefon || null]
            );
            const yeniCari = cariSonuc.rows[0];

            const eklenenDetaylar = [];
            if (Array.isArray(cari_detaylari)) {
                for (const d of cari_detaylari) {
                    const detaySonuc = await client.query(
                        `
                        INSERT INTO cari_detaylari
                            (cari_id, adres, fatura_adresi, yetkili_adi, yetkili_telefon)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING *;
                        `,
                        [
                            yeniCari.id,
                            d.adres || null,
                            d.fatura_adresi || null,
                            d.yetkili_adi || null,
                            d.yetkili_telefon || null,
                        ]
                    );
                    eklenenDetaylar.push(detaySonuc.rows[0]);
                }
            }

            return { cari: yeniCari, cari_detaylari: eklenenDetaylar };
        });

        res.status(201).json(sonuc);
    } catch (err) {
        console.error('Cari kayıt hatası:', err);
        res.status(500).json({ hata: 'Cari eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
