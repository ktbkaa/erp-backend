import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
mkdirSync('/opt/cursor/artifacts/screenshots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,950'],
  defaultViewport: { width: 1500, height: 950 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ktb_firma_id', '2'); });
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll('#sidebarNav .mod-group').length > 0, { timeout: 15000 });

await page.evaluate(async () => {
  state.activeFirmaId = 2;
  await openScreen('stok-karti');
  await openForm('yeni', { inPlace: true });
});
await new Promise((r) => setTimeout(r, 800));

// Open Firmalar tab
await page.evaluate(() => {
  const btn = document.querySelector('[data-tab="firmalar"], .form-tab-btn[data-tab-id="firmalar"]')
    || [...document.querySelectorAll('.form-tab-btn, [role="tab"]')].find((b) => /Firma/i.test(b.textContent || ''));
  btn?.click();
});
await new Promise((r) => setTimeout(r, 600));

const before = await page.evaluate(() => {
  const panel = document.querySelector('[data-tab-panel="firmalar"]') || document.getElementById('stokFirmaParams');
  const gated = document.querySelectorAll('.stok-firma-details.is-gated').length;
  const plantBlocks = document.querySelectorAll('[data-stok-firma-plant-block]').length;
  const addBtn = !!document.querySelector('[data-stok-firma-add-plant]');
  const hint = document.querySelector('.stok-firma-yetki-pane .yetki-hint')?.textContent?.slice(0, 120);
  return { gated, plantBlocks, addBtn, hint, hasPanel: !!panel };
});
console.log('BEFORE_PLANT', JSON.stringify(before, null, 2));

// Select a plant for first block
await page.evaluate(async () => {
  await fetchLookupKey('is-yerleri');
  const plantSel = document.querySelector('select[data-stok-firma="plant_id"]');
  const field = { key: 'plant_id', type: 'lookup', lookup: 'is-yerleri', valueKey: 'id', labelKey: 'plant_name', codeKey: 'plant_code', dependsOn: 'company_id', filterKey: 'company_id' };
  const firmaId = plantSel?.getAttribute('data-stok-firma-id');
  refreshLookupSelect(plantSel, field, { company_id: Number(firmaId) });
  const opt = [...plantSel.options].find((o) => o.value);
  if (opt) {
    plantSel.value = opt.value;
    plantSel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return { firmaId, plant: plantSel?.value, opts: plantSel?.options?.length };
});
await new Promise((r) => setTimeout(r, 1200));

const after = await page.evaluate(() => {
  const gated = document.querySelectorAll('.stok-firma-details.is-gated').length;
  const openDetails = document.querySelectorAll('.stok-firma-details:not(.is-gated)').length;
  const plantVal = document.querySelector('select[data-stok-firma="plant_id"]')?.value;
  const fieldsetDisabled = document.querySelector('.stok-firma-details:not(.is-gated) fieldset')?.disabled;
  return { gated, openDetails, plantVal, fieldsetDisabled };
});
console.log('AFTER_PLANT', JSON.stringify(after, null, 2));
await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/stok-firma-isyeri-gate.png', fullPage: false });

// Form-solo animation: open with ?view=form
const soloPage = await browser.newPage();
await soloPage.goto('http://127.0.0.1:3000/?view=form&screen=stok-hareketleri&mode=yeni', { waitUntil: 'domcontentloaded', timeout: 60000 });
const soloBoot = await soloPage.evaluate(() => ({
  boot: document.documentElement.classList.contains('form-solo-boot'),
  bodyBoot: document.body.classList.contains('form-solo-booting'),
  loaderHidden: document.getElementById('formSoloLoader')?.hidden,
  loaderDisplay: getComputedStyle(document.getElementById('formSoloLoader') || document.body).display,
}));
console.log('SOLO_IMMEDIATE', JSON.stringify(soloBoot));
await new Promise((r) => setTimeout(r, 2500));
const soloAfter = await soloPage.evaluate(() => ({
  boot: document.documentElement.classList.contains('form-solo-boot'),
  bodySolo: document.body.classList.contains('form-solo'),
  loaderHidden: document.getElementById('formSoloLoader')?.hidden,
  formVisible: document.querySelector('#viewForm') && !document.querySelector('#viewForm').hidden,
  sidebarHidden: document.querySelector('.sidebar')?.hidden || getComputedStyle(document.querySelector('.sidebar') || document.body).display === 'none',
}));
console.log('SOLO_AFTER', JSON.stringify(soloAfter));
await soloPage.screenshot({ path: '/opt/cursor/artifacts/screenshots/form-solo-ready.png', fullPage: false });

await browser.close();
const ok = before.gated > 0 && after.openDetails > 0 && after.plantVal && soloAfter.bodySolo && soloAfter.formVisible;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
