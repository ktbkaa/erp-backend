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
        const { is_active, country_code } = req.query;
        const where = [];
        const params = [];
        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');
        if (country_code) {
            params.push(country_code);
            where.push(`country_code = $${params.length}`);
        }
        const sql = `SELECT * FROM cities ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY city_name`;
        res.json((await pool.query(sql, params)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM cities WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Şehir bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const city_name = trimOrNull(req.body.city_name);
        if (!city_name) return res.status(400).json({ hata: 'city_name zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.city_code) || (await sonrakiKod(client, 'SEHIR'));
            const ins = await client.query(
                `INSERT INTO cities (city_code, city_name, country_code, is_active)
                 VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING *`,
                [
                    kod,
                    city_name,
                    trimOrNull(req.body.country_code) || 'TR',
                    typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'Şehir kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const city_name = trimOrNull(req.body.city_name);
        if (!city_name) return res.status(400).json({ hata: 'city_name zorunludur.' });
        const upd = await pool.query(
            `UPDATE cities SET
                city_name = $2,
                country_code = COALESCE($3, country_code),
                is_active = COALESCE($4, is_active)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                city_name,
                trimOrNull(req.body.country_code),
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Şehir bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM cities WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Şehir bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
