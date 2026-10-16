const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { depoBakiyeListesi } = require('../src/services/stokHareketService');

router.get('/', async (req, res) => {
    try {
        const liste = await depoBakiyeListesi(pool, {
            depoId: req.query.depo_id ? Number(req.query.depo_id) : null,
            stokId: req.query.stok_id ? Number(req.query.stok_id) : null,
            stokStatu: req.query.stok_statu || null,
            firmaId: firmaIdFromReq(req),
        });
        // Rezerve / kullanılabilir kolonları (INV-004)
        const enriched = [];
        for (const row of liste) {
            let rezerve = 0;
            try {
                const r = await pool.query(
                    `SELECT COALESCE(SUM(kalan_miktar),0)::numeric AS rezerve
                     FROM stok_rezervasyonlari
                     WHERE stok_id=$1 AND durum='Aktif'
                       AND ($2::int IS NULL OR depo_id IS NULL OR depo_id=$2)`,
                    [row.stok_id, row.depo_id]
                );
                rezerve = Number(r.rows[0].rezerve);
            } catch (_) { /* tablo yoksa 0 */ }
            const bakiye = Number(row.bakiye);
            enriched.push({
                ...row,
                rezerve,
                kullanilabilir: bakiye - rezerve,
            });
        }
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
