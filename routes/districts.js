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
        const { is_active, city_code, city_name } = req.query;
        const where = [];
        const params = [];
        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');
        if (city_code) {
            params.push(city_code);
            where.push(`city_code = $${params.length}`);
        }
        if (city_name) {
            params.push(city_name);
            where.push(`city_code IN (SELECT city_code FROM cities WHERE lower(city_name) = lower($${params.length}))`);
        }
        const sql = `SELECT * FROM districts ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY district_name`;
        res.json((await pool.query(sql, params)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM districts WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const district_name = trimOrNull(req.body.district_name);
        if (!district_name) return res.status(400).json({ hata: 'district_name zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const kod = trimOrNull(req.body.district_code) || (await sonrakiKod(client, 'ILCE'));
            const ins = await client.query(
                `INSERT INTO districts (district_code, district_name, city_code, is_active)
                 VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING *`,
                [
                    kod,
                    district_name,
                    trimOrNull(req.body.city_code),
                    typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
                ]
            );
            return ins.rows[0];
        });
        res.status(201).json(row);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İlçe kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const district_name = trimOrNull(req.body.district_name);
        if (!district_name) return res.status(400).json({ hata: 'district_name zorunludur.' });
        const upd = await pool.query(
            `UPDATE districts SET
                district_name = $2,
                city_code = COALESCE($3, city_code),
                is_active = COALESCE($4, is_active)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                district_name,
                trimOrNull(req.body.city_code),
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM districts WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
