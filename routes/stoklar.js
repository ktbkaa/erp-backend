const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res) => {
    try {
        const stoklarRes = await pool.query('SELECT * FROM stoklar ORDER BY id DESC');
        const stoklar = [];
        for (const stok of stoklarRes.rows) {
            const detaylarRes = await pool.query(
                'SELECT * FROM stok_detaylari WHERE stok_id = $1',
                [stok.id]
            );
            stoklar.push({
                ...stok,
                stok_detaylari: detaylarRes.rows,
            });
        }
        res.json(stoklar);
    } catch (err) {
        console.error('Stok listeleme hatası:', err);
        res.status(500).json({ hata: 'Stoklar çekilirken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            stok_kodu,
            stok_adi,
            birim,
            satis_fiyati,
            stok_tipi,
            tedarik_tipi,
            stok_detaylari,
        } = req.body;

        if (!stok_kodu || !stok_adi) {
            return res.status(400).json({ hata: 'stok_kodu ve stok_adi zorunludur.' });
        }

        const sonuc = await withTransaction(pool, async (client) => {
            const stokSonuc = await client.query(
                `
                INSERT INTO stoklar (stok_kodu, stok_adi, birim, satis_fiyati, stok_tipi, tedarik_tipi)
                VALUES ($1, $2, $3, $4, COALESCE($5, 'Ticari'), COALESCE($6, 'Satinalma'))
                RETURNING *;
                `,
                [stok_kodu, stok_adi, birim || null, satis_fiyati || 0, stok_tipi || null, tedarik_tipi || null]
            );
            const yeniStok = stokSonuc.rows[0];

            const eklenenDetaylar = [];
            if (Array.isArray(stok_detaylari)) {
                for (const d of stok_detaylari) {
                    const detaySonuc = await client.query(
                        `
                        INSERT INTO stok_detaylari (stok_id, boyut, agirlik)
                        VALUES ($1, $2, $3)
                        RETURNING *;
                        `,
                        [yeniStok.id, d.boyut || null, d.agirlik || null]
                    );
                    eklenenDetaylar.push(detaySonuc.rows[0]);
                }
            }

            return { stok: yeniStok, stok_detaylari: eklenenDetaylar };
        });

        res.status(201).json(sonuc);
    } catch (err) {
        console.error('Stok kayıt hatası:', err);
        res.status(500).json({ hata: 'Stok eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
