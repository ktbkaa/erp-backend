const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { depoBakiyeListesi } = require('../src/services/stokHareketService');

router.get('/', async (req, res) => {
    try {
        const yalnizca = req.query.yalnizca_stokta;
        const liste = await depoBakiyeListesi(pool, {
            depoId: req.query.warehouse_id ? Number(req.query.warehouse_id) : null,
            stokId: req.query.item_id ? Number(req.query.item_id) : null,
            stokStatu: req.query.stock_status || null,
            firmaId: firmaIdFromReq(req),
            depoKodu: req.query.warehouse_code || null,
            stokKodu: req.query.item_code || null,
            stokAdi: req.query.item_name || null,
            stokTipi: req.query.item_type || null,
            partiNo: req.query.lot_no || null,
            yalnizcaStokta: yalnizca == null || yalnizca === '1' || yalnizca === 'true' || yalnizca === 'Evet',
        });
        // Rezerve / kullanılabilir kolonları (INV-004)
        const enriched = [];
        for (const row of liste) {
            let rezerve = 0;
            try {
                const r = await pool.query(
                    `SELECT COALESCE(SUM(remaining_quantity),0)::numeric AS rezerve
                     FROM item_reservations
                     WHERE item_id=$1 AND status='Aktif'
                       AND ($2::int IS NULL OR warehouse_id IS NULL OR warehouse_id=$2)`,
                    [row.item_id, row.warehouse_id]
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
