#!/usr/bin/env node
/**
 * ADGIDA + EGEPACK dışındaki tüm firmaları ve org iskeletlerini siler.
 * Kullanım: node scripts/keep-only-companies.js
 *          node scripts/keep-only-companies.js ADGIDA,EGEPACK
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const pool = require('../db');

const KEEP = new Set(
  String(process.argv[2] || 'ADGIDA,EGEPACK')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
);

async function safe(client, sql, params = []) {
  const sp = `sp_${Math.random().toString(36).slice(2, 10)}`;
  try {
    await client.query(`SAVEPOINT ${sp}`);
    const r = await client.query(sql, params);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return r.rowCount || 0;
  } catch (e) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (_) { /* ignore */ }
    return 0;
  }
}

async function hardDeleteCompany(client, companyId) {
  const p = [companyId];

  // Journal / cost önce
  await safe(client, `DELETE FROM journal_entry_lines WHERE document_id IN (SELECT id FROM journal_entries WHERE company_id=$1)`, p);
  await safe(client, `DELETE FROM journal_entries WHERE company_id=$1`, p);
  await safe(client, `DELETE FROM item_cost_movements WHERE company_id=$1 OR movement_id IN (SELECT id FROM stock_movements WHERE company_id=$1)`, p);
  await safe(client, `DELETE FROM stock_movement_lines WHERE movement_id IN (SELECT id FROM stock_movements WHERE company_id=$1)`, p);
  await safe(client, `DELETE FROM stock_movements WHERE company_id=$1`, p);
  await safe(client, `DELETE FROM item_lots WHERE company_id=$1 OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, p);

  // Belge satırları
  for (const sql of [
    `DELETE FROM delivery_note_lines WHERE delivery_note_id IN (SELECT id FROM delivery_notes WHERE company_id=$1)`,
    `DELETE FROM shipment_order_lines WHERE ship_id IN (SELECT id FROM shipment_orders WHERE company_id=$1)`,
    `DELETE FROM sales_order_lines WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1)`,
    `DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)`,
    `DELETE FROM invoice_matches WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)`,
    `DELETE FROM purchase_order_lines WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id=$1)`,
    `DELETE FROM goods_receipt_lines WHERE receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1)`,
    `DELETE FROM transfer_order_lines WHERE order_id IN (SELECT id FROM transfer_orders WHERE company_id=$1)`,
    `DELETE FROM inventory_count_lines WHERE document_id IN (SELECT id FROM inventory_counts WHERE company_id=$1)`,
    `DELETE FROM production_order_operation_components WHERE operation_id IN (SELECT id FROM production_order_operations WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1))`,
    `DELETE FROM production_order_operations WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`,
    `DELETE FROM production_order_components WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`,
    `DELETE FROM production_receipts WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1) OR company_id=$1`,
    `DELETE FROM bom_lines WHERE product_bom_id IN (SELECT id FROM boms WHERE company_id=$1)`,
    `DELETE FROM routing_operation_components WHERE operation_id IN (SELECT id FROM routing_operations WHERE route_id IN (SELECT id FROM routings WHERE company_id=$1))`,
    `DELETE FROM routing_operations WHERE route_id IN (SELECT id FROM routings WHERE company_id=$1)`,
  ]) {
    await safe(client, sql, p);
  }

  // company_id olan tüm tablolar (çoklu tur)
  const tables = (await client.query(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema='public' AND column_name='company_id'
     ORDER BY table_name`,
  )).rows.map((r) => r.table_name);

  for (let pass = 0; pass < 8; pass++) {
    for (const t of tables) {
      if (t === 'companies') continue;
      await safe(client, `DELETE FROM ${t} WHERE company_id=$1`, p);
    }
  }

  // Org — depo.partner_id null, plant FK'leri temizle
  await safe(client, `UPDATE warehouses SET partner_id=NULL
    WHERE plant_id IN (SELECT id FROM plants WHERE company_id=$1)`, p);
  await safe(client, `UPDATE partners SET plant_id=NULL WHERE company_id=$1 OR plant_id IN (
    SELECT id FROM plants WHERE company_id=$1)`, p);
  await safe(client, `DELETE FROM user_company_permissions WHERE company_id=$1`, p);
  await safe(client, `DELETE FROM user_warehouses WHERE warehouse_id IN (
    SELECT w.id FROM warehouses w JOIN plants p ON p.id=w.plant_id WHERE p.company_id=$1)`, p);
  await safe(client, `DELETE FROM work_stations WHERE work_center_id IN (
    SELECT id FROM work_centers WHERE plant_id IN (SELECT id FROM plants WHERE company_id=$1))`, p);
  await safe(client, `DELETE FROM work_centers WHERE plant_id IN (SELECT id FROM plants WHERE company_id=$1)`, p);
  await safe(client, `DELETE FROM item_warehouses WHERE plant_id IN (SELECT id FROM plants WHERE company_id=$1)
    OR warehouse_id IN (SELECT w.id FROM warehouses w JOIN plants p ON p.id=w.plant_id WHERE p.company_id=$1)`, p);
  await safe(client, `DELETE FROM warehouses WHERE plant_id IN (SELECT id FROM plants WHERE company_id=$1)`, p);
  await safe(client, `DELETE FROM plants WHERE company_id=$1`, p);

  const del = await client.query(`DELETE FROM companies WHERE id=$1 RETURNING company_code`, p);
  return del.rows[0]?.company_code || null;
}

async function main() {
  const firms = (await pool.query(
    `SELECT id, company_code, company_name FROM companies ORDER BY id`,
  )).rows;

  const remove = firms.filter((f) => !KEEP.has(String(f.company_code).toUpperCase()));
  const keep = firms.filter((f) => KEEP.has(String(f.company_code).toUpperCase()));

  console.log(JSON.stringify({
    keep: keep.map((f) => f.company_code),
    remove: remove.map((f) => f.company_code),
  }, null, 2));

  for (const f of remove) {
    try {
      execSync(`node scripts/purge-firma-veri.js ${f.company_code} --also-org`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    } catch (e) {
      console.error(`purge ${f.company_code}:`, e.message);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Bilinçli temizlik: onaylı/muhasebeleşmiş belge silme kilidini (150) yalnız bu transaction için aç
      await client.query("SELECT set_config('erp.belge_kilit_bypass', 'on', true)");
      const code = await hardDeleteCompany(client, f.id);
      await client.query('COMMIT');
      console.log(code ? `SILINDI: ${code}` : `KALDI/HATA: ${f.company_code}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`firma silinemedi ${f.company_code}:`, err.message);
    } finally {
      client.release();
    }
  }

  const left = (await pool.query(
    `SELECT id, company_code, company_name FROM companies ORDER BY id`,
  )).rows;
  console.log(JSON.stringify({ kalan_firmalar: left }, null, 2));
  await pool.end();
  if (left.some((f) => !KEEP.has(String(f.company_code).toUpperCase()))) {
    process.exitCode = 2;
  }
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(1);
});
