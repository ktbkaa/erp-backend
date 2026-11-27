const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_parameters ORDER BY parametre_code');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_parameters WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { parametre_code, parametre_name, value, module, description, is_active } = req.body;
        if (!parametre_code || !parametre_name) {
            return res.status(400).json({ hata: 'parametre_code ve parametre_name zorunlu.' });
        }
        const result = await pool.query(
            `
            INSERT INTO system_parameters (parametre_code, parametre_name, value, module, description, is_active)
            VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
            RETURNING *
            `,
            [parametre_code, parametre_name, value || null, module || null, description || null, is_active]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { parametre_name, value, module, description, is_active } = req.body;
        const result = await pool.query(
            `
            UPDATE system_parameters SET
                parametre_name = COALESCE($2, parametre_name),
                value = COALESCE($3, value),
                module = COALESCE($4, module),
                description = COALESCE($5, description),
                is_active = COALESCE($6, is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, parametre_name, value, module, description, is_active]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM system_parameters WHERE id=$1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
