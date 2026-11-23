#!/usr/bin/env node
/**
 * Güncel stack (iki-sektor ucu) üzerinde Demo Firma A.Ş. sunumu:
 *  1) Kapalı durum backfill
 *  2) DEMO firma seçili canlı ekran görüntüleri (modern menü)
 *  3) UTF-8 PDF
 *
 *   node scripts/demo-firma-sunum-guncel.js
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
const ART = '/opt/cursor/artifacts';
const SHOT_DIR = path.join(ART, 'sunum-ekranlar-guncel');
const OUT_HTML = path.join(ART, 'demo-firma-sunum-guncel.html');
const OUT_PDF = path.join(ART, 'demo-firma-sunum.pdf');
const OUT_MD = path.join(__dirname, '..', 'docs', 'system', 'demo-firma-sunum.md');
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const NOW = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

/** Modül başına kritik ekranlar — güncel menü id’leri */
const SHOTS = [
  // Shell
  { file: '00-kokpit.png', screen: 'kokpit', label: 'Kokpit / ana sayfa' },
  // CRM
  { file: 'crm-adaylar.png', screen: 'crm-adaylar', label: 'CRM — Müşteri Adayları' },
  { file: 'crm-firsatlar.png', screen: 'crm-firsatlar', label: 'CRM — Fırsatlar' },
  { file: 'crm-faaliyetler.png', screen: 'crm-faaliyetler', label: 'CRM — Faaliyetler' },
  { file: 'crm-kontaklar.png', screen: 'crm-kontaklar', label: 'CRM — Kontaklar' },
  // Satış
  { file: 'satis-teklifleri.png', screen: 'satis-teklifleri', label: 'Satış Teklifleri (Kapalı kalanlar listede)' },
  { file: 'satis-siparisleri.png', screen: 'satis-siparisleri', label: 'Satış Siparişleri' },
  { file: 'sevk-emirleri.png', screen: 'sevk-emirleri', label: 'Sevk Emirleri' },
  { file: 'irsaliye-yonetimi.png', screen: 'irsaliye-yonetimi', label: 'İrsaliye Yönetimi' },
  { file: 'fatura-yonetimi.png', screen: 'fatura-yonetimi', label: 'Fatura Yönetimi' },
  // Satınalma
  { file: 'satin-alma-talepleri.png', screen: 'satin-alma-talepleri', label: 'Satınalma Talepleri' },
  { file: 'satin-alma-teklifleri.png', screen: 'satin-alma-teklifleri', label: 'Satınalma Teklifleri' },
  { file: 'satin-alma-anlasmalari.png', screen: 'satin-alma-anlasmalari', label: 'Satınalma Anlaşmaları' },
  { file: 'satin-alma-siparisleri.png', screen: 'satin-alma-siparisleri', label: 'Satınalma Siparişleri' },
  { file: 'mal-kabuller.png', screen: 'mal-kabuller', label: 'Mal Kabuller' },
  // Stok / MRP
  { file: 'stok-kartlari.png', screen: 'stok-karti', label: 'Stok Kartları' },
  { file: 'depo-bakiye.png', screen: 'depo-bakiye', label: 'Depo Bakiyeleri' },
  { file: 'stok-hareketleri.png', screen: 'stok-hareketleri', label: 'Stok Hareketleri' },
  { file: 'transfer-emirleri.png', screen: 'transfer-emirleri', label: 'Transfer Emirleri' },
  { file: 'mrp-konsol.png', screen: 'mrp-calisma', label: 'MRP Konsol / Çalışma' },
  { file: 'mrp-sonuclar.png', screen: 'mrp-sonuclar', label: 'MRP Sonuçları' },
  { file: 'mrp-hareket-raporu.png', screen: 'mrp-hareket-raporu', label: 'MRP Hareket Raporu' },
  // Üretim / Fason
  { file: 'urun-agaci.png', screen: 'urun-agaci', label: 'Ürün Ağacı (BOM)' },
  { file: 'rotalar.png', screen: 'routings', label: 'Rotalar' },
  { file: 'uretim-emirleri.png', screen: 'uretim-emirleri', label: 'Üretim Emirleri' },
  { file: 'uretim-girisleri.png', screen: 'uretim-girisleri', label: 'Üretim Girişleri' },
  { file: 'fason-siparisleri.png', screen: 'fason-siparisleri', label: 'Fason Siparişleri' },
  { file: 'fason-emanet-stok.png', screen: 'fason-emanet-stok', label: 'Fason Emanet Stok' },
  // Kalite
  { file: 'kk-emirleri-gkk.png', screen: 'giris-kk', label: 'Giriş Kalite (GKK)' },
  { file: 'kk-capa.png', screen: 'kk-capa', label: 'KK CAPA' },
  { file: 'kk-kontrol-planlari.png', screen: 'kk-kontrol-planlari', label: 'KK Kontrol Planları' },
  // Finans
  { file: 'fiyat-listeleri.png', screen: 'fiyat-listeleri', label: 'Fiyat Listeleri' },
  { file: 'muhasebe-belgeleri.png', screen: 'muhasebe-belgeleri', label: 'Muhasebe Belgeleri' },
  { file: 'mizan.png', screen: 'mizan', label: 'Mizan' },
  { file: 'finans-yaslandirma.png', screen: 'finans-yaslandirma', label: 'Yaşlandırma' },
  // Cari / Ana veri
  { file: 'cari-kartlari.png', screen: 'cari', label: 'Cari Kartları' },
  { file: 'firmalar.png', screen: 'firmalar', label: 'Firmalar (Ana Veri)' },
  { file: 'numarator.png', screen: 'numarator-tanimi', label: 'Numaratörler' },
  // HR / Proje / Onay / Sistem
  { file: 'hr-departmanlar.png', screen: 'hr-departmanlar', label: 'İK — Departmanlar' },
  { file: 'prj-dashboard.png', screen: 'prj-dashboard', label: 'Proje Dashboard' },
  { file: 'onay-izleme.png', screen: 'onay-izleme', label: 'Onay İzleme' },
  { file: 'sistem-guncelleme.png', screen: 'sistem-guncelleme', label: 'Sistem Güncelleme' },
  { file: 'sql-sorgu.png', screen: 'sql-sorgu', label: 'SQL Sorgu' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function backfillKapali() {
  const demo = (await pool.query(`SELECT id FROM companies WHERE company_code='DEMO'`)).rows[0]?.id;
  if (!demo) throw new Error('DEMO firma yok');
  await pool.query(`UPDATE companies SET is_profile=TRUE WHERE id=$1`, [demo]);
  const pairs = [
    ['sales_quotations', 'SipariseDonustu'],
    ['purchase_quotations', 'SipariseDonustu'],
    ['purchase_requisitions', 'SipariseDonustu'],
    ['shipment_orders', 'IrsaliyeDonustu'],
    ['delivery_notes', 'FaturayaDonustu'],
  ];
  for (const [t, st] of pairs) {
    const r = await pool.query(
      `UPDATE ${t} SET status='Kapali' WHERE company_id=$1 AND status=$2 RETURNING id`,
      [demo, st]
    );
    console.log(`Kapali ← ${t}: ${r.rowCount}`);
  }
  return demo;
}

async function loginAndSelectDemo(page, demoId) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate((id) => {
    localStorage.setItem('ktb_firma_id', String(id));
    localStorage.setItem('ktb_company_id', String(id));
  }, demoId);

  const loginVisible = await page.evaluate(
    () =>
      !document.querySelector('#viewLogin')?.hidden &&
      document.body.classList.contains('is-login')
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
  await page.type('#loginUser', USER, { delay: 5 });
  await page.click('#loginPass', { clickCount: 3 });
  await page.type('#loginPass', PASS, { delay: 5 });
  await page.click('#loginSubmit');
  await page.waitForFunction(
    () => (document.querySelector('#userChipName')?.textContent || '').length > 2,
    { timeout: 25000 }
  ).catch(() => null);
  await sleep(800);

  await page.evaluate((id) => {
    localStorage.setItem('ktb_firma_id', String(id));
    if (typeof window.setActiveFirma === 'function') window.setActiveFirma(id);
  }, demoId);

  // Firma picker
  const name = await page.$eval('#firmaPickerName', (el) => el.textContent || '').catch(() => '');
  if (!/Demo Firma|DEMO/i.test(name)) {
    await page.click('#firmaPickerBtn').catch(() => page.click('#firmaPickerName'));
    await sleep(400);
    const opt = await page.$(`[data-firma-id="${demoId}"], [data-company-id="${demoId}"]`);
    if (opt) {
      await opt.click();
      await sleep(900);
    } else {
      // menüde isimle ara
      await page.evaluate((id) => {
        const items = [...document.querySelectorAll('[data-firma-id], [data-company-id], .firma-picker-item, .company-item')];
        const hit = items.find((el) => String(el.getAttribute('data-firma-id') || el.getAttribute('data-company-id')) === String(id)
          || /Demo Firma/i.test(el.textContent || ''));
        hit?.click();
      }, demoId);
      await sleep(900);
    }
  }
  const finalName = await page.$eval('#firmaPickerName', (el) => el.textContent || '').catch(() => '');
  console.log('Aktif firma:', finalName || '(okunamadı)');
}

async function captureShots(demoId) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
  });
  try {
    const page = await browser.newPage();
    await loginAndSelectDemo(page, demoId);

    // Sağ tık menüsü kanıtı (satış siparişi)
    try {
      await page.goto(`${BASE}/#satis-siparisleri`, { waitUntil: 'networkidle0', timeout: 60000 });
      await sleep(1200);
      const row = await page.$('.data-grid tbody tr, table.list tbody tr, #listBody tr, .list-row, #gridBody tr, .grid tbody tr');
      if (row) {
        const box = await row.boundingBox();
        if (box) {
          await page.mouse.click(box.x + 40, box.y + 12, { button: 'right' });
          await sleep(700);
          await page.screenshot({
            path: path.join(SHOT_DIR, 'siparis-sag-tik.png'),
            fullPage: false,
          });
          console.log('✓ siparis-sag-tik.png');
        }
      }
    } catch (e) {
      console.warn('sağ tık shot:', e.message);
    }

    for (const shot of SHOTS) {
      const out = path.join(SHOT_DIR, shot.file);
      try {
        await page.goto(`${BASE}/#${shot.screen}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await sleep(1100);
        // menü açık kalmasın
        await page.keyboard.press('Escape').catch(() => null);
        await sleep(200);
        await page.screenshot({ path: out, fullPage: false });
        console.log('✓', shot.file);
      } catch (e) {
        console.warn('✗', shot.file, e.message);
        // placeholder
        fs.writeFileSync(out.replace(/\.png$/, '.err.txt'), e.message);
      }
    }
  } finally {
    await browser.close();
  }
}

function imgTag(file, caption) {
  const p = path.join(SHOT_DIR, file);
  if (!fs.existsSync(p)) return `<p class="missing">[Görsel yok: ${file}]</p>`;
  const b64 = fs.readFileSync(p).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}" alt="${caption.replace(/"/g, '&quot;')}"/><figcaption>${caption}</figcaption></figure>`;
}

function buildPdf() {
  const sections = [
    { h: 'CRM', shots: SHOTS.filter((s) => s.file.startsWith('crm-')) },
    { h: 'Satış', shots: SHOTS.filter((s) => /satis-|sevk-|irsaliye-|fatura-|siparis-sag/.test(s.file) || s.file === 'siparis-sag-tik.png') },
    { h: 'Satınalma', shots: SHOTS.filter((s) => s.file.startsWith('satin-') || s.file === 'mal-kabuller.png') },
    { h: 'Stok ve MRP', shots: SHOTS.filter((s) => /stok-|depo-|mrp-|transfer-/.test(s.file)) },
    { h: 'Üretim ve Fason', shots: SHOTS.filter((s) => /urun-|rota|uretim-|fason-/.test(s.file)) },
    { h: 'Kalite', shots: SHOTS.filter((s) => s.file.startsWith('kk-')) },
    { h: 'Finans', shots: SHOTS.filter((s) => /fiyat-|muhasebe-|mizan|finans-/.test(s.file)) },
    { h: 'Ana veri / Cari', shots: SHOTS.filter((s) => /cari-|firma|numarator|kokpit/.test(s.file)) },
    { h: 'İK / Proje / Onay / Sistem', shots: SHOTS.filter((s) => /hr-|prj-|onay-|sistem-|sql-/.test(s.file)) },
  ];

  let body = '';
  body += imgTag('00-kokpit.png', 'Kokpit — güncel menü mimarisi');
  if (fs.existsSync(path.join(SHOT_DIR, 'siparis-sag-tik.png'))) {
    body += imgTag('siparis-sag-tik.png', 'Sağ tık — Belge bağlantısı / Teklife git');
  }
  for (const sec of sections) {
    if (!sec.shots.length) continue;
    body += `<h2>${sec.h}</h2>`;
    for (const s of sec.shots) {
      if (s.file === '00-kokpit.png') continue;
      body += imgTag(s.file, s.label);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<title>Demo Firma A.Ş. — Güncel Sistem Sunumu</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: "DejaVu Sans","Noto Sans","Segoe UI",sans-serif; color:#15202b; font-size:10.5pt; line-height:1.4; }
  h1 { color:#0a3d34; font-size:20pt; margin:0 0 8px; }
  h2 { color:#0c7c69; font-size:13pt; border-bottom:1px solid #c9d4de; padding-bottom:4px; margin:20px 0 8px; page-break-after:avoid; }
  .meta { color:#445; font-size:9.5pt; margin-bottom:14px; }
  .badge { display:inline-block; background:#0c7c69; color:#fff; padding:2px 8px; border-radius:3px; font-size:9pt; }
  figure { margin:8px 0 16px; page-break-inside:avoid; }
  figure img { width:100%; border:1px solid #c9d4de; border-radius:4px; background:#fff; }
  figcaption { font-size:9pt; color:#445; margin-top:4px; }
  table { border-collapse:collapse; width:100%; font-size:9.5pt; margin:8px 0; }
  th,td { border:1px solid #c9d4de; padding:5px 7px; text-align:left; }
  th { background:#e8f3ef; }
  .note { background:#fff8e8; border-left:3px solid #c9a227; padding:8px 10px; margin:10px 0; }
  .missing { color:#a00; }
  code { font-family: ui-monospace, monospace; font-size:9pt; }
</style>
</head>
<body>
<h1>Demo Firma A.Ş. — Güncel Sistem Sunum Dokümanı</h1>
<p class="meta">
  <span class="badge">GÜNCEL STACK</span>
  <span class="badge">DEMO</span><br/>
  Oluşturma: ${NOW} (Europe/Istanbul)<br/>
  Taban: <code>cursor/erp-iki-sektor-eksik-ekran-4f63</code> (menü mimarisi, görünüm, MRP, fason, HR, proje…)<br/>
  Giriş: <code>${USER}</code> / Demo123! — Firma: <strong>Demo Firma A.Ş.</strong>
</p>

<div class="note">
  Önceki sunum PDF’i eski <code>is-emri</code> dalında (eski menü / eksik modüller) üretilmişti.
  Bu doküman <strong>güncel UI</strong> üzerinden yeniden çekilen ekran görüntülerini içerir.
</div>

<h2>1. Düzeltilen davranışlar</h2>
<ul>
  <li>Dönüşen belgeler silinmez → durum <strong>Kapalı</strong> (satış/SA teklif, talep, sevk, irsaliye).</li>
  <li>Sağ tık → <strong>Belge bağlantısı / Kaynağına git / Teklife git</strong> (güncel BELGE_BAGLANTI).</li>
  <li>Firma filtresi DEMO kayıtlarını gösterir — sunumda DEMO seçili olmalıdır.</li>
</ul>

<table>
  <thead><tr><th>Belge</th><th>Dönüşüm sonrası</th></tr></thead>
  <tbody>
    <tr><td>Satış teklifi → sipariş</td><td>Kapalı</td></tr>
    <tr><td>Satınalma teklifi → sipariş</td><td>Kapalı</td></tr>
    <tr><td>Satınalma talebi → sipariş</td><td>Kapalı</td></tr>
    <tr><td>Sevk → irsaliye</td><td>Kapalı</td></tr>
    <tr><td>İrsaliye → fatura</td><td>Kapalı</td></tr>
  </tbody>
</table>

<h2>2. Modül kapsamı (görseller)</h2>
<p>Aşağıda CRM, Satış, Satınalma, Stok/MRP, Üretim/Fason, Kalite, Finans, Ana veri, İK, Proje, Onay ve Sistem ekranları yer alır.</p>

${body}

<h2>3. Çalıştırma</h2>
<pre style="background:#f4f7f5;border:1px solid #d7e3dc;padding:10px;">npm run migrate
npm start
node scripts/demo-firma-sunum-guncel.js</pre>

<p style="margin-top:20px;color:#666;font-size:9pt;">Kodlama: UTF-8 · PDF Chrome headless · ${NOW}</p>
</body>
</html>`;

  fs.writeFileSync(OUT_HTML, html, 'utf8');

  const md = `# Demo Firma A.Ş. — Güncel Sistem Sunum Dokümanı

**Oluşturma:** ${NOW} (Europe/Istanbul)  
**Taban:** \`cursor/erp-iki-sektor-eksik-ekran-4f63\` (güncel menü / görünüm / tüm modüller)  
**PDF:** \`${OUT_PDF}\`  
**Görseller:** \`${SHOT_DIR}/\`  

## Not
Önceki PDF eski \`is-emri\` dalında hazırlanmıştı. Bu sürüm güncel UI üzerinden yeniden üretildi.

## Davranış
- Dönüşen belgeler → **Kapalı**
- Sağ tık → Belge bağlantısı / Teklife git
- Firma: Demo Firma A.Ş.

## Çalıştırma
\`\`\`bash
node scripts/demo-firma-sunum-guncel.js
\`\`\`
`;
  fs.writeFileSync(OUT_MD, md, 'utf8');
  fs.writeFileSync(path.join(ART, 'demo-firma-sunum.md'), md, 'utf8');

  console.log('HTML:', OUT_HTML);
  try {
    execFileSync(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-pdf-header-footer',
        `--print-to-pdf=${OUT_PDF}`,
        '--print-to-pdf-no-header',
        `file://${OUT_HTML}`,
      ],
      { stdio: 'inherit', timeout: 300000 }
    );
  } catch (err) {
    if (!fs.existsSync(OUT_PDF) || fs.statSync(OUT_PDF).size < 50_000) throw err;
    console.warn('Chrome timeout (PDF mevcut):', err.code || err.message);
  }
  console.log('PDF:', OUT_PDF, `(${Math.round(fs.statSync(OUT_PDF).size / 1024)} KB)`);
}

async function main() {
  console.log('— DEMO sunum (güncel stack) —', NOW);
  const demoId = await backfillKapali();
  await captureShots(demoId);
  buildPdf();
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) { /* */ }
  process.exit(1);
});
