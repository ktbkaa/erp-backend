/**
 * GIDA (Anadolu Süt ve Süt Ürünleri) — Canias referanslı temiz tam döngü
 *
 * 1) Yalnızca GIDA işlem + ana kart verisini siler (firma/iş yeri/depo/iş merkezi kalır)
 * 2) BASE: TEST-SUT stok, cari, fiyat, BOM, rota (Canias 1–7)
 * 3) TEST-SUT-MAN: MRP’siz uçtan uca
 * 4) TEST-SUT-MRP: MRP’li süreç
 *
 * Etiket: CANIAS-TAM-DONGU-TEST / TEST-SUT-*
 * Önkoşul: backups/gida-tam-dongu/pre-clean.dump yedek alınmış olmalı
 *
 * Kullanım:
 *   node scripts/demo-gida-tam-dongu.js
 *   npm run demo:gida-dongu
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { mrpCalistir } = require('../src/services/mrpService');
const { sonrakiKod, stokSeriKodundanTip, cariSeriKodundanTur } = require('../src/utils/kodUretici');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { baslatOnay, onaylaAdim } = require('../src/services/onayService');

const TAG = {
  BASE: 'TEST-SUT-BASE',
  MAN: 'TEST-SUT-MAN',
  MRP: 'TEST-SUT-MRP',
  LABEL: 'CANIAS-TAM-DONGU-TEST',
};

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRMA_KODU = 'GIDA';

const summary = {
  firma: null,
  tags: TAG,
  base: {},
  man: {},
  mrp: {},
  how_to_filter: {
    ui: 'Üst bardan firma = GIDA seçin. Listelerde project_code / açıklama alanına TEST-SUT-MAN veya TEST-SUT-MRP yazın.',
    sql: "WHERE company_id = <GIDA> AND (project_code IN ('TEST-SUT-MAN','TEST-SUT-MRP') OR description ILIKE '%TEST-SUT%' OR description ILIKE '%CANIAS-TAM-DONGU-TEST%')",
  },
};

function log(msg) {
  console.log(msg);
}

async function api(method, urlPath, body, firmaId) {
  const headers = { 'Content-Type': 'application/json', 'X-Kullanici-Kodu': 'owner' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  let r;
  try {
    r = await fetch(BASE_URL + urlPath, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`${method} ${urlPath} → fetch failed: ${err.message}`);
  }
  clearTimeout(timer);
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = data?.hata || data?.detay || text || r.statusText;
    throw new Error(`${method} ${urlPath} → ${r.status}: ${msg}`);
  }
  return data;
}

/** Satış fatura API { fatura: {...} } veya düz fatura dönebilir */
function unwrapFatura(data) {
  if (!data) return null;
  return data.fatura || data.invoice || data;
}

/** Mal kabul → Giriş Kontrol onayı → Giriş Kalite (GKK) onayı → Hammadde */
async function onaylaGkk(firmaId, mkId, targetWarehouseId, tag) {
  const gkRows = (await pool.query(
    `SELECT * FROM incoming_inspections
     WHERE goods_receipt_id=$1 AND status NOT IN ('Onayli','Red','Iptal')`,
    [mkId]
  )).rows;
  for (const g of gkRows) {
    try {
      await api('POST', `/giris-kontrolleri/${g.id}/onayla`, {
        description: `[${tag}] ${TAG.LABEL} giriş kontrol — ürün/miktar tutuşması`,
      }, firmaId);
      log(`  Giriş kontrol onay: ${g.inspection_no || g.id}`);
    } catch (err) {
      log(`  Giriş kontrol atlandı ${g.inspection_no || g.id}: ${err.message}`);
    }
  }
  const inspIds = (await pool.query(
    `SELECT id FROM incoming_inspections WHERE goods_receipt_id=$1`,
    [mkId]
  )).rows.map((r) => r.id);
  const r = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='GKK' AND status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND (
         (source_type='MAL_KABUL' AND source_id=$1)
         OR (source_type='GIRIS_KONTROL' AND source_id = ANY($2::int[]))
         OR source_id=$1
       )`,
    [mkId, inspIds.length ? inspIds : [0]]
  );
  for (const e of r.rows.slice(0, 20)) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || e.accepted_quantity,
        rejected_quantity: 0,
        target_warehouse_id: targetWarehouseId,
        description: `[${tag}] ${TAG.LABEL} giriş kalite onay → Hammadde`,
      }, firmaId);
      await tagBelge(null, 'qc_orders', e.id, firmaId, tag, { project: false });
      log(`  GKK onay: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  GKK atlandı ${e.order_no || e.id}: ${err.message}`);
    }
  }
}

/**
 * API belgelerini etiketlendir — ayrı kısa transaction (açık seed txn ile satır kilidi çakışmasın).
 */
async function tagBelge(_clientIgnored, table, id, firmaId, tag, { project = true } = {}) {
  if (!id) return;
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (project) {
      await c.query(
        `UPDATE ${table} SET
           company_id = COALESCE(company_id, $2),
           project_code = COALESCE(NULLIF(project_code,''), $3),
           description = CASE
             WHEN COALESCE(description,'') LIKE '%' || $3 || '%' THEN description
             ELSE trim(both from COALESCE(description,'') || ' [' || $3 || ']')
           END
         WHERE id=$1`,
        [id, firmaId, tag]
      );
    } else {
      await c.query(
        `UPDATE ${table} SET
           company_id = COALESCE(company_id, $2),
           description = CASE
             WHEN COALESCE(description,'') LIKE '%' || $3 || '%' THEN description
             ELSE trim(both from COALESCE(description,'') || ' [' || $3 || ']')
           END
         WHERE id=$1`,
        [id, firmaId, tag]
      );
    }
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => null);
    if (/project_code/.test(err.message)) {
      try {
        await c.query('BEGIN');
        await c.query(
          `UPDATE ${table} SET
             company_id = COALESCE(company_id, $2),
             description = CASE
               WHEN COALESCE(description,'') LIKE '%' || $3 || '%' THEN description
               ELSE trim(both from COALESCE(description,'') || ' [' || $3 || ']')
             END
           WHERE id=$1`,
          [id, firmaId, tag]
        );
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => null);
        log(`  tag ${table}#${id}: ${e.message}`);
      }
    } else {
      log(`  tag ${table}#${id}: ${err.message}`);
    }
  } finally {
    c.release();
  }
}

async function sevkIrsaliyeFatura(client, { firma, plant, wh, so, tag, qtyHint }) {
  let sevk = null;
  let irs = null;
  let satisFatura = null;
  try {
    sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      warehouse_id: wh.mam.id,
      company_id: firma.id,
      description: `[${tag}] Sevk emri`,
    }, firma.id);
    await tagBelge(client, 'shipment_orders', sevk?.id, firma.id, tag, { project: false });
  } catch (err) {
    log(`  sevk: ${err.message}`);
  }

  if (sevk?.id) {
    try {
      irs = await api('POST', '/delivery_notes/sevk-emrinden', {
        shipment_order_id: sevk.id,
        company_id: firma.id,
        plant_id: plant.id,
        project_code: tag,
        description: `[${tag}] Satış irsaliyesi`,
        ship_city: 'İstanbul',
        ship_district: 'Kadıköy',
        ship_country: 'Türkiye',
        ship_postal_code: '34710',
        ship_to_address: 'Demo Sevk Adresi No:1',
        carrier_title: 'Demo Nakliyat A.Ş.',
        carrier_tax_id: '1234567890',
        driver_name: 'Ali',
        driver_last_name: 'Yılmaz',
        driver_national_id: '10000000146',
        vehicle_plate: '34 ELK 01',
      }, firma.id);
      if (irs?.id) {
        await tagBelge(client, 'delivery_notes', irs.id, firma.id, tag);
        await api('PUT', `/delivery_notes/${irs.id}`, {
          ...irs,
          company_id: firma.id,
          plant_id: plant.id,
          project_code: tag,
          ship_city: 'İstanbul',
          ship_district: 'Kadıköy',
          ship_country: 'Türkiye',
          ship_postal_code: '34710',
          ship_to_address: irs.ship_to_address || 'Demo Sevk Adresi No:1',
          carrier_title: 'Demo Nakliyat A.Ş.',
          carrier_tax_id: '1234567890',
          driver_name: 'Ali',
          driver_last_name: 'Yılmaz',
          driver_national_id: '10000000146',
          vehicle_plate: '34 ELK 01',
          description: `[${tag}] Satış irsaliyesi`,
        }, firma.id).catch((e) => log(`  irsaliye put: ${e.message}`));
        try {
          irs = await api('POST', `/delivery_notes/${irs.id}/onayla`, {}, firma.id);
          log(`  irsaliye onay: ${irs.delivery_note_no || irs.id} (${irs.status})`);
        } catch (err) {
          log(`  irsaliye onay: ${err.message}`);
        }
      }
    } catch (err) {
      log(`  irsaliye: ${err.message}`);
    }
  }

  if (irs?.id && String(irs.status) === 'Onayli') {
    try {
      await client.query(
        `UPDATE delivery_notes SET e_document_status='Gonderildi', company_id=COALESCE(company_id,$2), project_code=COALESCE(project_code,$3) WHERE id=$1`,
        [irs.id, firma.id, tag]
      );
      await client.query('COMMIT');
      await client.query('BEGIN');
      const raw = await api('POST', `/delivery_notes/${irs.id}/fatura-olustur`, {
        description: `[${tag}] Satış faturası`,
      }, firma.id);
      satisFatura = unwrapFatura(raw);
      if (satisFatura?.id) {
        await api('POST', `/invoices/${satisFatura.id}/muhasebelestir`, {}, firma.id)
          .catch((e) => log(`  satış muhasebe: ${e.message}`));
        await tagBelge(client, 'invoices', satisFatura.id, firma.id, tag);
        {
          const tc = await pool.connect();
          try {
            await tc.query(
              `UPDATE invoices SET description=$2, project_code=COALESCE(project_code,$3), company_id=COALESCE(company_id,$4) WHERE id=$1`,
              [satisFatura.id, `[${tag}] Satış faturası`, tag, firma.id]
            );
          } catch (_) { /* ignore */ } finally { tc.release(); }
        }
        log(`  satış fatura: ${satisFatura.invoice_no || satisFatura.id}`);
      }
    } catch (err) {
      log(`  satış fatura: ${err.message}`);
    }
  } else if (irs?.id) {
    log(`  satış fatura atlandı (irsaliye status=${irs.status})`);
  }

  return { sevk, irs, satisFatura, qtyHint };
}

