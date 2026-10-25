/**
 * Onay Yönetimi — doküman için ekran görüntüleri.
 *   node scripts/capture-onay-dokuman-ekranlari.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = process.env.DEMO_PASS || 'Demo123!';
const OUT = path.join(__dirname, '..', 'docs', 'onay-dokuman-shots');
const ART = '/opt/cursor/artifacts/onay-dokuman-shots';

const SHOTS = [
  { file: '01-menu-onay', listHash: 'onaylarim', label: 'Menü — Onay Yönetimi', waitMs: 1200 },
  { file: '10-rol-liste', listHash: 'onay-rol-tanim', label: 'Onay Rolü — liste' },
  { file: '11-rol-form', screen: 'onay-rol-tanim', mode: 'incele', id: 5, label: 'Onay Rolü — form' },
  { file: '20-kural-liste', listHash: 'onay-kural-tanim', label: 'Onay Kuralı — liste' },
  { file: '21-kural-form', screen: 'onay-kural-tanim', mode: 'incele', id: 2, label: 'Onay Kuralı — form' },
  { file: '30-rota-liste', listHash: 'onay-rota-tanim', label: 'Onay Rotası — liste' },
  { file: '31-rota-form', screen: 'onay-rota-tanim', mode: 'incele', id: 1, label: 'Onay Rotası — form' },
  { file: '40-mesaj-liste', listHash: 'onay-mesaj-sablon', label: 'Mesaj Şablonu — liste' },
  { file: '50-onaylarim', listHash: 'onaylarim', label: 'Onaylarım' },
  { file: '51-izleme', listHash: 'onay-izleme', label: 'Onay İzleme' },
  { file: '60-yetki-devri', listHash: 'onay-yetki-devri', label: 'Yetki Devri' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.setItem('ktb_firma_id', '2'));
  const loginVisible = await page.evaluate(
    () => !document.querySelector('#viewLogin')?.hidden && document.body.classList.contains('is-login'),
  );
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
    () => (document.querySelector('#userChipName')?.textContent || '').length > 3,
    { timeout: 20000 },
  ).catch(() => null);
  await sleep(700);
  await page.evaluate(() => localStorage.setItem('ktb_firma_id', '2'));
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

async function openShot(page, shot) {
  if (shot.listHash) {
    await page.goto(`${BASE}/#${shot.listHash}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await sleep(shot.waitMs || 1100);
    // Expand Onay module in sidebar if present
    await page.evaluate(() => {
      const g = document.querySelector('.mod-group[data-mod="onay"]');
      if (g && g.classList.contains('collapsed')) {
        g.querySelector('.mod-title')?.click();
      }
    });
    await sleep(300);
    return;
  }
  const url = `${BASE}/?view=form&screen=${encodeURIComponent(shot.screen)}&mode=${shot.mode}&id=${shot.id}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1400);
  await page.waitForSelector('#formView, .form-solo, [data-master], #viewForm', { timeout: 20000 }).catch(() => null);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ART, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  await login(page);

  const manifest = [];
  for (const shot of SHOTS) {
    process.stdout.write(`shot ${shot.file}… `);
    try {
      await openShot(page, shot);
      const p1 = path.join(OUT, `${shot.file}.png`);
      await page.screenshot({ path: p1, fullPage: false });
      fs.copyFileSync(p1, path.join(ART, `${shot.file}.png`));
      console.log('ok');
      manifest.push({ ...shot, ok: true });
    } catch (e) {
      console.log('FAIL', e.message);
      manifest.push({ ...shot, ok: false, error: e.message });
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(JSON.stringify({ ok: manifest.filter((m) => m.ok).length, total: manifest.length, out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
