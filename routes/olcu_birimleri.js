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
        const { aktif } = req.query;
        let sql = 'SELECT * FROM olcu_birimleri';
        if (aktif === 'true') sql += ' WHERE aktif = TRUE';
        if (aktif === 'false') sql += ' WHERE aktif = FALSE';
        sql += ' ORDER BY birim_kodu ASC';
        const sonuc = await pool.query(sql);
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM olcu_birimleri WHERE id = $1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Ölçü birimi bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const birim_kodu = trimOrNull(req.body.birim_kodu);
        const birim_adi = trimOrNull(req.body.birim_adi);
        if (!birim_kodu || !birim_adi) {
            return res.status(400).json({ hata: 'birim_kodu ve birim_adi zorunludur.' });
        }
        const sonuc = await pool.query(
            `INSERT INTO olcu_birimleri (birim_kodu, birim_adi, aktif)
             VALUES ($1, $2, COALESCE($3, TRUE)) RETURNING *`,
            [birim_kodu, birim_adi, typeof req.body.aktif === 'boolean' ? req.body.aktif : true]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ hata: 'Bu birim kodu zaten var.', alan: 'birim_kodu' });
        }
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const birim_adi = trimOrNull(req.body.birim_adi);
        if (!birim_adi) {
            return res.status(400).json({ hata: 'birim_adi zorunludur.' });
        }
        const sonuc = await pool.query(
            `UPDATE olcu_birimleri SET
                birim_adi = $2,
                aktif = COALESCE($3, aktif)
             WHERE id = $1 RETURNING *`,
            [
                req.params.id,
                birim_adi,
                typeof req.body.aktif === 'boolean' ? req.body.aktif : null,
            ]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Ölçü birimi bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query(
            'DELETE FROM olcu_birimleri WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Ölçü birimi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
