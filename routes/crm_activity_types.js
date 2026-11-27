const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const onlyAktif = req.query.is_active === 'true';
        const result = await pool.query(
            `
            SELECT * FROM crm_activity_types
            ${onlyAktif ? 'WHERE is_active = TRUE' : ''}
            ORDER BY type_code
            `
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM crm_activity_types WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { type_code, type_name, is_active } = req.body;
        if (!type_code || !type_name) {
            return res.status(400).json({ hata: 'type_code ve type_name zorunlu.' });
        }
        const r = await pool.query(
            `
            INSERT INTO crm_activity_types (type_code, type_name, is_active)
            VALUES ($1,$2,COALESCE($3,TRUE)) RETURNING *
            `,
            [type_code, type_name, is_active]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { type_name, is_active } = req.body;
        const r = await pool.query(
            `
            UPDATE crm_activity_types SET
                type_name = COALESCE($2, type_name),
                is_active = COALESCE($3, is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, type_name || null, is_active]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_activity_types WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet tipi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
