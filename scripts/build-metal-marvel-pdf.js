/**
 * Metal Marvel — ayrıntılı UTF-8 süreç raporu (PDF)
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
const ids = JSON.parse(fs.readFileSync(path.join(DIR, 'evidence', 'shot-ids.json'), 'utf8'));

function img(file, caption) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) {
    return `<p class="missing">[Ekran görüntüsü yok: ${file}]</p>`;
  }
  const b64 = fs.readFileSync(p).toString('base64');
  return `<figure>
    <img src="data:image/png;base64,${b64}" alt="${file}"/>
    <figcaption>${caption || file}</figcaption>
  </figure>`;
}

function imgs(pairs) {
  return pairs.map(([f, c]) => img(f, c)).join('\n');
}

function bel(obj, field = 'order_no') {
  if (!obj) return '—';
  if (typeof obj === 'object') return obj[field] || obj.requisition_no || obj.quotation_no || obj.receipt_no || obj.invoice_no || obj.delivery_note_no || obj.capa_no || obj.calibration_no || obj.instrument_code || obj.project_code || obj.employee_no || obj.license_code || obj.run_no || `#${obj.id}`;
  return String(obj);
}

const users = ozet.users || {};
const w1 = ozet.week1 || {};
const w2 = ozet.week2 || {};
const w3 = ozet.week3 || {};

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Metal Marvel — Ayrıntılı ERP Simülasyon Raporu</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: "DejaVu Sans", "Segoe UI", Tahoma, sans-serif; color: #1a1a1a; font-size: 10.5pt; line-height: 1.45; }
  h1 { font-size: 18pt; margin: 0 0 4px; }
  h2 { font-size: 13pt; margin: 22px 0 8px; border-bottom: 2px solid #2c5282; padding-bottom: 4px; color: #1a365d; page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; color: #2d3748; page-break-after: avoid; }
  .sub { color: #4a5568; margin-bottom: 14px; }
  .meta, .box { background: #f7fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 6px; margin: 10px 0 14px; }
  .box.warn { background: #fffaf0; border-color: #fbd38d; }
  .box.ok { background: #f0fff4; border-color: #9ae6b4; }
  code, .mono { font-family: ui-monospace, Consolas, monospace; background: #edf2f7; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.5pt; }
  th, td { border: 1px solid #cbd5e0; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #edf2f7; }
  figure { margin: 8px 0 14px; page-break-inside: avoid; }
  img { max-width: 100%; border: 1px solid #cbd5e0; border-radius: 4px; }
  figcaption { font-size: 8.5pt; color: #718096; margin-top: 3px; }
  ol.steps > li { margin-bottom: 8px; }
  .who { color: #2b6cb0; font-weight: 600; }
  .missing { color: #c53030; font-size: 9pt; font-style: italic; }
  .footer { margin-top: 24px; font-size: 8.5pt; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  ul { margin: 6px 0 10px 18px; }
</style>
</head>
<body>

<h1>Metal Marvel Figür Sanayi A.Ş. — Ayrıntılı ERP Simülasyon Raporu</h1>
<p class="sub">UTF-8 · Orta-büyük ölçek (≈120 beyaz / 400 mavi yaka) · Döküm + CNC süperkahraman figürleri · 3 haftalık süreç (MMARVEL-W1/W2/W3)</p>

<div class="meta">
  <div><strong>Firma:</strong> ${ozet.firma?.name || ''} (<code>${ozet.firma?.code || 'MARVEL'}</code> · id ${ozet.firma?.id || ''})</div>
  <div><strong>Tesis:</strong> Gebze Fabrika (<code>MARVEL-GEBZE</code>)</div>
  <div><strong>İK:</strong> Beyaz yaka ${ozet.hr?.counts?.hr?.BeyazYaka ?? 120} · Mavi yaka ${ozet.hr?.counts?.hr?.MaviYaka ?? 400}</div>
  <div><strong>Departmanlar (${(ozet.hr?.departments || []).length}):</strong> ${(ozet.hr?.departments || []).join(', ')}</div>
  <div><strong>ERP kullanıcıları:</strong> ${Object.keys(users).join(', ') || '—'}</div>
  <div><strong>Demo şifre:</strong> <code>Demo123!</code></div>
  <div><strong>Simülasyon hataları:</strong> ${(ozet.errors || []).length}</div>
  <div><strong>Rapor üretimi:</strong> ${new Date().toISOString()}</div>
</div>

<h2>1. Amaç ve kurgu değerlendirmesi</h2>
<p>Bu rapor, ERP’nin gerçek orta-büyük ölçekli bir metal figür üreticisinde uçtan uca kullanılabilirliğini kanıtlamak için hazırlanmıştır. Firma hem <strong>döküm</strong> (Iron Man / Thor / Hulk) hem <strong>CNC</strong> (Spider-Man / Black Panther / Captain America) hatlarını işletir; her departmanın kendi ERP kullanıcısı kendi belgesini oluşturur.</p>
<div class="box ok">
  <strong>Yeterli omurga:</strong> firma/çoklu depo, stok-BOM-rota, CRM→satış (master depo), satınalma (direkt PO + talep/teklif/PO), mal kabul, üretim (2 hat), proje, kalibrasyon, İK (sicil/ilan/aday/bordro), lisans.
</div>
<div class="box warn">
  <strong>Açık gap’ler (simülasyonda görülen):</strong>
  <ul>
    <li>GKK onayında lot’lu bakiye / lotsuz çıkış engeli (BUG-008) — tam GKK kapanışı atlandı.</li>
    <li>SA &gt;50K onay rotası tetiklenirken bazı adımlarda <code>screen_id/rule_id/route_id</code> eksik uyarısı.</li>
    <li>W3 irsaliye/fatura/CAPA kayıtları özetten kısmen boş kaldı (liste ekranları çekildi; form id yoksa atlandı).</li>
  </ul>
</div>

<h2>2. Organizasyon, lisans ve sicil</h2>
<h3>2.1 Tesis ve depolar</h3>
<p>Gebze fabrikasında mal kabul girişi, hammadde, döküm WIP, CNC WIP, mamul, GKK, CKK ve sevk depoları tanımlandı. İş merkezleri: <code>MM-DOKUM-01</code>, <code>MM-CNC-01</code>, <code>MM-BOYAMA</code>.</p>
${imgs([
  ['00-firma-picker.png', 'Firma profilleri — MARVEL seçimi'],
  ['00b-depolar.png', 'Depo listesi'],
  ['00c-is-merkezleri.png', 'İş merkezleri'],
  ['00d-is-merkezi-form.png', `İş merkezi formu — ${bel(ids.wc, 'center_code')}`],
])}

<h3>2.2 Lisans altyapısı</h3>
<p>Enterprise lisans <code>${bel(ids.license)}</code> oluşturulup firmaya 40 adlı koltuk ile atandı. Modüller: stok, satış, satınalma, üretim, MRP, kalite, İK, proje, CRM, finans, onay.</p>
${imgs([
  ['02-lisanslar.png', 'Sistem lisansları listesi'],
  ['02b-lisans-form.png', `Lisans kartı — ${bel(ids.license)}`],
  ['02c-firma-lisans.png', 'Firma lisans atamaları'],
])}

<h3>2.3 Sicil / İK personel kartı</h3>
<p>Her departmanda 2 beyaz yaka (biri ERP kullanıcılı); ek ~88 ofis personeli kullanıcı hesabı olmadan; ~400 mavi yaka döküm/CNC operatörü. Sicil ekranında yaka tipi, kart no, eğitim, lokasyon, sendika, bordro grubu vb. alanlar kullanılır.</p>
${imgs([
  ['01-hr-departmanlar.png', 'Departmanlar'],
  ['01b-hr-departman-form.png', `Departman — ${bel(ids.dept, 'department_name')}`],
  ['01c-hr-personel.png', 'Personel kartları listesi (sicil)'],
  ['01d-hr-personel-form.png', `Sicil formu — ${bel(ids.emp)} ${ids.emp?.first_name || ''} ${ids.emp?.last_name || ''}`],
])}

<h2>3. Master veri (ürün / BOM / rota / cari)</h2>
<p>13 stok kartı (alaşım, reçine, boya, kutu, CNC blok; yarı mamul; 6 mamul figür), 2 BOM + 2 rota, 5 cari (3 tedarikçi / 2 müşteri), satış fiyat listesi.</p>
${imgs([
  ['03-stok.png', 'Stok kartı listesi'],
  ['03b-stok-ironman.png', `Mamul döküm — ${bel(ids.item, 'item_code')} ${ids.item?.item_name || ''}`],
  ['03c-stok-spiderman.png', `Mamul CNC — ${bel(ids.itemCnc, 'item_code')}`],
  ['03d-bom.png', 'Ürün ağacı listesi'],
  ['03e-bom-form.png', `BOM — ${bel(ids.bom, 'bom_code')}`],
  ['03f-rota.png', 'Rota listesi'],
  ['03g-rota-form.png', `Rota — ${bel(ids.route, 'route_code')}`],
  ['03h-cari.png', 'Cari listesi'],
  ['03i-cari-musteri.png', `Müşteri — ${bel(ids.partnerMus, 'partner_name')}`],
  ['03j-cari-tedarikci.png', `Tedarikçi — ${bel(ids.partnerTed, 'partner_name')}`],
])}

<h2>4. Hafta 1 — CRM → satış → satınalma → mal kabul (MMARVEL-W1)</h2>
<p>Tarih aralığı: 3–10 Kasım 2026. Amaç: koleksiyon müşterisinden sipariş almak; ambalajı direkt PO ile, alaşımı talep/teklif zinciriyle tedarik etmek.</p>

<table>
  <tr><th>Adım</th><th>Kullanıcı</th><th>Ekran</th><th>Belge</th></tr>
  <tr><td>1. CRM aday</td><td class="who">marvel.satis</td><td>crm-adaylar</td><td>${bel(ids.lead, 'lead_name')}</td></tr>
  <tr><td>2. CRM fırsat</td><td class="who">marvel.satis</td><td>crm-firsatlar</td><td>${bel(ids.opp, 'opportunity_name')}</td></tr>
  <tr><td>3. Satış teklifi</td><td class="who">marvel.satis</td><td>satis-teklifleri</td><td>${bel(ids.sq, 'quotation_no')}</td></tr>
  <tr><td>4. Satış siparişi (master depo)</td><td class="who">marvel.satis</td><td>satis-siparisleri</td><td>${bel(ids.so)} · mamul depo</td></tr>
  <tr><td>5. Direkt SA sipariş (ambalaj)</td><td class="who">marvel.sa</td><td>satin-alma-siparisleri</td><td>${bel(ids.poDirect)} — talep/teklif yok</td></tr>
  <tr><td>6. SA talep</td><td class="who">marvel.sa</td><td>satin-alma-talepleri</td><td>${bel(ids.req, 'requisition_no')}</td></tr>
  <tr><td>7. RFQ</td><td class="who">marvel.sa</td><td>satin-alma-teklif-istekleri</td><td>#${ids.rfq?.id || '—'}</td></tr>
  <tr><td>8. SA teklif</td><td class="who">marvel.sa</td><td>satin-alma-teklifleri</td><td>${bel(ids.pq, 'quotation_no')}</td></tr>
  <tr><td>9. SA sipariş (alaşım)</td><td class="who">marvel.sa</td><td>satin-alma-siparisleri</td><td>${bel(ids.poAlloy)} · ~168.000 TL</td></tr>
  <tr><td>10. Mal kabul</td><td class="who">marvel.sa / depo</td><td>mal-kabuller</td><td>${bel(ids.gr, 'receipt_no')} · giriş depo</td></tr>
</table>

<ol class="steps">
  <li><span class="who">marvel.satis</span> Kaplan Koleksiyon adayını açtı; fırsata dönüştürdü (beklenen ciro ~420.000 TL).</li>
  <li>Aynı kullanıcı satış teklifi <code>${bel(ids.sq, 'quotation_no')}</code> ve ardından satış siparişi <code>${bel(ids.so)}</code> girdi. <strong>Depo master’da</strong> (MARVEL-MAM); satırda depo yok.</li>
  <li><span class="who">marvel.sa</span> ambalaj için <em>direkt</em> PO <code>${bel(ids.poDirect)}</code> kesti (talep/teklif atlandı).</li>
  <li>Zn-Al alaşım için talep <code>${bel(ids.req, 'requisition_no')}</code> → RFQ → tedarikçi teklifi <code>${bel(ids.pq, 'quotation_no')}</code> → PO <code>${bel(ids.poAlloy)}</code> zinciri işletildi.</li>
  <li>Mal kabul <code>${bel(ids.gr, 'receipt_no')}</code> giriş deposuna yapıldı. GKK’da lot zorunluluğu nedeniyle otomatik onay atlandı (gap).</li>
</ol>

${imgs([
  ['10-crm-aday.png', 'CRM aday listesi'],
  ['10b-crm-aday-form.png', 'CRM aday formu'],
  ['10c-crm-firsat.png', 'CRM fırsat listesi'],
  ['10d-crm-firsat-form.png', 'CRM fırsat formu'],
  ['11-satis-teklif.png', 'Satış teklifleri'],
  ['11b-satis-teklif-form.png', `Teklif ${bel(ids.sq, 'quotation_no')}`],
  ['12-satis-siparis.png', 'Satış siparişleri'],
  ['12b-satis-siparis-form.png', `Sipariş ${bel(ids.so)} — master depo`],
  ['13-sa-talep.png', 'SA talepleri'],
  ['13b-sa-talep-form.png', `Talep ${bel(ids.req, 'requisition_no')}`],
  ['13c-sa-rfq.png', 'Teklif istekleri (RFQ)'],
  ['13d-sa-rfq-form.png', 'RFQ formu'],
  ['13e-sa-teklif.png', 'SA teklifleri'],
  ['13f-sa-teklif-form.png', `SA teklif ${bel(ids.pq, 'quotation_no')}`],
  ['14-sa-siparis.png', 'SA sipariş listesi'],
  ['14b-sa-siparis-direkt.png', `Direkt PO ${bel(ids.poDirect)}`],
  ['14c-sa-siparis-alasim.png', `Alaşım PO ${bel(ids.poAlloy)}`],
  ['15-mal-kabul.png', 'Mal kabuller'],
  ['15b-mal-kabul-form.png', `Mal kabul ${bel(ids.gr, 'receipt_no')}`],
  ['15c-gkk.png', 'Giriş kalite emirleri'],
  ['15d-gkk-form.png', 'GKK emri formu'],
])}

<h2>5. Hafta 2 — Üretim, proje, kalibrasyon (MMARVEL-W2)</h2>
<p>Tarih aralığı: 10–15 Kasım 2026. Amaç: satış siparişine bağlı döküm + CNC üretim; kalıp yatırımı projesi; metroloji kalibrasyonu.</p>

<table>
  <tr><th>Adım</th><th>Kullanıcı</th><th>Ekran</th><th>Belge</th></tr>
  <tr><td>1. Üretim emri döküm</td><td class="who">marvel.uretim.dokum</td><td>uretim-emirleri</td><td>${bel(ids.woDok)} · Iron Man ×100</td></tr>
  <tr><td>2. Üretim emri CNC</td><td class="who">marvel.uretim.cnc</td><td>uretim-emirleri</td><td>${bel(ids.woCnc)} · Spider-Man ×40</td></tr>
  <tr><td>3. CKK</td><td class="who">marvel.kalite</td><td>kk-emirleri-ckk</td><td>${bel(ids.ckk, 'order_no')}</td></tr>
  <tr><td>4. Proje</td><td class="who">marvel.proje</td><td>prj-projeler</td><td>${bel(ids.project, 'project_code')}</td></tr>
  <tr><td>5. İş paketleri</td><td class="who">marvel.proje → arge/dokum/kalite/sa</td><td>prj-isler</td><td>${bel(ids.wi, 'title')}</td></tr>
  <tr><td>6. Ölçüm cihazı</td><td class="who">marvel.kalibrasyon</td><td>kk-cihazlar</td><td>${bel(ids.cihaz, 'instrument_code')}</td></tr>
  <tr><td>7. Kalibrasyon kaydı</td><td class="who">marvel.kalibrasyon</td><td>kk-kalibrasyonlar</td><td>${bel(ids.kal, 'calibration_no')}</td></tr>
  <tr><td>8. Büyük SA (&gt;50K)</td><td class="who">marvel.sa</td><td>satin-alma-siparisleri</td><td>onay kuralı denemesi</td></tr>
</table>

<ol class="steps">
  <li><span class="who">marvel.uretim.dokum</span> satış siparişine bağlı UE <code>${bel(ids.woDok)}</code> açtı (BOM/rota, hammadde→WIP→mamul depoları).</li>
  <li><span class="who">marvel.uretim.cnc</span> paralel UE <code>${bel(ids.woCnc)}</code> ile CNC hattını başlattı.</li>
  <li><span class="who">marvel.proje</span> “Yeni Iron Man Kalıp Tooling” projesini (<code>${bel(ids.project, 'project_code')}</code>) açtı; Ar-Ge, döküm, kalite ve satınalmaya iş paketleri atadı.</li>
  <li><span class="who">marvel.kalibrasyon</span> Mitutoyo kumpas vb. cihazları kaydedip periyodik kalibrasyon sertifikalarını işledi.</li>
</ol>

${imgs([
  ['20-uretim.png', 'Üretim emirleri'],
  ['20b-uretim-dokum.png', `Döküm UE ${bel(ids.woDok)}`],
  ['20c-uretim-cnc.png', `CNC UE ${bel(ids.woCnc)}`],
  ['21-ckk.png', 'Çıkış kalite emirleri'],
  ['21b-ckk-form.png', `CKK ${bel(ids.ckk, 'order_no')}`],
  ['22-proje.png', 'Projeler'],
  ['22b-proje-form.png', `Proje ${bel(ids.project, 'project_code')}`],
  ['22c-prj-isler.png', 'Proje işleri'],
  ['22d-prj-is-form.png', 'İş paketi formu'],
  ['23-cihaz.png', 'Ölçüm cihazları'],
  ['23b-cihaz-form.png', `Cihaz ${bel(ids.cihaz, 'instrument_code')}`],
  ['23c-kalibrasyon.png', 'Kalibrasyon kayıtları'],
  ['23d-kalibrasyon-form.png', `Kalibrasyon ${bel(ids.kal, 'calibration_no')}`],
  ['24-onay-rota.png', 'Onay rota tanımları'],
  ['24b-onay-izleme.png', 'Onay izleme'],
])}

<h2>6. Hafta 3 — Sevk, finans, İK, CAPA, MRP (MMARVEL-W3)</h2>
<p>Tarih aralığı: 17–21 Kasım 2026. Amaç: kısmi sevk/fatura, işe alım + bordro, uygunsuzluk/CAPA, MRP.</p>

<table>
  <tr><th>Adım</th><th>Kullanıcı</th><th>Ekran</th><th>Belge / not</th></tr>
  <tr><td>1. Sevk emri</td><td class="who">marvel.satis / depo</td><td>sevk-emirleri</td><td>${bel(ids.ship, 'shipment_no')}</td></tr>
  <tr><td>2. İrsaliye</td><td class="who">marvel.satis</td><td>irsaliye-yonetimi</td><td>${ids.dn ? bel(ids.dn, 'delivery_note_no') : 'liste (kayıt oluşmadı — gap)'}</td></tr>
  <tr><td>3. Satış faturası</td><td class="who">marvel.finans</td><td>fatura-yonetimi</td><td>${ids.inv ? bel(ids.inv, 'invoice_no') : 'liste (kayıt oluşmadı — gap)'}</td></tr>
  <tr><td>4. İş ilanı</td><td class="who">marvel.ik</td><td>hr-is-ilanlari</td><td>${bel(ids.job, 'requisition_no')} — ${ids.job?.title || ''}</td></tr>
  <tr><td>5. Aday / işe al</td><td class="who">marvel.ik</td><td>hr-adaylar</td><td>${ids.cand ? `${ids.cand.first_name} ${ids.cand.last_name}` : '—'}</td></tr>
  <tr><td>6. Bordro</td><td class="who">marvel.ik</td><td>hr-bordro-calismalari</td><td>${bel(ids.payroll, 'run_no')}</td></tr>
  <tr><td>7. NCR / CAPA</td><td class="who">marvel.kalite</td><td>kk-uygunsuzluklar / kk-capa</td><td>NCR #${ids.ncr?.id || '—'} · CAPA ${ids.capa ? bel(ids.capa, 'capa_no') : 'oluşmadı (gap)'}</td></tr>
  <tr><td>8. MRP</td><td class="who">marvel.planlama</td><td>mrp-calisma</td><td>çalıştırma denemesi</td></tr>
</table>

<ol class="steps">
  <li>Satış siparişi <code>${bel(ids.so)}</code> üzerinden sevk emri <code>${bel(ids.ship, 'shipment_no')}</code> açıldı (mamul depo).</li>
  <li>İrsaliye/fatura kayıtları W3 özetinde boş kaldı — liste ekranları belgelendi, form atlandı.</li>
  <li><span class="who">marvel.ik</span> döküm operatörü ilanı (<code>${bel(ids.job, 'requisition_no')}</code>) açtı; aday <em>${ids.cand ? `${ids.cand.first_name} ${ids.cand.last_name}` : '—'}</em> işe alındı.</li>
  <li>Kasım 2026 bordro dönemi için çalışma <code>${bel(ids.payroll, 'run_no')}</code> oluşturuldu.</li>
  <li><span class="who">marvel.kalite</span> boya ton farkı NCR (#${ids.ncr?.id || '—'}) kaydetti; CAPA dönüşümü gap olarak kaldı.</li>
  <li><span class="who">marvel.planlama</span> MRP çalıştırma denemesi yaptı.</li>
</ol>

${imgs([
  ['30c-sevk.png', 'Sevk emirleri'],
  ['30d-sevk-form.png', `Sevk ${bel(ids.ship, 'shipment_no')}`],
  ['30-irsaliye.png', 'İrsaliye yönetimi'],
  ['30b-irsaliye-form.png', 'İrsaliye formu'],
  ['31-fatura.png', 'Fatura yönetimi'],
  ['31b-fatura-form.png', 'Fatura formu'],
  ['01e-hr-ilanlar.png', 'İK iş ilanları'],
  ['01f-hr-ilan-form.png', `İlan ${bel(ids.job, 'requisition_no')}`],
  ['01g-hr-adaylar.png', 'İK adayları'],
  ['01h-hr-bordro.png', 'Bordro çalışmaları'],
  ['01i-hr-bordro-form.png', `Bordro ${bel(ids.payroll, 'run_no')}`],
  ['32-capa.png', 'CAPA listesi'],
  ['32b-capa-form.png', 'CAPA formu'],
  ['32c-uygunsuzluk.png', 'Uygunsuzluklar'],
  ['32d-uygunsuzluk-form.png', `NCR #${ids.ncr?.id || '—'}`],
  ['33-mrp.png', 'MRP çalışma'],
  ['34-depo-bakiye.png', 'Depo bakiyeleri'],
  ['35-kullanicilar.png', 'Kullanıcılar (ERP hesapları)'],
])}

<h2>7. Belge özet matrisi</h2>
<table>
  <tr><th>Modül</th><th>Örnek belge</th><th>Etiket</th></tr>
  <tr><td>CRM</td><td>${bel(ids.lead, 'lead_name')} / ${bel(ids.opp, 'opportunity_name')}</td><td>W1</td></tr>
  <tr><td>Satış</td><td>${bel(ids.sq, 'quotation_no')} → ${bel(ids.so)}</td><td>W1</td></tr>
  <tr><td>Satınalma</td><td>${bel(ids.poDirect)} (direkt) · ${bel(ids.req, 'requisition_no')}→${bel(ids.pq, 'quotation_no')}→${bel(ids.poAlloy)}</td><td>W1</td></tr>
  <tr><td>Mal kabul</td><td>${bel(ids.gr, 'receipt_no')}</td><td>W1</td></tr>
  <tr><td>Üretim</td><td>${bel(ids.woDok)} · ${bel(ids.woCnc)}</td><td>W2</td></tr>
  <tr><td>Proje</td><td>${bel(ids.project, 'project_code')}</td><td>W2</td></tr>
  <tr><td>Kalibrasyon</td><td>${bel(ids.cihaz, 'instrument_code')} · ${bel(ids.kal, 'calibration_no')}</td><td>W2/W3</td></tr>
  <tr><td>İK</td><td>${bel(ids.job, 'requisition_no')} · ${bel(ids.payroll, 'run_no')}</td><td>W3</td></tr>
  <tr><td>Lisans</td><td>${bel(ids.license)}</td><td>Altyapı</td></tr>
</table>

<h2>8. Nasıl tekrarlanır</h2>
<pre style="background:#1a202c;color:#e2e8f0;padding:10px;border-radius:6px;font-size:9pt;overflow:auto;">
npm run migrate
npm run demo:marvel
npm run demo:marvel-shots
npm run demo:marvel-pdf
</pre>
<p>UI’da firma = <code>MARVEL</code>. Belgelerde <code>project_code</code> / açıklama: <code>MMARVEL-W1</code>, <code>MMARVEL-W2</code>, <code>MMARVEL-W3</code>, <code>METAL-MARVEL-SIM</code>.</p>

<p class="footer">
  Kaynak: scripts/demo-metal-marvel-sim.js · scripts/capture-metal-marvel-shots.js · scripts/build-metal-marvel-pdf.js<br/>
  Kanıt JSON: docs/metal-marvel/evidence/marvel-sim-ozet.json · shot-ids.json<br/>
  Bu PDF, istenen “her işlem + ekran görüntüsü + süreç anlatımı” seviyesinde yeniden üretilmiştir.
</p>

</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, 'utf8');
console.log('HTML yazıldı', OUT_HTML, `(${(html.length / 1024 / 1024).toFixed(1)} MB)`);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
  });
  await browser.close();
  fs.mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  fs.copyFileSync(OUT_PDF, ARTIFACT);
  const st = fs.statSync(OUT_PDF);
  console.log(JSON.stringify({
    pdf: OUT_PDF,
    artifact: ARTIFACT,
    html: OUT_HTML,
    bytes: st.size,
    mb: +(st.size / 1024 / 1024).toFixed(2),
  }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
