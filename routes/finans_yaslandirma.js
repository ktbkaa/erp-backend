/**
 * Cari yaşlandırma (AR/AP aging) — vade kovaları.
 * GET /finans-yaslandirma?yon=alacak|borc&company_id=
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');

router.get('/', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req) || Number(req.query.company_id) || null;
    const yon = String(req.query.yon || req.query.direction || 'alacak').toLowerCase();
    // alacak = müşteri (satış faturaları), borc = tedarikçi (alış)
    const alisMi = yon === 'borc' || yon === 'ap' || yon === 'tedarikci';
    const typeFilter = alisMi
      ? `(f.invoice_type ILIKE '%alis%' OR f.invoice_type ILIKE '%alış%')`
      : `(f.invoice_type ILIKE '%satis%' OR f.invoice_type ILIKE '%satış%' OR f.invoice_type ILIKE '%satis%')`;

    const params = [];
    let firmaSql = '';
    if (firmaId) {
      params.push(firmaId);
      firmaSql = ` AND f.company_id = $${params.length}`;
    }

    const sql = `
      WITH open_inv AS (
        SELECT
          f.id,
          f.invoice_no,
          f.partner_id,
          c.partner_code,
          c.partner_name,
          f.invoice_date,
          COALESCE(f.due_date, f.invoice_date + INTERVAL '30 days')::date AS due_date,
          (COALESCE(f.payable_amount, f.total_amount, f.net_amount, 0) * COALESCE(NULLIF(f.exchange_rate, 0), 1))::numeric AS amount,
          GREATEST(
            CURRENT_DATE - COALESCE(f.due_date, f.invoice_date + INTERVAL '30 days')::date,
            0
          )::int AS days_overdue
        FROM invoices f
        JOIN partners c ON c.id = f.partner_id
        WHERE COALESCE(f.status,'') NOT IN ('Iptal', 'İptal', 'Taslak')
          AND ${typeFilter}
          ${firmaSql}
      )
      SELECT
        partner_id,
        partner_code,
        partner_name,
        COUNT(*)::int AS fatura_sayisi,
        SUM(amount)::numeric AS toplam,
        SUM(CASE WHEN days_overdue = 0 THEN amount ELSE 0 END)::numeric AS vadesi_gelmemis,
        SUM(CASE WHEN days_overdue BETWEEN 1 AND 30 THEN amount ELSE 0 END)::numeric AS d_1_30,
        SUM(CASE WHEN days_overdue BETWEEN 31 AND 60 THEN amount ELSE 0 END)::numeric AS d_31_60,
        SUM(CASE WHEN days_overdue BETWEEN 61 AND 90 THEN amount ELSE 0 END)::numeric AS d_61_90,
        SUM(CASE WHEN days_overdue > 90 THEN amount ELSE 0 END)::numeric AS d_90_plus
      FROM open_inv
      GROUP BY partner_id, partner_code, partner_name
      ORDER BY toplam DESC
    `;
    const r = await pool.query(sql, params);
    res.json({
      yon: alisMi ? 'borc' : 'alacak',
      company_id: firmaId,
      as_of: new Date().toISOString().slice(0, 10),
      satirlar: r.rows,
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
