const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.stok_id) {
            params.push(Number(req.query.stok_id));
            where.push(`sp.stok_id=$${params.length}`);
        }
        const r = await pool.query(
            `
            SELECT sp.*, s.stok_kodu, s.stok_adi, p.plan_kodu, p.plan_adi
            FROM kk_stok_planlari sp
            JOIN stoklar s ON s.id = sp.stok_id
            JOIN kk_kontrol_planlari p ON p.id = sp.plan_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY s.stok_kodu, sp.yon
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
        const { stok_id, plan_id, yon, aktif } = req.body;
        if (!stok_id || !plan_id || !yon) {
            return res.status(400).json({ hata: 'stok_id, plan_id, yon zorunlu.' });
        }
        const r = await pool.query(
            `
            INSERT INTO kk_stok_planlari (stok_id, plan_id, yon, aktif)
            VALUES ($1,$2,$3,COALESCE($4,TRUE))
            ON CONFLICT (stok_id, yon) DO UPDATE SET plan_id=EXCLUDED.plan_id, aktif=EXCLUDED.aktif
            RETURNING *
            `,
            [stok_id, plan_id, yon, aktif]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { plan_id, aktif } = req.body;
        const r = await pool.query(
            `
            UPDATE kk_stok_planlari SET
                plan_id=COALESCE($2,plan_id),
                aktif=COALESCE($3,aktif)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, plan_id, aktif]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM kk_stok_planlari WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
