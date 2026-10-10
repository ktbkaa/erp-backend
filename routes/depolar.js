const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(`
            SELECT d.*, i.is_yeri_kodu, i.is_yeri_adi, f.firma_adi
            FROM depolar d
            JOIN is_yerleri i ON d.is_yeri_id = i.id
            JOIN firmalar f ON i.firma_id = f.id
            ORDER BY d.id DESC
        `);
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Depo listeleme hatası:', err);
        res.status(500).json({ hata: 'Depolar çekilirken bir pürüz çıktı.', detay: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { is_yeri_id, depo_kodu, depo_adi, aktif } = req.body;
        if (!is_yeri_id || !depo_kodu || !depo_adi) {
            return res.status(400).json({
                hata: 'is_yeri_id, depo_kodu ve depo_adi zorunludur.',
            });
        }

        const sonuc = await pool.query(
            `
            INSERT INTO depolar (is_yeri_id, depo_kodu, depo_adi, aktif)
            VALUES ($1, $2, $3, COALESCE($4, TRUE))
            RETURNING *;
            `,
            [is_yeri_id, depo_kodu, depo_adi, aktif]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Depo kayıt hatası:', err);
        res.status(500).json({ hata: 'Depo eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
