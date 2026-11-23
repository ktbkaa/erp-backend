#!/usr/bin/env node
/**
 * Demo Firma A.Ş. sunum dokümanı → UTF-8 PDF (Chrome headless)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const IMG = '/opt/cursor/artifacts/sunum-ekranlar';
const OUT_HTML = '/opt/cursor/artifacts/demo-firma-sunum.html';
const OUT_PDF = '/opt/cursor/artifacts/demo-firma-sunum.pdf';
const OUT_MD = '/opt/cursor/artifacts/demo-firma-sunum.md';
const NOW = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

function img(file, caption) {
  const p = path.join(IMG, file);
  if (!fs.existsSync(p)) {
    return `<p class="missing">[Görsel yok: ${file}]</p>`;
  }
  const b64 = fs.readFileSync(p).toString('base64');
  return `
  <figure>
    <img src="data:image/png;base64,${b64}" alt="${caption.replace(/"/g, '&quot;')}" />
    <figcaption>${caption}</figcaption>
  </figure>`;
}

const sections = [
  {
    h: '3.1 CRM — Pipeline ve faaliyet',
    intro: 'Aday → fırsat → faaliyet zinciri Demo Firma A.Ş. için doldurulmuştur.',
    shots: [
      ['crm-adaylar.png', 'Müşteri Adayları — AD00005 ve diğer DEMO adayları'],
      ['crm-firsatlar.png', 'Fırsatlar — FS00005 (sunum fırsatı) ve önceki kayıtlar'],
      ['crm-faaliyetler.png', 'Faaliyetler — planlanan / tamamlanan ziyaretler'],
    ],
  },
  {
    h: '3.2 Satış süreci',
    intro: 'Teklif siparişe dönüştükten sonra listede Kapalı olarak kalır. Siparişte sağ tık → Teklife git.',
    shots: [
      ['satis-teklifleri.png', 'Satış Teklifleri — ST00005 durumu Kapalı'],
      ['satis-siparisleri.png', 'Satış Siparişleri — B00010 (tekliften)'],
      ['siparis-sag-tik.png', 'Sağ tık menüsü — «Teklife git»'],
      ['sevk-emirleri.png', 'Sevk Emirleri'],
      ['irsaliyeler.png', 'İrsaliyeler'],
      ['satis-faturalari.png', 'Satış Faturaları'],
      ['tahsilat-odemeler.png', 'Tahsilat / Ödeme'],
    ],
  },
  {
    h: '3.3 Satınalma süreci',
    intro: 'RFQ → teklif → anlaşma → sipariş → mal kabul. Dönüşen SA teklif Kapalı kalır.',
    shots: [
      ['satin-alma-teklifleri.png', 'Satınalma Teklifleri — QF00005 Kapalı'],
      ['satin-alma-anlasmalari.png', 'Satınalma Anlaşmaları'],
      ['satin-alma-siparisleri.png', 'Satınalma Siparişleri'],
      ['mal-kabuller.png', 'Mal Kabuller'],
    ],
  },
  {
    h: '3.4 Kalite (GKK / ÇKK)',
    intro: 'Giriş ve çıkış kalite emirleri, uygunsuzluk kayıtları DEMO için doludur.',
    shots: [
      ['kk-emirleri-gkk.png', 'GKK Emirleri'],
      ['kk-emirleri-ckk.png', 'ÇKK Emirleri — QE00007'],
      ['kk-uygunsuzluklar.png', 'KK Uygunsuzluklar'],
    ],
  },
  {
    h: '3.5 Üretim, MRP ve stok',
    intro: 'Ürün ağacı, üretim emri, MRP çalışması, depo bakiye ve transfer.',
    shots: [
      ['uretim-emirleri.png', 'Üretim Emirleri'],
      ['urun-agaci.png', 'Ürün Ağacı (BOM)'],
      ['mrp-calisma.png', 'MRP Çalıştır / çalışmalar'],
      ['depo-bakiye.png', 'Depo Bakiye'],
      ['transfer-emirleri.png', 'Transfer Emirleri'],
    ],
  },
  {
    h: '3.6 Finans',
    intro: 'Fiyat listeleri, muhasebe belgeleri.',
    shots: [
      ['fiyat-listeleri.png', 'Fiyat Listeleri'],
      ['muhasebe-belgeleri.png', 'Muhasebe Belgeleri'],
    ],
  },
];

let bodySections = '';
for (const s of sections) {
  bodySections += `<h2>${s.h}</h2><p>${s.intro}</p>`;
  for (const [f, cap] of s.shots) bodySections += img(f, cap);
}

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Demo Firma A.Ş. — Sistem Sunum Dokümanı</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", "Noto Sans", "Segoe UI", Arial, sans-serif;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.45;
    margin: 0;
    padding: 0;
  }
  h1 { font-size: 20pt; margin: 0 0 8px; color: #0f3d2e; }
  h2 { font-size: 14pt; margin: 22px 0 8px; color: #145c45; border-bottom: 1px solid #c5ddd2; padding-bottom: 4px; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 14px 0 6px; color: #1e4d3a; page-break-after: avoid; }
  p, li { margin: 6px 0; }
  .meta { color: #444; font-size: 10pt; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0 14px; font-size: 10pt; }
  th, td { border: 1px solid #c8d5ce; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #e8f3ee; }
  code, pre { font-family: "DejaVu Sans Mono", Consolas, monospace; font-size: 9.5pt; }
  pre { background: #f4f7f5; border: 1px solid #d7e3dc; padding: 10px; overflow: hidden; }
  figure { margin: 10px 0 18px; page-break-inside: avoid; }
  figure img {
    width: 100%;
    max-height: 210mm;
    object-fit: contain;
    border: 1px solid #cfd8d3;
    border-radius: 4px;
    background: #fff;
  }
  figcaption { font-size: 9.5pt; color: #444; margin-top: 4px; }
  .cover { margin-bottom: 18px; }
  .badge { display: inline-block; background: #145c45; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 9pt; }
  .note { background: #fff8e6; border-left: 3px solid #e0b400; padding: 8px 10px; margin: 10px 0; }
  .missing { color: #a00; }
  ul { padding-left: 18px; }
</style>
</head>
<body>
<div class="cover">
  <h1>Demo Firma A.Ş. — Sistem Sunum Dokümanı</h1>
  <p class="meta">
    <span class="badge">DEMO</span>
    Oluşturulma: ${NOW} (Europe/Istanbul)<br/>
    Kapsam: Tüm kritik ekranların dolu veri ile gösterimi; dönüşen belgelerin Kapalı kalması; sağ tık → Kaynağına git.<br/>
    Giriş: kagantalha.b / Demo123! — Firma seçimi: <strong>Demo Firma A.Ş.</strong>
  </p>
</div>

<h2>1. Sunumda düzeltilen davranışlar</h2>

<h3>1.1 Dönüşen belgeler silinmez — durum Kapalı</h3>
<p>
Satış teklifi → sipariş, satınalma teklifi → sipariş, SA talep → sipariş, sevk → irsaliye,
irsaliye → fatura dönüşümlerinde kaynak kayıt <strong>listede kalır</strong>, durum <strong>Kapalı</strong> olur.
</p>
<table>
  <thead><tr><th>Belge</th><th>No</th><th>Durum</th><th>Sonraki belge</th></tr></thead>
  <tbody>
    <tr><td>Satış teklifi</td><td>ST00005</td><td>Kapalı</td><td>B00010 sipariş</td></tr>
    <tr><td>SA teklif</td><td>QF00005</td><td>Kapalı</td><td>P00010 sipariş</td></tr>
  </tbody>
</table>

<h3>1.2 Sağ tık → Kaynağına git</h3>
<ul>
  <li>Sipariş ve diğer belge listelerinde satıra sağ tık menüsü açılır.</li>
  <li><code>teklif_id</code>, <code>kaynak_belge_tipi</code> + <code>kaynak_belge_id</code>, <code>siparis_id</code>, <code>firsat_id</code> alanlarından kaynak çözülür.</li>
  <li>Hedef ekran açılır ve ilgili kayıt seçilir (ör. «Teklife git»).</li>
</ul>

<h3>1.3 Firma filtresi</h3>
<p>
<code>X-Firma-Id</code> ile listeler <code>firma_id</code> veya iş yeri üzerinden DEMO kayıtlarını gösterir.
Eski boş <code>firma_id</code> kayıtları backfill edildi. Sunumda mutlaka <strong>Demo Firma A.Ş.</strong> seçili olmalıdır
(GIDA seçiliyse DEMO kayıtları görünmez).
</p>

<h2>2. Modül özeti (DEMO doldurulmuş)</h2>
<table>
  <thead><tr><th>Modül</th><th>Ekranlar / örnek kayıt</th></tr></thead>
  <tbody>
    <tr><td>CRM</td><td>Aday AD00005, Fırsat FS00005, Kontak, Faaliyet, Plan, Görev</td></tr>
    <tr><td>Satış</td><td>Teklif ST00005 (Kapalı), Sipariş B00010, Sevk, İrsaliye, Fatura, Tahsilat</td></tr>
    <tr><td>Satınalma</td><td>RFQ, Teklif QF00005 (Kapalı), Anlaşma, Talep, Sipariş P00010, Mal kabul</td></tr>
    <tr><td>Stok</td><td>Bakiye, Hareket, Transfer, Sayım, Parti, Seri, İkame</td></tr>
    <tr><td>Kalite</td><td>GKK + ÇKK QE00007, Uygunsuzluk, CAPA, Plan, Stok-plan</td></tr>
    <tr><td>Üretim</td><td>BOM, Rota, Plan, Emir, Giriş</td></tr>
    <tr><td>MRP</td><td>Bağımsız ihtiyaç, Çalışma, Sonuçlar</td></tr>
    <tr><td>Finans</td><td>Fiyat listesi, Döviz, Muhasebe mahsup</td></tr>
  </tbody>
</table>

<div class="note">
  Aşağıdaki ekran görüntüleri canlı sistemden alınmıştır (firma: DEMO / IY-001).
  Her görsel sunumda ilgili süreci kanıtlar.
</div>

${bodySections}

<h2>4. Çalıştırma</h2>
<pre># Veri doldur
node scripts/demo-firma-sunum-doldur.js

# Ekran görüntüleri
node scripts/sunum-ekran-goruntuleri.js

# PDF üret
node scripts/build-sunum-pdf.js
</pre>
<p>Giriş: <code>kagantalha.b</code> / <code>Demo123!</code> — firma: <strong>Demo Firma A.Ş.</strong></p>

<h2>5. Teknik değişiklikler</h2>
<table>
  <thead><tr><th>Dosya</th><th>Değişiklik</th></tr></thead>
  <tbody>
    <tr><td>routes/satis_teklifleri.js</td><td>Dönüşüm → Kapali; firma_id; liste firma/is_yeri</td></tr>
    <tr><td>routes/satin_alma_teklifleri.js</td><td>Dönüşüm → Kapali</td></tr>
    <tr><td>routes/satin_alma_siparisleri.js</td><td>Talep dönüşüm → Kapali</td></tr>
    <tr><td>routes/irsaliyeler.js</td><td>Sevk/irsaliye kaynak → Kapali</td></tr>
    <tr><td>routes/crm_firsatlar.js</td><td>firma_id kayıt + liste</td></tr>
    <tr><td>routes/_belgeCrud.js</td><td>Liste firma/is_yeri</td></tr>
    <tr><td>public/app.js</td><td>Genel sağ tık «Kaynağına git»</td></tr>
    <tr><td>scripts/demo-firma-sunum-doldur.js</td><td>DEMO tüm ekran seed</td></tr>
    <tr><td>scripts/sunum-ekran-goruntuleri.js</td><td>Ekran görüntüsü otomasyonu</td></tr>
    <tr><td>scripts/build-sunum-pdf.js</td><td>UTF-8 PDF üretimi</td></tr>
  </tbody>
</table>

<p style="margin-top:24px;color:#666;font-size:9.5pt;">
Bu doküman sunum amaçlıdır. Kodlama: UTF-8. PDF Chrome headless ile üretilmiştir.
</p>
</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, 'utf8');

// Markdown mirror (eksiksiz metin)
const md = `# Demo Firma A.Ş. — Sistem Sunum Dokümanı

**Oluşturulma:** ${NOW} (Europe/Istanbul)  
**Firma:** Demo Firma A.Ş. (\`DEMO\`)  
**Kodlama:** UTF-8  
**PDF:** \`/opt/cursor/artifacts/demo-firma-sunum.pdf\`

## 1. Düzeltilen davranışlar
- Dönüşen belgeler silinmez → durum **Kapalı** (ST00005, QF00005)
- Sağ tık → **Kaynağına git / Teklife git**
- Firma filtresi DEMO kayıtlarını gösterir

## 2. Modül özeti
CRM, Satış, Satınalma, Stok, Kalite (GKK+ÇKK), Üretim, MRP, Finans doldurulmuştur.

## 3. Ekran görüntüleri
Tüm görseller PDF içinde gömülüdür. Kaynak klasör: \`/opt/cursor/artifacts/sunum-ekranlar/\`

## 4. Çalıştırma
\`\`\`bash
node scripts/demo-firma-sunum-doldur.js
node scripts/sunum-ekran-goruntuleri.js
node scripts/build-sunum-pdf.js
\`\`\`
`;
fs.writeFileSync(OUT_MD, md, 'utf8');
fs.writeFileSync(path.join(__dirname, '../docs/system/demo-firma-sunum.md'), md, 'utf8');

console.log('HTML yazıldı:', OUT_HTML);

try {
  execFileSync('/usr/local/bin/google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-pdf-header-footer',
    `--print-to-pdf=${OUT_PDF}`,
    '--print-to-pdf-no-header',
    `file://${OUT_HTML}`,
  ], { stdio: 'inherit', timeout: 300000 });
} catch (err) {
  // Chrome bazen PDF yazdıktan sonra process kapanırken ETIMEDOUT verebilir
  if (!fs.existsSync(OUT_PDF) || fs.statSync(OUT_PDF).size < 50_000) {
    throw err;
  }
  console.warn('Chrome uyarı/timeout (PDF mevcut, devam):', err.code || err.message);
}

const st = fs.statSync(OUT_PDF);
console.log('PDF yazıldı:', OUT_PDF, `(${Math.round(st.size / 1024)} KB)`);
console.log('UTF-8 check:', fs.readFileSync(OUT_HTML, 'utf8').includes('Kapalı') ? 'OK' : 'FAIL');
