const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res) => {
    try {
        const siparislerRes = await pool.query('SELECT * FROM siparisler ORDER BY id DESC');
        const siparisler = [];
        for (const siparis of siparislerRes.rows) {
            const detaylarRes = await pool.query(
                'SELECT * FROM siparis_detaylari WHERE siparis_id = $1',
                [siparis.id]
            );
            siparisler.push({
                ...siparis,
                kalemler: detaylarRes.rows,
            });
        }
        res.json(siparisler);
    } catch (err) {
        console.error('Sipariş listeleme hatası:', err);
        res.status(500).json({ hata: 'Siparişler çekilirken bir pürüz çıktı.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { siparis_no, cari_kodu, siparis_tarihi, siparis_turu, durum, kalemler } = req.body;

        if (!cari_kodu || !siparis_turu) {
            return res.status(400).json({ hata: 'cari_kodu ve siparis_turu zorunludur.' });
        }
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'En az bir sipariş kalemi gerekli.' });
        }

        const sonuc = await withTransaction(pool, async (client) => {
            const cariRes = await client.query(
                'SELECT id, cari_adi FROM cariler WHERE cari_kodu = $1',
                [cari_kodu]
            );
            if (cariRes.rows.length === 0) {
                throw new Error(`Belirtilen cari kodu (${cari_kodu}) sistemde bulunamadı!`);
            }
            const cari = cariRes.rows[0];

            let toplam_tutar = 0;
            const islenmisKalemler = [];

            for (const k of kalemler) {
                if (!k.stok_kodu || k.miktar == null) {
                    throw new Error('Her kalemde stok_kodu ve miktar zorunludur.');
                }

                const stokRes = await client.query(
                    'SELECT id, stok_adi, birim, satis_fiyati FROM stoklar WHERE stok_kodu = $1',
                    [k.stok_kodu]
                );
                if (stokRes.rows.length === 0) {
                    throw new Error(`Belirtilen stok kodu (${k.stok_kodu}) sistemde bulunamadı!`);
                }
                const stok = stokRes.rows[0];
                const birim_fiyat =
                    k.birim_fiyat !== undefined && k.birim_fiyat !== null
                        ? Number(k.birim_fiyat)
                        : Number(stok.satis_fiyati);
                const satirToplam = Number(k.miktar) * birim_fiyat;
                toplam_tutar += satirToplam;

                islenmisKalemler.push({
                    stok_id: stok.id,
                    stok_kodu: k.stok_kodu,
                    stok_adi: stok.stok_adi,
                    stok_birimi: stok.birim,
                    miktar: k.miktar,
                    birim_fiyat,
                    toplam_tutar: satirToplam,
                });
            }

            const belgeTipi =
                String(siparis_turu).toLowerCase().includes('verilen') ||
                String(siparis_turu).toLowerCase().includes('satinal') ||
                String(siparis_turu).toLowerCase().includes('satın')
                    ? 'SATINALMA_SIPARIS'
                    : 'SATIS_SIPARIS';

            const no = siparis_no || (await sonrakiBelgeNo(client, belgeTipi));

            const siparisSonuc = await client.query(
                `
                INSERT INTO siparisler
                    (siparis_no, cari_id, cari_kodu, cari_adi, siparis_tarihi, siparis_turu, toplam_tutar, durum)
                VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Taslak'))
                RETURNING *;
                `,
                [
                    no,
                    cari.id,
                    cari_kodu,
                    cari.cari_adi,
                    siparis_tarihi || new Date(),
                    siparis_turu,
                    toplam_tutar,
                    durum || null,
                ]
            );
            const yeniSiparis = siparisSonuc.rows[0];

            const eklenenKalemler = [];
            for (const ik of islenmisKalemler) {
                const detaySonuc = await client.query(
                    `
                    INSERT INTO siparis_detaylari
                        (siparis_id, stok_id, stok_kodu, stok_adi, stok_birimi, miktar, birim_fiyat, toplam_tutar)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *;
                    `,
                    [
                        yeniSiparis.id,
                        ik.stok_id,
                        ik.stok_kodu,
                        ik.stok_adi,
                        ik.stok_birimi,
                        ik.miktar,
                        ik.birim_fiyat,
                        ik.toplam_tutar,
                    ]
                );
                eklenenKalemler.push(detaySonuc.rows[0]);
            }

            return { siparis: yeniSiparis, kalemler: eklenenKalemler };
        });

        res.status(201).json(sonuc);
    } catch (err) {
        console.error('Sipariş kayıt hatası:', err);
        const status = String(err.message || '').includes('bulunamadı') ? 400 : 500;
        res.status(status).json({
            hata: err.message || 'Sipariş kaydedilirken bir pürüz çıktı.',
        });
    }
});

module.exports = router;
