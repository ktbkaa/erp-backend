#!/usr/bin/env node
/**
 * GIDA firması ile tüm ekranların liste + kayıt (inceleme) görüntülerini alır.
 *
 *   PUPPETEER_CORE=/path/to/puppeteer-core CHROME=/usr/bin/google-chrome \
 *     node scripts/doc/capture-sut-screens.mjs
 *
 * Çıktı: docs/sut-tam-dongu/shots/*.jpg + docs/sut-tam-dongu/shots.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/sut-tam-dongu');
const SHOTS = path.join(OUT, 'shots');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const USER = process.env.ERP_USER || 'ADMIN';
const PASS = process.env.ERP_PASS || 'admin';
const COMPANY_CODE = process.env.ERP_COMPANY || 'GIDA';
const PREFER = ['SUT-EKRAN', 'TEST-SUT', 'GIDA', 'OG-', 'Süt', 'süt'];
const ONLY = (process.env.SCREENS || '').split(',').filter(Boolean);

const puppeteer = (await import(process.env.PUPPETEER_CORE
  ? path.join(process.env.PUPPETEER_CORE, 'lib/esm/puppeteer/puppeteer-core.js')
  : 'puppeteer-core')).default;
const pool = require(path.join(ROOT, 'db'));

const company = (await pool.query('SELECT id FROM companies WHERE company_code=$1', [COMPANY_CODE])).rows[0];
const project = (await pool.query(
  `SELECT id FROM projects WHERE company_id=$1 AND project_code LIKE $2 ORDER BY id DESC LIMIT 1`,
  [company.id, `${COMPANY_CODE}-PRJ-%`]
)).rows[0];
await pool.end();

if (!ONLY.length) fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=tr-TR'],
  // Headless Linux Chrome takes the date-input locale from LANG, not --lang.
  env: { ...process.env, LANG: 'tr_TR.UTF-8', LANGUAGE: 'tr' },
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
page.on('dialog', (d) => d.dismiss().catch(() => {}));
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push({ screen: current, msg: String(e.message || e).slice(0, 200) }));
let current = 'login';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(min = 500) {
  await sleep(min);
  await page.waitForNetworkIdle({ idleTime: 400, timeout: 10000 }).catch(() => {});
}
async function dismissMessage() {
  return page.evaluate(() => {
    const o = document.querySelector('#appMessageOverlay');
    if (!o || o.hidden) return null;
    const text = o.textContent.replace(/\s+/g, ' ').trim();
    closeAppMessage();
    return text;
  });
}
async function revealInMenu() {
  await page.evaluate(() => {
    const screen = findScreen(state.screenId);
    if (!screen) return;
    state.sidebarOpen = {};
    state.sidebarSectionOpen = {};
    ensureSidebarPath(screen);
    renderSidebar();
    document.querySelector(`#sidebarNav .mod-item[data-screen="${screen.id}"]`)?.scrollIntoView({ block: 'center' });
  });
}
async function shot(name) {
  const file = `${name}.jpg`;
  await page.screenshot({ path: path.join(SHOTS, file), type: 'jpeg', quality: 72 });
  return file;
}

const meta = { generatedAt: new Date().toISOString(), company: COMPANY_CODE, intro: {}, screens: [], jsErrors };

await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 90000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await settle(800);
await page.click('#userChip');
await page.waitForSelector('[data-user-action="login"]', { visible: true, timeout: 10000 });
meta.intro.userMenu = await shot('00a-oturum-menusu');
await page.click('[data-user-action="login"]');
await page.waitForSelector('#loginUser', { visible: true, timeout: 20000 });
await sleep(600);
await page.evaluate((u, p) => {
  for (const [sel, v] of [['#loginUser', u], ['#loginPass', p]]) {
    const el = document.querySelector(sel);
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, USER, PASS);
const typed = await page.$eval('#loginUser', (el) => el.value);
if (typed !== USER) throw new Error(`Kullanıcı adı alanı beklenmedik: ${typed}`);
meta.intro.login = await shot('00b-giris');
await page.click('#loginSubmit');
let loginState = null;
for (let i = 0; i < 60; i += 1) {
  await sleep(500);
  loginState = await page.evaluate(() => ({
    cls: document.body.className,
    groups: document.querySelectorAll('#sidebarNav .mod-group').length,
    err: document.querySelector('#loginError')?.textContent || '',
  })).catch(() => null);
  if (loginState && !loginState.cls.includes('is-login') && loginState.groups > 0) break;
}
if (!loginState || loginState.cls.includes('is-login')) throw new Error(`Giriş başarısız: ${JSON.stringify(loginState)}`);
await settle(1500);
meta.intro.loginMessage = await dismissMessage();
let menuOpen = false;
for (let i = 0; i < 10 && !menuOpen; i += 1) {
  await page.evaluate(() => document.querySelector('#firmaPickerBtn')?.click());
  await sleep(400);
  menuOpen = await page.evaluate(() => {
    const m = document.querySelector('#firmaPickerMenu');
    return !!m && !m.hidden && m.children.length > 0;
  });
  if (!menuOpen) await page.evaluate(() => closeCompanyPicker());
}
meta.intro.companyPicker = await shot('00c-firma-secimi');
const picked = await page.evaluate((code) => {
  const li = [...document.querySelectorAll('#firmaPickerMenu [data-firma-id], #firmaPickerMenu li')]
    .find((el) => el.textContent.includes(code) || el.textContent.includes('Süt'));
  (li?.querySelector('button') || li)?.click();
  return !!li;
}, COMPANY_CODE);
await settle(1200);
const activeId = await page.evaluate(() => state.activeFirmaId);
if (!picked || Number(activeId) !== Number(company.id)) {
  await page.evaluate((id) => localStorage.setItem('ktb_firma_id', String(id)), company.id);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelectorAll('#sidebarNav .mod-group').length > 0, { timeout: 30000, polling: 300 });
  await settle(800);
}
meta.intro.companyMessage = await dismissMessage();
meta.intro.home = await shot('01-ana-sayfa');

const screens = await page.evaluate(() => MODULES.flatMap((m) => (m.screens || []).map((s) => ({
  module: m.id,
  moduleTitle: m.title,
  section: s.section || '',
  id: s.id,
  techId: s.techId || '',
  title: s.title,
  crud: !!s.crud,
  readOnly: !!s.readOnly,
  hasProjectFilter: (s.filters || []).some((f) => f.key === 'project_id' && f.required),
}))));

const TOOL_SCREENS = {
  'tablo-bilgileri': {
    record: { code: 'stok-karti', name: 'Stok Kartı tablo/alan bilgisi' },
    run: () => loadMetaScreenDetail('stok-karti'),
  },
  'sayfa-sorgulari': {
    record: { code: 'satis-siparisleri', name: 'Satış Siparişleri sayfa sorgusu' },
    run: () => loadPageQueryDetail('satis-siparisleri'),
  },
  'sql-sorgu': {
    record: { code: 'SELECT', name: 'GIDA süt senaryosu stok kartları' },
    run: async () => {
      const ed = document.querySelector('#sqlEditor');
      ed.value = [
        'SELECT item_code, item_name, uom_code, item_type, procurement_type, quality_control_required',
        'FROM items',
        "WHERE company_id = 9 AND item_code LIKE 'TEST-SUT-%'",
        'ORDER BY item_code;',
      ].join('\n');
      ed.dispatchEvent(new Event('input', { bubbles: true }));
      await sqlRun();
    },
  },
};

let n = 0;
for (const s of screens) {
  n += 1;
  if (ONLY.length && !ONLY.includes(s.id)) continue;
  current = s.id;
  const prefix = `${String(n).padStart(3, '0')}-${s.id}`;
  const rec = { ...s, listShot: null, formShot: null, rowCount: null, record: null };
  const opts = s.hasProjectFilter && project
    ? { filterState: { project_id: { op: 'esit', a: String(project.id), b: '' } } }
    : {};
  try {
    await dismissMessage();
    await page.evaluate(() => closeAllTabs());
    await page.evaluate(async (id, o) => { await openScreen(id, o); }, s.id, opts);
    await settle(700);
    if (s.hasProjectFilter && project) {
      await dismissMessage();
      await page.evaluate(() => document.querySelector('#btnApplyFilter')?.click());
      await settle(900);
    }
    rec.listMessage = await dismissMessage();
    await revealInMenu();
    rec.rowCount = await page.evaluate(() => (state.filtered || state.rows || []).length);
    rec.listShot = await shot(`${prefix}-liste`);

    const tool = TOOL_SCREENS[s.id];
    if (tool) {
      await page.evaluate(tool.run);
      await settle(1200);
      rec.record = tool.record;
      rec.formShot = await shot(`${prefix}-kayit`);
      meta.screens.push(rec);
      process.stdout.write(`${n}/${screens.length} ${s.id} tool=${tool.record.code}\n`);
      continue;
    }

    const picked = await page.evaluate((prefer) => {
      const rows = state.filtered || [];
      if (!rows.length) return null;
      let idx = rows.findIndex((r) => prefer.some((p) => JSON.stringify(r).includes(p)));
      if (idx < 0) idx = 0;
      const r = rows[idx];
      state.selectedId = rowKey(r, idx);
      const scr = findScreen(state.screenId);
      return {
        code: r[scr?.codeField] ?? r.code ?? r.id ?? null,
        name: r[scr?.nameField] ?? null,
      };
    }, PREFER);
    if (picked && (s.crud || s.readOnly)) {
      await page.evaluate(async () => { await openForm('incele', { inPlace: true }); });
      await settle(900);
      rec.formMessage = await dismissMessage();
      const inForm = await page.evaluate(() => !!state.formMode);
      if (inForm) {
        rec.record = picked;
        rec.formShot = await shot(`${prefix}-kayit`);
      }
    }
  } catch (err) {
    rec.error = String(err.message || err).slice(0, 200);
  }
  meta.screens.push(rec);
  process.stdout.write(`${n}/${screens.length} ${s.id} rows=${rec.rowCount} form=${!!rec.formShot}\n`);
}

const shotsPath = path.join(OUT, 'shots.json');
if (!ONLY.length) {
  fs.writeFileSync(shotsPath, JSON.stringify(meta, null, 2), 'utf8');
} else if (fs.existsSync(shotsPath)) {
  const prev = JSON.parse(fs.readFileSync(shotsPath, 'utf8'));
  const fresh = new Map(meta.screens.map((r) => [r.id, r]));
  prev.screens = prev.screens.map((r) => fresh.get(r.id) || r);
  prev.jsErrors = [...(prev.jsErrors || []).filter((e) => !fresh.has(e.screen)), ...jsErrors];
  fs.writeFileSync(shotsPath, JSON.stringify(prev, null, 2), 'utf8');
}
await browser.close();
console.log(`Bitti: ${meta.screens.length} ekran, JS hata: ${jsErrors.length}`);
