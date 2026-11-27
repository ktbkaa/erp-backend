const express = require('express');
const router = express.Router();
const pool = require('../db');

async function girisGetir(id) {
    const g = await pool.query(
        `
        SELECT ug.*,
               ue.order_no, ue.item_id, ue.planlanan_quantity, ue.produced_quantity, ue.status AS emir_durum,
               s.item_code, s.item_name
        FROM production_receipts ug
        JOIN production_orders ue ON ue.id = ug.order_id
        JOIN items s ON s.id = ue.item_id
        WHERE ug.id = $1
        `,
        [id]
    );
    if (!g.rows[0]) return null;
    return g.rows[0];
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM production_receipts ORDER BY id DESC LIMIT 500');
        const result = [];
        for (const r of liste.rows) result.push(await girisGetir(r.id));
        res.json(result);
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
        const { order_id, quantity } = req.body;
        if (!order_id || quantity == null) {
            return res.status(400).json({ hata: 'order_id ve quantity zorunlu.' });
        }
        const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
        const r = await fetch(`${base}/uretim-emirleri/${order_id}/uretim-giris`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity }),
        });
        const body = await r.json();
        if (!r.ok) return res.status(r.status).json(body);
        const son = await pool.query(
            `SELECT id FROM production_receipts WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
            [order_id]
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
