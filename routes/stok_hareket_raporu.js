/**
 * Stok hareket raporu — satır düzeyinde, işlem sırasıyla.
 * Filtre: item_id (zorunlu), warehouse_id / company_id / tarih (opsiyonel).
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');

router.get('/', async (req, res, next) => {
  try {
    const itemId = req.query.item_id ? Number(req.query.item_id) : null;
    if (!itemId || !Number.isFinite(itemId)) {
      return res.json([]);
    }

    const params = [itemId];
    const where = ['s.item_id = $1'];

    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : null;
    if (warehouseId && Number.isFinite(warehouseId)) {
      params.push(warehouseId);
      where.push(`h.warehouse_id = $${params.length}`);
    }

    // Açık firma filtresi (ekran) veya JWT/header kapsamı
    const firmaQuery = req.query.company_id ? Number(req.query.company_id) : null;
    const firmaScope = companyIdFromReq(req);
    const firmaId = (firmaQuery && Number.isFinite(firmaQuery) ? firmaQuery : null) || firmaScope;
    if (firmaId) {
      params.push(firmaId);
      where.push(`(h.company_id = $${params.length} OR h.company_id IS NULL)`);
    }

    const baslangic = req.query.baslangic ? String(req.query.baslangic).slice(0, 10) : null;
    if (baslangic) {
      params.push(baslangic);
      where.push(`COALESCE(h.movement_date, h.physical_date, h.created_at::date) >= $${params.length}::date`);
    }
    const bitis = req.query.bitis ? String(req.query.bitis).slice(0, 10) : null;
    if (bitis) {
      params.push(bitis);
      where.push(`COALESCE(h.movement_date, h.physical_date, h.created_at::date) <= $${params.length}::date`);
    }

    const sql = `
      SELECT
        s.id,
        s.id AS line_id,
        h.id AS movement_id,
        h.movement_no,
        h.movement_type,
        h.document_type,
        h.document_id,
        h.linked_movement_id,
        h.ref_no,
        h.description AS hareket_aciklama,
        h.user_code,
        h.approval_status,
        COALESCE(h.movement_date, h.physical_date, h.created_at::date) AS movement_date,
        h.physical_date,
        h.fiscal_date,
        h.created_at,
        h.company_id,
        f.company_code,
        f.company_name,
        h.warehouse_id,
        d.warehouse_code,
        d.warehouse_name,
        h.target_warehouse_id,
        hd.warehouse_code AS hedef_depo_kodu,
        hd.warehouse_name AS hedef_depo_adi,
        hk.movement_code,
        hk.movement_name,
        s.item_id,
        st.item_code,
        st.item_name,
        st.uom_code AS stok_birim,
        s.quantity,
        s.direction,
        CASE WHEN COALESCE(s.direction, 1) > 0 THEN s.quantity ELSE 0 END AS quantity_in,
        CASE WHEN COALESCE(s.direction, 1) < 0 THEN s.quantity ELSE 0 END AS quantity_out,
        (COALESCE(s.quantity, 0) * COALESCE(s.direction, 1)) AS quantity_signed,
        s.uom_code,
        s.stock_status,
        COALESCE(s.lot_no, p.lot_no) AS lot_no,
        s.lot_id,
        s.serial_no,
        s.bin_code,
        s.location_code,
        s.unit_price,
        s.vat_rate,
        s.uom_cost,
        s.amount_cost
      FROM stock_movement_lines s
      JOIN stock_movements h ON h.id = s.movement_id
      JOIN items st ON st.id = s.item_id
      LEFT JOIN companies f ON f.id = h.company_id
      LEFT JOIN warehouses d ON d.id = h.warehouse_id
      LEFT JOIN warehouses hd ON hd.id = h.target_warehouse_id
      LEFT JOIN movement_codes hk ON hk.id = h.movement_code_id
      LEFT JOIN item_lots p ON p.id = s.lot_id
      WHERE ${where.join(' AND ')}
      ORDER BY
        COALESCE(h.movement_date, h.physical_date, h.created_at::date) ASC,
        h.id ASC,
        s.id ASC
      LIMIT 5000
    `;

    const r = await pool.query(sql, params);
    let running = 0;
    const rows = r.rows.map((row, idx) => {
      const signed = Number(row.quantity_signed) || 0;
      running += signed;
      return {
        ...row,
        sira: idx + 1,
        quantity_signed: signed,
        bakiye: Number(running.toFixed(6)),
        kaynak_etiket: kaynakEtiket(row),
      };
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

function kaynakEtiket(row) {
  const tip = String(row.document_type || '').trim();
  const id = row.document_id;
  if (tip && id != null) return `${tip} #${id}`;
  if (row.movement_no) return `STOK ${row.movement_no}`;
  return 'STOK_HAREKET';
}

module.exports = router;
