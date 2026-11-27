/**
 * Metal Marvel Figür Sanayi — orta-büyük ölçekli tam süreç simülasyonu
 *
 * Firma: MARVEL (döküm + CNC süperkahraman figürleri)
 * ~120 beyaz yaka + ~400 mavi yaka; departman ERP kullanıcıları
 * 3 haftalık süreç (MMARVEL-W1/W2/W3) + lisans + kalibrasyon
 *
 *   node scripts/demo-metal-marvel-sim.js
 *   npm run demo:marvel
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const {
  FIRMA_KODU, TAG, log, ensureOwnerLogin, evidencePath,
} = require('./lib/marvel-common');
const { purgeMarvelIfExists } = require('./lib/marvel-purge');
const {
  ensureCompany,
  ensurePlantAndWarehouses,
  ensureWorkCenters,
  seedHrOrg,
  seedLicense,
  seedCalibration,
  ensurePoApprovalRule,
  upsertErpUser,
} = require('./lib/marvel-org');
const { seedMasterData } = require('./lib/marvel-master');
const { runWeek1, runWeek2, runWeek3 } = require('./lib/marvel-process');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'metal-marvel', 'evidence');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  log('=== Metal Marvel simülasyonu ===');
  await ensureOwnerLogin();

  await purgeMarvelIfExists();

  // purge pool'u kapatmış olabilir
  delete require.cache[require.resolve('../db')];
  const db = require('../db');

  const summary = {
    firma: null,
    tags: TAG,
    org: {},
    hr: {},
    license: null,
    calibration: [],
    master: {},
    week1: {},
    week2: {},
    week3: {},
    errors: [],
    users: {},
  };

  let firma;
  let plant;
  let wh;
  let wc;
  let hr;
  let master;

  await withTransaction(db, async (client) => {
    firma = await ensureCompany(client);
    ({ plant, wh } = await ensurePlantAndWarehouses(client, firma.id));
    wc = await ensureWorkCenters(client, plant.id);
    log(`Firma ${firma.company_code}#${firma.id} · ${plant.plant_code}`);
  });

  await db.query(
    `INSERT INTO user_company_permissions (user_id, company_id)
     SELECT u.id, $1 FROM users u
     WHERE LOWER(COALESCE(u.user_code,'')) IN ('owner','admin','tester')
     ON CONFLICT DO NOTHING`,
    [firma.id],
  );
  await upsertErpUser(db, {
    userCode: 'owner',
    first: 'Kagan',
    last: 'Admin',
    title: 'Sistem',
    role: 'ADMIN',
    companyId: firma.id,
  }).catch(() => null);

  // seedHrOrg HTTP API + SQL karışık; transaction kullanma (user_id görünürlüğü)
  try {
    hr = await seedHrOrg(db, firma.id, { plant });
  } catch (e) {
    log(`İK seed hata: ${e.message}`);
    summary.errors.push({ step: 'hr', hata: e.message });
    hr = { depts: {}, users: {}, employees: {}, counts: {}, shifts: {}, calendar: null };
  }

  try {
    summary.license = await seedLicense(firma.id);
    log('Lisans OK');
  } catch (e) {
    log(`Lisans hata: ${e.message}`);
    summary.errors.push({ step: 'lisans', hata: e.message });
  }

  try {
    summary.calibration = await seedCalibration(
      firma.id,
      plant.id,
      hr.users['marvel.kalibrasyon']?.id || hr.users['marvel.kalite']?.id,
    );
    log(`Kalibrasyon cihazları: ${summary.calibration.length}`);
  } catch (e) {
    log(`Kalibrasyon hata: ${e.message}`);
    summary.errors.push({ step: 'kalibrasyon', hata: e.message });
  }

  try {
    await ensurePoApprovalRule(db, firma.id, hr.users['marvel.finans']?.id);
  } catch (e) {
    log(`Onay kuralı: ${e.message}`);
    summary.errors.push({ step: 'onay-kural', hata: e.message });
  }

  try {
    await withTransaction(db, async (client) => {
      master = await seedMasterData(client, {
        firma, plant, wh, wc, tag: TAG.LABEL,
      });
    });
  } catch (e) {
    log(`Master hata: ${e.message}`);
    summary.errors.push({ step: 'master', hata: e.message });
    master = { items: {}, partners: {}, boms: {} };
  }

  summary.firma = { id: firma.id, code: firma.company_code, name: firma.company_name };
  summary.org = {
    plant: { id: plant.id, code: plant.plant_code },
    warehouses: Object.fromEntries(
      Object.entries(wh).filter(([k]) => !/^\d+$/.test(k)).map(([k, v]) => [k, { id: v.id, code: v.warehouse_code }]),
    ),
    work_centers: Object.fromEntries(
      Object.entries(wc).map(([k, v]) => [k, { id: v.id, code: v.center_code }]),
    ),
  };
  summary.hr = { counts: hr.counts, departments: Object.keys(hr.depts) };
  summary.users = hr.users;
  summary.master = {
    items: Object.keys(master.items || {}),
    partners: Object.keys(master.partners || {}),
    boms: Object.keys(master.boms || {}),
  };

  const ctx = {
    firma,
    plant,
    wh,
    wc,
    hr,
    master,
    users: hr.users,
    calibration: summary.calibration,
    summary,
    out: summary,
  };

  log('\n--- Hafta 1 (CRM → satış → SA talep/direkt) ---');
  try {
    summary.week1 = await runWeek1(ctx);
  } catch (e) {
    log(`W1 fatal: ${e.message}`);
    summary.errors.push({ step: 'W1', hata: e.message });
  }

  log('\n--- Hafta 2 (üretim / proje / kalite) ---');
  try {
    summary.week2 = await runWeek2(ctx);
  } catch (e) {
    log(`W2 fatal: ${e.message}`);
    summary.errors.push({ step: 'W2', hata: e.message });
  }

  log('\n--- Hafta 3 (sevk / fatura / İK / CAPA / MRP) ---');
  try {
    await withTransaction(db, async (client) => {
      summary.week3 = await runWeek3(ctx, client);
    });
  } catch (e) {
    log(`W3 fatal: ${e.message}`);
    summary.errors.push({ step: 'W3', hata: e.message });
  }

  const shotIds = {
    firmaId: firma.id,
    item: master.items?.iron || master.items?.fgIron || Object.values(master.items || {})[0],
    bom: master.boms?.iron || Object.values(master.boms || {})[0],
    partner: master.partners?.musCollector || Object.values(master.partners || {})[0],
    so: summary.week1?.so || summary.week1?.salesOrder,
    po: summary.week1?.poReq || summary.week1?.poDirect,
    wo: summary.week2?.woDokum || summary.week2?.production,
    project: summary.week2?.project,
    cihaz: summary.calibration?.[0],
    fatura: summary.week3?.invoice || summary.week3?.fatura,
    emp: hr.employees?.IK?.[0] || hr.employees?.Satis?.[0],
    license: summary.license,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'shot-ids.json'), JSON.stringify(shotIds, null, 2));
  const ozetPath = evidencePath();
  fs.mkdirSync(path.dirname(ozetPath), { recursive: true });
  fs.writeFileSync(ozetPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'marvel-sim-ozet.json'), JSON.stringify(summary, null, 2));

  log(`\nÖzet: ${ozetPath}`);
  log(`Hatalar: ${summary.errors.length}`);
  log(`İK: ${JSON.stringify(summary.hr.counts)}`);
  await db.end().catch(() => null);
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
