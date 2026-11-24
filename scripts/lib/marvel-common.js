/**
 * Metal Marvel demo sim — ortak yardımcılar
 */
const path = require('path');

const FIRMA_KODU = 'MARVEL';
const FIRMA_ADI = 'Metal Marvel Figür Sanayi A.Ş.';
const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;

const TAG = {
  W1: 'MMARVEL-W1',
  W2: 'MMARVEL-W2',
  W3: 'MMARVEL-W3',
  LABEL: 'METAL-MARVEL-SIM',
};

const DATES = {
  w1Start: '2026-11-03',
  w1Mid: '2026-11-07',
  w2Start: '2026-11-10',
  w2Mid: '2026-11-14',
  w3Start: '2026-11-17',
  w3Mid: '2026-11-19',
  w3End: '2026-11-21',
};

const FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Emre', 'Zeynep', 'Can', 'Elif', 'Murat', 'Selin',
  'Burak', 'Deniz', 'Gamze', 'Hakan', 'İpek', 'Kemal', 'Leyla', 'Oğuz', 'Pınar', 'Serkan',
];
const LAST_NAMES = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Öztürk', 'Aydın', 'Arslan', 'Koç', 'Polat',
  'Acar', 'Erdoğan', 'Güneş', 'Kurt', 'Aslan', 'Yıldız', 'Tekin', 'Özkan', 'Karaca', 'Bulut',
];

function log(msg) {
  console.log(msg);
}

function stepTry(label, fn, summary, key) {
  return (async () => {
    try {
      const out = await fn();
      log(`  ✓ ${label}`);
      if (summary && key) summary[key] = out;
      return out;
    } catch (err) {
      log(`  ✗ ${label}: ${err.message}`);
      if (summary?.errors) summary.errors.push({ step: label, hata: err.message });
      return null;
    }
  })();
}

async function api(method, urlPath, body, firmaId, user = 'owner') {
  const headers = {
    'Content-Type': 'application/json',
    'X-Kullanici-Kodu': user,
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  if (global.__MARVEL_TOKEN) headers.Authorization = `Bearer ${global.__MARVEL_TOKEN}`;
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
    throw new Error(`${method} ${urlPath} → fetch: ${err.message}`);
  }
  clearTimeout(timer);
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) {
    throw new Error(`${method} ${urlPath} → ${r.status}: ${data?.hata || data?.detay || text?.slice(0, 300)}`);
  }
  return data;
}

async function apiAsUser(userCode, method, urlPath, body, firmaId) {
  return api(method, urlPath, body, firmaId, userCode);
}

async function ensureOwnerLogin() {
  try {
    const r = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'Demo123!' }),
    });
    const j = await r.json();
    if (j.access_token) global.__MARVEL_TOKEN = j.access_token;
  } catch { /* soft */ }
}

function evidencePath() {
  return path.join(__dirname, '../../docs/metal-marvel/evidence/marvel-sim-ozet.json');
}

module.exports = {
  FIRMA_KODU,
  FIRMA_ADI,
  BASE_URL,
  TAG,
  DATES,
  FIRST_NAMES,
  LAST_NAMES,
  log,
  stepTry,
  api,
  apiAsUser,
  ensureOwnerLogin,
  evidencePath,
};