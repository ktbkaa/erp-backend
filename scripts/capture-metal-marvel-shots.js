/**
 * Metal Marvel — süreç ekran görüntüleri
 *   node scripts/capture-metal-marvel-shots.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'owner';
const PASS = process.env.DEMO_PASS || 'Demo123!';
const OUT = path.join(__dirname, '..', 'docs', 'metal-marvel', 'screenshots');
const IDS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'metal-marvel', 'evidence', 'shot-ids.json'), 'utf8'),
);
const OZET = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'metal-marvel', 'evidence', 'marvel-sim-ozet.json'), 'utf8'),
);

const FIRMA_ID = String(OZET.firma?.id || IDS.firmaId || '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHOTS = [
  { file: '00-firma-picker.png', list: 'companies' },
  { file: '01-hr-personel.png', list: 'hr-personel' },
  { file: '01b-hr-personel-form.png', form: 'hr-personel', id: IDS.emp?.id, mode: 'incele' },
  { file: '02-hr-departmanlar.png', list: 'hr-departmanlar' },
  { file: '03-lisanslar.png', list: 'sistem-lisanslar' },
  { file: '03b-firma-lisans.png', list: 'firma-lisanslar' },
  { file: '04-stok.png', list: 'stok-karti' },
  { file: '04b-stok-form.png', form: 'stok-karti', id: IDS.item?.id, mode: 'incele' },
  { file: '05-bom.png', list: 'urun-agaci' },
  { file: '06-cari.png', list: 'cari-kartlari' },
  { file: '07-crm-aday.png', list: 'crm-adaylar' },
  { file: '08-satis-teklif.png', list: 'satis-teklifleri' },
  { file: '09-satis-siparis.png', list: 'satis-siparisleri' },
  { file: '09b-satis-siparis-form.png', form: 'satis-siparisleri', id: IDS.so?.id || OZET.week1?.salesOrder?.id, mode: 'incele' },
  { file: '10-sa-talep.png', list: 'satin-alma-talepleri' },
  { file: '11-sa-siparis.png', list: 'satin-alma-siparisleri' },
  { file: '12-mal-kabul.png', list: 'mal-kabuller' },
  { file: '13-uretim.png', list: 'uretim-emirleri' },
  { file: '13b-uretim-form.png', form: 'uretim-emirleri', id: IDS.wo?.id || OZET.week2?.ueDokum?.id, mode: 'incele' },
  { file: '14-proje.png', list: 'prj-projeler' },
  { file: '15-kk-cihaz.png', list: 'kk-cihazlar' },
  { file: '16-kk-kalibrasyon.png', list: 'kk-kalibrasyonlar' },
  { file: '17-kk-capa.png', list: 'kk-capa' },
  { file: '18-irsaliye.png', list: 'irsaliye-yonetimi' },
  { file: '19-fatura.png', list: 'fatura-yonetimi' },
  { file: '20-depolar.png', list: 'warehouses' },
];

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
  if (FIRMA_ID) await page.evaluate((id) => localStorage.setItem('ktb_firma_id', id), FIRMA_ID);
  const loginVisible = await page.evaluate(
    () => !document.querySelector('#viewLogin')?.hidden && document.body.classList.contains('is-login'),
  );
  if (!loginVisible) {
    await page.click('#userChip').catch(() => null);
    await sleep(250);
    const loginItem = await page.$('[data-user-action="login"]');
    if (loginItem) await loginItem.click();
    await sleep(400);
  }
  if (await page.$('#loginUser')) {
    await page.waitForSelector('#loginUser', { visible: true, timeout: 15000 });
    await page.click('#loginUser', { clickCount: 3 });
    await page.type('#loginUser', USER, { delay: 5 });
    await page.click('#loginPass', { clickCount: 3 });
    await page.type('#loginPass', PASS, { delay: 5 });
    await page.click('#loginSubmit');
    await sleep(1500);
  }
  if (FIRMA_ID) {
    await page.evaluate((id) => {
      localStorage.setItem('ktb_firma_id', id);
      try {
        const btn = document.querySelector('#firmaPickerBtn') || document.querySelector('#firmaPickerName');
        if (btn) btn.click();
      } catch (_) { /* */ }
    }, FIRMA_ID);
    await sleep(500);
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-firma-id="${id}"]`);
      if (el) el.click();
    }, FIRMA_ID).catch(() => null);
    await sleep(900);
  }
}

async function openList(page, screenId) {
  await page.goto(`${BASE}/#${screenId}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1100);
}

async function openForm(page, screenId, id, mode = 'incele') {
  const url = `${BASE}/?view=form&screen=${encodeURIComponent(screenId)}&mode=${mode}&id=${id}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  console.log('login…', USER, 'firma', FIRMA_ID);
  await login(page);

  const manifest = [];
  for (const shot of SHOTS) {
    if (shot.form && (shot.id == null || shot.id === undefined)) {
      console.log(`skip ${shot.file} (no id)`);
      manifest.push({ ...shot, ok: false, error: 'no id' });
      continue;
    }
    process.stdout.write(`${shot.file}… `);
    try {
      if (shot.list) await openList(page, shot.list);
      else await openForm(page, shot.form, shot.id, shot.mode || 'incele');
      await page.screenshot({ path: path.join(OUT, shot.file), fullPage: false });
      console.log('ok');
      manifest.push({ ...shot, ok: true });
    } catch (e) {
      console.log('FAIL', e.message);
      manifest.push({ ...shot, ok: false, error: e.message });
    }
  }
  fs.writeFileSync(path.join(OUT, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(JSON.stringify({
    ok: manifest.filter((m) => m.ok).length,
    total: manifest.length,
    out: OUT,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
