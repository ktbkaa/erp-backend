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

router.get('/', async (req, res) => {
    try {
        const { is_active } = req.query;
        const where = [];
        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');
        const sql = `SELECT * FROM countries ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY country_name`;
        res.json((await pool.query(sql)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM countries WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Ülke bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const country_name = trimOrNull(req.body.country_name);
        if (!country_name) return res.status(400).json({ hata: 'country_name zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.country_code) || (await sonrakiKod(client, 'ULKE'));
            const ins = await client.query(
                `INSERT INTO countries (country_code, country_name, is_active)
                 VALUES ($1,$2,COALESCE($3,TRUE)) RETURNING *`,
                [kod, country_name, typeof req.body.is_active === 'boolean' ? req.body.is_active : true]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'Ülke kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const country_name = trimOrNull(req.body.country_name);
        if (!country_name) return res.status(400).json({ hata: 'country_name zorunludur.' });
        const upd = await pool.query(
            `UPDATE countries SET country_name=$2, is_active=COALESCE($3,is_active) WHERE id=$1 RETURNING *`,
            [req.params.id, country_name, typeof req.body.is_active === 'boolean' ? req.body.is_active : null]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Ülke bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM countries WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Ülke bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
