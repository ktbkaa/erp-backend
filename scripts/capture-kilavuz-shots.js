/**
 * Sistem kılavuzu için ana ekran görüntüleri.
 *   node scripts/capture-kilavuz-shots.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const pool = require('../db');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const USER = process.env.DEMO_USER || 'kagantalha.b';
const PASS = require('./lib/demoCredentials').demoPassword();
const OUT = path.join(__dirname, '..', 'docs', 'kilavuz', 'shots');
const ART = '/opt/cursor/artifacts/kilavuz/shots';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveIds(firmaCode) {
  const firma = (await pool.query(
    `SELECT id, company_code, company_name FROM companies WHERE company_code=$1`,
    [firmaCode],
  )).rows[0];
  if (!firma) throw new Error(`Firma yok: ${firmaCode}`);
  const fid = firma.id;
  const one = async (sql, params = [fid]) => {
    const r = await pool.query(sql, params);
    return r.rows[0]?.id || null;
  };
  return {
    firma,
    partner: await one(`SELECT id FROM partners WHERE company_id=$1 ORDER BY id DESC LIMIT 1`),
    item: await one(`SELECT id FROM items WHERE company_id=$1 ORDER BY id DESC LIMIT 1`),
    so: await one(`SELECT id FROM sales_orders WHERE company_id=$1 ORDER BY id DESC LIMIT 1`),
    po: await one(`SELECT id FROM purchase_orders WHERE company_id=$1 ORDER BY id DESC LIMIT 1`),
    wo: await one(`SELECT id FROM production_orders WHERE company_id=$1 ORDER BY id DESC LIMIT 1`),
    bom: await one(`SELECT id FROM boms WHERE company_id=$1 ORDER BY id DESC LIMIT 1`),
    routing: await one(`SELECT id FROM routings WHERE company_id=$1 ORDER BY id DESC LIMIT 1`).catch(() => null),
    gr: await one(`SELECT id FROM goods_receipts WHERE company_id=$1 ORDER BY id DESC LIMIT 1`).catch(() => null),
    inv: await one(`SELECT id FROM invoices WHERE company_id=$1 ORDER BY id DESC LIMIT 1`).catch(() => null),
    dn: await one(`SELECT id FROM delivery_notes WHERE company_id=$1 ORDER BY id DESC LIMIT 1`).catch(() => null),
    mrp: await one(`SELECT id FROM mrp_runs WHERE company_id=$1 ORDER BY id DESC LIMIT 1`).catch(() => null),
  };
}

async function login(page, firmaId) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate((id) => localStorage.setItem('ktb_firma_id', String(id)), firmaId);
  const loginVisible = await page.evaluate(() => !document.querySelector('#viewLogin')?.hidden
    && document.body.classList.contains('is-login'));
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
    localStorage.setItem('ktb_firma_id', String(id));
    document.querySelector('#firmaPickerBtn')?.click();
    document.querySelector('#firmaPickerName')?.click();
  }, String(firmaId));
  await sleep(500);
  await page.evaluate((id) => {
    document.querySelector(`[data-firma-id="${id}"]`)?.click();
  }, String(firmaId));
  await sleep(900);
}

async function openList(page, screenId) {
  await page.goto(`${BASE}/#${screenId}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1100);
}

async function openForm(page, screenId, id, mode = 'incele') {
  const url = `${BASE}/?view=form&screen=${encodeURIComponent(screenId)}&mode=${mode}&id=${id}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(1400);
}

async function shot(page, file) {
  const p = path.join(OUT, file);
  await page.screenshot({ path: p, fullPage: false });
  fs.copyFileSync(p, path.join(ART, file));
  return p;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ART, { recursive: true });

  const prefer = ['MARVEL', 'XELEK', 'GIDA', 'DEMO'];
  let ids = null;
  for (const code of prefer) {
    try {
      const cand = await resolveIds(code);
      if (cand.wo || cand.so || cand.item) {
        ids = cand;
        break;
      }
    } catch (_) { /* next */ }
  }
  if (!ids) throw new Error('Uygun firma/veri bulunamadı');
  console.log('Firma', ids.firma.company_code, ids.firma.id, {
    partner: ids.partner, item: ids.item, so: ids.so, wo: ids.wo, bom: ids.bom,
  });

  const SHOTS = [
    { file: '00-ana-sayfa.png', list: null, home: true, label: 'Ana sayfa / kabuk' },
    { file: '01-firmalar-liste.png', list: 'companies', label: 'Firmalar listesi' },
    { file: '02-cari-liste.png', list: 'cari-kartlari', label: 'Cari kartları' },
    { file: '03-cari-form.png', form: 'cari-kartlari', id: ids.partner, label: 'Cari kart formu' },
    { file: '04-stok-liste.png', list: 'stok-karti', label: 'Stok kartları' },
    { file: '05-stok-form.png', form: 'stok-karti', id: ids.item, label: 'Stok kart formu' },
    { file: '06-depo-bakiye.png', list: 'depo-bakiye', label: 'Depo bakiye' },
    { file: '07-stok-hareket.png', list: 'stok-hareketleri', label: 'Stok hareketleri' },
    { file: '08-sa-siparis-liste.png', list: 'satin-alma-siparisleri', label: 'SA siparişleri' },
    { file: '09-sa-siparis-form.png', form: 'satin-alma-siparisleri', id: ids.po, label: 'SA sipariş formu' },
    { file: '10-mal-kabul.png', list: 'mal-kabuller', label: 'Mal kabuller' },
    { file: '11-satis-siparis-liste.png', list: 'satis-siparisleri', label: 'Satış siparişleri' },
    { file: '12-satis-siparis-form.png', form: 'satis-siparisleri', id: ids.so, label: 'Satış siparişi' },
    { file: '13-bom-liste.png', list: 'urun-agaci', label: 'Ürün ağacı listesi' },
    { file: '14-bom-form.png', form: 'urun-agaci', id: ids.bom, label: 'Ürün ağacı formu' },
    { file: '15-bom-patlatma.png', list: 'bom-patlatma', label: 'BOM patlatma' },
    { file: '16-rota-liste.png', list: 'routings', label: 'Rotalar' },
    { file: '17-isemri-liste.png', list: 'uretim-emirleri', label: 'İş emirleri' },
    { file: '18-isemri-form.png', form: 'uretim-emirleri', id: ids.wo, label: 'İş emri formu' },
    { file: '19-uretim-giris.png', list: 'uretim-girisleri', label: 'Üretim girişleri' },
    { file: '20-fason.png', list: 'fason-siparisleri', label: 'Fason siparişler' },
    { file: '21-gkk.png', list: 'kk-emirleri-gkk', label: 'GKK emirleri' },
    { file: '22-ckk.png', list: 'kk-emirleri-ckk', label: 'ÇKK emirleri' },
    { file: '23-mrp.png', list: 'mrp-calisma', label: 'MRP çalışmaları' },
    { file: '24-irsaliye.png', list: 'irsaliye-yonetimi', label: 'Satış irsaliyeleri' },
    { file: '25-fatura.png', list: 'fatura-yonetimi', label: 'Satış faturaları' },
    { file: '26-crm.png', list: 'crm-firsatlar', label: 'CRM fırsatlar' },
    { file: '27-prj.png', list: 'prj-projeler', label: 'Projeler' },
    { file: '28-hr.png', list: 'hr-personel', label: 'İK personel' },
    { file: '29-finans.png', list: 'tahsilat-odemeler', label: 'Tahsilat / ödemeler' },
    { file: '30-onay.png', list: 'onaylarim', label: 'Onaylarım' },
  ].filter((s) => !(s.form && !s.id));

  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  await login(page, ids.firma.id);

  const manifest = [];
  for (const s of SHOTS) {
    process.stdout.write(`${s.file}… `);
    try {
      if (s.home) {
        await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 60000 });
        await sleep(900);
      } else if (s.list) await openList(page, s.list);
      else await openForm(page, s.form, s.id, 'incele');
      await shot(page, s.file);
      console.log('ok');
      manifest.push({ ...s, ok: true });
    } catch (e) {
      console.log('FAIL', e.message.slice(0, 80));
      manifest.push({ ...s, ok: false, error: e.message });
    }
  }

  const meta = {
    firma: ids.firma,
    ids: { partner: ids.partner, item: ids.item, so: ids.so, wo: ids.wo, bom: ids.bom, po: ids.po },
    manifest,
    ok: manifest.filter((m) => m.ok).length,
    total: manifest.length,
  };
  fs.writeFileSync(path.join(OUT, 'capture-manifest.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(OUT, '../evidence/capture-manifest.json'), JSON.stringify(meta, null, 2));
  await browser.close();
  await pool.end().catch(() => {});
  console.log(JSON.stringify({ ok: meta.ok, total: meta.total, firma: ids.firma.company_code }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
