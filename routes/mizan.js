const express = require('express');
const router = express.Router();
const pool = require('../db');

/** FINT62 — onaylı belgelerden mizan */
router.get('/', async (req, res) => {
    try {
        const { baslangic, bitis } = req.query;
        const params = [];
        let tarihFiltre = '';
        if (baslangic) {
            params.push(baslangic);
            tarihFiltre += ` AND b.belge_tarihi >= $${params.length}`;
        }
        if (bitis) {
            params.push(bitis);
            tarihFiltre += ` AND b.belge_tarihi <= $${params.length}`;
        }
        const sonuc = await pool.query(
            `
            SELECT h.id AS hesap_id, h.hesap_kodu, h.hesap_adi, h.hesap_tipi,
                   COALESCE(SUM(k.borc),0) AS borc,
                   COALESCE(SUM(k.alacak),0) AS alacak,
                   COALESCE(SUM(k.borc),0) - COALESCE(SUM(k.alacak),0) AS bakiye
            FROM muhasebe_hesaplari h
            LEFT JOIN muhasebe_belge_kalemleri k ON k.hesap_id = h.id
            LEFT JOIN muhasebe_belgeleri b ON b.id = k.belge_id AND b.durum = 'Onayli' ${tarihFiltre}
            WHERE h.aktif = TRUE AND h.hesap_tipi = 'Dogrudan'
            GROUP BY h.id, h.hesap_kodu, h.hesap_adi, h.hesap_tipi
            ORDER BY h.hesap_kodu
            `,
            params
        );
        const rows = sonuc.rows.map((r) => ({
            ...r,
            // liste ekranı için kod/ad
            mizan_kodu: r.hesap_kodu,
            aciklama: r.hesap_adi,
        }));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
