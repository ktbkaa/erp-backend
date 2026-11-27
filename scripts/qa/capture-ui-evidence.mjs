#!/usr/bin/env node
/**
 * Key UI screenshots via Chrome headless (localhost soft session).
 * Uses /usr/bin/timeout — the chrome wrapper can hang on remote-debugging-port.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const evidenceRoot = path.join(__dirname, '../../docs/qa/evidence');
const artifacts = '/opt/cursor/artifacts';
const CHROME = fs.existsSync('/opt/google/chrome/chrome')
  ? '/opt/google/chrome/chrome'
  : 'google-chrome';

function shot(url, outPath, delayMs = 3500) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const r = spawnSync(
    'timeout',
    [
      '25s',
      CHROME,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--window-size=1440,900',
      `--virtual-time-budget=${delayMs}`,
      `--screenshot=${outPath}`,
      url,
    ],
    { encoding: 'utf8', timeout: 30000 }
  );
  return fs.existsSync(outPath) && fs.statSync(outPath).size > 1000;
}

const shots = [
  { key: 'system/01-login-or-home.png', url: `${BASE}/` },
  { key: 'sales/01-sales-orders.png', url: `${BASE}/#satis-siparisleri` },
  { key: 'inventory/01-items.png', url: `${BASE}/#stok-karti` },
  { key: 'finance/01-invoices.png', url: `${BASE}/#fatura-yonetimi` },
  { key: 'production/01-work-orders.png', url: `${BASE}/#uretim-emirleri` },
  { key: 'purchasing/01-purchase-orders.png', url: `${BASE}/#satin-alma-siparisleri` },
  { key: 'end-to-end/01-mrp-console.png', url: `${BASE}/#mrp-calisma` },
  { key: 'end-to-end/02-qa-dashboard.png', url: `file://${path.join(evidenceRoot, '../dashboard/index.html')}` },
];

const results = [];
for (const s of shots) {
  const out = path.join(evidenceRoot, s.key);
  const ok = shot(s.url, out, s.key.includes('dashboard') ? 1500 : 4500);
  results.push({ key: s.key, ok, bytes: ok ? fs.statSync(out).size : 0 });
  if (ok) {
    fs.mkdirSync(artifacts, { recursive: true });
    fs.copyFileSync(out, path.join(artifacts, path.basename(out)));
  }
  console.error(ok ? `OK ${s.key}` : `FAIL ${s.key}`);
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