async function tableExists(client, name) {
  const r = await client.query(`SELECT to_regclass($1) AS t`, [`public.${name}`]);
  return Boolean(r.rows[0].t);
}

async function hasCol(client, table, col) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return r.rows.length > 0;
}

async function del(client, sql, params, label) {
  const sp = `sp_${String(label || 'x').replace(/[^a-z0-9]/gi, '').slice(0, 24)}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await client.query(`SAVEPOINT ${sp}`);
    const r = await client.query(sql, params);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    if (r.rowCount) log(`  silindi ${label || sql.slice(0, 40)}: ${r.rowCount}`);
    return r.rowCount;
  } catch (err) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (_) { /* ignore */ }
    log(`  atlandı ${label || ''}: ${err.message}`);
    return 0;
  }
}

/** GIDA işlem + kart verisini temizle; org iskeleti kalsın */
async function purgeGida(client, companyId) {
  log('\n=== 0. GIDA veri temizliği (yalnızca company_id=GIDA) ===');
  const id = companyId;
  // Partner / item kapsamı (company_id null kalan belgeler için)
  const partnerScope = `SELECT id FROM partners WHERE company_id=$1`;
  const itemScope = `SELECT id FROM items WHERE company_id=$1`;
  const soScope = `SELECT id FROM sales_orders WHERE company_id=$1 OR partner_id IN (${partnerScope})`;
  const shipScope = `SELECT id FROM shipment_orders WHERE company_id=$1 OR partner_id IN (${partnerScope}) OR sales_order_id IN (${soScope})`;
  const dnScope = `SELECT id FROM delivery_notes WHERE company_id=$1 OR partner_id IN (${partnerScope}) OR sales_order_id IN (${soScope}) OR shipment_order_id IN (${shipScope})`;

  // FK döngülerini kır
  const nulls = [
    [`UPDATE goods_receipts SET vendor_delivery_note_id=NULL WHERE company_id=$1`, [id], 'null gr.vdn'],
    [`UPDATE purchase_orders SET quotation_id=NULL, requisition_id=NULL WHERE company_id=$1`, [id], 'null po refs'],
    [`UPDATE purchase_quotations SET istek_id=NULL, requisition_id=NULL WHERE company_id=$1`, [id], 'null pq refs'],
    [`UPDATE purchase_agreements SET quotation_id=NULL WHERE company_id=$1`, [id], 'null pa.quot'],
    [`UPDATE production_orders SET product_bom_id=NULL, route_id=NULL, sales_order_id=NULL
       WHERE company_id=$1
          OR product_bom_id IN (SELECT id FROM boms WHERE company_id=$1)
          OR route_id IN (SELECT id FROM routings WHERE company_id=$1)
          OR item_id IN (${itemScope})`, [id], 'null ue refs'],
    [`UPDATE production_plans SET production_order_id=NULL, mrp_result_id=NULL WHERE company_id=$1`, [id], 'null plan refs'],
    [`UPDATE invoice_lines SET delivery_line_id=NULL, sales_order_line_id=NULL
       WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id=$1 OR partner_id IN (${partnerScope}))
          OR delivery_line_id IN (SELECT id FROM delivery_note_lines WHERE delivery_note_id IN (${dnScope}))`, [id], 'null inv.line refs'],
    [`UPDATE invoices SET delivery_note_id=NULL, sales_order_id=NULL, goods_receipt_id=NULL, gl_document_id=NULL
       WHERE company_id=$1 OR partner_id IN (${partnerScope}) OR delivery_note_id IN (${dnScope})`, [id], 'null inv refs'],
    [`UPDATE delivery_note_lines SET ship_emri_line_id=NULL, sales_order_line_id=NULL
       WHERE delivery_note_id IN (${dnScope})`, [id], 'null dn.line refs'],
    [`UPDATE delivery_notes SET sales_order_id=NULL, shipment_order_id=NULL, item_movement_id=NULL
       WHERE id IN (${dnScope})`, [id], 'null dn refs'],
    [`UPDATE shipment_order_lines SET sales_order_line_id=NULL WHERE ship_id IN (${shipScope})`, [id], 'null ship.line refs'],
    [`UPDATE shipment_orders SET sales_order_id=NULL WHERE id IN (${shipScope})`, [id], 'null ship.so'],
    [`UPDATE sales_quotations SET price_list_id=NULL WHERE company_id=$1 OR partner_id IN (${partnerScope})`, [id], 'null quot.pl'],
    [`UPDATE vendor_delivery_notes SET purchase_order_id=NULL WHERE company_id=$1`, [id], 'null vdn.po'],
    [`UPDATE routings SET product_bom_id=NULL WHERE company_id=$1`, [id], 'null rota.bom'],
  ];
  for (const s of nulls) await del(client, s[0], s[1], s[2]);

  // Önce irsaliye / sevk / fatura (null company_id dahil)
  await del(client, `DELETE FROM delivery_note_lines WHERE delivery_note_id IN (${dnScope})`, [id], 'dn_lines_scope');
  await del(client, `DELETE FROM delivery_notes WHERE id IN (${dnScope})`, [id], 'dn_scope');
  await del(client, `DELETE FROM shipment_order_lines WHERE ship_id IN (${shipScope})`, [id], 'ship_lines_scope');
  await del(client, `DELETE FROM shipment_orders WHERE id IN (${shipScope})`, [id], 'ship_scope');

  // Çapraz / kalan bağlar
  await del(client,
    `DELETE FROM qc_measurements WHERE order_id IN (
       SELECT id FROM qc_orders WHERE company_id=$1 OR item_id IN (SELECT id FROM items WHERE company_id=$1))`,
    [id], 'qc_meas_pre');
  await del(client,
    `DELETE FROM qc_orders WHERE company_id=$1 OR item_id IN (SELECT id FROM items WHERE company_id=$1)`,
    [id], 'qc_pre');
  await del(client,
    `DELETE FROM production_receipts WHERE order_id IN (
       SELECT id FROM production_orders WHERE company_id=$1 OR item_id IN (SELECT id FROM items WHERE company_id=$1))`,
    [id], 'po_rcpt_pre');
  await del(client,
    `DELETE FROM delivery_note_lines WHERE delivery_note_id IN (
       SELECT id FROM delivery_notes WHERE company_id=$1
          OR sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1))
          OR shipment_order_id IN (SELECT id FROM shipment_orders WHERE company_id=$1
             OR sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1))))`,
    [id], 'dn_lines_pre');
  await del(client,
    `UPDATE delivery_notes SET shipment_order_id=NULL, sales_order_id=NULL WHERE company_id=$1
        OR sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1))`,
    [id], 'null dn pre');
  await del(client,
    `DELETE FROM delivery_notes WHERE company_id=$1
        OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`,
    [id], 'dn_pre');
  await del(client,
    `DELETE FROM shipment_order_lines WHERE ship_id IN (
       SELECT id FROM shipment_orders WHERE company_id=$1
          OR sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)))
        OR sales_order_line_id IN (
       SELECT l.id FROM sales_order_lines l
       JOIN sales_orders s ON s.id=l.sales_order_id
       WHERE s.company_id=$1 OR s.partner_id IN (SELECT id FROM partners WHERE company_id=$1))`,
    [id], 'ship_lines_pre');
  await del(client,
    `DELETE FROM shipment_orders WHERE company_id=$1
        OR sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1))`,
    [id], 'ship_pre');
  await del(client,
    `UPDATE sales_orders SET price_list_id=NULL WHERE company_id=$1
        OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`,
    [id], 'null so.price_list');
  await del(client,
    `DELETE FROM purchase_requisition_lines WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`,
    [id], 'pr_lines_by_item_pre');
  await del(client,
    `DELETE FROM purchase_quotation_lines WHERE quotation_id IN (
       SELECT id FROM purchase_quotations WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1))`,
    [id], 'pq_lines_by_partner_pre');
  await del(client,
    `UPDATE purchase_agreements SET quotation_id=NULL WHERE quotation_id IN (
       SELECT id FROM purchase_quotations WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1))`,
    [id], 'null pa pre');
  await del(client,
    `DELETE FROM purchase_quotations WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`,
    [id], 'pq_by_partner_pre');
  await del(client,
    `DELETE FROM price_list_lines WHERE list_id IN (SELECT id FROM price_lists WHERE company_id=$1 OR list_code LIKE 'GIDA-SAT%' OR list_code LIKE 'TEST-SUT%')`,
    [id], 'pl_lines_pre');
  await del(client,
    `DELETE FROM price_lists WHERE company_id=$1 OR list_code LIKE 'GIDA-SAT%' OR list_code LIKE 'TEST-SUT%'`,
    [id], 'pl_pre');

  const steps = [
    [`DELETE FROM approval_record_steps WHERE record_id IN (SELECT id FROM approval_records WHERE company_id=$1)`, [id], 'approval_record_steps'],
    [`DELETE FROM approval_records WHERE company_id=$1`, [id], 'approval_records'],
    [`DELETE FROM incoming_inspection_lines WHERE inspection_id IN (
        SELECT id FROM incoming_inspections WHERE company_id=$1
          OR purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id=$1)
          OR goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1))`, [id], 'incoming_insp_lines'],
    [`DELETE FROM incoming_inspections WHERE company_id=$1
        OR purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id=$1)
        OR goods_receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1)`, [id], 'incoming_inspections'],
    [`DELETE FROM qc_measurements WHERE order_id IN (SELECT id FROM qc_orders WHERE company_id=$1)`, [id], 'qc_measurements'],
    [`DELETE FROM qc_capa WHERE company_id=$1`, [id], 'qc_capa'],
    [`DELETE FROM qc_nonconformances WHERE company_id=$1`, [id], 'qc_nonconformances'],
    [`DELETE FROM qc_orders WHERE company_id=$1`, [id], 'qc_orders'],
    [`DELETE FROM journal_entry_lines WHERE document_id IN (SELECT id FROM journal_entries WHERE company_id=$1)`, [id], 'journal_entry_lines'],
    [`DELETE FROM journal_entries WHERE company_id=$1`, [id], 'journal_entries'],
    [`DELETE FROM invoice_matches WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)`, [id], 'invoice_matches'],
    [`DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)
        OR invoice_id IN (SELECT id FROM invoices WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1))
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'invoice_lines'],
    [`DELETE FROM invoices WHERE company_id=$1
        OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'invoices'],
    [`DELETE FROM delivery_note_lines WHERE delivery_note_id IN (SELECT id FROM delivery_notes WHERE company_id=$1)`, [id], 'delivery_note_lines'],
    [`DELETE FROM delivery_notes WHERE company_id=$1`, [id], 'delivery_notes'],
    [`DELETE FROM shipment_order_lines WHERE ship_id IN (SELECT id FROM shipment_orders WHERE company_id=$1)`, [id], 'shipment_order_lines'],
    [`DELETE FROM shipment_orders WHERE company_id=$1`, [id], 'shipment_orders'],
    [`DELETE FROM sales_order_lines WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE company_id=$1)
        OR sales_order_id IN (SELECT id FROM sales_orders WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1))`, [id], 'sales_order_lines'],
    [`DELETE FROM sales_orders WHERE company_id=$1
        OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'sales_orders'],
    [`DELETE FROM sales_quotation_lines WHERE quotation_id IN (SELECT id FROM sales_quotations WHERE company_id=$1)`, [id], 'sales_quotation_lines'],
    [`DELETE FROM sales_quotations WHERE company_id=$1`, [id], 'sales_quotations'],
    [`DELETE FROM vendor_delivery_note_lines WHERE delivery_note_id IN (SELECT id FROM vendor_delivery_notes WHERE company_id=$1)`, [id], 'vdn_lines'],
    [`DELETE FROM goods_receipt_lines WHERE receipt_id IN (SELECT id FROM goods_receipts WHERE company_id=$1)`, [id], 'gr_lines'],
    [`DELETE FROM goods_receipts WHERE company_id=$1`, [id], 'goods_receipts'],
    [`DELETE FROM vendor_delivery_notes WHERE company_id=$1`, [id], 'vendor_delivery_notes'],
    [`DELETE FROM stock_movement_lines WHERE movement_id IN (SELECT id FROM stock_movements WHERE company_id=$1)`, [id], 'sm_lines'],
    [`DELETE FROM stock_movement_lines WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'sm_lines_item'],
    [`DELETE FROM stock_movements WHERE company_id=$1`, [id], 'stock_movements'],
    [`DELETE FROM purchase_order_lines WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE company_id=$1)`, [id], 'po_lines'],
    [`DELETE FROM purchase_orders WHERE company_id=$1`, [id], 'purchase_orders'],
    [`DELETE FROM purchase_quotation_lines WHERE quotation_id IN (SELECT id FROM purchase_quotations WHERE company_id=$1)`, [id], 'pq_lines'],
    [`UPDATE purchase_agreements SET quotation_id=NULL WHERE quotation_id IN (SELECT id FROM purchase_quotations WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1))`, [id], 'null pa by pq'],
    [`DELETE FROM purchase_quotation_lines WHERE quotation_id IN (
        SELECT id FROM purchase_quotations WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1))`, [id], 'pq_lines2'],
    [`DELETE FROM purchase_quotations WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'purchase_quotations'],
    [`DELETE FROM rfq_lines WHERE istek_id IN (SELECT id FROM rfqs WHERE company_id=$1)`, [id], 'rfq_lines'],
    [`DELETE FROM rfqs WHERE company_id=$1`, [id], 'rfqs'],
    [`DELETE FROM purchase_requisition_lines WHERE requisition_id IN (
        SELECT id FROM purchase_requisitions
        WHERE company_id=$1 OR project_code LIKE 'TEST-SUT%' OR description ILIKE '%TEST-SUT%' OR description ILIKE '%CANIAS-TAM-DONGU%')
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'pr_lines'],
    [`DELETE FROM purchase_requisitions
       WHERE company_id=$1 OR project_code LIKE 'TEST-SUT%' OR description ILIKE '%TEST-SUT%' OR description ILIKE '%CANIAS-TAM-DONGU%'`, [id], 'purchase_requisitions'],
    [`DELETE FROM purchase_agreement_lines WHERE anlasma_id IN (SELECT id FROM purchase_agreements WHERE company_id=$1)
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'pa_lines'],
    [`DELETE FROM purchase_agreements WHERE company_id=$1
        OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'purchase_agreements'],
    [`DELETE FROM production_order_operation_components WHERE operasyon_id IN (
        SELECT o.id FROM production_order_operations o
        JOIN production_orders e ON e.id=o.order_id WHERE e.company_id=$1)`, [id], 'pooc'],
    [`DELETE FROM production_order_operations WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, [id], 'po_ops'],
    [`DELETE FROM production_order_components WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, [id], 'po_comps'],
    [`DELETE FROM production_byproducts WHERE production_order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, [id], 'po_by'],
    [`DELETE FROM production_receipts WHERE order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`, [id], 'po_rcpt'],
    [`DELETE FROM production_order_operation_components WHERE operasyon_id IN (
        SELECT o.id FROM production_order_operations o
        JOIN production_orders e ON e.id=o.order_id
        WHERE e.item_id IN (SELECT id FROM items WHERE company_id=$1))`, [id], 'pooc2'],
    [`DELETE FROM production_order_operations WHERE order_id IN (
        SELECT id FROM production_orders WHERE item_id IN (SELECT id FROM items WHERE company_id=$1))`, [id], 'po_ops2'],
    [`DELETE FROM production_order_components WHERE order_id IN (
        SELECT id FROM production_orders WHERE item_id IN (SELECT id FROM items WHERE company_id=$1))`, [id], 'po_comps2'],
    [`DELETE FROM production_orders WHERE company_id=$1
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'production_orders'],
    [`DELETE FROM production_plans WHERE company_id=$1`, [id], 'production_plans'],
    [`DELETE FROM mrp_results WHERE run_id IN (SELECT id FROM mrp_runs WHERE company_id=$1)
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)
        OR source_item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'mrp_results'],
    [`DELETE FROM mrp_runs WHERE company_id=$1`, [id], 'mrp_runs'],
    [`DELETE FROM mrp_independent_requirements WHERE company_id=$1`, [id], 'mrp_bi'],
    [`DELETE FROM inventory_count_lines WHERE document_id IN (SELECT id FROM inventory_counts WHERE company_id=$1)
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'inv_count_lines'],
    [`DELETE FROM inventory_counts WHERE company_id=$1`, [id], 'inventory_counts'],
    [`DELETE FROM transfer_order_lines WHERE order_id IN (SELECT id FROM transfer_orders WHERE company_id=$1)
        OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'tr_lines'],
    [`DELETE FROM transfer_orders WHERE company_id=$1`, [id], 'transfer_orders'],
    [`DELETE FROM crm_tasks WHERE company_id=$1`, [id], 'crm_tasks'],
    [`DELETE FROM crm_activities WHERE company_id=$1`, [id], 'crm_activities'],
    [`DELETE FROM crm_activity_plans WHERE company_id=$1`, [id], 'crm_plans'],
    [`DELETE FROM crm_opportunity_lines WHERE firsat_id IN (SELECT id FROM crm_opportunities WHERE company_id=$1)`, [id], 'crm_opp_lines'],
    [`DELETE FROM crm_opportunities WHERE company_id=$1`, [id], 'crm_opportunities'],
    [`DELETE FROM crm_contacts WHERE company_id=$1`, [id], 'crm_contacts'],
    [`DELETE FROM crm_leads WHERE company_id=$1`, [id], 'crm_leads'],
    [`DELETE FROM fin_cash_movements WHERE company_id=$1`, [id], 'fin_cash_mov'],
    [`DELETE FROM fin_cash_accounts WHERE company_id=$1`, [id], 'fin_cash'],
    [`DELETE FROM fin_bank_accounts WHERE company_id=$1`, [id], 'fin_bank'],
    [`DELETE FROM price_list_lines WHERE list_id IN (SELECT id FROM price_lists WHERE company_id=$1)`, [id], 'price_lines'],
    [`DELETE FROM price_lists WHERE company_id=$1`, [id], 'price_lists'],
    [`DELETE FROM routing_operation_equipment WHERE operation_id IN (
        SELECT o.id FROM routing_operations o JOIN routings r ON r.id=o.route_id WHERE r.company_id=$1)`, [id], 'roe'],
    [`DELETE FROM routing_operation_components WHERE operasyon_id IN (
        SELECT o.id FROM routing_operations o JOIN routings r ON r.id=o.route_id WHERE r.company_id=$1)`, [id], 'roc'],
    [`DELETE FROM routing_operations WHERE route_id IN (SELECT id FROM routings WHERE company_id=$1)`, [id], 'routing_ops'],
    [`DELETE FROM routings WHERE company_id=$1`, [id], 'routings'],
    [`DELETE FROM bom_line_alternatives WHERE bom_line_id IN (
        SELECT l.id FROM bom_lines l JOIN boms b ON b.id=l.product_bom_id WHERE b.company_id=$1)`, [id], 'bom_alts'],
    [`DELETE FROM bom_lines WHERE product_bom_id IN (SELECT id FROM boms WHERE company_id=$1)
        OR component_item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'bom_lines'],
    [`DELETE FROM boms WHERE company_id=$1
        OR finished_good_item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'boms'],
    [`DELETE FROM work_stations WHERE work_center_id IN (
        SELECT wc.id FROM work_centers wc JOIN plants p ON p.id=wc.plant_id WHERE p.company_id=$1)`, [id], 'work_stations'],
    [`DELETE FROM item_lots WHERE company_id=$1 OR item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_lots'],
    [`DELETE FROM item_warehouses WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_warehouses'],
    [`DELETE FROM item_plants WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_plants'],
    [`DELETE FROM item_uom_conversions WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_uom'],
    [`DELETE FROM item_barcodes WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_barcodes'],
    [`DELETE FROM item_languages WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_languages'],
    [`DELETE FROM item_details WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_details'],
    [`DELETE FROM item_substitutes WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)
        OR ikame_item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_subs'],
    [`DELETE FROM item_reservations WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_res'],
    [`DELETE FROM item_serials WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_serials'],
    [`DELETE FROM item_cost_movements WHERE item_id IN (SELECT id FROM items WHERE company_id=$1)`, [id], 'item_cost'],
    [`DELETE FROM item_barcode_scans WHERE company_id=$1`, [id], 'barcode_scans'],
    [`DELETE FROM items WHERE company_id=$1`, [id], 'items'],
    [`DELETE FROM partner_bank_accounts WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'partner_banks'],
    [`DELETE FROM partner_ship_to_addresses WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'partner_ship'],
    [`DELETE FROM partner_languages WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'partner_lang'],
    [`DELETE FROM partner_details WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'partner_det'],
    [`DELETE FROM partner_ledger_entries WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [id], 'partner_ledger'],
    [`DELETE FROM partner_company_params WHERE company_id=$1`, [id], 'partner_params'],
    [`DELETE FROM partners WHERE company_id=$1`, [id], 'partners'],
  ];

  for (const [sql, params, label] of steps) {
    await del(client, sql, params, label);
  }
}

async function ensureOrg(client) {
  const firma = (await client.query(
    `SELECT * FROM companies WHERE company_code=$1`, [FIRMA_KODU]
  )).rows[0];
  if (!firma) throw new Error('GIDA firması yok — önce demo:4-firma çalıştırın.');
  const plant = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`, [firma.id]
  )).rows[0];
  if (!plant) throw new Error('GIDA iş yeri yok.');
  const whRows = (await client.query(
    `SELECT * FROM warehouses WHERE plant_id=$1 ORDER BY id`, [plant.id]
  )).rows;
  const byCode = Object.fromEntries(whRows.map((w) => [w.warehouse_code, w]));
  let wc = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 ORDER BY id LIMIT 1`, [plant.id]
  )).rows[0];
  if (!wc) {
    wc = (await client.query(
      `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
       VALUES ($1,'GIDA-IM1','GIDA Pastörizasyon Hattı',TRUE) RETURNING *`,
      [plant.id]
    )).rows[0];
  }
  return {
    firma,
    plant,
    wh: {
      ana: byCode['GIDA-ANA'] || whRows[0],
      hmd: byCode['GIDA-HMD'] || whRows[0],
      mam: byCode['GIDA-MAM'] || whRows[0],
      kk: byCode['GIDA-KK'] || whRows[0],
      svk: byCode['GIDA-SVK'] || whRows[0],
      gir: byCode['GIDA-GIR'] || byCode['GIDA-ANA'] || whRows[0],
      ckk: byCode['GIDA-CKK'] || byCode['GIDA-KK'] || whRows[0],
      ym: byCode['GIDA-YM'] || byCode['GIDA-ANA'] || whRows[0],
    },
    wc,
  };
}

async function createPartner(client, { name, type, companyId, plantId, tag }) {
  const kod = await sonrakiKod(client, cariSeriKodundanTur(type));
  return (await client.query(
    `INSERT INTO partners (
       partner_code, partner_name, partner_type, telefon, email, il, country, currency_code,
       payment_due_days, is_active, company_id, plant_id, notlar
     ) VALUES ($1,$2,$3,$4,$5,'İstanbul','Türkiye','TRY',30,TRUE,$6,$7,$8)
     RETURNING *`,
    [kod, name, type, '02125550100', `${kod.toLowerCase()}@elek.demo`, companyId, plantId, tag]
  )).rows[0];
}

async function createItem(client, {
  name, type, price, companyId, plantId, girisWh, cikisWh, tag, tedarik = null, qc = false,
  uom = 'AD', itemCode = null,
}) {
  const kod = itemCode || await sonrakiKod(client, stokSeriKodundanTip(type));
  const tedarikType = tedarik || (type === 'Mamul' || type === 'YariMamul' ? 'Uretim' : 'Satinalma');
  const row = (await client.query(
    `INSERT INTO items (
       item_code, item_name, uom_code, sales_price, item_type, tedarik_type,
       is_active, company_id, varsayilan_giris_warehouse_id, varsayilan_cikis_warehouse_id,
       kalite_control_gerekli, description, temin_suresi_days, safety_stock, lot_politika
     ) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      kod, name, uom, price || 0, type, tedarikType, companyId,
      girisWh, cikisWh, qc,
      `[${tag}] ${TAG.LABEL} — ${name}`,
      type === 'Hammadde' ? 3 : 0,
      type === 'Hammadde' ? 50 : 0,
      (type === 'Hammadde' || type === 'Mamul' || type === 'YariMamul') ? 'IstegeBagli' : 'Takipsiz',
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO item_plants (item_id, plant_id, is_active)
     VALUES ($1,$2,TRUE) ON CONFLICT (item_id, plant_id) DO UPDATE SET is_active=TRUE`,
    [row.id, plantId]
  );
  const extraWh = [];
  // Kalite akışı: Giriş / GKK / CKK / YM depolarına izin
  try {
    const orgWh = await client.query(
      `SELECT id FROM warehouses WHERE plant_id=$1 AND warehouse_rolu IN ('Giris','GKK','CKK','YariMamul','Hammadde','Mamul','Normal')`,
      [plantId]
    );
    extraWh.push(...orgWh.rows.map((r) => r.id));
  } catch (_) { /* ignore */ }
  const allWh = [...new Set([girisWh, cikisWh, ...extraWh].filter(Boolean))];
  for (const wid of allWh) {
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
         SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
       )`,
      [row.id, wid, plantId]
    ).catch(() => null);
  }
  return row;
}

