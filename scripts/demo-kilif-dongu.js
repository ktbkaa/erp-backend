/**
 * KILIF — Silikon & plastik telefon kılıfı üretimi
 *
 * İki tam süreç:
 *  A) MRP’siz: satış teklifi → sipariş → manuel SA → mal kabul/GKK →
 *     manuel iş emri → operasyon → CKK → sevk → irsaliye → fatura
 *  B) MRP’li: bağımsız ihtiyaç + satış siparişi → MRP → SA talep → PO →
 *     mal kabul → MRP iş emri → sevk zinciri
 *
 * Master: 2 iş yeri (GM+FB), cariler, stoklar, BOM, rota, fiyat listesi, CRM.
 *
 * Kullanım:
 *   node scripts/demo-kilif-dongu.js
 *   npm run demo:kilif-dongu
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const pool = require('../db');
const { sonrakiKod, stokSeriKodundanTip, cariSeriKodundanTur } = require('../src/utils/kodUretici');
const { mrpCalistir } = require('../src/services/mrpService');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRMA_KODU = 'KILIF';
const TAG = 'KILIF-DEMO';

const summary = {
  firma: null,
  plants: {},
  warehouses: {},
  partners: {},
  items: {},
  bom: {},
  routing: {},
  crm: {},
  processA: {},
  processB: {},
  screensTouched: [],
  notes: [],
};

function log(msg) {
  console.log(msg);
}

function touch(screen) {
  if (!summary.screensTouched.includes(screen)) summary.screensTouched.push(screen);
}

async function api(method, urlPath, body, firmaId) {
  const headers = { 'Content-Type': 'application/json', 'X-Kullanici-Kodu': 'ADMIN' };
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

function purgeFirma(code) {
  log(`\n=== Purge ${code} (--also-org) ===`);
  const r = spawnSync(process.execPath, [
    path.join(__dirname, 'purge-firma-veri.js'), code, '--also-org',
  ], { cwd: path.join(__dirname, '..'), encoding: 'utf8', env: process.env });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) log(`  uyarı: purge ${code} exit=${r.status}`);
}

async function ensureWarehouse(client, plantId, code, name, role) {
  const existing = (await client.query(
    `SELECT * FROM warehouses WHERE plant_id=$1 AND warehouse_code=$2`,
    [plantId, code]
  )).rows[0];
  if (existing) {
    await client.query(
      `UPDATE warehouses SET warehouse_rolu=$2, warehouse_name=$3, is_active=TRUE WHERE id=$1`,
      [existing.id, role, name]
    );
    return (await client.query(`SELECT * FROM warehouses WHERE id=$1`, [existing.id])).rows[0];
  }
  return (await client.query(
    `INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, warehouse_rolu, is_active, varsayilan)
     VALUES ($1,$2,$3,$4,TRUE,FALSE) RETURNING *`,
    [plantId, code, name, role]
  )).rows[0];
}

async function linkItemPlants(client, itemId, plantIds, companyId, params = {}) {
  for (const pid of plantIds) {
    await client.query(
      `INSERT INTO item_plants (item_id, plant_id, is_active)
       VALUES ($1,$2,TRUE)
       ON CONFLICT (item_id, plant_id) DO UPDATE SET is_active=TRUE`,
      [itemId, pid]
    );
    await client.query(
      `INSERT INTO item_company_params (item_id, company_id, plant_id, is_active, sales_price, purchase_uom, sales_uom)
       VALUES ($1,$2,$3,TRUE,$4,$5,$5)
       ON CONFLICT DO NOTHING`,
      [itemId, companyId, pid, params.sales_price || 0, params.uom || 'AD']
    ).catch(async () => {
      await client.query(
        `INSERT INTO item_company_params (item_id, company_id, plant_id, is_active, sales_price)
         SELECT $1,$2,$3,TRUE,$4
         WHERE NOT EXISTS (
           SELECT 1 FROM item_company_params
           WHERE item_id=$1 AND company_id=$2 AND plant_id IS NOT DISTINCT FROM $3
         )`,
        [itemId, companyId, pid, params.sales_price || 0]
      );
    });
  }
  // Firma geneli (plant null) parametre — UI modeli
  await client.query(
    `INSERT INTO item_company_params (item_id, company_id, plant_id, is_active, sales_price)
     SELECT $1,$2,NULL,TRUE,$3
     WHERE NOT EXISTS (
       SELECT 1 FROM item_company_params
       WHERE item_id=$1 AND company_id=$2 AND plant_id IS NULL
     )`,
    [itemId, companyId, params.sales_price || 0]
  ).catch(() => null);
}

async function createItem(client, {
  name, type, price, companyId, plantIds, girisWh, cikisWh, qc = false, uom = 'AD', safety = 0,
}) {
  const kod = await sonrakiKod(client, stokSeriKodundanTip(type));
  const tedarikType = type === 'Mamul' || type === 'YariMamul' ? 'Uretim' : 'Satinalma';
  const row = (await client.query(
    `INSERT INTO items (
       item_code, item_name, uom_code, stock_takip_uom, sales_price, item_type, tedarik_type,
       is_active, company_id, varsayilan_giris_warehouse_id, varsayilan_cikis_warehouse_id,
       kalite_control_gerekli, description, temin_suresi_days, safety_stock, min_stock, class_code
     ) VALUES ($1,$2,$3,$3,$4,$5,$6,TRUE,$7,$8,$9,$10,$11,$12,$13,$13,$14)
     RETURNING *`,
    [
      kod, name, uom, price || 0, type, tedarikType, companyId,
      girisWh || null, cikisWh || null, qc,
      `[${TAG}] ${name}`,
      type === 'Hammadde' || type === 'Sarf' ? 5 : 0,
      safety,
      type === 'Sarf' ? 'SARF' : null,
    ]
  )).rows[0];
  await linkItemPlants(client, row.id, plantIds, companyId, { sales_price: price, uom });
  const whIds = [...new Set([girisWh, cikisWh].filter(Boolean))];
  for (const wid of whIds) {
    const plantId = (await client.query(`SELECT plant_id FROM warehouses WHERE id=$1`, [wid])).rows[0]?.plant_id;
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       VALUES ($1,$2,$3,TRUE)
       ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
      [row.id, wid, plantId || null]
    );
  }
  touch('stok-karti');
  return row;
}

/** Mal kabul GKK yolu Giriş deposuna yazar — stokları o depoya da bağla */
async function linkItemsToPlantWarehouses(client, itemIds, warehouseIds, plantId) {
  for (const itemId of itemIds) {
    for (const wid of warehouseIds) {
      if (!wid) continue;
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
         VALUES ($1,$2,$3,TRUE)
         ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
        [itemId, wid, plantId]
      );
    }
  }
}

