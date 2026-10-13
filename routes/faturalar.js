const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res) => {
    try {
        const faturalarRes = await pool.query(`
            SELECT f.*, c.cari_adi
            FROM faturalar f
            JOIN cariler c ON f.cari_id = c.id
            ORDER BY f.id DESC
        `);

        const faturalar = [];
        for (const fatura of faturalarRes.rows) {
            const detaylarRes = await pool.query(
                `
                SELECT fd.*, s.stok_kodu, s.stok_adi
                FROM fatura_detaylari fd
                JOIN stoklar s ON fd.stok_id = s.id
                WHERE fd.fatura_id = $1
                `,
                [fatura.id]
            );
            faturalar.push({
                ...fatura,
                kalemler: detaylarRes.rows,
            });
        }

        res.json(faturalar);
    } catch (err) {
        console.error('Fatura listeleme hatası:', err);
        res.status(500).json({ hata: 'Faturalar çekilirken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { fatura_no, cari_id, fatura_turu, kalemler } = req.body;
        if (!cari_id) {
            return res.status(400).json({ hata: 'cari_id zorunludur.' });
        }
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'En az bir fatura kalemi gerekli.' });
        }

        const sonuc = await withTransaction(pool, async (client) => {
            const no = fatura_no || (await sonrakiBelgeNo(client, 'FATURA'));

            let toplam_tutar = 0;
            for (const k of kalemler) {
                toplam_tutar += Number(k.miktar) * Number(k.birim_fiyat);
            }

            const faturaSonuc = await client.query(
                `
                INSERT INTO faturalar (fatura_no, cari_id, fatura_turu, toplam_tutar)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
                `,
                [no, cari_id, fatura_turu || null, toplam_tutar]
            );
            const yeniFatura = faturaSonuc.rows[0];

            const eklenenKalemler = [];
            for (const k of kalemler) {
                if (!k.stok_id || k.miktar == null || k.birim_fiyat == null) {
                    throw new Error('Her kalemde stok_id, miktar ve birim_fiyat zorunludur.');
                }
                const satirToplam = Number(k.miktar) * Number(k.birim_fiyat);
                const detaySonuc = await client.query(
                    `
                    INSERT INTO fatura_detaylari
                        (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                    `,
                    [yeniFatura.id, k.stok_id, k.miktar, k.birim_fiyat, satirToplam]
                );
                eklenenKalemler.push(detaySonuc.rows[0]);
            }

            return { fatura: yeniFatura, kalemler: eklenenKalemler };
        });

        res.status(201).json(sonuc);
    } catch (err) {
        console.error('Fatura kayıt hatası:', err);
        res.status(500).json({ hata: 'Fatura kesilirken bir pürüz çıktı.', detay: err.message });
    }
});

module.exports = router;
