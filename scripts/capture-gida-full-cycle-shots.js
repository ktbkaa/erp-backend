/**
 * GIDA tam döngü — liste + form (incele) ekran görüntüleri
 *   node scripts/capture-gida-full-cycle-shots.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = process.env.DEMO_PASS || 'Demo123!';
const OUT = path.join(__dirname, '..', 'docs', 'erp-full-cycle-test', 'screenshots');
const IDS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'erp-full-cycle-test', 'evidence', 'shot-ids.json'), 'utf8'),
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Liste + (opsiyonel) form detay */
const SHOTS = [
  { file: '00-warehouses-gida.png', list: 'warehouses' },
  { file: '01-items.png', list: 'stok-karti' },
  { file: '01b-item-form.png', form: 'stok-karti', id: IDS.item?.id, mode: 'incele' },
  { file: '02-bom.png', list: 'urun-agaci' },
  { file: '02b-bom-form.png', form: 'urun-agaci', id: IDS.bom?.id, mode: 'incele' },
  { file: '04-work-centers.png', list: 'is-merkezleri' },
  { file: '04b-work-center-form.png', form: 'is-merkezleri', id: IDS.wc?.id, mode: 'incele' },
  { file: '05-routings.png', list: 'routings' },
  { file: '05b-routing-form.png', form: 'routings', id: IDS.routing?.id, mode: 'incele' },
  { file: '06-partners.png', list: 'cari-kartlari' },
  { file: '06b-partner-form.png', form: 'cari-kartlari', id: IDS.partner?.id, mode: 'incele' },
  { file: '07-price-lists.png', list: 'fiyat-listeleri' },
  { file: '07b-price-list-form.png', form: 'fiyat-listeleri', id: IDS.priceList?.id, mode: 'incele' },
  { file: '08-sales-quotation.png', list: 'satis-teklifleri' },
  { file: '08b-sales-quotation-form.png', form: 'satis-teklifleri', id: IDS.sq?.id, mode: 'incele' },
  { file: '09-sales-order.png', list: 'satis-siparisleri' },
  { file: '09b-sales-order-form.png', form: 'satis-siparisleri', id: 60, mode: 'incele' }, // B00052 MAN
  { file: '10-mrp.png', list: 'mrp-calisma' },
  { file: '12-purchase-req.png', list: 'satin-alma-talepleri' },
  { file: '12b-purchase-req-form.png', form: 'satin-alma-talepleri', id: 45, mode: 'incele' }, // L00049 MAN
  { file: '15-purchase-order.png', list: 'satin-alma-siparisleri' },
  { file: '15b-purchase-order-form.png', form: 'satin-alma-siparisleri', id: 47, mode: 'incele' }, // P00048 MAN
  { file: '15c-sa-approval-route.png', list: 'onay-rota-tanim' },
  { file: '15d-sa-approval-route-form.png', form: 'onay-rota-tanim', id: IDS.route?.id, mode: 'incele' },
  { file: '15e-sa-approval-records.png', list: 'onay-izleme' },
  { file: '16-goods-receipt.png', list: 'mal-kabuller' },
  { file: '16b-goods-receipt-form.png', form: 'mal-kabuller', id: 31, mode: 'incele' }, // R00032 MAN
  { file: '16c-incoming-insp.png', list: 'giris-kontrolleri' },
  { file: '16d-incoming-insp-form.png', form: 'giris-kontrolleri', id: IDS.gk?.id, mode: 'incele' },
  { file: '16e-gkk.png', list: 'kk-emirleri-gkk' },
  { file: '16f-gkk-form.png', form: 'kk-emirleri-gkk', id: IDS.gkk?.id, mode: 'incele' },
  { file: '17-purchase-invoice.png', list: 'fatura-yonetimi' },
  { file: '17b-purchase-invoice-form.png', form: 'fatura-yonetimi', id: 87, mode: 'incele' }, // AF00022
  { file: '19-production.png', list: 'uretim-emirleri' },
  { file: '19b-production-form.png', form: 'uretim-emirleri', id: 37, mode: 'incele' }, // E00070
  { file: '23c-ckk.png', list: 'kk-emirleri-ckk' },
  { file: '24-delivery.png', list: 'irsaliye-yonetimi' },
  { file: '24b-delivery-form.png', form: 'irsaliye-yonetimi', id: 27, mode: 'incele' }, // IR00030
  { file: '26-sales-invoice.png', list: 'fatura-yonetimi' },
  { file: '26b-sales-invoice-form.png', form: 'fatura-yonetimi', id: 88, mode: 'incele' }, // FA00024
  { file: '27-stock-balance.png', list: 'depo-bakiye' },
];
// Remove obsolete filenames from earlier naming
const OBSOLETE = ['15b-sa-approval-route.png', '16b-incoming-insp.png', '16c-gkk.png'];

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => localStorage.setItem('ktb_firma_id', '4'));
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
    await sleep(1200);
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

async function openList(page, screenId) {
  await page.goto(`${BASE}/#${screenId}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1200);
  await page.evaluate((sid) => {
    document.querySelectorAll('.mod-group.collapsed .mod-title').forEach((el) => el.click());
  }, screenId);
  await sleep(300);
}

async function openForm(page, screenId, id, mode = 'incele') {
  const url = `${BASE}/?view=form&screen=${encodeURIComponent(screenId)}&mode=${mode}&id=${id}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1600);
  await page.waitForSelector('#formView, .form-solo, [data-master], #viewForm, .form-grid, .erp-form', {
    timeout: 20000,
  }).catch(() => null);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const old of OBSOLETE) {
    const p = path.join(OUT, old);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  console.log('login…');
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
      const dest = path.join(OUT, shot.file);
      await page.screenshot({ path: dest, fullPage: false });
      console.log('ok');
      manifest.push({ ...shot, ok: true });
    } catch (e) {
      console.log('FAIL', e.message);
      manifest.push({ ...shot, ok: false, error: e.message });
    }
  }
  fs.writeFileSync(path.join(OUT, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  const ok = manifest.filter((m) => m.ok).length;
  console.log(JSON.stringify({ ok, total: manifest.length, out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
