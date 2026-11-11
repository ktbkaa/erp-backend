/**
 * Firma kapsamlı veri temizliği (İngilizce şema / company_id).
 *
 * 1) company_id IS NULL olan işlem/kartları siler (mümkün olanlar)
 * 2) Verilen firma kodu için iş verisini siler;
 *    firma + iş yeri + depo iskeleti kalır (sıfırdan test için)
 *
 * Kullanım:
 *   node scripts/purge-firma-veri.js
 *   node scripts/purge-firma-veri.js TEKS
 *   node scripts/purge-firma-veri.js TELSTIL
 *   node scripts/purge-firma-veri.js TEKS --also-org   # plant+warehouse da sil
 */
require('dotenv').config();
const pool = require('../db');

const rawArg = String(process.argv[2] || 'TEKS').trim();
const alsoOrg = process.argv.includes('--also-org');

/** Kullanıcı "Telstil" derse TEKS (Denim Tekstil) demo firması kastedilir */
const CODE_ALIASES = {
  TELSTIL: 'TEKS',
  TELSTİL: 'TEKS',
  TEKSTIL: 'TEKS',
  TEKSTİL: 'TEKS',
  DENIM: 'TEKS',
  KOMPANZASYON: 'ELEK',
  KOMP: 'ELEK',
  ELEKTRONIK: 'ELEK',
  DOKÜM: 'DOKUM',
  DOKUM: 'DOKUM',
};

const firmaKodu = (CODE_ALIASES[rawArg.toUpperCase()] || rawArg).toUpperCase();

/** company_id kolonlu tablolar — çocuk → ebeveyn silme sırası */
const COMPANY_TABLES = [
  // kalite / giriş kontrol
  'qc_capa', 'qc_nonconformances', 'qc_orders', 'incoming_inspections',
  // stok
  'item_lots', 'item_barcode_scans', 'stock_movements',
  'inventory_counts', 'transfer_orders',
  // satış
  'invoices', 'delivery_notes', 'shipment_orders', 'sales_orders', 'sales_quotations',
  // satınalma
  'goods_receipts', 'vendor_delivery_notes', 'purchase_orders', 'purchase_agreements',
  'purchase_quotations', 'rfqs', 'purchase_requisitions',
  // üretim / BOM / rota / MRP
  'production_orders', 'production_plans', 'routings', 'boms',
  'mrp_independent_requirements', 'mrp_runs',
  // CRM
  'crm_tasks', 'crm_activities', 'crm_activity_plans',
  'crm_opportunities', 'crm_contacts', 'crm_leads',
  // finans / muhasebe
  'journal_entries', 'fin_cash_movements', 'fin_bank_accounts', 'fin_cash_accounts',
  'price_lists', 'gl_accounts', 'fixed_assets',
  'accounting_periods', 'fiscal_years',
  // onay (transactional; tanımlar PROTECTED)
  'approval_records', 'approval_module_usages',
  // üretim yan tablolar
  'production_receipts', 'production_plans',
  'receipts_payments', 'supplier_evaluations',
  // HR
  'hr_payroll_lines', 'hr_payroll_runs', 'hr_payroll_periods',
  'hr_advances', 'hr_employee_salaries', 'hr_attendance_days', 'hr_attendance_raw',
  'hr_leave_requests', 'hr_leave_balances', 'hr_leave_types',
  'hr_shift_assignments', 'hr_asset_assignments', 'hr_onboarding_tasks',
  'hr_terminations', 'hr_candidates', 'hr_job_requisitions',
  'hr_employment_history', 'hr_employee_documents', 'hr_employees',
  'hr_positions', 'hr_departments', 'hr_shifts', 'hr_work_calendars',
  'hr_public_holidays', 'hr_termination_reasons',
  // ana kartlar
  'partners', 'items',
  'partner_company_params',
  // NOT: user_company_permissions silinmez — yoksa firma profil picker'dan kaybolur
  // PRJ
  'project_cost_entries', 'project_budget_lines', 'project_risks',
  'project_close_checklists', 'project_milestones', 'project_phases',
  'project_members', 'project_attachments', 'project_purchase_links', 'project_sales_links',
  'work_logs', 'work_item_comments', 'work_item_attachments', 'work_item_history',
  'work_item_materials', 'work_item_resources', 'work_item_relations',
  'work_items', 'prj_sprint_work_items', 'prj_sprints', 'prj_board_columns',
  'prj_boards', 'prj_automation_logs', 'projects',
];