async function createPartner(client, { name, type, companyId, plantId, email }) {
  const kod = await sonrakiKod(client, cariSeriKodundanTur(type));
  touch('cari-kartlari');
  return (await client.query(
    `INSERT INTO partners (
       partner_code, partner_name, partner_type, telefon, email, il, country, currency_code,
       payment_due_days, is_active, company_id, plant_id, notlar
     ) VALUES ($1,$2,$3,$4,$5,'İstanbul','TR','TRY',30,TRUE,$6,$7,$8)
     RETURNING *`,
    [kod, name, type, '02165558800', email || `${kod.toLowerCase()}@kilif.demo`, companyId, plantId, TAG]
  )).rows[0];
}

async function grantUserFirma(client, companyId) {
  const hasTable = (await client.query(`SELECT to_regclass('public.user_company_permissions') AS t`)).rows[0]?.t;
  if (!hasTable) return;
  const users = (await client.query(`SELECT id, user_code FROM users ORDER BY id LIMIT 10`)).rows;
  for (const u of users) {
    try {
      await client.query(
        `INSERT INTO user_company_permissions (kisi_id, company_id)
         SELECT $1,$2 WHERE NOT EXISTS (
           SELECT 1 FROM user_company_permissions WHERE kisi_id=$1 AND company_id=$2
         )`,
        [u.id, companyId]
      );
    } catch (err) {
      log(`  yetki atlandı ${u.user_code}: ${err.message}`);
    }
  }
}

async function onaylaGirisKontrol(firmaId, mkId, hedefHammaddeDepoId) {
  touch('giris-kontrolleri');
  touch('kk-emirleri');
  const r = await pool.query(
    `SELECT * FROM incoming_inspections WHERE goods_receipt_id=$1 ORDER BY id`,
    [mkId]
  );
  const docs = r.rows.filter((d) => d.status === 'Acik');
  const inspIds = [];
  for (const d of docs) {
    await api('POST', `/giris-kontrolleri/${d.id}/onayla`, {}, firmaId);
    log(`  giriş kontrol onay: ${d.inspection_no || d.id}`);
    inspIds.push(d.id);
  }
  const allInsp = r.rows.map((d) => d.id);
  const ids = [...new Set([...inspIds, ...allInsp])];
  if (!ids.length) return;
  const kk = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='GKK'
       AND status NOT IN ('Onayli','Kapali','Red')
       AND source_type='GIRIS_KONTROL'
       AND source_id = ANY($1::int[])
     ORDER BY id`,
    [ids]
  );
  for (const e of kk.rows) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity,
        rejected_quantity: 0,
        target_warehouse_id: hedefHammaddeDepoId || e.target_warehouse_id,
        description: `[${TAG}] GKK onay`,
      }, firmaId);
      log(`  KK onay: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  KK atlandı ${e.order_no || e.id}: ${err.message}`);
    }
  }
}

async function seedOrg(client) {
  log('\n=== KILIF firma + iş yerleri + depolar ===');
  touch('companies');
  touch('is-yerleri');
  touch('warehouses');
  let firma = (await client.query(`SELECT * FROM companies WHERE company_code=$1`, [FIRMA_KODU])).rows[0];
  if (!firma) {
    firma = (await client.query(
      `INSERT INTO companies (company_code, company_name, tax_id, address)
       VALUES ($1,$2,'9988776655','Gebze / Kocaeli — Organize Sanayi') RETURNING *`,
      [FIRMA_KODU, 'CaseForm Silikon & Plastik Kılıf A.Ş.']
    )).rows[0];
  } else {
    await client.query(
      `UPDATE companies SET company_name=$2, address=$3 WHERE id=$1`,
      [firma.id, 'CaseForm Silikon & Plastik Kılıf A.Ş.', 'Gebze / Kocaeli — Organize Sanayi']
    );
    firma = (await client.query(`SELECT * FROM companies WHERE id=$1`, [firma.id])).rows[0];
  }

  async function ensurePlant(code, name) {
    let p = (await client.query(
      `SELECT * FROM plants WHERE company_id=$1 AND plant_code=$2`, [firma.id, code]
    )).rows[0];
    if (!p) {
      p = (await client.query(
        `INSERT INTO plants (company_id, plant_code, plant_name, address)
         VALUES ($1,$2,$3,'Gebze / Kocaeli') RETURNING *`,
        [firma.id, code, name]
      )).rows[0];
    }
    return p;
  }

  const gm = await ensurePlant('KILIF-GM', 'Genel Merkez / Satış');
  const fb = await ensurePlant('KILIF-FB', 'Kılıf Fabrikası');

  const gmSarf = await ensureWarehouse(client, gm.id, 'GM-SARF', 'Merkez Sarf', 'Normal');
  const gmMam = await ensureWarehouse(client, gm.id, 'GM-MAM', 'Merkez Mamul Showroom', 'Mamul');
  const fbGiris = await ensureWarehouse(client, fb.id, 'FB-GIRIS', 'Fabrika Giriş', 'Giris');
  const fbGkk = await ensureWarehouse(client, fb.id, 'FB-GKK', 'Fabrika GKK', 'GKK');
  const fbHmd = await ensureWarehouse(client, fb.id, 'FB-HMD', 'Fabrika Hammadde', 'Hammadde');
  const fbMam = await ensureWarehouse(client, fb.id, 'FB-MAM', 'Fabrika Mamul', 'Mamul');
  const fbCkk = await ensureWarehouse(client, fb.id, 'FB-CKK', 'Fabrika CKK', 'CKK');
  const fbAna = await ensureWarehouse(client, fb.id, 'FB-ANA', 'Fabrika WIP / Ana', 'Normal');

  let wcInj = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 AND center_code=$2`, [fb.id, 'KILIF-ENJ']
  )).rows[0];
  if (!wcInj) {
    wcInj = (await client.query(
      `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
       VALUES ($1,'KILIF-ENJ','Enjeksiyon / Kalıp Hattı',TRUE) RETURNING *`,
      [fb.id]
    )).rows[0];
  }
  let wcFin = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 AND center_code=$2`, [fb.id, 'KILIF-FIN']
  )).rows[0];
  if (!wcFin) {
    wcFin = (await client.query(
      `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
       VALUES ($1,'KILIF-FIN','Baskı & Paket Hattı',TRUE) RETURNING *`,
      [fb.id]
    )).rows[0];
  }
  touch('is-merkezleri');

  await grantUserFirma(client, firma.id);

  summary.firma = { id: firma.id, code: firma.company_code, name: firma.company_name };
  summary.plants = {
    gm: { id: gm.id, code: gm.plant_code, name: gm.plant_name },
    fb: { id: fb.id, code: fb.plant_code, name: fb.plant_name },
  };
  summary.warehouses = {
    gmSarf: gmSarf.warehouse_code,
    fbGiris: fbGiris.warehouse_code,
    fbGkk: fbGkk.warehouse_code,
    fbHmd: fbHmd.warehouse_code,
    fbMam: fbMam.warehouse_code,
    fbCkk: fbCkk.warehouse_code,
  };

  return {
    firma, gm, fb, wcInj, wcFin,
    wh: { gmSarf, gmMam, fbGiris, fbGkk, fbHmd, fbMam, fbCkk, fbAna },
  };
}

async function createBomAndRoute(client, {
  fg, comps, firma, plantId, whHmd, whMam, wcInj, wcFin, label,
}) {
  touch('urun-agaci');
  touch('routings');
  const bomCode = await sonrakiKod(client, 'URUN_AGACI').catch(() => `UA-${label}-${Date.now()}`);
  const bom = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alt_no, bom_type, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes, design_department
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','Onayli',TRUE,TRUE,$6,$7,'Uretim')
     RETURNING *`,
    [fg.id, bomCode, `${fg.item_name} Ağacı`, firma.id, plantId, whMam, TAG]
  )).rows[0];

  let lineNo = 10;
  for (const [st, qty] of comps) {
    await client.query(
      `INSERT INTO bom_lines (
         product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
         scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
       ) VALUES ($1,$2,$3,$4,'AD',$4,$4,2,'Net',$5,'Malzeme',TRUE)`,
      [bom.id, lineNo, st.id, qty, whHmd]
    );
    lineNo += 10;
  }

  const routeCode = await sonrakiKod(client, 'ROTA').catch(() => `RT-${label}-${Date.now()}`);
  const rota = (await client.query(
    `INSERT INTO routings (
       item_id, product_bom_id, route_code, route_name, template, varsayilan,
       company_id, plant_id, route_type, alt_no, is_active, notes
     ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7)
     RETURNING *`,
    [fg.id, bom.id, routeCode, `${fg.item_name} Rotası`, firma.id, plantId, TAG]
  )).rows[0];

  const ops = [
    { line: 10, code: 'OP10', name: 'Kalıp / Enjeksiyon', time: 12, wc: wcInj.id },
    { line: 20, code: 'OP20', name: 'Soğutma & Çapak Alma', time: 8, wc: wcInj.id },
    { line: 30, code: 'OP30', name: 'UV / Logo Baskı', time: 10, wc: wcFin.id },
    { line: 40, code: 'OP40', name: 'Paket & Etiket', time: 6, wc: wcFin.id },
  ];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const next = ops[i + 1]?.line || null;
    const isLast = i === ops.length - 1;
    await client.query(
      `INSERT INTO routing_operations (
         route_id, line_no, operation_code, operation_name, work_center_id,
         sure_dk, sonraki_line_no, op_time, op_time_uom, output_item_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$6,'DK',$8)`,
      [rota.id, op.line, op.code, op.name, op.wc, op.time, next, isLast ? fg.id : null]
    );
  }
  return { bom, rota };
}

