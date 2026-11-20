#!/usr/bin/env node
/**
 * Eşzamanlı smoke: paralel liste GET + çapraz firma GET-by-id (404 beklenen).
 * Kullanım: node scripts/smoke-concurrent.js [baseUrl]
 */
require('dotenv').config();
const BASE = process.argv[2] || process.env.ERP_BASE_URL || 'http://127.0.0.1:3000';

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', ...headers } });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
  return { status: res.status, json };
}

async function main() {
  const health = await get('/health');
  if (health.status !== 200) {
    console.error('health fail', health.status);
    process.exit(2);
  }

  const paths = [
    '/sales_orders?limit=5',
    '/purchase_orders?limit=5',
    '/invoices?limit=5',
    '/delivery_notes?limit=5',
    '/uretim-emirleri?limit=5',
    '/partners?limit=5',
    '/items?limit=5',
    '/is-merkezi-yuku?horizon_days=7',
    '/finans-yaslandirma?yon=alacak',
    '/banka-mutabakat',
    '/sabit-kiymetler',
    '/gl-butceler',
    '/bakim-emirleri',
    '/fason/siparisler',
    '/kk-emirleri?direction=GKK',
  ];

  const t0 = Date.now();
  const results = await Promise.all(paths.map((p) => get(p, { 'X-Kullanici-Kodu': 'ADMIN' }).then((r) => ({ path: p, ...r }))));
  const ms = Date.now() - t0;

  let fail = 0;
  for (const r of results) {
    const ok = r.status >= 200 && r.status < 500;
    if (!ok || r.status >= 500) {
      fail += 1;
      console.log('FAIL', r.status, r.path);
    } else {
      console.log('OK', r.status, r.path);
    }
  }

  // Çapraz firma: iki firma varsa yanlış X-Firma-Id ile 404
  const firms = await get('/companies');
  const list = Array.isArray(firms.json) ? firms.json : (firms.json?.rows || []);
  if (list.length >= 2) {
    const inv = await get('/invoices?limit=1', { 'X-Firma-Id': String(list[0].id) });
    const rows = Array.isArray(inv.json) ? inv.json : [];
    if (rows[0]?.id) {
      const cross = await get(`/invoices/${rows[0].id}`, { 'X-Firma-Id': String(list[1].id) });
      console.log(cross.status === 404 ? 'OK' : 'FAIL', cross.status, 'cross-firma invoice GET');
      if (cross.status !== 404) fail += 1;
    }
  }

  console.log(JSON.stringify({ base: BASE, parallel: paths.length, ms, fail }, null, 2));
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
