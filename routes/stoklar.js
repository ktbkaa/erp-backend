const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod, stokSeriKodundanTip } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
    try {
        const { tip } = req.query;
        const params = [];
        let where = '';
        if (tip) {
            params.push(tip);
            where = 'WHERE stok_tipi = $1';
        }
        const stoklarRes = await pool.query(
            `SELECT * FROM stoklar ${where} ORDER BY id DESC`,
            params
        );
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
        res.status(500).json({ hata: err.message });
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

        if (!stok_adi) {
            return res.status(400).json({ hata: 'stok_adi zorunludur.' });
        }

        const tip = stok_tipi || 'Ticari';

        const sonuc = await withTransaction(pool, async (client) => {
            const kod = stok_kodu || (await sonrakiKod(client, stokSeriKodundanTip(tip)));

            const stokSonuc = await client.query(
                `
                INSERT INTO stoklar (stok_kodu, stok_adi, birim, satis_fiyati, stok_tipi, tedarik_tipi)
                VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Satinalma'))
                RETURNING *;
                `,
                [kod, stok_adi, birim || 'AD', satis_fiyati || 0, tip, tedarik_tipi || null]
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
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
