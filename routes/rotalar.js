const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

async function rotaGetir(id) {
    const baslik = await pool.query(`
        SELECT r.*, s.stok_kodu, s.stok_adi
        FROM rotalar r JOIN stoklar s ON s.id = r.stok_id
        WHERE r.id = $1
    `, [id]);
    if (!baslik.rows[0]) return null;
    const ops = await pool.query(`
        SELECT o.*, m.merkez_kodu, m.merkez_adi
        FROM rota_operasyonlari o
        LEFT JOIN is_merkezleri m ON m.id = o.is_merkezi_id
        WHERE o.rota_id = $1
        ORDER BY o.sira_no
    `, [id]);
    return { ...baslik.rows[0], operasyonlar: ops.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM rotalar ORDER BY id DESC');
        const sonuc = [];
        for (const r of liste.rows) sonuc.push(await rotaGetir(r.id));
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { stok_id, rota_kodu, rota_adi, operasyonlar } = req.body;
        if (!stok_id || !rota_kodu || !rota_adi || !Array.isArray(operasyonlar) || operasyonlar.length === 0) {
            return res.status(400).json({ hata: 'stok_id, rota_kodu, rota_adi ve operasyonlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const baslik = await client.query(
                `INSERT INTO rotalar (stok_id, rota_kodu, rota_adi) VALUES ($1,$2,$3) RETURNING id`,
                [stok_id, rota_kodu, rota_adi]
            );
            const rotaId = baslik.rows[0].id;
            for (const op of operasyonlar) {
                await client.query(
                    `INSERT INTO rota_operasyonlari
                        (rota_id, sira_no, operasyon_kodu, operasyon_adi, is_merkezi_id, sure_dk)
                     VALUES ($1,$2,$3,$4,$5,$6)`,
                    [rotaId, op.sira_no, op.operasyon_kodu, op.operasyon_adi, op.is_merkezi_id || null, op.sure_dk || 0]
                );
            }
            return rotaId;
        });

        res.status(201).json(await rotaGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
