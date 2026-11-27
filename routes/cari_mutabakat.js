/**
 * Cari mutabakat özeti:
 * açık fatura bakiyesi ↔ cari hareket net bakiyesi karşılaştırması.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');

router.get('/', async (req, res) => {
  try {
    const params = [];
    const whereCari = [`COALESCE(p.is_active, TRUE) = TRUE`];
    const firmaId = companyIdFromReq(req) || (req.query.company_id ? Number(req.query.company_id) : null);

    // partners may or may not be company-scoped; prefer company_id if present
    let firmaJoinFilter = '';
    if (firmaId) {
      params.push(Number(firmaId));
      const idx = params.length;
      // fatura tarafında filtrele; cari listesini fatura/hareket görenlerle sınırla
      firmaJoinFilter = `AND (inv.company_id = $${idx} OR inv.company_id IS NULL)`;
      whereCari.push(`(
        EXISTS (SELECT 1 FROM invoices inv WHERE inv.partner_id = p.id AND COALESCE(inv.is_deleted,FALSE)=FALSE AND inv.company_id=$${idx})
        OR EXISTS (SELECT 1 FROM partner_ledger_entries h WHERE h.partner_id = p.id)
      )`);
    }

    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      whereCari.push(`p.id = $${params.length}`);
    }

    const sql = `
      SELECT
        p.id AS partner_id,
        p.partner_code,
        p.partner_name,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN inv.invoice_type ILIKE '%alis%' OR inv.invoice_type ILIKE '%alış%' OR inv.invoice_type = 'Alis'
                THEN -COALESCE(inv.remaining_amount, inv.payable_amount, inv.total_amount, 0)
              ELSE COALESCE(inv.remaining_amount, inv.payable_amount, inv.total_amount, 0)
            END * COALESCE(NULLIF(inv.exchange_rate, 0), 1)
          )
          FROM invoices inv
          WHERE inv.partner_id = p.id
            AND COALESCE(inv.is_deleted, FALSE) = FALSE
            AND COALESCE(inv.status, '') NOT IN ('Iptal', 'İptal')
            AND COALESCE(inv.payment_status, '') NOT IN ('Odendi', 'Ödendi')
            ${firmaId ? `AND inv.company_id = $1` : ''}
        ), 0) AS open_invoice_balance,
        COALESCE((
          SELECT SUM(
            CASE
              WHEN h.direction ILIKE 'borc%' OR h.direction ILIKE 'borç%' OR UPPER(h.direction) IN ('D','DEBIT','BORC')
                THEN COALESCE(h.amount_try, h.amount * COALESCE(NULLIF(h.exchange_rate, 0), 1), 0)
              WHEN h.direction ILIKE 'alacak%' OR UPPER(h.direction) IN ('C','CREDIT','ALACAK')
                THEN -COALESCE(h.amount_try, h.amount * COALESCE(NULLIF(h.exchange_rate, 0), 1), 0)
              ELSE COALESCE(h.amount_try, h.amount * COALESCE(NULLIF(h.exchange_rate, 0), 1), 0)
            END
          )
          FROM partner_ledger_entries h
          WHERE h.partner_id = p.id
        ), 0) AS ledger_balance,
        COALESCE((
          SELECT COUNT(*) FROM invoices inv
          WHERE inv.partner_id = p.id
            AND COALESCE(inv.is_deleted, FALSE) = FALSE
            AND COALESCE(inv.is_posted, FALSE) = FALSE
            ${firmaId ? `AND inv.company_id = $1` : ''}
        ), 0) AS unposted_invoice_count,
        COALESCE((
          SELECT COUNT(*) FROM invoices inv
          WHERE inv.partner_id = p.id
            AND COALESCE(inv.is_deleted, FALSE) = FALSE
            AND COALESCE(inv.is_posted, FALSE) = TRUE
            ${firmaId ? `AND inv.company_id = $1` : ''}
        ), 0) AS posted_invoice_count
      FROM partners p
      WHERE ${whereCari.join(' AND ')}
      ORDER BY p.partner_code
      LIMIT 500
    `;

    // firmaJoinFilter unused intentionally kept for clarity; company filter is inlined with $1
    void firmaJoinFilter;

    const rows = await pool.query(sql, params);
    const result = rows.rows.map((r) => {
      const openInv = Number(r.open_invoice_balance) || 0;
      const ledger = Number(r.ledger_balance) || 0;
      const diff = Number((openInv - ledger).toFixed(4));
      const absDiff = Math.abs(diff);
      let match_status = 'Eslesiyor';
      if (absDiff > 0.05) match_status = 'FarkVar';
      if (Number(r.unposted_invoice_count) > 0 && absDiff > 0.05) match_status = 'MuhasebeEksik';
      return {
        ...r,
        open_invoice_balance: openInv,
        ledger_balance: ledger,
        difference: diff,
        match_status,
        abs_difference: absDiff,
      };
    });

    // Opsiyonel: sadece fark olanlar
    const onlyDiff = String(req.query.only_diff || '') === 'true' || req.query.only_diff === '1';
    res.json(onlyDiff ? result.filter((x) => x.match_status !== 'Eslesiyor') : result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
