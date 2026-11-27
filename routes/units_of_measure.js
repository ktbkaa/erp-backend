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
        const { is_active } = req.query;
        let sql = 'SELECT * FROM units_of_measure';
        if (is_active === 'true') sql += ' WHERE is_active = TRUE';
        if (is_active === 'false') sql += ' WHERE is_active = FALSE';
        sql += ' ORDER BY uom_code ASC';
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM units_of_measure WHERE id = $1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Ölçü birimi bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const uom_code = trimOrNull(req.body.uom_code);
        const uom_name = trimOrNull(req.body.uom_name);
        if (!uom_code || !uom_name) {
            return res.status(400).json({ hata: 'uom_code ve uom_name zorunludur.' });
        }
        const result = await pool.query(
            `INSERT INTO units_of_measure (uom_code, uom_name, is_active)
             VALUES ($1, $2, COALESCE($3, TRUE)) RETURNING *`,
            [uom_code, uom_name, typeof req.body.is_active === 'boolean' ? req.body.is_active : true]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu uom_code kodu zaten var.', alan: 'uom_code' });
        }
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const uom_name = trimOrNull(req.body.uom_name);
        if (!uom_name) {
            return res.status(400).json({ hata: 'uom_name zorunludur.' });
        }
        const result = await pool.query(
            `UPDATE units_of_measure SET
                uom_name = $2,
                is_active = COALESCE($3, is_active)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                uom_name,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
            ]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Ölçü birimi bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM units_of_measure WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Ölçü birimi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
