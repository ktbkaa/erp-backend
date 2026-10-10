const express = require('express');
const router = express.Router();
const dbClient = require('../db');

// Siparişleri ve kalem detaylarını listeleyen rota
router.get('/', async (req, res) => {
    try {
        const siparislerRes = await dbClient.query('SELECT * FROM siparisler ORDER BY id DESC');
        const siparisler = [];
        for (let siparis of siparislerRes.rows) {
            const detaylarRes = await dbClient.query('SELECT * FROM siparis_detaylari WHERE siparis_id = $1', [siparis.id]);
            siparisler.push({
                ...siparis,
                kalemler: detaylarRes.rows
            });
        }
        res.json(siparisler);
    } catch (err) {
        console.error('Sipariş listeleme hatası:', err);
        res.status(500).send('Siparişler çekilirken bir pürüz çıktı.');
    }
});

// Master-Detail Akıllı Yeni Sipariş Ekleme Rota
router.post('/', async (req, res) => {
    try {
        const { siparis_no, cari_kodu, siparis_tarihi, siparis_turu, kalemler } = req.body; 

        // 1. Cari Kodu ile Cari Kartını Bul (ID ve Adını otomatik al)
        const cariRes = await dbClient.query('SELECT id, cari_adi FROM cariler WHERE cari_kodu = $1', [cari_kodu]);
        if (cariRes.rows.length === 0) {
            return res.status(400).send(`Belirtilen cari kodu (${cari_kodu}) sistemde bulunamadı!`);
        }
        const cari = cariRes.rows[0];

        // 2. Kalemleri dönüp stok kodlarından ad, birim ve fiyat çekelim
        let toplam_tutar = 0;
        const islenmisKalemler = [];

        if (kalemler && kalemler.length > 0) {
            for (const k of kalemler) {
                const stokRes = await dbClient.query('SELECT id, stok_adi, birim, satis_fiyati FROM stoklar WHERE stok_kodu = $1', [k.stok_kodu]);
                if (stokRes.rows.length === 0) {
                    return res.status(400).send(`Belirtilen stok kodu (${k.stok_kodu}) sistemde bulunamadı!`);
                }
                const stok = stokRes.rows[0];

                const birim_fiyat = k.birim_fiyat !== undefined ? k.birim_fiyat : stok.satis_fiyati;
                const satirToplam = k.miktar * birim_fiyat;
                toplam_tutar += satirToplam;

                islenmisKalemler.push({
                    stok_kodu: k.stok_kodu,
                    stok_adi: stok.stok_adi,
                    stok_birimi: stok.birim,
                    miktar: k.miktar,
                    birim_fiyat: birim_fiyat,
                    toplam_tutar: satirToplam
                });
            }
        }

        // 3. Master (Sipariş Üst Bilgi) Kaydı
        const siparisSorgu = `
            INSERT INTO siparisler (siparis_no, cari_id, cari_kodu, cari_adi, siparis_tarihi, siparis_turu, toplam_tutar) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *;
        `;
        const siparisSonuc = await dbClient.query(siparisSorgu, [
            siparis_no, 
            cari.id, 
            cari_kodu, 
            cari.cari_adi, 
            siparis_tarihi || new Date(), 
            siparis_turu, 
            toplam_tutar
        ]);
        const yeniSiparis = siparisSonuc.rows[0];

        // 4. Detail (Sipariş Kalemleri) Kayıtları
        const eklenenKalemler = [];
        for (const ik of islenmisKalemler) {
            const detaySorgu = `
                INSERT INTO siparis_detaylari (siparis_id, stok_kodu, stok_adi, stok_birimi, miktar, birim_fiyat, toplam_tutar)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *;
            `;
            const detaySonuc = await dbClient.query(detaySorgu, [
                yeniSiparis.id, 
                ik.stok_kodu, 
                ik.stok_adi, 
                ik.stok_birimi, 
                ik.miktar, 
                ik.birim_fiyat, 
                ik.toplam_tutar
            ]);
            eklenenKalemler.push(detaySonuc.rows[0]);
        }

        res.status(201).json({
            siparis: yeniSiparis,
            kalemler: eklenenKalemler
        });

    } catch (err) {
        console.error('Sipariş kayıt hatası:', err);
        res.status(500).send('Sipariş kaydedilirken bir pürüz çıktı.');
    }
});

module.exports = router;