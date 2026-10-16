const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM kullanici_gruplari ORDER BY grup_kodu');
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM kullanici_gruplari WHERE id=$1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { grup_kodu, grup_adi, aciklama, aktif, satinalma_onay, satinalma_talep, kalite_kontrol } = req.body;
        if (!grup_kodu || !grup_adi) {
            return res.status(400).json({ hata: 'grup_kodu ve grup_adi zorunlu.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO kullanici_gruplari
                (grup_kodu, grup_adi, aciklama, aktif, satinalma_onay, satinalma_talep, kalite_kontrol)
            VALUES ($1,$2,$3,COALESCE($4,TRUE),COALESCE($5,FALSE),COALESCE($6,TRUE),COALESCE($7,FALSE))
            RETURNING *
            `,
            [grup_kodu, grup_adi, aciklama || null, aktif, satinalma_onay, satinalma_talep, kalite_kontrol]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { grup_adi, aciklama, aktif, satinalma_onay, satinalma_talep, kalite_kontrol } = req.body;
        const sonuc = await pool.query(
            `
            UPDATE kullanici_gruplari SET
                grup_adi = COALESCE($2, grup_adi),
                aciklama = COALESCE($3, aciklama),
                aktif = COALESCE($4, aktif),
                satinalma_onay = COALESCE($5, satinalma_onay),
                satinalma_talep = COALESCE($6, satinalma_talep),
                kalite_kontrol = COALESCE($7, kalite_kontrol)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, grup_adi, aciklama, aktif, satinalma_onay, satinalma_talep, kalite_kontrol]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('DELETE FROM kullanici_gruplari WHERE id=$1 RETURNING id', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Grup bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
