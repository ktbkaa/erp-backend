const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
    try {
        const { ekran } = req.query;
        const params = [];
        let where = '';
        if (ekran) {
            params.push(ekran);
            where = 'WHERE screen_code = $1';
        }
        const result = await pool.query(
            `
            SELECT series_code, onek, description, son_numara, screen_code, screen_name, is_active, created_at
            FROM number_series
            ${where}
            ORDER BY COALESCE(screen_name, description), series_code
            `,
            params
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:seriKodu', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM number_series WHERE series_code = $1`,
            [req.params.seriKodu]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Numaratör bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Numaratörü bir adım ilerletir ve yeni kodu döner (Yeni / Kopyala açılışında). */
router.post('/:seriKodu/ayir', async (req, res) => {
    try {
        const kod = await withTransaction(pool, async (client) => {
            const seri = await client.query(
                `SELECT series_code, is_active FROM number_series WHERE series_code = $1`,
                [req.params.seriKodu]
            );
            if (!seri.rows[0]) throw Object.assign(new Error('Numaratör tanımlı değil.'), { status: 404 });
            if (seri.rows[0].is_active === false) {
                throw Object.assign(new Error('Numaratör is_inactive.'), { status: 400 });
            }
            return sonrakiKod(client, req.params.seriKodu);
        });
        res.status(201).json({ series_code: req.params.seriKodu, kod });
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.put('/:seriKodu', async (req, res) => {
    try {
        const { description, screen_code, screen_name, is_active, son_numara, onek } = req.body;
        const result = await pool.query(
            `
            UPDATE number_series SET
                description = COALESCE($2, description),
                screen_code = COALESCE($3, screen_code),
                screen_name = COALESCE($4, screen_name),
                is_active = COALESCE($5, is_active),
                son_numara = COALESCE($6, son_numara),
                onek = COALESCE($7, onek)
            WHERE series_code = $1
            RETURNING *
            `,
            [
                req.params.seriKodu,
                description ?? null,
                screen_code ?? null,
                screen_name ?? null,
                typeof is_active === 'boolean' ? is_active : null,
                Number.isFinite(Number(son_numara)) ? Number(son_numara) : null,
                onek ?? null,
            ]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Numaratör bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { series_code, onek, description, screen_code, screen_name, son_numara } = req.body;
        if (!series_code || !onek || !description) {
            return res.status(400).json({ hata: 'series_code, onek ve description zorunludur.' });
        }
        if (String(onek).length !== 1) {
            return res.status(400).json({ hata: 'onek tek karakter olmalı.' });
        }
        const result = await pool.query(
            `
            INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
            VALUES ($1, $2, $3, COALESCE($4, 0), $5, $6, TRUE)
            RETURNING *
            `,
            [series_code, String(onek).toUpperCase(), description, son_numara ?? 0, screen_code || null, screen_name || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
