const express = require('express');
const router = express.Router();
const pool = require('../db');

async function girisGetir(id) {
    const g = await pool.query(
        `
        SELECT ug.*,
               ue.emir_no, ue.stok_id, ue.planlanan_miktar, ue.uretilen_miktar, ue.durum AS emir_durum,
               s.stok_kodu, s.stok_adi
        FROM uretim_girisleri ug
        JOIN uretim_emirleri ue ON ue.id = ug.emir_id
        JOIN stoklar s ON s.id = ue.stok_id
        WHERE ug.id = $1
        `,
        [id]
    );
    if (!g.rows[0]) return null;
    return g.rows[0];
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM uretim_girisleri ORDER BY id DESC LIMIT 500');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await girisGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const giris = await girisGetir(req.params.id);
        if (!giris) return res.status(404).json({ hata: 'Üretim girişi bulunamadı.' });
        res.json(giris);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Yeni giriş: emir üzerinden üretim girişi tetiklenir */
router.post('/', async (req, res) => {
    try {
        const { emir_id, miktar } = req.body;
        if (!emir_id || miktar == null) {
            return res.status(400).json({ hata: 'emir_id ve miktar zorunlu.' });
        }
        const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
        const r = await fetch(`${base}/uretim-emirleri/${emir_id}/uretim-giris`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ miktar }),
        });
        const body = await r.json();
        if (!r.ok) return res.status(r.status).json(body);
        const son = await pool.query(
            `SELECT id FROM uretim_girisleri WHERE emir_id = $1 ORDER BY id DESC LIMIT 1`,
            [emir_id]
        );
        if (son.rows[0]) {
            return res.status(201).json(await girisGetir(son.rows[0].id));
        }
        res.status(201).json(body);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
