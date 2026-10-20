/**
 * Denim Tekstil örnek senaryoları — müşteri sunumu / kullanım kılavuzu PDF.
 *   node scripts/build-teks-kilavuz-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ozetPath = path.join(__dirname, '..', 'docs', 'teks-ornek12-ozet.json');
const ozet = JSON.parse(fs.readFileSync(ozetPath, 'utf8'));

const outPdf = path.join(__dirname, '..', 'docs', 'TEKS_Kullanim_Kilavuzu_Ornek12.pdf');
const outArtifact = '/opt/cursor/artifacts/TEKS_Kullanim_Kilavuzu_Ornek12.pdf';

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Denim Tekstil ERP Kullanım Kılavuzu</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", "Segoe UI", sans-serif;
    color: #1a2330;
    font-size: 10.5pt;
    line-height: 1.45;
    margin: 0;
  }
  h1 { font-size: 22pt; margin: 0 0 6pt; color: #0c4a3e; }
  h2 {
    font-size: 13pt; margin: 22pt 0 8pt; padding-bottom: 4pt;
    border-bottom: 2px solid #0c7c69; color: #0c4a3e;
    page-break-after: avoid;
  }
  h3 { font-size: 11pt; margin: 14pt 0 6pt; color: #1a4a40; page-break-after: avoid; }
  p { margin: 0 0 8pt; }
  .cover {
    min-height: 240mm; display: flex; flex-direction: column; justify-content: center;
    padding: 24pt; background: linear-gradient(165deg, #e8f5f1 0%, #f7fafb 55%, #fff 100%);
    border: 1px solid #c5d8d2; border-radius: 8pt;
  }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 9pt; color: #5d6b7a; margin-bottom: 10pt; }
  .sub { font-size: 12pt; color: #3a4553; margin-bottom: 18pt; }
  .meta { font-size: 9.5pt; color: #5d6b7a; margin-top: 28pt; }
  .pill {
    display: inline-block; background: #0c7c69; color: #fff; padding: 3pt 10pt;
    border-radius: 999pt; font-size: 9pt; margin-right: 6pt;
  }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 9.5pt; }
  th, td { border: 1px solid #d5dde6; padding: 5pt 7pt; vertical-align: top; text-align: left; }
  th { background: #eef5f3; color: #0c4a3e; font-weight: 650; }
  tr:nth-child(even) td { background: #fafcfc; }
  .box {
    background: #f3f8f6; border-left: 3px solid #0c7c69; padding: 8pt 10pt; margin: 8pt 0 12pt;
  }
  .warn { background: #fff8e8; border-left-color: #c9a227; }
  ul { margin: 4pt 0 10pt 16pt; padding: 0; }
  li { margin-bottom: 3pt; }
  .screen { font-weight: 650; color: #0c4a3e; }
  .field { font-family: ui-monospace, monospace; font-size: 9pt; background: #eef2f5; padding: 1pt 4pt; border-radius: 3pt; }
  .footer-note { font-size: 8.5pt; color: #6b7785; margin-top: 16pt; }
  .page-break { page-break-before: always; }
  .flow { font-size: 9.5pt; background: #fff; border: 1px solid #d5dde6; padding: 8pt; border-radius: 6pt; }
</style>
</head>
<body>

<section class="cover">
  <div class="eyebrow">KTB ERP · Müşteri sunumu / kullanım kılavuzu</div>
  <h1>Denim Tekstil Üretim A.Ş.<br/>Uçtan Uca Süreç Örnekleri</h1>
  <p class="sub">Firma kodu <strong>TEKS</strong> — Örnek 1 (MRP’siz) ve Örnek 2 (MRP’li) senaryolarının ekran ve alan rehberi.</p>
  <div>
    <span class="pill">Örnek 1 · Manuel plan</span>
    <span class="pill" style="background:#1a5f8a">Örnek 2 · MRP</span>
  </div>
  <div class="meta">
    Hazırlayan: KTB ERP uygulama ekibi<br/>
    Veri özeti: <code>docs/teks-ornek12-ozet.json</code><br/>
    Örnek1 sipariş: <strong>${ozet.ornek1.siparis}</strong> · Örnek2 sipariş: <strong>${ozet.ornek2.siparis}</strong> · MRP: <strong>${ozet.ornek2.mrp}</strong>
  </div>
</section>

<h2>1. Amaç ve kapsam</h2>
<p>Bu doküman, tekstil (denim) firmasında ERP’nin <strong>satış → planlama → satınalma → üretim → sevk → fatura</strong> zincirini iki farklı yaklaşımla nasıl kullandığınızı anlatır. Her kritik ekranın ne işe yaradığı ve formdaki alan gruplarının anlamı müşteriye sunulacak dilde özetlenmiştir.</p>
<div class="box">
  <strong>Örnek 1 (MRP yok):</strong> 100 adet Kot Pantolon Slim 32 satış siparişi → BOM’dan elle ihtiyaç → satınalma → üretim → sevk/irsaliye/fatura.<br/>
  <strong>Örnek 2 (MRP var):</strong> 250 adet bağımsız ihtiyaç + satış siparişi → MRP çalışması → satınalma/üretim önerileri → sevk zinciri.
</div>

<h2>2. Firma iskeleti (ortak master)</h2>
<table>
  <tr><th>Ekran</th><th>Ne için?</th><th>Örnekte doldurulan alanlar</th></tr>
  <tr>
    <td class="screen">Firmalar / İş Yerleri / Depolar</td>
    <td>Organizasyon; stok ve belge kapsamı</td>
    <td>TEKS firması, TEKS-MRK iş yeri; Ana / Hammadde / Mamul / Sevk / Kalite depoları</td>
  </tr>
  <tr>
    <td class="screen">Cari Kartları</td>
    <td>Tedarikçi ve müşteri kimlik/adres/iletişim</td>
    <td>Kod, unvan, vergi, telefon/e-posta, fatura adresi, il/ilçe/ülke, ödeme vadesi, notlar, banka</td>
  </tr>
  <tr>
    <td class="screen">Stok Kartı</td>
    <td>Hammadde, yarı mamul, mamul tanımları</td>
    <td>Tip, tedarik tipi, birim, fiyat, ABC, marka, GTIP, emniyet/min/max/ROP, temin süresi, KDV, depo varsayılanları, barkod, dil, açıklama</td>
  </tr>
  <tr>
    <td class="screen">Ürün Ağacı (BOM)</td>
    <td>Mamul reçetesi</td>
    <td>Mamul + yarı mamul + hammadde satırları (kumaş, iplik, fermuar, düğme)</td>
  </tr>
  <tr>
    <td class="screen">İş Merkezleri / Rotalar</td>
    <td>Üretim hattı ve operasyon sırası</td>
    <td>Kesim → Dikim → Yıkama → Ütü-Paket; süre (dk)</td>
  </tr>
  <tr>
    <td class="screen">Fiyat Listeleri</td>
    <td>Satış fiyat politikası</td>
    <td>Liste kodu/adı, PB, mamul birim fiyatı</td>
  </tr>
</table>

<h2>3. Form kabuğu (tüm belgelerde ortak)</h2>
<p>Satış siparişinde onaylanan düzen tüm belge ekranlarına yayıldı:</p>
<ul>
  <li><strong>Üst şerit (kompakt başlık):</strong> belge no, cari, tarih/teslim, durum, firma/iş yeri, ödeme/teslimat koşulu, hareket kodu</li>
  <li><strong>Kalemler / Satırlar sekmesi:</strong> stok, miktar, fiyat, PB/kur, iskonto, KDV, depo, proje…</li>
  <li><strong>Adres sekmesi</strong> (varsa): sevk adresi / il / ilçe / ülke / posta; cari seçilince otomatik dolar</li>
  <li><strong>Alt şerit:</strong> müşteri notu, dahili not, açıklama + ara/KDV/genel toplam</li>
</ul>

<div class="page-break"></div>
<h2>4. Örnek 1 — MRP kullanmadan uçtan uca</h2>
<p class="flow"><strong>Akış:</strong> CRM Fırsat → Satış Teklifi → Satış Siparişi → (BOM’dan elle) Satınalma Talebi → Teklif İsteği → SA Teklifi → Anlaşma → SA Siparişi → Tedarikçi İrsaliyesi → Mal Kabul → Alış Faturası → Stok Giriş → Üretim Emri → Transfer → Sayım → Sevk Emri → İrsaliye → Satış Faturası → Tahsilat → KK Emri → Parti</p>

<table>
  <tr><th>Belge</th><th>Örnek no</th><th>Kritik alanlar</th></tr>
  <tr><td>Satış teklifi</td><td>${ozet.ornek1.teklif}</td><td>Müşteri, geçerlilik, teslim, fiyat listesi, %5 iskonto, ödeme/teslimat, not_public / not_internal</td></tr>
  <tr><td>Satış siparişi</td><td>${ozet.ornek1.siparis}</td><td>100 AD mamul, sevk adresi, proje PRJ-DENIM, kaynak=Teklif, müşteri sipariş no</td></tr>
  <tr><td>SA sipariş</td><td>${ozet.ornek1.sa}</td><td>BOM×100×1.05 fire; tedarikçi, depo HMD, ödeme/teslimat, notlar</td></tr>
  <tr><td>Üretim emri</td><td>${ozet.ornek1.ue}</td><td>Ağaç+rota bağlı; kaynak satış siparişi</td></tr>
  <tr><td>Sevk / İrsaliye / Fatura</td><td>${ozet.ornek1.sevk} / ${ozet.ornek1.irsaliye} / ${ozet.ornek1.fatura}</td><td>Taşıyıcı, plaka, şoför, E-irsaliye senaryosu, vade, notlar</td></tr>
</table>

<div class="box warn">
  <strong>Neden MRP yok?</strong> İhtiyaç miktarları ürün ağacından elle hesaplanıp satınalma talebine yazıldı. Küçük/acil siparişlerde veya planlamacının doğrudan kontrol istediği durumlarda kullanılır.
</div>

<h3>4.1 Satış ekranları — alan sözlüğü</h3>
<table>
  <tr><th>Alan grubu</th><th>Alanlar</th><th>Anlamı</th></tr>
  <tr><td>Kimlik</td><td><span class="field">siparis_no</span> <span class="field">musteri_siparis_no</span> <span class="field">teklif_id</span></td><td>Belge numarası, müşteri PO referansı, kaynak teklif bağlantısı</td></tr>
  <tr><td>Cari</td><td><span class="field">cari_id</span></td><td>Müşteri; seçilince adres sekmesi dolar</td></tr>
  <tr><td>Tarihler</td><td><span class="field">siparis_tarihi</span> <span class="field">teslim_tarihi</span> <span class="field">gecerlilik_tarihi</span></td><td>Belge, müşteri teslim ve geçerlilik</td></tr>
  <tr><td>Organizasyon</td><td><span class="field">firma_id</span> <span class="field">is_yeri_id</span> <span class="field">depo_id</span></td><td>Hangi şirket/iş yeri/sevk deposu</td></tr>
  <tr><td>Ticari</td><td><span class="field">odeme_kosulu</span> <span class="field">odeme_sekli</span> <span class="field">teslimat_kosulu</span> <span class="field">hareket_kodu_id</span></td><td>Vade, ödeme şekli, Incoterms, muhasebe/stok hareket tipi</td></tr>
  <tr><td>Kalem</td><td><span class="field">stok_id</span> <span class="field">miktar</span> <span class="field">birim_fiyat</span> <span class="field">iskonto_oran</span> <span class="field">kdv_oran</span> <span class="field">para_birimi</span> <span class="field">kur</span></td><td>Satır ekonomisi ve vergi</td></tr>
  <tr><td>Notlar</td><td><span class="field">not_public</span> <span class="field">not_internal</span> <span class="field">aciklama</span></td><td>Müşteriye görünen / dahili / genel açıklama</td></tr>
  <tr><td>Adres</td><td><span class="field">sevk_adresi</span> <span class="field">sevk_il</span> <span class="field">sevk_ilce</span> <span class="field">sevk_ulke</span> <span class="field">sevk_posta_kodu</span></td><td>Sevkiyat adresi (ayrı sekme)</td></tr>
</table>

<div class="page-break"></div>
<h2>5. Örnek 2 — MRP ile planlama</h2>
<p class="flow"><strong>Akış:</strong> MRP Bağımsız İhtiyaç (${ozet.ornek2.bi}) + Satış Siparişi (${ozet.ornek2.siparis}) → MRP Çalışması (${ozet.ornek2.mrp}) → SA Talep (${ozet.ornek2.talep}) → SA Sipariş (${ozet.ornek2.sa}) → Stok Giriş → Üretim Emri (${(ozet.ornek2.ue || []).join(', ')}) → Sevk (${ozet.ornek2.sevk}) → İrsaliye → Fatura</p>

<table>
  <tr><th>MRP önerisi (özet)</th><th>Net</th><th>Öneri</th></tr>
  ${(ozet.mrp.oneriler || []).map((r) => `<tr><td>${r.stok}</td><td>${Number(r.net).toFixed(2)}</td><td>${r.oneri}</td></tr>`).join('')}
</table>

<div class="box">
  <strong>Neden MRP?</strong> Bağımsız ihtiyaç ve açık siparişler BOM ile patlatılır; net ihtiyaç stok/sipariş bakiyesine göre hesaplanır. Sistem satınalma veya üretim emri önerir — planlamacı tek tek BOM çarpmaz.
</div>

<h3>5.1 MRP ekranları</h3>
<table>
  <tr><th>Ekran</th><th>Alanlar</th><th>Kullanım</th></tr>
  <tr>
    <td class="screen">MRP Bağımsız İhtiyaç</td>
    <td><span class="field">ihtiyac_no</span> <span class="field">stok_id</span> <span class="field">miktar</span> <span class="field">ihtiyac_tarihi</span> <span class="field">kaynak</span> <span class="field">aciklama</span></td>
    <td>Forecast / manuel mamul talebi (örnekte 250 AD kot pantolon)</td>
  </tr>
  <tr>
    <td class="screen">MRP Çalışması</td>
    <td>Firma, iş yeri, açıklama, sonuç satırları (brüt/net/öneri)</td>
    <td>Patlatma + netleştirme; ardından talep/UE oluşturma</td>
  </tr>
</table>

<h2>6. Satınalma zinciri — ekranlar</h2>
<table>
  <tr><th>Ekran</th><th>Ne zaman?</th><th>Önemli alanlar</th></tr>
  <tr><td class="screen">Satınalma Talepleri</td><td>İç ihtiyaç bildirimi</td><td>İş yeri, proje, kalem miktar/birim, not_internal</td></tr>
  <tr><td class="screen">Teklif İstekleri</td><td>Tedarikçiden fiyat isteme</td><td>İstek no, durum, kalemler</td></tr>
  <tr><td class="screen">Satınalma Teklifleri</td><td>Tedarikçi teklifi</td><td>Cari, geçerlilik, birim fiyat, açıklama</td></tr>
  <tr><td class="screen">Satınalma Anlaşmaları</td><td>Uzun dönem fiyat</td><td>Başlangıç/bitiş, para birimi</td></tr>
  <tr><td class="screen">Satınalma Siparişleri</td><td>Sipariş kesme</td><td>Depo, ödeme/teslimat, sevk adresi, notlar, kur</td></tr>
  <tr><td class="screen">Tedarikçi İrsaliyeleri</td><td>Mal yola çıktı</td><td>İrsaliye no/tarih, SA bağlantısı</td></tr>
  <tr><td class="screen">Mal Kabuller</td><td>Depoya giriş onayı</td><td>Kabul edilen miktar, hareket kodu, not_internal</td></tr>
  <tr><td class="screen">Alış Faturaları</td><td>Maliyet/borç</td><td>Cari, mal kabul bağı, tutar, notlar</td></tr>
</table>

<h2>7. Stok, üretim, kalite, finans</h2>
<table>
  <tr><th>Ekran</th><th>Rolü</th><th>Alan vurgusu</th></tr>
  <tr><td class="screen">Stok Hareketleri</td><td>Giriş/çıkış fişi</td><td>Hareket tipi, depo, kalem miktar, açıklama</td></tr>
  <tr><td class="screen">Transfer Emirleri</td><td>Depolar arası</td><td>Kaynak/hedef depo (mamul→sevk)</td></tr>
  <tr><td class="screen">Sayım Belgeleri</td><td>Envanter doğrulama</td><td>Depo, durum, açıklama</td></tr>
  <tr><td class="screen">Stok Partileri</td><td>Lot takibi</td><td>Parti no, SKT, açıklama</td></tr>
  <tr><td class="screen">Üretim Emirleri</td><td>İmalat emri</td><td>Stok, miktar, ağaç, rota, HM/mamul depo, sipariş bağı</td></tr>
  <tr><td class="screen">KK Emirleri</td><td>Kalite kontrol</td><td>Yön (GKK/CKK), miktar, depo</td></tr>
  <tr><td class="screen">Tahsilat / Ödeme</td><td>Nakit akışı</td><td>Tip, tutar, ödeme şekli, cari</td></tr>
  <tr><td class="screen">CRM Aday / Fırsat</td><td>Satış hunisi</td><td>Aday notları, fırsat geliri, aşama</td></tr>
</table>

<div class="page-break"></div>
<h2>8. Hangi senaryoda ne seçilir?</h2>
<table>
  <tr><th>Soru</th><th>Önerilen yol</th></tr>
  <tr><td>Tek / acil sipariş, planlamacı BOM’u biliyor</td><td><strong>Örnek 1</strong> — manuel talep</td></tr>
  <tr><td>Çok mamul, forecast + açık sipariş, net ihtiyaç karmaşık</td><td><strong>Örnek 2</strong> — MRP</td></tr>
  <tr><td>Müşteriye fiyat vermeden sipariş</td><td>Önce Satış Teklifi, sonra siparişe dönüştür</td></tr>
  <tr><td>Sevkiyat adresi cari kartından gelsin</td><td>Siparişte müşteri seç → Adres sekmesi</td></tr>
  <tr><td>Müşteriye görünen / görülmeyen not</td><td><span class="field">not_public</span> / <span class="field">not_internal</span></td></tr>
</table>

<h2>9. UI’da kontrol listesi (müşteri eğitimi)</h2>
<ol>
  <li>Üst bardan <strong>TEKS</strong> firmasını seçin.</li>
  <li>İlgili liste ekranında <strong>Yeni</strong> ile formu açın (yeni sekme / form-solo).</li>
  <li>Başlık alanlarını doldurun; müşteri seçiminde adresin geldiğini Adres sekmesinden doğrulayın.</li>
  <li>Kalemlerde <strong>Yeni</strong> → satır Kaydet → belge üst <strong>Kaydet</strong>.</li>
  <li>Not alanlarını (müşteri / dahili) alt şeritte doldurun.</li>
  <li>Örnek 2 için: Bağımsız İhtiyaç kaydı → MRP çalıştır → önerilerden talep/UE.</li>
</ol>

<h2>10. Veri özeti (bu koşum)</h2>
<table>
  <tr><th></th><th>Örnek 1</th><th>Örnek 2</th></tr>
  <tr><td>Mamul miktar</td><td>${ozet.ornek1.qty} AD</td><td>${ozet.ornek2.qty} AD</td></tr>
  <tr><td>Satış siparişi</td><td>${ozet.ornek1.siparis}</td><td>${ozet.ornek2.siparis}</td></tr>
  <tr><td>SA sipariş</td><td>${ozet.ornek1.sa}</td><td>${ozet.ornek2.sa}</td></tr>
  <tr><td>Üretim</td><td>${ozet.ornek1.ue}</td><td>${(ozet.ornek2.ue || []).join(', ')}</td></tr>
  <tr><td>MRP</td><td>—</td><td>${ozet.ornek2.mrp} (BI ${ozet.ornek2.bi})</td></tr>
  <tr><td>Fatura</td><td>${ozet.ornek1.fatura}</td><td>${ozet.ornek2.fatura}</td></tr>
</table>

<p class="footer-note">Yeniden üretmek için: <code>node scripts/purge-firma-veri.js TEKS && node scripts/demo-teks-ornek12.js && node scripts/build-teks-kilavuz-pdf.js</code></p>

</body>
</html>`;

async function main() {
  const tmp = '/tmp/teks-kilavuz.html';
  fs.writeFileSync(tmp, html);
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.goto(`file://${tmp}`, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
  });
  await browser.close();
  fs.mkdirSync(path.dirname(outPdf), { recursive: true });
  fs.writeFileSync(outPdf, pdf);
  fs.mkdirSync(path.dirname(outArtifact), { recursive: true });
  fs.writeFileSync(outArtifact, pdf);
  console.log(JSON.stringify({ ok: true, pdf: outPdf, artifact: outArtifact, bytes: pdf.length }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