async function seedMaster(client, org) {
  log('\n=== Master: cari + stok + BOM + rota + fiyat + CRM ===');
  const { firma, gm, fb, wh, wcInj, wcFin } = org;
  const both = [gm.id, fb.id];

  const tedSilikon = await createPartner(client, {
    name: 'Anadolu Silikon Kimya A.Ş.', type: 'Tedarikci', companyId: firma.id, plantId: fb.id,
  });
  const tedPlastik = await createPartner(client, {
    name: 'Marmara Polimer Pelet Ltd.', type: 'Tedarikci', companyId: firma.id, plantId: fb.id,
  });
  const tedAmbalaj = await createPartner(client, {
    name: 'PaketPro Ambalaj San.', type: 'Tedarikci', companyId: firma.id, plantId: fb.id,
  });
  const musTekno = await createPartner(client, {
    name: 'TeknoMarket Zincir Mağazacılık A.Ş.', type: 'Musteri', companyId: firma.id, plantId: gm.id,
    email: 'siparis@teknomarket.demo',
  });
  const musExport = await createPartner(client, {
    name: 'EuroCase Distribution GmbH', type: 'Musteri', companyId: firma.id, plantId: gm.id,
    email: 'buy@eurocase.demo',
  });

  // Hammaddeler
  const hmSilikon = await createItem(client, {
    name: 'Sıvı Silikon Granül (Shore A 40)', type: 'Hammadde', price: 85,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true, safety: 20,
  });
  const hmTpu = await createItem(client, {
    name: 'TPU / ABS Plastik Pelet', type: 'Hammadde', price: 62,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true, safety: 25,
  });
  const hmMurekkep = await createItem(client, {
    name: 'UV Baskı Mürekkebi Seti', type: 'Hammadde', price: 140,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true, safety: 5,
  });
  const hmPoşet = await createItem(client, {
    name: 'OPP Ambalaj Poşeti', type: 'Hammadde', price: 2.5,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: false, safety: 100,
  });

  // Mamuller
  const fgSilikon = await createItem(client, {
    name: 'Silikon iPhone 15 Pro Kılıfı (Siyah)', type: 'Mamul', price: 249,
    companyId: firma.id, plantIds: both, girisWh: wh.fbMam.id, cikisWh: wh.fbMam.id, qc: false, safety: 10,
  });
  const fgPlastik = await createItem(client, {
    name: 'Sert Plastik Galaxy S24 Kılıfı (Şeffaf)', type: 'Mamul', price: 189,
    companyId: firma.id, plantIds: both, girisWh: wh.fbMam.id, cikisWh: wh.fbMam.id, qc: false, safety: 10,
  });
  await client.query(
    `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
     VALUES ($1,$2,$3,TRUE) ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
    [fgSilikon.id, wh.gmMam.id, gm.id]
  );
  await client.query(
    `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
     VALUES ($1,$2,$3,TRUE) ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
    [fgPlastik.id, wh.gmMam.id, gm.id]
  );

  // Sarf — yalnız merkez
  const sarfEtiket = await createItem(client, {
    name: 'Barkod / Ürün Etiketi Rulosu', type: 'Sarf', price: 45,
    companyId: firma.id, plantIds: [gm.id], girisWh: wh.gmSarf.id, cikisWh: wh.gmSarf.id, qc: false,
  });
  const sarfTemizlik = await createItem(client, {
    name: 'Kalıp Temizlik Spreyi', type: 'Sarf', price: 75,
    companyId: firma.id, plantIds: [gm.id], girisWh: wh.gmSarf.id, cikisWh: wh.gmSarf.id, qc: false,
  });

  const bomSilikon = await createBomAndRoute(client, {
    fg: fgSilikon,
    comps: [[hmSilikon, 0.045], [hmMurekkep, 0.01], [hmPoşet, 1]],
    firma, plantId: fb.id, whHmd: wh.fbHmd.id, whMam: wh.fbMam.id, wcInj, wcFin, label: 'SIL',
  });
  const bomPlastik = await createBomAndRoute(client, {
    fg: fgPlastik,
    comps: [[hmTpu, 0.038], [hmMurekkep, 0.008], [hmPoşet, 1]],
    firma, plantId: fb.id, whHmd: wh.fbHmd.id, whMam: wh.fbMam.id, wcInj, wcFin, label: 'PLA',
  });

  // Hammadde / mamul → Giriş+GKK+HMD (mal kabul / GKK yolu)
  await linkItemsToPlantWarehouses(client, [
    hmSilikon.id, hmTpu.id, hmMurekkep.id, hmPoşet.id,
  ], [wh.fbGiris.id, wh.fbGkk.id, wh.fbHmd.id], fb.id);
  await linkItemsToPlantWarehouses(client, [
    fgSilikon.id, fgPlastik.id,
  ], [wh.fbMam.id, wh.fbCkk.id, wh.gmMam.id], fb.id);

  // Fiyat listesi — aynı transaction (API ayrı bağlantı görmez)
  touch('fiyat-listeleri');
  const flKod = `FL-${FIRMA_KODU}`;
  let priceList = (await client.query(
    `INSERT INTO price_lists (list_code, list_name, currency_code, is_active)
     VALUES ($1,$2,'TRY',TRUE)
     ON CONFLICT (list_code) DO UPDATE SET list_name=EXCLUDED.list_name, is_active=TRUE
     RETURNING *`,
    [flKod, 'CaseForm Perakende 2026']
  ).catch(async () => client.query(
    `INSERT INTO price_lists (list_code, list_name, currency_code, is_active)
     VALUES ($1,$2,'TRY',TRUE) RETURNING *`,
    [flKod, 'CaseForm Perakende 2026']
  ))).rows[0];
  if (!priceList) {
    priceList = (await client.query(`SELECT * FROM price_lists WHERE list_code=$1`, [flKod])).rows[0];
  }
  for (const [itemId, price] of [[fgSilikon.id, 249], [fgPlastik.id, 189]]) {
    await client.query(
      `INSERT INTO price_list_lines (list_id, item_id, min_quantity, unit_price, discount_rate)
       SELECT $1,$2,0,$3,0
       WHERE NOT EXISTS (
         SELECT 1 FROM price_list_lines WHERE list_id=$1 AND item_id=$2
       )`,
      [priceList.id, itemId, price]
    );
  }

  summary.partners = {
    tedSilikon: tedSilikon.partner_code,
    tedPlastik: tedPlastik.partner_code,
    tedAmbalaj: tedAmbalaj.partner_code,
    musTekno: musTekno.partner_code,
    musExport: musExport.partner_code,
  };
  summary.items = {
    hmSilikon: hmSilikon.item_code,
    hmTpu: hmTpu.item_code,
    hmMurekkep: hmMurekkep.item_code,
    hmPoşet: hmPoşet.item_code,
    fgSilikon: fgSilikon.item_code,
    fgPlastik: fgPlastik.item_code,
    sarfEtiket: sarfEtiket.item_code,
    sarfTemizlik: sarfTemizlik.item_code,
  };
  summary.bom = {
    silikon: { id: bomSilikon.bom.id, code: bomSilikon.bom.bom_code },
    plastik: { id: bomPlastik.bom.id, code: bomPlastik.bom.bom_code },
  };
  summary.routing = {
    silikon: { id: bomSilikon.rota.id, code: bomSilikon.rota.route_code },
    plastik: { id: bomPlastik.rota.id, code: bomPlastik.rota.route_code },
  };
  summary.crm = {
    price_list: priceList?.list_code || priceList?.id || null,
  };

  return {
    tedSilikon, tedPlastik, tedAmbalaj, musTekno, musExport,
    hmSilikon, hmTpu, hmMurekkep, hmPoşet,
    fgSilikon, fgPlastik, sarfEtiket, sarfTemizlik,
    bomSilikon, bomPlastik, priceList,
  };
}

