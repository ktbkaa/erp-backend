/**
 * Tüm ekran endpoint'lerine GET smoke + auth/health.
 * Çıktı: docs/qa/api-smoke-results.json + 03 güncellemesi için özet
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const inv = JSON.parse(fs.readFileSync(path.join(root, 'docs/qa/screen-inventory.json'), 'utf8'));

async function login() {
  const candidates = [
    { username: 'ADMIN', password: 'admin' },
    { username: 'admin', password: 'admin' },
    { user_code: 'ADMIN', password: 'admin' },
    { kullanici_kodu: 'ADMIN', parola: 'admin' },
  ];
  for (const body of candidates) {
    try {
      const r = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.access_token || j.token || j.user_code || j.id)) {
        return {
          token: j.access_token || j.token || null,
          user: j.user_code || j.username || body.username || 'ADMIN',
          userId: j.id || null,
          firmaId: j.aktif_firma_id || j.company_id || null,
          raw: j,
        };
      }
    } catch (_) { /* next */ }
  }
  return { token: null, user: 'ADMIN', firmaId: null, raw: null };
}

function headers(session) {
  const h = { Accept: 'application/json' };
  if (session.token) h.Authorization = `Bearer ${session.token}`;
  h['X-Kullanici-Kodu'] = String(session.user?.kullanici_kodu || session.user || 'admin');
  if (session.firmaId) h['X-Firma-Id'] = String(session.firmaId);
  return h;
}

async function get(url, session) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: headers(session) });
    const ms = Date.now() - t0;
    let body = null;
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('json')) body = await r.json().catch(() => null);
    else body = await r.text().catch(() => '');
    return { ok: r.ok, status: r.status, ms, body };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - t0, error: err.message };
  }
}

function listUrl(endpoint) {
  if (!endpoint) return null;
  // query'li endpoint'ler (kk-emirleri?direction=GKK)
  if (endpoint.startsWith('/')) return `${BASE}${endpoint}`;
  return `${BASE}/${endpoint}`;
}

async function main() {
  const health = await get(`${BASE}/health`, {});
  const session = await login();
  // Firma listesi
  const firms = await get(`${BASE}/companies`, session);
  const firmRows = Array.isArray(firms.body) ? firms.body : (firms.body?.rows || []);
  if (!session.firmaId && firmRows[0]?.id) session.firmaId = firmRows[0].id;

  const me = await get(`${BASE}/auth/me`, session);

  const results = [];
  const seen = new Set();
  for (const s of inv.screens) {
    const url = listUrl(s.endpoint);
    if (!url) {
      results.push({ screenId: s.id, title: s.title, skip: true, reason: 'no endpoint' });
      continue;
    }
    const key = url.replace(BASE, '');
    if (seen.has(key)) {
      results.push({
        screenId: s.id, title: s.title, endpoint: key, skip: true, reason: 'duplicate endpoint',
      });
      continue;
    }
    seen.add(key);
    const res = await get(url, session);
    const rowCount = Array.isArray(res.body)
      ? res.body.length
      : (Array.isArray(res.body?.rows) ? res.body.rows.length
        : (Array.isArray(res.body?.satirlar) ? res.body.satirlar.length : null));
    results.push({
      screenId: s.id,
      title: s.title,
      moduleId: s.moduleId,
      endpoint: key,
      status: res.status,
      ok: res.ok,
      ms: res.ms,
      rowCount,
      error: res.error || (!res.ok ? (res.body?.hata || res.body?.error || JSON.stringify(res.body)?.slice(0, 120)) : null),
    });
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.skip && !r.ok).length;
  const skip = results.filter((r) => r.skip).length;

  const out = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    health,
    auth: { user: session.user, firmaId: session.firmaId, meOk: me.ok },
    firms: firmRows.map((f) => ({ id: f.id, code: f.company_code, name: f.company_name })),
    summary: { total: results.length, pass, fail, skip },
    failures: results.filter((r) => !r.skip && !r.ok),
    results,
  };

  const outDir = path.join(root, 'docs/qa');
  fs.writeFileSync(path.join(outDir, 'api-smoke-results.json'), JSON.stringify(out, null, 2));

  let md = `# API Smoke Sonuçları\n\n`;
  md += `Tarih: ${out.generatedAt}\n\n`;
  md += `Health: ${health.status} · Auth firma: ${session.firmaId} · Pass ${pass} / Fail ${fail} / Skip ${skip}\n\n`;
  if (out.failures.length) {
    md += `## Başarısız\n\n| Ekran | Endpoint | Status | Hata |\n|---|---|---:|---|\n`;
    for (const f of out.failures) {
      md += `| ${f.title} (\`${f.screenId}\`) | \`${f.endpoint}\` | ${f.status} | ${String(f.error || '').replace(/\|/g, '/').slice(0, 100)} |\n`;
    }
    md += `\n`;
  }
  md += `## Tümü\n\n| Modül | Ekran | Status | ms | Satır |\n|---|---|---:|---:|---:|\n`;
  for (const r of results.filter((x) => !x.skip)) {
    md += `| ${r.moduleId} | ${r.title} | ${r.status} | ${r.ms} | ${r.rowCount ?? '—'} |\n`;
  }
  fs.writeFileSync(path.join(outDir, '03-functional-test-results.md'), md);
  console.log(JSON.stringify(out.summary));
  console.log(`Failures: ${out.failures.length}`);
  for (const f of out.failures.slice(0, 30)) {
    console.log(` FAIL ${f.screenId} ${f.status} ${f.endpoint} :: ${f.error}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
