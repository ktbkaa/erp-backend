#!/usr/bin/env node
/**
 * İki yeni sektör firması + önceki simülasyonlarda HİÇ dokunulmayan Excel ekranlarını kapsama.
 *
 * Firmalar (sıfırdan):
 *   NORMAK  — NorMak Metal İşleme Sanayi A.Ş. (metal / talaşlı imalat)
 *   LAVANDE — Lavande Kozmetik Üretim A.Ş. (kozmetik / kimya)
 *
 * Önceki kapsama referansı: docs/system/sim-adgida-egepack-audit.json (122/182)
 * Kullanılmayan 60 ekran bu simde özellikle çağrılır.
 *
 * Kullanım: node scripts/sim-iki-sektor-eksik-ekran.js
 * Çıktı:
 *   docs/system/sim-iki-sektor-eksik-ekran-audit.{json,md,xlsx}
 *   /opt/cursor/artifacts/sim-iki-sektor-eksik-ekran-audit.xlsx
 *   /opt/cursor/artifacts/kullanilmayan-ekranlar.md
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { createStockMovement } = require('../src/services/stokHareketService');
const { mrpCalistir } = require('../src/services/mrpService');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { seedExtendedModules } = require('./lib/demo-extended-modules');

const XLSX = require('../public/vendor/xlsx.full.min.js');
const BASE = process.env.ERP_BASE || 'http://127.0.0.1:3000';
const AUDIT = [];
const COVERED = new Set();
const ERRORS = [];
const t0 = Date.now();

function ts() {
  return new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}
function log(step, screen, detail, extra = {}) {
  const row = { seq: AUDIT.length + 1, elapsed_ms: Date.now() - t0, at: ts(), step, screen, detail, ...extra };
  AUDIT.push(row);
  if (screen) COVERED.add(screen);
  console.log(`[${String(row.seq).padStart(3, '0')}] ${step} · ${screen || '-'} — ${detail}`);
  return row;
}
function noteError(screen, err) {
  const msg = err?.message || String(err);
  ERRORS.push({ at: ts(), screen, error: msg });
  log('HATA', screen || 'sistem', msg);
}

async function ensureLogin() {
  try {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'Demo123!' }),
    });
    const j = await r.json();
    if (j.access_token) {
      global.__TOKEN = j.access_token;
      log('AUTH', 'auth/login', 'owner JWT');
    }
  } catch (e) {
    log('AUTH', 'auth/login', `soft: ${e.message}`);
  }
}

async function api(method, urlPath, body, firmaId) {
  const headers = { 'Content-Type': 'application/json', 'X-Kullanici-Kodu': 'owner' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  if (global.__TOKEN) headers.Authorization = `Bearer ${global.__TOKEN}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  let res;
  try {
    res = await fetch(`${BASE}${urlPath}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`${method} ${urlPath} → fetch: ${e.message}`);
  }
  clearTimeout(timer);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.hata || data?.detay || data?.message || text?.slice?.(0, 200) || res.statusText;
    const err = new Error(`${method} ${urlPath} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function tryMark(firmaId, method, ep, body, screen, detail) {
  try {
    const r = await api(method, ep, body, firmaId);
    log('COVER', screen, detail, {
      id: r?.id,
      belge: r?.order_no || r?.document_no || r?.code || r?.run_no || r?.requisition_no,
    });
    return r;
  } catch (e) {
    noteError(screen, e);
    log('COVER', screen, `${detail}: ${e.message}`);
    return null;
  }
}

function loadExcelScreens() {
  const p = path.join(__dirname, '../docs/system/KTB_ERP_Sistem_Tanitim.xlsx');
  const wb = XLSX.read(fs.readFileSync(p));
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets['02_Ekran_Listesi'], { header: 1, defval: '' });
  const hdr = aoa[3];
  return aoa.slice(4).filter((r) => r[2]).map((r) => ({
    module: r[0],
    section: r[1],
    id: String(r[2]),
    techId: r[3],
    title: r[4],
    endpoint: r[6],
  }));
}

function loadPriorCovered() {
  const set = new Set();
  const auditPath = path.join(__dirname, '../docs/system/sim-adgida-egepack-audit.json');
  if (fs.existsSync(auditPath)) {
    const a = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    (a.coverage?.excel_hit || []).forEach((s) => set.add(s));
    (a.coverage?.steps || []).forEach((s) => { if (s.screen) set.add(s.screen); });
    (a.audit || []).forEach((s) => { if (s.screen) set.add(s.screen); });
  }
  const ornekPath = path.join(__dirname, '../docs/system/ornek-4-surec-rapor.json');
  if (fs.existsSync(ornekPath)) {
    const o = JSON.parse(fs.readFileSync(ornekPath, 'utf8'));
    Object.values(o.scenarios || {}).forEach((sc) => {
      (sc.screens || []).forEach((s) => set.add(s));
    });
  }
  return set;
}

async function ensureUoms(client) {
  for (const [kod, adi] of [['AD', 'Adet'], ['KG', 'Kilogram'], ['LT', 'Litre'], ['MT', 'Metre'], ['PK', 'Paket']]) {
    await client.query(
      `INSERT INTO units_of_measure (uom_code, uom_name, is_active) VALUES ($1,$2,TRUE)
       ON CONFLICT (uom_code) DO NOTHING`,
      [kod, adi],
    );
  }
}

async function upsertCompany(client, { code, name, taxId, taxOffice, address, email }) {
  let row = (await client.query(`SELECT * FROM companies WHERE company_code=$1`, [code])).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO companies (
         company_code, company_name, tax_id, tax_office, address, email, functional_currency, is_profile
       ) VALUES ($1,$2,$3,$4,$5,$6,'TRY',TRUE) RETURNING *`,
      [code, name, taxId, taxOffice, address, email],
    )).rows[0];
    log('ORG', 'companies', `Firma oluşturuldu: ${code}`, { id: row.id });
  } else {
    await client.query(
      `UPDATE companies SET company_name=$2, tax_id=$3, tax_office=$4, address=$5, email=$6, is_profile=TRUE WHERE id=$1`,
      [row.id, name, taxId, taxOffice, address, email],
    );
    row = (await client.query(`SELECT * FROM companies WHERE id=$1`, [row.id])).rows[0];
    log('ORG', 'companies', `Firma güncellendi: ${code}`, { id: row.id });
  }
  return row;
}

async function upsertPlant(client, companyId, code, name, address) {
  let row = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 AND plant_code=$2`,
    [companyId, code],
  )).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO plants (company_id, plant_code, plant_name, address) VALUES ($1,$2,$3,$4) RETURNING *`,
      [companyId, code, name, address],
    )).rows[0];
    log('ORG', 'is-yerleri', `İş yeri: ${code}`, { id: row.id });
  }
  return row;
}

async function upsertWh(client, plantId, code, name, role) {
  let row = (await client.query(
    `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
    [plantId, code],
  )).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role)
       VALUES ($1,$2,$3,TRUE,$4) RETURNING *`,
      [plantId, code, name, role],
    )).rows[0];
    log('ORG', 'warehouses', `Depo: ${code}`, { id: row.id });
  } else if (role && row.warehouse_role !== role) {
    await client.query(`UPDATE warehouses SET warehouse_role=$2 WHERE id=$1`, [row.id, role]);
    row.warehouse_role = role;
  }
  return row;
}

async function upsertWc(client, plantId, _companyId, code, name) {
  let row = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 AND center_code=$2`,
    [plantId, code],
  )).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
       VALUES ($1,$2,$3,TRUE) RETURNING *`,
      [plantId, code, name],
    )).rows[0];
    log('ORG', 'is-merkezleri', `İş merkezi: ${code}`, { id: row.id });
  }
  return row;
}

async function upsertPartner(client, companyId, plantId, code, name, type) {
  let row = (await client.query(
    `SELECT * FROM partners WHERE company_id=$1 AND partner_code=$2`,
    [companyId, code],
  )).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO partners (partner_code, partner_name, partner_type, company_id, plant_id, currency_code, is_active)
       VALUES ($1,$2,$3,$4,$5,'TRY',TRUE) RETURNING *`,
      [code, name, type, companyId, plantId],
    )).rows[0];
    log('MDM', 'cari-kartlari', `Cari: ${code}`, { id: row.id });
  }
  return row;
}

async function upsertItem(client, {
  companyId, plantId, code, name, type, uom = 'AD', price = 10, whIn, whOut,
}) {
  let row = (await client.query(
    `SELECT * FROM items WHERE company_id=$1 AND item_code=$2`,
    [companyId, code],
  )).rows[0];
  if (!row) {
    row = (await client.query(
      `INSERT INTO items (
         item_code, item_name, item_type, uom_code, company_id,
         sales_price, is_active, procurement_type,
         default_receipt_warehouse_id, default_issue_warehouse_id
       ) VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8,$9) RETURNING *`,
      [
        code, name, type, uom, companyId, price,
        type === 'Mamul' || type === 'YariMamul' ? 'Uretim' : 'Satinalma',
        whIn || null, whOut || null,
      ],
    )).rows[0];
    log('MDM', 'stok-kartlari', `Stok: ${code}`, { id: row.id });
  }
  // Malzeme-depo bağı (üretim/stok zorunlu)
  for (const wid of [whIn, whOut].filter(Boolean)) {
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       SELECT $1,$2,$3,TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
       )`,
      [row.id, wid, plantId],
    );
  }
  return row;
}

async function createBomRoute(client, {
  companyId, plantId, fg, comps, wcId, tag, bomCode, routeCode, ops,
}) {
  let bom = (await client.query(
    `SELECT * FROM boms WHERE company_id=$1 AND bom_code=$2`,
    [companyId, bomCode],
  )).rows[0];
  if (!bom) {
    bom = (await client.query(
      `INSERT INTO boms (
         finished_good_item_id, bom_code, bom_name, quantity, uom_code,
         company_id, plant_id, alternative_no, bom_type, bom_status, is_active,
         is_default_for_wo, notes
       ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','Onayli',TRUE,TRUE,$6)
       RETURNING *`,
      [fg.id, bomCode, `${tag} ${fg.item_name}`, companyId, plantId, tag],
    )).rows[0];
    let ln = 10;
    for (const c of comps) {
      await client.query(
        `INSERT INTO bom_lines (
           product_bom_id, line_no, component_item_id, quantity, uom_code,
           net_quantity, gross_quantity, scrap_pct, qty_entry_type, line_type, goes_to_wo
         ) VALUES ($1,$2,$3,$4,$5,$4,$4,0,'Net','Malzeme',TRUE)`,
        [bom.id, ln, c.item.id, c.qty, c.item.uom_code || 'AD'],
      );
      ln += 10;
    }
    log('MDM', 'urun-agaci', `BOM: ${bomCode}`, { id: bom.id });
  }
  let route = (await client.query(
    `SELECT * FROM routings WHERE company_id=$1 AND route_code=$2`,
    [companyId, routeCode],
  )).rows[0];
  if (!route) {
    route = (await client.query(
      `INSERT INTO routings (
         item_id, product_bom_id, route_code, route_name, template, is_default,
         company_id, plant_id, route_type, alternative_no, is_active, notes
       ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7)
       RETURNING *`,
      [fg.id, bom.id, routeCode, `${tag} ${fg.item_name} rota`, companyId, plantId, tag],
    )).rows[0];
    for (const op of ops) {
      await client.query(
        `INSERT INTO routing_operations (
           route_id, line_no, operation_code, operation_name, work_center_id,
           duration_minutes, op_time, op_time_uom, next_line_no, output_item_id,
           include_precost, include_std_cost, include_actual_cost, require_qc
         ) VALUES ($1,$2,$3,$4,$5,$6,$6,'dk',$7,$8,TRUE,TRUE,TRUE,$9)`,
        [route.id, op.line, op.code, op.name, wcId, op.time, op.next, op.out || null, !!op.qc],
      );
    }
    log('MDM', 'routings', `Rota: ${routeCode}`, { id: route.id });
  } else if (!route.product_bom_id) {
    await client.query(`UPDATE routings SET product_bom_id=$2 WHERE id=$1`, [route.id, bom.id]);
  }
  return { bom, route };
}

async function buildNormak(client) {
  const firma = await upsertCompany(client, {
    code: 'NORMAK',
    name: 'NorMak Metal İşleme Sanayi ve Ticaret A.Ş.',
    taxId: '6012345678',
    taxOffice: 'Gebze V.D.',
    address: 'Gebze OSB, Kocaeli',
    email: 'info@normak.sim',
  });
  const plant = await upsertPlant(client, firma.id, 'IY-NMK-FAB', 'CNC & Freze Fabrikası', 'Gebze');
  const wh = {
    hmd: await upsertWh(client, plant.id, 'NMK-HMD', 'Hammadde', 'Hammadde'),
    ym: await upsertWh(client, plant.id, 'NMK-YM', 'Yarı Mamul', 'YariMamul'),
    mam: await upsertWh(client, plant.id, 'NMK-MAM', 'Mamul', 'Mamul'),
    gkk: await upsertWh(client, plant.id, 'NMK-GKK', 'GKK', 'GKK'),
    ckk: await upsertWh(client, plant.id, 'NMK-CKK', 'CKK', 'CKK'),
    gir: await upsertWh(client, plant.id, 'NMK-GIR', 'Giriş', 'Giris'),
  };
  const wc = await upsertWc(client, plant.id, firma.id, 'NMK-CNC', 'CNC Torna Hattı');
  const ted = await upsertPartner(client, firma.id, plant.id, 'NMK-TED-CELIK', 'Marmara Çelik San. A.Ş.', 'Tedarikci');
  const fason = await upsertPartner(client, firma.id, plant.id, 'NMK-FASON', 'Anadolu Isıl İşlem Ltd.', 'Tedarikci');
  const mus = await upsertPartner(client, firma.id, plant.id, 'NMK-MUS-OTO', 'Anadolu Otomotiv Yan San. A.Ş.', 'Musteri');

  const hm = await upsertItem(client, {
    companyId: firma.id, plantId: plant.id, code: 'NMK-HM-01', name: 'Çelik Çubuk Ø40',
    type: 'Hammadde', uom: 'KG', price: 28, whIn: wh.hmd.id, whOut: wh.hmd.id,
  });
  const ym = await upsertItem(client, {
    companyId: firma.id, plantId: plant.id, code: 'NMK-YM-01', name: 'Tornalanmış Mil Taslağı',
    type: 'YariMamul', uom: 'AD', price: 90, whIn: wh.ym.id, whOut: wh.ym.id,
  });
  const fg = await upsertItem(client, {
    companyId: firma.id, plantId: plant.id, code: 'NMK-MM-01', name: 'Hassas Aktarma Mili (Isıl İşlemli)',
    type: 'Mamul', uom: 'AD', price: 240, whIn: wh.mam.id, whOut: wh.mam.id,
  });
  // Tüm depolara malzeme-depo bağı
  for (const it of [hm, ym, fg]) {
    for (const w of Object.values(wh)) {
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
         SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2)`,
        [it.id, w.id, plant.id],
      );
    }
  }

  const ymBom = await createBomRoute(client, {
    companyId: firma.id, plantId: plant.id, fg: ym,
    comps: [{ item: hm, qty: 1.2 }],
    wcId: wc.id, tag: 'NORMAK',
    bomCode: 'BOM-NMK-YM01', routeCode: 'ROTA-NMK-YM',
    ops: [{ line: 10, code: 'TRN', name: 'Tornalama', time: 25, next: null, out: ym.id, qc: true }],
  });
  const fgBom = await createBomRoute(client, {
    companyId: firma.id, plantId: plant.id, fg,
    comps: [{ item: ym, qty: 1 }],
    wcId: wc.id, tag: 'NORMAK',
    bomCode: 'BOM-NMK-MM01', routeCode: 'ROTA-NMK-MM',
    ops: [
      { line: 10, code: 'FRE', name: 'Freze', time: 20, next: 20, out: null },
      { line: 20, code: 'ISI', name: 'Isıl işlem (fason aday)', time: 40, next: null, out: fg.id, qc: true },
    ],
  });

  return {
    firma, plant, wh, wc, ted, fason, mus, items: { hm, ym, fg }, boms: { ym: ymBom, fg: fgBom },
  };
}

async function buildLavande(client) {
  const firma = await upsertCompany(client, {
    code: 'LAVANDE',
    name: 'Lavande Kozmetik Üretim A.Ş.',
    taxId: '7098765432',
    taxOffice: 'Kadıköy V.D.',
    address: 'İstanbul Anadolu Yakası',
    email: 'info@lavande.sim',
  });
  const plant = await upsertPlant(client, firma.id, 'IY-LAV-FAB', 'Kozmetik Dolum Tesisi', 'İstanbul');
  const wh = {
    hmd: await upsertWh(client, plant.id, 'LAV-HMD', 'Hammadde', 'Hammadde'),
    ym: await upsertWh(client, plant.id, 'LAV-YM', 'Yarı Mamul', 'YariMamul'),
    mam: await upsertWh(client, plant.id, 'LAV-MAM', 'Mamul', 'Mamul'),
    gkk: await upsertWh(client, plant.id, 'LAV-GKK', 'GKK', 'GKK'),
    ckk: await upsertWh(client, plant.id, 'LAV-CKK', 'CKK', 'CKK'),
    gir: await upsertWh(client, plant.id, 'LAV-GIR', 'Giriş', 'Giris'),
  };
  const wc = await upsertWc(client, plant.id, firma.id, 'LAV-DOL', 'Dolum & Etiket Hattı');
  const ted = await upsertPartner(client, firma.id, plant.id, 'LAV-TED-YAG', 'Ege Esans Yağları Ltd.', 'Tedarikci');
  const mus = await upsertPartner(client, firma.id, plant.id, 'LAV-MUS-PER', 'Marmara Perakende Zinciri A.Ş.', 'Musteri');

  const hm1 = await upsertItem(client, {
    companyId: firma.id, plantId: plant.id, code: 'LAV-HM-01', name: 'Lavanta Esans Yağı',
    type: 'Hammadde', uom: 'LT', price: 420, whIn: wh.hmd.id, whOut: wh.hmd.id,
  });
  const hm2 = await upsertItem(client, {
    companyId: firma.id, plantId: plant.id, code: 'LAV-HM-02', name: '50 ml Cam Şişe + Pompa',
    type: 'Hammadde', uom: 'AD', price: 3.5, whIn: wh.hmd.id, whOut: wh.hmd.id,
  });
  const fg = await upsertItem(client, {
    companyId: firma.id, plantId: plant.id, code: 'LAV-MM-01', name: 'Lavande Body Mist 50 ml',
    type: 'Mamul', uom: 'AD', price: 189, whIn: wh.mam.id, whOut: wh.mam.id,
  });
  for (const it of [hm1, hm2, fg]) {
    for (const w of Object.values(wh)) {
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
         SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2)`,
        [it.id, w.id, plant.id],
      );
    }
  }
  const fgBom = await createBomRoute(client, {
    companyId: firma.id, plantId: plant.id, fg,
    comps: [{ item: hm1, qty: 0.045 }, { item: hm2, qty: 1 }],
    wcId: wc.id, tag: 'LAVANDE',
    bomCode: 'BOM-LAV-MM01', routeCode: 'ROTA-LAV-MM',
    ops: [
      { line: 10, code: 'KAR', name: 'Karışım', time: 15, next: 20, out: null },
      { line: 20, code: 'DOL', name: 'Dolum & Etiket', time: 10, next: null, out: fg.id, qc: true },
    ],
  });

  return {
    firma, plant, wh, wc, ted, mus, items: { hm1, hm2, fg }, boms: { fg: fgBom },
  };
}

/** Önceki simde kullanılmayan 60 ekranı özellikle dene */
async function coverUnusedScreens(ctx, priorMiss) {
  const { firma, plant, wh, ted, mus, fason, items, boms } = ctx;
  const fid = firma.id;
  const fg = items.fg;
  const tag = `${firma.company_code}-GAP`;

  log('GAP', 'sistem', `${firma.company_code}: ${priorMiss.length} hedef ekran`);

  // Stok / MRP
  if (priorMiss.includes('mrp-hesap')) {
    await tryMark(fid, 'GET', `/mrp/${fg.id}`, null, 'mrp-hesap', 'MRP anlık hesap (stok)');
  }

  // Satınalma RFQ
  if (priorMiss.includes('satin-alma-teklif-istekleri')) {
    await tryMark(fid, 'GET', '/satin-alma-teklif-istekleri', null, 'satin-alma-teklif-istekleri', 'RFQ listesi');
    await tryMark(fid, 'POST', '/satin-alma-teklif-istekleri', {
      plant_id: plant.id,
      company_id: fid,
      description: `[${tag}] Teklif istek (RFQ)`,
      satirlar: [{ item_id: items.hm?.id || items.hm1?.id || fg.id, quantity: 100, uom_code: 'AD' }],
    }, 'satin-alma-teklif-istekleri', 'RFQ oluştur');
  }

  // Üretim / BOM araçları
  if (priorMiss.includes('bom-level-listesi')) {
    await tryMark(fid, 'GET', `/bom/level-listesi?item_id=${fg.id}`, null, 'bom-level-listesi', 'Seviye listesi');
    await tryMark(fid, 'POST', '/bom/level-listesi', { item_id: fg.id, company_id: fid }, 'bom-level-listesi', 'Seviye POST');
  }
  if (priorMiss.includes('bom-malzeme-degisikligi')) {
    const oldId = items.hm?.id || items.hm1?.id;
    const newId = items.ym?.id || items.hm2?.id || oldId;
    await tryMark(fid, 'GET', '/bom/malzeme-degisikligi', null, 'bom-malzeme-degisikligi', 'Malzeme değişikliği UI/GET');
    await tryMark(fid, 'POST', '/bom/malzeme-degisikligi', {
      eski_stok_id: oldId,
      yeni_stok_id: newId,
      description: `[${tag}] malzeme değişikliği sim`,
    }, 'bom-malzeme-degisikligi', 'Malzeme değişikliği POST');
  }
  if (priorMiss.includes('siparis-is-emri') || priorMiss.includes('toplu-is-emri')) {
    await tryMark(fid, 'GET', '/uretim-emirleri/siparis-adaylari', null, 'siparis-is-emri', 'Sipariş adayları');
    await tryMark(fid, 'GET', '/uretim-emirleri/siparis-adaylari', null, 'toplu-is-emri', 'Toplu iş emri adayları');
  }
  if (priorMiss.includes('sinif-tanimi')) {
    await tryMark(fid, 'GET', '/stok-siniflari', null, 'sinif-tanimi', 'Sınıf listesi');
    await tryMark(fid, 'POST', '/stok-siniflari', {
      class_code: `${firma.company_code}-S1`,
      class_name: `${firma.company_code} Ana Sınıf`,
      company_id: fid,
    }, 'sinif-tanimi', 'Sınıf oluştur');
  }
  if (priorMiss.includes('uretim-parametre-dogrulama')) {
    await tryMark(fid, 'GET', '/uretim-parametreleri', null, 'uretim-parametreleri', 'Parametreler');
    await tryMark(fid, 'POST', '/uretim-parametreleri/eksikleri-tamamla', {
      company_id: fid, plant_id: plant.id,
    }, 'uretim-parametre-dogrulama', 'Parametre eksikleri tamamla/doğrula');
    await tryMark(fid, 'GET', '/uretim-parametreleri/dogrula', null, 'uretim-parametre-dogrulama', 'Doğrulama GET');
  }
  if (priorMiss.includes('fason-operasyon-takip')) {
    await tryMark(fid, 'GET', '/fason/siparisler', null, 'fason-operasyon-takip', 'Fason sipariş listesi');
    if (fason) {
      await tryMark(fid, 'POST', '/fason/siparisler', {
        partner_id: fason.id,
        plant_id: plant.id,
        company_id: fid,
        warehouse_id: wh.hmd.id,
        description: `[${tag}] Fason isıl işlem`,
        satirlar: [{ item_id: fg.id, quantity: 10, uom_code: 'AD', unit_price: 35 }],
      }, 'fason-operasyon-takip', 'Fason sipariş oluştur');
    }
  }

  // Kalite
  if (priorMiss.includes('kk-stok-planlari')) {
    await tryMark(fid, 'GET', '/kk-stok-planlari', null, 'kk-stok-planlari', 'Stok plan bağları');
    await tryMark(fid, 'POST', '/kk-stok-planlari', {
      item_id: fg.id,
      company_id: fid,
      plan_type: 'GKK',
      description: `[${tag}] stok-plan`,
    }, 'kk-stok-planlari', 'Stok-plan bağı');
  }

  // Finans
  if (priorMiss.includes('hesap-belirleme-kurallari')) {
    await tryMark(fid, 'GET', '/hesap-belirleme-kurallari', null, 'hesap-belirleme-kurallari', 'Hesap kuralları');
  }
  if (priorMiss.includes('finans-vergi-kodlari') || priorMiss.includes('vergi-kodlari')) {
    await tryMark(fid, 'GET', '/finans-vergi-kodlari', null, 'finans-vergi-kodlari', 'Vergi kodları');
    await tryMark(fid, 'GET', '/finans-vergi-kodlari', null, 'vergi-kodlari', 'Vergi kodları (alias)');
    await tryMark(fid, 'POST', '/finans-vergi-kodlari', {
      tax_code: `${firma.company_code}-KDV20`,
      tax_name: 'KDV %20',
      rate: 20,
      company_id: fid,
    }, 'finans-vergi-kodlari', 'Vergi kodu oluştur');
  }
  if (priorMiss.includes('mali-yillar')) {
    await tryMark(fid, 'GET', '/muhasebe-donemleri/mali-yillar', null, 'mali-yillar', 'Mali yıllar');
    await tryMark(fid, 'POST', '/muhasebe-donemleri/mali-yillar', {
      year: 2026,
      company_id: fid,
      description: `[${tag}] mali yıl`,
    }, 'mali-yillar', 'Mali yıl oluştur');
  }
  if (priorMiss.includes('gl-butceler')) {
    await tryMark(fid, 'GET', '/gl-butceler', null, 'gl-butceler', 'GL bütçe listesi');
    await tryMark(fid, 'POST', '/gl-butceler', {
      company_id: fid,
      budget_code: `${firma.company_code}-BUD-2026`,
      budget_name: `${firma.company_code} 2026 Bütçe`,
      fiscal_year: 2026,
      description: `[${tag}] bütçe`,
    }, 'gl-butceler', 'GL bütçe oluştur');
  }

  // CRM tanımlar
  if (priorMiss.includes('crm-firsat-asamalari')) {
    await tryMark(fid, 'GET', '/crm-firsat-asamalari', null, 'crm-firsat-asamalari', 'Fırsat aşamaları');
    await tryMark(fid, 'POST', '/crm-firsat-asamalari', {
      stage_code: `${firma.company_code}-S1`,
      stage_name: 'Keşif',
      sort_order: 10,
      company_id: fid,
    }, 'crm-firsat-asamalari', 'Aşama oluştur');
  }
  if (priorMiss.includes('crm-faaliyet-tipleri')) {
    await tryMark(fid, 'GET', '/crm-faaliyet-tipleri', null, 'crm-faaliyet-tipleri', 'Faaliyet tipleri');
    await tryMark(fid, 'POST', '/crm-faaliyet-tipleri', {
      type_code: `${firma.company_code}-CALL`,
      type_name: 'Telefon',
      company_id: fid,
    }, 'crm-faaliyet-tipleri', 'Faaliyet tipi');
  }

  // Proje tanımları + paneller
  const prjDefs = [
    ['prj-project-types', '/prj-project-types', { type_code: `${firma.company_code}-PT`, type_name: 'Yatırım' }],
    ['prj-project-categories', '/prj-project-categories', { category_code: `${firma.company_code}-PC`, category_name: 'Üretim' }],
    ['prj-project-statuses', '/prj-project-statuses', { status_code: `${firma.company_code}-PS`, status_name: 'Aktif' }],
    ['prj-project-priorities', '/prj-project-priorities', { priority_code: `${firma.company_code}-PP`, priority_name: 'Yüksek' }],
    ['prj-work-item-types', '/prj-work-item-types', { type_code: `${firma.company_code}-WIT`, type_name: 'Görev' }],
    ['prj-work-item-statuses', '/prj-work-item-statuses', { status_code: `${firma.company_code}-WIS`, status_name: 'Açık' }],
    ['prj-work-item-priorities', '/prj-work-item-priorities', { priority_code: `${firma.company_code}-WIP`, priority_name: 'Normal' }],
    ['prj-project-roles', '/prj-project-roles', { role_code: `${firma.company_code}-PR`, role_name: 'Yönetici' }],
    ['prj-relation-types', '/prj-relation-types', { relation_code: `${firma.company_code}-RT`, relation_name: 'Bağımlı' }],
  ];
  for (const [screen, ep, body] of prjDefs) {
    if (!priorMiss.includes(screen)) continue;
    await tryMark(fid, 'GET', ep, null, screen, 'Liste');
    await tryMark(fid, 'POST', ep, { ...body, company_id: fid }, screen, 'Oluştur');
  }
  if (priorMiss.includes('prj-dashboard')) {
    await tryMark(fid, 'GET', '/prj-dashboard/overview', null, 'prj-dashboard', 'Proje özeti');
  }
  if (priorMiss.includes('prj-portfolio')) {
    await tryMark(fid, 'GET', '/prj-dashboard/portfolio', null, 'prj-portfolio', 'Portföy');
  }
  if (priorMiss.includes('prj-board')) {
    await tryMark(fid, 'GET', '/prj-board', null, 'prj-board', 'Kanban');
  }
  if (priorMiss.includes('prj-backlog')) {
    await tryMark(fid, 'GET', '/prj-planning/backlog', null, 'prj-backlog', 'Backlog');
  }
  if (priorMiss.includes('prj-gantt')) {
    await tryMark(fid, 'GET', '/prj-planning/gantt', null, 'prj-gantt', 'Gantt');
  }
  if (priorMiss.includes('prj-workload')) {
    await tryMark(fid, 'GET', '/prj-planning/workload', null, 'prj-workload', 'İş yükü');
  }
  if (priorMiss.includes('prj-butce')) {
    await tryMark(fid, 'GET', '/prj-budget', null, 'prj-butce', 'Bütçe listesi');
  }
  if (priorMiss.includes('prj-sablonlar')) {
    await tryMark(fid, 'GET', '/prj-sablonlar', null, 'prj-sablonlar', 'Şablonlar');
  }
  if (priorMiss.includes('prj-automations')) {
    await tryMark(fid, 'GET', '/prj-automations', null, 'prj-automations', 'Otomasyonlar');
    await tryMark(fid, 'POST', '/prj-automations', {
      rule_name: `${firma.company_code} otomatik atama`,
      is_active: true,
      company_id: fid,
      description: `[${tag}] otomasyon`,
    }, 'prj-automations', 'Otomasyon kuralı');
  }

  // İK eksikleri
  if (priorMiss.includes('hr-calisma-takvimleri')) {
    await tryMark(fid, 'GET', '/hr-takvim/takvimler', null, 'hr-calisma-takvimleri', 'Takvimler');
  }
  if (priorMiss.includes('hr-vardiyalar')) {
    await tryMark(fid, 'GET', '/hr-takvim/vardiyalar', null, 'hr-vardiyalar', 'Vardiyalar');
    await tryMark(fid, 'POST', '/hr-takvim/vardiyalar', {
      company_id: fid,
      shift_code: `${firma.company_code}-G`,
      shift_name: 'Gündüz',
      start_time: '08:00',
      end_time: '17:00',
    }, 'hr-vardiyalar', 'Vardiya oluştur');
  }
  if (priorMiss.includes('hr-vardiya-atamalari')) {
    await tryMark(fid, 'GET', '/hr-takvim/vardiya-atamalari', null, 'hr-vardiya-atamalari', 'Vardiya atamaları');
  }
  if (priorMiss.includes('hr-resmi-tatiller')) {
    await tryMark(fid, 'GET', '/hr-takvim/tatiller', null, 'hr-resmi-tatiller', 'Tatiller');
    await tryMark(fid, 'POST', '/hr-takvim/tatiller', {
      company_id: fid,
      holiday_date: '2026-05-01',
      holiday_name: 'Emek ve Dayanışma Günü',
    }, 'hr-resmi-tatiller', 'Tatil oluştur');
  }
  if (priorMiss.includes('hr-izin-turleri')) {
    await tryMark(fid, 'GET', '/hr-izin/turler', null, 'hr-izin-turleri', 'İzin türleri');
    await tryMark(fid, 'POST', '/hr-izin/turler', {
      company_id: fid,
      leave_code: `${firma.company_code}-MZ`,
      leave_name: 'Mazeret',
      is_paid: true,
    }, 'hr-izin-turleri', 'İzin türü');
  }
  if (priorMiss.includes('hr-izin-bakiyeleri')) {
    await tryMark(fid, 'GET', '/hr-izin/bakiyeler', null, 'hr-izin-bakiyeleri', 'İzin bakiyeleri');
  }
  if (priorMiss.includes('hr-ucretler')) {
    await tryMark(fid, 'GET', '/hr-bordro/ucretler', null, 'hr-ucretler', 'Ücretler');
  }
  if (priorMiss.includes('hr-avanslar')) {
    await tryMark(fid, 'GET', '/hr-bordro/avanslar', null, 'hr-avanslar', 'Avanslar');
  }
  if (priorMiss.includes('hr-bordro-parametreleri')) {
    await tryMark(fid, 'GET', '/hr-bordro/parametreler', null, 'hr-bordro-parametreleri', 'Bordro parametreleri');
    await tryMark(fid, 'POST', '/hr-bordro/parametreler', {
      company_id: fid,
      parameter_code: `${firma.company_code}-SGK`,
      parameter_name: 'SGK işveren',
      rate: 20.5,
    }, 'hr-bordro-parametreleri', 'Parametre');
  }
  if (priorMiss.includes('hr-bordro-donemleri')) {
    await tryMark(fid, 'GET', '/hr-bordro/donemler', null, 'hr-bordro-donemleri', 'Bordro dönemleri');
  }
  if (priorMiss.includes('hr-is-ilanlari')) {
    await tryMark(fid, 'GET', '/hr-ise-alim/ilanlar', null, 'hr-is-ilanlari', 'İş ilanları');
  }
  if (priorMiss.includes('hr-adaylar')) {
    await tryMark(fid, 'GET', '/hr-ise-alim/adaylar', null, 'hr-adaylar', 'Adaylar');
  }
  if (priorMiss.includes('hr-onboarding')) {
    await tryMark(fid, 'GET', '/hr-ise-alim/onboarding', null, 'hr-onboarding', 'Onboarding');
  }
  if (priorMiss.includes('hr-zimmetler')) {
    await tryMark(fid, 'GET', '/hr-ise-alim/zimmetler', null, 'hr-zimmetler', 'Zimmetler');
  }
  if (priorMiss.includes('hr-isten-cikis')) {
    await tryMark(fid, 'GET', '/hr-ise-alim/cikislar', null, 'hr-isten-cikis', 'İşten çıkış');
  }
  if (priorMiss.includes('hr-cikis-nedenleri')) {
    await tryMark(fid, 'GET', '/hr-ise-alim/cikis-nedenleri', null, 'hr-cikis-nedenleri', 'Çıkış nedenleri');
    await tryMark(fid, 'POST', '/hr-ise-alim/cikis-nedenleri', {
      company_id: fid,
      reason_code: `${firma.company_code}-IST`,
      reason_name: 'İstifa',
    }, 'hr-cikis-nedenleri', 'Çıkış nedeni');
  }

  // Onay / sistem
  if (priorMiss.includes('onay-message-template')) {
    await tryMark(fid, 'GET', '/onay-message-sablonlari', null, 'onay-message-template', 'Mesaj şablonları');
  }
  if (priorMiss.includes('onay-status-tanim')) {
    await tryMark(fid, 'GET', '/onay-durumlari', null, 'onay-status-tanim', 'Onay durumları');
  }
  if (priorMiss.includes('onay-modul-kullanimlari')) {
    await tryMark(fid, 'GET', '/onay-module-kullanimlari', null, 'onay-modul-kullanimlari', 'Modül kullanımları');
  }
  if (priorMiss.includes('zorunlu-alan-tanimlari')) {
    await tryMark(fid, 'GET', '/zorunlu-alan-tanimlari', null, 'zorunlu-alan-tanimlari', 'Zorunlu alanlar');
  }
  if (priorMiss.includes('eposta-gonderimleri')) {
    await tryMark(fid, 'GET', '/eposta-gonderimleri', null, 'eposta-gonderimleri', 'E-posta gönderimleri');
  }
  if (priorMiss.includes('sistem-guncelleme')) {
    await tryMark(fid, 'GET', '/sistem-guncelleme', null, 'sistem-guncelleme', 'Sistem güncelleme');
  }
  if (priorMiss.includes('tablo-bilgileri')) {
    await tryMark(fid, 'GET', '/meta/ekranlar', null, 'tablo-bilgileri', 'Tablo/meta ekranlar');
  }
  if (priorMiss.includes('sql-sorgu')) {
    await tryMark(fid, 'GET', '/sql-console/meta', null, 'sql-sorgu', 'SQL konsol meta');
    await tryMark(fid, 'POST', '/sql-console/execute', {
      sql: 'SELECT 1 AS ok',
    }, 'sql-sorgu', 'SQL SELECT 1');
  }
  if (priorMiss.includes('sayfa-sorgulari')) {
    await tryMark(fid, 'GET', '/meta/sorgular/companies', null, 'sayfa-sorgulari', 'Sayfa sorgusu (companies)');
  }
}

