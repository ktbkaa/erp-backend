const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM stok_siniflari ORDER BY sinif_kodu');
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM stok_siniflari WHERE id=$1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Sınıf bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { sinif_kodu, sinif_adi, ust_sinif_kodu, aciklama, aktif } = req.body;
        if (!sinif_kodu || !sinif_adi) {
            return res.status(400).json({ hata: 'sinif_kodu ve sinif_adi zorunlu.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO stok_siniflari (sinif_kodu, sinif_adi, ust_sinif_kodu, aciklama, aktif)
            VALUES ($1,$2,$3,$4,COALESCE($5,TRUE)) RETURNING *
            `,
            [sinif_kodu, sinif_adi, ust_sinif_kodu || null, aciklama || null, aktif]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { sinif_adi, ust_sinif_kodu, aciklama, aktif } = req.body;
        const sonuc = await pool.query(
            `
            UPDATE stok_siniflari SET
                sinif_adi = COALESCE($2, sinif_adi),
                ust_sinif_kodu = COALESCE($3, ust_sinif_kodu),
                aciklama = COALESCE($4, aciklama),
                aktif = COALESCE($5, aktif)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, sinif_adi, ust_sinif_kodu, aciklama, aktif]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Sınıf bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('DELETE FROM stok_siniflari WHERE id=$1 RETURNING id', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Sınıf bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
