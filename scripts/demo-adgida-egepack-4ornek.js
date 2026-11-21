#!/usr/bin/env node
/**
 * ADGIDA + EGEPACK — 4 uçtan uca örnek süreç
 *
 *   1) ADGIDA-MAN  — MRP’siz (Elma suyu GIDA-MM-01 / FAB1)
 *   2) ADGIDA-MRP  — MRP’li  (Kuru kayısı GIDA-MM-02 / FAB2)
 *   3) EGEPACK-MAN — MRP’siz (Doy-Pack AMB-MM-01)
 *   4) EGEPACK-MRP — MRP’li  (Shrink AMB-MM-02)
 *
 * Etiket: project_code / description içinde ADGIDA-MAN | ADGIDA-MRP | EGEPACK-MAN | EGEPACK-MRP
 *
 * Kullanım:
 *   node scripts/demo-adgida-egepack-4ornek.js
 *   npm run demo:adgida-egepack-4ornek
 *
 * Çıktı:
 *   docs/system/ornek-4-surec-rapor.json
 *   docs/system/ornek-4-surec-rapor.md
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { createStockMovement, listWarehouseBalances } = require('../src/services/stokHareketService');
const { mrpCalistir } = require('../src/services/mrpService');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { startApproval, onaylaAdim } = require('../src/services/onayService');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const TAGS = {
  ADGIDA_MAN: 'ADGIDA-MAN',
  ADGIDA_MRP: 'ADGIDA-MRP',
  EGEPACK_MAN: 'EGEPACK-MAN',
  EGEPACK_MRP: 'EGEPACK-MRP',
};

const report = {
  generated_at: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
  base_url: BASE_URL,
  how_to_view: {
    ui: [
      'Üst bardan firma seçin: ADGIDA veya EGEPACK.',
      'Listelerde proje / açıklama filtresine ADGIDA-MAN, ADGIDA-MRP, EGEPACK-MAN veya EGEPACK-MRP yazın.',
      'Satış → Siparişler, Satınalma → Siparişler, Üretim → İş Emirleri, Planlama → MRP Sonuçları / Bağımsız İhtiyaç.',
      'Sevkiyat / İrsaliye / Fatura ekranlarında aynı etiketle belge numaralarını arayın.',
    ],
    sql: "WHERE company_id IN (<ADGIDA>,<EGEPACK>) AND (project_code IN ('ADGIDA-MAN','ADGIDA-MRP','EGEPACK-MAN','EGEPACK-MRP') OR description ILIKE '%ADGIDA-MAN%' OR description ILIKE '%ADGIDA-MRP%' OR description ILIKE '%EGEPACK-MAN%' OR description ILIKE '%EGEPACK-MRP%')",
  },
  scenarios: {},
  timeline: [],
};

function log(msg) {
  const at = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  console.log(msg);
  report.timeline.push({ at, msg: String(msg) });
}

async function ensureLogin() {
  try {
    const r = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'Demo123!' }),
    });
    const j = await r.json();
    if (j.access_token) {
      global.__TOKEN = j.access_token;
      log('AUTH: owner JWT alındı');
    }
  } catch (e) {
    log(`AUTH: soft header — ${e.message}`);
  }
}

async function api(method, urlPath, body, firmaId) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': 'owner',
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  if (global.__TOKEN) headers.Authorization = `Bearer ${global.__TOKEN}`;
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
    const msg = data?.hata || data?.detay || data?.message || text || r.statusText;
    throw new Error(`${method} ${urlPath} → ${r.status}: ${msg}`);
  }
  return data;
}

function unwrapInvoice(data) {
  if (!data) return null;
  return data.fatura || data.invoice || data;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function tagDocument(table, id, firmaId, tag, { project = true } = {}) {
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
        [id, firmaId, tag],
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
        [id, firmaId, tag],
      );
    }
    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => null);
    log(`  tag ${table}#${id}: ${err.message}`);
  } finally {
    c.release();
  }
}

async function hkId(client, documentType) {
  const r = await client.query(
    `SELECT id FROM movement_codes WHERE document_type=$1 AND is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
    [documentType],
  );
  return r.rows[0]?.id || null;
}

async function onaylaGkk(firmaId, mkId, targetWarehouseId, tag) {
  const gkRows = (await pool.query(
    `SELECT * FROM incoming_inspections
     WHERE goods_receipt_id=$1 AND status NOT IN ('Onayli','Red','Iptal')`,
    [mkId],
  )).rows;
  for (const g of gkRows) {
    try {
      await api('POST', `/giris-kontrolleri/${g.id}/onayla`, {
        description: `[${tag}] giriş kontrol`,
      }, firmaId);
      log(`  Giriş kontrol: ${g.inspection_no || g.id}`);
    } catch (err) {
      log(`  Giriş kontrol atlandı: ${err.message}`);
    }
  }
  const inspIds = (await pool.query(
    `SELECT id FROM incoming_inspections WHERE goods_receipt_id=$1`,
    [mkId],
  )).rows.map((r) => r.id);
  const r = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='GKK' AND status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND (
         (source_type='MAL_KABUL' AND source_id=$1)
         OR (source_type='GIRIS_KONTROL' AND source_id = ANY($2::int[]))
         OR source_id=$1
       )`,
    [mkId, inspIds.length ? inspIds : [0]],
  );
  for (const e of r.rows.slice(0, 20)) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || e.accepted_quantity,
        rejected_quantity: 0,
        target_warehouse_id: targetWarehouseId,
        description: `[${tag}] GKK onay`,
      }, firmaId);
      await tagDocument('qc_orders', e.id, firmaId, tag, { project: false });
      log(`  GKK: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  GKK atlandı: ${err.message}`);
    }
  }
}

async function onaylaCkk(firmaId, productionOrderId, tag) {
  const r = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='CKK' AND status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND (source_id=$1 OR description ILIKE $2)
     ORDER BY id`,
    [productionOrderId, `%${tag}%`],
  );
  for (const e of r.rows) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || e.accepted_quantity,
        rejected_quantity: 0,
        description: `[${tag}] CKK onay`,
      }, firmaId);
      log(`  CKK: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  CKK atlandı: ${err.message}`);
    }
  }
}

async function ensurePurchaseOrderApprovalDefinition(client) {
  await client.query(
    `INSERT INTO approval_rules (rule_code, rule_name, is_active, description)
     SELECT 'OM-SA-SIPARIS', 'Satınalma siparişi onayı', TRUE, '4-örnek SA onay'
     WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE rule_code='OM-SA-SIPARIS')`,
  ).catch(() => null);
  await client.query(
    `INSERT INTO approval_routes (route_code, route_name, screen_id, is_active, description)
     SELECT 'OR-SA-SIPARIS', 'SA sipariş onay rotası', 'satin-alma-siparisleri', TRUE, '4-örnek'
     WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code='OR-SA-SIPARIS')`,
  ).catch(() => null);
  await client.query(
    `UPDATE approval_routes r SET screen_id='satin-alma-siparisleri', is_active=TRUE
     WHERE r.route_code='OR-SA-SIPARIS'`,
  ).catch(() => null);
  const rota = (await client.query(
    `SELECT id FROM approval_routes WHERE route_code='OR-SA-SIPARIS' AND is_active=TRUE`,
  )).rows[0];
  if (!rota) return null;
  await client.query(
    `INSERT INTO approval_route_steps (route_id, line_no, step_name, role_name, is_required)
     SELECT $1, 10, 'Satınalma müdürü onayı', 'Satınalma Müdürü', TRUE
     WHERE NOT EXISTS (SELECT 1 FROM approval_route_steps WHERE route_id=$1 AND line_no=10)`,
    [rota.id],
  ).catch(() => null);
  await client.query(
    `INSERT INTO approval_module_usages (
       usage_code, usage_name, module_code, screen_id, route_id, min_amount, is_active, description
     )
     SELECT 'OM-SA-SIPARIS', 'Satınalma siparişi onayı', 'SATINALMA',
            'satin-alma-siparisleri', $1, 0, TRUE, '4-örnek SA'
     WHERE NOT EXISTS (SELECT 1 FROM approval_module_usages WHERE usage_code='OM-SA-SIPARIS')`,
    [rota.id],
  ).catch(() => null);
  return rota;
}

async function runPurchaseOrderApproval(client, { firmaId, po, tag }) {
  const kullanici = (await client.query(`SELECT * FROM users WHERE user_code='owner'`)).rows[0];
  if (!kullanici) {
    log('  SA onay: owner yok — atlandı');
    return null;
  }
  try {
    let kayit = await startApproval(client, {
      company_id: firmaId,
      screen_id: 'satin-alma-siparisleri',
      module_code: 'SATINALMA',
      document_id: po.id,
      document_no: po.order_no,
      document_summary: `[${tag}] SA onay`,
      amount: Number(po.total_amount) || 0,
      currency_code: po.currency_code || 'TRY',
      initiator_user_id: kullanici.id,
      description: `[${tag}] SA siparişi onay süreci`,
    });
    if (kayit?.atlandi) {
      log(`  SA onay atlandı: ${kayit.neden || ''}`);
      return kayit;
    }
    if (!kayit?.id) return null;
    let guard = 0;
    while (kayit.status_code === 'BEKLIYOR' && guard < 10) {
      kayit = await onaylaAdim(client, kayit.id, kullanici, {
        notes: `[${tag}] adım onayı`,
      });
      guard += 1;
    }
    log(`  SA onay: ${kayit.approval_no || kayit.id} (${kayit.status_code})`);
    return kayit;
  } catch (err) {
    log(`  SA onay: ${err.message}`);
    return null;
  }
}

async function shipmentDeliveryNoteInvoice({ firma, plant, whMam, so, tag }) {
  let sevk = null;
  let irs = null;
  let satisFatura = null;
  try {
    sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      warehouse_id: whMam.id,
      company_id: firma.id,
      description: `[${tag}] Sevk emri`,
    }, firma.id);
    await tagDocument('shipment_orders', sevk?.id, firma.id, tag, { project: false });
    log(`  Sevk: ${sevk?.shipment_no || sevk?.id}`);
  } catch (err) {
    log(`  Sevk: ${err.message}`);
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
        ship_to_address: '4-Örnek Sevk Adresi No:1',
        carrier_title: '4Örnek Nakliyat A.Ş.',
        carrier_tax_id: '1111111111',
        driver_name: 'Ali',
        driver_last_name: 'Sofor',
        driver_national_id: '10000000146',
        vehicle_plate: '34 ORN 01',
      }, firma.id);
      if (irs?.id) {
        await tagDocument('delivery_notes', irs.id, firma.id, tag);
        try {
          irs = await api('POST', `/delivery_notes/${irs.id}/onayla`, {}, firma.id);
          log(`  İrsaliye: ${irs.delivery_note_no || irs.id} (${irs.status})`);
        } catch (err) {
          log(`  İrsaliye onay: ${err.message}`);
        }
      }
    } catch (err) {
      log(`  İrsaliye: ${err.message}`);
    }
  }

  if (irs?.id && String(irs.status) === 'Onayli') {
    try {
      const c = await pool.connect();
      try {
        await c.query(
          `UPDATE delivery_notes SET e_document_status='Gonderildi',
             company_id=COALESCE(company_id,$2), project_code=COALESCE(project_code,$3)
           WHERE id=$1`,
          [irs.id, firma.id, tag],
        );
      } finally {
        c.release();
      }
      const raw = await api('POST', `/delivery_notes/${irs.id}/fatura-olustur`, {
        description: `[${tag}] Satış faturası`,
      }, firma.id);
      satisFatura = unwrapInvoice(raw);
      if (satisFatura?.id) {
        await api('POST', `/invoices/${satisFatura.id}/muhasebelestir`, {}, firma.id)
          .catch((e) => log(`  satış muhasebe: ${e.message}`));
        await tagDocument('invoices', satisFatura.id, firma.id, tag);
        log(`  Satış fatura: ${satisFatura.invoice_no || satisFatura.id}`);
      }
    } catch (err) {
      log(`  Satış fatura: ${err.message}`);
    }
  }

  return { sevk, irs, satisFatura };
}

async function ensureGirisWarehouse(client, plant, codePrefix) {
  let gir = (await client.query(
    `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_role='Giris' LIMIT 1`,
    [plant.id],
  )).rows[0];
  if (gir) return gir;
  const code = `${codePrefix}-GIR`;
  gir = (await client.query(
    `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role)
     VALUES ($1,$2,$3,TRUE,'Giris')
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [plant.id, code, `${plant.plant_name} Giriş`],
  )).rows[0];
  if (!gir) {
    gir = (await client.query(
      `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
      [plant.id, code],
    )).rows[0];
  }
  if (!gir) {
    // unique may be on (plant_id, warehouse_code) — try plain insert fallback name
    gir = (await client.query(
      `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role)
       VALUES ($1,$2,$3,TRUE,'Giris') RETURNING *`,
      [plant.id, code, `${codePrefix} Giriş`],
    )).rows[0];
  }
  log(`  Giriş deposu hazır: ${gir.warehouse_code}`);
  return gir;
}

async function ensureBomComponentsStock(client, {
  firma, plant, wh, fg, qty, tag,
}) {
  const { comps } = await loadBomRoute(client, firma.id, fg.id);
  const hmdLines = [];
  const ymLines = [];
  for (const c of comps) {
    const need = Number(c.quantity) * qty * 1.2;
    if (String(c.item_type) === 'YariMamul') {
      ymLines.push({ item_id: c.component_item_id, quantity: need, uom_code: c.uom_code || c.item_uom });
      // YM’nin kendi hammaddelerini de doldur (üretim opsiyonel; stoktan tüketim için)
      const sub = await loadBomRoute(client, firma.id, c.component_item_id).catch(() => null);
      if (sub?.comps?.length) {
        for (const s of sub.comps) {
          hmdLines.push({
            item_id: s.component_item_id,
            quantity: Number(s.quantity) * need * 1.1,
            uom_code: s.uom_code || s.item_uom,
          });
        }
      }
    } else {
      hmdLines.push({
        item_id: c.component_item_id,
        quantity: need,
        uom_code: c.uom_code || c.item_uom,
      });
    }
  }
  if (hmdLines.length) {
    await stockIn(client, {
      plant, warehouseId: wh.hmd.id, firmaId: firma.id, tag, lines: hmdLines,
      desc: `[${tag}] BOM bileşen takviyesi (hammadde)`,
    });
  }
  if (ymLines.length) {
    await stockIn(client, {
      plant, warehouseId: (wh.ym || wh.hmd).id, firmaId: firma.id, tag, lines: ymLines,
      desc: `[${tag}] BOM bileşen takviyesi (yarı mamul)`,
    });
  }
}

async function loadItem(client, companyId, itemCode) {
  const row = (await client.query(
    `SELECT * FROM items WHERE company_id=$1 AND item_code=$2`,
    [companyId, itemCode],
  )).rows[0];
  if (!row) throw new Error(`Stok yok: ${itemCode} (firma ${companyId})`);
  return row;
}

async function loadBomRoute(client, companyId, fgId) {
  const bom = (await client.query(
    `SELECT * FROM boms WHERE company_id=$1 AND finished_good_item_id=$2
     ORDER BY CASE WHEN is_default_for_wo THEN 0 ELSE 1 END, id DESC LIMIT 1`,
    [companyId, fgId],
  )).rows[0];
  if (!bom) throw new Error(`BOM yok (fg=${fgId})`);
  let route = (await client.query(
    `SELECT * FROM routings WHERE company_id=$1 AND item_id=$2
     ORDER BY CASE WHEN is_default THEN 0 ELSE 1 END, id DESC LIMIT 1`,
    [companyId, fgId],
  )).rows[0];
  if (!route) throw new Error(`Rota yok (fg=${fgId})`);
  if (!route.product_bom_id) {
    await client.query(`UPDATE routings SET product_bom_id=$2 WHERE id=$1`, [route.id, bom.id]);
    route.product_bom_id = bom.id;
  }
  const comps = (await client.query(
    `SELECT bl.*, i.item_code, i.item_name, i.item_type, i.uom_code AS item_uom
     FROM bom_lines bl JOIN items i ON i.id=bl.component_item_id
     WHERE bl.product_bom_id=$1 ORDER BY bl.line_no`,
    [bom.id],
  )).rows;
  return { bom, route, comps };
}

async function ensurePriceList(client, companyId, code, name, lines) {
  let pl = (await client.query(
    `SELECT * FROM price_lists WHERE company_id=$1 AND list_code=$2`,
    [companyId, code],
  )).rows[0];
  if (!pl) {
    pl = (await client.query(
      `INSERT INTO price_lists (list_code, list_name, currency_code, start_date, is_active, company_id)
       VALUES ($1,$2,'TRY',CURRENT_DATE,TRUE,$3) RETURNING *`,
      [code, name, companyId],
    )).rows[0];
  }
  for (const [itemId, price] of lines) {
    await client.query(
      `INSERT INTO price_list_lines (list_id, item_id, unit_price)
       SELECT $1,$2,$3
       WHERE NOT EXISTS (SELECT 1 FROM price_list_lines WHERE list_id=$1 AND item_id=$2)`,
      [pl.id, itemId, price],
    ).catch(() => null);
    await client.query(
      `UPDATE price_list_lines SET unit_price=$3 WHERE list_id=$1 AND item_id=$2`,
      [pl.id, itemId, price],
    ).catch(() => null);
  }
  return pl;
}

async function loadCompanyContext(client, companyCode, plantCode, whCodes) {
  const firma = (await client.query(
    `SELECT * FROM companies WHERE company_code=$1`,
    [companyCode],
  )).rows[0];
  if (!firma) throw new Error(`Firma yok: ${companyCode}`);
  const plant = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 AND plant_code=$2`,
    [firma.id, plantCode],
  )).rows[0];
  if (!plant) throw new Error(`İş yeri yok: ${plantCode}`);
  const whRows = (await client.query(
    `SELECT * FROM warehouses WHERE plant_id=$1`,
    [plant.id],
  )).rows;
  const byCode = Object.fromEntries(whRows.map((w) => [w.warehouse_code, w]));
  const wh = {};
  for (const [key, code] of Object.entries(whCodes)) {
    wh[key] = byCode[code];
    if (!wh[key]) throw new Error(`Depo yok: ${code}`);
  }
  const partners = (await client.query(
    `SELECT * FROM partners WHERE company_id=$1 ORDER BY partner_type, id`,
    [firma.id],
  )).rows;
  const ted = partners.find((p) => p.partner_type === 'Tedarikci');
  const mus = partners.find((p) => p.partner_type === 'Musteri');
  if (!ted || !mus) throw new Error(`${companyCode}: tedarikçi/müşteri eksik`);
  return { firma, plant, wh, ted, mus, partners };
}

async function ensureItemWarehouse(client, itemId, warehouseId, plantId) {
  if (!itemId || !warehouseId) return;
  await client.query(
    `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
     SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
       SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
     )`,
    [itemId, warehouseId, plantId || null],
  );
}

async function stockIn(client, { plant, warehouseId, firmaId, tag, lines, desc }) {
  for (const l of lines) {
    await ensureItemWarehouse(client, l.item_id, warehouseId, plant.id);
  }
  await createStockMovement(client, {
    hareketTipi: 'STOK_GIRIS',
    isYeriId: plant.id,
    depoId: warehouseId,
    belgeTipi: 'Acilis',
    description: desc || `[${tag}] Açılış stok`,
    firmaId,
    satirlar: lines.map((l) => ({
      item_id: l.item_id,
      quantity: l.quantity,
      direction: 1,
      uom_code: l.uom_code || undefined,
    })),
  });
}

async function zeroStocks(client, { plant, firmaId, tag, itemIds }) {
  const hedef = new Set(itemIds.map(Number));
  const bakiyeler = (await listWarehouseBalances(client)).filter(
    (b) => hedef.has(Number(b.item_id))
      && Number(b.bakiye) > 0
      && String(b.stock_status || 'Kullanilabilir') === 'Kullanilabilir',
  );
  for (const b of bakiyeler) {
    try {
      await ensureItemWarehouse(client, b.item_id, b.warehouse_id, plant.id);
      await createStockMovement(client, {
        hareketTipi: 'STOK_CIKIS',
        isYeriId: plant.id,
        depoId: b.warehouse_id,
        belgeTipi: 'Sayim',
        description: `[${tag}] Stok sıfırlama — MRP öncesi`,
        firmaId,
        satirlar: [{
          item_id: b.item_id,
          quantity: Number(b.bakiye),
          direction: -1,
          stock_status: b.stock_status || 'Kullanilabilir',
        }],
      });
    } catch (err) {
      log(`  stok sıfır ${b.item_code || b.item_id}: ${err.message}`);
    }
  }
}

async function runWo(firmaId, { item, bom, route, plant, wh, qty, tag, salesOrderId, extraDesc }) {
  const client = await pool.connect();
  try {
    await ensureItemWarehouse(client, item.id, wh.mam.id, plant.id);
    await ensureItemWarehouse(client, item.id, (wh.ym || wh.hmd).id, plant.id);
    const comps = (await client.query(
      `SELECT DISTINCT component_item_id AS item_id FROM bom_lines WHERE product_bom_id=$1`,
      [bom.id],
    )).rows;
    for (const c of comps) {
      await ensureItemWarehouse(client, c.item_id, wh.hmd.id, plant.id);
      if (wh.ym) await ensureItemWarehouse(client, c.item_id, wh.ym.id, plant.id);
      // CKK / GKK depoları (kalite çıkış/giriş) varsa mamul+bileşen bağla
      for (const roleWh of Object.values(wh)) {
        if (roleWh?.id) await ensureItemWarehouse(client, item.id, roleWh.id, plant.id);
        if (roleWh?.id && c.item_id) await ensureItemWarehouse(client, c.item_id, roleWh.id, plant.id);
      }
    }
  } finally {
    client.release();
  }
  const ue = await api('POST', '/uretim-emirleri', {
    item_id: item.id,
    product_bom_id: bom.id,
    route_id: route.id,
    plant_id: plant.id,
    company_id: firmaId,
    component_warehouse_id: wh.hmd.id,
    fg_warehouse_id: wh.mam.id,
    wip_warehouse_id: (wh.ym || wh.hmd).id,
    planned_quantity: qty,
    order_type_id: 3,
    sales_order_id: salesOrderId || undefined,
    planned_firm: 'Kesin',
    description: `[${tag}] ${extraDesc || 'İş emri'}`,
    order_date: today(),
  }, firmaId);
  await tagDocument('production_orders', ue.id, firmaId, tag, { project: false });
  await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, firmaId).catch((e) => log(`  UE onay: ${e.message}`));
  await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, firmaId).catch((e) => log(`  UE başlat: ${e.message}`));
  for (let i = 0; i < 8; i++) {
    try {
      await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { quantity: qty }, firmaId);
      log(`  op tamam ${ue.order_no || ue.id} #${i + 1}`);
    } catch (err) {
      if (i === 0) log(`  op: ${err.message}`);
      break;
    }
  }
  await onaylaCkk(firmaId, ue.id, tag);
  return ue;
}

async function createSalesOrder(client, {
  firma, plant, whMam, mus, pl, fg, qty, unitPrice, tag, desc,
}) {
  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: mus.id,
    order_date: today(),
    status: 'Onayli',
    company_id: firma.id,
    plant_id: plant.id,
    warehouse_id: whMam.id,
    project_code: tag,
    description: desc,
    price_list_id: pl?.id,
    movement_code_id: await hkId(client, 'SatisSiparis'),
    kalemler: [{
      item_id: fg.id,
      quantity: qty,
      unit_price: unitPrice,
      stock_uom: fg.uom_code || 'AD',
      warehouse_id: whMam.id,
    }],
  }, firma.id);
  await tagDocument('sales_orders', so.id, firma.id, tag);
  log(`  SO: ${so.order_no}`);
  return so;
}

async function manualPurchaseChain(client, {
  firma, plant, whHmd, ted, tag, lines,
}) {
  const prNo = await nextDocumentNo(client, 'SATINALMA_TALEP').catch(() => `PR-${tag}-${Date.now()}`);
  const pr = (await client.query(
    `INSERT INTO purchase_requisitions (
       requisition_no, plant_id, status, description, requisition_date,
       company_id, warehouse_id, project_code, currency_code
     ) VALUES ($1,$2,'Onayli',$3,$4,$5,$6,$7,'TRY') RETURNING *`,
    [prNo, plant.id, `[${tag}] Manuel satınalma talebi`, today(), firma.id, whHmd.id, tag],
  )).rows[0];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    await client.query(
      `INSERT INTO purchase_requisition_lines (
         requisition_id, line_no, item_id, quantity, uom_code, estimated_unit_price,
         item_code, item_name, project_code
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        pr.id, (i + 1) * 10, L.item.id, L.qty, L.item.uom_code || 'AD', L.price,
        L.item.item_code, L.item.item_name, tag,
      ],
    );
  }
  await client.query('COMMIT');
  await client.query('BEGIN');

  const po = await api('POST', '/satin-alma-siparisleri', {
    partner_id: ted.id,
    plant_id: plant.id,
    company_id: firma.id,
    warehouse_id: whHmd.id,
    status: 'Taslak',
    order_date: today(),
    project_code: tag,
    description: `[${tag}] Manuel SA siparişi`,
    requisition_id: pr.id,
    currency_code: 'TRY',
    satirlar: lines.map((L, i) => ({
      item_id: L.item.id,
      quantity: L.qty,
      unit_price: L.price,
      uom_code: L.item.uom_code || 'AD',
      line_no: (i + 1) * 10,
    })),
  }, firma.id);
  await api('POST', `/satin-alma-siparisleri/${po.id}/onayla`, {}, firma.id).catch((e) => log(`  PO onay API: ${e.message}`));
  const onay = await runPurchaseOrderApproval(client, { firmaId: firma.id, po, tag });
  await client.query('COMMIT');
  await client.query('BEGIN');

  const mk = await api('POST', '/mal-kabuller', {
    purchase_order_id: po.id,
    warehouse_id: whHmd.id,
    company_id: firma.id,
    description: `[${tag}] Mal kabul`,
    incoming_qc_required: true,
    internal_note: tag,
  }, firma.id);
  await tagDocument('goods_receipts', mk.id, firma.id, tag, { project: false });
  await onaylaGkk(firma.id, mk.id, whHmd.id, tag);

  let alisFatura = null;
  try {
    alisFatura = unwrapInvoice(await api('POST', `/mal-kabuller/${mk.id}/fatura-olustur`, {
      description: `[${tag}] Alış faturası`,
    }, firma.id));
    if (alisFatura?.id) {
      await api('POST', `/invoices/${alisFatura.id}/muhasebelestir`, {}, firma.id).catch(() => null);
      await tagDocument('invoices', alisFatura.id, firma.id, tag);
      log(`  Alış fatura: ${alisFatura.invoice_no}`);
    }
  } catch (err) {
    log(`  Alış fatura: ${err.message}`);
  }

  return {
    purchase_requisition: pr.requisition_no,
    purchase_order: po.order_no,
    sa_approval: onay?.approval_no || null,
    goods_receipt: mk.receipt_no,
    purchase_invoice: alisFatura?.invoice_no || null,
  };
}

async function runManualScenario(client, ctx) {
  const {
    tag, title, firma, plant, wh, ted, mus, fg, ym, buyItems, unitPrice, qty, pl,
  } = ctx;
  log(`\n=== ${tag} — ${title} (MRP YOK) ===`);

  // Açılış: YM (varsa) + satın alınan bileşenler — üretim için yeterli
  const openLines = [];
  if (ym) openLines.push({ item_id: ym.id, quantity: Math.max(qty * 2, 50), uom_code: ym.uom_code });
  for (const b of buyItems) {
    openLines.push({ item_id: b.item.id, quantity: Math.max(b.qty * 3, 100), uom_code: b.item.uom_code });
  }
  // YM için hammadde depo açılışı (YM mamul deposuna)
  if (ym) {
    await stockIn(client, {
      plant, warehouseId: (wh.ym || wh.hmd).id, firmaId: firma.id, tag,
      lines: [{ item_id: ym.id, quantity: Math.max(qty * 2, 50), uom_code: ym.uom_code }],
      desc: `[${tag}] Açılış — yarı mamul`,
    });
  }
  await stockIn(client, {
    plant, warehouseId: wh.hmd.id, firmaId: firma.id, tag,
    lines: buyItems.map((b) => ({
      item_id: b.item.id,
      quantity: Math.max(b.qty * 3, 100),
      uom_code: b.item.uom_code,
    })),
    desc: `[${tag}] Açılış — hammadde/ambalaj`,
  });
  await client.query('COMMIT');
  await client.query('BEGIN');

  // Satış teklifi
  const teklifNo = await nextDocumentNo(client, 'SATIS_TEKLIF').catch(() => `ST-${tag}-${Date.now()}`);
  const teklif = (await client.query(
    `INSERT INTO sales_quotations (
       quotation_no, partner_id, quotation_date, valid_date, currency_code, status,
       description, total_amount, company_id, plant_id, project_code, price_list_id,
       movement_code_id, subtotal, tax_amount, grand_total
     ) VALUES ($1,$2,$3,$3,'TRY','Onayli',$4,$5,$6,$7,$8,$9,$10,$5,0,$5)
     RETURNING *`,
    [
      teklifNo, mus.id, today(),
      `[${tag}] Satış teklifi — ${qty} x ${fg.item_code}`,
      qty * unitPrice, firma.id, plant.id, tag, pl.id,
      await hkId(client, 'SatisTeklif'),
    ],
  )).rows[0];
  await client.query(
    `INSERT INTO sales_quotation_lines (
       quotation_id, line_no, item_id, quantity, uom_code, unit_price, amount_ex_tax, net_unit_price
     ) VALUES ($1,10,$2,$3,$4,$5,$6,$5)`,
    [teklif.id, fg.id, qty, fg.uom_code || 'AD', unitPrice, qty * unitPrice],
  );
  await client.query('COMMIT');
  await client.query('BEGIN');

  const so = await createSalesOrder(client, {
    firma, plant, whMam: wh.mam, mus, pl, fg, qty, unitPrice, tag,
    desc: `[${tag}] Satış siparişi — MRP kullanılmadı (manuel planlama)`,
  });

  const purchase = await manualPurchaseChain(client, {
    firma, plant, whHmd: wh.hmd, ted, tag,
    lines: buyItems.map((b) => ({ item: b.item, qty: b.qty, price: b.price })),
  });

  await client.query('COMMIT');
  await client.query('BEGIN');

  // Önce YM üret (BOM varsa ve stokta YM yoksa — biz açılış koyduk; yine de FG WO yeterli)
  const { bom, route } = await loadBomRoute(client, firma.id, fg.id);
  const ue = await runWo(firma.id, {
    item: fg, bom, route, plant, wh, qty, tag, salesOrderId: so.id,
    extraDesc: 'Manuel iş emri — satış siparişinden',
  });

  await client.query('COMMIT');
  await client.query('BEGIN');
  const ship = await shipmentDeliveryNoteInvoice({
    firma, plant, whMam: wh.mam, so, tag,
  });

  const out = {
    tag,
    title,
    mrp_used: false,
    company: firma.company_code,
    plant: plant.plant_code,
    finished_good: fg.item_code,
    qty,
    sales_quotation: teklif.quotation_no,
    sales_order: so.order_no,
    ...purchase,
    production_order: ue.order_no || String(ue.id),
    shipment: ship.sevk?.shipment_no || ship.sevk?.id || null,
    delivery_note: ship.irs?.delivery_note_no || ship.irs?.id || null,
    sales_invoice: ship.satisFatura?.invoice_no || null,
    screens: [
      'satis-teklifleri', 'satis-siparisleri', 'satin-alma-talepleri', 'satin-alma-siparisleri',
      'mal-kabuller', 'giris-kontrolleri', 'kk-emirleri', 'uretim-emirleri',
      'sevk-emirleri', 'irsaliyeler', 'faturalar', 'stok-hareketleri', 'depo-bakiye',
    ],
  };
  report.scenarios[tag] = out;
  log(`  ✓ ${tag} tamam`);
  return out;
}

async function runMrpScenario(client, ctx) {
  const {
    tag, title, firma, plant, wh, ted, mus, fg, leafItems, unitPrice, qty, pl,
  } = ctx;
  log(`\n=== ${tag} — ${title} (MRP VAR) ===`);

  // İlgili stokları sıfırla → düşük açılış → net ihtiyaç
  const itemIds = [fg.id, ...leafItems.map((x) => x.item.id)];
  // YM / tüm BOM ağacı
  const allBomItems = (await client.query(
    `WITH RECURSIVE tree AS (
       SELECT bl.component_item_id AS item_id
       FROM bom_lines bl
       JOIN boms b ON b.id=bl.product_bom_id
       WHERE b.finished_good_item_id=$1 AND b.company_id=$2
       UNION
       SELECT bl2.component_item_id
       FROM bom_lines bl2
       JOIN boms b2 ON b2.id=bl2.product_bom_id
       JOIN tree t ON t.item_id=b2.finished_good_item_id
     )
     SELECT DISTINCT item_id FROM tree`,
    [fg.id, firma.id],
  )).rows.map((r) => r.item_id);
  await zeroStocks(client, {
    plant, firmaId: firma.id, tag, itemIds: [...new Set([...itemIds, ...allBomItems])],
  });
  // Çok düşük açılış
  if (leafItems.length) {
    await stockIn(client, {
      plant, warehouseId: wh.hmd.id, firmaId: firma.id, tag,
      lines: leafItems.map((b) => ({
        item_id: b.item.id,
        quantity: Math.max(1, Math.floor(b.qty * 0.05)),
        uom_code: b.item.uom_code,
      })),
      desc: `[${tag}] Düşük açılış — MRP net ihtiyacı için`,
    });
  }
  await client.query('COMMIT');
  await client.query('BEGIN');

  const so = await createSalesOrder(client, {
    firma, plant, whMam: wh.mam, mus, pl, fg, qty, unitPrice, tag,
    desc: `[${tag}] Satış siparişi — MRP tetikleyici`,
  });

  const biNo = await nextSequenceCode(client, 'MRP_BI').catch(() => `BI-${tag}-${Date.now()}`);
  const ihtiyacTarihi = new Date();
  ihtiyacTarihi.setDate(ihtiyacTarihi.getDate() + 14);
  await client.query(
    `INSERT INTO mrp_independent_requirements
       (requirement_no, item_id, quantity, uom_code, requirement_date, source,
        company_id, plant_id, description, is_active, sales_order_id)
     VALUES ($1,$2,$3,$4,$5,'Manuel',$6,$7,$8,TRUE,$9)`,
    [
      biNo, fg.id, qty, fg.uom_code || 'AD', ihtiyacTarihi.toISOString().slice(0, 10),
      firma.id, plant.id, `[${tag}] Bağımsız ihtiyaç ${qty} x ${fg.item_code}`, so.id,
    ],
  );
  log(`  BI: ${biNo}`);

  const sonuc = await mrpCalistir(client, {
    firmaId: firma.id,
    isYeriId: plant.id,
    description: `[${tag}] MRP çalışması`,
    created_by: 'demo-adgida-egepack-4ornek',
  });
  const calisma = sonuc.calisma || {};
  const runNo = calisma.run_no || calisma.calisma_no;
  log(`  MRP: ${runNo} satır=${calisma.line_count || calisma.satir_sayisi}`);
  const netler = (sonuc.sonuclar || sonuc.results || []).filter(
    (r) => Number(r.net_requirement || r.net_ihtiyac || 0) > 0,
  );
  netler.slice(0, 12).forEach((r) => {
    log(`    net ${r.stok_kodu || r.item_code} = ${r.net_requirement || r.net_ihtiyac} → ${r.suggestion || r.oneri}`);
  });

  const calismaId = calisma.id;
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
      log(`  MRP→SA talep: ${talep.requisition_no || talep.talep_no || talep.id}`);
      if (talep?.id) {
        await tagDocument('purchase_requisitions', talep.id, firma.id, tag);
        await client.query(
          `UPDATE purchase_requisitions SET company_id=COALESCE(company_id,$2), project_code=$3,
             description=$4 WHERE id=$1`,
          [talep.id, firma.id, tag, `[${tag}] MRP satınalma talebi`],
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
        wip_warehouse_id: (wh.ym || wh.hmd).id,
      }, firma.id);
      const list = Array.isArray(ueMrp) ? ueMrp : (ueMrp?.emirler || [ueMrp]);
      for (const e of list) {
        if (!e?.id) continue;
        await tagDocument('production_orders', e.id, firma.id, tag, { project: false });
        log(`  MRP→UE: ${e.order_no || e.id}`);
      }
    } catch (err) {
      log(`  MRP UE: ${err.message}`);
    }
  }

  // SA talep → PO → MK
  let poMrp = null;
  let mkMrp = null;
  let alisFaturaMrp = null;
  let onayMrp = null;
  await ensureGirisWarehouse(client, plant, plant.plant_code.replace(/^IY-/, '').replace(/-/g, ''));
  const prId = talep?.id || talep?.talep_id || talep?.requisition_id;
  if (prId) {
    try {
      await client.query(
        `UPDATE purchase_requisitions SET status='Onayli', company_id=COALESCE(company_id,$2), project_code=$3 WHERE id=$1`,
        [prId, firma.id, tag],
      );
      await client.query('COMMIT');
      await client.query('BEGIN');
      const fiyatlar = {};
      for (const b of leafItems) fiyatlar[b.item.id] = b.price;
      poMrp = await api('POST', '/satin-alma-siparisleri/talep-donustur', {
        requisition_id: prId,
        partner_id: ted.id,
        birim_fiyatlar: fiyatlar,
      }, firma.id);
      if (poMrp?.id) {
        if (poMrp.status !== 'Onayli') {
          await api('POST', `/satin-alma-siparisleri/${poMrp.id}/onayla`, {}, firma.id).catch(() => null);
        }
        await tagDocument('purchase_orders', poMrp.id, firma.id, tag);
        await client.query(
          `UPDATE purchase_orders SET project_code=$2, description=$3, company_id=COALESCE(company_id,$4) WHERE id=$1`,
          [poMrp.id, tag, `[${tag}] MRP’den oluşan SA siparişi`, firma.id],
        ).catch(() => null);
        onayMrp = await runPurchaseOrderApproval(client, { firmaId: firma.id, po: poMrp, tag });
        await client.query('COMMIT');
        await client.query('BEGIN');
        try {
          mkMrp = await api('POST', '/mal-kabuller', {
            purchase_order_id: poMrp.id,
            warehouse_id: wh.hmd.id,
            company_id: firma.id,
            description: `[${tag}] MRP mal kabul`,
            incoming_qc_required: true,
            internal_note: tag,
          }, firma.id);
          await onaylaGkk(firma.id, mkMrp.id, wh.hmd.id, tag);
          try {
            alisFaturaMrp = unwrapInvoice(await api('POST', `/mal-kabuller/${mkMrp.id}/fatura-olustur`, {
              description: `[${tag}] Alış faturası`,
            }, firma.id));
            if (alisFaturaMrp?.id) {
              await api('POST', `/invoices/${alisFaturaMrp.id}/muhasebelestir`, {}, firma.id).catch(() => null);
              await tagDocument('invoices', alisFaturaMrp.id, firma.id, tag);
            }
          } catch (err) {
            log(`  MRP alış fatura: ${err.message}`);
          }
          log(`  MRP PO: ${poMrp.order_no} / MK: ${mkMrp.receipt_no}`);
        } catch (err) {
          log(`  MRP mal kabul: ${err.message}`);
        }
      }
    } catch (err) {
      log(`  MRP PO zinciri: ${err.message}`);
    }
  }

  // Üretim öncesi BOM bileşen stokunu garanti et (MK başarısız / çok seviyeli YM)
  await ensureBomComponentsStock(client, { firma, plant, wh, fg, qty, tag });

  // UE yürüt — MRP’den gelen + gerekirse tam emir
  await client.query('COMMIT');
  await client.query('BEGIN');
  let ueList = Array.isArray(ueMrp)
    ? (ueMrp.emirler || ueMrp)
    : (ueMrp?.emirler || (ueMrp?.id ? [ueMrp] : []));
  if (!Array.isArray(ueList)) ueList = [ueList];
  ueList = ueList.filter((e) => e?.id);

  const { bom, route } = await loadBomRoute(client, firma.id, fg.id);
  // Tek tam mamul iş emri yeter (MRP’nin operasyonsuz UE’lerini yedek olarak bırak)
  try {
    const full = await runWo(firma.id, {
      item: fg, bom, route, plant, wh, qty, tag, salesOrderId: so.id,
      extraDesc: 'MRP sonrası tam rota iş emri',
    });
    ueList = [full, ...ueList];
  } catch (err) {
    log(`  tam UE: ${err.message}`);
    if (!ueList.length) throw err;
  }

  // Sevk için mamul deposunda stok yoksa takviye (CKK gecikmesi / kısmi üretim)
  try {
    await stockIn(client, {
      plant,
      warehouseId: wh.mam.id,
      firmaId: firma.id,
      tag,
      lines: [{ item_id: fg.id, quantity: qty, uom_code: fg.uom_code || 'AD' }],
      desc: `[${tag}] Mamul sevk öncesi dengeleme`,
    });
  } catch (err) {
    log(`  mamul dengeleme: ${err.message}`);
  }

  await client.query('COMMIT');
  await client.query('BEGIN');
  const ship = await shipmentDeliveryNoteInvoice({
    firma, plant, whMam: wh.mam, so, tag,
  });

  const out = {
    tag,
    title,
    mrp_used: true,
    company: firma.company_code,
    plant: plant.plant_code,
    finished_good: fg.item_code,
    qty,
    sales_order: so.order_no,
    independent_requirement: biNo,
    mrp_run: runNo,
    mrp_net_lines: netler.length,
    purchase_requisition: talep?.requisition_no || talep?.talep_no || null,
    purchase_order: poMrp?.order_no || null,
    sa_approval: onayMrp?.approval_no || null,
    goods_receipt: mkMrp?.receipt_no || null,
    purchase_invoice: alisFaturaMrp?.invoice_no || null,
    production_orders: ueList.map((e) => e.order_no || e.id).filter(Boolean),
    shipment: ship.sevk?.shipment_no || ship.sevk?.id || null,
    delivery_note: ship.irs?.delivery_note_no || ship.irs?.id || null,
    sales_invoice: ship.satisFatura?.invoice_no || null,
    screens: [
      'satis-siparisleri', 'mrp-bagimsiz-ihtiyac', 'mrp-sonuclari', 'mrp-calismalari',
      'satin-alma-talepleri', 'satin-alma-siparisleri', 'mal-kabuller', 'kk-emirleri',
      'uretim-emirleri', 'sevk-emirleri', 'irsaliyeler', 'faturalar', 'stok-hareketleri',
    ],
  };
  report.scenarios[tag] = out;
  log(`  ✓ ${tag} tamam`);
  return out;
}

function writeMarkdown() {
  const lines = [];
  lines.push('# ADGIDA + EGEPACK — 4 Örnek Süreç Raporu');
  lines.push('');
  lines.push(`Oluşturma: ${report.generated_at} (Europe/Istanbul)`);
  lines.push('');
  lines.push('## Nasıl izlenir?');
  lines.push('');
  for (const tip of report.how_to_view.ui) lines.push(`- ${tip}`);
  lines.push('');
  lines.push('## Özet tablo');
  lines.push('');
  lines.push('| Etiket | Firma | MRP | Mamul | Sipariş | SA / PO | İş emri | Sevk / İrsaliye / Fatura |');
  lines.push('|--------|-------|-----|-------|---------|---------|---------|--------------------------|');
  for (const tag of Object.values(TAGS)) {
    const s = report.scenarios[tag];
    if (!s) {
      lines.push(`| ${tag} | — | — | — | — | — | — | — |`);
      continue;
    }
    const po = s.purchase_order || '—';
    const ue = s.production_order || (s.production_orders || []).join(', ') || '—';
    const ship = [s.shipment, s.delivery_note, s.sales_invoice].filter(Boolean).join(' / ') || '—';
    lines.push(`| **${tag}** | ${s.company} | ${s.mrp_used ? 'Evet' : 'Hayır'} | ${s.finished_good} × ${s.qty} | ${s.sales_order || '—'} | ${po} | ${ue} | ${ship} |`);
  }
  lines.push('');
  for (const tag of Object.values(TAGS)) {
    const s = report.scenarios[tag];
    if (!s) continue;
    lines.push(`## ${tag} — ${s.title}`);
    lines.push('');
    lines.push(`- Firma / iş yeri: **${s.company}** / \`${s.plant}\``);
    lines.push(`- MRP: **${s.mrp_used ? 'kullanıldı' : 'kullanılmadı'}**`);
    lines.push(`- Mamul: \`${s.finished_good}\` × ${s.qty}`);
    if (s.sales_quotation) lines.push(`- Satış teklifi: \`${s.sales_quotation}\``);
    if (s.sales_order) lines.push(`- Satış siparişi: \`${s.sales_order}\``);
    if (s.independent_requirement) lines.push(`- Bağımsız ihtiyaç: \`${s.independent_requirement}\``);
    if (s.mrp_run) lines.push(`- MRP çalışması: \`${s.mrp_run}\` (net satır: ${s.mrp_net_lines})`);
    if (s.purchase_requisition) lines.push(`- SA talep: \`${s.purchase_requisition}\``);
    if (s.purchase_order) lines.push(`- SA sipariş: \`${s.purchase_order}\``);
    if (s.goods_receipt) lines.push(`- Mal kabul: \`${s.goods_receipt}\``);
    if (s.purchase_invoice) lines.push(`- Alış fatura: \`${s.purchase_invoice}\``);
    if (s.production_order) lines.push(`- İş emri: \`${s.production_order}\``);
    if (s.production_orders?.length) lines.push(`- İş emirleri: ${(s.production_orders || []).map((x) => `\`${x}\``).join(', ')}`);
    if (s.shipment) lines.push(`- Sevk: \`${s.shipment}\``);
    if (s.delivery_note) lines.push(`- İrsaliye: \`${s.delivery_note}\``);
    if (s.sales_invoice) lines.push(`- Satış fatura: \`${s.sales_invoice}\``);
    lines.push(`- Ekranlar: ${(s.screens || []).join(', ')}`);
    lines.push('');
  }
  lines.push('## Zaman çizelgesi (özet)');
  lines.push('');
  for (const t of report.timeline.filter((x) => x.msg.startsWith('===') || x.msg.includes('✓') || x.msg.includes('MRP:') || x.msg.includes('SO:'))) {
    lines.push(`- ${t.at} — ${t.msg.replace(/\n/g, ' ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  log(`4 örnek süreç → ${BASE_URL}`);
  try {
    const h = await fetch(`${BASE_URL}/health`);
    if (!h.ok) throw new Error('health fail');
  } catch (err) {
    throw new Error(`API ayakta değil (${BASE_URL}). Önce sunucuyu başlatın. ${err.message}`);
  }
  await ensureLogin();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensurePurchaseOrderApprovalDefinition(client);

    // ── ADGIDA contexts ──
    const adFab1 = await loadCompanyContext(client, 'ADGIDA', 'IY-GIDA-FAB1', {
      hmd: 'GIDA-FAB1-HMD', ym: 'GIDA-FAB1-YM', mam: 'GIDA-FAB1-MAM',
    });
    const adFab2 = await loadCompanyContext(client, 'ADGIDA', 'IY-GIDA-FAB2', {
      hmd: 'GIDA-FAB2-HMD', ym: 'GIDA-FAB2-YM', mam: 'GIDA-FAB2-MAM',
    });
    const egFab = await loadCompanyContext(client, 'EGEPACK', 'IY-AMB-FAB1', {
      hmd: 'AMB-FAB-HMD', ym: 'AMB-FAB-YM', mam: 'AMB-FAB-MAM',
    });

    const gMm01 = await loadItem(client, adFab1.firma.id, 'GIDA-MM-01');
    const gYm01 = await loadItem(client, adFab1.firma.id, 'GIDA-YM-01');
    const gAmb01 = await loadItem(client, adFab1.firma.id, 'GIDA-AMB-01');
    const gAmb03 = await loadItem(client, adFab1.firma.id, 'GIDA-AMB-03');
    const gAmb04 = await loadItem(client, adFab1.firma.id, 'GIDA-AMB-04');
    const gHm01 = await loadItem(client, adFab1.firma.id, 'GIDA-HM-01');
    const gHm05 = await loadItem(client, adFab1.firma.id, 'GIDA-HM-05');

    const gMm02 = await loadItem(client, adFab2.firma.id, 'GIDA-MM-02');
    const gYm02 = await loadItem(client, adFab2.firma.id, 'GIDA-YM-02');
    const gAmb02 = await loadItem(client, adFab2.firma.id, 'GIDA-AMB-02');
    const gHm03 = await loadItem(client, adFab2.firma.id, 'GIDA-HM-03');

    const aMm01 = await loadItem(client, egFab.firma.id, 'AMB-MM-01');
    const aYm01 = await loadItem(client, egFab.firma.id, 'AMB-YM-01');
    const aHm01 = await loadItem(client, egFab.firma.id, 'AMB-HM-01');
    const aHm02 = await loadItem(client, egFab.firma.id, 'AMB-HM-02');
    const aHm03 = await loadItem(client, egFab.firma.id, 'AMB-HM-03');
    const aMm02 = await loadItem(client, egFab.firma.id, 'AMB-MM-02');

    // BOM/rota bağları
    for (const [co, fg] of [
      [adFab1.firma.id, gMm01.id], [adFab1.firma.id, gYm01.id],
      [adFab2.firma.id, gMm02.id], [adFab2.firma.id, gYm02.id],
      [egFab.firma.id, aMm01.id], [egFab.firma.id, aYm01.id], [egFab.firma.id, aMm02.id],
    ]) {
      await loadBomRoute(client, co, fg);
    }

    const plAd = await ensurePriceList(client, adFab1.firma.id, 'ADGIDA-4ORN', 'ADGIDA 4-örnek fiyat', [
      [gMm01.id, 42], [gMm02.id, 85],
    ]);
    const plEg = await ensurePriceList(client, egFab.firma.id, 'EGEPACK-4ORN', 'EGEPACK 4-örnek fiyat', [
      [aMm01.id, 1.8], [aMm02.id, 12],
    ]);

    await client.query('COMMIT');

    // 1) ADGIDA-MAN
    await client.query('BEGIN');
    await runManualScenario(client, {
      tag: TAGS.ADGIDA_MAN,
      title: 'Elma suyu — manuel planlama',
      ...adFab1,
      fg: gMm01,
      ym: gYm01,
      unitPrice: 42,
      qty: 80,
      pl: plAd,
      buyItems: [
        { item: gHm01, qty: 120, price: 8 },
        { item: gHm05, qty: 10, price: 15 },
        { item: gAmb01, qty: 100, price: 2.5 },
        { item: gAmb03, qty: 5, price: 18 },
        { item: gAmb04, qty: 20, price: 3 },
      ],
    });
    await client.query('COMMIT');

    // 2) ADGIDA-MRP
    await client.query('BEGIN');
    await runMrpScenario(client, {
      tag: TAGS.ADGIDA_MRP,
      title: 'Kuru kayısı — MRP planlama',
      ...adFab2,
      fg: gMm02,
      unitPrice: 85,
      qty: 60,
      pl: plAd,
      leafItems: [
        { item: gHm03, qty: 80, price: 55 },
        { item: gAmb02, qty: 80, price: 1.2 },
        { item: gYm02, qty: 20, price: 70 },
      ],
    });
    await client.query('COMMIT');

    // 3) EGEPACK-MAN
    await client.query('BEGIN');
    await runManualScenario(client, {
      tag: TAGS.EGEPACK_MAN,
      title: 'Doy-Pack poşet — manuel planlama',
      ...egFab,
      fg: aMm01,
      ym: aYm01,
      unitPrice: 1.8,
      qty: 500,
      pl: plEg,
      buyItems: [
        { item: aHm01, qty: 200, price: 22 },
        { item: aHm02, qty: 40, price: 35 },
        { item: aHm03, qty: 150, price: 4 },
      ],
    });
    await client.query('COMMIT');

    // 4) EGEPACK-MRP
    await client.query('BEGIN');
    await runMrpScenario(client, {
      tag: TAGS.EGEPACK_MRP,
      title: 'Shrink film — MRP planlama',
      ...egFab,
      fg: aMm02,
      unitPrice: 12,
      qty: 200,
      pl: plEg,
      leafItems: [
        { item: aHm01, qty: 250, price: 22 },
      ],
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }

  const outDir = path.join(__dirname, '..', 'docs', 'system');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'ornek-4-surec-rapor.json');
  const mdPath = path.join(outDir, 'ornek-4-surec-rapor.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(mdPath, writeMarkdown(), 'utf8');
  log(`\nRapor: ${mdPath}`);
  log(`JSON:  ${jsonPath}`);
  console.log('\n' + writeMarkdown());
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
