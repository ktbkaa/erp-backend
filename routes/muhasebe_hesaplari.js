const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
    try {
        const sonuc = await pool.query(
            'SELECT * FROM muhasebe_hesaplari ORDER BY hesap_kodu'
        );
        res.json(sonuc.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const sonuc = await pool.query('SELECT * FROM muhasebe_hesaplari WHERE id=$1', [req.params.id]);
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { hesap_kodu, hesap_adi, hesap_tipi, ust_hesap_kodu, para_birimi, aktif } = req.body;
        if (!hesap_kodu || !hesap_adi) {
            return res.status(400).json({ hata: 'hesap_kodu ve hesap_adi zorunlu.' });
        }
        const tip = hesap_tipi || 'Dogrudan';
        if (!['Ana', 'Ust', 'Dogrudan'].includes(tip)) {
            return res.status(400).json({ hata: 'Geçersiz hesap_tipi.' });
        }
        const sonuc = await pool.query(
            `
            INSERT INTO muhasebe_hesaplari
                (hesap_kodu, hesap_adi, hesap_tipi, ust_hesap_kodu, para_birimi, aktif)
            VALUES ($1,$2,$3,$4,COALESCE($5,'TRY'),COALESCE($6,TRUE))
            RETURNING *
            `,
            [hesap_kodu, hesap_adi, tip, ust_hesap_kodu || null, para_birimi, aktif]
        );
        res.status(201).json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { hesap_adi, hesap_tipi, ust_hesap_kodu, para_birimi, aktif, silinecek } = req.body;
        if (hesap_tipi && !['Ana', 'Ust', 'Dogrudan'].includes(hesap_tipi)) {
            return res.status(400).json({ hata: 'Geçersiz hesap_tipi.' });
        }
        const sonuc = await pool.query(
            `
            UPDATE muhasebe_hesaplari SET
                hesap_adi = COALESCE($2, hesap_adi),
                hesap_tipi = COALESCE($3, hesap_tipi),
                ust_hesap_kodu = COALESCE($4, ust_hesap_kodu),
                para_birimi = COALESCE($5, para_birimi),
                aktif = COALESCE($6, aktif),
                silinecek = COALESCE($7, silinecek)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, hesap_adi, hesap_tipi, ust_hesap_kodu, para_birimi, aktif, silinecek]
        );
        if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
        res.json(sonuc.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const check = await pool.query('SELECT silinecek FROM muhasebe_hesaplari WHERE id=$1', [req.params.id]);
        if (!check.rows[0]) return res.status(404).json({ hata: 'Hesap bulunamadı.' });
        if (!check.rows[0].silinecek) {
            return res.status(400).json({
                hata: 'Kalıcı silme için önce silinecek=true işaretleyin (FINT01 akışı).',
            });
        }
        const sonuc = await pool.query('DELETE FROM muhasebe_hesaplari WHERE id=$1 RETURNING id', [req.params.id]);
        res.json({ silindi: true, id: Number(sonuc.rows[0].id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