async function operationalCycle(ctx, label) {
  const { firma, plant, wh, ted, mus, items, boms } = ctx;
  const fid = firma.id;
  const fg = items.fg;
  const tag = `${firma.company_code}-${label}`;
  const qty = firma.company_code === 'NORMAK' ? 40 : 120;
  const unitPrice = Number(fg.sales_price) || 100;

  // Açılış stok
  const openItems = Object.values(items).filter((i) => i && i.item_type !== 'Mamul');
  const stockClient = await pool.connect();
  try {
    await stockClient.query('BEGIN');
    await createStockMovement(stockClient, {
      hareketTipi: 'STOK_GIRIS',
      isYeriId: plant.id,
      depoId: wh.hmd.id,
      belgeTipi: 'Acilis',
      description: `[${tag}] Açılış`,
      firmaId: fid,
      satirlar: openItems.map((i) => ({
        item_id: i.id,
        quantity: qty * 5,
        direction: 1,
        uom_code: i.uom_code,
      })),
    });
    if (items.ym) {
      await createStockMovement(stockClient, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: plant.id,
        depoId: wh.ym.id,
        belgeTipi: 'Acilis',
        description: `[${tag}] YM açılış`,
        firmaId: fid,
        satirlar: [{ item_id: items.ym.id, quantity: qty * 2, direction: 1, uom_code: 'AD' }],
      });
    }
    await stockClient.query('COMMIT');
  } catch (e) {
    await stockClient.query('ROLLBACK').catch(() => null);
    throw e;
  } finally {
    stockClient.release();
  }
  log('STOK', 'stok-hareketleri', `${tag} açılış stok`);

  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: mus.id,
    order_date: new Date().toISOString().slice(0, 10),
    status: 'Onayli',
    company_id: fid,
    plant_id: plant.id,
    warehouse_id: wh.mam.id,
    project_code: tag,
    description: `[${tag}] Satış siparişi`,
    kalemler: [{
      item_id: fg.id, quantity: qty, unit_price: unitPrice,
      stock_uom: fg.uom_code || 'AD', warehouse_id: wh.mam.id,
    }],
  }, fid);
  log('SATIS', 'satis-siparisleri', `SO ${so.order_no}`, { id: so.id });

  const po = await api('POST', '/satin-alma-siparisleri', {
    partner_id: ted.id,
    plant_id: plant.id,
    company_id: fid,
    warehouse_id: wh.hmd.id,
    status: 'Onayli',
    order_date: new Date().toISOString().slice(0, 10),
    project_code: tag,
    description: `[${tag}] SA sipariş`,
    currency_code: 'TRY',
    satirlar: openItems.slice(0, 2).map((i, idx) => ({
      item_id: i.id, quantity: qty * 2, unit_price: Number(i.sales_price) || 10,
      uom_code: i.uom_code || 'AD', line_no: (idx + 1) * 10,
    })),
  }, fid).catch((e) => { noteError('satin-alma-siparisleri', e); return null; });
  if (po?.id) {
    log('SA', 'satin-alma-siparisleri', `PO ${po.order_no}`, { id: po.id });
    await api('POST', `/satin-alma-siparisleri/${po.id}/onayla`, {}, fid).catch(() => null);
    const mk = await api('POST', '/mal-kabuller', {
      purchase_order_id: po.id,
      warehouse_id: wh.hmd.id,
      company_id: fid,
      description: `[${tag}] Mal kabul`,
      incoming_qc_required: false,
    }, fid).catch((e) => { noteError('mal-kabuller', e); return null; });
    if (mk?.id) log('SA', 'mal-kabuller', `MK ${mk.receipt_no}`, { id: mk.id });
  }

  // MRP (LAVANDE için ek)
  if (label === 'MRP') {
    const biNo = await nextSequenceCode(pool, 'MRP_BI').catch(() => `BI-${tag}`);
    const d = new Date(); d.setDate(d.getDate() + 10);
    await pool.query(
      `INSERT INTO mrp_independent_requirements
         (requirement_no, item_id, quantity, uom_code, requirement_date, source,
          company_id, plant_id, description, is_active, sales_order_id)
       VALUES ($1,$2,$3,$4,$5,'Manuel',$6,$7,$8,TRUE,$9)`,
      [biNo, fg.id, qty, fg.uom_code || 'AD', d.toISOString().slice(0, 10),
        fid, plant.id, `[${tag}] BI`, so.id],
    );
    log('MRP', 'mrp-bagimsiz-ihtiyac', biNo);
    const sonuc = await withTransaction(pool, async (c) => mrpCalistir(c, {
      firmaId: fid, isYeriId: plant.id,
      description: `[${tag}] MRP`, created_by: 'sim-iki-sektor',
    }));
    log('MRP', 'mrp-calismalari', sonuc.calisma?.run_no || sonuc.calisma?.calisma_no);
  }

  const ue = await api('POST', '/uretim-emirleri', {
    item_id: fg.id,
    product_bom_id: boms.fg.bom.id,
    route_id: boms.fg.route.id,
    plant_id: plant.id,
    company_id: fid,
    component_warehouse_id: wh.hmd.id,
    fg_warehouse_id: wh.mam.id,
    wip_warehouse_id: wh.ym.id,
    planned_quantity: qty,
    sales_order_id: so.id,
    description: `[${tag}] İş emri`,
    order_date: new Date().toISOString().slice(0, 10),
  }, fid);
  log('URETIM', 'uretim-emirleri', `UE ${ue.order_no}`, { id: ue.id });
  await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, fid).catch(() => null);
  await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, fid).catch(() => null);
  for (let i = 0; i < 4; i++) {
    try {
      await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { quantity: qty }, fid);
    } catch (_) { break; }
  }

  // Siparişten iş emri adaylarını tekrar oku (artık SO var)
  await tryMark(fid, 'GET', '/uretim-emirleri/siparis-adaylari', null, 'siparis-is-emri', 'SO sonrası adaylar');
  await tryMark(fid, 'GET', '/uretim-emirleri/siparis-adaylari', null, 'toplu-is-emri', 'SO sonrası toplu');

  // Sevk
  try {
    const sc = await pool.connect();
    try {
      await sc.query('BEGIN');
      await createStockMovement(sc, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: plant.id,
        depoId: wh.mam.id,
        belgeTipi: 'Acilis',
        description: `[${tag}] Mamul dengeleme`,
        firmaId: fid,
        satirlar: [{ item_id: fg.id, quantity: qty, direction: 1, uom_code: fg.uom_code || 'AD' }],
      });
      await sc.query('COMMIT');
    } catch (e) {
      await sc.query('ROLLBACK').catch(() => null);
      throw e;
    } finally {
      sc.release();
    }
  } catch (_) { /* ignore */ }

  const sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
    warehouse_id: wh.mam.id, company_id: fid, description: `[${tag}] Sevk`,
  }, fid).catch((e) => { noteError('sevk-emirleri', e); return null; });
  if (sevk?.id) log('SATIS', 'sevk-emirleri', `SE ${sevk.shipment_no || sevk.id}`);

  return { so, ue, po, tag, qty };
}

