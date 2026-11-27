const express = require('express');
const router = express.Router();
const pool = require('../db');

async function bagGetir(id) {
    const result = await pool.query(
        `
        SELECT sd.*,
               s.item_code, s.item_name, s.item_type,
               d.warehouse_code, d.warehouse_name,
               iy.plant_code, iy.plant_name
        FROM item_warehouses sd
        JOIN items s ON s.id = sd.item_id
        JOIN warehouses d ON d.id = sd.warehouse_id
        LEFT JOIN plants iy ON iy.id = sd.plant_id
        WHERE sd.id = $1
        `,
        [id]
    );
    return result.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const { item_id, warehouse_id, is_active } = req.query;
        const params = [];
        const where = [];
        if (item_id) {
            params.push(Number(item_id));
            where.push(`sd.item_id = $${params.length}`);
        }
        if (warehouse_id) {
            params.push(Number(warehouse_id));
            where.push(`sd.warehouse_id = $${params.length}`);
        }
        if (is_active === 'true') where.push('sd.is_active = TRUE');
        if (is_active === 'false') where.push('sd.is_active = FALSE');

        const result = await pool.query(
            `
            SELECT sd.*,
                   s.item_code, s.item_name, s.item_type,
                   d.warehouse_code, d.warehouse_name,
                   iy.plant_code, iy.plant_name
            FROM item_warehouses sd
            JOIN items s ON s.id = sd.item_id
            JOIN warehouses d ON d.id = sd.warehouse_id
            LEFT JOIN plants iy ON iy.id = sd.plant_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY s.item_code, d.warehouse_code
            `,
            params
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await bagGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Stok-depo bağı bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { item_id, warehouse_id, plant_id, is_active, varsayilan_giris, varsayilan_cikis } = req.body;
        if (!item_id || !warehouse_id) {
            return res.status(400).json({ hata: 'item_id ve warehouse_id zorunlu.' });
        }
        const result = await pool.query(
            `
            INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active, varsayilan_giris, varsayilan_cikis)
            VALUES ($1,$2,$3,COALESCE($4,TRUE),COALESCE($5,FALSE),COALESCE($6,FALSE))
            ON CONFLICT (item_id, warehouse_id) DO UPDATE SET
                plant_id = COALESCE(EXCLUDED.plant_id, item_warehouses.plant_id),
                is_active = COALESCE(EXCLUDED.is_active, item_warehouses.is_active),
                varsayilan_giris = COALESCE(EXCLUDED.varsayilan_giris, item_warehouses.varsayilan_giris),
                varsayilan_cikis = COALESCE(EXCLUDED.varsayilan_cikis, item_warehouses.varsayilan_cikis)
            RETURNING id
            `,
            [item_id, warehouse_id, plant_id || null, is_active, varsayilan_giris, varsayilan_cikis]
        );
        res.status(201).json(await bagGetir(result.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { item_id, warehouse_id, plant_id, is_active, varsayilan_giris, varsayilan_cikis } = req.body;
        const result = await pool.query(
            `
            UPDATE item_warehouses SET
                item_id = COALESCE($2, item_id),
                warehouse_id = COALESCE($3, warehouse_id),
                plant_id = COALESCE($4, plant_id),
                is_active = COALESCE($5, is_active),
                varsayilan_giris = COALESCE($6, varsayilan_giris),
                varsayilan_cikis = COALESCE($7, varsayilan_cikis)
            WHERE id = $1
            RETURNING id
            `,
            [req.params.id, item_id || null, warehouse_id || null, plant_id ?? null, is_active, varsayilan_giris, varsayilan_cikis]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Stok-depo bağı bulunamadı.' });
        res.json(await bagGetir(result.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM item_warehouses WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Stok-depo bağı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