/** CRM kayıtları — master commit sonrası (FK görünürlüğü) */
async function seedCrm(firmaId, gmId, master) {
  log('\n=== CRM: aday / kontak / fırsat / faaliyet ===');
  touch('crm-adaylar');
  touch('crm-kontaklar');
  touch('crm-firsatlar');
  touch('crm-faaliyetler');
  let lead = null;
  let contact = null;
  let opportunity = null;
  try {
    lead = await api('POST', '/crm-adaylar', {
      lead_name: 'TeknoMarket — Silikon kılıf ihalesi',
      company_name: 'TeknoMarket Zincir Mağazacılık A.Ş.',
      email: 'satinalma@teknomarket.demo',
      phone: '02165550011',
      source: 'Fuar',
      status: 'Yeni',
      company_id: firmaId,
      description: `[${TAG}] Aday müşteri`,
    }, firmaId);
    log(`  aday: ${lead.lead_code || lead.id}`);
  } catch (err) {
    log(`  CRM aday: ${err.message}`);
  }
  try {
    contact = await api('POST', '/crm-kontaklar', {
      first_name: 'Ayşe',
      last_name: 'Yılmaz',
      email: 'ayse.yilmaz@teknomarket.demo',
      telefon: '05321234567',
      partner_id: master.musTekno.id,
      title: 'Satınalma Müdürü',
    }, firmaId);
    log(`  kontak: ${contact.kontak_code || contact.id}`);
  } catch (err) {
    log(`  CRM kontak: ${err.message}`);
  }
  try {
    const stages = await api('GET', '/crm-firsat-asamalari', null, firmaId).catch(() => []);
    const stageId = Array.isArray(stages) && stages[0] ? stages[0].id : null;
    opportunity = await api('POST', '/crm-firsatlar', {
      firsat_name: 'TeknoMarket Q1 Silikon Kılıf Siparişi',
      partner_id: master.musTekno.id,
      stage_id: stageId,
      beklenen_gelir: 249 * 500,
      currency_code: 'TRY',
      company_id: firmaId,
      plant_id: gmId,
      customer_type: 'Musteri',
      description: `[${TAG}] Fırsat — silikon kılıf`,
    }, firmaId);
    log(`  fırsat: ${opportunity.firsat_code || opportunity.id}`);
  } catch (err) {
    log(`  CRM fırsat: ${err.message}`);
  }
  try {
    const types = await api('GET', '/crm-faaliyet-tipleri', null, firmaId).catch(() => []);
    const typeId = Array.isArray(types) && types[0] ? types[0].id : null;
    await api('POST', '/crm-faaliyetler', {
      konu: 'TeknoMarket fiyat görüşmesi',
      description: `[${TAG}] Faaliyet`,
      partner_id: master.musTekno.id,
      firsat_id: opportunity?.id || null,
      faaliyet_type_id: typeId,
      customer_type: 'Musteri',
      plant_id: gmId,
    }, firmaId);
    log('  faaliyet: ok');
  } catch (err) {
    log(`  CRM faaliyet: ${err.message}`);
  }
  summary.crm = {
    ...summary.crm,
    lead: lead?.lead_code || lead?.id || null,
    contact: contact?.kontak_code || contact?.id || null,
    opportunity: opportunity?.firsat_code || opportunity?.id || null,
  };
}

