/**
 * İK modülü — kapsamlı Türkçe PDF dokümanı.
 * node scripts/build-hr-modul-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const outPdf = path.join(__dirname, '..', 'docs/hr/IK_Modul_Rehberi.pdf');
const outArtifact = '/opt/cursor/artifacts/IK_Modul_Rehberi.pdf';

function section(title, body) {
  return `<section class="sec"><h2>${title}</h2>${body}</section>`;
}

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP — İnsan Kaynakları Modülü</title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "DejaVu Sans", "Segoe UI", sans-serif; color: #1a2330; font-size: 9.5pt; line-height: 1.45; margin: 0; }
  h1 { font-size: 22pt; color: #0b3d5c; margin: 0 0 8pt; }
  h2 { font-size: 13pt; color: #0b3d5c; margin: 0 0 6pt; page-break-after: avoid; border-bottom: 1px solid #c5d4e0; padding-bottom: 3pt; }
  h3 { font-size: 10.5pt; color: #1e4d6b; margin: 10pt 0 4pt; }
  p { margin: 0 0 6pt; }
  .cover { min-height: 250mm; padding: 32pt 28pt; background: linear-gradient(155deg,#d6e8f5 0%,#f3f7fb 45%,#fff 100%); border: 1px solid #b7c9d8; border-radius: 8pt; }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 8pt; color: #5b6b7a; font-weight: 650; margin-bottom: 8pt; }
  .sub { font-size: 11pt; color: #334155; max-width: 92%; }
  .meta { margin-top: 28pt; font-size: 9pt; color: #475569; }
  .meta div { margin: 2pt 0; }
  .sec { page-break-before: always; padding-top: 2pt; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 8.5pt; }
  th, td { border: 1px solid #c9d5e0; padding: 4pt 5pt; vertical-align: top; }
  th { background: #e8f1f8; text-align: left; color: #0b3d5c; }
  ul, ol { margin: 4pt 0 8pt 16pt; padding: 0; }
  li { margin: 2pt 0; }
  .note { background: #fff8e8; border-left: 3px solid #d4a017; padding: 6pt 8pt; margin: 8pt 0; font-size: 8.5pt; }
  .ok { background: #eef8f1; border-left: 3px solid #2f7d4a; padding: 6pt 8pt; margin: 8pt 0; font-size: 8.5pt; }
  code { font-family: "DejaVu Sans Mono", monospace; font-size: 8pt; background: #f1f5f9; padding: 1pt 3pt; }
  .toc a { color: #0b3d5c; text-decoration: none; }
  .footer-note { font-size: 8pt; color: #64748b; margin-top: 12pt; }
</style>
</head>
<body>

<div class="cover">
  <div class="eyebrow">KTB ERP · Modül Rehberi</div>
  <h1>İnsan Kaynakları, Puantaj, Bordro ve İşgücü Yönetimi</h1>
  <p class="sub">Personel özlük, organizasyon, çalışma takvimi, izin, PDKS/puantaj, ücret, bordro, avans, işe alım, onboarding, zimmet ve işten çıkış süreçlerini tek personel referansı etrafında birleştiren bütünleşik modül.</p>
  <div class="meta">
    <div><strong>Dal:</strong> cursor/erp-hr-modul-4f63</div>
    <div><strong>Varsayılan ülke:</strong> Türkiye (TR-2025 parametre seti)</div>
    <div><strong>Doküman tarihi:</strong> 28 Ekim 2026 (Europe/Istanbul)</div>
    <div><strong>Migration:</strong> 053_hr_core_time_payroll.sql</div>
  </div>
  <p class="footer-note">Bu belge hukuki mütalaa değildir. Bordro oranları resmî kaynaklara dayalı yapılandırılabilir parametrelerdir; dönemsel doğrulama gerekir. AZ/DE/NL için henüz kesin hesaplama iddiası yoktur.</p>
</div>

${section('1. Amaç ve kapsam', `
<p>Modül yalnızca personel kartı üretmez. Hedef: ortak <code>hr_employees</code> kaydı üzerinden özlük, zaman, ücret ve yaşam döngüsü süreçlerinin tutarlı çalışması.</p>
<ul>
  <li>Core HR: personel, departman, pozisyon, yönetici zinciri, istihdam geçmişi</li>
  <li>Zaman: çalışma takvimi, vardiya, resmi tatil, PDKS ham kayıt, günlük puantaj, izin</li>
  <li>Bordro: ücret geçmişi, avans, dönem/çalışma, brüt→net motor, kesinleştirme</li>
  <li>Yaşam döngüsü: iş ilanı, aday, işe alım, onboarding, zimmet, işten çıkış / ön hesaplaşma</li>
</ul>
`)}

${section('2. Keşif: öncesi / sonrası', `
<table>
  <thead><tr><th>Alan</th><th>Önce</th><th>Sonra</th></tr></thead>
  <tbody>
    <tr><td>Personel özlük</td><td>Yok</td><td>hr_employees + Personel Kartları ekranı</td></tr>
    <tr><td>Kullanıcı ilişkisi</td><td>users ayrı</td><td>Ayrı kaldı; opsiyonel user_id bağ</td></tr>
    <tr><td>İzin / puantaj</td><td>Yok</td><td>Tür, bakiye, talep, PDKS, günlük</td></tr>
    <tr><td>Bordro</td><td>Yok</td><td>Parametre seti + motor + dönem akışı</td></tr>
    <tr><td>İşe alım</td><td>CRM lead (satış)</td><td>İK aday → personel dönüşümü</td></tr>
    <tr><td>İşten çıkış</td><td>Yok</td><td>Süreç + uygunluk + ön tutar</td></tr>
  </tbody>
</table>
`)}

${section('3. Mimari', `
<h3>API uçları</h3>
<table>
  <thead><tr><th>Prefix</th><th>İçerik</th></tr></thead>
  <tbody>
    <tr><td><code>/hr-personel</code></td><td>Personel CRUD, geçmiş, izin hak ediş sorgusu</td></tr>
    <tr><td><code>/hr-org</code></td><td>Departmanlar, pozisyonlar</td></tr>
    <tr><td><code>/hr-izin</code></td><td>Türler, talepler, onay, bakiyeler</td></tr>
    <tr><td><code>/hr-takvim</code></td><td>Takvim, vardiya, atama, tatil</td></tr>
    <tr><td><code>/hr-puantaj</code></td><td>Ham PDKS, günlük, işleme, düzeltme</td></tr>
    <tr><td><code>/hr-bordro</code></td><td>Parametre, ücret, avans, dönem, çalışma, simülasyon</td></tr>
    <tr><td><code>/hr-ise-alim</code></td><td>İlan, aday, onboarding, zimmet, çıkış</td></tr>
  </tbody>
</table>
<h3>UI</h3>
<p>Menü <strong>İnsan Kaynakları</strong>: Özlük · Zaman &amp; İzin · Ücret &amp; Bordro · İşe Alım &amp; Çıkış.</p>
<p>Motor: <code>src/services/hrPayrollService.js</code> — oranlar kodda sabit değil, <code>hr_payroll_param_*</code> tablolarından okunur.</p>
`)}

${section('4. Core HR', `
<ul>
  <li>Personel numarası numaratör <code>HR_EMPLOYEE</code> (öneki HE).</li>
  <li>Kimlik, iletişim, kurumsal alanlar; medeni hâl / kan grubu zorunlu değil.</li>
  <li>Departman ağacı (parent_id); pozisyon–departman bağ.</li>
  <li>Yönetici self-FK; kendini atama ve döngü engeli.</li>
  <li>Org/ücret değişiminde <code>hr_employment_history</code> kaydı — geçmiş raporlar bozulmaz.</li>
  <li>Belgeler: <code>hr_employee_documents</code> storage_key + metadata (dosya içeriği DB’de değil).</li>
</ul>
`)}

${section('5. Zaman, puantaj ve izin', `
<h3>Takvim modelleri (yapılandırma örneği)</h3>
<ul>
  <li><strong>Model A:</strong> 6 gün, bulunma 9s, net 8s, ara 1s → haftalık net 45s.</li>
  <li><strong>Model B:</strong> 5 gün, bulunma 10,5s, net 9,5s → haftalık net 47,5s.</li>
</ul>
<div class="note">Bu modeller esneklik örneğidir; ülke mevzuatı doğrulanmadan yasal uygun sayılmaz.</div>
<ul>
  <li>Takvim sürümlenir (<code>version_no</code>); yeni sürüm eskisini pasife alır.</li>
  <li>Gece yarısını aşan vardiya: <code>crosses_midnight</code>.</li>
  <li>PDKS ham kayıt mükerrer kaynak kimliği ile engellenir; düzeltme günlük satırda gerekçeli.</li>
  <li>İzin durumları: Taslak → Gönderildi → (Yönetici/İK) → Onaylandı / Reddedildi / İptal.</li>
  <li>Onayda bakiye tek kez düşer; çakışan tarihler 409.</li>
  <li>Yıllık hak ediş asgari tablo: 14 / 20 / 26 (+ yaş / yeraltı).</li>
</ul>
`)}

${section('6. Ücret ve bordro (TR)', `
<h3>Hesap sırası</h3>
<ol>
  <li>SGK işçi %14, işsizlik işçi %1</li>
  <li>GV matrahı = brüt − SGK − işsizlik</li>
  <li>Dilim vergisi (kümülatif) − asgari ücret GV istisnası</li>
  <li>Damga (binde 7,59) − istisna</li>
  <li>Net = brüt − kesintiler − avans − diğer</li>
  <li>İşveren maliyeti = brüt + işveren SGK (+indirim) + işveren işsizlik</li>
</ol>
<p>Parametre seti <code>TR-2025</code>: asgari brüt 26.005,50 TL (CSGB referanslı seed). Kaynak URL migration/parametre kaydında tutulur.</p>
<h3>Dönem akışı</h3>
<p>Açık → Hesaplama → Kontrol/Onay → Kesin. Kesin run değiştirilmez; mükerrer muhasebe <code>journal_entry_id</code> ile engellenir (otomatik fiş sonraki iterasyon).</p>
<h3>Avans</h3>
<p>Talep → Onay → Ödeme → Bordro mahsubu ayrı aşamalardır. Onay ödeme sayılmaz.</p>
<div class="ok"><strong>Smoke örneği:</strong> 50.000 TL brüt → net 39.258,58 TL (TR-2025, kümülatif 0, indirimli işveren). Bordro BR00001 kesinleştirildi.</div>
`)}

${section('7. İşe alım, onboarding, çıkış', `
<ul>
  <li>İş ilanı + aday havuzu; <strong>İşe Al</strong> personel oluşturur, e-posta mükerrerini engeller.</li>
  <li>Onboarding checklist otomatik (sözleşme, kimlik, zimmet, hesap talebi, oryantasyon).</li>
  <li>Kullanıcı hesabı otomasyonu yoksa sahte entegrasyon gösterilmez; görev olarak takip edilir.</li>
  <li>Zimmet teslim/iade; çıkış onayında açık zimmet engeli.</li>
  <li>Çıkış: neden, tarihler, kıdem/ihbar <em>uygunluk</em> + ön tutar, kullanılmamış izin; uzman onayı notu calc_detail içinde.</li>
  <li>Onay sonrası personel <code>Ayrildi</code> / pasif; geçmiş bordro ve puantaj silinmez.</li>
</ul>
`)}

${section('8. Güvenlik ve KVKK', `
<ul>
  <li>Firma izolasyonu (<code>X-Firma-Id</code> / company_id).</li>
  <li>Hassas alanlar zorunlu değil; belge gizlilik seviyesi.</li>
  <li>Loglarda T.C./IBAN açık metin yazılmamalı (politika).</li>
  <li>Detay: <code>docs/hr/data-protection.md</code>.</li>
</ul>
`)}

${section('9. Ülke adaptasyonu', `
<table>
  <thead><tr><th>Ülke</th><th>Durum</th></tr></thead>
  <tbody>
    <tr><td>TR</td><td>Aktif — param, tatil, izin, brüt→net</td></tr>
    <tr><td>AZ / DE / NL</td><td>Alan ve mimari hazır; doğrulanmış param seti yok — hesap iddiası yok</td></tr>
  </tbody>
</table>
<p>Türkiye kuralları diğer ülkelere kopyalanmaz. Yeni ülke checklist: <code>docs/hr/country-adaptation.md</code>.</p>
`)}

${section('10. Testler ve dosyalar', `
<table>
  <thead><tr><th>Kanıt</th><th>Sonuç</th></tr></thead>
  <tbody>
    <tr><td>tests/hr-payroll.test.js</td><td>5/5 PASS</td></tr>
    <tr><td>scripts/hr-smoke.js</td><td>SMOKE_OK (personel, izin, puantaj, bordro, işe alım)</td></tr>
  </tbody>
</table>
<h3>Dokümanlar</h3>
<ul>
  <li><code>docs/hr/implementation-plan.md</code></li>
  <li><code>docs/hr/legal-research-tr.md</code></li>
  <li><code>docs/hr/payroll-rules-tr.md</code></li>
  <li><code>docs/hr/country-adaptation.md</code></li>
  <li><code>docs/hr/data-protection.md</code></li>
  <li><code>docs/hr/user-guide-tr.md</code></li>
  <li><code>docs/hr/architecture.md</code></li>
  <li><code>docs/hr/test-results.md</code></li>
</ul>
<h3>Bilinen eksikler</h3>
<ul>
  <li>Otomatik muhasebe fişi eşlemesi (alan hazır)</li>
  <li>Net→brüt çözücü</li>
  <li>Nesne depolama (S3) — storage_key sözleşmesi var</li>
  <li>Vekâlet ile onay modülü birleşimi</li>
  <li>AZ/DE/NL doğrulanmış bordro setleri</li>
</ul>
`)}

${section('11. Kullanım — hızlı başlangıç', `
<ol>
  <li>Departman ve pozisyon tanımlayın.</li>
  <li>Çalışma takvimi / vardiya oluşturun.</li>
  <li>Personel kartı açın; ücret tanımı ekleyin.</li>
  <li>İzin bakiyesi hak edişi → talep → gönder → onay.</li>
  <li>Bordro dönemi açın → çalışma → Hesapla → Onayla → Kesinleştir.</li>
  <li>İşe alımda adayı personele dönüştürün; onboarding ve zimmeti tamamlayın.</li>
  <li>Çıkışta zimmetleri kapatıp hesaplaşmayı onaylayın.</li>
</ol>
<p>Ayrıntılı adımlar: <code>docs/hr/user-guide-tr.md</code>.</p>
`)}

</body></html>`;

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function main() {
  const executablePath = await findChrome();
  if (!executablePath) throw new Error('Chrome/Chromium bulunamadı');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    fs.mkdirSync(path.dirname(outPdf), { recursive: true });
    await page.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '14mm', left: '10mm', right: '10mm' },
    });
    fs.mkdirSync(path.dirname(outArtifact), { recursive: true });
    fs.copyFileSync(outPdf, outArtifact);
    console.log('PDF', outPdf);
    console.log('ARTIFACT', outArtifact);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
