const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM item_classes ORDER BY class_code');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM item_classes WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Sınıf bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { class_code, class_name, parent_class_code, description, is_active } = req.body;
        if (!class_code || !class_name) {
            return res.status(400).json({ hata: 'class_code ve class_name zorunlu.' });
        }
        const result = await pool.query(
            `
            INSERT INTO item_classes (class_code, class_name, parent_class_code, description, is_active)
            VALUES ($1,$2,$3,$4,COALESCE($5,TRUE)) RETURNING *
            `,
            [class_code, class_name, parent_class_code || null, description || null, is_active]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { class_name, parent_class_code, description, is_active } = req.body;
        const result = await pool.query(
            `
            UPDATE item_classes SET
                class_name = COALESCE($2, class_name),
                parent_class_code = COALESCE($3, parent_class_code),
                description = COALESCE($4, description),
                is_active = COALESCE($5, is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, class_name, parent_class_code, description, is_active]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Sınıf bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM item_classes WHERE id=$1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Sınıf bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
