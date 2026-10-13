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
            `
            SELECT
                s.*,
                (
                    SELECT f.firma_kodu
                    FROM stok_is_yeri siy
                    JOIN is_yerleri i ON i.id = siy.is_yeri_id
                    JOIN firmalar f ON f.id = i.firma_id
                    WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                    ORDER BY siy.id
                    LIMIT 1
                ) AS firma_kodu,
                (
                    SELECT f.firma_adi
                    FROM stok_is_yeri siy
                    JOIN is_yerleri i ON i.id = siy.is_yeri_id
                    JOIN firmalar f ON f.id = i.firma_id
                    WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                    ORDER BY siy.id
                    LIMIT 1
                ) AS firma_adi,
                (
                    SELECT i.is_yeri_kodu
                    FROM stok_is_yeri siy
                    JOIN is_yerleri i ON i.id = siy.is_yeri_id
                    WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                    ORDER BY siy.id
                    LIMIT 1
                ) AS is_yeri_kodu,
                (
                    SELECT i.is_yeri_adi
                    FROM stok_is_yeri siy
                    JOIN is_yerleri i ON i.id = siy.is_yeri_id
                    WHERE siy.stok_id = s.id AND siy.aktif = TRUE
                    ORDER BY siy.id
                    LIMIT 1
                ) AS is_yeri_adi
            FROM stoklar s
            ${where}
            ORDER BY s.id DESC
            `,
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

            return { ...yeniStok, stok_detaylari: eklenenDetaylar };
        });

        res.status(201).json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const stokRes = await pool.query(`SELECT * FROM stoklar WHERE id = $1`, [req.params.id]);
        if (!stokRes.rows[0]) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        const detaylarRes = await pool.query(
            'SELECT * FROM stok_detaylari WHERE stok_id = $1 ORDER BY id',
            [req.params.id]
        );
        res.json({ ...stokRes.rows[0], stok_detaylari: detaylarRes.rows });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            stok_adi,
            birim,
            satis_fiyati,
            stok_tipi,
            tedarik_tipi,
            stok_detaylari,
        } = req.body;
        if (!stok_adi) return res.status(400).json({ hata: 'stok_adi zorunludur.' });

        const sonuc = await withTransaction(pool, async (client) => {
            const upd = await client.query(
                `
                UPDATE stoklar SET
                    stok_adi = $2,
                    birim = COALESCE($3, birim),
                    satis_fiyati = COALESCE($4, satis_fiyati),
                    stok_tipi = COALESCE($5, stok_tipi),
                    tedarik_tipi = COALESCE($6, tedarik_tipi)
                WHERE id = $1
                RETURNING *
                `,
                [req.params.id, stok_adi, birim || null, satis_fiyati ?? null, stok_tipi || null, tedarik_tipi || null]
            );
            if (!upd.rows[0]) throw Object.assign(new Error('Stok bulunamadı.'), { status: 404 });

            if (Array.isArray(stok_detaylari)) {
                await client.query('DELETE FROM stok_detaylari WHERE stok_id = $1', [req.params.id]);
                for (const d of stok_detaylari) {
                    await client.query(
                        `INSERT INTO stok_detaylari (stok_id, boyut, agirlik) VALUES ($1, $2, $3)`,
                        [req.params.id, d.boyut || null, d.agirlik || null]
                    );
                }
            }

            const detaylar = await client.query(
                'SELECT * FROM stok_detaylari WHERE stok_id = $1 ORDER BY id',
                [req.params.id]
            );
            return { ...upd.rows[0], stok_detaylari: detaylar.rows };
        });

        res.json(sonuc);
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM stoklar WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Stok bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
