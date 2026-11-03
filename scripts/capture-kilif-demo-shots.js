/**
 * KILIF demo ekran görüntüleri (sunum PDF için)
 *   node scripts/capture-kilif-demo-shots.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.ERP_BASE || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/kilif-demo/shots';
const SUMMARY = '/opt/cursor/artifacts/kilif-demo/summary.json';

const SCREENS = [
  { id: 'companies', title: 'Firma tanımı', note: 'CaseForm (KILIF) firma kartı' },
  { id: 'is-yerleri', title: 'İş yerleri', note: 'Genel Merkez + Kılıf Fabrikası' },
  { id: 'warehouses', title: 'Depolar', note: 'Giriş / GKK / Hammadde / Mamul / CKK' },
  { id: 'stok-karti', title: 'Stok kartları', note: 'Silikon & plastik mamul + hammaddeler' },
  { id: 'cari-kartlari', title: 'Cari kartlar', note: 'Tedarikçi ve müşteri carileri' },
  { id: 'urun-agaci', title: 'Ürün ağacı (BOM)', note: 'Kılıf reçeteleri' },
  { id: 'routings', title: 'Rotalar', note: 'Enjeksiyon → baskı → paket' },
  { id: 'fiyat-listeleri', title: 'Fiyat listeleri', note: 'CaseForm Perakende 2026' },
  { id: 'crm-adaylar', title: 'CRM Adaylar', note: 'TeknoMarket adayı' },
  { id: 'crm-firsatlar', title: 'CRM Fırsatlar', note: 'Q1 silikon kılıf fırsatı' },
  { id: 'satis-teklifleri', title: 'Satış teklifleri', note: 'Süreç A — EuroCase teklifi' },
  { id: 'satis-siparisleri', title: 'Satış siparişleri', note: 'MRP’siz ve MRP’li siparişler' },
  { id: 'satin-alma-siparisleri', title: 'Satınalma siparişleri', note: 'Manuel + MRP dönüşümlü PO' },
  { id: 'satin-alma-talepleri', title: 'Satınalma talepleri', note: 'MRP’den oluşan talep' },
  { id: 'mal-kabuller', title: 'Mal kabuller', note: 'GKK’lı hammadde + sarf muaf' },
  { id: 'giris-kontrolleri', title: 'Giriş kontrolleri', note: 'Hammadde kalite kapısı' },
  { id: 'kk-emirleri', title: 'KK emirleri', note: 'GKK / CKK onayları' },
  { id: 'uretim-emirleri', title: 'Üretim emirleri', note: 'Manuel UE + MRP UE' },
  { id: 'mrp-bagimsiz-ihtiyac', title: 'MRP bağımsız ihtiyaç', note: 'Silikon kılıf BI' },
  { id: 'mrp-calisma', title: 'MRP çalışmaları', note: 'Çalıştırılmış MRP koşuları' },
  { id: 'mrp-sonuclar', title: 'MRP sonuçları', note: 'Net ihtiyaç ve öneriler' },
  { id: 'sevk-emirleri', title: 'Sevk emirleri', note: 'Mamul sevk' },
  { id: 'irsaliyeler', title: 'İrsaliyeler', note: 'e-İrsaliye alanları' },
  { id: 'satis-faturalari', title: 'Satış faturaları', note: 'Sevk sonrası fatura' },
];

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  // Zaten oturum açık olabilir
  const user = await page.$('#loginUser, input[name="username"], #username');
  if (user) {
    await page.type('#loginUser, input[name="username"], #username', 'ADMIN');
    const pass = await page.$('#loginPass, input[name="password"], #password');
    if (pass) await pass.type('admin');
    await Promise.all([
      page.click('button[type="submit"], #loginBtn, .login-btn').catch(() => {}),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    ]);
  }
  // Firma profili KILIF seç
  await page.evaluate(() => {
    try {
      const firms = (window.state && window.state.companies) || [];
      const k = firms.find((f) => f.company_code === 'KILIF');
      if (k && typeof window.setActiveFirma === 'function') {
        return window.setActiveFirma(k.id, { reload: false });
      }
      if (k) {
        localStorage.setItem('ktb_firma_id', String(k.id));
        if (window.state) window.state.activeFirmaId = k.id;
      }
    } catch (_) { /* */ }
  });
  await new Promise((r) => setTimeout(r, 800));
}

async function openScreen(page, screenId) {
  await page.evaluate((id) => {
    if (typeof window.openScreen === 'function') return window.openScreen(id);
    const el = document.querySelector(`[data-screen-id="${id}"], [data-nav="${id}"]`);
    if (el) el.click();
  }, screenId);
  await new Promise((r) => setTimeout(r, 1200));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const summary = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'));
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  await login(page);

  // Firma seçimini localStorage + reload ile garanti et
  const firmaId = summary.firma?.id;
  if (firmaId) {
    await page.evaluate((id) => {
      localStorage.setItem('ktb_firma_id', String(id));
      localStorage.setItem('ktb_kullanici_kodu', 'ADMIN');
    }, firmaId);
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
  }

  const results = [];
  for (const s of SCREENS) {
    try {
      await openScreen(page, s.id);
      const file = path.join(OUT, `${s.id}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const snap = await page.evaluate(() => ({
        title: document.querySelector('h1, .screen-title, #banner, .erp-screen-title')?.textContent?.trim() || document.title,
        rows: document.querySelectorAll('#dataBody tr, .data-table tbody tr, table.yetki-table tbody tr').length,
      }));
      results.push({ ...s, screen: s.id, path: file, snap, ok: true });
      console.log('OK', s.id);
    } catch (err) {
      results.push({ ...s, screen: s.id, path: null, ok: false, error: err.message });
      console.log('FAIL', s.id, err.message);
    }
  }

  const shotsJson = path.join('/opt/cursor/artifacts/kilif-demo', 'shots.json');
  fs.writeFileSync(shotsJson, JSON.stringify({ summary, results, generatedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('Yazıldı:', shotsJson, 'adet=', results.filter((r) => r.ok).length);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
