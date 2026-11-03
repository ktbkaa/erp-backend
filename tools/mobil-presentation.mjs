/**
 * MOBIL sandalye firması — ekran görüntülü sunum verisi
 * Çıktı: /opt/cursor/artifacts/mobil-demo/shots/*.png + shots.json
 */
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const OUT = '/opt/cursor/artifacts/mobil-demo';
const SHOTS = `${OUT}/shots`;
mkdirSync(SHOTS, { recursive: true });
const summary = JSON.parse(readFileSync(`${OUT}/summary.json`, 'utf8'));
const BASE = 'http://127.0.0.1:3000';
const FIRMA_ID = summary.firma.id;

const slides = [
  { id: '01-login', title: 'Oturum & firma bağlamı', screen: null, note: 'Soft oturum; aktif firma MOBIL' },
  { id: '02-companies', title: 'Firma kartı', screen: 'companies', note: 'Mobilite Tekerlekli Sandalye A.Ş.' },
  { id: '03-plants', title: 'İki iş yeri', screen: 'is-yerleri', note: 'Genel Merkez + Fabrika' },
  { id: '04-warehouses', title: 'Depolar', screen: 'warehouses', note: 'GM sarf; FB giriş/GKK/hammadde/mamul/CKK' },
  { id: '05-items', title: 'Stok kartları', screen: 'stok-karti', note: 'Hammadde + mamul + sarf' },
  { id: '06-partners', title: 'Cari kartları', screen: 'cari-kartlari', note: 'Tedarikçi + müşteri' },
  { id: '07-bom', title: 'Ürün ağacı (BOM)', screen: 'urun-agaci', note: 'MS-100 bileşenleri' },
  { id: '08-routing', title: 'Rota', screen: 'routings', note: 'Montaj operasyonları' },
  { id: '09-po', title: 'Satınalma siparişleri', screen: 'satin-alma-siparisleri', note: 'Hammadde (QC) + Sarf (muaf)' },
  { id: '10-gr', title: 'Mal kabuller', screen: 'mal-kabuller', note: 'Sarf gkk_gerekli=false' },
  { id: '11-qc', title: 'Giriş kalite / KK', screen: 'giris-kontrolleri', note: 'Yalnızca hammadde' },
  { id: '12-wo', title: 'Üretim emri', screen: 'uretim-emirleri', note: 'MS-100 iş emri' },
  { id: '13-balance', title: 'Depo bakiyeleri', screen: 'depo-bakiye', note: 'Hammadde / mamul / sarf' },
  { id: '14-so', title: 'Satış siparişi', screen: 'satis-siparisleri', note: 'Hastane siparişi' },
  { id: '15-dn', title: 'İrsaliye', screen: 'irsaliye-yonetimi', note: 'Sevk irsaliyesi' },
  { id: '16-inv', title: 'Fatura', screen: 'fatura-yonetimi', note: 'Satış faturası' },
];

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,950'],
  defaultViewport: { width: 1500, height: 950 },
});
const page = await browser.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 90000 });
await page.evaluate((fid) => {
  localStorage.clear();
  localStorage.setItem('ktb_firma_id', String(fid));
  localStorage.setItem('ktb_cihaz_oturum', '1');
  localStorage.setItem('ktb_kullanici_kodu', 'ADMIN');
}, FIRMA_ID);
await page.reload({ waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForFunction(() => document.querySelectorAll('#sidebarNav .mod-group').length > 0, { timeout: 25000 });
await page.evaluate(async (fid) => {
  state.activeFirmaId = fid;
  if (typeof loadFirmalar === 'function') await loadFirmalar().catch(() => {});
  if (typeof renderFirmaPicker === 'function') renderFirmaPicker();
}, FIRMA_ID);

const results = [];
for (const s of slides) {
  const path = `${SHOTS}/${s.id}.png`;
  if (s.screen) {
    await page.evaluate(async (id) => {
      if (typeof openScreen === 'function') await openScreen(id);
    }, s.screen);
    await new Promise((r) => setTimeout(r, 1100));
  }
  const snap = await page.evaluate(() => ({
    title: document.querySelector('#screenTitle')?.textContent?.trim() || '',
    firma: document.querySelector('#firmaPickerLabel, #firmaPickerBtn')?.textContent?.trim()?.slice(0, 80) || '',
    rows: document.querySelectorAll('#viewScreen:not([hidden]) table tbody tr:not(.empty-row)').length,
  }));
  await page.screenshot({ path, fullPage: false });

  // İç form ekran görüntüsü (ilk satır Düzelt) — master ekranlarda
  let formShot = null;
  if (['companies', 'is-yerleri', 'stok-karti', 'cari-kartlari', 'urun-agaci'].includes(s.screen) && snap.rows > 0) {
    formShot = `${SHOTS}/${s.id}-form.png`;
    await page.evaluate(async () => {
      const row = document.querySelector('#viewScreen:not([hidden]) table tbody tr:not(.empty-row)[data-id]');
      if (!row) return;
      row.click();
      state.selectedId = Number(row.getAttribute('data-id'));
      if (typeof openForm === 'function') await openForm('duzelt', { inPlace: true });
    });
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: formShot, fullPage: false });
    await page.evaluate(async (id) => {
      state.formMode = null;
      if (typeof openScreen === 'function') await openScreen(id);
    }, s.screen);
    await new Promise((r) => setTimeout(r, 400));
  }

  results.push({ ...s, path, formShot, snap });
  console.log(s.id, snap.title, snap.rows);
}

writeFileSync(`${OUT}/shots.json`, JSON.stringify({ summary, results, generatedAt: new Date().toISOString() }, null, 2), 'utf8');
await browser.close();
console.log('DONE', `${OUT}/shots.json`);
