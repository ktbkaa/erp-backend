/**
 * Metal Marvel — geniş ekran görüntüsü seti
 *   node scripts/capture-metal-marvel-shots.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = process.env.DEMO_PASS || 'Demo123!';
const OUT = path.join(__dirname, '..', 'docs', 'metal-marvel', 'screenshots');
const IDS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'metal-marvel', 'evidence', 'shot-ids.json'), 'utf8'),
);
const OZET = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'docs', 'metal-marvel', 'evidence', 'marvel-sim-ozet.json'), 'utf8'),
);
const FIRMA_ID = String(OZET.firma?.id || IDS.firmaId || '12');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const idOf = (x) => (x && typeof x === 'object' ? x.id : x);

const SHOTS = [
  // Org / lisans
  { file: '00-firma-picker.png', list: 'companies' },
  { file: '00b-depolar.png', list: 'warehouses' },
  { file: '00c-is-merkezleri.png', list: 'is-merkezleri' },
  { file: '00d-is-merkezi-form.png', form: 'is-merkezleri', id: idOf(IDS.wc), mode: 'incele' },

  // İK
  { file: '01-hr-departmanlar.png', list: 'hr-departmanlar' },
  { file: '01b-hr-departman-form.png', form: 'hr-departmanlar', id: idOf(IDS.dept), mode: 'incele' },
  { file: '01c-hr-personel.png', list: 'hr-personel' },
  { file: '01d-hr-personel-form.png', form: 'hr-personel', id: idOf(IDS.emp), mode: 'incele' },
  { file: '01e-hr-ilanlar.png', list: 'hr-is-ilanlari' },
  { file: '01f-hr-ilan-form.png', form: 'hr-is-ilanlari', id: idOf(IDS.job), mode: 'incele' },
  { file: '01g-hr-adaylar.png', list: 'hr-adaylar' },
  { file: '01h-hr-bordro.png', list: 'hr-bordro-calismalari' },
  { file: '01i-hr-bordro-form.png', form: 'hr-bordro-calismalari', id: idOf(IDS.payroll), mode: 'incele' },

  // Lisans
  { file: '02-lisanslar.png', list: 'sistem-lisanslar' },
  { file: '02b-lisans-form.png', form: 'sistem-lisanslar', id: idOf(IDS.license), mode: 'incele' },
  { file: '02c-firma-lisans.png', list: 'firma-lisanslar' },

  // Master
  { file: '03-stok.png', list: 'stok-karti' },
  { file: '03b-stok-ironman.png', form: 'stok-karti', id: idOf(IDS.item), mode: 'incele' },
  { file: '03c-stok-spiderman.png', form: 'stok-karti', id: idOf(IDS.itemCnc), mode: 'incele' },
  { file: '03d-bom.png', list: 'urun-agaci' },
  { file: '03e-bom-form.png', form: 'urun-agaci', id: idOf(IDS.bom), mode: 'incele' },
  { file: '03f-rota.png', list: 'routings' },
  { file: '03g-rota-form.png', form: 'routings', id: idOf(IDS.route), mode: 'incele' },
  { file: '03h-cari.png', list: 'cari-kartlari' },
  { file: '03i-cari-musteri.png', form: 'cari-kartlari', id: idOf(IDS.partnerMus), mode: 'incele' },
  { file: '03j-cari-tedarikci.png', form: 'cari-kartlari', id: idOf(IDS.partnerTed), mode: 'incele' },

  // W1 CRM / satış / SA
  { file: '10-crm-aday.png', list: 'crm-adaylar' },
  { file: '10b-crm-aday-form.png', form: 'crm-adaylar', id: idOf(IDS.lead), mode: 'incele' },
  { file: '10c-crm-firsat.png', list: 'crm-firsatlar' },
  { file: '10d-crm-firsat-form.png', form: 'crm-firsatlar', id: idOf(IDS.opp), mode: 'incele' },
  { file: '11-satis-teklif.png', list: 'satis-teklifleri' },
  { file: '11b-satis-teklif-form.png', form: 'satis-teklifleri', id: idOf(IDS.sq), mode: 'incele' },
  { file: '12-satis-siparis.png', list: 'satis-siparisleri' },
  { file: '12b-satis-siparis-form.png', form: 'satis-siparisleri', id: idOf(IDS.so), mode: 'incele' },
  { file: '13-sa-talep.png', list: 'satin-alma-talepleri' },
  { file: '13b-sa-talep-form.png', form: 'satin-alma-talepleri', id: idOf(IDS.req), mode: 'incele' },
  { file: '13c-sa-rfq.png', list: 'satin-alma-teklif-istekleri' },
  { file: '13d-sa-rfq-form.png', form: 'satin-alma-teklif-istekleri', id: idOf(IDS.rfq), mode: 'incele' },
  { file: '13e-sa-teklif.png', list: 'satin-alma-teklifleri' },
  { file: '13f-sa-teklif-form.png', form: 'satin-alma-teklifleri', id: idOf(IDS.pq), mode: 'incele' },
  { file: '14-sa-siparis.png', list: 'satin-alma-siparisleri' },
  { file: '14b-sa-siparis-direkt.png', form: 'satin-alma-siparisleri', id: idOf(IDS.poDirect), mode: 'incele' },
  { file: '14c-sa-siparis-alasim.png', form: 'satin-alma-siparisleri', id: idOf(IDS.poAlloy), mode: 'incele' },
  { file: '15-mal-kabul.png', list: 'mal-kabuller' },
  { file: '15b-mal-kabul-form.png', form: 'mal-kabuller', id: idOf(IDS.gr), mode: 'incele' },
  { file: '15c-gkk.png', list: 'kk-emirleri-gkk' },
  { file: '15d-gkk-form.png', form: 'kk-emirleri-gkk', id: idOf(IDS.gkk), mode: 'incele' },

  // W2 üretim / proje / kalibrasyon
  { file: '20-uretim.png', list: 'uretim-emirleri' },
  { file: '20b-uretim-dokum.png', form: 'uretim-emirleri', id: idOf(IDS.woDok), mode: 'incele' },
  { file: '20c-uretim-cnc.png', form: 'uretim-emirleri', id: idOf(IDS.woCnc), mode: 'incele' },
  { file: '21-ckk.png', list: 'kk-emirleri-ckk' },
  { file: '21b-ckk-form.png', form: 'kk-emirleri-ckk', id: idOf(IDS.ckk), mode: 'incele' },
  { file: '22-proje.png', list: 'prj-projeler' },
  { file: '22b-proje-form.png', form: 'prj-projeler', id: idOf(IDS.project), mode: 'incele' },
  { file: '22c-prj-isler.png', list: 'prj-isler' },
  { file: '22d-prj-is-form.png', form: 'prj-isler', id: idOf(IDS.wi), mode: 'incele' },
  { file: '23-cihaz.png', list: 'kk-cihazlar' },
  { file: '23b-cihaz-form.png', form: 'kk-cihazlar', id: idOf(IDS.cihaz), mode: 'incele' },
  { file: '23c-kalibrasyon.png', list: 'kk-kalibrasyonlar' },
  { file: '23d-kalibrasyon-form.png', form: 'kk-kalibrasyonlar', id: idOf(IDS.kal), mode: 'incele' },
  { file: '24-onay-rota.png', list: 'onay-rota-tanim' },
  { file: '24b-onay-izleme.png', list: 'onay-izleme' },

  // W3
  { file: '30-irsaliye.png', list: 'irsaliye-yonetimi' },
  { file: '30b-irsaliye-form.png', form: 'irsaliye-yonetimi', id: idOf(IDS.dn), mode: 'incele' },
  { file: '30c-sevk.png', list: 'sevk-emirleri' },
  { file: '30d-sevk-form.png', form: 'sevk-emirleri', id: idOf(IDS.ship), mode: 'incele' },
  { file: '31-fatura.png', list: 'fatura-yonetimi' },
  { file: '31b-fatura-form.png', form: 'fatura-yonetimi', id: idOf(IDS.inv), mode: 'incele' },
  { file: '32-capa.png', list: 'kk-capa' },
  { file: '32b-capa-form.png', form: 'kk-capa', id: idOf(IDS.capa), mode: 'incele' },
  { file: '32c-uygunsuzluk.png', list: 'kk-uygunsuzluklar' },
  { file: '32d-uygunsuzluk-form.png', form: 'kk-uygunsuzluklar', id: idOf(IDS.ncr), mode: 'incele' },
  { file: '33-mrp.png', list: 'mrp-calisma' },
  { file: '34-depo-bakiye.png', list: 'depo-bakiye' },
  { file: '35-kullanicilar.png', list: 'kullanicilar' },
];

async function login(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate((id) => localStorage.setItem('ktb_firma_id', id), FIRMA_ID);
  const loginVisible = await page.evaluate(
    () => !document.querySelector('#viewLogin')?.hidden && document.body.classList.contains('is-login'),
  );
  if (!loginVisible) {
    await page.evaluate(() => {
      document.querySelector('#userChip')?.click();
    });
    await sleep(300);
    await page.evaluate(() => {
      document.querySelector('[data-user-action="login"]')?.click();
    });
    await sleep(400);
  }
  if (await page.$('#loginUser')) {
    await page.waitForSelector('#loginUser', { visible: true, timeout: 15000 });
    await page.click('#loginUser', { clickCount: 3 });
    await page.type('#loginUser', USER, { delay: 4 });
    await page.click('#loginPass', { clickCount: 3 });
    await page.type('#loginPass', PASS, { delay: 4 });
    await page.click('#loginSubmit');
    await sleep(1400);
  }
  await page.evaluate((id) => {
    localStorage.setItem('ktb_firma_id', id);
    document.querySelector('#firmaPickerBtn')?.click();
    document.querySelector('#firmaPickerName')?.click();
  }, FIRMA_ID);
  await sleep(500);
  await page.evaluate((id) => {
    document.querySelector(`[data-firma-id="${id}"]`)?.click();
  }, FIRMA_ID);
  await sleep(900);
}

async function openList(page, screenId) {
  await page.goto(`${BASE}/#${screenId}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1000);
}

async function openForm(page, screenId, id, mode = 'incele') {
  const url = `${BASE}/?view=form&screen=${encodeURIComponent(screenId)}&mode=${mode}&id=${id}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1400);
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
    if (shot.form && (shot.id == null || shot.id === undefined || shot.id === '')) {
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
  const ok = manifest.filter((m) => m.ok).length;
  console.log(JSON.stringify({ ok, total: manifest.length, out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
