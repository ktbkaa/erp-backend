const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.item_id) {
            params.push(Number(req.query.item_id));
            where.push(`sp.item_id=$${params.length}`);
        }
        const r = await pool.query(
            `
            SELECT sp.*, s.item_code, s.item_name, p.plan_code, p.plan_name
            FROM qc_item_plans sp
            JOIN items s ON s.id = sp.item_id
            JOIN qc_control_plans p ON p.id = sp.plan_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY s.item_code, sp.direction
            `,
            params
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { item_id, plan_id, direction, is_active } = req.body;
        if (!item_id || !plan_id || !direction) {
            return res.status(400).json({ hata: 'item_id, plan_id, direction zorunlu.' });
        }
        const r = await pool.query(
            `
            INSERT INTO qc_item_plans (item_id, plan_id, direction, is_active)
            VALUES ($1,$2,$3,COALESCE($4,TRUE))
            ON CONFLICT (item_id, direction) DO UPDATE SET plan_id=EXCLUDED.plan_id, is_active=EXCLUDED.is_active
            RETURNING *
            `,
            [item_id, plan_id, direction, is_active]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { plan_id, is_active } = req.body;
        const r = await pool.query(
            `
            UPDATE qc_item_plans SET
                plan_id=COALESCE($2,plan_id),
                is_active=COALESCE($3,is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, plan_id, is_active]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM qc_item_plans WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