async function runPurchaseQc(firmaId, plantId, partnerId, warehouseId, lines, desc, { expectQc }) {
  touch('satin-alma-siparisleri');
  touch('mal-kabuller');
  const po = await api('POST', '/satin-alma-siparisleri', {
    partner_id: partnerId,
    plant_id: plantId,
    company_id: firmaId,
    warehouse_id: warehouseId,
    status: 'Taslak',
    order_date: new Date().toISOString().slice(0, 10),
    description: `[${TAG}] ${desc}`,
    currency_code: 'TRY',
    satirlar: lines.map((l, i) => ({
      item_id: l.item_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      uom_code: 'AD',
      line_no: (i + 1) * 10,
    })),
  }, firmaId);
  await api('POST', `/satin-alma-siparisleri/${po.id}/onayla`, {}, firmaId).catch((e) => log(`  PO onay: ${e.message}`));

  const mk = await api('POST', '/mal-kabuller', {
    purchase_order_id: po.id,
    company_id: firmaId,
    description: `[${TAG}] ${desc} mal kabul`,
    gkk_gerekli: expectQc,
  }, firmaId);

  const mkFull = await api('GET', `/mal-kabuller/${mk.id || mk}`, null, firmaId).catch(() => mk);
  const gkkFlag = mkFull.gkk_gerekli;
  log(`  mal kabul ${mkFull.receipt_no || mk.id}: gkk_gerekli=${gkkFlag} (beklenen QC=${expectQc})`);
  if (expectQc && gkkFlag) {
    await onaylaGirisKontrol(firmaId, mkFull.id || mk.id, warehouseId);
  }
  return { po, mk: mkFull, gkk: gkkFlag };
}

