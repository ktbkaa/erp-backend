const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

function trimOrNull(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string') {
        const t = v.trim();
        return t === '' ? null : t;
    }
    return v;
}

async function isYeriGetir(id) {
    const result = await pool.query(
        `
        SELECT i.*, f.company_name, f.company_code
        FROM plants i
        JOIN companies f ON i.company_id = f.id
        WHERE i.id = $1
        `,
        [id]
    );
    return result.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, f.company_name, f.company_code
            FROM plants i
            JOIN companies f ON i.company_id = f.id
            ${(() => { const fid = firmaIdFromReq(req); return fid ? 'WHERE i.company_id = ' + Number(fid) : ''; })()}
        ORDER BY i.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: 'İş yerleri çekilirken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await isYeriGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'İş yeri bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { company_id, address } = req.body;
        const plant_code = trimOrNull(req.body.plant_code);
        const plant_name = trimOrNull(req.body.plant_name);
        if (!company_id || !plant_name) {
            return res.status(400).json({ hata: 'company_id ve plant_name zorunludur.' });
        }
        if (!plant_code) {
            return res.status(400).json({ hata: 'plant_code zorunludur.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const result = await client.query(
                `
                INSERT INTO plants (company_id, plant_code, plant_name, address)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                `,
                [company_id, plant_code, plant_name, address || null]
            );
            return result.rows[0].id;
        });
        res.status(201).json(await isYeriGetir(id));
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İş yeri kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { company_id, plant_name, address } = req.body;
        if (!plant_name) return res.status(400).json({ hata: 'plant_name zorunludur.' });
        const result = await pool.query(
            `
            UPDATE plants SET
                company_id = COALESCE($2, company_id),
                plant_name = $3,
                address = $4
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, company_id || null, plant_name, address || null]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'İş yeri bulunamadı.' });
        res.json(await isYeriGetir(result.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM plants WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'İş yeri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