async function tableExists(client, name) {
  const r = await client.query(`SELECT to_regclass($1) AS t`, [`public.${name}`]);
  return Boolean(r.rows[0].t);
}

async function hasColumn(client, table, col) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return r.rows.length > 0;
}

async function deleteWhere(client, table, whereSql, params, log) {
  if (!(await tableExists(client, table))) {
    log.skipped.push(table);
    return 0;
  }
  const sp = `sp_${table.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await client.query(`SAVEPOINT ${sp}`);
    const r = await client.query(`DELETE FROM ${table} WHERE ${whereSql}`, params);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    if (r.rowCount) log.deleted.push({ table, n: r.rowCount });
    return r.rowCount;
  } catch (err) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (_) { /* ignore */ }
    log.errors.push({ table, hata: err.message });
    return 0;
  }
}

/** Tanım / seed tabloları — firma temizliği bunlara dokunmaz (null company_id dahil). */
const PROTECTED_TABLES = new Set([
  'companies',
  'prj_project_types', 'prj_project_categories', 'prj_project_statuses', 'prj_project_priorities',
  'prj_project_roles', 'prj_work_item_types', 'prj_work_item_statuses', 'prj_work_item_priorities',
  'prj_relation_types', 'prj_workflows', 'prj_workflow_transitions',
  'prj_project_templates', 'prj_project_template_items', 'prj_automations',
  'number_series', 'system_parameters', 'movement_codes', 'document_types',
  'uoms', 'countries', 'currencies', 'languages', 'banks',
  // Onay tanım şablonları (null company_id seed) — kayıtlar company_id ile silinir
  'approval_roles', 'approval_routes', 'approval_route_steps', 'approval_rules',
]);

/**
 * Firma işlem temizliği bunları ASLA silmez (iskelet / yetki / görünürlük).
 * Özellikle user_company_permissions: silinirse firma profil picker'dan kaybolur.
 */
const NEVER_PURGE_TABLES = new Set([
  'companies', 'plants', 'warehouses',
  'user_company_permissions', 'user_warehouses',
  ...PROTECTED_TABLES,
]);

async function discoverCompanyTables(client) {
  const r = await client.query(
    `SELECT table_name FROM information_schema.columns
     WHERE table_schema='public' AND column_name='company_id'
     ORDER BY table_name`
  );
  const discovered = r.rows.map((x) => x.table_name);
  const ordered = [];
  const seen = new Set();
  for (const t of COMPANY_TABLES) {
    if (NEVER_PURGE_TABLES.has(t)) continue;
    if (discovered.includes(t) && !seen.has(t)) {
      ordered.push(t);
      seen.add(t);
    }
  }
  for (const t of discovered) {
    if (NEVER_PURGE_TABLES.has(t)) continue;
    if (!seen.has(t) && t !== 'companies') {
      ordered.push(t);
      seen.add(t);
    }
  }
  return ordered;
}

async function purgeNullCompany(client, tables, log) {
  log.nullFirma = [];
  for (const t of tables) {
    // Global seed / tanım tablolarına dokunma (PRJ şablonları vb.)
    if (PROTECTED_TABLES.has(t)) continue;
    if (!(await hasColumn(client, t, 'company_id'))) continue;
    const n = await deleteWhere(client, t, 'company_id IS NULL', [], log);
    if (n) log.nullFirma.push({ table: t, n });
  }
}

async function purgeCompany(client, companyId, tables, log) {
  const p = [companyId];

  // Rota / BOM çocukları
  await deleteWhere(client, 'routing_operation_components',
    `operation_id IN (SELECT id FROM routing_operations WHERE route_id IN (SELECT id FROM routings WHERE company_id=$1))`, p, log);
  await deleteWhere(client, 'routing_operation_equipment',
    `operation_id IN (SELECT id FROM routing_operations WHERE route_id IN (SELECT id FROM routings WHERE company_id=$1))`, p, log);
  await deleteWhere(client, 'routing_operations',
    `route_id IN (SELECT id FROM routings WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'bom_line_alternatives',
    `bom_line_id IN (SELECT id FROM bom_lines WHERE product_bom_id IN (SELECT id FROM boms WHERE company_id=$1))`, p, log);
  await deleteWhere(client, 'bom_lines',
    `product_bom_id IN (SELECT id FROM boms WHERE company_id=$1)`, p, log);

  // Belge satırları
  await deleteWhere(client, 'sales_order_lines',
    `sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'sales_quotation_lines',
    `quotation_id IN (SELECT id FROM sales_quotations WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'shipment_order_lines',
    `ship_id IN (SELECT id FROM shipment_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'delivery_note_lines',
    `delivery_note_id IN (SELECT id FROM delivery_notes WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'invoice_lines',
    `invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'invoice_matches',
    `invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'purchase_requisition_lines',
    `requisition_id IN (SELECT id FROM purchase_requisitions WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'purchase_quotation_lines',
    `quotation_id IN (SELECT id FROM purchase_quotations WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'purchase_order_lines',
    `purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'vendor_delivery_note_lines',
    `delivery_note_id IN (SELECT id FROM vendor_delivery_notes WHERE company_id=$1)`, p, log);

  // Üretim emri çocukları (FK sırası kritik)
  await deleteWhere(client, 'production_receipts',
    `order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'production_order_operation_components',
    `operation_id IN (SELECT id FROM production_order_operations WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1))`, p, log);
  await deleteWhere(client, 'production_order_operations',
    `order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'production_order_components',
    `order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'production_byproducts',
    `production_order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'production_plans',
    `company_id=$1 OR production_order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, p, log);

  // Giriş kontrol → mal kabul satırlarından önce (FK)
  await deleteWhere(client, 'incoming_inspection_lines',
    `inspection_id IN (SELECT id FROM incoming_inspections WHERE company_id=$1
       OR goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1))`, p, log);
  await deleteWhere(client, 'incoming_inspections',
    `company_id=$1 OR goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'goods_receipt_lines',
    `receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1)`, p, log);

  // İrsaliye / fatura / sayım / transfer satırları + tahsilat
  await deleteWhere(client, 'inventory_count_lines',
    `document_id IN (SELECT id FROM inventory_counts WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'transfer_order_lines',
    `order_id IN (SELECT id FROM transfer_orders WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'purchase_agreement_lines',
    `agreement_id IN (SELECT id FROM purchase_agreements WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'rfq_lines',
    `rfq_id IN (SELECT id FROM rfqs WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'receipts_payments',
    `invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)
     OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'qc_item_plans',
    `item_id IN (SELECT id FROM items WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'supplier_evaluations',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'item_company_params',
    `item_id IN (SELECT id FROM items WHERE company_id=$1)`, p, log);

  await deleteWhere(client, 'mrp_results',
    `run_id IN (SELECT id FROM mrp_runs WHERE company_id=$1)
     OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'stock_movement_lines',
    `movement_id IN (SELECT id FROM stock_movements WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'crm_opportunity_lines',
    `opportunity_id IN (SELECT id FROM crm_opportunities WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'price_list_lines',
    `list_id IN (SELECT id FROM price_lists WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'journal_entry_lines',
    `document_id IN (SELECT id FROM journal_entries WHERE company_id=$1)`, p, log);

  // Stok çocukları
  for (const child of [
    'item_plants', 'item_warehouses', 'item_barcodes', 'item_uom_conversions',
    'item_languages', 'item_details', 'item_substitutes',
    'item_reservations', 'item_serials', 'item_cost_movements',
  ]) {
    await deleteWhere(client, child,
      `item_id IN (SELECT id FROM items WHERE company_id=$1)`, p, log);
  }
  await deleteWhere(client, 'item_substitutes',
    `substitute_item_id IN (SELECT id FROM items WHERE company_id=$1)`, p, log);

  // İş merkezi (plant üzerinden) — org silinmese bile WC temizlenebilir
  await deleteWhere(client, 'work_stations',
    `work_center_id IN (SELECT id FROM work_centers WHERE plant_id IN (SELECT id FROM plants WHERE company_id=$1))`, p, log);
  await deleteWhere(client, 'work_centers',
    `plant_id IN (SELECT id FROM plants WHERE company_id=$1)`, p, log);

  // Cari çocukları
  await deleteWhere(client, 'partner_ledger_entries',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'partner_bank_accounts',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'partner_details',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'partner_languages',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'partner_ship_to_addresses',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'collections_payments',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);
  await deleteWhere(client, 'crm_calendar_entries',
    `partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, p, log);

  // HR satır çocukları (ülke seviyesindeki param setlere dokunma)
  await deleteWhere(client, 'hr_leave_balance_movements',
    `balance_id IN (SELECT id FROM hr_leave_balances WHERE company_id=$1)`, p, log);

  const skipOrg = new Set(['plants', 'warehouses', 'companies']);
  // company_id tabloları (çoklu tur — FK sırası için)
  for (let pass = 0; pass < 6; pass++) {
    for (const t of tables) {
      if (!alsoOrg && skipOrg.has(t)) continue;
      await deleteWhere(client, t, 'company_id = $1', p, log);
    }
  }

  if (alsoOrg) {
    await deleteWhere(client, 'warehouses',
      `plant_id IN (SELECT id FROM plants WHERE company_id=$1)`, p, log);
    await deleteWhere(client, 'plants', 'company_id = $1', p, log);
  }
}

async function resolveCompany(client, code) {
  let f = await client.query(
    `SELECT id, company_code, company_name FROM companies WHERE UPPER(company_code)=UPPER($1)`,
    [code]
  );
  if (f.rows[0]) return f.rows[0];
  f = await client.query(
    `SELECT id, company_code, company_name FROM companies
     WHERE company_name ILIKE $1 OR company_name ILIKE $2
     ORDER BY id LIMIT 1`,
    [`%${code}%`, '%tekstil%']
  );
  return f.rows[0] || null;
}

async function main() {
  const client = await pool.connect();
  const log = {
    requested: rawArg,
    firmaKodu,
    alsoOrg,
    deleted: [],
    skipped: [],
    errors: [],
    nullFirma: [],
  };
  try {
    await client.query('BEGIN');
    const tables = await discoverCompanyTables(client);
    await purgeNullCompany(client, tables, log);

    const firma = await resolveCompany(client, firmaKodu);
    if (!firma) throw new Error(`Firma bulunamadı: ${rawArg} (çözümlenen kod: ${firmaKodu})`);
    log.firma = firma;
    await purgeCompany(client, firma.id, tables, log);

    await client.query('COMMIT');

    const left = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM items WHERE company_id=$1) AS items,
         (SELECT COUNT(*) FROM partners WHERE company_id=$1) AS partners,
         (SELECT COUNT(*) FROM boms WHERE company_id=$1) AS boms,
         (SELECT COUNT(*) FROM routings WHERE company_id=$1) AS routings,
         (SELECT COUNT(*) FROM sales_orders WHERE company_id=$1) AS sales_orders,
         (SELECT COUNT(*) FROM purchase_orders WHERE company_id=$1) AS purchase_orders,
         (SELECT COUNT(*) FROM invoices WHERE company_id=$1) AS invoices,
         (SELECT COUNT(*) FROM hr_employees WHERE company_id=$1) AS hr_employees,
         (SELECT COUNT(*) FROM items WHERE company_id IS NULL) AS null_items`,
      [firma.id]
    );
    log.kalan = left.rows[0];
    console.log(JSON.stringify({
      ok: true,
      requested: rawArg,
      firma: log.firma,
      silinen_satir: log.deleted.reduce((a, x) => a + x.n, 0),
      silinen_tablolar: log.deleted.length,
      hatalar: log.errors,
      kalan: log.kalan,
    }, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purge başarısız:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
