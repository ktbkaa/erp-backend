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
        const where = [];
        if (is_active === 'true') where.push('is_active = TRUE');
        if (is_active === 'false') where.push('is_active = FALSE');
        const sql = `SELECT * FROM currencies ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY currency_code`;
        res.json((await pool.query(sql)).rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM currencies WHERE id = $1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const currency_code = trimOrNull(req.body.currency_code);
        const currency_name = trimOrNull(req.body.currency_name);
        if (!currency_code) return res.status(400).json({ hata: 'currency_code zorunludur.' });
        if (!currency_name) return res.status(400).json({ hata: 'currency_name zorunludur.' });
        // Sembol boşsa para birimi kodu kullanılır
        const sembol = trimOrNull(req.body.sembol) || currency_code;
        const ins = await pool.query(
            `INSERT INTO currencies (currency_code, currency_name, sembol, is_active)
             VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING *`,
            [
                currency_code,
                currency_name,
                sembol,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
            ]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ hata: 'Para birimi kodu zaten var.' });
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const currency_name = trimOrNull(req.body.currency_name);
        if (!currency_name) return res.status(400).json({ hata: 'currency_name zorunludur.' });
        const existing = await pool.query(
            'SELECT currency_code FROM currencies WHERE id = $1',
            [req.params.id]
        );
        if (!existing.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        const kod = trimOrNull(req.body.currency_code) || existing.rows[0].currency_code;
        // Sembol boş/gönderilmediyse kod; açıkça gönderildiyse o değer
        const sembol = Object.prototype.hasOwnProperty.call(req.body, 'sembol')
            ? (trimOrNull(req.body.sembol) || kod)
            : null;
        const upd = await pool.query(
            `UPDATE currencies SET
                currency_name = $2,
                sembol = COALESCE($3, sembol),
                is_active = COALESCE($4, is_active)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                currency_name,
                sembol,
                typeof req.body.is_active === 'boolean' ? req.body.is_active : null,
            ]
        );
        if (!upd.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        res.json(upd.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM currencies WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Para birimi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
