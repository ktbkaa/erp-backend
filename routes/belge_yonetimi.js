/**
 * Merkezi irsaliye / fatura listesi — alış + satış, tek ekran.
 * Kaynak: delivery_notes + invoices (+ tedarikçi irsaliyeleri özeti).
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const direction = String(req.query.direction || req.query.alis_satis || '').toLowerCase(); // alis|satis|''
    const tur = String(req.query.belge_turu || '').toLowerCase(); // irsaliye|fatura|''
    const params = [];
    const firmaClause = (alias) => {
      if (!firmaId) return 'TRUE';
      params.push(firmaId);
      return `${alias}.company_id = $${params.length}`;
    };

    const parts = [];

    if (!tur || tur === 'irsaliye') {
      // Satış irsaliyeleri (delivery_notes tablosu)
      if (!direction || direction === 'satis') {
        parts.push(`
          SELECT
            'irsaliye'::text AS belge_sinifi,
            i.id,
            i.delivery_note_no AS document_no,
            COALESCE(i.delivery_note_type, 'Satis') AS direction,
            i.partner_id,
            c.partner_code,
            c.partner_name,
            i.delivery_date AS document_date,
            i.status,
            COALESCE(i.grand_total, 0) AS amount,
            i.currency_code,
            i.sales_order_id AS kaynak_siparis_id,
            NULL::int AS goods_receipt_id,
            'delivery_notes'::text AS kaynak_tablo
          FROM delivery_notes i
          LEFT JOIN partners c ON c.id = i.partner_id
          WHERE ${firmaClause('i')}
        `);
      }
    }

    if (!tur || tur === 'fatura') {
      let yonFilter = 'TRUE';
      if (direction === 'alis') yonFilter = `f.invoice_type IN ('Alis','AlisIade')`;
      else if (direction === 'satis') yonFilter = `f.invoice_type IN ('Satis','SatisIade') OR f.invoice_type IS NULL`;
      parts.push(`
        SELECT
          'fatura'::text AS belge_sinifi,
          f.id,
          f.invoice_no AS document_no,
          f.invoice_type AS direction,
          f.partner_id,
          c.partner_code,
          c.partner_name,
          f.invoice_date AS document_date,
          f.status,
          COALESCE(f.payable_amount, f.total_amount, f.net_amount, 0) AS amount,
          f.currency_code,
          f.sales_order_id AS kaynak_siparis_id,
          f.goods_receipt_id,
          'invoices'::text AS kaynak_tablo
        FROM invoices f
        LEFT JOIN partners c ON c.id = f.partner_id
        WHERE ${firmaClause('f')} AND ${yonFilter}
      `);
    }

    if ((!tur || tur === 'irsaliye') && (!direction || direction === 'alis')) {
      parts.push(`
        SELECT
          'tedarikci_irsaliye'::text AS belge_sinifi,
          ti.id,
          ti.delivery_note_no AS document_no,
          'Alis'::text AS direction,
          ti.partner_id,
          c.partner_code,
          c.partner_name,
          ti.delivery_date AS document_date,
          ti.status,
          0::numeric AS amount,
          NULL::varchar AS currency_code,
          ti.sales_order_id AS kaynak_siparis_id,
          NULL::int AS goods_receipt_id,
          'vendor_delivery_notes'::text AS kaynak_tablo
        FROM vendor_delivery_notes ti
        LEFT JOIN partners c ON c.id = ti.partner_id
        WHERE ${firmaClause('ti')}
      `);
    }

    if (!parts.length) return res.json([]);

    const sql = `
      SELECT * FROM (
        ${parts.join(' UNION ALL ')}
      ) x
      ORDER BY document_date DESC NULLS LAST, id DESC
      LIMIT 500`;
    const r = await pool.query(sql, params);
    res.json(r.rows.map((row) => ({
      ...row,
      id: `${row.belge_sinifi}:${row.id}`,
      record_id: row.id,
    })));
  } catch (err) {
    if (/does not exist|relation/i.test(err.message)) {
      return res.json([]);
    }
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