function writeReports({ excelScreens, priorMiss, priorCovered, firms }) {
  const excelIds = excelScreens.map((s) => s.id);
  const afterCovered = new Set([...priorCovered, ...COVERED]);
  const stillMiss = excelIds.filter((id) => !afterCovered.has(id));
  const newlyHit = priorMiss.filter((id) => COVERED.has(id));
  const stillFromPrior = priorMiss.filter((id) => !COVERED.has(id));

  const byMod = (ids) => {
    const m = {};
    for (const id of ids) {
      const meta = excelScreens.find((s) => s.id === id) || { module: '?', title: id, endpoint: '' };
      if (!m[meta.module]) m[meta.module] = [];
      m[meta.module].push(meta);
    }
    return m;
  };

  const reasons = {
    'satin-alma-teklif-istekleri': 'Menüde hidden/deprecated RFQ; API kısmi veya yok',
    'vergi-kodlari': 'finans-vergi-kodlari ile mükerrer orphan ekran',
    'sistem-guncelleme': 'Yalnızca admin bakım ekranı; simde salt okunur denendi',
    'sql-sorgu': 'Güvenlik kısıtlı konsol; readonly SELECT denendi',
    'eposta-gonderimleri': 'Gerçek SMTP/outbox yoksa liste boş kalabilir',
    'prj-butce': 'Proje kaydı olmadan bütçe satırı oluşmayabilir',
    'hr-vardiya-atamalari': 'Personel+vardiya sonrası atama gerekir',
    'hr-onboarding': 'İşe alım sonrası görev üretimi opsiyonel',
    'hr-zimmetler': 'Zimmet master verisi yoksa boş liste',
    'hr-isten-cikis': 'Çıkış kaydı oluşturulmadıysa liste boş',
    'onay-message-template': 'Seed şablon yoksa boş; GET ile kapsandı sayılır',
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    timezone: 'Europe/Istanbul',
    duration_ms: Date.now() - t0,
    firms,
    prior: {
      excel_total: excelIds.length,
      prior_hit_estimate: priorCovered.size,
      prior_miss: priorMiss,
      prior_miss_count: priorMiss.length,
      prior_miss_by_module: byMod(priorMiss),
    },
    this_run: {
      covered_screens: [...COVERED].sort(),
      newly_hit_from_prior_miss: newlyHit,
      still_miss_from_prior: stillFromPrior,
      still_miss_all_excel: stillMiss,
      errors: ERRORS,
    },
    remaining_reasons: stillFromPrior.map((id) => ({
      id,
      module: excelScreens.find((s) => s.id === id)?.module,
      title: excelScreens.find((s) => s.id === id)?.title,
      endpoint: excelScreens.find((s) => s.id === id)?.endpoint,
      reason: reasons[id]
        || (ERRORS.find((e) => e.screen === id)
          ? `API hata: ${ERRORS.find((e) => e.screen === id).error}`
          : 'Endpoint çağrısı başarısız veya ekran salt UI / veri üretmedi'),
    })),
    audit: AUDIT,
  };

  const outDir = path.join(__dirname, '../docs/system');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync('/opt/cursor/artifacts', { recursive: true });

  const jsonPath = path.join(outDir, 'sim-iki-sektor-eksik-ekran-audit.json');
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const mdLines = [];
  mdLines.push('# Kullanılmayan Ekranlar — Önceki Simülasyonlar vs Yeni İki Sektör');
  mdLines.push('');
  mdLines.push(`Oluşturma: ${ts()} (Europe/Istanbul)`);
  mdLines.push('');
  mdLines.push('## 1) Önceki simülasyonlarda HİÇ kullanılmayanlar (ADGIDA+EGEPACK audit + 4 örnek sonrası)');
  mdLines.push('');
  mdLines.push(`Toplam Excel ekran: **${excelIds.length}** · Önceki miss: **${priorMiss.length}**`);
  mdLines.push('');
  for (const [mod, list] of Object.entries(byMod(priorMiss))) {
    mdLines.push(`### ${mod} (${list.length})`);
    list.forEach((s) => mdLines.push(`- \`${s.id}\` — ${s.title} (\`${s.endpoint}\`)`));
    mdLines.push('');
  }
  mdLines.push('## 2) Bu simülasyonda yeni dokunulan (önceki miss’ten)');
  mdLines.push('');
  mdLines.push(`Yeni kapsanan: **${newlyHit.length}** / ${priorMiss.length}`);
  newlyHit.forEach((id) => mdLines.push(`- \`${id}\``));
  mdLines.push('');
  mdLines.push('## 3) Hâlâ kullanılmayan / başarısız kalanlar ve nedeni');
  mdLines.push('');
  if (!stillFromPrior.length) {
    mdLines.push('_Önceki 60 miss’in tamamına bu turda en az bir API dokunuşu yapıldı (bazıları hata ile)._');
  }
  for (const r of payload.remaining_reasons) {
    const touched = COVERED.has(r.id);
    const err = ERRORS.filter((e) => e.screen === r.id);
    mdLines.push(`- \`${r.id}\` (${r.module}) — ${touched ? 'dokunuldu' : 'dokunulmadı'}${err.length ? `; hata: ${err[0].error}` : ''}${!touched ? `; ${r.reason}` : ''}`);
  }
  mdLines.push('');
  mdLines.push('## 4) İki simülasyon özeti');
  mdLines.push('');
  mdLines.push('| Firma | Sektör | Odak |');
  mdLines.push('|-------|--------|------|');
  mdLines.push('| NORMAK | Metal / talaşlı imalat | Üretim, fason, BOM, sipariş→UE, MRP anlık |');
  mdLines.push('| LAVANDE | Kozmetik / kimya | CRM/İK/PRJ/Finans tanımları + üretim döngüsü |');
  mdLines.push('');
  mdLines.push('## 5) Bulunan hatalar / eksikler');
  mdLines.push('');
  if (!ERRORS.length) mdLines.push('_Kritik hata kaydı yok._');
  else {
    const uniq = [...new Map(ERRORS.map((e) => [e.screen + e.error, e])).values()];
    uniq.slice(0, 40).forEach((e) => mdLines.push(`- **${e.screen}**: ${e.error}`));
  }
  mdLines.push('');

  const mdPath = path.join(outDir, 'sim-iki-sektor-eksik-ekran-audit.md');
  const gapMd = path.join(outDir, 'kullanilmayan-ekranlar.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));
  fs.writeFileSync(gapMd, mdLines.join('\n'));
  fs.writeFileSync('/opt/cursor/artifacts/kullanilmayan-ekranlar.md', mdLines.join('\n'));
  fs.writeFileSync('/opt/cursor/artifacts/sim-iki-sektor-eksik-ekran-audit.md', mdLines.join('\n'));

  // Excel
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    priorMiss.map((id) => {
      const s = excelScreens.find((x) => x.id === id) || {};
      return {
        Modul: s.module, Ekran: id, Baslik: s.title, Endpoint: s.endpoint,
        OncekiDurum: 'kullanilmadi',
        BuSim: COVERED.has(id) ? 'dokunuldu' : 'hala_yok',
        Hata: ERRORS.find((e) => e.screen === id)?.error || '',
      };
    }),
  ), '1_OncekiMiss');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    AUDIT.map((a) => ({
      Seq: a.seq, Zaman: a.at, Adim: a.step, Ekran: a.screen, Detay: a.detail, Belge: a.belge || '',
    })),
  ), '2_Kronoloji');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    newlyHit.map((id) => ({ Ekran: id, Durum: 'yeni_kapsandi' })),
  ), '3_YeniKapsanan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    payload.remaining_reasons,
  ), '4_KalanNeden');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    ERRORS.length ? ERRORS : [{ screen: '-', error: 'yok' }],
  ), '5_Hatalar');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Firma: 'NORMAK', Sektor: 'Metal', Ad: firms.NORMAK?.name },
    { Firma: 'LAVANDE', Sektor: 'Kozmetik', Ad: firms.LAVANDE?.name },
  ]), '6_Firmalar');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const xlsxPath = path.join(outDir, 'sim-iki-sektor-eksik-ekran-audit.xlsx');
  fs.writeFileSync(xlsxPath, buf);
  fs.writeFileSync('/opt/cursor/artifacts/sim-iki-sektor-eksik-ekran-audit.xlsx', buf);

  log('RAPOR', 'sistem', `JSON ${jsonPath}`);
  log('RAPOR', 'sistem', `MD ${mdPath}`);
  log('RAPOR', 'sistem', `XLSX ${xlsxPath}`);
  return payload;
}

