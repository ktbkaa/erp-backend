const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

const APPLIES = ['Genel', 'Stok', 'Cari', 'Hepsi'];

router.get('/', async (req, res) => {
    try {
        const { applies_to, is_active } = req.query;
        const where = [];
        const params = [];
        if (applies_to) {
            params.push(applies_to);
            where.push(`(applies_to = $${params.length} OR applies_to = 'Hepsi')`);
        }
        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');
        const r = await pool.query(
            `SELECT type_code AS id, type_code, type_name, applies_to, is_active, description, created_at
             FROM category_types
             ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
             ORDER BY type_code`,
            params
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:kod', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT type_code AS id, type_code, type_name, applies_to, is_active, description, created_at
             FROM category_types WHERE type_code = $1`,
            [req.params.kod]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kategori tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const type_name = trimOrNull(req.body.type_name);
        const applies_to = trimOrNull(req.body.applies_to) || 'Genel';
        if (!type_name) return res.status(400).json({ hata: 'type_name zorunlu.' });
        if (!APPLIES.includes(applies_to)) {
            return res.status(400).json({ hata: `applies_to ${APPLIES.join('|')} olmalı.` });
        }
        const row = await withTransaction(pool, async (client) => {
            const kod = String(trimOrNull(req.body.type_code) || await sonrakiKod(client, 'KATEGORI_TIPI'))
                .replace(/[^A-Za-z0-9_-]/g, '')
                .slice(0, 40);
            const ins = await client.query(
                `INSERT INTO category_types (type_code, type_name, applies_to, is_active, description)
                 VALUES ($1,$2,$3,COALESCE($4,TRUE),$5)
                 RETURNING type_code AS id, type_code, type_name, applies_to, is_active, description, created_at`,
                [kod, type_name, applies_to, req.body.is_active !== false, trimOrNull(req.body.description)]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.put('/:kod', async (req, res) => {
    try {
        const applies_to = req.body.applies_to != null
            ? trimOrNull(req.body.applies_to)
            : undefined;
        if (applies_to && !APPLIES.includes(applies_to)) {
            return res.status(400).json({ hata: `applies_to ${APPLIES.join('|')} olmalı.` });
        }
        const r = await pool.query(
            `UPDATE category_types SET
                type_name = COALESCE($2, type_name),
                applies_to = COALESCE($3, applies_to),
                is_active = COALESCE($4, is_active),
                description = COALESCE($5, description)
             WHERE type_code = $1
             RETURNING type_code AS id, type_code, type_name, applies_to, is_active, description, created_at`,
            [
                req.params.kod,
                trimOrNull(req.body.type_name),
                applies_to || null,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
                req.body.description !== undefined ? trimOrNull(req.body.description) : null,
            ]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kategori tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
