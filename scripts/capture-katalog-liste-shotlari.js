/**
 * Yeni / kritik ekranların liste görüntüleri (sunum PDF için).
 *   node scripts/capture-katalog-liste-shotlari.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'sa.user';
const PASS = process.env.DEMO_PASS || 'sa.user';
const OUT = path.join(__dirname, '..', 'docs', 'ekran-katalog', 'shots');

const SCREENS = [
  'numarator-tanimi', 'ulke-tanimi', 'para-birimi-tanimi', 'sehir-tanimi',
  'kullanicilar', 'tablo-bilgileri',
  'irsaliye-yonetimi', 'fatura-yonetimi',
  'hesap-plani', 'muhasebe-belgeleri', 'muhasebe-donemleri',
  'finans-vergi-kodlari', 'finans-banka-hesaplari', 'finans-nakit-hareketleri',
  'mizan', 'finans-yevmiye', 'finans-bilanco',
  'onaylarim', 'onay-kural-tanim', 'onay-rota-tanim',
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  const needLogin = await page.evaluate(() => {
    const chip = document.querySelector('#userChipName')?.textContent || '';
    return chip.length < 2 || document.body.classList.contains('is-login');
  });
  if (!needLogin) return;
  const loginVisible = await page.evaluate(() => !document.querySelector('#viewLogin')?.hidden);
  if (!loginVisible) {
    await page.click('#userChip').catch(() => null);
    await sleep(300);
    await page.click('[data-user-action="login"]').catch(() => null);
    await sleep(400);
  }
  await page.waitForSelector('#loginUser', { visible: true, timeout: 15000 });
  await page.click('#loginUser', { clickCount: 3 });
  await page.type('#loginUser', USER, { delay: 5 });
  await page.click('#loginPass', { clickCount: 3 });
  await page.type('#loginPass', PASS, { delay: 5 });
  await page.click('#loginSubmit');
  await sleep(1200);
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
  for (const id of SCREENS) {
    try {
      await page.goto(`${BASE}/#${id}`, { waitUntil: 'networkidle0', timeout: 45000 });
      await sleep(900);
      await page.evaluate((sid) => {
        if (typeof openScreen === 'function') openScreen(sid);
      }, id).catch(() => null);
      await sleep(1400);
      const file = path.join(OUT, `${id}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log('ok', id);
    } catch (err) {
      console.log('fail', id, err.message);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
