const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const onlyAktif = req.query.aktif === 'true';
        const sonuc = await pool.query(
            `
            SELECT * FROM crm_firsat_asamalari
            ${onlyAktif ? 'WHERE aktif = TRUE' : ''}
            ORDER BY sira_no, asama_kodu
            `
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM crm_firsat_asamalari WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Aşama bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { asama_kodu, asama_adi, sira_no, kazanan, kaybeden, aktif } = req.body;
        if (!asama_kodu || !asama_adi) {
            return res.status(400).json({ hata: 'asama_kodu ve asama_adi zorunlu.' });
        }
        const r = await pool.query(
            `
            INSERT INTO crm_firsat_asamalari
                (asama_kodu, asama_adi, sira_no, kazanan, kaybeden, aktif)
            VALUES ($1,$2,COALESCE($3,10),COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,TRUE))
            RETURNING *
            `,
            [asama_kodu, asama_adi, sira_no, kazanan, kaybeden, aktif]
        );
        res.status(201).json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { asama_adi, sira_no, kazanan, kaybeden, aktif } = req.body;
        const r = await pool.query(
            `
            UPDATE crm_firsat_asamalari SET
                asama_adi = COALESCE($2, asama_adi),
                sira_no = COALESCE($3, sira_no),
                kazanan = COALESCE($4, kazanan),
                kaybeden = COALESCE($5, kaybeden),
                aktif = COALESCE($6, aktif)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, asama_adi || null, sira_no ?? null, kazanan, kaybeden, aktif]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Aşama bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM crm_firsat_asamalari WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Aşama bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