/**
 * GIDA SA sipariş onay rotası (OR-SA-SIPARIS) + roller — eksikse oluşturur.
 * D5: artık atlanmaz; rota zorunlu.
 */
async function ensureSaSiparisOnayTanimi(client, firmaId) {
  const owner = (await client.query(`SELECT id FROM users WHERE user_code='owner'`)).rows[0];
  if (!owner) throw new Error('owner kullanıcısı yok — SA onay rolleri bağlanamaz.');

  for (const [kod, adi] of [
    ['SA_MUDUR-GIDA', 'Satınalma Müdürü'],
    ['FINANS-GIDA', 'Finans Onayı'],
    ['SA_MUDUR-GLOBAL', 'Satınalma Müdürü'],
    ['FINANS-GLOBAL', 'Finans Onayı'],
  ]) {
    const companyId = kod.includes('GIDA') ? firmaId : null;
    const exists = await client.query(
      `SELECT id FROM approval_roles
       WHERE role_code = $1::varchar
         AND (($2::int IS NULL AND company_id IS NULL) OR company_id = $2::int)
       LIMIT 1`,
      [kod, companyId]
    );
    if (!exists.rows[0]) {
      await client.query(
        `INSERT INTO approval_roles (role_code, role_name, description, kisi_id, company_id, is_active)
         VALUES ($1::varchar, $2::varchar, $3::text, $4::int, $5::int, TRUE)`,
        [kod, adi, `CANIAS-TAM-DONGU-TEST ${adi}`, owner.id, companyId]
      );
    }
  }

  await client.query(
    `INSERT INTO approval_rules (
       rule_code, rule_name, description, screen_id, company_id, is_active, line_no, term_min_amount, otomatik_onay
     )
     SELECT 'OM-SA-SIPARIS', 'Satınalma siparişi onayı',
            'CANIAS-TAM-DONGU-TEST / PURT05', 'satin-alma-siparisleri',
            NULL, TRUE, 10, 0, FALSE
     WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE rule_code='OM-SA-SIPARIS')`
  );

  await client.query(
    `INSERT INTO approval_routes (
       route_code, route_name, description, screen_id, rule_id, company_id, is_active, versiyon
     )
     SELECT 'OR-SA-SIPARIS', 'Satınalma sipariş rotası',
            'SA müdürü → finans eşiği (CANIAS-TAM-DONGU-TEST)',
            'satin-alma-siparisleri', k.id, NULL, TRUE, 1
     FROM approval_rules k
     WHERE k.rule_code='OM-SA-SIPARIS'
       AND NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code='OR-SA-SIPARIS')`
  );

  await client.query(
    `UPDATE approval_routes r SET
       screen_id = 'satin-alma-siparisleri',
       rule_id = COALESCE(r.rule_id, k.id),
       is_active = TRUE
     FROM approval_rules k
     WHERE r.route_code='OR-SA-SIPARIS' AND k.rule_code='OM-SA-SIPARIS'`
  );

  const rota = (await client.query(
    `SELECT id FROM approval_routes WHERE route_code='OR-SA-SIPARIS' AND is_active=TRUE`
  )).rows[0];
  if (!rota) throw new Error('OR-SA-SIPARIS rotası oluşturulamadı.');

  for (const [lineNo, stepName, roleName, minAmount, roleCode] of [
    [10, 'Satınalma müdürü onayı', 'Satınalma Müdürü', null, 'SA_MUDUR-GLOBAL'],
    [20, 'Finans onayı (eşik üzeri)', 'Finans Onayı', 50000, 'FINANS-GLOBAL'],
  ]) {
    const rol = (await client.query(
      `SELECT id FROM approval_roles WHERE role_code=$1 LIMIT 1`,
      [roleCode]
    )).rows[0];
    await client.query(
      `INSERT INTO approval_route_steps (
         route_id, line_no, step_name, role_id, role_name, zorunlu, min_amount
       )
       SELECT $1, $2, $3, $4, $5, TRUE, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM approval_route_steps a WHERE a.route_id=$1 AND a.line_no=$2
       )`,
      [rota.id, lineNo, stepName, rol?.id || null, roleName, minAmount]
    );
  }

  await client.query(
    `INSERT INTO approval_module_usages (
       kullanim_code, kullanim_name, module_code, screen_id, route_id, min_amount, is_active, description
     )
     SELECT 'OM-SA-SIPARIS', 'Satınalma siparişi onayı', 'SATINALMA',
            'satin-alma-siparisleri', $1, 0, TRUE,
            'CANIAS-TAM-DONGU-TEST SA sipariş onay'
     WHERE NOT EXISTS (SELECT 1 FROM approval_module_usages WHERE kullanim_code='OM-SA-SIPARIS')`,
    [rota.id]
  );

  log(`  SA sipariş onay rotası hazır: OR-SA-SIPARIS (#${rota.id})`);
  return rota;
}

