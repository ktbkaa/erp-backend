const express = require('express');
const router = express.Router();
const pool = require('../db');

async function hareketGetir(id) {
    const h = await pool.query(
        `
        SELECT h.*, d.depo_kodu, d.depo_adi
        FROM stok_hareketleri h
        LEFT JOIN depolar d ON h.depo_id = d.id
        WHERE h.id = $1
        `,
        [id]
    );
    if (!h.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.stok_kodu, st.stok_adi, st.birim
        FROM stok_hareket_satirlari s
        JOIN stoklar st ON s.stok_id = st.id
        WHERE s.hareket_id = $1
        ORDER BY s.id
        `,
        [id]
    );
    return { ...h.rows[0], satirlar: satirlar.rows };
}

// Şimdilik sadece listeleme / inceleme. Hareket oluşturma satınalma/satış/üretim
// süreçlerinden merkezi servisle yapılır (doğrudan miktar oynatmama kuralı).

router.get('/', async (req, res) => {
    try {
        const { tip, depo_id } = req.query;
        const where = [];
        const params = [];
        if (tip) {
            params.push(tip);
            where.push(`h.hareket_tipi = $${params.length}`);
        }
        if (depo_id) {
            params.push(Number(depo_id));
            where.push(`h.depo_id = $${params.length}`);
        }
        const sql = `
            SELECT h.id
            FROM stok_hareketleri h
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY h.id DESC
            LIMIT 500
        `;
        const liste = await pool.query(sql, params);
        const hareketler = [];
        for (const r of liste.rows) hareketler.push(await hareketGetir(r.id));
        res.json(hareketler);
    } catch (err) {
        console.error('Stok hareket listeleme hatası:', err);
        res.status(500).json({
            hata: 'Stok hareketleri çekilirken bir pürüz çıktı.',
            detay: err.message,
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const hareket = await hareketGetir(req.params.id);
        if (!hareket) return res.status(404).json({ hata: 'Stok hareketi bulunamadı.' });
        res.json(hareket);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
