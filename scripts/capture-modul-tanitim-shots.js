/**
 * Modül tanıtım dokümanı için ana ekran görüntüleri.
 *   node scripts/capture-modul-tanitim-shots.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'owner';
const PASS = process.env.DEMO_PASS || 'owner';
const OUT = path.join(__dirname, '..', 'docs', 'modul-tanitim', 'shots');

/** Her modül için ana liste + mümkünse form/sekme görüntüleri */
const PLAN = [
  { id: '_shell-home', kind: 'home', file: '00-shell-anasayfa.png' },
  { id: '_shell-menu', kind: 'menu', file: '00-shell-menu.png' },

  // Ana veri
  { id: 'companies', file: '01-firmalar.png' },
  { id: 'is-yerleri', file: '01-is-yerleri.png' },
  { id: 'warehouses', file: '01-depolar.png' },

  // Stok
  { id: 'stok-karti', file: '02-stok-karti-liste.png' },
  { id: 'stok-karti', kind: 'form', file: '02-stok-karti-form.png' },
  { id: 'depo-bakiye', file: '02-depo-bakiye.png' },
  { id: 'stok-hareketleri', file: '02-stok-hareketleri.png' },
  { id: 'mrp-calisma', file: '02-mrp-calistir.png' },

  // Cari
  { id: 'cari-kartlari', file: '03-cari-kartlari-liste.png' },
  { id: 'cari-kartlari', kind: 'form', file: '03-cari-kartlari-form.png' },
  { id: 'tahsilat-odemeler', file: '03-tahsilat-odemeler.png' },

  // Üretim
  { id: 'urun-agaci', file: '04-urun-agaci.png' },
  { id: 'routings', file: '04-rotalar.png' },
  { id: 'uretim-emirleri', file: '04-uretim-emirleri-liste.png' },
  { id: 'uretim-emirleri', kind: 'form', file: '04-uretim-emirleri-form.png' },

  // Satınalma
  { id: 'satin-alma-talepleri', file: '05-sa-talepleri.png' },
  { id: 'satin-alma-siparisleri', file: '05-sa-siparisleri.png' },
  { id: 'mal-kabuller', file: '05-mal-kabuller.png' },
  { id: 'giris-kontrolleri', file: '05-giris-kontrolleri.png' },

  // CRM
  { id: 'crm-adaylar', file: '06-crm-adaylar.png' },
  { id: 'crm-firsatlar', file: '06-crm-firsatlar.png' },
  { id: 'crm-faaliyetler', file: '06-crm-faaliyetler.png' },
  { id: 'crm-ajanda', file: '06-crm-ajanda.png' },

  // Proje
  { id: 'prj-projeler', file: '07-prj-projeler.png' },
  { id: 'prj-projeler', kind: 'form', file: '07-prj-proje-form.png' },
  { id: 'prj-isler', file: '07-prj-isler.png' },
  { id: 'prj-board', file: '07-prj-board.png' },

  // Satış
  { id: 'satis-teklifleri', file: '08-satis-teklifleri.png' },
  { id: 'satis-siparisleri', file: '08-satis-siparisleri.png' },
  { id: 'sevk-emirleri', file: '08-sevk-emirleri.png' },
  { id: 'irsaliye-yonetimi', file: '08-irsaliye.png' },
  { id: 'fatura-yonetimi', file: '08-fatura.png' },

  // Kalite
  { id: 'kk-emirleri-gkk', file: '09-gkk.png' },
  { id: 'kk-emirleri-ckk', file: '09-ckk.png' },
  { id: 'kk-kontrol-planlari', file: '09-kk-planlari.png' },

  // Onay
  { id: 'onaylarim', file: '10-onaylarim.png' },
  { id: 'onay-rota-tanim', file: '10-onay-rota.png' },

  // Finans
  { id: 'hesap-plani', file: '11-hesap-plani.png' },
  { id: 'finans-kasa-hesaplari', file: '11-kasa.png' },
  { id: 'finans-banka-hesaplari', file: '11-banka.png' },
  { id: 'mizan', file: '11-mizan.png' },
  { id: 'kokpit', file: '11-kokpit.png' },

  // İK
  { id: 'hr-personel', file: '12-hr-personel-liste.png' },
  { id: 'hr-personel', kind: 'form', file: '12-hr-personel-form.png' },
  { id: 'hr-izin-talepleri', file: '12-hr-izin.png' },
  { id: 'hr-bordro-calismalari', file: '12-hr-bordro.png' },
  { id: 'hr-is-ilanlari', file: '12-hr-ilanlar.png' },

  // Sabit / Sistem
  { id: 'numarator-tanimi', file: '13-numarator.png' },
  { id: 'kullanicilar', file: '13-kullanicilar.png' },
  { id: 'sistem-parametreleri', file: '13-sistem-parametreleri.png' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(500);
  const need = await page.evaluate(() => {
    const chip = document.querySelector('#userChipName')?.textContent || '';
    const loginView = document.querySelector('#viewLogin');
    return chip.length < 2 || (loginView && !loginView.hidden);
  });
  if (!need) return;
  await page.waitForSelector('#loginUser', { visible: true, timeout: 20000 }).catch(() => null);
  if (!(await page.$('#loginUser'))) {
    await page.click('#userChip').catch(() => null);
    await sleep(400);
    await page.click('[data-user-action="login"]').catch(() => null);
    await sleep(500);
  }
  await page.waitForSelector('#loginUser', { visible: true, timeout: 15000 });
  await page.click('#loginUser', { clickCount: 3 });
  await page.type('#loginUser', USER, { delay: 8 });
  await page.click('#loginPass', { clickCount: 3 });
  await page.type('#loginPass', PASS, { delay: 8 });
  await page.click('#loginSubmit');
  await sleep(1500);
}

async function openList(page, screenId) {
  await page.goto(`${BASE}/#${screenId}`, { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => null);
  await sleep(400);
  await page.evaluate((sid) => {
    if (typeof openScreen === 'function') openScreen(sid);
  }, screenId).catch(() => null);
  await sleep(1200);
}

async function openFirstForm(page, screenId) {
  await openList(page, screenId);
  const opened = await page.evaluate(() => {
    const row = document.querySelector('#dataTable tbody tr, .data-table tbody tr, table.list tbody tr, #listBody tr');
    if (row) {
      row.click();
      return true;
    }
    return false;
  });
  await sleep(400);
  if (opened) {
    await page.evaluate(() => {
      const btn = document.querySelector('#actionBar [data-action="incele"], button[data-action="incele"]');
      if (btn && !btn.disabled && !btn.hidden) btn.click();
    });
    await sleep(1400);
  }
  // sekme varsa ilk birkaçını dolaş — son kare form+aktif sekme
  const tabs = await page.$$('.form-tabs button, .form-tab, [data-form-tab], .tabs button');
  if (tabs.length > 1) {
    for (let i = 0; i < Math.min(tabs.length, 4); i++) {
      try {
        await tabs[i].click();
        await sleep(350);
      } catch { /* ignore */ }
    }
    // son olarak ikinci sekmeye geç (görsel çeşitlilik)
    try { await tabs[Math.min(1, tabs.length - 1)].click(); await sleep(400); } catch { /* */ }
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1440,900'],
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  await login(page);

  const results = [];
  for (const step of PLAN) {
    const outFile = path.join(OUT, step.file);
    try {
      if (step.kind === 'home') {
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 45000 });
        await sleep(800);
        await page.evaluate(() => {
          if (typeof openScreen === 'function') {
            /* stay home */
          }
          const home = document.querySelector('#viewHome, .home-view, #contentHome');
          if (home) home.scrollTop = 0;
        });
      } else if (step.kind === 'menu') {
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 45000 });
        await sleep(600);
        await page.evaluate(() => {
          const side = document.querySelector('#sidebar, .sidebar, nav.side');
          if (side) side.classList.add('open');
        });
      } else if (step.kind === 'form') {
        await openFirstForm(page, step.id);
      } else {
        await openList(page, step.id);
      }
      await page.screenshot({ path: outFile, fullPage: false });
      console.log('ok', step.file);
      results.push({ file: step.file, ok: true });
    } catch (err) {
      console.log('fail', step.file, err.message);
      results.push({ file: step.file, ok: false, error: err.message });
    }
  }

  fs.writeFileSync(
    path.join(OUT, '..', 'capture-report.json'),
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2)
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