/** SA sipariş için onay kaydı başlat + tüm adımları onayla (atlama yok) */
async function calistirSaSiparisOnay(client, { firmaId, po, tag }) {
  const kullanici = (await client.query(`SELECT * FROM users WHERE user_code='owner'`)).rows[0];
  if (!kullanici) throw new Error('owner yok — SA onay adımları tamamlanamaz.');

  let kayit = await baslatOnay(client, {
    company_id: firmaId,
    screen_id: 'satin-alma-siparisleri',
    module_code: 'SATINALMA',
    document_id: po.id,
    document_no: po.order_no,
    document_ozet: `[${tag}] SA onay`,
    amount: Number(po.total_amount) || 0,
    currency_code: po.currency_code || 'TRY',
    baslatan_kisi_id: kullanici.id,
    description: `[${tag}] ${TAG.LABEL} SA siparişi onay süreci`,
  });

  if (kayit?.atlandi) {
    throw new Error(`SA onay atlandı (${kayit.neden}) — beklenmiyor.`);
  }
  if (!kayit?.id) throw new Error('SA onay kaydı oluşmadı.');

  let guard = 0;
  while (kayit.status_code === 'BEKLIYOR' && guard < 10) {
    kayit = await onaylaAdim(client, kayit.id, kullanici, {
      notlar: `[${tag}] ${TAG.LABEL} adım onayı`,
    });
    guard += 1;
  }
  if (kayit.status_code !== 'ONAYLANDI') {
    throw new Error(`SA onay tamamlanamadı: ${kayit.onay_no || kayit.id} → ${kayit.status_code}`);
  }
  log(`  SA onay tamam: ${kayit.onay_no || kayit.id} (${kayit.status_code}) belge=${po.order_no}`);
  return kayit;
}

