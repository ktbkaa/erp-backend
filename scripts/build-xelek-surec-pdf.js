#!/usr/bin/env node
/**
 * XELEK süreç dokümanı — ekran görüntüleri + UTF-8 PDF
 *   node scripts/build-xelek-surec-pdf.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const pool = require('../db');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = process.env.DEMO_PASS || 'Demo123!';
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const ART = '/opt/cursor/artifacts';
const SHOT = path.join(ART, 'xelek-surec-ekranlar');
const OUT_HTML = path.join(ART, 'xelek-surec-dokuman.html');
const OUT_PDF = path.join(ART, 'xelek-surec-dokuman.pdf');
const OUT_MD = path.join(__dirname, '..', 'docs', 'system', 'xelek-surec-dokuman.md');
const NOW = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

const SECTIONS = [
  {
    h: '1. Firma ve kurulum',
    intro: 'X Elektronik Sanayi A.Ş. (XELEK) — iş yeri, depolar, parametreler.',
    shots: [
      ['firmalar.png', 'firmalar', 'Firmalar — XELEK profili'],
      ['is-yerleri.png', 'is-yerleri', 'İş Yerleri — XELEK-MR'],
      ['warehouses.png', 'warehouses', 'Depolar (HMD / YM / MAM / GKK / ÇKK)'],
      ['sistem-parametreleri.png', 'sistem-parametreleri', 'Sistem Parametreleri'],
    ],
  },
  {
    h: '2. Proje — X Firması',
    intro: 'Proje kaydı ve belge etiketleri.',
    shots: [
      ['projeler.png', 'projeler', 'Projeler — X Firması (X-FIRMASI)'],
    ],
  },
  {
    h: '3. CRM — ziyaret, faaliyet, fırsat',
    intro: 'Satışçı müşteri ziyareti → faaliyet → fırsat kazanımı → aday→cari.',
    shots: [
      ['crm-adaylar.png', 'crm-adaylar', 'Müşteri Adayları'],
      ['crm-faaliyetler.png', 'crm-faaliyetler', 'Faaliyetler — ziyaret'],
      ['crm-firsatlar.png', 'crm-firsatlar', 'Fırsatlar — kazanıldı'],
      ['cari.png', 'cari', 'Cari Kartları — dönüşen müşteri'],
    ],
  },
  {
    h: '4. Satış teklifi → onaylı sipariş',
    intro: 'Teklif siparişe dönüşünce OnayBekliyor kalır; satış müdürü onaylamadan sevk olmaz.',
    shots: [
      ['satis-teklifleri.png', 'satis-teklifleri', 'Satış Teklifleri (Kapalı)'],
      ['satis-siparisleri.png', 'satis-siparisleri', 'Satış Siparişleri'],
      ['onay-izleme.png', 'onay-izleme', 'Onay İzleme — satış müdürü'],
    ],
  },
  {
    h: '5. X mamul — stok, BOM, rota',
    intro: 'Sistemde olmayan X mamulü; hammadde, yarı mamul, ürün ağacı ve rota.',
    shots: [
      ['stok-karti.png', 'stok-karti', 'Stok Kartları — X mamul / HM / YM'],
      ['urun-agaci.png', 'urun-agaci', 'Ürün Ağacı (BOM)'],
      ['routings.png', 'routings', 'Rotalar'],
    ],
  },
  {
    h: '6. MRP ve satınalma',
    intro: 'MRP satınalma önerileri → SA teklif → müdür onay → sipariş.',
    shots: [
      ['mrp-calisma.png', 'mrp-calisma', 'MRP Konsol / Çalışmalar'],
      ['mrp-sonuclar.png', 'mrp-sonuclar', 'MRP Sonuçları — satınalma önerileri'],
      ['satin-alma-teklifleri.png', 'satin-alma-teklifleri', 'Satınalma Teklifleri'],
      ['satin-alma-siparisleri.png', 'satin-alma-siparisleri', 'Satınalma Siparişleri'],
    ],
  },
  {
    h: '7. Mal kabul ve GKK (pass / red / yeniden)',
    intro: 'Bir hammadde stoğa girer, biri kaliteden geçemez; iade + yeniden sipariş + GKK OK.',
    shots: [
      ['mal-kabuller.png', 'mal-kabuller', 'Mal Kabuller'],
      ['giris-kontrolleri.png', 'giris-kontrolleri', 'Giriş Kontrolleri'],
      ['giris-kk.png', 'giris-kk', 'Giriş Kalite (GKK)'],
    ],
  },
  {
    h: '8. Üretim ve ÇKK',
    intro: 'Üretim emri → operasyonlar → çıkış kalite → mamul depo.',
    shots: [
      ['uretim-emirleri.png', 'uretim-emirleri', 'Üretim Emirleri'],
      ['uretim-girisleri.png', 'uretim-girisleri', 'Üretim Girişleri'],
      ['depo-bakiye.png', 'depo-bakiye', 'Depo Bakiyeleri — mamul'],
    ],
  },
  {
    h: '9. Sevk, irsaliye, fatura (kısmi + kalan)',
    intro: 'Önce yarım sevk + irsaliye + fatura; sonra kalan.',
    shots: [
      ['sevk-emirleri.png', 'sevk-emirleri', 'Sevk Emirleri'],
      ['irsaliye-yonetimi.png', 'irsaliye-yonetimi', 'İrsaliye Yönetimi'],
      ['fatura-yonetimi.png', 'fatura-yonetimi', 'Fatura Yönetimi'],
    ],
  },
  {
    h: '10. Müşteri iade ve yeniden üretim/sevk',
    intro: '1 adet iade; 1 adet yeniden üretim + manuel satış siparişi ile tekrar sevk.',
    shots: [
      ['satis-iade.png', 'satis-iade-faturalari', 'Satış İade Faturaları'],
      ['satis-siparisleri-manuel.png', 'satis-siparisleri', 'Manuel satış siparişi (yeniden)'],
    ],
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loginSelectXelek(page, companyId) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate((id) => {
    localStorage.setItem('ktb_firma_id', String(id));
    localStorage.setItem('ktb_company_id', String(id));
  }, companyId);

  const loginVisible = await page.evaluate(
    () => !document.querySelector('#viewLogin')?.hidden && document.body.classList.contains('is-login')
  );
  if (!loginVisible) {
    await page.click('#userChip').catch(() => null);
    await sleep(300);
    const loginItem = await page.$('[data-user-action="login"]');
    if (loginItem) {
      await loginItem.click();
      await sleep(400);
    }
  }
  await page.waitForSelector('#loginUser', { visible: true, timeout: 20000 });
  await page.click('#loginUser', { clickCount: 3 });
  await page.type('#loginUser', USER, { delay: 4 });
  await page.click('#loginPass', { clickCount: 3 });
  await page.type('#loginPass', PASS, { delay: 4 });
  await page.click('#loginSubmit');
  await page.waitForFunction(
    () => (document.querySelector('#userChipName')?.textContent || '').length > 2,
    { timeout: 25000 }
  ).catch(() => null);
  await sleep(700);

  await page.evaluate((id) => {
    localStorage.setItem('ktb_firma_id', String(id));
    if (typeof window.setActiveFirma === 'function') window.setActiveFirma(id);
  }, companyId);

  const name = await page.$eval('#firmaPickerName', (el) => el.textContent || '').catch(() => '');
  if (!/X Elektronik|XELEK/i.test(name)) {
    await page.click('#firmaPickerBtn').catch(() => page.click('#firmaPickerName'));
    await sleep(400);
    await page.evaluate((id) => {
      const items = [...document.querySelectorAll('[data-firma-id], [data-company-id], .firma-picker-item')];
      const hit = items.find((el) =>
        String(el.getAttribute('data-firma-id') || el.getAttribute('data-company-id')) === String(id)
        || /X Elektronik|XELEK/i.test(el.textContent || '')
      );
      hit?.click();
    }, companyId);
    await sleep(900);
  }
  const finalName = await page.$eval('#firmaPickerName', (el) => el.textContent || '').catch(() => '');
  console.log('Aktif firma:', finalName);
}

async function capture() {
  fs.mkdirSync(SHOT, { recursive: true });
  const companyId = (await pool.query(`SELECT id FROM companies WHERE company_code='XELEK'`)).rows[0]?.id;
  if (!companyId) throw new Error('XELEK firma yok — önce: node scripts/demo-xelek-surec.js');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
  });
  try {
    const page = await browser.newPage();
    await loginSelectXelek(page, companyId);

    const all = SECTIONS.flatMap((s) => s.shots);
    for (const [file, screen, label] of all) {
      const out = path.join(SHOT, file);
      try {
        await page.goto(`${BASE}/#${screen}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await sleep(1100);
        await page.keyboard.press('Escape').catch(() => null);
        await sleep(200);
        await page.screenshot({ path: out, fullPage: false });
        console.log('✓', file, '—', label);
      } catch (e) {
        console.warn('✗', file, e.message);
      }
    }
  } finally {
    await browser.close();
  }
  return companyId;
}

function img(file, caption) {
  const p = path.join(SHOT, file);
  if (!fs.existsSync(p)) return `<p class="missing">[Görsel yok: ${file}]</p>`;
  const b64 = fs.readFileSync(p).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}" alt="${caption.replace(/"/g, '&quot;')}"/><figcaption>${caption}</figcaption></figure>`;
}

function buildPdf() {
  let body = '';
  for (const sec of SECTIONS) {
    body += `<h2>${sec.h}</h2><p>${sec.intro}</p>`;
    for (const [file, , label] of sec.shots) body += img(file, label);
  }

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<title>XELEK — Elektronik Firma Süreç Dokümanı</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: "DejaVu Sans","Noto Sans","Segoe UI",sans-serif; color:#15202b; font-size:10.5pt; line-height:1.4; }
  h1 { color:#0a3d34; font-size:18pt; margin:0 0 8px; }
  h2 { color:#0c7c69; font-size:13pt; border-bottom:1px solid #c9d4de; padding-bottom:4px; margin:18px 0 8px; page-break-after:avoid; }
  .meta { color:#445; font-size:9.5pt; margin-bottom:12px; }
  .badge { display:inline-block; background:#0c7c69; color:#fff; padding:2px 8px; border-radius:3px; font-size:9pt; margin-right:4px; }
  figure { margin:8px 0 14px; page-break-inside:avoid; }
  figure img { width:100%; border:1px solid #c9d4de; border-radius:4px; background:#fff; }
  figcaption { font-size:9pt; color:#445; margin-top:4px; }
  table { border-collapse:collapse; width:100%; font-size:9.5pt; margin:8px 0; }
  th,td { border:1px solid #c9d4de; padding:5px 7px; text-align:left; }
  th { background:#e8f3ef; }
  .note { background:#fff8e8; border-left:3px solid #c9a227; padding:8px 10px; margin:10px 0; }
  .missing { color:#a00; }
  ul { margin:6px 0; padding-left:18px; }
  code { font-family: ui-monospace, monospace; font-size:9pt; }
</style>
</head>
<body>
<h1>XELEK — Elektronik Firma Uçtan Uca Süreç Dokümanı</h1>
<p class="meta">
  <span class="badge">XELEK</span>
  <span class="badge">X Firması</span>
  <span class="badge">UTF-8</span><br/>
  Oluşturma: ${NOW} (Europe/Istanbul)<br/>
  Firma: <strong>X Elektronik Sanayi A.Ş.</strong> · Proje: <strong>X Firması</strong><br/>
  Giriş: <code>${USER}</code> / Demo123! — Firma seçimi: XELEK<br/>
  Roller: xelek.satis · xelek.smudur · xelek.sa · xelek.samudur (Demo123!)
</p>

<div class="note">
  Bu doküman güncel UI üzerinde XELEK süreci çalıştırıldıktan sonra alınan canlı ekran görüntülerini içerir.
  Süreç scripti: <code>node scripts/demo-xelek-surec.js</code>
</div>

<h2>0. Süreç özeti</h2>
<table>
  <thead><tr><th>Adım</th><th>Açıklama</th></tr></thead>
  <tbody>
    <tr><td>Kurulum</td><td>Firma, iş yeri, 8 depo, parametreler, kullanıcı/onay rotası</td></tr>
    <tr><td>CRM</td><td>Ziyaret → faaliyet → fırsat kazan → aday→cari → teklif</td></tr>
    <tr><td>Onay</td><td>Teklif→sipariş OnayBekliyor; satış müdürü onaylamadan sevk yok</td></tr>
    <tr><td>Master</td><td>X mamul + HM/YM + BOM + rota</td></tr>
    <tr><td>MRP / SA</td><td>Satınalma önerileri → teklif → müdür onay → sipariş</td></tr>
    <tr><td>GKK</td><td>Bir HM OK, bir HM RED → iade/yeniden sipariş → GKK OK</td></tr>
    <tr><td>Üretim</td><td>Üretim emri → ÇKK → mamul depo</td></tr>
    <tr><td>Sevk</td><td>%50 + kalan sevk → irsaliye → fatura</td></tr>
    <tr><td>İade</td><td>1 adet müşteri iadesi</td></tr>
    <tr><td>Yeniden</td><td>1 adet üretim + manuel SO + sevk/fatura</td></tr>
  </tbody>
</table>

${body}

<h2>Çalıştırma</h2>
<pre style="background:#f4f7f5;border:1px solid #d7e3dc;padding:10px;">npm run migrate
npm start
node scripts/demo-xelek-surec.js
node scripts/build-xelek-surec-pdf.js</pre>

<p style="margin-top:18px;color:#666;font-size:9pt;">Kodlama: UTF-8 · PDF Chrome headless · ${NOW}</p>
</body>
</html>`;

  fs.writeFileSync(OUT_HTML, html, 'utf8');

  const md = `# XELEK — Elektronik Firma Süreç Dokümanı

**Oluşturma:** ${NOW} (Europe/Istanbul)  
**Firma:** X Elektronik Sanayi A.Ş. (\`XELEK\`)  
**Proje:** X Firması  
**PDF:** \`${OUT_PDF}\`  
**Görseller:** \`${SHOT}/\`

## Çalıştırma
\`\`\`bash
node scripts/demo-xelek-surec.js
node scripts/build-xelek-surec-pdf.js
\`\`\`
`;
  fs.writeFileSync(OUT_MD, md, 'utf8');
  fs.writeFileSync(path.join(ART, 'xelek-surec-dokuman.md'), md, 'utf8');

  console.log('HTML:', OUT_HTML);
  try {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
      '--no-pdf-header-footer', `--print-to-pdf=${OUT_PDF}`, '--print-to-pdf-no-header',
      `file://${OUT_HTML}`,
    ], { stdio: 'inherit', timeout: 300000 });
  } catch (err) {
    if (!fs.existsSync(OUT_PDF) || fs.statSync(OUT_PDF).size < 50_000) throw err;
    console.warn('Chrome timeout (PDF mevcut):', err.code || err.message);
  }
  console.log('PDF:', OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);
}

async function main() {
  console.log('— XELEK süreç PDF —', NOW);
  await capture();
  buildPdf();
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) { /* */ }
  process.exit(1);
});
