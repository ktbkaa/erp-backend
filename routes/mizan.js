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
            tarihFiltre += ` AND b.document_date >= $${params.length}`;
        }
        if (bitis) {
            params.push(bitis);
            tarihFiltre += ` AND b.document_date <= $${params.length}`;
        }
        const result = await pool.query(
            `
            SELECT h.id AS account_id, h.account_code, h.account_name, h.account_type,
                   COALESCE(SUM(k.debit),0) AS debit,
                   COALESCE(SUM(k.credit),0) AS credit,
                   COALESCE(SUM(k.debit),0) - COALESCE(SUM(k.credit),0) AS bakiye
            FROM gl_accounts h
            LEFT JOIN journal_entry_lines k ON k.account_id = h.id
            LEFT JOIN journal_entries b ON b.id = k.document_id AND b.status = 'Onayli' ${tarihFiltre}
            WHERE h.is_active = TRUE AND h.account_type = 'Dogrudan'
            GROUP BY h.id, h.account_code, h.account_name, h.account_type
            ORDER BY h.account_code
            `,
            params
        );
        const rows = result.rows.map((r) => ({
            ...r,
            // liste ekranı için kod/first_name
            mizan_kodu: r.account_code,
            description: r.account_name,
        }));
        res.json(rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