/** Üretim sonrası CKK emirlerini onayla → Mamul/YarıMamul */
async function onaylaCkk(firmaId, productionOrderId, tag) {
  const r = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='CKK' AND status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND (source_id=$1 OR description ILIKE $2)
     ORDER BY id`,
    [productionOrderId, `%${tag}%`]
  );
  for (const e of r.rows) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || e.accepted_quantity,
        rejected_quantity: 0,
        description: `[${tag}] ${TAG.LABEL} çıkış kalite onay`,
      }, firmaId);
      log(`  CKK onay: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  CKK atlandı ${e.order_no || e.id}: ${err.message}`);
    }
  }
}

async function seedBase(client, org) {
  log('\n=== 1. BASE master TEST-SUT (BAST03/BOMT01/ROUT01/BAST02/SALT02) ===');
  const { firma, plant, wh, wc } = org;
  const tag = TAG.BASE;

  // Ölçü birimleri (varsa)
  for (const [kod, adi] of [['LT', 'Litre'], ['AD', 'Adet'], ['KG', 'Kilogram']]) {
    await client.query(
      `INSERT INTO units_of_measure (uom_code, uom_name, is_active) VALUES ($1,$2,TRUE)
       ON CONFLICT (uom_code) DO NOTHING`,
      [kod, adi]
    ).catch(() => null);
  }

  const ted1 = await createPartner(client, {
    name: 'TEST-SUT Tedarik — Çiftlik Kooperatifi',
    type: 'Tedarikci', companyId: firma.id, plantId: plant.id, tag,
  });
  const ted2 = await createPartner(client, {
    name: 'TEST-SUT Tedarik — Ambalaj Paket',
    type: 'Tedarikci', companyId: firma.id, plantId: plant.id, tag,
  });
  const mus1 = await createPartner(client, {
    name: 'TEST-SUT Müşteri — Market Zinciri',
    type: 'Musteri', companyId: firma.id, plantId: plant.id, tag,
  });
  const mus2 = await createPartner(client, {
    name: 'TEST-SUT Müşteri — Oteller Tedarik',
    type: 'Musteri', companyId: firma.id, plantId: plant.id, tag,
  });

  // İsimler: hmPcb=çiğ süt, hmCap=kültür, hmCoil=şişe, hmCase=kapak (manuel/MRP script uyumu)
  const hmPcb = await createItem(client, {
    name: 'TEST-SUT-HAMMADDE-01 — Çiğ Süt', type: 'Hammadde', price: 18, uom: 'LT',
    itemCode: 'TEST-SUT-H01', companyId: firma.id, plantId: plant.id,
    girisWh: wh.hmd.id, cikisWh: wh.hmd.id, tag, qc: true,
  });
  const hmCap = await createItem(client, {
    name: 'TEST-SUT-HAMMADDE-02 — Süt Kültürü', type: 'Hammadde', price: 85, uom: 'KG',
    itemCode: 'TEST-SUT-H02', companyId: firma.id, plantId: plant.id,
    girisWh: wh.hmd.id, cikisWh: wh.hmd.id, tag, qc: true,
  });
  const hmCoil = await createItem(client, {
    name: 'TEST-SUT-AMBALAJ-01 — 1 L Süt Şişesi', type: 'Hammadde', price: 1.2, uom: 'AD',
    itemCode: 'TEST-SUT-A01', companyId: firma.id, plantId: plant.id,
    girisWh: wh.hmd.id, cikisWh: wh.hmd.id, tag, qc: false,
  });
  const hmCase = await createItem(client, {
    name: 'TEST-SUT-AMBALAJ-02 — Süt Kapağı', type: 'Hammadde', price: 0.3, uom: 'AD',
    itemCode: 'TEST-SUT-A02', companyId: firma.id, plantId: plant.id,
    girisWh: wh.hmd.id, cikisWh: wh.hmd.id, tag, qc: false,
  });
  const ym = await createItem(client, {
    name: 'TEST-SUT-YARIURUN-01 — Pastörize Süt', type: 'YariMamul', price: 22, uom: 'LT',
    itemCode: 'TEST-SUT-Y01', companyId: firma.id, plantId: plant.id,
    girisWh: wh.ym.id, cikisWh: wh.ym.id, tag, tedarik: 'Uretim', qc: true,
  });
  const fg = await createItem(client, {
    name: 'TEST-SUT-MAMUL-01 — Tam Yağlı Süt 1 L', type: 'Mamul', price: 28, uom: 'AD',
    itemCode: 'TEST-SUT-M01', companyId: firma.id, plantId: plant.id,
    girisWh: wh.mam.id, cikisWh: wh.mam.id, tag, qc: true,
  });
  const fg2 = await createItem(client, {
    name: 'TEST-SUT-MAMUL-02 — Yoğurt 1 KG', type: 'Mamul', price: 45, uom: 'KG',
    itemCode: 'TEST-SUT-M02', companyId: firma.id, plantId: plant.id,
    girisWh: wh.mam.id, cikisWh: wh.mam.id, tag, qc: true,
  });

  const listCode = `GIDA-SAT-${firma.id}-${Date.now()}`;
  await client.query(
    `DELETE FROM price_list_lines WHERE list_id IN (SELECT id FROM price_lists WHERE list_code LIKE 'GIDA-SAT%' OR list_code LIKE 'TEST-SUT%')`
  ).catch(() => null);
  await client.query(`DELETE FROM price_lists WHERE list_code LIKE 'GIDA-SAT%' OR list_code LIKE 'TEST-SUT%'`).catch(() => null);
  const pl = (await client.query(
    `INSERT INTO price_lists (list_code, list_name, currency_code, start_date, is_active, company_id)
     VALUES ($1,'TEST-SUT Satış Fiyat Listesi','TRY',CURRENT_DATE,TRUE,$2) RETURNING *`,
    [listCode, firma.id]
  )).rows[0];
  await client.query(
    `INSERT INTO price_list_lines (list_id, item_id, unit_price) VALUES ($1,$2,28), ($1,$3,45)`,
    [pl.id, fg.id, fg2.id]
  );

  const bomCode = await sonrakiKod(client, 'URUN_AGACI').catch(async () => {
    const n = await sonrakiBelgeNo(client, 'URUN_AGACI').catch(() => `UA-SUT-${Date.now()}`);
    return n;
  });
  // 1 AD mamul = 1.02 LT çiğ süt + 1 şişe + 1 kapak (kültür opsiyonel/küçük)
  const bom = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alt_no, bom_type, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','Onayli',TRUE,TRUE,$6,$7)
     RETURNING *`,
    [fg.id, bomCode, `TEST-SUT ${fg.item_name} Ağacı`, firma.id, plant.id, wh.mam.id, `${tag} ${TAG.LABEL}`]
  )).rows[0];

  const comps = [
    [hmPcb, 1.02, 'LT'], [hmCoil, 1, 'AD'], [hmCase, 1, 'AD'],
  ];
  let lineNo = 10;
  for (const [st, qty, uom] of comps) {
    await client.query(
      `INSERT INTO bom_lines (
         product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
         scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
       ) VALUES ($1,$2,$3,$4,$5,$4,$4,0,'Net',$6,'Malzeme',TRUE)`,
      [bom.id, lineNo, st.id, qty, uom, wh.hmd.id]
    );
    lineNo += 10;
  }

  const routeCode = await sonrakiKod(client, 'ROTA');
  const rota = (await client.query(
    `INSERT INTO routings (
       item_id, product_bom_id, route_code, route_name, template, varsayilan,
       company_id, plant_id, route_type, alt_no, is_active, notes
     ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7)
     RETURNING *`,
    [fg.id, bom.id, routeCode, `TEST-SUT ${fg.item_name} Rotası`, firma.id, plant.id, `${tag} ${TAG.LABEL}`]
  )).rows[0];

  const ops = [
    { line: 10, code: 'OP10', name: 'Kabul-Analiz', time: 10, next: 20, out: null },
    { line: 20, code: 'OP20', name: 'Pastörizasyon', time: 30, next: 30, out: ym.id },
    { line: 30, code: 'OP30', name: 'Dolum', time: 20, next: 40, out: null },
    { line: 40, code: 'OP40', name: 'Soğuk Depolama', time: 5, next: null, out: fg.id },
  ];
  const opIds = {};
  for (const op of ops) {
    const ins = await client.query(
      `INSERT INTO routing_operations (
         route_id, line_no, operation_code, operation_name, work_center_id,
         sure_dk, op_time, op_time_uom, sonraki_line_no, output_item_id,
         include_precost, include_std_cost, include_actual_cost, require_qc
       ) VALUES ($1,$2,$3,$4,$5,$6,$6,'dk',$7,$8,TRUE,TRUE,TRUE,$9)
       RETURNING id`,
      [
        rota.id, op.line, op.code, op.name, wc.id, op.time, op.next,
        op.out, op.code === 'OP40',
      ]
    );
    opIds[op.code] = ins.rows[0].id;
  }
  await client.query(
    `INSERT INTO routing_operation_components (operasyon_id, item_id, quantity, uom_code) VALUES
     ($1,$2,1.02,'LT'), ($3,$4,1,'AD'), ($3,$5,1,'AD')`,
    [opIds.OP20, hmPcb.id, opIds.OP30, hmCoil.id, hmCase.id]
  );

  // Work center notes as cost-center surrogate (BAST06 ekranı yok)
  await client.query(
    `UPDATE work_centers SET center_name=$2 WHERE id=$1`,
    [wc.id, 'GIDA Pastörizasyon Hattı / MC-SUT-01']
  ).catch(() => null);

  summary.base = {
    tag,
    label: TAG.LABEL,
    partners: { ted1: ted1.partner_code, ted2: ted2.partner_code, mus1: mus1.partner_code, mus2: mus2.partner_code },
    items: {
      cigSut: hmPcb.item_code, kultur: hmCap.item_code, sise: hmCoil.item_code,
      kapak: hmCase.item_code, pastorizasyon: ym.item_code, sut1L: fg.item_code, yogurt: fg2.item_code,
      // alias for MAN/MRP scripts
      hmPcb: hmPcb.item_code, hmCap: hmCap.item_code, hmCoil: hmCoil.item_code,
      hmCase: hmCase.item_code, fg: fg.item_code,
    },
    bom: bom.bom_code,
    route: rota.route_code,
    price_list: pl.list_code,
    gap_notes: [
      'Maliyet merkezi (BAST06) ayrı tablo/ekran yok — iş merkezi adına MC-SUT-01 işlendi',
    ],
    sa_approval_route: 'OR-SA-SIPARIS',
  };

  return {
    ted1, ted2, mus1, mus2,
    hmPcb, hmCap, hmCoil, hmCase, ym, fg, fg2,
    bom, rota, pl,
  };
}

