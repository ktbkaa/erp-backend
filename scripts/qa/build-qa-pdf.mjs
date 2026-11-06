#!/usr/bin/env node
/**
 * Builds docs/qa/KTB_ERP_FULL_SYSTEM_QA_REPORT.pdf via Chrome headless print-to-PDF.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const qa = path.join(__dirname, '../../docs/qa');
const evidence = path.join(qa, 'evidence');
const htmlPath = path.join(qa, '_report_print.html');
const pdfPath = path.join(qa, 'KTB_ERP_FULL_SYSTEM_QA_REPORT.pdf');

function md(file) {
  try {
    return fs.readFileSync(path.join(qa, file), 'utf8');
  } catch {
    return `_(eksik: ${file})_`;
  }
}

function listEvidence(subdir) {
  const dir = path.join(evidence, subdir);
  try {
    return fs.readdirSync(dir).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f)).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mdToHtml(text) {
  // Minimal markdown: headings, tables, bold, code, lists
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let inCode = false;
  for (let line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html += '</code></pre>';
        inCode = false;
      } else {
        html += '<pre><code>';
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html += `${esc(line)}\n`;
      continue;
    }
    if (line.startsWith('|') && line.includes('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (/^[-: ]+$/.test(cells.join(''))) {
        continue;
      }
      if (!inTable) {
        html += '<table>';
        inTable = true;
        html += `<tr>${cells.map((c) => `<th>${esc(c.replace(/\*\*/g, ''))}</th>`).join('')}</tr>`;
      } else {
        html += `<tr>${cells.map((c) => `<td>${esc(c.replace(/\*\*/g, ''))}</td>`).join('')}</tr>`;
      }
      continue;
    }
    if (inTable) {
      html += '</table>';
      inTable = false;
    }
    if (line.startsWith('# ')) html += `<h1>${esc(line.slice(2))}</h1>`;
    else if (line.startsWith('## ')) html += `<h2>${esc(line.slice(3))}</h2>`;
    else if (line.startsWith('### ')) html += `<h3>${esc(line.slice(4))}</h3>`;
    else if (line.startsWith('- ')) html += `<li>${esc(line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'))}</li>`;
    else if (line.trim() === '') html += '<br/>';
    else html += `<p>${esc(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
  }
  if (inTable) html += '</table>';
  if (inCode) html += '</code></pre>';
  return html;
}

const sections = [
  ['01-screen-inventory.md', 'Ekran Envanteri'],
  ['02-database-integrity-audit.md', 'Veritabanı Bütünlüğü'],
  ['03-functional-test-results.md', 'Fonksiyonel Testler'],
  ['04-integration-test-results.md', 'Entegrasyon'],
  ['05-security-test-results.md', 'Güvenlik'],
  ['06-performance-test-results.md', 'Performans'],
  ['07-end-to-end-simulation.md', 'Uçtan Uca Simülasyon'],
  ['08-bug-tracker.md', 'Bug Tracker'],
  ['09-regression-results.md', 'Regresyon'],
  ['10-final-assessment.md', 'Final Değerlendirme'],
];

const imgBlocks = ['system', 'end-to-end', 'finance', 'sales', 'inventory', 'production', 'security']
  .map((subdir) => {
    const imgs = listEvidence(subdir);
    if (!imgs.length) return '';
    return `<h2>Kanıt — ${subdir}</h2>` + imgs.map((p) => {
      const rel = path.relative(qa, p).replace(/\\/g, '/');
      return `<figure><img src="${rel}" alt="${path.basename(p)}"/><figcaption>${path.basename(p)}</figcaption></figure>`;
    }).join('\n');
  })
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP Full System QA Report</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; color:#111; font-size:11pt; line-height:1.45; }
  h1 { font-size:22pt; border-bottom:2px solid #1a5; padding-bottom:6px; page-break-before: always; }
  h1.cover { page-break-before: avoid; font-size:28pt; border:none; margin-top:80px; }
  h2 { font-size:14pt; margin-top:22px; color:#0a3; }
  h3 { font-size:12pt; }
  table { width:100%; border-collapse:collapse; margin:10px 0; font-size:9.5pt; }
  th,td { border:1px solid #ccc; padding:5px 7px; text-align:left; vertical-align:top; }
  th { background:#eef6f0; }
  pre { background:#f4f4f4; padding:8px; font-size:8.5pt; overflow:hidden; }
  figure { margin:12px 0; page-break-inside: avoid; }
  img { max-width:100%; border:1px solid #ddd; }
  figcaption { font-size:9pt; color:#555; }
  .meta { color:#444; }
  .cover-box { border:1px solid #1a5; padding:24px; margin-top:40px; }
</style>
</head>
<body>
  <h1 class="cover">KTB ERP — Full System QA Report</h1>
  <div class="cover-box">
    <p><strong>Proje:</strong> KTB ERP (erp-backend)</p>
    <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} (Europe/Istanbul)</p>
    <p><strong>Dal:</strong> cursor/erp-qa-merkezi-4f63</p>
    <p><strong>Skor:</strong> 74/100 — Ticari hazır: hayır (açık P1)</p>
    <p class="meta">Bu rapor otomatik testler, DB denetimi, GIDA süt döngüsü simülasyonu ve bug düzeltmelerinin kanıtlarını içerir. Ekran açmak ≠ fonksiyon testi; kapsam yüzdeleri 10-final-assessment.md içinde ayrılmıştır.</p>
  </div>
  ${mdToHtml(md('MASTER_TEST_PLAN.md'))}
  ${sections.map(([f, title]) => `<h1>${esc(title)}</h1>${mdToHtml(md(f))}`).join('\n')}
  <h1>Ekran Görüntüsü Kanıtları</h1>
  ${imgBlocks || '<p>Kanıt klasöründe henüz görsel yoksa UI capture script çalıştırın.</p>'}
</body>
</html>`;

fs.writeFileSync(htmlPath, html);

const chromeBin = fs.existsSync('/opt/google/chrome/chrome')
  ? '/opt/google/chrome/chrome'
  : 'google-chrome';
const chrome = spawnSync(
  'timeout',
  [
    '60s',
    chromeBin,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--print-to-pdf=' + pdfPath,
    '--print-to-pdf-no-header',
    'file://' + htmlPath,
  ],
  { encoding: 'utf8', timeout: 70000 }
);

if (chrome.status !== 0) {
  console.error(chrome.stderr || chrome.stdout);
  // Fallback: keep HTML as printable artifact
  console.error('Chrome PDF failed — HTML report kept at', htmlPath);
  process.exitCode = 1;
} else {
  console.log('Wrote', pdfPath);
  const st = fs.statSync(pdfPath);
  console.log('size_kb', Math.round(st.size / 1024));
}
