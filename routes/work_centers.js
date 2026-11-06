const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

async function merkezGetir(id) {
    const result = await pool.query(
        `
        SELECT m.*, i.plant_code, i.plant_name, i.company_id
        FROM work_centers m
        JOIN plants i ON i.id = m.plant_id
        WHERE m.id = $1
        `,
        [id]
    );
    return result.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        let firmaSql = '';
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            firmaSql = ` WHERE i.company_id = $${params.length}`;
        }
        const result = await pool.query(`
            SELECT m.*, i.plant_code, i.plant_name, i.company_id
            FROM work_centers m
            JOIN plants i ON i.id = m.plant_id
            ${firmaSql}
            ORDER BY m.id
        `, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await merkezGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        const firmaId = firmaIdFromReq(req);
        if (firmaId && Number(row.company_id) !== Number(firmaId)) {
            return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { plant_id, center_code, center_name } = req.body;
        const kod = typeof center_code === 'string' ? center_code.trim() : center_code;
        if (!plant_id || !center_name) {
            return res.status(400).json({ hata: 'plant_id ve center_name zorunlu.' });
        }
        if (!kod) {
            return res.status(400).json({ hata: 'center_code zorunlu.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const result = await client.query(
                `INSERT INTO work_centers (plant_id, center_code, center_name)
                 VALUES ($1,$2,$3) RETURNING id`,
                [plant_id, kod, center_name]
            );
            return result.rows[0].id;
        });
        res.status(201).json(await merkezGetir(id));
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'İş merkezi kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { plant_id, center_name } = req.body;
        if (!center_name) return res.status(400).json({ hata: 'center_name zorunlu.' });
        const upd = await pool.query(
            `
            UPDATE work_centers SET
                plant_id = COALESCE($2, plant_id),
                center_name = $3
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, plant_id || null, center_name]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        res.json(await merkezGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM work_centers WHERE id = $1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'İş merkezi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
