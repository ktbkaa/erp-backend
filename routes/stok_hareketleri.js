const express = require('express');
const router = express.Router();
const pool = require('../db');

// Şimdilik sadece listeleme. Hareket oluşturma; satınalma/satış/üretim
// süreçleri bağlanınca merkezi servisten yapılacak (doğrudan miktar oynatmama kuralı).

router.get('/', async (req, res) => {
    try {
        const hareketlerRes = await pool.query(`
            SELECT h.*, d.depo_kodu, d.depo_adi
            FROM stok_hareketleri h
            LEFT JOIN depolar d ON h.depo_id = d.id
            ORDER BY h.id DESC
        `);

        const hareketler = [];
        for (const h of hareketlerRes.rows) {
            const satirlarRes = await pool.query(
                `
                SELECT s.*, st.stok_kodu, st.stok_adi
                FROM stok_hareket_satirlari s
                JOIN stoklar st ON s.stok_id = st.id
                WHERE s.hareket_id = $1
                `,
                [h.id]
            );
            hareketler.push({
                ...h,
                satirlar: satirlarRes.rows,
            });
        }

        res.json(hareketler);
    } catch (err) {
        console.error('Stok hareket listeleme hatası:', err);
        res.status(500).json({
            hata: 'Stok hareketleri çekilirken bir pürüz çıktı.',
            detay: err.message,
        });
    }
});

module.exports = router;