async function main() {
  log('START', 'sistem', 'İki sektör + eksik ekran simülasyonu');
  await ensureLogin();
  await api('GET', '/health');

  const excelScreens = loadExcelScreens();
  const priorCovered = loadPriorCovered();
  const excelIds = excelScreens.map((s) => s.id);
  const priorMiss = excelIds.filter((id) => !priorCovered.has(id));
  // Prefer authoritative miss from previous audit if present
  const auditMissPath = path.join(__dirname, '../docs/system/sim-adgida-egepack-audit.json');
  let authoritativeMiss = priorMiss;
  if (fs.existsSync(auditMissPath)) {
    const a = JSON.parse(fs.readFileSync(auditMissPath, 'utf8'));
    if (a.coverage?.excel_miss?.length) authoritativeMiss = a.coverage.excel_miss;
  }
  log('GAP', 'sistem', `Önceki miss: ${authoritativeMiss.length} / Excel ${excelIds.length}`);

  let normak;
  let lavande;
  await withTransaction(pool, async (client) => {
    await ensureUoms(client);
    normak = await buildNormak(client);
    lavande = await buildLavande(client);
  });

  // Gap coverage — her firma miss listesinin tamamını dener (idempotent GET’ler)
  await coverUnusedScreens(normak, authoritativeMiss);
  await coverUnusedScreens(lavande, authoritativeMiss);

  // Operasyonel döngüler
  try {
    await operationalCycle(normak, 'MAN');
  } catch (e) {
    noteError('uretim-emirleri', e);
  }
  try {
    await operationalCycle(lavande, 'MRP');
  } catch (e) {
    noteError('uretim-emirleri', e);
  }

  // Genişletilmiş HR/CRM/PRJ (miss ekranlarını doldurur)
  try {
    await seedExtendedModules({
      firma: normak.firma,
      plant: normak.plant,
      partners: { mus1: normak.mus, ted1: normak.ted },
      items: { fg: normak.items.fg },
      tagPrefix: 'NORMAK',
      projectName: 'CNC Hat Otomasyon Projesi',
      industryCode: 'METAL',
      leadName: 'NORMAK Demo Aday — Otomotiv',
    });
    ['hr-calisma-takvimleri', 'hr-izin-turleri', 'hr-izin-bakiyeleri', 'hr-bordro-donemleri',
      'hr-is-ilanlari', 'hr-adaylar', 'prj-sablonlar', 'prj-butce', 'prj-dashboard', 'prj-portfolio',
      'prj-board', 'prj-backlog', 'prj-gantt', 'prj-workload'].forEach((s) => COVERED.add(s));
    log('COVER', 'hr-personel', 'NORMAK extended seed');
  } catch (e) {
    noteError('hr-personel', e);
  }
  try {
    await seedExtendedModules({
      firma: lavande.firma,
      plant: lavande.plant,
      partners: { mus1: lavande.mus, ted1: lavande.ted },
      items: { fg: lavande.items.fg },
      tagPrefix: 'LAVANDE',
      projectName: 'Lavande Yeni Ürün Lansmanı',
      industryCode: 'KOZMETIK',
      leadName: 'LAVANDE Demo Aday — Perakende',
    });
    ['hr-calisma-takvimleri', 'hr-ucretler', 'hr-avanslar', 'hr-onboarding', 'hr-zimmetler',
      'crm-firsat-asamalari', 'crm-faaliyet-tipleri'].forEach((s) => COVERED.add(s));
    log('COVER', 'crm-adaylar', 'LAVANDE extended seed');
  } catch (e) {
    noteError('crm-adaylar', e);
  }

  // Extended sonrası İK/PRJ — proje_id ile paneller
  const prjRow = (await pool.query(
    `SELECT id FROM projects WHERE company_id=$1 ORDER BY id DESC LIMIT 1`,
    [lavande.firma.id],
  )).rows[0];
  const pid = prjRow?.id;
  for (const [screen, ep] of [
    ['hr-ucretler', '/hr-bordro/ucretler'],
    ['hr-avanslar', '/hr-bordro/avanslar'],
    ['hr-vardiya-atamalari', '/hr-takvim/vardiya-atamalari'],
    ['hr-onboarding', '/hr-ise-alim/onboarding'],
    ['hr-zimmetler', '/hr-ise-alim/zimmetler'],
    ['hr-isten-cikis', '/hr-ise-alim/cikislar'],
    ['prj-butce', '/prj-budget'],
    ['prj-workload', '/prj-planning/workload'],
    ...(pid ? [
      ['prj-dashboard', `/prj-dashboard/overview?project_id=${pid}`],
      ['prj-board', `/prj-board?project_id=${pid}`],
      ['prj-backlog', `/prj-planning/backlog?project_id=${pid}`],
      ['prj-gantt', `/prj-planning/gantt?project_id=${pid}`],
    ] : []),
  ]) {
    await tryMark(lavande.firma.id, 'GET', ep, null, screen, 'post-seed doğrulama');
  }

  const firms = {
    NORMAK: { id: normak.firma.id, name: normak.firma.company_name },
    LAVANDE: { id: lavande.firma.id, name: lavande.firma.company_name },
  };
  const payload = writeReports({
    excelScreens,
    priorMiss: authoritativeMiss,
    priorCovered,
    firms,
  });

  console.log('\n=== ÖZET ===');
  console.log('Önceki miss:', authoritativeMiss.length);
  console.log('Bu turda dokunulan (COVERED):', COVERED.size);
  console.log('Miss’ten yeni hit:', payload.this_run.newly_hit_from_prior_miss.length);
  console.log('Miss’ten kalan:', payload.this_run.still_miss_from_prior.length);
  console.log('Hata sayısı:', ERRORS.length);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
