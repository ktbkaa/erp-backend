const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const onlyAktif = req.query.aktif === 'true';
        const sonuc = await pool.query(
            `
            SELECT * FROM crm_faaliyet_tipleri
            ${onlyAktif ? 'WHERE aktif = TRUE' : ''}
            ORDER BY tip_kodu
            `
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM crm_faaliyet_tipleri WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { tip_kodu, tip_adi, aktif } = req.body;
        if (!tip_kodu || !tip_adi) {
            return res.status(400).json({ hata: 'tip_kodu ve tip_adi zorunlu.' });
        }
        const r = await pool.query(
            `
            INSERT INTO crm_faaliyet_tipleri (tip_kodu, tip_adi, aktif)
            VALUES ($1,$2,COALESCE($3,TRUE)) RETURNING *
            `,
            [tip_kodu, tip_adi, aktif]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { tip_adi, aktif } = req.body;
        const r = await pool.query(
            `
            UPDATE crm_faaliyet_tipleri SET
                tip_adi = COALESCE($2, tip_adi),
                aktif = COALESCE($3, aktif)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, tip_adi || null, aktif]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet tipi bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_faaliyet_tipleri WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Faaliyet tipi bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
