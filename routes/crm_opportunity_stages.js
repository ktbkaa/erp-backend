const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const onlyAktif = req.query.is_active === 'true';
        const result = await pool.query(
            `
            SELECT * FROM crm_opportunity_stages
            ${onlyAktif ? 'WHERE is_active = TRUE' : ''}
            ORDER BY line_no, stage_code
            `
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM crm_opportunity_stages WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Aşama bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { stage_code, stage_name, line_no, is_won, is_lost, is_active } = req.body;
        if (!stage_code || !stage_name) {
            return res.status(400).json({ hata: 'stage_code ve stage_name zorunlu.' });
        }
        const r = await pool.query(
            `
            INSERT INTO crm_opportunity_stages
                (stage_code, stage_name, line_no, is_won, is_lost, is_active)
            VALUES ($1,$2,COALESCE($3,10),COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,TRUE))
            RETURNING *
            `,
            [stage_code, stage_name, line_no, is_won, is_lost, is_active]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { stage_name, line_no, is_won, is_lost, is_active } = req.body;
        const r = await pool.query(
            `
            UPDATE crm_opportunity_stages SET
                stage_name = COALESCE($2, stage_name),
                line_no = COALESCE($3, line_no),
                is_won = COALESCE($4, is_won),
                is_lost = COALESCE($5, is_lost),
                is_active = COALESCE($6, is_active)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, stage_name || null, line_no ?? null, is_won, is_lost, is_active]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Aşama bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_opportunity_stages WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Aşama bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
