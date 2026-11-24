#!/usr/bin/env node
/**
 * Metal Marvel Figür Sanayi — kapsamlı demo simülasyonu
 *
 * Kullanım:
 *   node scripts/demo-metal-marvel-sim.js
 *   npm run demo:marvel
 *
 * Çıktı: docs/metal-marvel/evidence/marvel-sim-ozet.json
 *
 * Önkoşul: ERP sunucusu çalışıyor olmalı (npm start), migrate güncel.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { purgeMarvelIfExists } = require('./lib/marvel-purge');
const {
  FIRMA_KODU, FIRMA_ADI, TAG, log, ensureOwnerLogin, evidencePath,
} = require('./lib/marvel-common');
const {
  ensureCompany,
  ensurePlantAndWarehouses,
  ensureWorkCenters,
  seedHrOrg,
  seedLicense,
  seedCalibration,
  ensurePoApprovalRule,
} = require('./lib/marvel-org');
const { seedMasterData } = require('./lib/marvel-master');
const { runWeek1, runWeek2, runWeek3 } = require('./lib/marvel-process');

const summary = {
  firma: FIRMA_KODU,
  firma_adi: FIRMA_ADI,
  tags: TAG,
  started_at: new Date().toISOString(),
  errors: [],
  counts: {},
  users: {},
  process_docs: {},
};

async function main() {
  log(`\n${'='.repeat(60)}\n  METAL MARVEL DEMO SIM — ${TAG.LABEL}\n${'='.repeat(60)}\n`);

  await ensureOwnerLogin();

  let existing = null;
  try {
    existing = await purgeMarvelIfExists();
  } catch (err) {
    log(`Purge uyarısı: ${err.message}`);
  }

  let firma = null;
  let org = null;
  let master = null;
  let hr = null;
  let license = null;
  let calibration = null;

  try {
    await withTransaction(pool, async (client) => {
      firma = await ensureCompany(client);
      if (!firma?.id) throw new Error('Firma oluşturulamadı');
      summary.firma_id = firma.id;

      const { plant, wh } = await ensurePlantAndWarehouses(client, firma.id);
      const wc = await ensureWorkCenters(client, plant.id);
      org = { firma, plant, wh, wc };
      log('Org: Gebze + 7 depo + 3 iş merkezi hazır');
    });
  } catch (err) {
    console.error('FATAL: Firma/org oluşturma başarısız:', err.message);
    summary.fatal = err.message;
    writeSummary();
    process.exitCode = 1;
    await safeEnd();
    return;
  }

  try {
    await withTransaction(pool, async (client) => {
      master = await seedMasterData(client, { ...org, tag: TAG.W1 });
    });
    summary.counts.items = Object.keys(master.items).length;
    summary.counts.partners = Object.keys(master.partners).length;
  } catch (err) {
    log(`Master data hatası: ${err.message}`);
    summary.errors.push({ step: 'master', hata: err.message });
  }

  try {
    hr = await seedHrOrg(pool, firma.id, org);
    summary.users = hr.users;
    summary.counts.hr = hr.counts.hr;
    const finUser = hr.users['marvel.finans']?.id;
    await withTransaction(pool, async (client) => {
      await ensurePoApprovalRule(client, firma.id, finUser);
    });
  } catch (err) {
    log(`İK/org API hatası: ${err.message}`);
    summary.errors.push({ step: 'hr', hata: err.message });
    hr = hr || { depts: {}, users: {}, employees: {} };
  }

  try {
    license = await seedLicense(firma.id);
    summary.license = license;
  } catch (err) {
    log(`Lisans: ${err.message}`);
    summary.errors.push({ step: 'license', hata: err.message });
  }

  try {
    const kaliteUid = hr.users['marvel.kalite']?.id;
    calibration = await seedCalibration(firma.id, org.plant.id, kaliteUid);
    summary.calibration_devices = calibration?.map((d) => d.instrument_code || d.id);
  } catch (err) {
    log(`Kalibrasyon: ${err.message}`);
    summary.errors.push({ step: 'calibration', hata: err.message });
  }

  const ctx = {
    firma: org.firma,
    plant: org.plant,
    wh: org.wh,
    wc: org.wc,
    master,
    hr,
    calibration,
    out: summary.process_docs,
  };

  await runWeek1(ctx).catch((e) => {
    log(`W1 fatal wrap: ${e.message}`);
    summary.errors.push({ step: TAG.W1, hata: e.message });
  });
  await runWeek2(ctx).catch((e) => {
    log(`W2 fatal wrap: ${e.message}`);
    summary.errors.push({ step: TAG.W2, hata: e.message });
  });
  await runWeek3(ctx, pool).catch((e) => {
    log(`W3 fatal wrap: ${e.message}`);
    summary.errors.push({ step: TAG.W3, hata: e.message });
  });

  // Sayımlar
  try {
    const c = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM hr_employees WHERE company_id=$1) AS employees,
         (SELECT COUNT(*)::int FROM hr_employees WHERE company_id=$1 AND collar_type='BeyazYaka') AS white,
         (SELECT COUNT(*)::int FROM hr_employees WHERE company_id=$1 AND collar_type='MaviYaka') AS blue,
         (SELECT COUNT(*)::int FROM items WHERE company_id=$1) AS items,
         (SELECT COUNT(*)::int FROM sales_orders WHERE company_id=$1) AS sales_orders,
         (SELECT COUNT(*)::int FROM purchase_orders WHERE company_id=$1) AS purchase_orders,
         (SELECT COUNT(*)::int FROM production_orders WHERE company_id=$1) AS production_orders,
         (SELECT COUNT(*)::int FROM qc_instruments WHERE company_id=$1) AS instruments`,
      [firma.id],
    );
    summary.counts.final = c.rows[0];
  } catch (err) {
    summary.errors.push({ step: 'counts', hata: err.message });
  }

  summary.finished_at = new Date().toISOString();
  summary.ok = summary.errors.length === 0;
  writeSummary();
  log(`\nBitti. Özet: ${evidencePath()}`);
  log(`Filtre: project_code IN ('${TAG.W1}','${TAG.W2}','${TAG.W3}') OR description ILIKE '%${TAG.LABEL}%'`);
  await safeEnd();
}

function writeSummary() {
  const outPath = evidencePath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
}

async function safeEnd() {
  try { await pool.end(); } catch { /* */ }
}

main().catch(async (err) => {
  console.error('MARVEL_SIM_FAIL', err);
  summary.errors.push({ step: 'main', hata: err.message });
  writeSummary();
  process.exitCode = 1;
  await safeEnd();
});