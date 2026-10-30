const express = require('express');
const router = express.Router();
const pool = require('../db');

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
        const { type, is_active } = req.query;
        const where = [];
        const params = [];
        if (type) {
            params.push(type);
            where.push(`category_type = $${params.length}`);
        }
        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');
        const sql = `
            SELECT * FROM categories
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY category_type, category_code
        `;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Kategori bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const category_name = trimOrNull(req.body.category_name);
        const category_type = trimOrNull(req.body.category_type);
        if (!category_name) {
            return res.status(400).json({
                hata: 'Kategori adı zorunludur.',
                hatalar: [{ alan: 'category_name', hata: 'Kategori adı zorunludur.' }],
            });
        }
        if (!TIPLER.includes(category_type)) {
            return res.status(400).json({
                hata: "category_type 'ABC', 'Marka' veya 'TeminSekli' olmalı.",
                hatalar: [{ alan: 'category_type', hata: 'Geçersiz kategori tipi.' }],
            });
        }

        const kod = trimOrNull(req.body.category_code);
        if (!kod) {
            return res.status(400).json({
                hata: 'Kategori kodu zorunludur.',
                hatalar: [{ alan: 'category_code', hata: 'Kategori kodu zorunludur.' }],
            });
        }
        const ins = await pool.query(
            `
            INSERT INTO categories
                (category_code, category_name, category_type, is_active, description)
            VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
            RETURNING *
            `,
            [
                kod,
                category_name,
                category_type,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
                trimOrNull(req.body.description),
            ]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu kategori kodu zaten var.', alan: 'category_code' });
        }
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const category_name = trimOrNull(req.body.category_name);
        if (!category_name) {
            return res.status(400).json({
                hata: 'Kategori adı zorunludur.',
                hatalar: [{ alan: 'category_name', hata: 'Kategori adı zorunludur.' }],
            });
        }
        const category_type = trimOrNull(req.body.category_type);
        if (category_type && !TIPLER.includes(category_type)) {
            return res.status(400).json({ hata: 'Geçersiz kategori tipi.', alan: 'category_type' });
        }
        const upd = await pool.query(
            `
            UPDATE categories SET
                category_name = $2,
                category_type = COALESCE($3, category_type),
                is_active = COALESCE($4, is_active),
                description = $5
            WHERE id = $1
            RETURNING *
            `,
            [
                req.params.id,
                category_name,
                category_type,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
                trimOrNull(req.body.description),
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
        const result = await pool.query(
            'DELETE FROM categories WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Kategori bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
