const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(`
            SELECT i.*, f.firma_adi
            FROM is_yerleri i
            JOIN firmalar f ON i.firma_id = f.id
            ORDER BY i.id DESC
        `);
        res.json(sonuc.rows);
    } catch (err) {
        console.error('İş yeri listeleme hatası:', err);
        res.status(500).json({ hata: 'İş yerleri çekilirken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { firma_id, is_yeri_kodu, is_yeri_adi, adres } = req.body;
        if (!firma_id || !is_yeri_kodu || !is_yeri_adi) {
            return res.status(400).json({ hata: 'firma_id, is_yeri_kodu ve is_yeri_adi zorunludur.' });
        }

        const sonuc = await pool.query(
            `
            INSERT INTO is_yerleri (firma_id, is_yeri_kodu, is_yeri_adi, adres)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
            `,
            [firma_id, is_yeri_kodu, is_yeri_adi, adres || null]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('İş yeri kayıt hatası:', err);
        res.status(500).json({ hata: 'İş yeri eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
