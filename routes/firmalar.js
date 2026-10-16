const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM firmalar ORDER BY id DESC');
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: 'Firmaları çekerken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM firmalar WHERE id = $1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { firma_kodu, firma_adi } = req.body;
        if (!firma_adi) {
            return res.status(400).json({ hata: 'firma_adi zorunludur. firma_kodu boşsa numaratörden üretilir.' });
        }

        const row = await withTransaction(pool, async (client) => {
            const kod = firma_kodu || (await sonrakiKod(client, 'FIRMA'));
            const sonuc = await client.query(
                `INSERT INTO firmalar (firma_kodu, firma_adi) VALUES ($1, $2) RETURNING *`,
                [kod, firma_adi]
            );
            return sonuc.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { firma_adi } = req.body;
        if (!firma_adi) return res.status(400).json({ hata: 'firma_adi zorunludur.' });
        const sonuc = await pool.query(
            `UPDATE firmalar SET firma_adi = $2 WHERE id = $1 RETURNING *`,
            [req.params.id, firma_adi]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(`DELETE FROM firmalar WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Firma bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
