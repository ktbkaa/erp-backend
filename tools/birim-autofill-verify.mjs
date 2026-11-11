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
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll('#sidebarNav .mod-group').length > 0, { timeout: 15000 });

await page.evaluate(async () => {
  await openScreen('stok-hareketleri');
  await openForm('yeni', { inPlace: true });
});
await page.waitForSelector('select[data-detail="item_id"]', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));

// Ensure lookups loaded
await page.evaluate(async () => {
  if (typeof fetchLookupKey === 'function') {
    await fetchLookupKey('items');
    await fetchLookupKey('olcu-birimleri');
  }
});

const picked = await page.evaluate(() => {
  const itemSel = document.querySelector('select[data-detail="item_id"]');
  // rebuild options if empty
  if (![...itemSel.options].some((o) => o.value)) {
    const rows = []; // can't access state; force change after API
  }
  const opt = [...itemSel.options].find((o) => o.value && o.value !== '');
  if (!opt) return { err: 'no-item-options', n: itemSel.options.length };
  itemSel.value = opt.value;
  itemSel.dispatchEvent(new Event('change', { bubbles: true }));
  return { id: opt.value, label: opt.textContent };
});
console.log('PICKED', picked);
await new Promise((r) => setTimeout(r, 2500));

const after = await page.evaluate(() => {
  const itemSel = document.querySelector('select[data-detail="item_id"]');
  const uomSel = document.querySelector('select[data-detail="uom_code"]');
  const uomTa = uomSel?.closest('.lookup-widget')?.querySelector('.lookup-typeahead');
  return {
    itemId: itemSel?.value,
    uomVal: uomSel?.value,
    uomTa: uomTa?.value,
    uomOptText: uomSel?.selectedOptions?.[0]?.textContent,
  };
});
console.log('AFTER', JSON.stringify(after, null, 2));
await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/stok-hareket-birim-autofill.png', fullPage: false });
await browser.close();
const ok = Boolean(after.uomVal && after.uomTa);
process.exit(ok ? 0 : 1);
