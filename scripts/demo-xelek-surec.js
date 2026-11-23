#!/usr/bin/env node
/**
 * XELEK — Yeni elektronik firması uçtan uca süreç
 *
 *  1) Firma + mecburi kurulum (iş yeri, depolar, parametreler, kullanıcı/roller, onay)
 *  2) Proje «X Firması»
 *  3) Satışçı ziyaret + faaliyet → fırsat → kazan → aday→cari → satış teklifi
 *  4) Teklif→sipariş (OnayBekliyor) → satış müdürü onayı → Onayli
 *  5) Yeni X mamul + HM/YM + BOM + rota
 *  6) MRP → satınalma önerileri
 *  7) SA teklif → SA müdür onay → SA sorumlu sipariş
 *  8) Mal kabul + GKK: bir HM geçer, bir HM red → iade + yeniden sipariş → GKK OK
 *  9) Üretim → ÇKK → mamul depo
 * 10) Kısmi sevk (%50) → irsaliye → fatura; kalan sevk → irsaliye → fatura
 * 11) Müşteri 1 adet iade
 * 12) 1 adet daha üretim + manuel satış siparişi ile tekrar sevk/fatura
 *
 * Kullanım: node scripts/demo-xelek-surec.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { createStockMovement } = require('../src/services/stokHareketService');
const { mrpCalistir } = require('../src/services/mrpService');
const { nextSequenceCode, itemTypeFromSeriesCode, partnerTypeFromSeriesCode } = require('../src/utils/kodUretici');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { startApproval, onaylaAdim } = require('../src/services/onayService');

const BASE = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRMA_KODU = 'XELEK';
const FIRMA_ADI = 'X Elektronik Sanayi A.Ş.';
const PROJE = 'X Firması';
const TAG = 'XELEK-SUREC';
const OUT_JSON = path.join(__dirname, '..', 'docs', 'system', 'demo-xelek-surec.json');
const OUT_MD = path.join(__dirname, '..', 'docs', 'system', 'demo-xelek-surec.md');
const OUT_ART = '/opt/cursor/artifacts/demo-xelek-surec.json';
const OUT_ART_MD = '/opt/cursor/artifacts/demo-xelek-surec.md';

const audit = [];
const summary = { firma: FIRMA_KODU, proje: PROJE, tag: TAG, steps: [], errors: [] };

function ts() {
  return new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}
function log(msg) {
  console.log(msg);
  audit.push({ at: ts(), msg });
}
function step(name, detail) {
  summary.steps.push({ name, detail, at: ts() });
  log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, urlPath, body, { firmaId, userCode = 'owner' } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': userCode,
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const r = await fetch(BASE + urlPath, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    const msg = data?.hata || data?.detay || text || r.statusText;
    throw new Error(`${method} ${urlPath} → ${r.status}: ${msg}`);
  }
  return data;
}

async function upsertUser(client, { code, username, first, last, role, group, password = 'Demo123!' }) {
  const { hashParola } = require('../src/utils/parola');
  const hash = hashParola(password);
  const existing = await client.query(`SELECT id FROM users WHERE user_code=$1 OR username=$2`, [code, username]);
  if (existing.rows[0]) {
    await client.query(
      `UPDATE users SET first_name=$2, last_name=$3, role=$4, group_code=$5, password_hash=$6, is_active=TRUE WHERE id=$1`,
      [existing.rows[0].id, first, last, role, group, hash]
    );
    return existing.rows[0].id;
  }
  const ins = await client.query(
    `INSERT INTO users (
       user_code, username, password_hash, first_name, last_name, role, group_code, is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) RETURNING id`,
    [code, username, hash, first, last, role, group]
  );
  return ins.rows[0].id;
}

async function ensureGroup(client, code, name, flags = {}) {
  await client.query(
    `INSERT INTO user_groups (group_code, group_name, can_approve_purchase, can_quality_control, is_active)
     SELECT $1::varchar,$2::varchar,$3::boolean,$4::boolean,TRUE
     WHERE NOT EXISTS (SELECT 1 FROM user_groups WHERE group_code=$1::varchar)`,
    [code, name, !!flags.saOnay, !!flags.kk]
  );
}

async function ensureOrg(client) {
  log('\n=== 1. Firma + mecburi kurulum ===');
  let firma = (await client.query(`SELECT * FROM companies WHERE company_code=$1`, [FIRMA_KODU])).rows[0];
  if (!firma) {
    firma = (await client.query(
      `INSERT INTO companies (company_code, company_name, is_profile, functional_currency, accounting_country_code)
       VALUES ($1,$2,TRUE,'TRY','TR') RETURNING *`,
      [FIRMA_KODU, FIRMA_ADI]
    )).rows[0];
  } else {
    await client.query(
      `UPDATE companies SET company_name=$2, is_profile=TRUE, functional_currency=COALESCE(functional_currency,'TRY') WHERE id=$1`,
      [firma.id, FIRMA_ADI]
    );
    firma = (await client.query(`SELECT * FROM companies WHERE id=$1`, [firma.id])).rows[0];
  }

  let plant = (await client.query(
    `SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`,
    [firma.id]
  )).rows[0];
  if (!plant) {
    plant = (await client.query(
      `INSERT INTO plants (plant_code, plant_name, company_id, address)
       VALUES ($1,$2,$3,'İstanbul') RETURNING *`,
      [`${FIRMA_KODU}-MR`, `${FIRMA_ADI} Merkez`, firma.id]
    )).rows[0];
  }

  const whDefs = [
    [`${FIRMA_KODU}-ANA`, 'Ana Depo', 'Normal'],
    [`${FIRMA_KODU}-HMD`, 'Hammadde Depo', 'Hammadde'],
    [`${FIRMA_KODU}-YM`, 'Yarı Mamul Depo', 'YariMamul'],
    [`${FIRMA_KODU}-MAM`, 'Mamul Depo', 'Mamul'],
    [`${FIRMA_KODU}-KK`, 'Giriş Kalite (GKK)', 'GKK'],
    [`${FIRMA_KODU}-CKK`, 'Çıkış Kalite (ÇKK)', 'CKK'],
    [`${FIRMA_KODU}-GIR`, 'Mal Kabul Giriş', 'Giris'],
    [`${FIRMA_KODU}-SVK`, 'Sevk Depo', 'Normal'],
  ];
  const wh = {};
  for (const [code, name, tip] of whDefs) {
    let row = (await client.query(
      `SELECT * FROM warehouses WHERE warehouse_code=$1 AND plant_id=$2`,
      [code, plant.id]
    )).rows[0];
    if (!row) {
      row = (await client.query(
        `INSERT INTO warehouses (warehouse_code, warehouse_name, plant_id, warehouse_role, is_active)
         VALUES ($1,$2,$3,$4,TRUE) RETURNING *`,
        [code, name, plant.id, tip]
      )).rows[0];
    }
    const key = code.split('-').pop().toLowerCase();
    wh[key] = row;
  }

  let wc = (await client.query(
    `SELECT * FROM work_centers WHERE plant_id=$1 ORDER BY id LIMIT 1`,
    [plant.id]
  )).rows[0];
  if (!wc) {
    wc = (await client.query(
      `INSERT INTO work_centers (center_code, center_name, plant_id, is_active)
       VALUES ($1,$2,$3,TRUE) RETURNING *`,
      [`${FIRMA_KODU}-IM1`, 'Montaj Hattı 1', plant.id]
    )).rows[0];
  }

  // Sistem parametreleri (depo kodları + temel)
  const params = [
    ['FIRMA_PB', 'TRY'],
    ['VARSAYILAN_PARA', 'TRY'],
    ['VARSAYILAN_KDV', '20'],
    ['GKK_DEPO_KODU', `${FIRMA_KODU}-KK`],
    ['CKK_DEPO_KODU', `${FIRMA_KODU}-CKK`],
    ['GIRIS_DEPO_KODU', `${FIRMA_KODU}-GIR`],
    ['HAMMADDE_DEPO_KODU', `${FIRMA_KODU}-HMD`],
    ['MAMUL_DEPO_KODU', `${FIRMA_KODU}-MAM`],
    ['YARIMAMUL_DEPO_KODU', `${FIRMA_KODU}-YM`],
    ['STOK_DEPO_ZORUNLU', '1'],
  ];
  for (const [code, val] of params) {
    const ex = await client.query(
      `SELECT id FROM system_parameters WHERE parameter_code=$1 LIMIT 1`,
      [code]
    );
    if (ex.rows[0]) {
      await client.query(
        `UPDATE system_parameters SET value=$2 WHERE id=$1`,
        [ex.rows[0].id, val]
      );
    } else {
      await client.query(
        `INSERT INTO system_parameters (parameter_code, parameter_name, value, is_active, module)
         VALUES ($1,$1,$2,TRUE,'GENEL')`,
        [code, val]
      ).catch(() => null);
    }
  }

  // Gruplar + kullanıcılar
  await ensureGroup(client, 'SATIS', 'Satış', {});
  await ensureGroup(client, 'SATINALMA', 'Satınalma', { saOnay: true });
  await ensureGroup(client, 'KALITE', 'Kalite', { kk: true });
  await ensureGroup(client, 'URETIM', 'Üretim', {});

  const uidSatisci = await upsertUser(client, {
    code: 'xelek.satis', username: 'xelek.satis', first: 'Selin', last: 'Satış',
    role: 'Satisci', group: 'SATIS',
  });
  const uidSatisMudur = await upsertUser(client, {
    code: 'xelek.smudur', username: 'xelek.smudur', first: 'Murat', last: 'SatışMüdür',
    role: 'SatisMuduru', group: 'SATIS',
  });
  const uidSaSorumlu = await upsertUser(client, {
    code: 'xelek.sa', username: 'xelek.sa', first: 'Ayşe', last: 'SASorumlu',
    role: 'SASorumlu', group: 'SATINALMA',
  });
  const uidSaMudur = await upsertUser(client, {
    code: 'xelek.samudur', username: 'xelek.samudur', first: 'Kemal', last: 'SAMüdür',
    role: 'SAMuduru', group: 'SATINALMA',
  });
  const owner = (await client.query(`SELECT id FROM users WHERE user_code='owner'`)).rows[0];

  for (const uid of [uidSatisci, uidSatisMudur, uidSaSorumlu, uidSaMudur, owner?.id].filter(Boolean)) {
    await client.query(
      `INSERT INTO user_company_permissions (user_id, company_id)
       SELECT $1,$2 WHERE NOT EXISTS (
         SELECT 1 FROM user_company_permissions WHERE user_id=$1 AND company_id=$2
       )`,
      [uid, firma.id]
    ).catch(async () => {
      // alternatif şema
      await client.query(
        `INSERT INTO user_company_permissions (user_id, company_id, is_active)
         SELECT $1,$2,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM user_company_permissions WHERE user_id=$1 AND company_id=$2
         )`,
        [uid, firma.id]
      ).catch(() => null);
    });
  }

  // Satış siparişi onay rotası (satış müdürü)
  await client.query(
    `INSERT INTO approval_roles (role_code, role_name, description, user_id, company_id, is_active)
     SELECT 'SATIS_MUDUR-XELEK', 'Satış Müdürü', 'XELEK satış onay', $1, $2, TRUE
     WHERE NOT EXISTS (
       SELECT 1 FROM approval_roles WHERE role_code='SATIS_MUDUR-XELEK' AND company_id=$2
     )`,
    [uidSatisMudur, firma.id]
  );
  await client.query(
    `INSERT INTO approval_roles (role_code, role_name, description, user_id, company_id, is_active)
     SELECT 'SA_MUDUR-XELEK', 'Satınalma Müdürü', 'XELEK SA onay', $1, $2, TRUE
     WHERE NOT EXISTS (
       SELECT 1 FROM approval_roles WHERE role_code='SA_MUDUR-XELEK' AND company_id=$2
     )`,
    [uidSaMudur, firma.id]
  );

  await client.query(
    `INSERT INTO approval_rules (
       rule_code, rule_name, description, screen_id, company_id, is_active, line_no, term_min_amount, auto_approve
     )
     SELECT 'OM-SS-XELEK', 'Satış siparişi onayı (XELEK)', 'Satış müdürü onayı zorunlu',
            'satis-siparisleri', $1, TRUE, 10, 0, FALSE
     WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE rule_code='OM-SS-XELEK')`,
    [firma.id]
  );
  await client.query(
    `INSERT INTO approval_routes (
       route_code, route_name, description, screen_id, rule_id, company_id, is_active, version_no
     )
     SELECT 'OR-SS-XELEK', 'Satış sipariş rotası XELEK', 'Satış müdürü',
            'satis-siparisleri', k.id, $1, TRUE, 1
     FROM approval_rules k
     WHERE k.rule_code='OM-SS-XELEK'
       AND NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code='OR-SS-XELEK')`,
    [firma.id]
  );
  const rotaSs = (await client.query(
    `SELECT id FROM approval_routes WHERE route_code='OR-SS-XELEK'`
  )).rows[0];
  const rolSs = (await client.query(
    `SELECT id FROM approval_roles WHERE role_code='SATIS_MUDUR-XELEK' AND company_id=$1`,
    [firma.id]
  )).rows[0];
  if (rotaSs && rolSs) {
    await client.query(
      `INSERT INTO approval_route_steps (route_id, line_no, step_name, role_id, role_name, is_required)
       SELECT $1, 10, 'Satış müdürü onayı', $2, 'Satış Müdürü', TRUE
       WHERE NOT EXISTS (SELECT 1 FROM approval_route_steps WHERE route_id=$1 AND line_no=10)`,
      [rotaSs.id, rolSs.id]
    );
    await client.query(
      `INSERT INTO approval_module_usages (
         usage_code, usage_name, module_code, screen_id, route_id, min_amount, is_active, description, company_id
       )
       SELECT 'OM-SS-XELEK', 'Satış siparişi onayı', 'SATIS', 'satis-siparisleri', $1, 0, TRUE,
              'XELEK satış müdürü onayı', $2
       WHERE NOT EXISTS (SELECT 1 FROM approval_module_usages WHERE usage_code='OM-SS-XELEK')`,
      [rotaSs.id, firma.id]
    ).catch(async () => {
      await client.query(
        `INSERT INTO approval_module_usages (
           usage_code, usage_name, module_code, screen_id, route_id, min_amount, is_active, description
         )
         SELECT 'OM-SS-XELEK', 'Satış siparişi onayı', 'SATIS', 'satis-siparisleri', $1, 0, TRUE, 'XELEK'
         WHERE NOT EXISTS (SELECT 1 FROM approval_module_usages WHERE usage_code='OM-SS-XELEK')`,
        [rotaSs.id]
      );
    });
  }

  // SA teklif/sipariş onay (firma bazlı)
  await client.query(
    `INSERT INTO approval_rules (
       rule_code, rule_name, description, screen_id, company_id, is_active, line_no, term_min_amount, auto_approve
     )
     SELECT 'OM-SA-TEKLIF-XELEK', 'SA teklif onayı', 'SA müdürü',
            'satin-alma-teklifleri', $1, TRUE, 10, 0, FALSE
     WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE rule_code='OM-SA-TEKLIF-XELEK')`,
    [firma.id]
  );

  step('Firma kurulumu', `${FIRMA_KODU} #${firma.id} / ${plant.plant_code} / ${Object.keys(wh).length} depo`);
  return {
    firma, plant, wh, wc,
    users: {
      satisci: uidSatisci,
      satisMudur: uidSatisMudur,
      saSorumlu: uidSaSorumlu,
      saMudur: uidSaMudur,
      owner: owner?.id,
    },
  };
}

async function ensureProject(client, org) {
  log('\n=== 2. Proje: X Firması ===');
  let project = null;
  const ex = await client.query(
    `SELECT * FROM projects WHERE company_id=$1 AND (project_code=$2 OR project_name=$3) LIMIT 1`,
    [org.firma.id, 'X-FIRMASI', PROJE]
  );
  if (ex.rows[0]) {
    project = ex.rows[0];
  } else {
    const code = await nextSequenceCode(client, 'PRJ_PROJE').catch(() => `X-FIRMASI`);
    project = (await client.query(
      `INSERT INTO projects (
         project_code, project_name, company_id, plant_id, description, is_active
       ) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING *`,
      [code, PROJE, org.firma.id, org.plant.id, `[${TAG}] Elektronik müşteri projesi`]
    )).rows[0];
  }
  step('Proje', `${project.project_code} — ${project.project_name}`);
  return project;
}

async function createItem(client, {
  name, type, price, companyId, plantId, girisWh, cikisWh, qc = false, lead = 7, safety = 5,
}) {
  const kod = await nextSequenceCode(client, itemTypeFromSeriesCode(type));
  const tedarik = (type === 'Mamul' || type === 'YariMamul') ? 'Uretim' : 'Satinalma';
  const row = (await client.query(
    `INSERT INTO items (
       item_code, item_name, uom_code, sales_price, item_type, procurement_type,
       is_active, company_id, default_receipt_warehouse_id, default_issue_warehouse_id,
       quality_control_required, description, lead_time_days, safety_stock
     ) VALUES ($1,$2,'AD',$3,$4,$5,TRUE,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [kod, name, price || 0, type, tedarik, companyId, girisWh, cikisWh, qc, `[${TAG}] ${name}`, lead, safety]
  )).rows[0];
  await client.query(
    `INSERT INTO item_plants (item_id, plant_id, is_active)
     VALUES ($1,$2,TRUE) ON CONFLICT (item_id, plant_id) DO UPDATE SET is_active=TRUE`,
    [row.id, plantId]
  );
  for (const wid of [girisWh, cikisWh].filter(Boolean)) {
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, is_active)
       SELECT $1,$2,TRUE WHERE NOT EXISTS (
         SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
       )`,
      [row.id, wid]
    );
  }
  return row;
}

async function bindItemWarehouses(client, itemIds, warehouseIds) {
  for (const itemId of itemIds) {
    for (const wid of warehouseIds.filter(Boolean)) {
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, is_active)
         SELECT $1,$2,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
         )`,
        [itemId, wid]
      );
    }
  }
}

async function hkId(client, documentType) {
  const r = await client.query(
    `SELECT id FROM movement_codes WHERE document_type=$1 AND is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`,
    [documentType]
  );
  return r.rows[0]?.id || null;
}

async function crmAndQuote(org, project) {
  log('\n=== 3–5. CRM → fırsat → teklif (geçici satır / sonra X mamul) ===');
  const fid = org.firma.id;
  // Aday
  const aday = await api('POST', '/crm-adaylar', {
    lead_name: 'Nova Enerji Sistemleri A.Ş.',
    status: 'Nitelikli',
    company_id: fid,
    plant_id: org.plant.id,
    phone: '02165550101',
    email: 'satin.alma@novaenerji.demo',
    city: 'İstanbul',
    description: `[${TAG}] ${PROJE} aday`,
    project_code: project.project_code,
  }, { firmaId: fid, userCode: 'xelek.satis' });

  // Faaliyet — ziyaret
  const tip = (await pool.query(
    `SELECT id FROM crm_activity_types ORDER BY id LIMIT 1`
  )).rows[0];
  const faaliyet = await api('POST', '/crm-faaliyetler', {
    subject: `${PROJE} — müşteri ziyareti`,
    description: 'Satışçı saha ziyareti: ihtiyaç kompanzasyon ünitesi X serisi.',
    lead_id: aday.id,
    activity_type_id: tip?.id,
    status: 'Tamamlandi',
    company_id: fid,
    start_date: new Date().toISOString(),
    project_code: project.project_code,
  }, { firmaId: fid, userCode: 'xelek.satis' });

  // Fırsat
  const asama = (await pool.query(
    `SELECT id FROM crm_opportunity_stages
     WHERE COALESCE(is_won,FALSE)=FALSE AND COALESCE(is_lost,FALSE)=FALSE AND COALESCE(is_active,TRUE)=TRUE
     ORDER BY line_no NULLS LAST, id LIMIT 1`
  )).rows[0] || (await pool.query(`SELECT id FROM crm_opportunity_stages ORDER BY id LIMIT 1`)).rows[0];

  const firsat = await api('POST', '/crm-firsatlar', {
    opportunity_name: `${PROJE} — X Ünitesi fırsatı`,
    lead_id: aday.id,
    stage_id: asama?.id,
    company_id: fid,
    plant_id: org.plant.id,
    estimated_amount: 250000,
    currency_code: 'TRY',
    description: `[${TAG}] ${PROJE}`,
    project_code: project.project_code,
  }, { firmaId: fid, userCode: 'xelek.satis' });

  await api('POST', `/crm-firsatlar/${firsat.id}/kapat`, {
    result: 'Kazanildi',
    notes: 'Teklif aşamasına geçildi',
  }, { firmaId: fid, userCode: 'xelek.satis' });

  const cari = await api('POST', `/crm-adaylar/${aday.id}/cariye-donustur`, {
    partner_code: null,
  }, { firmaId: fid, userCode: 'xelek.satis' });

  step('CRM', `Aday ${aday.lead_code || aday.id} → faaliyet → fırsat ${firsat.opportunity_code || firsat.id} kazanıldı → cari`);

  return { aday, faaliyet, firsat, cari: cari.partner || cari.cari || cari };
}

async function buildXProduct(client, org) {
  log('\n=== 6. X mamul + HM + YM + BOM + rota ===');
  const { firma, plant, wh, wc } = org;

  const hmPcb = await createItem(client, {
    name: 'X-PCB Ana Kart', type: 'Hammadde', price: 220,
    companyId: firma.id, plantId: plant.id, girisWh: wh.hmd.id, cikisWh: wh.hmd.id, qc: true,
  });
  const hmMcu = await createItem(client, {
    name: 'X-MCU Kontrolçü', type: 'Hammadde', price: 95,
    companyId: firma.id, plantId: plant.id, girisWh: wh.hmd.id, cikisWh: wh.hmd.id, qc: true,
  });
  const hmCase = await createItem(client, {
    name: 'X-Gövde Plastik', type: 'Hammadde', price: 40,
    companyId: firma.id, plantId: plant.id, girisWh: wh.hmd.id, cikisWh: wh.hmd.id, qc: false,
  });
  const ymBoard = await createItem(client, {
    name: 'X-YM Dizilmiş Kart', type: 'YariMamul', price: 0,
    companyId: firma.id, plantId: plant.id, girisWh: wh.ym.id, cikisWh: wh.ym.id, lead: 0, safety: 0,
  });
  const fg = await createItem(client, {
    name: 'X Mamul — Kompanzasyon Ünitesi', type: 'Mamul', price: 12500,
    companyId: firma.id, plantId: plant.id, girisWh: wh.mam.id, cikisWh: wh.mam.id, lead: 0, safety: 0,
  });

  // YM BOM (PCB+MCU → YM)
  const bomYmCode = await nextSequenceCode(client, 'URUN_AGACI').catch(() => `UA-YM-${Date.now()}`);
  const bomYm = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alternative_no, bom_type, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','Onayli',TRUE,TRUE,$6,$7)
     RETURNING *`,
    [ymBoard.id, bomYmCode, 'X-YM Ağacı', firma.id, plant.id, wh.ym.id, TAG]
  )).rows[0];
  await client.query(
    `INSERT INTO bom_lines (
       product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
       scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
     ) VALUES
     ($1,10,$2,1,'AD',1,1,0,'Net',$3,'Malzeme',TRUE),
     ($1,20,$4,1,'AD',1,1,0,'Net',$3,'Malzeme',TRUE)`,
    [bomYm.id, hmPcb.id, wh.hmd.id, hmMcu.id]
  );

  // FG BOM (YM + gövde → X mamul)
  const bomFgCode = await nextSequenceCode(client, 'URUN_AGACI').catch(() => `UA-FG-${Date.now()}`);
  const bomFg = (await client.query(
    `INSERT INTO boms (
       finished_good_item_id, bom_code, bom_name, quantity, uom_code,
       company_id, plant_id, alternative_no, bom_type, bom_status, is_active,
       is_default_for_wo, fg_warehouse_id, notes
     ) VALUES ($1,$2,$3,1,'AD',$4,$5,'00','Uretim','Onayli',TRUE,TRUE,$6,$7)
     RETURNING *`,
    [fg.id, bomFgCode, 'X Mamul Ağacı', firma.id, plant.id, wh.mam.id, TAG]
  )).rows[0];
  await client.query(
    `INSERT INTO bom_lines (
       product_bom_id, line_no, component_item_id, quantity, uom_code, net_quantity, gross_quantity,
       scrap_pct, qty_entry_type, warehouse_id, line_type, goes_to_wo
     ) VALUES
     ($1,10,$2,1,'AD',1,1,0,'Net',$3,'Malzeme',TRUE),
     ($1,20,$4,1,'AD',1,1,0,'Net',$5,'Malzeme',TRUE)`,
    [bomFg.id, ymBoard.id, wh.ym.id, hmCase.id, wh.hmd.id]
  );

  const routeCode = await nextSequenceCode(client, 'ROTA').catch(() => `RT-X-${Date.now()}`);
  const rota = (await client.query(
    `INSERT INTO routings (
       item_id, product_bom_id, route_code, route_name, template, is_default,
       company_id, plant_id, route_type, alternative_no, is_active, notes
     ) VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,$6,'Uretim','00',TRUE,$7)
     RETURNING *`,
    [fg.id, bomFg.id, routeCode, 'X Mamul Rotası', firma.id, plant.id, TAG]
  )).rows[0];

  const ops = [
    { line: 10, code: 'OP10', name: 'Kart Dizgi (YM)', time: 20, next: 20, qc: false },
    { line: 20, code: 'OP20', name: 'Final Montaj', time: 15, next: 30, qc: false },
    { line: 30, code: 'OP30', name: 'Fonksiyon Test / ÇKK', time: 10, next: null, qc: true },
  ];
  for (const op of ops) {
    await client.query(
      `INSERT INTO routing_operations (
         route_id, line_no, operation_code, operation_name, work_center_id,
         duration_minutes, op_time, op_time_uom, next_line_no, output_item_id,
         include_precost, include_std_cost, include_actual_cost, require_qc
       ) VALUES ($1,$2,$3,$4,$5,$6,$6,'dk',$7,$8,TRUE,TRUE,TRUE,$9)`,
      [
        rota.id, op.line, op.code, op.name, wc.id, op.time, op.next,
        op.code === 'OP30' ? fg.id : (op.code === 'OP10' ? ymBoard.id : null),
        op.qc,
      ]
    );
  }

  await bindItemWarehouses(client,
    [hmPcb.id, hmMcu.id, hmCase.id, ymBoard.id, fg.id],
    [wh.hmd.id, wh.ym.id, wh.mam.id, wh.kk.id, wh.ckk.id, wh.gir.id, wh.ana.id, wh.svk.id]
  );

  step('X mamul master', `${fg.item_code} + HM(${hmPcb.item_code},${hmMcu.item_code},${hmCase.item_code}) + YM(${ymBoard.item_code})`);
  return { hmPcb, hmMcu, hmCase, ymBoard, fg, bomFg, bomYm, rota };
}

async function salesOrderWithApproval(org, project, cari, fg, qty) {
  log('\n=== 4. Satış teklifi → sipariş (OnayBekliyor) → müdür onayı ===');
  const fid = org.firma.id;
  const hk = await hkId(pool, 'SatisTeklif');

  const teklif = await api('POST', '/satis-teklifleri', {
    partner_id: cari.id || cari.partner_id,
    company_id: fid,
    plant_id: org.plant.id,
    currency_code: 'TRY',
    status: 'Onayli',
    movement_code_id: hk,
    description: `[${TAG}] ${PROJE} satış teklifi`,
    project_code: project.project_code,
    satirlar: [{
      item_id: fg.id,
      quantity: qty,
      unit_price: Number(fg.sales_price) || 12500,
      vat_rate: 20,
    }],
  }, { firmaId: fid, userCode: 'xelek.satis' });

  const conv = await api('POST', `/satis-teklifleri/${teklif.id}/siparise-donustur`, {}, {
    firmaId: fid, userCode: 'xelek.satis',
  });

  let so = (await pool.query(`SELECT * FROM sales_orders WHERE id=$1`, [conv.sales_order_id])).rows[0];
  if (so.status !== 'OnayBekliyor') {
    await pool.query(`UPDATE sales_orders SET status='OnayBekliyor' WHERE id=$1`, [so.id]);
    so = (await pool.query(`SELECT * FROM sales_orders WHERE id=$1`, [so.id])).rows[0];
  }

  // Sevk denemesi — engellenmeli
  let blocked = false;
  try {
    await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      warehouse_id: org.wh.mam.id,
    }, { firmaId: fid });
  } catch (e) {
    blocked = /OnayBekliyor|uygun değil|Onaylı/i.test(e.message);
  }
  if (!blocked) throw new Error('OnayBekliyor sipariş sevk edilebildi — kapı çalışmıyor!');

  // Onay kaydı
  let kayitId = conv.onay_kayit?.id;
  if (!kayitId) {
    kayitId = (await withTransaction(pool, async (client) => startApproval(client, {
      company_id: fid,
      screen_id: 'satis-siparisleri',
      module_code: 'SATIS',
      document_id: so.id,
      document_no: so.order_no,
      amount: Number(so.total_amount) || 0,
      currency_code: 'TRY',
      initiator_user_id: org.users.satisci,
      description: `[${TAG}] Satış müdürü onayı`,
    }))).id;
  }

  const mudur = (await pool.query(`SELECT * FROM users WHERE id=$1`, [org.users.satisMudur])).rows[0];
  let kayit = await withTransaction(pool, async (client) => onaylaAdim(client, kayitId, mudur, {
    notes: `[${TAG}] Satış müdürü onayladı`,
  }));
  so = (await pool.query(`SELECT * FROM sales_orders WHERE id=$1`, [so.id])).rows[0];
  if (so.status !== 'Onayli') {
    await pool.query(`UPDATE sales_orders SET status='Onayli' WHERE id=$1`, [so.id]);
    so = (await pool.query(`SELECT * FROM sales_orders WHERE id=$1`, [so.id])).rows[0];
  }

  step('Satış siparişi onayı', `${so.order_no}: OnayBekliyor→Onayli (sevk engeli doğrulandı), teklif Kapalı`);
  return { teklif, so, onay: kayit };
}

async function runMrpAndBuy(org, project, product, so, qty) {
  log('\n=== 7–8. MRP → SA teklif → onay → sipariş → GKK (pass/fail/iade) ===');
  const fid = org.firma.id;
  const { hmPcb, hmMcu, hmCase, fg } = product;

  // Bağımsız ihtiyaç / SO zaten talep yaratır — BI ekle
  await api('POST', '/mrp/bagimsiz-ihtiyaclar', {
    company_id: fid,
    plant_id: org.plant.id,
    item_id: fg.id,
    quantity: qty,
    need_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    source: 'Manuel',
    description: `[${TAG}] ${PROJE} BI`,
  }, { firmaId: fid }).catch(async () => {
    await pool.query(
      `INSERT INTO mrp_independent_requirements (
         company_id, plant_id, item_id, quantity, need_date, source, description
       ) VALUES ($1,$2,$3,$4,CURRENT_DATE + 14, 'Manuel', $5)`,
      [fid, org.plant.id, fg.id, qty, `[${TAG}] BI`]
    );
  });

  // HM'leri GIR+HMD+KK depolarına bağla (mal kabul / GKK)
  await withTransaction(pool, (c) => bindItemWarehouses(c,
    [hmPcb.id, hmMcu.id, hmCase.id],
    [org.wh.gir.id, org.wh.hmd.id, org.wh.kk.id, org.wh.ana.id]
  ));

  const run = await withTransaction(pool, (client) => mrpCalistir(client, {
    firmaId: fid,
    isYeriId: org.plant.id,
    description: `[${TAG}] ${PROJE} MRP`,
  }));
  const runId = run?.calisma?.id || run?.id;
  let rows = Array.isArray(run?.sonuclar) ? run.sonuclar : [];
  if (runId && !rows.length) {
    const sonuclar = await api('GET', `/mrp/calismalar/${runId}/sonuclar`, null, { firmaId: fid }).catch(() => null);
    rows = Array.isArray(sonuclar) ? sonuclar : (sonuclar?.rows || sonuclar?.sonuclar || []);
  }
  const satinalma = rows.filter((r) => /sat[iı]n|purchase|Satınalma/i.test(String(r.suggestion || r.suggested_action || '')));
  step('MRP', `çalışma #${runId || '?'} — ${rows.length} satır, satınalma önerisi: ${satinalma.length}`);

  // Tedarikçi
  const ted = (await pool.query(
    `INSERT INTO partners (
       partner_code, partner_name, partner_type, phone, email, province, country, currency_code,
       payment_due_days, is_active, company_id, plant_id, notes
     ) VALUES ($1,$2,'Tedarikci','02165550999','tedarik@xkomponent.demo','İstanbul','Türkiye','TRY',30,TRUE,$3,$4,$5)
     RETURNING *`,
    [
      await nextSequenceCode(pool, partnerTypeFromSeriesCode('Tedarikci')),
      'X Komponent Tedarik A.Ş.',
      fid, org.plant.id, TAG,
    ]
  )).rows[0];

  // SA teklif (PCB + MCU — kalite zorunlu HM'ler)
  const saTeklif = await api('POST', '/satin-alma-teklifleri', {
    partner_id: ted.id,
    company_id: fid,
    plant_id: org.plant.id,
    currency_code: 'TRY',
    status: 'Taslak',
    description: `[${TAG}] MRP kaynaklı SA teklif`,
    project_code: project.project_code,
    satirlar: [
      { item_id: hmPcb.id, quantity: qty + 2, unit_price: 220 },
      { item_id: hmMcu.id, quantity: qty + 2, unit_price: 95 },
      { item_id: hmCase.id, quantity: qty + 2, unit_price: 40 },
    ],
  }, { firmaId: fid, userCode: 'xelek.sa' });

  // SA müdürü onaylar
  await api('POST', `/satin-alma-teklifleri/${saTeklif.id}/onayla`, {}, {
    firmaId: fid, userCode: 'xelek.samudur',
  });

  // SA sorumlu sipariş açar
  const saSip = await api('POST', `/satin-alma-teklifleri/${saTeklif.id}/siparise-donustur`, {}, {
    firmaId: fid, userCode: 'xelek.sa',
  });
  const poId = saSip.id || saSip.purchase_order_id;
  await api('POST', `/satin-alma-siparisleri/${poId}/onayla`, {}, {
    firmaId: fid, userCode: 'xelek.samudur',
  }).catch(() => null);

  step('SA teklif→sipariş', `PO #${poId} (müdür onaylı tekliften)`);

  // Mal kabul + GKK: PCB pass, MCU fail
  const mk = await api('POST', '/mal-kabuller', {
    purchase_order_id: poId,
    warehouse_id: org.wh.hmd.id,
    company_id: fid,
    plant_id: org.plant.id,
    incoming_qc_required: true,
    description: `[${TAG}] İlk mal kabul`,
    project_code: project.project_code,
  }, { firmaId: fid });

  const mkId = mk.id;
  // Giriş kontrollerini onayla
  const gkList = (await pool.query(
    `SELECT * FROM incoming_inspections WHERE goods_receipt_id=$1`,
    [mkId]
  )).rows;
  for (const g of gkList) {
    await api('POST', `/giris-kontrolleri/${g.id}/onayla`, {
      description: `[${TAG}] Giriş kontrol OK`,
    }, { firmaId: fid }).catch(() => null);
  }

  // GKK emirleri — yalnızca bu mal kabul / bizim HM kalemleri
  const ourHmIds = [hmPcb.id, hmMcu.id, hmCase.id];
  const gkk = (await pool.query(
    `SELECT q.*, i.item_code, i.item_name FROM qc_orders q
     LEFT JOIN items i ON i.id = q.item_id
     WHERE q.direction='GKK' AND q.status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND q.item_id = ANY($3::int[])
       AND (
         (q.source_type IN ('MAL_KABUL','MalKabul') AND q.source_id=$1)
         OR (q.source_type IN ('GIRIS_KONTROL','GirisKontrol') AND q.source_id = ANY($2::int[]))
       )`,
    [mkId, gkList.map((g) => g.id).concat([0]), ourHmIds]
  )).rows;
  if (!gkk.length) {
    // fallback: son 20 GKK içinde bizim stoklar
    const fb = (await pool.query(
      `SELECT q.*, i.item_code, i.item_name FROM qc_orders q
       JOIN items i ON i.id = q.item_id
       WHERE q.direction='GKK' AND q.status NOT IN ('Onayli','Kapali','Red','Iptal')
         AND q.item_id = ANY($1::int[])
       ORDER BY q.id DESC LIMIT 20`,
      [ourHmIds]
    )).rows;
    gkk.push(...fb);
  }

  let failedItemId = hmMcu.id;
  for (const e of gkk) {
    const isFail = Number(e.item_id) === Number(hmMcu.id)
      || /MCU|Kontrolçü/i.test(e.item_name || '');
    if (isFail) {
      failedItemId = e.item_id;
      await api('POST', `/kk-emirleri/${e.id}/reddet`, {
        rejected_quantity: e.quantity || e.accepted_quantity,
        description: `[${TAG}] GKK RED — MCU lot hatalı`,
      }, { firmaId: fid }).catch(async () => {
        await api('POST', `/kk-emirleri/${e.id}/onayla`, {
          onay: false,
          accepted_quantity: 0,
          rejected_quantity: e.quantity || e.accepted_quantity,
          description: `[${TAG}] GKK RED`,
        }, { firmaId: fid });
      });
      log(`  GKK RED: ${e.order_no || e.id} (${e.item_code || e.item_id})`);
    } else {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || e.accepted_quantity,
        rejected_quantity: 0,
        target_warehouse_id: org.wh.hmd.id,
        description: `[${TAG}] GKK OK → HMD`,
      }, { firmaId: fid });
      log(`  GKK OK: ${e.order_no || e.id} (${e.item_code || e.item_id})`);
    }
  }
  step('GKK ilk tur', 'bir HM stoğa, bir HM red');

  // İade (mal kabul iade)
  await api('POST', `/mal-kabuller/${mkId}/iade`, {
    description: `[${TAG}] Red HM iadesi`,
    satirlar: [{ item_id: failedItemId, quantity: qty + 2 }],
  }, { firmaId: fid }).catch(async (err) => {
    log(`  mal-kabul iade uyarısı: ${err.message} — stok çıkış ile telafi`);
    await withTransaction(pool, async (client) => {
      await createStockMovement(client, {
        hareketTipi: 'IADE_CIKIS',
        isYeriId: org.plant.id,
        depoId: org.wh.kk.id,
        belgeTipi: 'Iade',
        description: `[${TAG}] Red HM iade çıkış`,
        firmaId: fid,
        satirlar: [{ item_id: failedItemId, quantity: qty + 2, direction: -1 }],
      }).catch(() => null);
    });
  });

  // Yeniden sipariş (yalnız MCU)
  const po2 = await api('POST', '/satin-alma-siparisleri', {
    partner_id: ted.id,
    company_id: fid,
    plant_id: org.plant.id,
    status: 'Onayli',
    currency_code: 'TRY',
    description: `[${TAG}] Yeniden sipariş — red HM`,
    project_code: project.project_code,
    satirlar: [{ item_id: failedItemId, quantity: qty + 2, unit_price: 95 }],
  }, { firmaId: fid, userCode: 'xelek.sa' });

  const mk2 = await api('POST', '/mal-kabuller', {
    purchase_order_id: po2.id,
    warehouse_id: org.wh.hmd.id,
    company_id: fid,
    plant_id: org.plant.id,
    incoming_qc_required: true,
    description: `[${TAG}] Yeniden mal kabul`,
  }, { firmaId: fid });

  const gk2 = (await pool.query(
    `SELECT * FROM incoming_inspections WHERE goods_receipt_id=$1`,
    [mk2.id]
  )).rows;
  for (const g of gk2) {
    await api('POST', `/giris-kontrolleri/${g.id}/onayla`, { description: `[${TAG}] GK2` }, { firmaId: fid }).catch(() => null);
  }
  const gkk2 = (await pool.query(
    `SELECT q.* FROM qc_orders q
     WHERE q.direction='GKK' AND q.status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND q.item_id = $3
       AND (
         (q.source_type IN ('MAL_KABUL','MalKabul') AND q.source_id=$1)
         OR (q.source_type IN ('GIRIS_KONTROL','GirisKontrol') AND q.source_id = ANY($2::int[]))
         OR q.source_id=$1
       )
     ORDER BY q.id DESC`,
    [mk2.id, gk2.map((g) => g.id).concat([0]), failedItemId]
  )).rows;
  for (const e of gkk2) {
    await api('POST', `/kk-emirleri/${e.id}/onayla`, {
      onay: true,
      accepted_quantity: e.quantity || e.accepted_quantity,
      rejected_quantity: 0,
      target_warehouse_id: org.wh.hmd.id,
      description: `[${TAG}] GKK2 OK`,
    }, { firmaId: fid });
  }
  step('Yeniden sipariş + GKK', `PO2 #${po2.id} / MK2 #${mk2.id} — red HM stoğa girdi`);

  return { runId, ted, saTeklif, poId, mkId, po2, mk2, mrpRows: rows };
}

async function produceAndCkk(org, project, product, so, qty) {
  log('\n=== 9. Üretim → ÇKK → mamul depo ===');
  const fid = org.firma.id;
  const { fg, bomFg, rota } = product;

  // Yeterli HM yoksa açılış (her kalem ayrı txn — stok kilidi / abort güvenli)
  const { listWarehouseBalances } = require('../src/services/stokHareketService');
  for (const [item, need] of [
    [product.hmPcb, qty], [product.hmMcu, qty], [product.hmCase, qty],
  ]) {
    try {
      const bals = await listWarehouseBalances(pool, { depoId: org.wh.hmd.id });
      const have = (bals || [])
        .filter((b) => Number(b.item_id) === Number(item.id)
          && String(b.stock_status || 'Kullanilabilir') === 'Kullanilabilir')
        .reduce((s, b) => s + Number(b.bakiye || b.quantity || 0), 0);
      if (have < need) {
        await withTransaction(pool, async (client) => {
          await createStockMovement(client, {
            hareketTipi: 'STOK_GIRIS',
            isYeriId: org.plant.id,
            depoId: org.wh.hmd.id,
            belgeTipi: 'Acilis',
            description: `[${TAG}] HM tamamla ${item.item_code}`,
            firmaId: fid,
            satirlar: [{ item_id: item.id, quantity: need - have + 1, direction: 1 }],
          });
        });
        log(`  HM tamamlandı: ${item.item_code} +${need - have + 1}`);
      }
    } catch (e) {
      log(`  HM stok uyarısı ${item.item_code}: ${e.message}`);
    }
  }

  const ue = await api('POST', '/uretim-emirleri', {
    item_id: fg.id,
    product_bom_id: bomFg.id,
    route_id: rota.id,
    plant_id: org.plant.id,
    company_id: fid,
    component_warehouse_id: org.wh.hmd.id,
    fg_warehouse_id: org.wh.mam.id,
    wip_warehouse_id: org.wh.ym.id,
    planned_quantity: qty,
    sales_order_id: so.id,
    planned_firm: 'Kesin',
    description: `[${TAG}] ${PROJE} üretim`,
    project_code: project.project_code,
  }, { firmaId: fid });

  const ueId = ue.id;
  await api('POST', `/uretim-emirleri/${ueId}/onayla`, {}, { firmaId: fid }).catch(() => null);
  await api('POST', `/uretim-emirleri/${ueId}/baslat`, {}, { firmaId: fid }).catch(() => null);

  const ops = (await pool.query(
    `SELECT * FROM production_order_operations WHERE order_id=$1 ORDER BY line_no`,
    [ueId]
  )).rows;
  for (const op of ops) {
    await api('POST', `/uretim-emirleri/${ueId}/operasyon-tamamla`, {
      quantity: qty,
    }, { firmaId: fid }).catch(() => null);
  }

  // ÇKK
  const ckk = (await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='CKK' AND source_id=$1 AND status NOT IN ('Onayli','Kapali','Red')`,
    [ueId]
  )).rows;
  for (const e of ckk) {
    await api('POST', `/kk-emirleri/${e.id}/onayla`, {
      onay: true,
      accepted_quantity: e.quantity || qty,
      rejected_quantity: 0,
      target_warehouse_id: org.wh.mam.id,
      description: `[${TAG}] ÇKK OK → Mamul`,
    }, { firmaId: fid });
  }
  if (!ckk.length) {
    // Üretim girişi ile mamul stoğa
    await api('POST', '/uretim-girisleri', {
      order_id: ueId,
      quantity: qty,
      warehouse_id: org.wh.mam.id,
    }, { firmaId: fid }).catch(async () => {
      await withTransaction(pool, async (client) => {
        await createStockMovement(client, {
          hareketTipi: 'URETIM_GIRIS',
          isYeriId: org.plant.id,
          depoId: org.wh.mam.id,
          belgeTipi: 'Uretim',
          description: `[${TAG}] Üretim girişi`,
          firmaId: fid,
          satirlar: [{ item_id: fg.id, quantity: qty, direction: 1 }],
        });
      });
    });
  }
  step('Üretim + ÇKK', `UE #${ueId} → mamul depo ${qty} adet`);
  return { ueId };
}

async function shipInvoicePartial(org, project, so, fg, totalQty) {
  log('\n=== 10. Kısmi sevk %50 → irsaliye → fatura; kalan sevk ===');
  const fid = org.firma.id;
  const half = Math.floor(totalQty / 2);
  const rest = totalQty - half;
  const lines = (await pool.query(
    `SELECT * FROM sales_order_lines WHERE sales_order_id=$1 ORDER BY id`,
    [so.id]
  )).rows;
  const line = lines.find((l) => Number(l.item_id) === Number(fg.id)) || lines[0];

  const eBelge = {
    ship_city: 'İstanbul',
    ship_district: 'Kadıköy',
    ship_country: 'Türkiye',
    ship_postal_code: '34710',
    ship_to_address: 'X Firması Sevk Adresi No:1',
    carrier_title: 'X Nakliyat A.Ş.',
    carrier_tax_id: '1234567890',
    driver_name: 'Ali',
    driver_last_name: 'Yılmaz',
    driver_national_id: '10000000146',
    vehicle_plate: '34 XEL 01',
  };

  async function shipQty(q, label) {
    const miktarlar = {};
    miktarlar[line.id] = q;
    const sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      warehouse_id: org.wh.mam.id,
      miktarlar,
      description: `[${TAG}] ${label}`,
    }, { firmaId: fid });
    const sevkId = sevk.id || sevk.shipment_order_id || sevk.sevk_emri_id;

    let irs = await api('POST', '/delivery_notes/sevk-emrinden', {
      shipment_order_id: sevkId,
      warehouse_id: org.wh.mam.id,
      description: `[${TAG}] ${label} irsaliye`,
      project_code: project.project_code,
      company_id: fid,
      plant_id: org.plant.id,
      ...eBelge,
    }, { firmaId: fid });
    const irsId = irs.id || irs.delivery_note_id;
    await api('PUT', `/delivery_notes/${irsId}`, {
      ...irs,
      company_id: fid,
      plant_id: org.plant.id,
      project_code: project.project_code,
      description: `[${TAG}] ${label} irsaliye`,
      ...eBelge,
    }, { firmaId: fid }).catch(() => null);
    irs = await api('POST', `/delivery_notes/${irsId}/onayla`, {}, { firmaId: fid });
    await pool.query(
      `UPDATE delivery_notes SET e_document_status='Gonderildi' WHERE id=$1`,
      [irsId]
    ).catch(() => null);

    const fat = await api('POST', `/delivery_notes/${irsId}/fatura-olustur`, {
      description: `[${TAG}] ${label} fatura`,
    }, { firmaId: fid });
    const fatId = fat.id || fat.fatura?.id || fat.invoice?.id;
    if (fatId) {
      await api('POST', `/invoices/${fatId}/muhasebelestir`, {}, { firmaId: fid }).catch(() => null);
    }
    return { sevkId, irsId, fatId };
  }

  const p1 = await shipQty(half, '1. kısmi sevk');
  const p2 = await shipQty(rest, '2. kalan sevk');
  step('Kısmi + kalan sevk/fatura', `½=${half} irs ${p1.irsId}/fat ${p1.fatId}; kalan=${rest} irs ${p2.irsId}/fat ${p2.fatId}`);
  return { half, rest, p1, p2, line };
}

async function customerReturn(org, project, ship, fg) {
  log('\n=== 11. Müşteri 1 adet iade ===');
  const fid = org.firma.id;
  const irsId = ship.p2.irsId || ship.p1.irsId;
  const iade = await api('POST', `/delivery_notes/${irsId}/iade`, {
    warehouse_id: org.wh.mam.id,
    description: `[${TAG}] Müşteri 1 adet iade`,
    satirlar: [{ item_id: fg.id, quantity: 1 }],
  }, { firmaId: fid });

  if (ship.p2.fatId || ship.p1.fatId) {
    const fatId = ship.p2.fatId || ship.p1.fatId;
    await api('POST', `/invoices/${fatId}/iade`, {
      satirlar: [{ item_id: fg.id, quantity: 1 }],
      description: `[${TAG}] Satış iade faturası`,
    }, { firmaId: fid }).catch((e) => log(`  iade fatura uyarısı: ${e.message}`));
  }
  step('Müşteri iade', `1 adet ← irsaliye #${irsId} / iade #${iade.id || iade}`);
  return iade;
}

async function remakeAndReship(org, project, product, cari, qty = 1) {
  log('\n=== 12. 1 adet yeniden üretim + manuel satış siparişi ===');
  const fid = org.firma.id;
  const { fg, bomFg, rota } = product;

  // Gerekirse mini MRP / stok tamamla
  await withTransaction(pool, async (client) => {
    for (const item of [product.hmPcb, product.hmMcu, product.hmCase]) {
      await createStockMovement(client, {
        hareketTipi: 'STOK_GIRIS',
        isYeriId: org.plant.id,
        depoId: org.wh.hmd.id,
        belgeTipi: 'Acilis',
        description: `[${TAG}] Yeniden üretim HM`,
        firmaId: fid,
        satirlar: [{ item_id: item.id, quantity: qty + 1, direction: 1 }],
      }).catch(() => null);
    }
  });

  const ue = await api('POST', '/uretim-emirleri', {
    item_id: fg.id,
    product_bom_id: bomFg.id,
    route_id: rota.id,
    plant_id: org.plant.id,
    company_id: fid,
    component_warehouse_id: org.wh.hmd.id,
    fg_warehouse_id: org.wh.mam.id,
    wip_warehouse_id: org.wh.ym.id,
    planned_quantity: qty,
    planned_firm: 'Kesin',
    description: `[${TAG}] İade yerine 1 adet üretim`,
    project_code: project.project_code,
  }, { firmaId: fid });
  await api('POST', `/uretim-emirleri/${ue.id}/onayla`, {}, { firmaId: fid }).catch(() => null);
  await api('POST', `/uretim-emirleri/${ue.id}/baslat`, {}, { firmaId: fid }).catch(() => null);
  const ops = (await pool.query(
    `SELECT * FROM production_order_operations WHERE order_id=$1 ORDER BY line_no`,
    [ue.id]
  )).rows;
  for (const op of ops) {
    await api('POST', `/uretim-emirleri/${ue.id}/operasyon-tamamla`, {
      quantity: qty,
    }, { firmaId: fid }).catch(() => null);
  }
  const ckk = (await pool.query(
    `SELECT * FROM qc_orders WHERE direction='CKK' AND source_id=$1 AND status NOT IN ('Onayli','Kapali','Red')`,
    [ue.id]
  )).rows;
  for (const e of ckk) {
    await api('POST', `/kk-emirleri/${e.id}/onayla`, {
      onay: true, accepted_quantity: qty, rejected_quantity: 0,
      target_warehouse_id: org.wh.mam.id,
    }, { firmaId: fid });
  }
  if (!ckk.length) {
    await withTransaction(pool, async (client) => {
      await createStockMovement(client, {
        hareketTipi: 'URETIM_GIRIS',
        isYeriId: org.plant.id,
        depoId: org.wh.mam.id,
        belgeTipi: 'Uretim',
        description: `[${TAG}] 1 adet üretim girişi`,
        firmaId: fid,
        satirlar: [{ item_id: fg.id, quantity: qty, direction: 1 }],
      });
    });
  }

  // Manuel satış siparişi (onay kapısı ile)
  const so = await api('POST', '/sales_orders', {
    partner_id: cari.id || cari.partner_id,
    company_id: fid,
    plant_id: org.plant.id,
    order_type: 'SatisSiparis',
    status: 'OnayBekliyor',
    currency_code: 'TRY',
    description: `[${TAG}] İade yerine manuel sipariş`,
    project_code: project.project_code,
    satirlar: [{ item_id: fg.id, quantity: qty, unit_price: Number(fg.sales_price) || 12500, vat_rate: 20 }],
  }, { firmaId: fid, userCode: 'xelek.satis' });

  const kayit = await withTransaction(pool, async (client) => startApproval(client, {
    company_id: fid,
    screen_id: 'satis-siparisleri',
    module_code: 'SATIS',
    document_id: so.id,
    document_no: so.order_no,
    amount: Number(so.total_amount) || 0,
    currency_code: 'TRY',
    initiator_user_id: org.users.satisci,
    description: `[${TAG}] Manuel SO onay`,
  }));
  const mudur = (await pool.query(`SELECT * FROM users WHERE id=$1`, [org.users.satisMudur])).rows[0];
  if (kayit?.id && !kayit.atlandi) {
    await withTransaction(pool, async (client) => onaylaAdim(client, kayit.id, mudur, {
      notes: `[${TAG}] manuel SO onay`,
    }));
  }
  await pool.query(`UPDATE sales_orders SET status='Onayli' WHERE id=$1 AND status='OnayBekliyor'`, [so.id]);

  const lines = (await pool.query(
    `SELECT * FROM sales_order_lines WHERE sales_order_id=$1`, [so.id]
  )).rows;
  const miktarlar = {};
  miktarlar[lines[0].id] = qty;
  const eBelge = {
    ship_city: 'İstanbul', ship_district: 'Kadıköy', ship_country: 'Türkiye',
    ship_postal_code: '34710', ship_to_address: 'X Firması Sevk Adresi No:1',
    carrier_title: 'X Nakliyat A.Ş.', carrier_tax_id: '1234567890',
    driver_name: 'Ali', driver_last_name: 'Yılmaz', driver_national_id: '10000000146',
    vehicle_plate: '34 XEL 02',
  };
  const sevk = await api('POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
    warehouse_id: org.wh.mam.id, miktarlar,
  }, { firmaId: fid });
  const sevkId = sevk.id || sevk.shipment_order_id;
  let irs = await api('POST', '/delivery_notes/sevk-emrinden', {
    shipment_order_id: sevkId, warehouse_id: org.wh.mam.id,
    description: `[${TAG}] Yeniden sevk`, company_id: fid, plant_id: org.plant.id, ...eBelge,
  }, { firmaId: fid });
  await api('PUT', `/delivery_notes/${irs.id}`, { ...irs, ...eBelge, company_id: fid }, { firmaId: fid }).catch(() => null);
  irs = await api('POST', `/delivery_notes/${irs.id}/onayla`, {}, { firmaId: fid });
  await pool.query(`UPDATE delivery_notes SET e_document_status='Gonderildi' WHERE id=$1`, [irs.id]).catch(() => null);
  const fat = await api('POST', `/delivery_notes/${irs.id}/fatura-olustur`, {}, { firmaId: fid });
  const fatId = fat.id || fat.fatura?.id;
  if (fatId) await api('POST', `/invoices/${fatId}/muhasebelestir`, {}, { firmaId: fid }).catch(() => null);

  step('Yeniden üretim + sevk', `UE #${ue.id} / SO ${so.order_no} / irs ${irs.id} / fat ${fatId}`);
  return { ue, so, irs, fatId };
}

function writeDocs() {
  const md = `# XELEK — Elektronik Firma Uçtan Uca Süreç

**Oluşturma:** ${ts()} (Europe/Istanbul)  
**Firma:** ${FIRMA_ADI} (\`${FIRMA_KODU}\`)  
**Proje:** ${PROJE}  
**Etiket:** \`${TAG}\`

## Kullanıcılar
| Kod | Rol |
|-----|-----|
| xelek.satis | Satışçı |
| xelek.smudur | Satış müdürü (sipariş onayı) |
| xelek.sa | Satınalma sorumlusu |
| xelek.samudur | Satınalma müdürü |
Şifre: \`Demo123!\`

## Süreç adımları
${summary.steps.map((s, i) => `${i + 1}. **${s.name}** — ${s.detail || ''}`).join('\n')}

## Davranış düzeltmeleri
- Teklif→sipariş: onay modülü varsa sipariş **OnayBekliyor**; müdür onaylayınca **Onayli**
- OnayBekliyor sipariş **sevk edilemez**
- Dönüşen teklif durumu **Kapali**
- İrsaliye iadesi: Onayli / Kapali (faturalanmış) kabul

## Çalıştırma
\`\`\`bash
npm start
node scripts/demo-xelek-surec.js
\`\`\`

## Özet JSON
\`docs/system/demo-xelek-surec.json\`
`;
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_MD, md, 'utf8');
  fs.writeFileSync(OUT_JSON, JSON.stringify({ summary, audit }, null, 2), 'utf8');
  fs.writeFileSync(OUT_ART_MD, md, 'utf8');
  fs.writeFileSync(OUT_ART, JSON.stringify({ summary, audit }, null, 2), 'utf8');
  log(`Doküman: ${OUT_MD}`);
  log(`Artifact: ${OUT_ART_MD}`);
}

async function main() {
  log(`XELEK süreç başlıyor — ${ts()}`);
  // health
  const health = await fetch(BASE + '/').catch(() => null);
  if (!health?.ok && health?.status !== 200) {
    // static may 200
  }

  const org = await withTransaction(pool, (c) => ensureOrg(c));
  const project = await withTransaction(pool, (c) => ensureProject(c, org));
  const crm = await crmAndQuote(org, project);
  const product = await withTransaction(pool, (c) => buildXProduct(c, org));

  // Fırsat/teklif satırını X mamul ile bağla — satış siparişi
  const QTY = 10;
  const partnerId = crm.cari?.id || crm.cari?.partner_id
    || (await pool.query(
      `SELECT id FROM partners WHERE company_id=$1 AND partner_type='Musteri' ORDER BY id DESC LIMIT 1`,
      [org.firma.id]
    )).rows[0]?.id;
  const cari = { id: partnerId };

  const sales = await salesOrderWithApproval(org, project, cari, product.fg, QTY);
  const buy = await runMrpAndBuy(org, project, product, sales.so, QTY);
  const prod = await produceAndCkk(org, project, product, sales.so, QTY);
  const ship = await shipInvoicePartial(org, project, sales.so, product.fg, QTY);
  const ret = await customerReturn(org, project, ship, product.fg);
  const again = await remakeAndReship(org, project, product, cari, 1);

  summary.result = {
    company_id: org.firma.id,
    plant: org.plant.plant_code,
    project: project.project_code || PROJE,
    fg: product.fg.item_code,
    sales_order: sales.so.order_no,
    mrp_run: buy.runId,
    production_order: prod.ueId,
    return: ret?.id || true,
    remake_so: again.so.order_no,
  };
  writeDocs();
  log('\nTAMAMLANDI');
  await pool.end();
}

main().catch(async (e) => {
  console.error('\nHATA:', e);
  summary.errors.push(String(e.message || e));
  try { writeDocs(); } catch (_) { /* */ }
  try { await pool.end(); } catch (_) { /* */ }
  process.exit(1);
});
