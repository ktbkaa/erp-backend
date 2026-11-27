/**
 * TEKS Örnek1/Örnek2 — gerçek ekran görüntüleri (satış sunumu PDF için).
 *   node scripts/capture-teks-sunum-ekranlari.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = process.env.DEMO_PASS || 'Demo123!';
const OUT = path.join(__dirname, '..', 'docs', 'teks-sunum-shots');
const ART = '/opt/cursor/artifacts/teks-sunum-shots';

const SHOTS = [
  // Ana veri
  { file: '01-cari-musteri', screen: 'cari-kartlari', mode: 'incele', id: 37, label: 'Cari kartı — müşteri', scroll: 'top' },
  { file: '02-stok-mamul', screen: 'stok-karti', mode: 'incele', id: 58, label: 'Stok kartı — mamul', scroll: 'top' },
  { file: '03-urun-agaci', screen: 'urun-agaci', mode: 'incele', id: 11, label: 'Ürün ağacı (BOM)' },
  { file: '04-rota', screen: 'rotalar', mode: 'incele', id: 9, label: 'Rota — üretim adımları' },
  // Örnek 1
  { file: '10-o1-teklif', screen: 'satis-teklifleri', mode: 'incele', id: 3, label: 'Ö1 Satış teklifi', tabs: ['Kalemler'] },
  { file: '11-o1-siparis-ust', screen: 'satis-siparisleri', mode: 'incele', id: 9, label: 'Ö1 Satış siparişi — üst şerit', scroll: 'top' },
  { file: '12-o1-siparis-kalem', screen: 'satis-siparisleri', mode: 'incele', id: 9, label: 'Ö1 Satış siparişi — kalemler', tabs: ['Kalemler'], scroll: 'grid' },
  { file: '13-o1-siparis-adres', screen: 'satis-siparisleri', mode: 'incele', id: 9, label: 'Ö1 Satış siparişi — adres', tabs: ['Adres'] },
  { file: '14-o1-siparis-not', screen: 'satis-siparisleri', mode: 'incele', id: 9, label: 'Ö1 Satış siparişi — notlar / toplam', scroll: 'footer' },
  { file: '15-o1-sa-talep', screen: 'satin-alma-talepleri', mode: 'incele', id: 16, label: 'Ö1 Satınalma talebi' },
  { file: '16-o1-sa-siparis', screen: 'satin-alma-siparisleri', mode: 'incele', id: 15, label: 'Ö1 Satınalma siparişi' },
  { file: '17-o1-uretim', screen: 'uretim-emirleri', mode: 'incele', id: 7, label: 'Ö1 Üretim emri' },
  { file: '18-o1-sevk', screen: 'sevk-emirleri', mode: 'incele', id: 5, label: 'Ö1 Sevk emri' },
  { file: '19-o1-irsaliye', screen: 'irsaliyeler', mode: 'incele', id: 5, label: 'Ö1 İrsaliye' },
  { file: '20-o1-fatura', screen: 'satis-faturalari', mode: 'incele', id: 12, label: 'Ö1 Satış faturası' },
  // Örnek 2
  { file: '30-o2-bi', screen: 'mrp-bagimsiz-ihtiyac', mode: 'incele', id: 5, label: 'Ö2 Bağımsız ihtiyaç' },
  { file: '31-o2-siparis', screen: 'satis-siparisleri', mode: 'incele', id: 10, label: 'Ö2 Satış siparişi' },
  { file: '32-o2-mrp-calisma', screen: 'mrp-calisma', mode: 'incele', id: 5, label: 'Ö2 MRP çalışması' },
  { file: '33-o2-mrp-sonuc', screen: 'mrp-sonuclar', mode: 'incele', id: null, listFind: 'MR00004', label: 'Ö2 MRP sonuçları', listOnly: true },
  { file: '34-o2-sa-talep', screen: 'satin-alma-talepleri', mode: 'incele', id: 17, label: 'Ö2 MRP→Satınalma talebi' },
  { file: '35-o2-sa-siparis', screen: 'satin-alma-siparisleri', mode: 'incele', id: 16, label: 'Ö2 Satınalma siparişi' },
  { file: '36-o2-uretim', screen: 'uretim-emirleri', mode: 'incele', id: 8, label: 'Ö2 Üretim emri' },
  { file: '37-o2-sevk', screen: 'sevk-emirleri', mode: 'incele', id: 6, label: 'Ö2 Sevk emri' },
  { file: '38-o2-fatura', screen: 'satis-faturalari', mode: 'incele', id: 13, label: 'Ö2 Satış faturası' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem('ktb_firma_id', '2');
  });
  // Soft oturumda login gizli — kullanıcı menüsünden aç
  const loginVisible = await page.evaluate(() => !document.querySelector('#viewLogin')?.hidden
    && document.body.classList.contains('is-login'));
  if (!loginVisible) {
    await page.click('#userChip');
    await sleep(250);
    const loginItem = await page.$('[data-user-action="login"]');
    if (loginItem) await loginItem.click();
    await sleep(400);
  }
  await page.waitForSelector('#loginUser', { visible: true, timeout: 15000 });
  await page.click('#loginUser', { clickCount: 3 });
  await page.type('#loginUser', USER, { delay: 8 });
  await page.click('#loginPass', { clickCount: 3 });
  await page.type('#loginPass', PASS, { delay: 8 });
  await page.click('#loginSubmit');
  await page.waitForFunction(
    () => (document.querySelector('#userChipName')?.textContent || '').includes('.')
      || (document.querySelector('#userChipName')?.textContent || '').length > 3,
    { timeout: 20000 },
  ).catch(() => null);
  await sleep(700);
  await page.evaluate(() => localStorage.setItem('ktb_firma_id', '2'));
  // TEKS seç
  const name = await page.$eval('#firmaPickerName', (el) => el.textContent || '').catch(() => '');
  if (!/Denim|TEKS/i.test(name)) {
    await page.click('#firmaPickerBtn').catch(() => page.click('#firmaPickerName'));
    await sleep(300);
    const teks = await page.$('[data-firma-id="2"]');
    if (teks) {
      await teks.click();
      await sleep(800);
    }
  }
}

async function openForm(page, shot) {
  if (shot.listOnly || shot.id == null) {
    await page.goto(`${BASE}/#${shot.screen}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(1200);
    if (shot.listFind) {
      // try search / filter
      const search = await page.$('#listSearch, .list-search input, input[placeholder*="Ara"], input[type="search"]');
      if (search) {
        await search.click({ clickCount: 3 });
        await search.type(shot.listFind, { delay: 15 });
        await sleep(800);
      }
      // click matching row
      await page.evaluate((needle) => {
        const rows = [...document.querySelectorAll('tbody tr, .grid-row, [data-row-id]')];
        const hit = rows.find((r) => (r.textContent || '').includes(needle));
        if (hit) hit.click();
      }, shot.listFind);
      await sleep(400);
      if (!shot.listOnly) {
        // İncele
        const incele = await page.$('[data-act="incele"], button[data-action="incele"], #btnIncele, button.btn-incele');
        if (incele) {
          await incele.click();
          await sleep(1500);
        } else {
          // double-click row
          await page.evaluate((needle) => {
            const rows = [...document.querySelectorAll('tbody tr')];
            const hit = rows.find((r) => (r.textContent || '').includes(needle));
            if (hit) hit.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
          }, shot.listFind);
          await sleep(1500);
        }
      }
    }
    return;
  }

  const url = `${BASE}/?view=form&screen=${encodeURIComponent(shot.screen)}&mode=${shot.mode}&id=${shot.id}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1400);
  // Wait for form shell
  await page.waitForSelector('#formView, .form-solo, [data-master], .form-compact-master, #viewForm', { timeout: 20000 }).catch(() => null);
  await sleep(500);

  if (shot.tabs && shot.tabs.length) {
    for (const tab of shot.tabs) {
      await page.evaluate((name) => {
        const buttons = [...document.querySelectorAll('button, [role="tab"], .tab-btn, .form-tab')];
        const b = buttons.find((el) => (el.textContent || '').trim().includes(name));
        if (b) b.click();
      }, tab);
      await sleep(500);
    }
  }

  if (shot.scroll === 'footer') {
    await page.evaluate(() => {
      const el = document.querySelector('.form-footer, .form-notes, #formNotes, .form-totals, .form-shell') || document.scrollingElement;
      if (el) el.scrollTop = el.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    });
    await sleep(400);
  } else if (shot.scroll === 'grid') {
    await page.evaluate(() => {
      const g = document.querySelector('.detail-grid, .form-grid, #detailGrid, .kalemler, [data-grid]') || document.scrollingElement;
      if (g) g.scrollIntoView({ block: 'start' });
    });
    await sleep(400);
  }
}

async function shotPage(page, file) {
  const p1 = path.join(OUT, `${file}.png`);
  const p2 = path.join(ART, `${file}.png`);
  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  return p1;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ART, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);

  console.log('login…');
  await login(page);

  const manifest = [];
  for (const shot of SHOTS) {
    process.stdout.write(`shot ${shot.file}… `);
    try {
      await openForm(page, shot);
      // ensure TEKS context still
      await page.evaluate(() => localStorage.setItem('ktb_firma_id', '2'));
      const file = await shotPage(page, shot.file);
      const size = fs.statSync(file).size;
      console.log(`ok ${size}`);
      manifest.push({ ...shot, file: `${shot.file}.png`, ok: true, bytes: size });
    } catch (e) {
      console.log(`FAIL ${e.message}`);
      manifest.push({ ...shot, file: `${shot.file}.png`, ok: false, error: e.message });
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(ART, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  const ok = manifest.filter((m) => m.ok).length;
  console.log(JSON.stringify({ ok, total: manifest.length, out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
