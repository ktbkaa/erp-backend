/**
 * GIDA — Kolay İş Emri Onayı (PRDT03) + Üretim Girişi: 2 döngü
 *
 * Döngü 1: Ayran 1L — Kolay onay → Başlat → Operasyonel üretim girişi (op adım adım)
 * Döngü 2: Sade Yoğurt 1KG — Kolay onay → Başlat → Hızlı üretim girişi
 *
 * Etiket: PRDT03-UG-DONGU / DONGU1-OP / DONGU2-HZ
 * Kullanım: node scripts/demo-prdt03-uretim-giris-dongu.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { createStockMovement } = require('../src/services/stokHareketService');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRMA_KODU = 'GIDA';
const TAG = 'PRDT03-UG-DONGU';
const OUT_JSON = path.join(__dirname, '..', 'docs', 'production', 'prdt03', 'demo_cycle_results.json');

const summary = {
  generated_at: new Date().toISOString(),
  firma: null,
  tag: TAG,
  cycles: [],
  how_to_filter: {
    ui: 'Firma = GIDA. Üretim Emirleri / Kolay İş Emri Onayı / Üretim Girişleri listelerinde açıklamaya PRDT03-UG-DONGU yazın.',
    sql: "WHERE company_id=<GIDA> AND description ILIKE '%PRDT03-UG-DONGU%'",
  },
};

function log(msg) {
  console.log(msg);
}

async function api(method, urlPath, body, firmaId) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': 'owner',
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  // JWT optional — header kimlik yeterli (AUTH_ZORUNLU=Hayir)
  const r = await fetch(BASE_URL + urlPath, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!r.ok) {
    throw new Error(`${method} ${urlPath} → ${r.status}: ${data?.hata || text || r.statusText}`);
  }
  return data;
}

async function seedOpeningStock(client, { firmaId, plantId, hmdId, items }) {
  await createStockMovement(client, {
    hareketTipi: 'STOK_GIRIS',
    isYeriId: plantId,
    depoId: hmdId,
    belgeTipi: 'Acilis',
    description: `[${TAG}] Açılış stok — PRDT03/üretim girişi demo`,
    firmaId,
    satirlar: items.map((it) => ({
      item_id: it.id,
      quantity: it.qty,
      direction: 1,
      uom_code: it.uom,
    })),
  });
}

async function createWo(firmaId, payload) {
  return api('POST', '/uretim-emirleri', {
    company_id: firmaId,
    status: 'OnayBekliyor',
    order_type_id: 3,
    ...payload,
  }, firmaId);
}

async function runCycle({
  name,
  tag,
  mode, // 'operasyonel' | 'hizli'
  firmaId,
  plantId,
  item,
  bomId,
  routeId,
  qty,
  warehouses,
}) {
  const cycle = {
    name,
    tag,
    mode,
    product: { id: item.id, code: item.item_code, name: item.item_name },
    qty,
    steps: [],
  };
  const push = (step, data) => {
    cycle.steps.push({ step, ...data, at: new Date().toISOString() });
    log(`  [${tag}] ${step}`);
  };

  log(`\n=== ${name} (${mode}) — ${item.item_code} x${qty} ===`);

  // 1) İş emri oluştur (OnayBekliyor)
  const wo = await createWo(firmaId, {
    item_id: item.id,
    product_bom_id: bomId,
    route_id: routeId,
    plant_id: plantId,
    component_warehouse_id: warehouses.hmd,
    fg_warehouse_id: warehouses.mam,
    wip_warehouse_id: warehouses.ym,
    planned_quantity: qty,
    uom_code: item.uom_code || 'AD',
    description: `[${TAG}] [${tag}] ${mode} döngü — ${item.item_name}`,
    project_code: tag,
  });
  push('is_emri_olustur', {
    order_id: wo.id,
    order_no: wo.order_no,
    status: wo.status,
    ops: (wo.operasyonlar || []).length,
    mats: (wo.malzemeler || wo.bilesenler || []).length,
  });

  // 2) Kolay onay aday listesinde görünür mü?
  const adaylar = await api('GET', '/uretim-emirleri/onay-adaylari', null, firmaId);
  const aday = (adaylar || []).find((r) => Number(r.id) === Number(wo.id));
  push('kolay_onay_aday_listesi', {
    found: Boolean(aday),
    ready: aday?.ready ?? null,
    blockers: aday?.blockers || [],
    warnings: aday?.warnings || [],
  });
  if (!aday?.ready) {
    throw new Error(`Emir onay adayında hazır değil: ${(aday?.blockers || []).join('; ') || 'aday yok'}`);
  }

  // 3) Kolay İş Emri Onayı
  const onay = await api('POST', `/uretim-emirleri/${wo.id}/onayla`, {}, firmaId);
  push('kolay_is_emri_onayi', {
    order_id: onay.id,
    order_no: onay.order_no,
    status: onay.status,
    is_approved: onay.is_approved,
    approved_at: onay.approved_at,
    approved_by: onay.approved_by_user_code,
  });

  // 4) Başlat
  const baslat = await api('POST', `/uretim-emirleri/${wo.id}/baslat`, {}, firmaId);
  push('baslat', {
    status: baslat.status,
    is_started: baslat.is_started,
  });

  // 5) Üretim girişi
  if (mode === 'operasyonel') {
    const oniz = await api(
      'GET',
      `/uretim-girisleri/onizleme?order_id=${wo.id}`,
      null,
      firmaId
    );
    push('operasyonel_onizleme', {
      operation_id: oniz.operation_id || oniz.aktif_operasyon?.id || null,
      operation_code: oniz.operation_code || oniz.aktif_operasyon?.operation_code || null,
      material_lines: (oniz.malzemeler || oniz.materials || []).length,
    });

    const receipts = [];
    let emir = baslat;
    let guard = 0;
    while (emir.status !== 'Kapali' && guard < 20) {
      guard += 1;
      const ops = [...(emir.operasyonlar || [])].sort((a,b)=>Number(a.line_no)-Number(b.line_no));
      const nextOp = ops.find((o) => o.status === 'Hazir')
        || ops.find((o) => ['Bekliyor','Uretimde'].includes(o.status))
        || emir.aktif_operasyon;
      if (!nextOp?.id && !ops.some((o) => o.status !== 'Tamamlandi')) break;

      const giris = await api('POST', '/uretim-girisleri', {
        order_id: wo.id,
        operation_id: nextOp?.id || null,
        quantity: qty,
        consume_materials: true,
        product_warehouse_id: warehouses.mam,
        material_warehouse_id: warehouses.hmd,
        wip_warehouse_id: warehouses.ym,
        plant_id: plantId,
        company_id: firmaId,
        source_type: 'Operasyonel',
        quick: false,
        description: `[${TAG}] [${tag}] Operasyonel giriş — ${nextOp?.operation_code || '?'}`,
        skip_qc: true,
      }, firmaId);
      receipts.push({
        receipt_id: giris.id || giris.receipt_id,
        receipt_no: giris.receipt_no,
        operation_code: nextOp?.operation_code,
        emir_status: giris.emir?.status || giris.status,
      });
      emir = giris.emir || (await api('GET', `/uretim-emirleri/${wo.id}`, null, firmaId));
      if (emir.status === 'Kapali') break;
      // bir sonraki hazir yoksa dur
      if (!(emir.operasyonlar || []).some((o) => o.status === 'Hazir' || o.status === 'Bekliyor')) {
        if (!(emir.operasyonlar || []).some((o) => o.status !== 'Tamamlandi')) break;
      }
    }
    push('operasyonel_uretim_girisi', {
      receipt_count: receipts.length,
      receipts,
      final_status: emir.status,
    });
  } else {
    // Hızlı: tüm operasyonları sırayla (ekran: Hızlı Üretim Girişi)
    const hizli = await api('POST', `/uretim-emirleri/${wo.id}/uretim-giris`, {
      quantity: qty,
      consume_materials: true,
      product_warehouse_id: warehouses.mam,
      material_warehouse_id: warehouses.hmd,
      description: `[${TAG}] [${tag}] Hızlı üretim girişi`,
      skip_qc: true,
      quick: true,
      single_step: false,
    }, firmaId);
    // uretim-giris without single_step loops all Hazir ops; if only one call with quick, may do one step —
    // ensure remaining ops finished
    let emir = hizli.emir || (await api('GET', `/uretim-emirleri/${wo.id}`, null, firmaId));
    const adimlar = [...(hizli.adimlar || [])];
    let guard = 0;
    while (emir.status !== 'Kapali' && (emir.operasyonlar || []).some((o) => o.status !== 'Tamamlandi') && guard < 20) {
      guard += 1;
      const more = await api('POST', `/uretim-emirleri/${wo.id}/uretim-giris`, {
        quantity: qty,
        consume_materials: true,
        product_warehouse_id: warehouses.mam,
        material_warehouse_id: warehouses.hmd,
        quick: true,
        single_step: true,
        skip_qc: true,
        description: `[${TAG}] [${tag}] Hızlı giriş adım`,
      }, firmaId);
      adimlar.push(...(more.adimlar || [more]));
      emir = more.emir || (await api('GET', `/uretim-emirleri/${wo.id}`, null, firmaId));
    }
    push('hizli_uretim_girisi', {
      step_count: adimlar.length,
      receipt_ids: adimlar.map((a) => a.receipt_id || a.id).filter(Boolean),
      final_status: emir.status,
      produced: emir.produced_quantity,
    });
  }

  // 6) Son durum doğrulama
  const finalWo = await api('GET', `/uretim-emirleri/${wo.id}`, null, firmaId);
  const receipts = await api('GET', `/uretim-girisleri?order_id=${wo.id}`, null, firmaId);
  const receiptList = Array.isArray(receipts) ? receipts : (receipts?.data || receipts?.rows || []);
  push('dogrulama', {
    status: finalWo.status,
    is_approved: finalWo.is_approved,
    is_started: finalWo.is_started,
    produced_quantity: finalWo.produced_quantity,
    receipt_count: receiptList.length,
    receipt_nos: receiptList.map((r) => r.receipt_no || r.id),
  });

  cycle.final = {
    order_id: finalWo.id,
    order_no: finalWo.order_no,
    status: finalWo.status,
    is_approved: finalWo.is_approved,
    produced_quantity: finalWo.produced_quantity,
  };
  return cycle;
}

async function main() {
  log('GIDA PRDT03 + Üretim Girişi — 2 döngü');
  const firma = (await pool.query(
    `SELECT id, company_code, company_name FROM companies WHERE company_code=$1`,
    [FIRMA_KODU]
  )).rows[0];
  if (!firma) throw new Error('GIDA firması bulunamadı');
  summary.firma = firma;

  const plant = (await pool.query(
    `SELECT id, plant_code, plant_name FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`,
    [firma.id]
  )).rows[0];

  const whRows = (await pool.query(
    `SELECT w.id, w.warehouse_code FROM warehouses w
     JOIN plants p ON p.id=w.plant_id WHERE p.company_id=$1`,
    [firma.id]
  )).rows;
  const whBy = Object.fromEntries(whRows.map((w) => [w.warehouse_code, w.id]));
  const warehouses = {
    hmd: whBy['GIDA-HMD'],
    mam: whBy['GIDA-MAM'],
    ym: whBy['GIDA-YM'] || whBy['GIDA-ANA'],
  };
  if (!warehouses.hmd || !warehouses.mam) throw new Error('GIDA depoları eksik');

  const ayran = (await pool.query(
    `SELECT id, item_code, item_name, uom_code FROM items WHERE item_code='OG-M05' AND company_id=$1`,
    [firma.id]
  )).rows[0];
  const yogurt = (await pool.query(
    `SELECT id, item_code, item_name, uom_code FROM items WHERE item_code='OG-M03' AND company_id=$1`,
    [firma.id]
  )).rows[0];
  if (!ayran || !yogurt) throw new Error('OG-M05 / OG-M03 stokları yok');

  const bomAyran = (await pool.query(
    `SELECT id FROM boms WHERE bom_code='OG-BOM-AYR' ORDER BY id DESC LIMIT 1`
  )).rows[0];
  const routeAyran = (await pool.query(
    `SELECT id FROM routings WHERE route_code='OG-R-BOMAYR' ORDER BY id DESC LIMIT 1`
  )).rows[0];
  const bomYog = (await pool.query(
    `SELECT id FROM boms WHERE bom_code='OG-BOM-YOG' ORDER BY id DESC LIMIT 1`
  )).rows[0];
  const routeYog = (await pool.query(
    `SELECT id FROM routings WHERE route_code='OG-R-BOMYOG' ORDER BY id DESC LIMIT 1`
  )).rows[0];

  // Açılış stok (her iki BOM bileşeni)
  await withTransaction(pool, async (client) => {
    await seedOpeningStock(client, {
      firmaId: firma.id,
      plantId: plant.id,
      hmdId: warehouses.hmd,
      items: [
        { id: 331, qty: 200, uom: 'LT' }, // çiğ süt
        { id: 333, qty: 10, uom: 'KG' },  // kültür
        { id: 335, qty: 100, uom: 'AD' }, // şişe
        { id: 336, qty: 100, uom: 'AD' }, // kapak
        { id: 338, qty: 100, uom: 'AD' }, // yoğurt kabı
      ],
    });
  });
  log('Açılış stok yazıldı (GIDA-HMD).');

  const c1 = await runCycle({
    name: 'Döngü 1 — Operasyonel Üretim Girişi',
    tag: 'DONGU1-OP',
    mode: 'operasyonel',
    firmaId: firma.id,
    plantId: plant.id,
    item: ayran,
    bomId: bomAyran.id,
    routeId: routeAyran.id,
    qty: 10,
    warehouses,
  });
  summary.cycles.push(c1);

  const c2 = await runCycle({
    name: 'Döngü 2 — Hızlı Üretim Girişi',
    tag: 'DONGU2-HZ',
    mode: 'hizli',
    firmaId: firma.id,
    plantId: plant.id,
    item: yogurt,
    bomId: bomYog.id,
    routeId: routeYog.id,
    qty: 8,
    warehouses,
  });
  summary.cycles.push(c2);

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), 'utf8');
  log(`\nÖzet JSON: ${OUT_JSON}`);
  log('Tamam.');
  await pool.end();
}

main().catch(async (err) => {
  console.error('HATA:', err.message || err);
  try {
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify({ ...summary, error: String(err.message || err) }, null, 2), 'utf8');
  } catch (_) { /* ignore */ }
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(1);
});
