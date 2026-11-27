/**
 * KTB ERP — baştan sona sistem sınama denetimi
 *   node scripts/sinama-full-audit.js
 *
 * Çıktı: docs/kilavuz/evidence/sinama-audit.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

const BASE = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const OUT_DIR = path.join(__dirname, '..', 'docs', 'kilavuz', 'evidence');
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = process.env.DEMO_PASS || 'Demo123!';

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Login başarısız: ${JSON.stringify(j)}`);
  return j;
}

async function api(token, firmaId, method, urlPath, body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const opts = { method, headers };
  if (body != null) opts.body = JSON.stringify(body);
  const t0 = Date.now();
  const r = await fetch(BASE + urlPath, opts);
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 200) }; }
  return { status: r.status, ms: Date.now() - t0, data };
}

function rowCount(data) {
  if (Array.isArray(data)) return data.length;
  if (data?.rows && Array.isArray(data.rows)) return data.rows.length;
  if (data?.items && Array.isArray(data.items)) return data.items.length;
  return null;
}

const ENDPOINTS = [
  // Tanımlar / org
  { path: '/companies', scope: false, mod: 'sistem' },
  { path: '/is-yerleri', scope: true, mod: 'sistem' },
  { path: '/warehouses', scope: true, mod: 'stok' },
  { path: '/olcu-birimleri', scope: false, mod: 'tanim' },
  { path: '/para-birimleri', scope: false, mod: 'tanim' },
  { path: '/users', scope: false, mod: 'sistem' },
  // Stok / cari
  { path: '/items', scope: true, mod: 'stok' },
  { path: '/partners', scope: true, mod: 'cari' },
  { path: '/stok-hareketleri', scope: true, mod: 'stok' },
  { path: '/stok-bakiyeleri', scope: true, mod: 'stok' },
  // Satış
  { path: '/satis-teklifleri', scope: true, mod: 'satis' },
  { path: '/sales_orders', scope: true, mod: 'satis' },
  { path: '/sevk-emirleri', scope: true, mod: 'satis' },
  { path: '/delivery_notes', scope: true, mod: 'satis' },
  { path: '/invoices', scope: true, mod: 'finans' },
  // Satınalma
  { path: '/satin-alma-talepleri', scope: true, mod: 'satinalma' },
  { path: '/satin-alma-teklif-istekleri', scope: true, mod: 'satinalma' },
  { path: '/satin-alma-teklifleri', scope: true, mod: 'satinalma' },
  { path: '/satin-alma-siparisleri', scope: true, mod: 'satinalma' },
  { path: '/mal-kabuller', scope: true, mod: 'satinalma' },
  // Üretim
  { path: '/urun-agaclari', scope: true, mod: 'uretim' },
  { path: '/bom/patlatma', scope: true, mod: 'uretim' },
  { path: '/routings', scope: true, mod: 'uretim' },
  { path: '/is-merkezleri', scope: true, mod: 'uretim' },
  { path: '/uretim-emirleri', scope: true, mod: 'uretim' },
  { path: '/uretim-girisleri', scope: true, mod: 'uretim' },
  { path: '/uretim-parametreleri', scope: true, mod: 'uretim' },
  // Fason
  { path: '/fason/siparisler', scope: true, mod: 'fason' },
  { path: '/fason/operasyonlar', scope: true, mod: 'fason' },
  { path: '/fason/parametreler', scope: true, mod: 'fason' },
  // Kalite
  { path: '/kk-emirleri?direction=GKK', scope: true, mod: 'kalite' },
  { path: '/kk-emirleri?direction=CKK', scope: true, mod: 'kalite' },
  { path: '/kk-kalite/cihazlar', scope: true, mod: 'kalite' },
  { path: '/kk-kalite/kalibrasyonlar', scope: true, mod: 'kalite' },
  { path: '/kk-capa', scope: true, mod: 'kalite' },
  { path: '/kk-uygunsuzluklar', scope: true, mod: 'kalite' },
  // MRP / CRM / PRJ / İK / Finans
  { path: '/mrp/calismalar', scope: true, mod: 'mrp' },
  { path: '/crm-adaylar', scope: true, mod: 'crm' },
  { path: '/crm-firsatlar', scope: true, mod: 'crm' },
  { path: '/crm-faaliyetler', scope: true, mod: 'crm' },
  { path: '/prj-projeler', scope: true, mod: 'prj' },
  { path: '/prj-isler', scope: true, mod: 'prj' },
  { path: '/hr-personel', scope: true, mod: 'hr' },
  { path: '/hr-org/departmanlar', scope: true, mod: 'hr' },
  { path: '/hr-ise-alim/ilanlar', scope: true, mod: 'hr' },
  { path: '/hr-bordro/calismalar', scope: true, mod: 'hr' },
  { path: '/finans-nakit/kasa-hesaplari', scope: true, mod: 'finans' },
  { path: '/finans-nakit/banka-hesaplari', scope: true, mod: 'finans' },
  { path: '/tahsilat-odemeler', scope: true, mod: 'finans' },
  { path: '/onay-rotalari', scope: true, mod: 'onay' },
  { path: '/lisanslar', scope: false, mod: 'sistem' },
];

async function processFlowChecks(token, firmaId, code) {
  const flows = [];
  const push = (name, ok, detail) => flows.push({ name, ok, detail });

  // WO onizleme
  const wo = await api(token, firmaId, 'GET', '/uretim-emirleri');
  const emir = Array.isArray(wo.data) ? wo.data.find((e) => (e.operasyonlar || []).length) || wo.data[0] : null;
  if (emir?.id) {
    const oniz = await api(token, firmaId, 'GET', `/uretim-girisleri/onizleme?order_id=${emir.id}`);
    push('Üretim girişi önizleme', oniz.status < 400 && oniz.data?.order_id, {
      order_no: oniz.data?.order_no,
      malzemeler: (oniz.data?.malzemeler || []).length,
      yan_urunler: (oniz.data?.yan_urunler || []).length,
      kalan: oniz.data?.op_remaining_quantity,
    });
    const hasTransferCol = (emir.operasyonlar || []).some((o) => 'transferred_quantity' in o);
    push('Rota aktarılan alanı', hasTransferCol, { ops: (emir.operasyonlar || []).length });
    const hasRemaining = (emir.malzemeler || []).some((m) => 'remaining_quantity' in m || m.consumed_quantity != null);
    push('Malzeme tüketilen/kalan', hasRemaining, {
      sample: (emir.malzemeler || [])[0]
        ? {
          planned: emir.malzemeler[0].planned_quantity,
          consumed: emir.malzemeler[0].consumed_quantity,
          remaining: emir.malzemeler[0].remaining_quantity,
        }
        : null,
    });
  } else {
    push('Üretim girişi önizleme', false, { hata: 'Üretim emri yok' });
  }

  // BOM patlatma
  const bom = await api(token, firmaId, 'GET', '/urun-agaclari');
  const agac = Array.isArray(bom.data) ? bom.data[0] : null;
  if (agac?.id) {
    const pat = await api(token, firmaId, 'GET', `/bom/patlatma?agac_id=${agac.id}&quantity=10`);
    push('BOM patlatma', pat.status < 400 && Array.isArray(pat.data) && pat.data.length > 0, {
      satır: Array.isArray(pat.data) ? pat.data.length : 0,
    });
  } else {
    push('BOM patlatma', false, { hata: 'BOM yok' });
  }

  // SA / satış özet
  for (const [label, p] of [
    ['Satış siparişleri', '/sales_orders'],
    ['SA siparişleri', '/satin-alma-siparisleri'],
    ['Mal kabuller', '/mal-kabuller'],
  ]) {
    const r = await api(token, firmaId, 'GET', p);
    push(label, r.status < 400, { n: rowCount(r.data), status: r.status });
  }

  // Health
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch((e) => ({ hata: e.message }));
  push('Health', health.status === 'ok' || health.durum === 'ok', health);

  return flows;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const started = new Date().toISOString();
  const auth = await login();
  console.log('login ok', auth.username || USER);

  const firms = (await pool.query(
    `SELECT id, company_code, company_name FROM companies ORDER BY id`,
  )).rows;

  const report = {
    started,
    base: BASE,
    user: USER,
    firms: [],
    summary: { ok: 0, empty: 0, error: 0, flowOk: 0, flowFail: 0 },
  };

  const prefer = ['MARVEL', 'ELEK', 'TEKS', 'ADGIDA', 'EGEPACK', 'DOKUM'];
  const ordered = [
    ...prefer.map((c) => firms.find((f) => f.company_code === c)).filter(Boolean),
    ...firms.filter((f) => !prefer.includes(f.company_code)),
  ].slice(0, 6);

  for (const firma of ordered) {
    console.log('\n===', firma.company_code, firma.id, '===');
    const entry = {
      id: firma.id,
      code: firma.company_code,
      name: firma.company_name,
      endpoints: [],
      flows: [],
    };

    for (const ep of ENDPOINTS) {
      const fid = ep.scope ? firma.id : null;
      const r = await api(auth.access_token, fid, 'GET', ep.path);
      const n = rowCount(r.data);
      const row = {
        path: ep.path,
        mod: ep.mod,
        status: r.status,
        ms: r.ms,
        count: n,
        ok: r.status < 400,
        empty: r.status < 400 && n === 0,
        hata: r.status >= 400 ? (r.data?.hata || r.data) : null,
      };
      entry.endpoints.push(row);
      if (!row.ok) report.summary.error += 1;
      else if (row.empty) report.summary.empty += 1;
      else report.summary.ok += 1;
      process.stdout.write(row.ok ? (row.empty ? '·' : '.') : 'X');
    }
    console.log('');

    entry.flows = await processFlowChecks(auth.access_token, firma.id, firma.company_code);
    for (const f of entry.flows) {
      if (f.ok) report.summary.flowOk += 1;
      else report.summary.flowFail += 1;
      console.log(`  flow ${f.ok ? 'OK' : 'FAIL'}: ${f.name}`);
    }
    report.firms.push(entry);
  }

  report.finished = new Date().toISOString();
  const out = path.join(OUT_DIR, 'sinama-audit.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('\nYazıldı', out);
  console.log(JSON.stringify(report.summary, null, 2));
  await pool.end().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
