const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM sistem_parametreleri ORDER BY parametre_kodu');
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM sistem_parametreleri WHERE id=$1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { parametre_kodu, parametre_adi, deger, modul, aciklama, aktif } = req.body;
        if (!parametre_kodu || !parametre_adi) {
            return res.status(400).json({ hata: 'parametre_kodu ve parametre_adi zorunlu.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, modul, aciklama, aktif)
            VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
            RETURNING *
            `,
            [parametre_kodu, parametre_adi, deger || null, modul || null, aciklama || null, aktif]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { parametre_adi, deger, modul, aciklama, aktif } = req.body;
        const sonuc = await pool.query(
            `
            UPDATE sistem_parametreleri SET
                parametre_adi = COALESCE($2, parametre_adi),
                deger = COALESCE($3, deger),
                modul = COALESCE($4, modul),
                aciklama = COALESCE($5, aciklama),
                aktif = COALESCE($6, aktif)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, parametre_adi, deger, modul, aciklama, aktif]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('DELETE FROM sistem_parametreleri WHERE id=$1 RETURNING id', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Parametre bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
