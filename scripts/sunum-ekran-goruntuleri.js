#!/usr/bin/env node
/**
 * DEMO sunum ekran görüntüleri (puppeteer-core + local Chrome)
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.ERP_BASE || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/sunum-ekranlar';
const USER = 'kagantalha.b';
const PASS = 'Demo123!';

const SCREENS = [
  ['crm-adaylar', 'crm-adaylar.png'],
  ['crm-firsatlar', 'crm-firsatlar.png'],
  ['crm-faaliyetler', 'crm-faaliyetler.png'],
  ['satis-teklifleri', 'satis-teklifleri.png'],
  ['satis-siparisleri', 'satis-siparisleri.png'],
  ['sevk-emirleri', 'sevk-emirleri.png'],
  ['irsaliyeler', 'irsaliyeler.png'],
  ['satis-faturalari', 'satis-faturalari.png'],
  ['satin-alma-teklifleri', 'satin-alma-teklifleri.png'],
  ['satin-alma-anlasmalari', 'satin-alma-anlasmalari.png'],
  ['satin-alma-siparisleri', 'satin-alma-siparisleri.png'],
  ['mal-kabuller', 'mal-kabuller.png'],
  ['kk-emirleri-gkk', 'kk-emirleri-gkk.png'],
  ['kk-emirleri-ckk', 'kk-emirleri-ckk.png'],
  ['kk-uygunsuzluklar', 'kk-uygunsuzluklar.png'],
  ['uretim-emirleri', 'uretim-emirleri.png'],
  ['urun-agaci', 'urun-agaci.png'],
  ['depo-bakiye', 'depo-bakiye.png'],
  ['transfer-emirleri', 'transfer-emirleri.png'],
  ['mrp-calisma', 'mrp-calisma.png'],
  ['fiyat-listeleri', 'fiyat-listeleri.png'],
  ['muhasebe-belgeleri', 'muhasebe-belgeleri.png'],
  ['tahsilat-odemeler', 'tahsilat-odemeler.png'],
];

async function waitList(page) {
  await page.waitForSelector('#dataBody', { timeout: 15000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 900));
}

async function openScreen(page, id) {
  await page.evaluate((sid) => {
    if (typeof openScreen === 'function') return openScreen(sid);
    location.hash = `#${sid}`;
  }, id);
  await waitList(page);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const results = [];

  // DEMO firmasını sayfa yüklenmeden önce sabitle
  await page.goto('about:blank');
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('ktb_firma_id', '1'); } catch (_) { /* ignore */ }
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });

  // Login (viewLogin görünürse)
  const needLogin = await page.evaluate(() => {
    const v = document.querySelector('#viewLogin');
    return v && !v.hidden;
  });
  if (needLogin) {
    await page.waitForSelector('#loginUser', { timeout: 10000 });
    await page.$eval('#loginUser', (el) => { el.value = ''; });
    await page.$eval('#loginPass', (el) => { el.value = ''; });
    await page.type('#loginUser', USER, { delay: 5 });
    await page.type('#loginPass', PASS, { delay: 5 });
    await Promise.all([
      page.click('#loginSubmit'),
      page.waitForFunction(() => {
        const v = document.querySelector('#viewLogin');
        return !v || v.hidden;
      }, { timeout: 20000 }).catch(() => null),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
  }

  // setActiveFirma(1) — Demo Firma A.Ş.
  await page.evaluate(async () => {
    localStorage.setItem('ktb_firma_id', '1');
    if (typeof setActiveFirma === 'function') {
      await setActiveFirma(1, { reload: false });
    } else if (typeof state !== 'undefined') {
      state.activeFirmaId = 1;
      if (typeof renderFirmaPicker === 'function') renderFirmaPicker();
    }
  });
  await new Promise((r) => setTimeout(r, 600));
  const firmaAdi = await page.evaluate(() => document.querySelector('#firmaProfileName')?.textContent || '');
  console.log('Aktif firma UI:', firmaAdi);

  for (const [id, file] of SCREENS) {
    try {
      await openScreen(page, id);
      const out = path.join(OUT, file);
      await page.screenshot({ path: out, fullPage: false });
      const meta = await page.evaluate(() => {
        const rows = document.querySelectorAll('#dataBody tr[data-id]');
        const empty = document.querySelector('#dataBody .empty-row, #dataBody tr td');
        const title = document.querySelector('#screenTitle')?.textContent || '';
        return { rows: rows.length, title, emptyText: empty?.textContent?.slice(0, 80) || '' };
      });
      results.push({ id, file: out, ...meta });
      console.log(`✓ ${id} rows=${meta.rows} → ${file}`);
    } catch (e) {
      results.push({ id, file, error: e.message });
      console.log(`⚠ ${id}: ${e.message}`);
    }
  }

  // Sağ tık menü — satış sipariş
  try {
    await openScreen(page, 'satis-siparisleri');
    const hasRow = await page.$('#dataBody tr[data-id]');
    if (hasRow) {
      const box = await hasRow.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 3, box.y + box.height / 2, { button: 'right' });
        await new Promise((r) => setTimeout(r, 400));
        const menuVisible = await page.evaluate(() => {
          const m = document.querySelector('#listCtxMenu');
          return m && !m.hidden;
        });
        await page.screenshot({ path: path.join(OUT, 'siparis-sag-tik.png'), fullPage: false });
        results.push({ id: 'siparis-sag-tik', file: path.join(OUT, 'siparis-sag-tik.png'), menuVisible });
        console.log(`✓ siparis-sag-tik menuVisible=${menuVisible}`);
      }
    }
  } catch (e) {
    console.log(`⚠ sag-tik: ${e.message}`);
  }

  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(results, null, 2));
  await browser.close();
  console.log('Done', results.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
