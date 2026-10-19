const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { gonderBir, yenidenDene } = require('../src/services/epostaService');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.durum) {
            params.push(req.query.durum);
            where.push(`durum=$${params.length}`);
        }
        if (req.query.kaynak_tipi) {
            params.push(req.query.kaynak_tipi);
            where.push(`kaynak_tipi=$${params.length}`);
        }
        if (req.query.kaynak_id) {
            params.push(Number(req.query.kaynak_id));
            where.push(`kaynak_id=$${params.length}`);
        }
        const r = await pool.query(
            `
            SELECT * FROM eposta_gonderimleri
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY id DESC LIMIT 500
            `,
            params
        );
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM eposta_gonderimleri WHERE id=$1', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt yok.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/:id/gonder', async (req, res) => {
    try {
        const sonuc = await withTransaction(pool, async (client) => gonderBir(client, Number(req.params.id)));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/:id/yeniden-dene', async (req, res) => {
    try {
        const sonuc = await withTransaction(pool, async (client) => yenidenDene(client, Number(req.params.id)));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
