const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

/** Şehir kodu + ilçe adındaki ünsüzler (TR). */
function districtCodeFrom(cityCode, districtName) {
    const vowels = new Set('aeıioöuüâêîôûAEIİOÖUÜÂÊÎÔÛ'.split(''));
    const cons = String(districtName || '')
        .split('')
        .filter((ch) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(ch) && !vowels.has(ch))
        .map((ch) => ch.toLocaleUpperCase('tr-TR'))
        .join('');
    return `${String(cityCode || '').trim()}${cons}`;
}

async function loadDistricts(client, cityCode) {
    if (!cityCode) return [];
    const r = await client.query(
        `SELECT * FROM districts WHERE city_code = $1 ORDER BY district_name, id`,
        [cityCode]
    );
    return r.rows;
}

async function syncDistricts(client, cityCode, rows) {
    const list = Array.isArray(rows) ? rows : [];
    const keepIds = [];
    const usedCodes = new Set();

    for (const raw of list) {
        const name = trimOrNull(raw.district_name);
        if (!name) continue;
        let kod = trimOrNull(raw.district_code) || districtCodeFrom(cityCode, name);
        if (!kod) continue;
        // Çakışma: aynı payload içinde veya DB’de
        let base = kod;
        let n = 2;
        while (usedCodes.has(kod.toLocaleUpperCase('tr-TR'))) {
            kod = `${base}${n}`;
            n += 1;
        }
        usedCodes.add(kod.toLocaleUpperCase('tr-TR'));

        const isActive = typeof raw.is_active === 'boolean' ? raw.is_active : true;
        const id = raw.id != null && raw.id !== '' ? Number(raw.id) : null;

        if (id && Number.isFinite(id)) {
            const upd = await client.query(
                `UPDATE districts SET
                    district_code = $2,
                    district_name = $3,
                    city_code = $4,
                    is_active = $5
                 WHERE id = $1 AND city_code = $4
                 RETURNING id`,
                [id, kod, name, cityCode, isActive]
            );
            if (upd.rows[0]) {
                keepIds.push(upd.rows[0].id);
                continue;
            }
        }

        // Kod zaten başka şehirdeyse veya unique: yeniden dene
        let inserted = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const tryKod = attempt === 0 ? kod : `${base}${attempt + 1}`;
            try {
                const ins = await client.query(
                    `INSERT INTO districts (district_code, district_name, city_code, is_active)
                     VALUES ($1,$2,$3,$4) RETURNING id`,
                    [tryKod, name, cityCode, isActive]
                );
                inserted = ins.rows[0];
                usedCodes.add(tryKod.toLocaleUpperCase('tr-TR'));
                break;
            } catch (err) {
                if (err.code !== '23505') throw err;
            }
        }
        if (inserted) keepIds.push(inserted.id);
    }

    if (keepIds.length) {
        await client.query(
            `DELETE FROM districts WHERE city_code = $1 AND NOT (id = ANY($2::int[]))`,
            [cityCode, keepIds]
        );
    } else {
        await client.query(`DELETE FROM districts WHERE city_code = $1`, [cityCode]);
    }
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
        const city = r.rows[0];
        const districts = await loadDistricts(pool, city.city_code);
        res.json({ ...city, districts });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const city_code = trimOrNull(req.body.city_code);
        const city_name = trimOrNull(req.body.city_name);
        if (!city_code) return res.status(400).json({ hata: 'city_code zorunludur.' });
        if (!city_name) return res.status(400).json({ hata: 'city_name zorunludur.' });
        const row = await withTransaction(pool, async (client) => {
            const ins = await client.query(
                `INSERT INTO cities (city_code, city_name, country_code, is_active)
                 VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING *`,
                [
                    city_code,
                    city_name,
                    trimOrNull(req.body.country_code) || 'TR',
                    typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
                ]
            );
            const city = ins.rows[0];
            await syncDistricts(client, city.city_code, req.body.districts);
            const districts = await loadDistricts(client, city.city_code);
            return { ...city, districts };
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
        const row = await withTransaction(pool, async (client) => {
            const existing = await client.query('SELECT * FROM cities WHERE id = $1', [req.params.id]);
            if (!existing.rows[0]) {
                const err = new Error('Şehir bulunamadı.');
                err.status = 404;
                throw err;
            }
            const oldCode = existing.rows[0].city_code;
            const newCode = trimOrNull(req.body.city_code) || oldCode;
            const upd = await client.query(
                `UPDATE cities SET
                    city_name = $2,
                    country_code = COALESCE($3, country_code),
                    is_active = COALESCE($4, is_active),
                    city_code = $5
                 WHERE id = $1 RETURNING *`,
                [
                    req.params.id,
                    city_name,
                    trimOrNull(req.body.country_code),
                    typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
                    newCode,
                ]
            );
            const city = upd.rows[0];
            if (oldCode !== city.city_code) {
                await client.query(
                    `UPDATE districts SET city_code = $2 WHERE city_code = $1`,
                    [oldCode, city.city_code]
                );
            }
            if (Object.prototype.hasOwnProperty.call(req.body, 'districts')) {
                await syncDistricts(client, city.city_code, req.body.districts);
            }
            const districts = await loadDistricts(client, city.city_code);
            return { ...city, districts };
        });
        res.json(row);
    } catch (err) {
        if (err.status === 404) return res.status(404).json({ hata: err.message });
        if (err.code === '23505') return res.status(409).json({ hata: 'Şehir veya ilçe kodu çakışması.' });
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const row = await withTransaction(pool, async (client) => {
            const existing = await client.query(
                'SELECT city_code FROM cities WHERE id = $1',
                [req.params.id]
            );
            if (!existing.rows[0]) return null;
            await client.query('DELETE FROM districts WHERE city_code = $1', [existing.rows[0].city_code]);
            const r = await client.query('DELETE FROM cities WHERE id=$1 RETURNING id', [req.params.id]);
            return r.rows[0];
        });
        if (!row) return res.status(404).json({ hata: 'Şehir bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.districtCodeFrom = districtCodeFrom;
