/**
 * GIDA SA sipariş onay rota + kayıt ekran görüntüleri
 *   node scripts/capture-gida-sa-onay-shots.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'owner';
const PASS = process.env.DEMO_PASS || 'owner';
const OUT = path.join(__dirname, '..', 'docs', 'erp-full-cycle-test', 'screenshots');

const SHOTS = [
  { file: '15b-sa-approval-route.png', hash: 'onay-rota-tanim', label: 'Onay Rotası OR-SA-SIPARIS' },
  { file: '15c-sa-approval-records.png', hash: 'onay-izleme', label: 'Onay İzleme — SA sipariş' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.setItem('ktb_firma_id', '4'));
  const loginVisible = await page.evaluate(
    () => !document.querySelector('#viewLogin')?.hidden && document.body.classList.contains('is-login'),
  );
  if (loginVisible || !(await page.$('#userChipName'))) {
    const needsLogin = await page.$('#loginUser');
    if (needsLogin) {
      await page.click('#loginUser', { clickCount: 3 });
      await page.type('#loginUser', USER, { delay: 5 });
      await page.click('#loginPass', { clickCount: 3 });
      await page.type('#loginPass', PASS, { delay: 5 });
      await page.click('#loginSubmit');
      await sleep(1200);
    }
  }
  await page.evaluate(() => localStorage.setItem('ktb_firma_id', '4'));
  const name = await page.$eval('#firmaPickerName', (el) => el.textContent || '').catch(() => '');
  if (!/GIDA|Süt|Anadolu/i.test(name)) {
    await page.click('#firmaPickerBtn').catch(() => page.click('#firmaPickerName'));
    await sleep(400);
    const gida = await page.$('[data-firma-id="4"]');
    if (gida) {
      await gida.click();
      await sleep(900);
    }
  }
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
  await login(page);

  for (const shot of SHOTS) {
    process.stdout.write(`${shot.file}… `);
    await page.goto(`${BASE}/#${shot.hash}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(1400);
    await page.evaluate(() => {
      const g = document.querySelector('.mod-group[data-mod="onay"]');
      if (g && g.classList.contains('collapsed')) g.querySelector('.mod-title')?.click();
    });
    await sleep(400);
    const dest = path.join(OUT, shot.file);
    await page.screenshot({ path: dest, fullPage: false });
    console.log('ok', dest);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