async function openingStock(client, org, base, tag, multiplier = 1) {
  const qty = (n) => n * multiplier;
  await stokHareketOlustur(client, {
    hareketTipi: 'STOK_GIRIS',
    isYeriId: org.plant.id,
    depoId: org.wh.hmd.id,
    belgeTipi: 'Acilis',
    description: `[${tag}] Açılış stok — hammadde`,
    firmaId: org.firma.id,
    satirlar: [
      { item_id: base.hmPcb.id, quantity: qty(500), direction: 1, uom_code: 'LT' }, // çiğ süt
      { item_id: base.hmCap.id, quantity: qty(20), direction: 1, uom_code: 'KG' },  // kültür
      { item_id: base.hmCoil.id, quantity: qty(400), direction: 1, uom_code: 'AD' }, // şişe
      { item_id: base.hmCase.id, quantity: qty(400), direction: 1, uom_code: 'AD' }, // kapak
    ],
  });
}

async function hkId(client, documentType) {
  const r = await client.query(
    `SELECT id FROM movement_codes WHERE document_type=$1 AND is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
    [documentType]
  );
  return r.rows[0]?.id || null;
}

async function seedManuel(client, org, base) {
  log('\n=== 2. TEST-SUT-MAN — MRP’siz tam döngü ===');
  const tag = TAG.MAN;
  const { firma, plant, wh } = org;
  const today = new Date().toISOString().slice(0, 10);
  const qty = 100; // mamul sipariş (adet 1L süt)

  // Açılış stok (manuel senaryo için yeterli) — stok kilitlerini bırakmak için hemen commit
  await openingStock(client, org, base, tag, 1);
  await client.query('COMMIT');
  await client.query('BEGIN');

  // 8) Satış teklifi
  const teklifNo = await sonrakiBelgeNo(client, 'SATIS_TEKLIF').catch(() => `ST-MAN-${Date.now()}`);
  const teklif = (await client.query(
    `INSERT INTO sales_quotations (
       quotation_no, partner_id, quotation_date, valid_date, currency_code, status,
       description, total_amount, company_id, plant_id, project_code, price_list_id,
       movement_code_id, subtotal, tax_amount, grand_total
     ) VALUES ($1,$2,$3,$3,'TRY','Onayli',$4,$5,$6,$7,$8,$9,$10,$5,0,$5)
     RETURNING *`,
    [
      teklifNo, base.mus1.id, today,
      `[${tag}] ${TAG.LABEL} Satış teklifi — ${qty} adet Tam Yağlı Süt 1L`,
      qty * 28, firma.id, plant.id, tag, base.pl.id,
      await hkId(client, 'SatisTeklif'),
    ]
  )).rows[0];
  await client.query(
    `INSERT INTO sales_quotation_lines (
       quotation_id, line_no, item_id, quantity, uom_code, unit_price, amount_ex_tax, net_unit_price
     ) VALUES ($1,10,$2,$3,'AD',28,$4,28)`,
    [teklif.id, base.fg.id, qty, qty * 28]
  );

  // 9) Satış siparişi (tekliften)
  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: base.mus1.id,
    order_date: today,
    status: 'Onayli',
    company_id: firma.id,
    plant_id: plant.id,
    warehouse_id: wh.mam.id,
    project_code: tag,
    description: `[${tag}] ${TAG.LABEL} Satış siparişi — MRP yok`,
    price_list_id: base.pl.id,
    movement_code_id: await hkId(client, 'SatisSiparis'),
    quotation_id: teklif.id,
    kalemler: [{
      item_id: base.fg.id,
      quantity: qty,
      unit_price: 28,
      stock_uom: 'AD',
      warehouse_id: wh.mam.id,
    }],
  }, firma.id);

  // Satınalma (manuel — BOM ihtiyacı kadar, stok zaten var ama örnek zincir için ayrı PO)
  const prNo = await sonrakiBelgeNo(client, 'SATINALMA_TALEP').catch(() => `PR-MAN-${Date.now()}`);
  const pr = (await client.query(
    `INSERT INTO purchase_requisitions (
       requisition_no, plant_id, status, description, requisition_date,
       company_id, warehouse_id, project_code, currency_code
     ) VALUES ($1,$2,'Onayli',$3,$4,$5,$6,$7,'TRY') RETURNING *`,
    [prNo, plant.id, `[${tag}] Manuel satınalma talebi — yedek stok`, today, firma.id, wh.hmd.id, tag]
  )).rows[0];
  const prItems = [
    [base.hmPcb, 200, 18],   // çiğ süt LT
    [base.hmCoil, 150, 1.2], // şişe
    [base.hmCase, 150, 0.3], // kapak
  ];
  for (let i = 0; i < prItems.length; i++) {
    const [st, q, p] = prItems[i];
    await client.query(
      `INSERT INTO purchase_requisition_lines (
         requisition_id, line_no, item_id, quantity, uom_code, tahmini_unit_price, item_code, item_name, project_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [pr.id, (i + 1) * 10, st.id, q, st.uom_code || 'AD', p, st.item_code, st.item_name, tag]
    );
  }

  // PR bu transaction'da; API ayrı bağlantı — önce commit et
  await client.query('COMMIT');
  await client.query('BEGIN');

  const po = await api('POST', '/satin-alma-siparisleri', {
    partner_id: base.ted1.id,
    plant_id: plant.id,
    company_id: firma.id,
    warehouse_id: wh.hmd.id,
    status: 'Taslak',
    order_date: today,
    project_code: tag,
    description: `[${tag}] Manuel SA siparişi`,
    requisition_id: pr.id,
    currency_code: 'TRY',
    satirlar: prItems.map(([st, q, p], i) => ({
      item_id: st.id,
      quantity: q,
      unit_price: p,
      uom_code: st.uom_code || 'AD',
      line_no: (i + 1) * 10,
    })),
  }, firma.id);

  await api('POST', `/satin-alma-siparisleri/${po.id}/onayla`, {}, firma.id);
  // Merkezi onay: rota zorunlu; adımlar tamamlanmadan devam edilmez
  const onayMan = await calistirSaSiparisOnay(client, { firmaId: firma.id, po, tag });

  // Mal kabul / UE stok dokunur — açık txn stok kilidi bırakmasın
  await client.query('COMMIT');
  await client.query('BEGIN');

  const mk = await api('POST', '/mal-kabuller', {
    purchase_order_id: po.id,
    warehouse_id: wh.hmd.id,
    company_id: firma.id,
    description: `[${tag}] Mal kabul`,
    gkk_gerekli: true,
    internal_note: tag,
  }, firma.id);

  // GKK emirlerini onayla (direction=GKK)
  await onaylaGkk(firma.id, mk.id, wh.hmd.id, tag);

  // Alış faturası
  let alisFatura = null;
  try {
    alisFatura = await api('POST', `/mal-kabuller/${mk.id}/fatura-olustur`, {
      description: `[${tag}] Alış faturası`,
    }, firma.id);
    if (alisFatura?.id) {
      try {
        await api('POST', `/invoices/${alisFatura.id}/muhasebelestir`, {}, firma.id);
        log(`  alış fatura muhasebe: ${alisFatura.invoice_no || alisFatura.id}`);
      } catch (err) {
        log(`  muhasebe atlandı: ${err.message}`);
      }
    }
  } catch (err) {
    log(`  alış fatura atlandı: ${err.message}`);
  }

  // 19–23) Üretim emri (MRP yok — doğrudan) — stok ops için txn açık olmasın
  await client.query('COMMIT');
  await client.query('BEGIN');

  const ue = await api('POST', '/uretim-emirleri', {
    item_id: base.fg.id,
    product_bom_id: base.bom.id,
    route_id: base.rota.id,
    plant_id: plant.id,
    company_id: firma.id,
    component_warehouse_id: wh.hmd.id,
    fg_warehouse_id: wh.mam.id,
    wip_warehouse_id: wh.ana.id,
    planlanan_quantity: qty,
    order_type_id: 3, // SIP
    sales_order_id: so.id,
    planli_kesin: 'Kesin',
    description: `[${tag}] İş emri — satış siparişinden, MRP yok`,
    order_date: today,
  }, firma.id);

  await tagBelge(client, 'production_orders', ue.id, firma.id, tag, { project: false });
  await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, firma.id).catch((e) => log(`  UE onay: ${e.message}`));
  await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, firma.id).catch((e) => log(`  UE başlat: ${e.message}`));

  // Operasyonları tamamla (malzeme çıkış + ürün giriş → CKK)
  for (let i = 0; i < 4; i++) {
    try {
      await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { quantity: qty }, firma.id);
      log(`  op tamam ${i + 1}`);
    } catch (err) {
      log(`  op ${i + 1}: ${err.message}`);
      break;
    }
  }
  await onaylaCkk(firma.id, ue.id, tag);

  // 24–26) Sevk → irsaliye → fatura
  const { sevk, irs, satisFatura } = await sevkIrsaliyeFatura(client, {
    firma, plant, wh, so, tag,
  });

  summary.man = {
    tag,
    sales_quotation: teklif.quotation_no,
    sales_order: so.order_no,
    purchase_requisition: pr.requisition_no,
    purchase_order: po.order_no,
    sa_approval: onayMan.onay_no || String(onayMan.id),
    goods_receipt: mk.receipt_no,
    production_order: ue.order_no || String(ue.id),
    shipment: sevk?.shipment_no || sevk?.id || null,
    delivery_note: irs?.delivery_note_no || irs?.id || null,
    purchase_invoice: alisFatura?.invoice_no || null,
    sales_invoice: satisFatura?.invoice_no || null,
  };
}