async function runProduction(firmaId, {
  fg, bom, rota, plantId, wh, qty, salesOrderId, label,
}) {
  touch('uretim-emirleri');
  touch('kk-emirleri');
  let ue;
  try {
    ue = await api('POST', '/uretim-emirleri', {
      item_id: fg.id,
      product_bom_id: bom.id,
      route_id: rota.id,
      plant_id: plantId,
      company_id: firmaId,
      component_warehouse_id: wh.fbHmd.id,
      fg_warehouse_id: wh.fbMam.id,
      wip_warehouse_id: wh.fbAna.id,
      planlanan_quantity: qty,
      sales_order_id: salesOrderId || null,
      planli_kesin: 'Kesin',
      description: `[${TAG}] ${label}`,
      order_date: new Date().toISOString().slice(0, 10),
    }, firmaId);
  } catch (err) {
    log(`  UE oluşturma: ${err.message}`);
    ue = await api('POST', '/uretim-emirleri', {
      item_id: fg.id,
      product_bom_id: bom.id,
      route_id: rota.id,
      plant_id: plantId,
      company_id: firmaId,
      component_warehouse_id: wh.fbHmd.id,
      fg_warehouse_id: wh.fbMam.id,
      planlanan_quantity: qty,
      description: `[${TAG}] ${label}`,
    }, firmaId);
  }
  await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, firmaId).catch((e) => log(`  UE onay: ${e.message}`));
  await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, firmaId).catch((e) => log(`  UE başlat: ${e.message}`));
  for (let i = 0; i < 4; i++) {
    try {
      await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { quantity: qty }, firmaId);
      log(`  op tamam ${i + 1}`);
    } catch (err) {
      log(`  op ${i + 1}: ${err.message}`);
      break;
    }
  }
  const ckkEmir = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='CKK' AND status NOT IN ('Onayli','Kapali','Red')
       AND (source_id=$1 OR description ILIKE '%' || $2 || '%')
     ORDER BY id DESC LIMIT 20`,
    [ue.id, TAG]
  );
  for (const e of ckkEmir.rows) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity,
        rejected_quantity: 0,
        target_warehouse_id: wh.fbMam.id,
        description: `[${TAG}] CKK onay → Mamul`,
      }, firmaId);
      log(`  CKK onay: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  CKK atlandı ${e.order_no || e.id}: ${err.message}`);
    }
  }
  return ue;
}

async function runShipInvoice(firmaId, {
  so, partnerId, fg, qty, plantId, whMam, unitPrice, label,
}) {
  touch('sevk-emirleri');
  touch('irsaliyeler');
  touch('satis-faturalari');
  let sevk = null;
  let irs = null;
  let fatura = null;
  try {
    sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      warehouse_id: whMam,
      plant_id: plantId,
    }, firmaId);
    log(`  sevk: ${sevk.shipment_no || sevk.id}`);
  } catch (err) {
    log(`  sevk atlandı: ${err.message}`);
  }
  try {
    if (sevk?.id) {
      irs = await api('POST', '/delivery_notes/sevk-emrinden', {
        shipment_order_id: sevk.id,
        warehouse_id: whMam,
      }, firmaId);
    } else {
      irs = await api('POST', '/delivery_notes', {
        partner_id: partnerId,
        warehouse_id: whMam,
        plant_id: plantId,
        company_id: firmaId,
        sales_order_id: so.id,
        description: `[${TAG}] ${label}`,
        satirlar: [{ item_id: fg.id, quantity: qty, uom_code: 'AD' }],
      }, firmaId);
    }
    if (irs?.id) {
      await api('PUT', `/delivery_notes/${irs.id}`, {
        ship_district: 'Kadıköy',
        ship_postal_code: '34710',
        ship_city: 'İstanbul',
        ship_address: 'Perakende Cad. No:12',
        carrier_title: 'CaseForm Lojistik A.Ş.',
        carrier_tax_id: '2222222222',
        driver_name: 'Mehmet',
        driver_last_name: 'Demir',
        driver_national_id: '12345678901',
        description: `[${TAG}] ${label}`,
      }, firmaId).catch((e) => log(`  irs güncelle: ${e.message}`));
      await api('POST', `/delivery_notes/${irs.id}/onayla`, {}, firmaId).catch((e) => log(`  irs onay: ${e.message}`));
      try {
        fatura = await api('POST', `/delivery_notes/${irs.id}/fatura-olustur`, {
          description: `[${TAG}] ${label} fatura`,
        }, firmaId);
      } catch (e) {
        fatura = await api('POST', '/invoices', {
          partner_id: partnerId,
          company_id: firmaId,
          plant_id: plantId,
          description: `[${TAG}] ${label} fatura`,
          kalemler: [{ item_id: fg.id, quantity: qty, unit_price: unitPrice }],
        }, firmaId);
      }
    }
  } catch (err) {
    log(`  irsaliye/fatura: ${err.message}`);
  }
  return { sevk, irs, fatura };
}

/** Süreç A — MRP’siz: sert plastik kılıf (manuel planlama) */
async function runProcessA(org, master) {
  log('\n=== Süreç A (MRP’siz): Plastik Galaxy kılıf — manuel SA + UE ===');
  const { firma, fb, gm, wh } = org;
  const fid = firma.id;
  const qty = 200;

  // Satış teklifi
  touch('satis-teklifleri');
  let teklif = null;
  try {
    teklif = await api('POST', '/satis-teklifleri', {
      partner_id: master.musExport.id,
      plant_id: gm.id,
      company_id: fid,
      quotation_date: new Date().toISOString().slice(0, 10),
      description: `[${TAG}] Plastik kılıf teklifi — EuroCase`,
      currency_code: 'TRY',
      kalemler: [{
        item_id: master.fgPlastik.id,
        quantity: qty,
        unit_price: 189,
        uom_code: 'AD',
      }],
    }, fid);
    log(`  teklif: ${teklif.quotation_no || teklif.id}`);
  } catch (err) {
    log(`  teklif atlandı: ${err.message}`);
  }

  // Satış siparişi (manuel)
  touch('satis-siparisleri');
  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: master.musExport.id,
    plant_id: fb.id,
    company_id: fid,
    order_date: new Date().toISOString().slice(0, 10),
    description: `[${TAG}] EuroCase plastik kılıf siparişi (MRP’siz)`,
    currency_code: 'TRY',
    kalemler: [{
      item_id: master.fgPlastik.id,
      quantity: qty,
      unit_price: 189,
      uom_code: 'AD',
    }],
  }, fid);
  log(`  SO: ${so.order_no || so.id}`);

  // Manuel satınalma — BOM ihtiyaçlarının kabaca 1.1 katı
  const buy = await runPurchaseQc(fid, fb.id, master.tedPlastik.id, wh.fbHmd.id, [
    { item_id: master.hmTpu.id, quantity: Math.ceil(qty * 0.038 * 1.15), unit_price: 62 },
    { item_id: master.hmMurekkep.id, quantity: Math.ceil(qty * 0.008 * 1.2), unit_price: 140 },
    { item_id: master.hmPoşet.id, quantity: Math.ceil(qty * 1.05), unit_price: 2.5 },
  ], 'Plastik kılıf hammaddeleri (manuel)', { expectQc: true });

  // Sarf (merkez) — QC yok
  const sarf = await runPurchaseQc(fid, gm.id, master.tedAmbalaj.id, wh.gmSarf.id, [
    { item_id: master.sarfEtiket.id, quantity: 5, unit_price: 45 },
    { item_id: master.sarfTemizlik.id, quantity: 3, unit_price: 75 },
  ], 'Sarf (etiket/temizlik) — merkez', { expectQc: false });

  const ue = await runProduction(fid, {
    fg: master.fgPlastik,
    bom: master.bomPlastik.bom,
    rota: master.bomPlastik.rota,
    plantId: fb.id,
    wh,
    qty,
    salesOrderId: so.id,
    label: 'Plastik kılıf iş emri (manuel)',
  });

  const ship = await runShipInvoice(fid, {
    so,
    partnerId: master.musExport.id,
    fg: master.fgPlastik,
    qty,
    plantId: fb.id,
    whMam: wh.fbMam.id,
    unitPrice: 189,
    label: 'Plastik kılıf sevk',
  });

  summary.processA = {
    mode: 'MRP_SIZ',
    product: master.fgPlastik.item_code,
    qty,
    quotation: teklif?.quotation_no || teklif?.id || null,
    sales_order: so.order_no || so.id,
    purchase_order: buy.po.order_no || buy.po.id,
    goods_receipt: buy.mk.receipt_no || buy.mk.id,
    gkk: buy.gkk,
    sarf_po: sarf.po.order_no || sarf.po.id,
    production_order: ue.order_no || ue.id,
    shipment: ship.sevk?.shipment_no || ship.sevk?.id || null,
    delivery_note: ship.irs?.delivery_note_no || ship.irs?.id || null,
    invoice: ship.fatura?.invoice_no || ship.fatura?.fatura?.invoice_no || ship.fatura?.id || null,
  };
}

/** Süreç B — MRP’li: silikon kılıf */
async function runProcessB(org, master) {
  log('\n=== Süreç B (MRP’li): Silikon iPhone kılıf — BI + MRP → talep/UE ===');
  const { firma, fb, wh } = org;
  const fid = firma.id;
  const qty = 500;

  touch('satis-siparisleri');
  touch('mrp-bagimsiz-ihtiyac');
  touch('mrp-sonuclari');
  touch('satin-alma-talepleri');

  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: master.musTekno.id,
    plant_id: fb.id,
    company_id: fid,
    order_date: new Date().toISOString().slice(0, 10),
    description: `[${TAG}] TeknoMarket silikon kılıf — MRP tetikleyici`,
    currency_code: 'TRY',
    kalemler: [{
      item_id: master.fgSilikon.id,
      quantity: qty,
      unit_price: 249,
      uom_code: 'AD',
    }],
  }, fid);
  log(`  SO: ${so.order_no || so.id}`);

  // Bağımsız ihtiyaç (API)
  const ihtiyacTarihi = new Date();
  ihtiyacTarihi.setDate(ihtiyacTarihi.getDate() + 14);
  let bi;
  try {
    bi = await api('POST', '/mrp/bagimsiz-ihtiyaclar', {
      item_id: master.fgSilikon.id,
      quantity: qty,
      uom_code: 'AD',
      ihtiyac_date: ihtiyacTarihi.toISOString().slice(0, 10),
      source: 'Manuel',
      company_id: fid,
      plant_id: fb.id,
      sales_order_id: so.id,
      description: `[${TAG}] BI silikon kılıf ${qty} adet`,
    }, fid);
  } catch (err) {
    log(`  BI API: ${err.message} — SQL fallback`);
    let biNo = `BI-KILIF-${Date.now()}`;
    const c = await pool.connect();
    try {
      biNo = await sonrakiKod(c, 'MRP_BI');
    } catch (_) { /* keep fallback */ }
    finally { c.release(); }
    bi = (await pool.query(
      `INSERT INTO mrp_independent_requirements
         (ihtiyac_no, item_id, quantity, uom_code, ihtiyac_date, source, company_id, plant_id, description, is_active, sales_order_id)
       VALUES ($1,$2,$3,'AD',$4,'Manuel',$5,$6,$7,TRUE,$8) RETURNING *`,
      [
        biNo, master.fgSilikon.id, qty, ihtiyacTarihi.toISOString().slice(0, 10),
        fid, fb.id, `[${TAG}] BI silikon kılıf`, so.id,
      ]
    )).rows[0];
  }
  log(`  BI: ${bi.ihtiyac_no || bi.id}`);

  // MRP çalıştır
  const mrp = await api('POST', '/mrp/calistir', {
    company_id: fid,
    plant_id: fb.id,
    description: `[${TAG}] Silikon kılıf MRP çalışması`,
  }, fid);
  const calisma = mrp.calisma || mrp;
  log(`  MRP: ${calisma.run_no} satır=${calisma.line_sayisi} net>0=${calisma.net_pozitif}`);

  let talep = null;
  let ueList = [];
  if (calisma?.id) {
    try {
      talep = await api('POST', '/mrp/talep-olustur', {
        run_id: calisma.id,
        plant_id: fb.id,
        company_id: fid,
      }, fid);
      log(`  MRP→SA talep: ${talep.requisition_no || talep.id}`);
    } catch (err) {
      log(`  MRP talep: ${err.message}`);
    }
    try {
      const ueResp = await api('POST', '/mrp/uretim-emri-olustur', {
        run_id: calisma.id,
        plant_id: fb.id,
        company_id: fid,
        component_warehouse_id: wh.fbHmd.id,
        fg_warehouse_id: wh.fbMam.id,
        wip_warehouse_id: wh.fbAna.id,
      }, fid);
      ueList = Array.isArray(ueResp) ? ueResp : (ueResp?.emirler || [ueResp]).filter(Boolean);
      for (const e of ueList) log(`  MRP→UE: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  MRP UE: ${err.message}`);
    }
  }

  // Talep → PO
  let poMrp = null;
  let mkMrp = null;
  const prId = talep?.id;
  if (prId) {
    try {
      await pool.query(
        `UPDATE purchase_requisitions SET status='Onayli', company_id=COALESCE(company_id,$2) WHERE id=$1`,
        [prId, fid]
      );
      const fiyatlar = {
        [master.hmSilikon.id]: 85,
        [master.hmMurekkep.id]: 140,
        [master.hmPoşet.id]: 2.5,
        [master.hmTpu.id]: 62,
      };
      poMrp = await api('POST', '/satin-alma-siparisleri/talep-donustur', {
        requisition_id: prId,
        partner_id: master.tedSilikon.id,
        birim_fiyatlar: fiyatlar,
      }, fid);
      if (poMrp?.id && poMrp.status !== 'Onayli') {
        await api('POST', `/satin-alma-siparisleri/${poMrp.id}/onayla`, {}, fid).catch(() => null);
      }
      log(`  PO (talep): ${poMrp?.order_no || poMrp?.id}`);
      if (poMrp?.id) {
        mkMrp = await api('POST', '/mal-kabuller', {
          purchase_order_id: poMrp.id,
          company_id: fid,
          description: `[${TAG}] MRP hammaddeleri mal kabul`,
          gkk_gerekli: true,
        }, fid);
        const mkFull = await api('GET', `/mal-kabuller/${mkMrp.id || mkMrp}`, null, fid).catch(() => mkMrp);
        if (mkFull.gkk_gerekli) {
          await onaylaGirisKontrol(fid, mkFull.id || mkMrp.id, wh.fbHmd.id);
        }
        mkMrp = mkFull;
      }
    } catch (err) {
      log(`  talep→PO: ${err.message}`);
      // Fallback: manuel PO
      const buy = await runPurchaseQc(fid, fb.id, master.tedSilikon.id, wh.fbHmd.id, [
        { item_id: master.hmSilikon.id, quantity: Math.ceil(qty * 0.045 * 1.2), unit_price: 85 },
        { item_id: master.hmMurekkep.id, quantity: Math.ceil(qty * 0.01 * 1.2), unit_price: 140 },
        { item_id: master.hmPoşet.id, quantity: Math.ceil(qty * 1.05), unit_price: 2.5 },
      ], 'Silikon hammadde (MRP fallback)', { expectQc: true });
      poMrp = buy.po;
      mkMrp = buy.mk;
    }
  } else {
    const buy = await runPurchaseQc(fid, fb.id, master.tedSilikon.id, wh.fbHmd.id, [
      { item_id: master.hmSilikon.id, quantity: Math.ceil(qty * 0.045 * 1.2), unit_price: 85 },
      { item_id: master.hmMurekkep.id, quantity: Math.ceil(qty * 0.01 * 1.2), unit_price: 140 },
      { item_id: master.hmPoşet.id, quantity: Math.ceil(qty * 1.05), unit_price: 2.5 },
    ], 'Silikon hammadde (MRP öneri yok — manuel)', { expectQc: true });
    poMrp = buy.po;
    mkMrp = buy.mk;
  }

  // UE yürüt
  let ueDone = ueList.find((e) => e?.id);
  if (ueDone?.id) {
    await api('POST', `/uretim-emirleri/${ueDone.id}/onayla`, {}, fid).catch(() => null);
    await api('POST', `/uretim-emirleri/${ueDone.id}/baslat`, {}, fid).catch(() => null);
    for (let i = 0; i < 4; i++) {
      try {
        await api('POST', `/uretim-emirleri/${ueDone.id}/operasyon-tamamla`, { quantity: qty }, fid);
        log(`  MRP UE op ${i + 1}`);
      } catch (err) {
        log(`  MRP UE op ${i + 1}: ${err.message}`);
        break;
      }
    }
    const ckkEmir = await pool.query(
      `SELECT * FROM qc_orders
       WHERE direction='CKK' AND status NOT IN ('Onayli','Kapali','Red')
         AND source_id=$1
       ORDER BY id DESC LIMIT 10`,
      [ueDone.id]
    );
    for (const e of ckkEmir.rows) {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity,
        rejected_quantity: 0,
        target_warehouse_id: wh.fbMam.id,
        description: `[${TAG}] CKK (MRP UE)`,
      }, fid).catch((err) => log(`  CKK: ${err.message}`));
    }
  } else {
    ueDone = await runProduction(fid, {
      fg: master.fgSilikon,
      bom: master.bomSilikon.bom,
      rota: master.bomSilikon.rota,
      plantId: fb.id,
      wh,
      qty,
      salesOrderId: so.id,
      label: 'Silikon kılıf iş emri (MRP sonrası manuel)',
    });
  }

  const ship = await runShipInvoice(fid, {
    so,
    partnerId: master.musTekno.id,
    fg: master.fgSilikon,
    qty,
    plantId: fb.id,
    whMam: wh.fbMam.id,
    unitPrice: 249,
    label: 'Silikon kılıf sevk (MRP)',
  });

  summary.processB = {
    mode: 'MRP_LI',
    product: master.fgSilikon.item_code,
    qty,
    sales_order: so.order_no || so.id,
    independent_requirement: bi.ihtiyac_no || bi.id,
    mrp_run: calisma.run_no || calisma.id,
    mrp_lines: calisma.line_sayisi,
    mrp_net_positive: calisma.net_pozitif,
    purchase_requisition: talep?.requisition_no || talep?.id || null,
    purchase_order: poMrp?.order_no || poMrp?.id || null,
    goods_receipt: mkMrp?.receipt_no || mkMrp?.id || null,
    production_order: ueDone?.order_no || ueDone?.id || null,
    shipment: ship.sevk?.shipment_no || ship.sevk?.id || null,
    delivery_note: ship.irs?.delivery_note_no || ship.irs?.id || null,
    invoice: ship.fatura?.invoice_no || ship.fatura?.fatura?.invoice_no || ship.fatura?.id || null,
  };
}

async function ensureAdminUser() {
  await pool.query(
    `INSERT INTO users (user_code, first_name, last_name, role, group_code, is_active)
     VALUES ('ADMIN','Admin','User','admin','ADMIN',TRUE)
     ON CONFLICT (user_code) DO UPDATE SET group_code='ADMIN', role='admin', is_active=TRUE`
  ).catch(async () => {
    const r = await pool.query(`SELECT id FROM users WHERE user_code='ADMIN'`);
    if (r.rows[0]) {
      await pool.query(`UPDATE users SET group_code='ADMIN', role='admin', is_active=TRUE WHERE id=$1`, [r.rows[0].id]);
    } else {
      await pool.query(
        `INSERT INTO users (user_code, first_name, last_name, role, group_code, is_active)
         VALUES ('ADMIN','Admin','User','admin','ADMIN',TRUE)`
      );
    }
  });
}

async function main() {
  await ensureAdminUser();
  // Önceki KILIF + MOBIL kalıntısını temizle (yalnız KILIF org)
  try { purgeFirma(FIRMA_KODU); } catch (e) { log(`purge ${FIRMA_KODU}: ${e.message}`); }

  const client = await pool.connect();
  let org;
  let master;
  try {
    await client.query('BEGIN');
    org = await seedOrg(client);
    master = await seedMaster(client, org);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
  client.release();

  await seedCrm(org.firma.id, org.gm.id, master);
  await runProcessA(org, master);
  await runProcessB(org, master);

  const outDir = '/opt/cursor/artifacts/kilif-demo';
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'summary.json');
  summary.generatedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  // docs kopyası
  const docsDir = path.join(__dirname, '..', 'docs', 'kilif-demo');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  log('\n=== ÖZET ===');
  log(JSON.stringify(summary, null, 2));
  log(`Yazıldı: ${outPath}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
