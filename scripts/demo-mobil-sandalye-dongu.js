/**
 * MOBIL — Tekerlekli sandalye üretimi tam döngü
 *
 * Kurgu:
 *  - Genel Merkez (MOBIL-GM) + Fabrika (MOBIL-FB) iş yerleri
 *  - Hammaddeler / mamuller / cariler / BOM / rota → her iki iş yerine bağlı
 *  - Sarf malzemeler yalnızca Genel Merkez'de; mal kabulde kaliteye uğramaz
 *  - Fabrika: SA hammadde → GKK → üretim → satış
 *
 * Kullanım:
 *   node scripts/demo-mobil-sandalye-dongu.js
 *   npm run demo:mobil-dongu
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const pool = require('../db');
const { sonrakiKod, stokSeriKodundanTip, cariSeriKodundanTur } = require('../src/utils/kodUretici');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRMA_KODU = 'MOBIL';
const TAG = 'MOBIL-DEMO';

const summary = {
  firma: null,
  plants: {},
  warehouses: {},
  partners: {},
  items: {},
  bom: null,
  routing: null,
  docs: {},
  notes: [],
};

function log(msg) {
  console.log(msg);
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

async function linkItemBothPlants(client, itemId, plantIds, companyId, params = {}) {
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
      // draft unique (plant null) vs plant unique — deneme
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
}

async function createItem(client, {
  name, type, price, companyId, plantIds, girisWh, cikisWh, qc = false, uom = 'AD',
}) {
  const kod = await sonrakiKod(client, stokSeriKodundanTip(type));
  const tedarikType = type === 'Mamul' || type === 'YariMamul' ? 'Uretim' : 'Satinalma';
  const row = (await client.query(
    `INSERT INTO items (
       item_code, item_name, uom_code, stock_takip_uom, sales_price, item_type, tedarik_type,
       is_active, company_id, varsayilan_giris_warehouse_id, varsayilan_cikis_warehouse_id,
       kalite_control_gerekli, description, temin_suresi_days, safety_stock, class_code
     ) VALUES ($1,$2,$3,$3,$4,$5,$6,TRUE,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      kod, name, uom, price || 0, type, tedarikType, companyId,
      girisWh || null, cikisWh || null, qc,
      `[${TAG}] ${name}`,
      type === 'Hammadde' || type === 'Sarf' ? 7 : 0,
      type === 'Hammadde' ? 5 : 0,
      type === 'Sarf' ? 'SARF' : null,
    ]
  )).rows[0];
  await linkItemBothPlants(client, row.id, plantIds, companyId, { sales_price: price, uom });
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
  return row;
}

async function createPartner(client, { name, type, companyId, plantId }) {
  const kod = await sonrakiKod(client, cariSeriKodundanTur(type));
  return (await client.query(
    `INSERT INTO partners (
       partner_code, partner_name, partner_type, telefon, email, il, country, currency_code,
       payment_due_days, is_active, company_id, plant_id, notlar
     ) VALUES ($1,$2,$3,$4,$5,'İstanbul','TR','TRY',30,TRUE,$6,$7,$8)
     RETURNING *`,
    [kod, name, type, '02165550100', `${kod.toLowerCase()}@mobil.demo`, companyId, plantId, TAG]
  )).rows[0];
}

async function grantUserFirma(client, companyId) {
  const hasTable = (await client.query(`SELECT to_regclass('public.user_company_permissions') AS t`)).rows[0]?.t;
  if (!hasTable) return;
  const users = (await client.query(
    `SELECT id, user_code FROM users ORDER BY id LIMIT 10`
  )).rows;
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
  // Onay sonrası oluşan GKK emirleri (source = giriş kontrol id)
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
  log('\n=== MOBIL firma + 2 iş yeri + depolar ===');
  let firma = (await client.query(`SELECT * FROM companies WHERE company_code=$1`, [FIRMA_KODU])).rows[0];
  if (!firma) {
    firma = (await client.query(
      `INSERT INTO companies (company_code, company_name, tax_id, address)
       VALUES ($1,$2,'1234567890','İstanbul / Türkiye') RETURNING *`,
      [FIRMA_KODU, 'Mobilite Tekerlekli Sandalye A.Ş.']
    )).rows[0];
  } else {
    await client.query(
      `UPDATE companies SET company_name=$2 WHERE id=$1`,
      [firma.id, 'Mobilite Tekerlekli Sandalye A.Ş.']
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
         VALUES ($1,$2,$3,'İstanbul / Türkiye') RETURNING *`,
        [firma.id, code, name]
      )).rows[0];
    }
    return p;
  }

  const gm = await ensurePlant('MOBIL-GM', 'Genel Merkez');
  const fb = await ensurePlant('MOBIL-FB', 'Fabrika');

  // Genel Merkez: Normal (sarf) + opsiyonel Giriş
  const gmSarf = await ensureWarehouse(client, gm.id, 'GM-SARF', 'Merkez Sarf Depo', 'Normal');
  const gmGiris = await ensureWarehouse(client, gm.id, 'GM-GIRIS', 'Merkez Giriş', 'Giris');

  // Fabrika: tam kalite/üretim depo seti
  const fbGiris = await ensureWarehouse(client, fb.id, 'FB-GIRIS', 'Fabrika Giriş', 'Giris');
  const fbGkk = await ensureWarehouse(client, fb.id, 'FB-GKK', 'Fabrika GKK', 'GKK');
  const fbHmd = await ensureWarehouse(client, fb.id, 'FB-HMD', 'Fabrika Hammadde', 'Hammadde');
  const fbMam = await ensureWarehouse(client, fb.id, 'FB-MAM', 'Fabrika Mamul', 'Mamul');
  const fbCkk = await ensureWarehouse(client, fb.id, 'FB-CKK', 'Fabrika CKK', 'CKK');
  const fbAna = await ensureWarehouse(client, fb.id, 'FB-ANA', 'Fabrika Ana / WIP', 'Normal');

  // Merkez depoları da fabrika hammaddeleri için bağlanabilir olsun diye GM'ye Hammadde rolü ekle
  const gmHmd = await ensureWarehouse(client, gm.id, 'GM-HMD', 'Merkez Hammadde', 'Hammadde');
  const gmMam = await ensureWarehouse(client, gm.id, 'GM-MAM', 'Merkez Mamul', 'Mamul');
  const gmGkk = await ensureWarehouse(client, gm.id, 'GM-GKK', 'Merkez GKK', 'GKK');

  let wc = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 ORDER BY id LIMIT 1`, [fb.id]
  )).rows[0];
  if (!wc) {
    wc = (await client.query(
      `INSERT INTO work_centers (plant_id, center_code, center_name, is_active)
       VALUES ($1,'MOBIL-MONTAJ','Montaj Hattı',TRUE) RETURNING *`,
      [fb.id]
    )).rows[0];
  }

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
  };

  return {
    firma, gm, fb, wc,
    wh: { gmSarf, gmGiris, gmHmd, gmMam, gmGkk, fbGiris, fbGkk, fbHmd, fbMam, fbCkk, fbAna },
  };
}

async function seedMaster(client, org) {
  log('\n=== Master: cari + stok + BOM + rota ===');
  const { firma, gm, fb, wh, wc } = org;
  const both = [gm.id, fb.id];

  const tedMetal = await createPartner(client, {
    name: 'Anadolu Metal Şasi Sanayi A.Ş.', type: 'Tedarikci', companyId: firma.id, plantId: fb.id,
  });
  const tedTek = await createPartner(client, {
    name: 'Lastik & Teker İthalat Ltd.', type: 'Tedarikci', companyId: firma.id, plantId: fb.id,
  });
  const tedSarf = await createPartner(client, {
    name: 'OfisNet Sarf Malzeme Tic.', type: 'Tedarikci', companyId: firma.id, plantId: gm.id,
  });
  const musHast = await createPartner(client, {
    name: 'Şehir Rehabilitasyon Hastanesi', type: 'Musteri', companyId: firma.id, plantId: gm.id,
  });
  const musDist = await createPartner(client, {
    name: 'Mobilite Distribütör A.Ş.', type: 'Musteri', companyId: firma.id, plantId: gm.id,
  });

  // Hammaddeler — her iki iş yeri; fabrika depo varsayılan; QC açık
  const hmSasi = await createItem(client, {
    name: 'Çelik Şasi Profil Seti', type: 'Hammadde', price: 1200,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true,
  });
  // Merkez depolarına da bağla
  for (const wid of [wh.gmHmd.id]) {
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       VALUES ($1,$2,$3,TRUE) ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
      [hmSasi.id, wid, gm.id]
    );
  }
  const hmTeker = await createItem(client, {
    name: 'Arka Tekerlek 24" Set', type: 'Hammadde', price: 850,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true,
  });
  await client.query(
    `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
     VALUES ($1,$2,$3,TRUE) ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
    [hmTeker.id, wh.gmHmd.id, gm.id]
  );
  const hmOn = await createItem(client, {
    name: 'Ön Tekerlek / Kastor Set', type: 'Hammadde', price: 320,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true,
  });
  const hmKoltuk = await createItem(client, {
    name: 'Oturma Minderi & Sırtlık', type: 'Hammadde', price: 480,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true,
  });
  const hmVida = await createItem(client, {
    name: 'Montaj Vida / Bağlantı Seti', type: 'Hammadde', price: 45,
    companyId: firma.id, plantIds: both, girisWh: wh.fbHmd.id, cikisWh: wh.fbHmd.id, qc: true,
  });

  // Mamul — her iki iş yeri
  const fgManuel = await createItem(client, {
    name: 'Manuel Tekerlekli Sandalye MS-100', type: 'Mamul', price: 14500,
    companyId: firma.id, plantIds: both, girisWh: wh.fbMam.id, cikisWh: wh.fbMam.id, qc: false,
  });
  await client.query(
    `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
     VALUES ($1,$2,$3,TRUE) ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE`,
    [fgManuel.id, wh.gmMam.id, gm.id]
  );

  // Sarf — YALNIZCA Genel Merkez; QC kapalı
  const sarfKagit = await createItem(client, {
    name: 'A4 Fotokopi Kağıdı (koli)', type: 'Sarf', price: 180,
    companyId: firma.id, plantIds: [gm.id], girisWh: wh.gmSarf.id, cikisWh: wh.gmSarf.id, qc: false,
  });
  const sarfTemizlik = await createItem(client, {
    name: 'Ofis Temizlik Seti', type: 'Sarf', price: 95,
    companyId: firma.id, plantIds: [gm.id], girisWh: wh.gmSarf.id, cikisWh: wh.gmSarf.id, qc: false,
  });
  const sarfKalem = await createItem(client, {
    name: 'Kutu Kalem / Kırtasiye', type: 'Sarf', price: 60,
    companyId: firma.id, plantIds: [gm.id], girisWh: wh.gmSarf.id, cikisWh: wh.gmSarf.id, qc: false,
  });

  // BOM
  const bomCode = await sonrakiKod(client, 'URUN_AGACI').catch(() => `UA-MS-${Date.now()}`);
  const bom = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alt_no, bom_type, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes, design_department
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','Onayli',TRUE,TRUE,$6,$7,'Uretim')
     RETURNING *`,
    [fgManuel.id, bomCode, `${fgManuel.item_name} Ağacı`, firma.id, fb.id, wh.fbMam.id, TAG]
  )).rows[0];

  const comps = [
    [hmSasi, 1], [hmTeker, 1], [hmOn, 1], [hmKoltuk, 1], [hmVida, 1],
  ];
  let lineNo = 10;
  for (const [st, qty] of comps) {
    await client.query(
      `INSERT INTO bom_lines (
         product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
         scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
       ) VALUES ($1,$2,$3,$4,'AD',$4,$4,0,'Net',$5,'Malzeme',TRUE)`,
      [bom.id, lineNo, st.id, qty, wh.fbHmd.id]
    );
    lineNo += 10;
  }

  // Rota
  const routeCode = await sonrakiKod(client, 'ROTA').catch(() => `RT-MS-${Date.now()}`);
  const rota = (await client.query(
    `INSERT INTO routings (
       item_id, product_bom_id, route_code, route_name, template, varsayilan,
       company_id, plant_id, route_type, alt_no, is_active, notes
     ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7)
     RETURNING *`,
    [fgManuel.id, bom.id, routeCode, `${fgManuel.item_name} Rotası`, firma.id, fb.id, TAG]
  )).rows[0];

  const ops = [
    { line: 10, code: 'OP10', name: 'Şasi Montaj', time: 45 },
    { line: 20, code: 'OP20', name: 'Tekerlek Takma', time: 30 },
    { line: 30, code: 'OP30', name: 'Koltuk & Ayar', time: 25 },
    { line: 40, code: 'OP40', name: 'Final Kontrol & Paket', time: 20 },
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
      [rota.id, op.line, op.code, op.name, wc.id, op.time, next, isLast ? fgManuel.id : null]
    );
  }

  summary.partners = {
    tedMetal: tedMetal.partner_code,
    tedTek: tedTek.partner_code,
    tedSarf: tedSarf.partner_code,
    musHast: musHast.partner_code,
    musDist: musDist.partner_code,
  };
  summary.items = {
    hmSasi: hmSasi.item_code,
    hmTeker: hmTeker.item_code,
    hmOn: hmOn.item_code,
    hmKoltuk: hmKoltuk.item_code,
    hmVida: hmVida.item_code,
    fgManuel: fgManuel.item_code,
    sarfKagit: sarfKagit.item_code,
    sarfTemizlik: sarfTemizlik.item_code,
    sarfKalem: sarfKalem.item_code,
  };
  summary.bom = { id: bom.id, code: bom.bom_code };
  summary.routing = { id: rota.id, code: rota.route_code };

  return {
    tedMetal, tedTek, tedSarf, musHast, musDist,
    hmSasi, hmTeker, hmOn, hmKoltuk, hmVida, fgManuel,
    sarfKagit, sarfTemizlik, sarfKalem,
    bom, rota,
  };
}

async function runPurchaseQc(firmaId, plantId, partnerId, warehouseId, lines, desc, { expectQc }) {
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
  } else if (expectQc && !gkkFlag) {
    summary.notes.push(`UYARI: ${desc} için QC bekleniyordu ama gkk_gerekli=false`);
  } else if (!expectQc && gkkFlag) {
    summary.notes.push(`HATA: ${desc} sarf için gkk_gerekli=true — QC muafiyeti çalışmadı`);
  } else {
    log('  ✓ sarf/kalite-muaf: giriş kontrol oluşturulmadı');
  }
  return { po: po.order_no || po.id, mk: mkFull.receipt_no || mk.id, gkk: gkkFlag };
}

async function runCycle(org, master) {
  log('\n=== Süreç: hammadde SA (fabrika, QC) + sarf SA (merkez, QC yok) + üretim + satış ===');
  const { firma, gm, fb, wh } = org;
  const fid = firma.id;
  const qty = 5;

  // 1) Hammadde satınalma — fabrika
  const hmdBuy = await runPurchaseQc(fid, fb.id, master.tedMetal.id, wh.fbHmd.id, [
    { item_id: master.hmSasi.id, quantity: qty, unit_price: 1200 },
    { item_id: master.hmKoltuk.id, quantity: qty, unit_price: 480 },
    { item_id: master.hmVida.id, quantity: qty * 2, unit_price: 45 },
  ], 'Hammadde SA (şasi/koltuk/vida)', { expectQc: true });

  const tekerBuy = await runPurchaseQc(fid, fb.id, master.tedTek.id, wh.fbHmd.id, [
    { item_id: master.hmTeker.id, quantity: qty, unit_price: 850 },
    { item_id: master.hmOn.id, quantity: qty, unit_price: 320 },
  ], 'Hammadde SA (tekerlek)', { expectQc: true });

  // 2) Sarf satınalma — yalnızca genel merkez, QC yok
  const sarfBuy = await runPurchaseQc(fid, gm.id, master.tedSarf.id, wh.gmSarf.id, [
    { item_id: master.sarfKagit.id, quantity: 20, unit_price: 180 },
    { item_id: master.sarfTemizlik.id, quantity: 10, unit_price: 95 },
    { item_id: master.sarfKalem.id, quantity: 15, unit_price: 60 },
  ], 'Sarf SA (merkez ofis)', { expectQc: false });

  // 3) Satış siparişi
  const so = await api('POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: master.musHast.id,
    plant_id: fb.id,
    company_id: fid,
    order_date: new Date().toISOString().slice(0, 10),
    description: `[${TAG}] Hastane siparişi MS-100`,
    currency_code: 'TRY',
    kalemler: [{
      item_id: master.fgManuel.id,
      quantity: qty,
      unit_price: 14500,
      uom_code: 'AD',
    }],
  }, fid);

  // 4) Üretim emri
  let ue;
  try {
    ue = await api('POST', '/uretim-emirleri', {
      item_id: master.fgManuel.id,
      product_bom_id: master.bom.id,
      route_id: master.rota.id,
      plant_id: fb.id,
      company_id: fid,
      component_warehouse_id: wh.fbHmd.id,
      fg_warehouse_id: wh.fbMam.id,
      wip_warehouse_id: wh.fbAna.id,
      planlanan_quantity: qty,
      sales_order_id: so.id,
      planli_kesin: 'Kesin',
      description: `[${TAG}] MS-100 iş emri`,
      order_date: new Date().toISOString().slice(0, 10),
    }, fid);
  } catch (err) {
    log(`  UE oluşturma (tip olmadan): ${err.message}`);
    ue = await api('POST', '/uretim-emirleri', {
      item_id: master.fgManuel.id,
      product_bom_id: master.bom.id,
      route_id: master.rota.id,
      plant_id: fb.id,
      company_id: fid,
      component_warehouse_id: wh.fbHmd.id,
      fg_warehouse_id: wh.fbMam.id,
      planlanan_quantity: qty,
      description: `[${TAG}] MS-100 iş emri`,
    }, fid);
  }

  await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, fid).catch((e) => log(`  UE onay: ${e.message}`));
  await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, fid).catch((e) => log(`  UE başlat: ${e.message}`));
  for (let i = 0; i < 4; i++) {
    try {
      await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, { quantity: qty }, fid);
      log(`  op tamam ${i + 1}`);
    } catch (err) {
      log(`  op ${i + 1}: ${err.message}`);
      break;
    }
  }
  // Üretim çıkışı CKK'da — mamul depoya almak için CKK onay
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
      }, fid);
      log(`  CKK onay: ${e.order_no || e.id}`);
    } catch (err) {
      log(`  CKK atlandı ${e.order_no || e.id}: ${err.message}`);
    }
  }

  // 5) Sevk / irsaliye / fatura
  let sevk = null; let irs = null; let fatura = null;
  try {
    sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      warehouse_id: wh.fbMam.id,
      plant_id: fb.id,
    }, fid);
    log(`  sevk: ${sevk.shipment_no || sevk.id}`);
  } catch (err) {
    log(`  sevk atlandı: ${err.message}`);
  }
  try {
    if (sevk?.id) {
      irs = await api('POST', '/delivery_notes/sevk-emrinden', {
        shipment_order_id: sevk.id,
        warehouse_id: wh.fbMam.id,
      }, fid);
    } else {
      irs = await api('POST', '/delivery_notes', {
        partner_id: master.musHast.id,
        warehouse_id: wh.fbMam.id,
        plant_id: fb.id,
        company_id: fid,
        sales_order_id: so.id,
        description: `[${TAG}] Sevk irsaliyesi`,
        satirlar: [{ item_id: master.fgManuel.id, quantity: qty, uom_code: 'AD' }],
      }, fid);
    }
    if (irs?.id) {
      // e-İrsaliye zorunlu alanlarını doldur
      await api('PUT', `/delivery_notes/${irs.id}`, {
        ship_district: 'Kadıköy',
        ship_postal_code: '34710',
        ship_city: 'İstanbul',
        ship_address: 'Hastane Cad. No:1',
        carrier_title: 'Mobilite Lojistik A.Ş.',
        carrier_tax_id: '1111111111',
        driver_name: 'Ahmet',
        driver_last_name: 'Yılmaz',
        driver_national_id: '12345678901',
        description: `[${TAG}] Sevk irsaliyesi`,
      }, fid).catch((e) => log(`  irs güncelle: ${e.message}`));
      await api('POST', `/delivery_notes/${irs.id}/onayla`, {}, fid).catch((e) => log(`  irs onay: ${e.message}`));
      try {
        fatura = await api('POST', `/delivery_notes/${irs.id}/fatura-olustur`, {
          description: `[${TAG}] Satış faturası`,
        }, fid);
      } catch (e) {
        fatura = await api('POST', '/invoices', {
          partner_id: master.musHast.id,
          company_id: fid,
          plant_id: fb.id,
          description: `[${TAG}] Satış faturası`,
          kalemler: [{ item_id: master.fgManuel.id, quantity: qty, unit_price: 14500 }],
        }, fid);
      }
    }
  } catch (err) {
    log(`  irsaliye/fatura: ${err.message}`);
  }

  summary.docs = {
    hammadde_po: hmdBuy.po,
    teker_po: tekerBuy.po,
    sarf_po: sarfBuy.po,
    sarf_gkk: sarfBuy.gkk,
    hammadde_gkk: hmdBuy.gkk,
    sales_order: so.order_no || so.id,
    production_order: ue.order_no || ue.id,
    shipment: sevk?.shipment_no || sevk?.id || null,
    delivery_note: irs?.delivery_note_no || irs?.irsaliye_no || irs?.id || null,
    invoice: fatura?.invoice_no || fatura?.fatura?.invoice_no || fatura?.id || null,
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
  // Eski demo + yeniden kurulum
  for (const code of ['TEKS', 'F00001', 'MOBIL']) {
    try { purgeFirma(code); } catch (e) { log(`purge ${code}: ${e.message}`); }
  }
  try {
    await pool.query(`DELETE FROM warehouses WHERE plant_id IN (SELECT id FROM plants WHERE company_id IN (SELECT id FROM companies WHERE company_code IN ('TEKS','F00001')))`);
    await pool.query(`DELETE FROM plants WHERE company_id IN (SELECT id FROM companies WHERE company_code IN ('TEKS','F00001'))`);
    await pool.query(`DELETE FROM companies WHERE company_code IN ('TEKS','F00001')`);
  } catch (_) { /* ignore */ }

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

  // API süreçleri (ayrı bağlantı)
  await runCycle(org, master);

  const outDir = '/opt/cursor/artifacts/mobil-demo';
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'summary.json');
  summary.generatedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
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
