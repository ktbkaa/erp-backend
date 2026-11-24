/**
 * Metal Marvel simülasyon raporu (UTF-8 PDF)
 *   node scripts/build-metal-marvel-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'docs', 'metal-marvel');
const SHOTS = path.join(DIR, 'screenshots');
const OUT_PDF = path.join(DIR, 'metal-marvel-sim-rapor.pdf');
const OUT_HTML = path.join(DIR, 'metal-marvel-sim-rapor.html');
const ARTIFACT = '/opt/cursor/artifacts/metal-marvel-sim-rapor.pdf';

const ozet = JSON.parse(fs.readFileSync(path.join(DIR, 'evidence', 'marvel-sim-ozet.json'), 'utf8'));

function img(file) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) return '';
  const b64 = fs.readFileSync(p).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}" alt="${file}"/><figcaption>${file}</figcaption></figure>`;
}

const STEPS = [
  {
    title: 'Firma ve organizasyon',
    note: `${ozet.firma?.name} (${ozet.firma?.code}) · Gebze fabrika · döküm + CNC hatları`,
    images: ['00-firma-picker.png', '20-depolar.png'],
  },
  {
    title: 'Sicil / İK personel kartı (detaylı)',
    note: `Beyaz yaka ${ozet.hr?.counts?.hr?.BeyazYaka || 120}, mavi yaka ${ozet.hr?.counts?.hr?.MaviYaka || 400}. Departman başına 2 beyaz yaka; ERP kullanıcıları sınırlı.`,
    images: ['01-hr-personel.png', '01b-hr-personel-form.png', '02-hr-departmanlar.png'],
  },
  {
    title: 'Lisans altyapısı',
    note: 'Enterprise lisans + firma koltuk ataması (named seats).',
    images: ['03-lisanslar.png', '03b-firma-lisans.png'],
  },
  {
    title: 'Master: stok / BOM / cari',
    note: `Stoklar: ${(ozet.master?.items || []).join(', ')}`,
    images: ['04-stok.png', '04b-stok-form.png', '05-bom.png', '06-cari.png'],
  },
  {
    title: 'Hafta 1 — CRM → satış → satınalma',
    note: 'CRM aday/fırsat, satış teklifi+sipariş (master depo), direkt PO (ambalaj) ve talep→teklif→PO (alaşım), mal kabul.',
    images: ['07-crm-aday.png', '08-satis-teklif.png', '09-satis-siparis.png', '09b-satis-siparis-form.png', '10-sa-talep.png', '11-sa-siparis.png', '12-mal-kabul.png'],
  },
  {
    title: 'Hafta 2 — Üretim / proje / kalibrasyon',
    note: 'Döküm + CNC üretim emirleri, kalıp tooling projesi, ölçüm cihazı kalibrasyonu.',
    images: ['13-uretim.png', '13b-uretim-form.png', '14-proje.png', '15-kk-cihaz.png', '16-kk-kalibrasyon.png'],
  },
  {
    title: 'Hafta 3 — Sevk, fatura, İK, CAPA',
    note: 'İrsaliye/fatura, işe alım, bordro, NCR/CAPA, MRP.',
    images: ['17-kk-capa.png', '18-irsaliye.png', '19-fatura.png'],
  },
];

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Metal Marvel Simülasyon Raporu</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "DejaVu Sans", "Segoe UI", sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.45; }
  h1 { font-size: 20pt; margin: 0 0 6px; }
  h2 { font-size: 14pt; margin: 22px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .sub { color: #555; margin-bottom: 18px; }
  .meta { background: #f5f7fa; padding: 10px 12px; border-radius: 6px; margin-bottom: 16px; }
  .meta code { background: #e8ecf1; padding: 1px 4px; border-radius: 3px; }
  figure { margin: 10px 0 16px; page-break-inside: avoid; }
  img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
  figcaption { font-size: 9pt; color: #666; margin-top: 4px; }
  ul { margin: 6px 0 12px 18px; }
  .footer { margin-top: 28px; font-size: 9pt; color: #777; }
</style>
</head>
<body>
  <h1>Metal Marvel Figür Sanayi — ERP Simülasyon Raporu</h1>
  <p class="sub">UTF-8 · Orta-büyük ölçekli döküm + CNC süperkahraman figür firması · 3 haftalık süreç</p>

  <div class="meta">
    <div><strong>Firma:</strong> ${ozet.firma?.name || ''} (<code>${ozet.firma?.code || ''}</code> · id ${ozet.firma?.id || ''})</div>
    <div><strong>İK:</strong> Beyaz yaka ${ozet.hr?.counts?.hr?.BeyazYaka || '—'} · Mavi yaka ${ozet.hr?.counts?.hr?.MaviYaka || '—'}</div>
    <div><strong>Departmanlar:</strong> ${(ozet.hr?.departments || []).join(', ')}</div>
    <div><strong>ERP kullanıcıları:</strong> ${Object.keys(ozet.users || {}).join(', ')}</div>
    <div><strong>Şifre (demo):</strong> <code>Demo123!</code></div>
    <div><strong>Hata sayısı:</strong> ${(ozet.errors || []).length}</div>
  </div>

  <h2>Kapsam özeti</h2>
  <ul>
    <li>Sicil ekranı: yaka tipi, eğitim, kart no, lokasyon, SGK, bordro grubu vb. alanlar</li>
    <li>Lisans: sistem lisansı + firma koltuk / modül ataması</li>
    <li>Kalite kalibrasyon: ölçüm cihazı + kalibrasyon kayıtları</li>
    <li>Satış/satınalma: master depo; talep+teklif ve direkt sipariş yolları</li>
    <li>Üretim döküm + CNC, proje iş paketleri, İK işe alım/izin/puantaj/bordro</li>
  </ul>

  <h2>Süreç belgeleri</h2>
  <ul>
    <li>W1: ${Object.keys(ozet.week1 || {}).join(', ') || '—'}</li>
    <li>W2: ${Object.keys(ozet.week2 || {}).join(', ') || '—'}</li>
    <li>W3: ${Object.keys(ozet.week3 || {}).join(', ') || '—'}</li>
  </ul>

  ${STEPS.map((s) => `
    <h2>${s.title}</h2>
    <p>${s.note}</p>
    ${s.images.map(img).join('\\n')}
  `).join('\\n')}

  <p class="footer">Oluşturulma: ${new Date().toISOString()} · scripts/demo-metal-marvel-sim.js · scripts/capture-metal-marvel-shots.js</p>
</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, 'utf8');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
  });
  await browser.close();
  fs.mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  fs.copyFileSync(OUT_PDF, ARTIFACT);
  console.log(JSON.stringify({ pdf: OUT_PDF, artifact: ARTIFACT, html: OUT_HTML }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
