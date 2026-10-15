const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM kisiler ORDER BY id DESC');
        res.json(sonuc.rows);
    } catch (err) {
        console.error('Kişi listeleme hatası:', err);
        res.status(500).json({ hata: 'Kişiler çekilirken bir pürüz çıktı.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM kisiler WHERE id=$1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { ad, soyad, eposta, telefon, rol, kullanici_kodu, aktif, grup_kodu } = req.body;
        if (!ad || !soyad) {
            return res.status(400).json({ hata: 'ad ve soyad zorunludur.' });
        }

        const sonuc = await pool.query(
            `
            INSERT INTO kisiler (ad, soyad, eposta, telefon, rol, kullanici_kodu, aktif, grup_kodu)
            VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE), $8)
            RETURNING *;
            `,
            [
                ad,
                soyad,
                eposta || null,
                telefon || null,
                rol || 'Personel',
                kullanici_kodu || null,
                aktif,
                grup_kodu || null,
            ]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        console.error('Kişi kayıt hatası:', err);
        res.status(500).json({ hata: 'Kişi eklenirken bir pürüz çıktı.', detay: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { ad, soyad, eposta, telefon, rol, kullanici_kodu, aktif, grup_kodu } = req.body;
        const sonuc = await pool.query(
            `
            UPDATE kisiler SET
                ad = COALESCE($2, ad),
                soyad = COALESCE($3, soyad),
                eposta = COALESCE($4, eposta),
                telefon = COALESCE($5, telefon),
                rol = COALESCE($6, rol),
                kullanici_kodu = COALESCE($7, kullanici_kodu),
                aktif = COALESCE($8, aktif),
                grup_kodu = COALESCE($9, grup_kodu)
            WHERE id=$1
            RETURNING *
            `,
            [req.params.id, ad, soyad, eposta, telefon, rol, kullanici_kodu, aktif, grup_kodu]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('DELETE FROM kisiler WHERE id=$1 RETURNING id', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
