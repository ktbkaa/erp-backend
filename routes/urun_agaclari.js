const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

async function agacGetir(id) {
    const baslik = await pool.query('SELECT ua.*, s.stok_kodu, s.stok_adi, s.stok_tipi FROM urun_agaclari ua JOIN stoklar s ON s.id = ua.mamul_stok_id WHERE ua.id = $1', [id]);
    if (!baslik.rows[0]) return null;
    const satirlar = await pool.query(`
        SELECT us.*, st.stok_kodu, st.stok_adi, st.stok_tipi
        FROM urun_agaci_satirlari us
        JOIN stoklar st ON st.id = us.bilesen_stok_id
        WHERE us.urun_agaci_id = $1
        ORDER BY us.sira_no, us.id
    `, [id]);
    return { ...baslik.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await pool.query(`
            SELECT ua.*, s.stok_kodu, s.stok_adi, s.stok_tipi
            FROM urun_agaclari ua
            JOIN stoklar s ON s.id = ua.mamul_stok_id
            ORDER BY ua.id DESC
        `);
        const sonuc = [];
        for (const a of liste.rows) {
            sonuc.push(await agacGetir(a.id));
        }
        res.json(sonuc);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const agac = await agacGetir(req.params.id);
        if (!agac) return res.status(404).json({ hata: 'Ürün ağacı bulunamadı.' });
        res.json(agac);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { mamul_stok_id, agac_kodu, agac_adi, miktar, satirlar } = req.body;
        if (!mamul_stok_id || !agac_kodu || !agac_adi || !Array.isArray(satirlar) || satirlar.length === 0) {
            return res.status(400).json({ hata: 'mamul_stok_id, agac_kodu, agac_adi ve satirlar zorunlu.' });
        }

        const kayit = await withTransaction(pool, async (client) => {
            const baslik = await client.query(
                `INSERT INTO urun_agaclari (mamul_stok_id, agac_kodu, agac_adi, miktar)
                 VALUES ($1,$2,$3,COALESCE($4,1)) RETURNING *`,
                [mamul_stok_id, agac_kodu, agac_adi, miktar]
            );
            const ua = baslik.rows[0];
            let sira = 10;
            for (const s of satirlar) {
                await client.query(
                    `INSERT INTO urun_agaci_satirlari (urun_agaci_id, bilesen_stok_id, miktar, birim, sira_no)
                     VALUES ($1,$2,$3,$4,$5)`,
                    [ua.id, s.bilesen_stok_id, s.miktar, s.birim || null, s.sira_no || sira]
                );
                sira += 10;
            }
            return ua.id;
        });

        res.status(201).json(await agacGetir(kayit));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
