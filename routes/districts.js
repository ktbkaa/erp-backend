const express = require('express');
const router = express.Router();
const pool = require('../db');

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

function districtCodeFrom(cityCode, districtName) {
    const vowels = new Set('aeıioöuüâêîôûAEIİOÖUÜÂÊÎÔÛ'.split(''));
    const cons = String(districtName || '')
        .split('')
        .filter((ch) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(ch) && !vowels.has(ch))
        .map((ch) => ch.toLocaleUpperCase('tr-TR'))
        .join('');
    return `${String(cityCode || '').trim()}${cons}`;
}

router.post('/', async (req, res) => {
    try {
        const district_name = trimOrNull(req.body.district_name);
        const city_code = trimOrNull(req.body.city_code);
        if (!district_name) return res.status(400).json({ hata: 'district_name zorunludur.' });
        if (!city_code) return res.status(400).json({ hata: 'city_code zorunludur.' });
        const district_code = trimOrNull(req.body.district_code)
            || districtCodeFrom(city_code, district_name);
        if (!district_code) return res.status(400).json({ hata: 'district_code üretilemedi.' });
        const is_active = typeof req.body.is_active === 'boolean' ? req.body.is_active : true;
        try {
            const ins = await pool.query(
                `INSERT INTO districts (district_code, district_name, city_code, is_active)
                 VALUES ($1,$2,$3,$4) RETURNING *`,
                [district_code, district_name, city_code, is_active]
            );
            return res.status(201).json(ins.rows[0]);
        } catch (err) {
            if (err.code !== '23505') throw err;
            // Aynı şehirde kod zaten varsa: mevcut kaydı güncelle (formda “kayıp” orphan satır)
            const existing = await pool.query(
                `SELECT * FROM districts WHERE lower(district_code) = lower($1)`,
                [district_code]
            );
            const hit = existing.rows[0];
            if (hit && String(hit.city_code) === String(city_code)) {
                const upd = await pool.query(
                    `UPDATE districts SET
                        district_name = $2,
                        city_code = $3,
                        is_active = $4,
                        district_code = $5
                     WHERE id = $1 RETURNING *`,
                    [hit.id, district_name, city_code, is_active, district_code]
                );
                return res.json(upd.rows[0]);
            }
            return res.status(409).json({
                hata: 'İlçe kodu zaten var.',
                existing_id: hit?.id || null,
                city_code: hit?.city_code || null,
            });
        }
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const district_name = trimOrNull(req.body.district_name);
        if (!district_name) return res.status(400).json({ hata: 'district_name zorunludur.' });
        const city_code = trimOrNull(req.body.city_code);
        let district_code = trimOrNull(req.body.district_code);
        if (!district_code && city_code) {
            district_code = districtCodeFrom(city_code, district_name);
        }
        const upd = await pool.query(
            `UPDATE districts SET
                district_name = $2,
                city_code = COALESCE($3, city_code),
                is_active = COALESCE($4, is_active),
                district_code = COALESCE($5, district_code)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                district_name,
                city_code,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
                district_code,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'İlçe bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İlçe kodu zaten var.' });
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
