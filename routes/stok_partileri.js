const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.stok_id) {
            params.push(Number(req.query.stok_id));
            where.push(`p.stok_id = $${params.length}`);
        }
        if (req.query.aktif === 'true') where.push('p.aktif = TRUE');
        const sql = `
            SELECT p.*, s.stok_kodu, s.stok_adi, s.parti_politika
            FROM stok_partileri p
            JOIN stoklar s ON s.id = p.stok_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY p.id DESC
        `;
        const r = await pool.query(sql, params);
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const r = await pool.query(
            `
            SELECT p.*, s.stok_kodu, s.stok_adi
            FROM stok_partileri p JOIN stoklar s ON s.id = p.stok_id
            WHERE p.id=$1
            `,
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Parti bulunamadı.' });
        const hareketler = await pool.query(
            `
            SELECT h.hareket_no, h.hareket_tipi, h.hareket_tarihi, h.depo_id, d.depo_kodu,
                   s.miktar, s.yon, s.stok_statu, s.birim
            FROM stok_hareket_satirlari s
            JOIN stok_hareketleri h ON h.id = s.hareket_id
            JOIN depolar d ON d.id = h.depo_id
            WHERE s.parti_id=$1
            ORDER BY h.id DESC
            LIMIT 200
            `,
            [req.params.id]
        );
        res.json({ ...r.rows[0], hareketler: hareketler.rows });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { stok_id, parti_no, uretim_tarihi, son_kullanma_tarihi, aciklama } = req.body;
        if (!stok_id) return res.status(400).json({ hata: 'stok_id zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const no = parti_no || (await sonrakiKod(client, 'PARTI'));
            const r = await client.query(
                `
                INSERT INTO stok_partileri (stok_id, parti_no, uretim_tarihi, son_kullanma_tarihi, aciklama)
                VALUES ($1,$2,$3,$4,$5) RETURNING id
                `,
                [stok_id, no, uretim_tarihi || null, son_kullanma_tarihi || null, aciklama || null]
            );
            return r.rows[0].id;
        });
        const row = await pool.query(`SELECT * FROM stok_partileri WHERE id=$1`, [id]);
        res.status(201).json(row.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { uretim_tarihi, son_kullanma_tarihi, aciklama, aktif } = req.body;
        const r = await pool.query(
            `
            UPDATE stok_partileri SET
                uretim_tarihi = COALESCE($2, uretim_tarihi),
                son_kullanma_tarihi = COALESCE($3, son_kullanma_tarihi),
                aciklama = COALESCE($4, aciklama),
                aktif = COALESCE($5, aktif)
            WHERE id=$1 RETURNING *
            `,
            [req.params.id, uretim_tarihi, son_kullanma_tarihi, aciklama, aktif]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Parti bulunamadı.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
