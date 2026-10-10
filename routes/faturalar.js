const express = require('express');
const router = express.Router();
const dbClient = require('../db');

// Faturaları ve detay kalemlerini listeleyen rota
router.get('/', async (req, res) => {
    try {
        const faturalarRes = await dbClient.query(`
            SELECT f.*, c.cari_adi 
            FROM faturalar f 
            JOIN cariler c ON f.cari_id = c.id 
            ORDER BY f.id DESC
        `);

        const faturalar = [];
        for (let fatura of faturalarRes.rows) {
            const detaylarRes = await dbClient.query(`
                SELECT fd.*, s.stok_kodu, s.stok_adi 
                FROM fatura_detaylari fd 
                JOIN stoklar s ON fd.stok_id = s.id 
                WHERE fd.fatura_id = $1
            `, [fatura.id]);
            
            faturalar.push({
                ...fatura,
                kalemler: detaylarRes.rows
            });
        }

        res.json(faturalar);
    } catch (err) {
        console.error('Fatura listeleme hatası:', err);
        res.status(500).send('Faturalar çekilirken bir pürüz çıktı.');
    }
});

// Kalemli (Master-Detail) Yeni Fatura Kesme Rota (Transaction Güvenceli)
router.post('/', async (req, res) => {
    const client = await dbClient.connect(); // Bağlantıyı havuzdan ayırıyoruz
    try {
        await client.query('BEGIN'); // 1. İşlemi başlat

        const { fatura_no, cari_id, fatura_turu, kalemler } = req.body; 

        let toplam_tutar = 0;
        if (kalemler && kalemler.length > 0) {
            kalemler.forEach(k => {
                toplam_tutar += (k.miktar * k.birim_fiyat);
            });
        }

        // 2. Master (Fatura Üst Bilgi) kayıt
        const faturaSorgu = `
            INSERT INTO faturalar (fatura_no, cari_id, fatura_turu, toplam_tutar) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const faturaSonuc = await client.query(faturaSorgu, [fatura_no, cari_id, fatura_turu, toplam_tutar]);
        const yeniFatura = faturaSonuc.rows[0];

        // 3. Detail (Fatura Kalemleri) kayıtlar
        const eklenenKalemler = [];
        if (kalemler && kalemler.length > 0) {
            for (const k of kalemler) {
                const satirToplam = k.miktar * k.birim_fiyat;
                const detaySorgu = `
                    INSERT INTO fatura_detaylari (fatura_id, stok_id, miktar, birim_fiyat, toplam_tutar)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *;
                `;
                const detaySonuc = await client.query(detaySorgu, [yeniFatura.id, k.stok_id, k.miktar, k.birim_fiyat, satirToplam]);
                eklenenKalemler.push(detaySonuc.rows[0]);
            }
        }

        await client.query('COMMIT'); // 4. Her şey yolunda, verileri kalıcı yaz
        res.status(201).json({
            fatura: yeniFatura,
            kalemler: eklenenKalemler
        });

    } catch (err) {
        await client.query('ROLLBACK'); // 5. Hata çıkarsa her şeyi tertemiz geri al
        console.error('Fatura kayıt hatası:', err);
        res.status(500).send('Fatura kesilirken bir pürüz çıktı.');
    } finally {
        client.release(); // 6. Bağlantıyı serbest bırak
    }
});

module.exports = router;