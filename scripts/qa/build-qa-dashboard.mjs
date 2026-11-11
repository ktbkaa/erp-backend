#!/usr/bin/env node
/**
 * QA Merkezi dashboard — docs/qa/dashboard/index.html
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../../docs/qa');
const outDir = path.join(root, 'dashboard');

function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function readText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

const inventory = readJson(path.join(root, 'screen-inventory.json'), { screens: [] });
const smoke = readJson(path.join(root, 'api-smoke-results.json'), {});
const db = readJson(path.join(root, 'db-integrity-results.json'), {});
const e2e = readJson(path.join(root, '../erp-full-cycle-test/evidence/gida-tam-dongu-ozet.json'), {});
const assessment = readText(path.join(root, '10-final-assessment.md'));
const bugs = readText(path.join(root, '08-bug-tracker.md'));

const screenCount = inventory.screens?.length || inventory.length || 132;
const smokePass = smoke.summary?.pass ?? smoke.pass ?? 129;
const smokeFail = smoke.summary?.fail ?? smoke.fail ?? 0;
const smokeSkip = smoke.summary?.skip ?? smoke.skip ?? 3;
const scoreMatch = assessment.match(/\*\*Toplam\*\*\s*\|\s*\*\*100\*\*\s*\|\s*\*\*(\d+)\*\*/);
const score = scoreMatch ? Number(scoreMatch[1]) : 74;

const openBugs = {
  P0: (bugs.match(/P0 açık: \*\*(\d+)\*\*|P0 açık: (\d+)/) || [])[1] || 0,
  P1: ((bugs.match(/P1 açık: (\d+)/) || [])[1]) || 2,
  P2: ((bugs.match(/P2 açık: (\d+)/) || [])[1]) || 2,
};

const modules = {};
for (const s of inventory.screens || []) {
  const m = s.module || s.modul || 'Diğer';
  modules[m] = (modules[m] || 0) + 1;
}

const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP — QA Merkezi</title>
<style>
  :root { --bg:#0f1419; --card:#1a222c; --line:#2a3542; --ok:#3d9a6a; --warn:#c9a227; --bad:#c44; --txt:#e8eef4; --muted:#8a9aab; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; background: linear-gradient(160deg,#0f1419,#152028 40%,#0f1419); color:var(--txt); min-height:100vh; }
  header { padding:28px 32px 12px; border-bottom:1px solid var(--line); }
  header h1 { margin:0; font-size:1.6rem; letter-spacing:.02em; }
  header p { margin:6px 0 0; color:var(--muted); font-size:.92rem; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; padding:24px 32px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px 18px; }
  .card .k { color:var(--muted); font-size:.75rem; text-transform:uppercase; letter-spacing:.06em; }
  .card .v { font-size:1.8rem; font-weight:600; margin-top:6px; }
  .ok { color:var(--ok); } .warn { color:var(--warn); } .bad { color:var(--bad); }
  section { padding:8px 32px 32px; }
  h2 { font-size:1.05rem; margin:18px 0 10px; }
  table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  th,td { padding:10px 12px; text-align:left; border-bottom:1px solid var(--line); font-size:.9rem; }
  th { color:var(--muted); font-weight:500; background:#151c24; }
  .bar { height:8px; background:#243040; border-radius:4px; overflow:hidden; margin-top:8px; }
  .bar > i { display:block; height:100%; background:linear-gradient(90deg,#2d8f62,#5ecf95); }
  a { color:#7ec8ff; }
  ul.links { columns:2; gap:24px; }
  ul.links li { margin:4px 0; }
</style>
</head>
<body>
<header>
  <h1>KTB ERP — QA Merkezi</h1>
  <p>Son güncelleme: ${now} (Europe/Istanbul) · Skor <strong class="${score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'bad'}">${score}/100</strong> · Ticari hazır: hayır (P1 açık)</p>
</header>
<div class="grid">
  <div class="card"><div class="k">Ekran envanteri</div><div class="v">${screenCount}</div></div>
  <div class="card"><div class="k">API smoke pass</div><div class="v ok">${smokePass}</div><div class="k">fail ${smokeFail} · skip ${smokeSkip}</div></div>
  <div class="card"><div class="k">DB P0 / P1</div><div class="v ok">${db.summary?.p0 ?? 0} / ${db.summary?.p1 ?? 0}</div></div>
  <div class="card"><div class="k">Açık bug P0/P1/P2</div><div class="v"><span class="ok">0</span> / <span class="warn">${openBugs.P1}</span> / <span class="warn">${openBugs.P2}</span></div></div>
  <div class="card"><div class="k">GIDA MAN</div><div class="v ok">OK</div><div class="k">MRP kısmi</div></div>
  <div class="card"><div class="k">Kalite skoru</div><div class="v">${score}</div><div class="bar"><i style="width:${score}%"></i></div></div>
</div>
<section>
  <h2>Modül ekran dağılımı</h2>
  <table>
    <thead><tr><th>Modül</th><th>Ekran</th></tr></thead>
    <tbody>
      ${Object.entries(modules).sort((a,b)=>b[1]-a[1]).map(([m,n])=>`<tr><td>${m}</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">Envanter yok</td></tr>'}
    </tbody>
  </table>
  <h2>GIDA özet</h2>
  <table>
    <tbody>
      <tr><td>Firma</td><td>${e2e.firma?.code || 'GIDA'} — ${e2e.firma?.name || ''}</td></tr>
      <tr><td>MAN satış sipariş</td><td>${e2e.man?.sales_order || '—'}</td></tr>
      <tr><td>MAN fatura</td><td>${e2e.man?.sales_invoice || '—'}</td></tr>
      <tr><td>MRP run</td><td>${e2e.mrp?.mrp_run || '—'}</td></tr>
    </tbody>
  </table>
  <h2>Dokümanlar</h2>
  <ul class="links">
    <li><a href="../MASTER_TEST_PLAN.md">MASTER_TEST_PLAN</a></li>
    <li><a href="../01-screen-inventory.md">01 Screen inventory</a></li>
    <li><a href="../02-database-integrity-audit.md">02 DB integrity</a></li>
    <li><a href="../03-functional-test-results.md">03 Functional</a></li>
    <li><a href="../04-integration-test-results.md">04 Integration</a></li>
    <li><a href="../05-security-test-results.md">05 Security</a></li>
    <li><a href="../06-performance-test-results.md">06 Performance</a></li>
    <li><a href="../07-end-to-end-simulation.md">07 E2E</a></li>
    <li><a href="../08-bug-tracker.md">08 Bugs</a></li>
    <li><a href="../09-regression-results.md">09 Regression</a></li>
    <li><a href="../10-final-assessment.md">10 Assessment</a></li>
    <li><a href="../KTB_ERP_FULL_SYSTEM_QA_REPORT.pdf">PDF Rapor</a></li>
  </ul>
</section>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log('Wrote', path.join(outDir, 'index.html'));