async function seedMrp(client, org, base) {
  log('\n=== 3. TEST-SUT-MRP — MRP’li tam döngü ===');
  const tag = TAG.MRP;
  const { firma, plant, wh } = org;
  const today = new Date().toISOString().slice(0, 10);
  const qty = 50;

  // MAN açılış stokunu düşür ki MRP net ihtiyaç üretsin
  const { depoBakiyeListesi } = require('../src/services/stokHareketService');
  const hedefStoklar = new Set([base.hmPcb.id, base.hmCap.id, base.hmCoil.id, base.hmCase.id, base.fg.id].map(Number));
  const bakiyeler = (await depoBakiyeListesi(client)).filter(
    (b) => hedefStoklar.has(Number(b.item_id))
      && Number(b.bakiye) > 0
      && String(b.stock_status || 'Kullanilabilir') === 'Kullanilabilir'
  );
  for (const b of bakiyeler) {
    try {
      await stokHareketOlustur(client, {
        hareketTipi: 'STOK_CIKIS',
        isYeriId: plant.id,
        depoId: b.warehouse_id,
        belgeTipi: 'Sayim',
        description: `[${tag}] Stok sıfırlama — MRP öncesi`,
        firmaId: firma.id,
        satirlar: [{
          item_id: b.item_id,
          quantity: Number(b.bakiye),
          direction: -1,
          stock_status: b.stock_status || 'Kullanilabilir',
        }],
      });
    } catch (err) {
      log(`  stok sıfır ${b.item_code}: ${err.message}`);
    }
  }

  // Düşük açılış → net ihtiyaç
  await stokHareketOlustur(client, {
    hareketTipi: 'STOK_GIRIS',
    isYeriId: plant.id,
    depoId: wh.hmd.id,
    belgeTipi: 'Acilis',
    description: `[${tag}] Düşük açılış — MRP net ihtiyacı için`,
    firmaId: firma.id,
    satirlar: [
      { item_id: base.hmPcb.id, quantity: 5, direction: 1 },
      { item_id: base.hmCap.id, quantity: 20, direction: 1 },
      { item_id: base.hmCoil.id, quantity: 10, direction: 1 },
      { item_id: base.hmCase.id, quantity: 5, direction: 1 },
    ],
  });
  await client.query('COMMIT');
  await client.query('BEGIN');

  // Satış siparişi (bağımsız ihtiyaç kaynağı)
  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: base.mus2.id,
    order_date: today,
    status: 'Onayli',
    company_id: firma.id,
    plant_id: plant.id,
    warehouse_id: wh.mam.id,
    project_code: tag,
    description: `[${tag}] Satış siparişi — MRP tetikleyici`,
    price_list_id: base.pl.id,
    kalemler: [{
      item_id: base.fg.id,
      quantity: qty,
      unit_price: 28,
      stock_uom: 'AD',
      warehouse_id: wh.mam.id,
    }],
  }, firma.id);

  // Bağımsız ihtiyaç
  const biNo = await sonrakiKod(client, 'MRP_BI').catch(() => `BI-MRP-${Date.now()}`);
  const ihtiyacTarihi = new Date();
  ihtiyacTarihi.setDate(ihtiyacTarihi.getDate() + 14);
  await client.query(
    `INSERT INTO mrp_independent_requirements
       (ihtiyac_no, item_id, quantity, uom_code, ihtiyac_date, source, company_id, plant_id, description, is_active, sales_order_id)
     VALUES ($1,$2,$3,'AD',$4,'Manuel',$5,$6,$7,TRUE,$8)`,
    [
      biNo, base.fg.id, qty, ihtiyacTarihi.toISOString().slice(0, 10),
      firma.id, plant.id, `[${tag}] Bağımsız ihtiyaç ${qty} x ${base.fg.item_code}`,
      so.id,
    ]
  );

  const sonuc = await mrpCalistir(client, {
    firmaId: firma.id,
    isYeriId: plant.id,
    description: `[${tag}] MRP çalışması`,
    created_by: 'demo-elek-tam-dongu',
  });

  log(`  MRP: ${sonuc.calisma?.run_no || sonuc.calisma?.calisma_no} satır=${sonuc.calisma?.line_sayisi || sonuc.calisma?.satir_sayisi}`);

  const calismaId = sonuc.calisma?.id;
  // API ayrı bağlantı — MRP çalışmasını görmesi için commit
  await client.query('COMMIT');
  await client.query('BEGIN');
  let talep = null;
  let ueMrp = null;
  if (calismaId) {
    try {
      talep = await api('POST', '/mrp/talep-olustur', {
        run_id: calismaId,
        plant_id: plant.id,
        company_id: firma.id,
      }, firma.id);
      log(`  MRP→SA talep: ${talep.requisition_no || talep.talep_no || JSON.stringify(talep).slice(0, 80)}`);
      if (talep?.id) {
        await tagBelge(client, 'purchase_requisitions', talep.id, firma.id, tag);
        await client.query(
          `UPDATE purchase_requisitions SET company_id=COALESCE(company_id,$2), project_code=$3,
             description=$4 WHERE id=$1`,
          [talep.id, firma.id, tag, `[${tag}] MRP satınalma talebi`]
        ).catch(() => null);
      }
    } catch (err) {
      log(`  MRP talep: ${err.message}`);
    }
    try {
      ueMrp = await api('POST', '/mrp/uretim-emri-olustur', {
        run_id: calismaId,
        plant_id: plant.id,
        company_id: firma.id,
        component_warehouse_id: wh.hmd.id,
        fg_warehouse_id: wh.mam.id,
        wip_warehouse_id: wh.ana.id,
      }, firma.id);
      const list = Array.isArray(ueMrp) ? ueMrp : (ueMrp?.emirler || [ueMrp]);
      for (const e of list) {
        if (!e?.id) continue;
        await tagBelge(client, 'production_orders', e.id, firma.id, tag, { project: false });
        await client.query(
          `UPDATE production_orders SET company_id=COALESCE(company_id,$2),
             description=$3 WHERE id=$1`,
          [e.id, firma.id, `[${tag}] MRP iş emri`]
        ).catch(() => null);
        log(`  MRP→UE: ${e.order_no || e.id}`);
      }
    } catch (err) {
      log(`  MRP UE: ${err.message}`);
    }
  }

  // SA talep → PO (MRP önerilerinden) — API ayrı bağlantı, önce commit
  let poMrp = null;
  let mkMrp = null;
  let alisFaturaMrp = null;
  let onayMrp = null;
  const prId = talep?.id || talep?.talep_id || talep?.requisition_id;
  await client.query('COMMIT');
  await client.query('BEGIN');
  if (prId) {
    try {
      // talep Acik → Onayli (talep-donustur Acik/Onayli kabul eder)
      await client.query(
        `UPDATE purchase_requisitions SET status='Onayli', company_id=COALESCE(company_id,$2), project_code=$3 WHERE id=$1`,
        [prId, firma.id, tag]
      );
      await client.query('COMMIT');
      await client.query('BEGIN');
      const fiyatlar = {
        [base.hmPcb.id]: 180,
        [base.hmCap.id]: 12,
        [base.hmCoil.id]: 45,
        [base.hmCase.id]: 25,
      };
      poMrp = await api('POST', '/satin-alma-siparisleri/talep-donustur', {
        requisition_id: prId,
        partner_id: base.ted2.id,
        birim_fiyatlar: fiyatlar,
      }, firma.id);
      if (poMrp?.id) {
        if (poMrp.status !== 'Onayli') {
          await api('POST', `/satin-alma-siparisleri/${poMrp.id}/onayla`, {}, firma.id);
        }
        await tagBelge(client, 'purchase_orders', poMrp.id, firma.id, tag);
        // Açıklamayı ayrı autocommit bağlantıyla yaz (API kilitleriyle çakışmasın)
        {
          const tc = await pool.connect();
          try {
            await tc.query(
              `UPDATE purchase_orders SET project_code=$2, description=$3, company_id=COALESCE(company_id,$4) WHERE id=$1`,
              [poMrp.id, tag, `[${tag}] MRP’den oluşan SA siparişi`, firma.id]
            );
          } finally { tc.release(); }
        }
        onayMrp = await calistirSaSiparisOnay(client, { firmaId: firma.id, po: poMrp, tag });

        mkMrp = await api('POST', '/mal-kabuller', {
          purchase_order_id: poMrp.id,
          warehouse_id: wh.hmd.id,
          company_id: firma.id,
          description: `[${tag}] MRP mal kabul`,
          gkk_gerekli: true,
          internal_note: tag,
        }, firma.id);

        await onaylaGkk(firma.id, mkMrp.id, wh.hmd.id, tag);

        try {
          alisFaturaMrp = await api('POST', `/mal-kabuller/${mkMrp.id}/fatura-olustur`, {
            description: `[${tag}] Alış faturası`,
          }, firma.id);
          if (alisFaturaMrp?.id) {
            await tagBelge(client, 'invoices', alisFaturaMrp.id, firma.id, tag);
            await api('POST', `/invoices/${alisFaturaMrp.id}/muhasebelestir`, {}, firma.id)
              .catch((e) => log(`  MRP alış muhasebe: ${e.message}`));
            log(`  MRP alış fatura: ${alisFaturaMrp.invoice_no}`);
          }
        } catch (err) {
          log(`  MRP alış fatura: ${err.message}`);
        }

        log(`  MRP PO: ${poMrp.order_no} / MK: ${mkMrp.receipt_no}`);
      }
    } catch (err) {
      log(`  MRP PO zinciri: ${err.message}`);
    }
  }

  // Üretim planı (varsa) → iş emrine
  const plans = (await client.query(
    `SELECT * FROM production_plans WHERE company_id=$1 AND status='Acik' ORDER BY id DESC LIMIT 3`,
    [firma.id]
  )).rows;
  for (const pln of plans) {
    await client.query(
      `UPDATE production_plans SET description = COALESCE(description,'') || $2 WHERE id=$1`,
      [pln.id, ` [${tag}]`]
    ).catch(() => null);
    try {
      const cevir = await api('POST', `/uretim-planlari/${pln.id}/cevir`, {}, firma.id);
      if (cevir?.id) {
        await tagBelge(client, 'production_orders', cevir.id, firma.id, tag, { project: false });
      }
      log(`  plan→UE: ${cevir.order_no || cevir.id || 'ok'}`);
    } catch (err) {
      log(`  plan çevir: ${err.message}`);
    }
  }

  // MRP UE’leri yürüt — operasyonsuz emir varsa tam UE oluştur
  let ueList = Array.isArray(ueMrp)
    ? (ueMrp.emirler || ueMrp)
    : (ueMrp?.emirler || (ueMrp?.id ? [ueMrp] : []));
  if (!Array.isArray(ueList)) ueList = [ueList];
  const ueFromDb = (await client.query(
    `SELECT * FROM production_orders
     WHERE (company_id=$1 OR item_id=$2) AND COALESCE(description,'') ILIKE $3
       AND status NOT IN ('Kapali','Iptal')
     ORDER BY id DESC LIMIT 5`,
    [firma.id, base.fg.id, `%${tag}%`]
  )).rows;
  let ueRun = [...ueList, ...ueFromDb].filter((e, i, a) => e?.id && a.findIndex((x) => Number(x.id) === Number(e.id)) === i);

  // Operasyon yoksa /uretim-emirleri ile tam emir aç (rota ops + bileşen)
  for (const e of [...ueRun]) {
    const opN = (await client.query(
      `SELECT count(*)::int AS c FROM production_order_operations WHERE order_id=$1`,
      [e.id]
    )).rows[0]?.c || 0;
    if (opN > 0) continue;
    log(`  MRP UE ${e.order_no || e.id} operasyonsuz — tam emir oluşturuluyor`);
    try {
      const full = await api('POST', '/uretim-emirleri', {
        item_id: base.fg.id,
        product_bom_id: base.bom.id,
        route_id: base.rota.id,
        plant_id: plant.id,
        company_id: firma.id,
        component_warehouse_id: wh.hmd.id,
        fg_warehouse_id: wh.mam.id,
        wip_warehouse_id: wh.ana.id,
        planlanan_quantity: qty,
        order_type_id: 3,
        sales_order_id: so.id,
        planli_kesin: 'Kesin',
        description: `[${tag}] İş emri — MRP sonrası (tam rota)`,
        order_date: today,
      }, firma.id);
      await tagBelge(client, 'production_orders', full.id, firma.id, tag, { project: false });
      ueRun = [full, ...ueRun.filter((x) => Number(x.id) !== Number(e.id))];
      log(`  MRP tam UE: ${full.order_no}`);
    } catch (err) {
      log(`  MRP tam UE: ${err.message}`);
    }
  }

  if (!ueRun.length) {
    try {
      const full = await api('POST', '/uretim-emirleri', {
        item_id: base.fg.id,
        product_bom_id: base.bom.id,
        route_id: base.rota.id,
        plant_id: plant.id,
        company_id: firma.id,
        component_warehouse_id: wh.hmd.id,
        fg_warehouse_id: wh.mam.id,
        wip_warehouse_id: wh.ana.id,
        planlanan_quantity: qty,
        order_type_id: 3,
        sales_order_id: so.id,
        planli_kesin: 'Kesin',
        description: `[${tag}] İş emri — MRP tetikli satış`,
        order_date: today,
      }, firma.id);
      await tagBelge(client, 'production_orders', full.id, firma.id, tag, { project: false });
      ueRun = [full];
      log(`  MRP yedek UE: ${full.order_no}`);
    } catch (err) {
      log(`  MRP yedek UE: ${err.message}`);
    }
  }

  for (const e of ueRun) {
    try {
      await api('POST', `/uretim-emirleri/${e.id}/onayla`, {}, firma.id).catch(() => null);
      await api('POST', `/uretim-emirleri/${e.id}/baslat`, {}, firma.id).catch(() => null);
      for (let i = 0; i < 6; i++) {
        try {
          await api('POST', `/uretim-emirleri/${e.id}/operasyon-tamamla`, { quantity: qty }, firma.id);
          log(`  MRP op tamam ${e.order_no || e.id} #${i + 1}`);
        } catch (err) {
          if (i === 0) log(`  MRP op: ${err.message}`);
          break;
        }
      }
      await onaylaCkk(firma.id, e.id, tag);
    } catch (err) {
      log(`  MRP UE yürüt: ${err.message}`);
    }
  }

  // Sevk → irsaliye → satış fatura
  const { sevk, irs, satisFatura } = await sevkIrsaliyeFatura(client, {
    firma, plant, wh, so, tag,
  });

  const ueNos = ueRun.map((e) => e.order_no).filter(Boolean);
  summary.mrp = {
    tag,
    sales_order: so.order_no,
    independent_requirement: biNo,
    mrp_run: sonuc.calisma?.run_no || sonuc.calisma?.calisma_no || null,
    mrp_net_positive: sonuc.calisma?.net_pozitif || null,
    purchase_requisition: talep?.requisition_no || talep?.talep_no || null,
    purchase_order: poMrp?.order_no || null,
    sa_approval: onayMrp ? (onayMrp.onay_no || String(onayMrp.id)) : null,
    goods_receipt: mkMrp?.receipt_no || null,
    purchase_invoice: alisFaturaMrp?.invoice_no || null,
    production_from_mrp: ueNos,
    shipment: sevk?.shipment_no || sevk?.id || null,
    delivery_note: irs?.delivery_note_no || irs?.id || null,
    sales_invoice: satisFatura?.invoice_no || null,
  };
}

