const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

const TIPLER = ['ABC', 'Marka', 'TeminSekli'];

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

router.get('/', async (req, res) => {
    try {
        const { tip, aktif } = req.query;
        const where = [];
        const params = [];
        if (tip) {
            params.push(tip);
            where.push(`kategori_tipi = $${params.length}`);
        }
        if (aktif === 'true') where.push('aktif = TRUE');
        if (aktif === 'false') where.push('aktif = FALSE');
        const sql = `
            SELECT * FROM kategori_tanimlari
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY kategori_tipi, kategori_kodu
        `;
        const sonuc = await pool.query(sql, params);
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM kategori_tanimlari WHERE id = $1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kategori bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const kategori_adi = trimOrNull(req.body.kategori_adi);
        const kategori_tipi = trimOrNull(req.body.kategori_tipi);
        if (!kategori_adi) {
            return res.status(400).json({
                hata: 'Kategori adı zorunludur.',
                hatalar: [{ alan: 'kategori_adi', hata: 'Kategori adı zorunludur.' }],
            });
        }
        if (!TIPLER.includes(kategori_tipi)) {
            return res.status(400).json({
                hata: "kategori_tipi 'ABC', 'Marka' veya 'TeminSekli' olmalı.",
                hatalar: [{ alan: 'kategori_tipi', hata: 'Geçersiz kategori tipi.' }],
            });
        }

        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.kategori_kodu)
                || (await sonrakiKod(client, 'KATEGORI'));
            const ins = await client.query(
                `
                INSERT INTO kategori_tanimlari
                    (kategori_kodu, kategori_adi, kategori_tipi, aktif, aciklama)
                VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
                RETURNING *
                `,
                [
                    kod,
                    kategori_adi,
                    kategori_tipi,
                    typeof req.body.aktif === 'boolean' ? req.body.aktif : true,
                    trimOrNull(req.body.aciklama),
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu kategori kodu zaten var.', alan: 'kategori_kodu' });
        }
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const kategori_adi = trimOrNull(req.body.kategori_adi);
        if (!kategori_adi) {
            return res.status(400).json({
                hata: 'Kategori adı zorunludur.',
                hatalar: [{ alan: 'kategori_adi', hata: 'Kategori adı zorunludur.' }],
            });
        }
        const kategori_tipi = trimOrNull(req.body.kategori_tipi);
        if (kategori_tipi && !TIPLER.includes(kategori_tipi)) {
            return res.status(400).json({ hata: 'Geçersiz kategori tipi.', alan: 'kategori_tipi' });
        }
        const upd = await pool.query(
            `
            UPDATE kategori_tanimlari SET
                kategori_adi = $2,
                kategori_tipi = COALESCE($3, kategori_tipi),
                aktif = COALESCE($4, aktif),
                aciklama = $5
            WHERE id = $1
            RETURNING *
            `,
            [
                req.params.id,
                kategori_adi,
                kategori_tipi,
                typeof req.body.aktif === 'boolean' ? req.body.aktif : null,
                trimOrNull(req.body.aciklama),
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Kategori bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(
            'DELETE FROM kategori_tanimlari WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kategori bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