async function main() {
  log(`GIDA TEST-SUT tam döngü → ${BASE_URL}`);
  // Health
  try {
    const h = await fetch(`${BASE_URL}/health`);
    if (!h.ok) throw new Error('health fail');
  } catch (err) {
    throw new Error(`API ayakta değil (${BASE_URL}). Önce npm start. ${err.message}`);
  }

  const client = await pool.connect();
  let org;
  let base;
  try {
    await client.query('BEGIN');
    org = await ensureOrg(client);
    summary.firma = { id: org.firma.id, code: org.firma.company_code, name: org.firma.company_name };
    await purgeGida(client, org.firma.id);
    await ensureSaSiparisOnayTanimi(client, org.firma.id);
    base = await seedBase(client, org);
    await client.query('COMMIT');
    log('  BASE commit OK');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    client.release();
    throw err;
  }

  try {
    await client.query('BEGIN');
    await seedManuel(client, org, base);
    await client.query('COMMIT');
    log('  MAN commit OK');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    client.release();
    throw err;
  }

  try {
    await client.query('BEGIN');
    await seedMrp(client, org, base);
    await client.query('COMMIT');
    log('  MRP commit OK');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }

  const outPath = path.join(__dirname, '..', 'docs', 'erp-full-cycle-test/evidence/gida-tam-dongu-ozet.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  log(`\nÖzet yazıldı: ${outPath}`);
  log(JSON.stringify(summary, null, 2));
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
