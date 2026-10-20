/**
 * Denim Tekstil — müşteri satış sunumu PDF (ekran görüntülü, alan anlatımlı).
 * Önce: node scripts/capture-teks-sunum-ekranlari.js
 * Sonra: node scripts/build-teks-kilavuz-pdf.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ozet = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'teks-ornek12-ozet.json'), 'utf8'));
const shotDir = path.join(__dirname, '..', 'docs', 'teks-sunum-shots');
const outPdf = path.join(__dirname, '..', 'docs', 'TEKS_Kullanim_Kilavuzu_Ornek12.pdf');
const outArtifact = '/opt/cursor/artifacts/TEKS_Sunum_Denim_Tekstil_Ornek12.pdf';
const outArtifactAlias = '/opt/cursor/artifacts/TEKS_Kullanim_Kilavuzu_Ornek12.pdf';

function img(file) {
  const p = path.join(shotDir, file);
  if (!fs.existsSync(p)) return '';
  const b64 = fs.readFileSync(p).toString('base64');
  return `data:image/png;base64,${b64}`;
}

function slide(opts) {
  const { eyebrow, title, lead, shot, bullets, fields, tip, pageBreak = true } = opts;
  const src = shot ? img(shot) : '';
  return `
  <section class="slide${pageBreak ? ' page-break' : ''}">
    <div class="slide-head">
      <div class="eyebrow">${eyebrow || ''}</div>
      <h2>${title}</h2>
      ${lead ? `<p class="lead">${lead}</p>` : ''}
    </div>
    ${src ? `<figure class="shot"><img src="${src}" alt="${title}"/></figure>` : ''}
    ${bullets && bullets.length ? `<ul class="talk">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    ${fields && fields.length ? `
      <table class="fields">
        <thead><tr><th>Alan</th><th>Bu örnekte</th><th>Ne işe yarar?</th></tr></thead>
        <tbody>
          ${fields.map(([a, b, c]) => `<tr><td class="f">${a}</td><td>${b}</td><td>${c}</td></tr>`).join('')}
        </tbody>
      </table>` : ''}
    ${tip ? `<div class="tip">${tip}</div>` : ''}
  </section>`;
}

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Denim Tekstil — KTB ERP Satış Sunumu</title>
<style>
  @page { size: A4; margin: 12mm 11mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", "Segoe UI", sans-serif;
    color: #15202b;
    font-size: 9.5pt;
    line-height: 1.4;
    margin: 0;
  }
  h1 { font-size: 24pt; margin: 0 0 8pt; color: #0a3d34; line-height: 1.15; }
  h2 { font-size: 14pt; margin: 0 0 4pt; color: #0a3d34; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 10pt 0 4pt; color: #1a4a40; }
  p { margin: 0 0 7pt; }
  .cover {
    min-height: 255mm;
    padding: 28pt 26pt;
    background: linear-gradient(160deg, #dceee8 0%, #f4f8f7 42%, #ffffff 100%);
    border: 1px solid #b9d0c8;
    border-radius: 10pt;
    display: flex; flex-direction: column; justify-content: center;
  }
  .eyebrow {
    text-transform: uppercase; letter-spacing: .14em; font-size: 8.5pt;
    color: #5a6a78; margin-bottom: 6pt; font-weight: 650;
  }
  .sub { font-size: 12pt; color: #334155; margin: 0 0 16pt; max-width: 90%; }
  .pills { margin: 8pt 0 18pt; }
  .pill {
    display: inline-block; background: #0c7c69; color: #fff;
    padding: 3pt 11pt; border-radius: 999pt; font-size: 9pt; margin: 0 6pt 6pt 0;
  }
  .pill.b { background: #1a5f8a; }
  .meta { font-size: 9pt; color: #5a6a78; margin-top: 22pt; }
  .slide { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
  .lead { color: #3a4654; margin: 0 0 8pt; }
  .shot {
    margin: 6pt 0 8pt; border: 1px solid #c9d4de; border-radius: 6pt;
    overflow: hidden; background: #eef2f5;
  }
  .shot img { width: 100%; display: block; }
  .talk { margin: 4pt 0 8pt 16pt; padding: 0; }
  .talk li { margin-bottom: 3pt; }
  table.fields { width: 100%; border-collapse: collapse; margin: 6pt 0 8pt; font-size: 8.5pt; }
  table.fields th, table.fields td {
    border: 1px solid #d5dde6; padding: 4pt 6pt; vertical-align: top; text-align: left;
  }
  table.fields th { background: #e8f3ef; color: #0a3d34; }
  table.fields td.f { font-family: ui-monospace, monospace; white-space: nowrap; background: #f7faf9; font-weight: 650; }
  .tip {
    background: #fff8e8; border-left: 3px solid #c9a227;
    padding: 7pt 9pt; margin: 6pt 0 0; font-size: 8.8pt;
  }
  .flow-box {
    background: #fff; border: 1px solid #c9d4de; border-radius: 8pt;
    padding: 12pt 14pt; margin: 10pt 0; font-size: 10pt;
  }
  .flow-box strong { color: #0c7c69; }
  .two-col { display: flex; gap: 14pt; margin-top: 10pt; }
  .two-col > div { flex: 1; background: #f3f8f6; border-radius: 8pt; padding: 12pt; }
  .footer-note { font-size: 8pt; color: #6b7785; margin-top: 10pt; }
</style>
</head>
<body>

<section class="cover">
  <div class="eyebrow">KTB ERP · Müşteri satış sunumu</div>
  <h1>Denim Tekstil Üretim A.Ş.<br/>Ekran ekran süreç turu</h1>
  <p class="sub">
    Gerçek sistem ekranlarıyla, dolu alanlarla anlatılan iki senaryo:
    <strong>Örnek 1</strong> — MRP’siz manuel plan; <strong>Örnek 2</strong> — MRP ile otomatik öneri.
    Her slaytta “bu alanda ne görüyorsunuz / neden var?” anlatımı yer alır.
  </p>
  <div class="pills">
    <span class="pill">Firma: TEKS</span>
    <span class="pill">Ö1 sipariş ${ozet.ornek1.siparis}</span>
    <span class="pill b">Ö2 sipariş ${ozet.ornek2.siparis} · MRP ${ozet.ornek2.mrp}</span>
  </div>
  <div class="flow-box">
    <strong>Sunum akışı:</strong>
    Ana veri (cari · stok · BOM · rota) →
    Örnek 1 zinciri (teklif → sipariş → satınalma → üretim → sevk → fatura) →
    Örnek 2 zinciri (bağımsız ihtiyaç → MRP → öneriler → belgeye dönüş)
  </div>
  <div class="meta">
    Hazırlayan: KTB ERP uygulama ekibi · Canlı ekran görüntüleri · ${new Date().toLocaleDateString('tr-TR')}
  </div>
</section>

<section class="slide page-break">
  <div class="eyebrow">Neden iki örnek?</div>
  <h2>Aynı tekstil firması, iki planlama dili</h2>
  <div class="two-col">
    <div>
      <h3>Örnek 1 — Manuel</h3>
      <p>Satış siparişi geldiğinde planlamacı BOM’u okur, satınalma talebini ve üretim emrini kendisi açar. Küçük parti / hızlı karar senaryosu.</p>
      <p><strong>${ozet.ornek1.qty} adet</strong> Slim 32 · sipariş <strong>${ozet.ornek1.siparis}</strong></p>
    </div>
    <div>
      <h3>Örnek 2 — MRP</h3>
      <p>Bağımsız ihtiyaç + satış siparişi MRP’ye girer; sistem net ihtiyaç ve öneri üretir (satınalma / üretim emri). Ölçeklenen operasyon.</p>
      <p><strong>${ozet.ornek2.qty} adet</strong> · MRP <strong>${ozet.ornek2.mrp}</strong> · ${ozet.mrp.net} net öneri satırı</p>
    </div>
  </div>
  <p class="lead" style="margin-top:14pt">Aşağıdaki slaytlar gerçek KTB ERP ekranlarından alınmıştır. Sarı alanlar seçilebilir/look-up; gri alanlar sistem veya salt-okunur kimlik alanlarıdır.</p>
</section>

${slide({
  pageBreak: true,
  eyebrow: 'Ana veri · 1/4',
  title: 'Cari kartı — müşteriyi bir kez tanıtın',
  lead: 'Moda Perakende Zinciri (M00017). Satış belgelerindeki müşteri, ödeme ve adres buradan beslenir.',
  shot: '01-cari-musteri.png',
  fields: [
    ['Cari kodu / adı', 'M00017 · Moda Perakende…', 'Belge satırlarında seçilen kimlik; tüm satış/finans hareketinin sahibi'],
    ['Vergi / iletişim', 'Kart üzerindeki vergi ve iletişim alanları', 'Fatura ve e-belge uyumu; müşteri iletişimi'],
    ['Ödeme koşulu', 'Cari varsayılanı', 'Sipariş/faturaya otomatik taşınır; vade yönetimi'],
    ['Sevk adresleri', 'Cari sevk adresi kaydı', 'Siparişte Adres sekmesine otomatik dolar'],
  ],
  tip: 'Satışta “müşteri kartı eksik” dememek için önce cariyi tam doldurun — belge ekranı sadece seçer.',
})}

${slide({
  eyebrow: 'Ana veri · 2/4',
  title: 'Stok kartı — mamulün DNA’sı',
  lead: 'U00006 Kot Pantolon Slim 32. Tip, tedarik şekli, fiyat, KDV, GTİP ve MRP sekmeleri tek kartta.',
  shot: '02-stok-mamul.png',
  fields: [
    ['Stok tipi', 'Mamul', 'Mamul / yarı mamul / hammadde ayrımı rapor ve MRP davranışını değiştirir'],
    ['Tedarik tipi', 'Üretim', 'MRP’ye “üret” önerisi üretir; Satınalma olsaydı “satın al” derdi'],
    ['Baz birim', 'AD – Adet', 'Tüm miktar alanlarının ortak dili'],
    ['Satış fiyatı / KDV', '890 · %20', 'Sipariş kalemine varsayılan fiyat ve vergi'],
    ['GTİP', '620342', 'İhracat / gümrük sınıflaması'],
    ['Sekmeler', 'Ölçü, Satınalma, MRP, Barkod…', 'Her departman kendi alanını aynı karttan yönetir'],
  ],
})}

${slide({
  eyebrow: 'Ana veri · 3/4',
  title: 'Ürün ağacı (BOM) — neyden üretilir?',
  lead: 'Kot pantolon için kumaş, fermuar, düğme ve panel reçetesi. Örnek 1’de planlamacı bunu okuyarak talep açar; Örnek 2’de MRP aynı ağacı patlatır.',
  shot: '03-urun-agaci.png',
  fields: [
    ['Ağaç kodu / adı', 'A00016 · Kot Pantolon…', 'Mamule bağlı reçete kimliği'],
    ['Bileşen satırları', 'H00044 kumaş, H00046 fermuar…', '1 mamul için gereken miktar ve depo'],
    ['Miktar', 'Birim başına bileşen', 'Sipariş × BOM = brüt ihtiyaç'],
  ],
  tip: 'BOM yoksa MRP “üret” diyemez; satınalma da körlemesine kalır.',
})}

${slide({
  eyebrow: 'Ana veri · 4/4',
  title: 'Rota — üretim sırası',
  lead: 'Kesim → Dikim → Yıkama → Ütü-Paket. İş merkezi ve süreler kapasite planının omurgasıdır.',
  shot: '04-rota.png',
  fields: [
    ['Rota kodu / adı', 'O00017 · Kot Pantolon Rota', 'Üretim emrine bağlanan süreç şablonu'],
    ['Operasyon sırası', 'Kesim, dikim, yıkama…', 'Atölyede hangi istasyonda ne yapılır'],
    ['Süre / iş merkezi', 'Operasyon satırları', 'Kapasite ve termin hesabı'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · MRP yok · 1',
  title: 'Satış teklifi — fırsatı belgeye dökün',
  lead: `ST00003. Müşteri henüz sipariş vermeden fiyat ve şartlar burada konuşulur; onaylanınca siparişe dönüşür.`,
  shot: '10-o1-teklif.png',
  bullets: [
    'Teklif numarası sistemden gelir; müşteri ve para birimi üst şeritte seçilir.',
    'Kalemlerde stok, miktar, birim fiyat, iskonto ve KDV girilir — siparişle aynı dil.',
    'Müşteri / dahili not alanları teklif aşamasındaki pazarlık izini tutar.',
  ],
  fields: [
    ['Teklif no', ozet.ornek1.teklif, 'Resmi teklif kimliği'],
    ['Müşteri', 'M00017', 'Cari kartından'],
    ['Kalem / fiyat', 'U00006 · birim fiyat', 'Siparişe kopyalanacak satır'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Satış siparişi · üst şerit',
  title: 'Sipariş B00019 — kompakt kimlik şeridi',
  lead: 'Müşteri onayladı. Üstte sadece kimlik / organizasyon / teslimat; finans kalemde, adres ayrı sekmede, notlar altta.',
  shot: '11-o1-siparis-ust.png',
  fields: [
    ['Sipariş no', 'B00019', 'Onaylı satış belgesi'],
    ['Durum', 'Onaylı', 'Sevk / iş emri için kapı açar'],
    ['Müş. sip. no', 'MPO-1001', 'Müşterinin kendi PO referansı'],
    ['Teklif', 'ST00003 bağlantısı', 'Tekliften dönüş izi'],
    ['Müşteri', 'M00017', 'Cari'],
    ['Teslim tarihi', '11/10/2026', 'Planlama ve sevk hedefi'],
    ['Teslimat koşulu', 'DAP', 'Incoterm — lojistik sorumluluk'],
    ['İş yeri / firma', 'TEKS-MRK / TEKS', 'Organizasyon kapsamı'],
  ],
  tip: 'Sunum cümlesi: “Başlık şişmez; operasyon kalemde, adres sekmede, not dipte.”',
})}

${slide({
  eyebrow: 'Örnek 1 · Satış siparişi · kalemler',
  title: 'Kalemler sekmesi — ne satıldığını burada görün',
  lead: '100 adet Slim 32, %5 iskonto, %20 KDV. Birim fiyat ve vergi satırda; genel toplam altta hesaplanır.',
  shot: '12-o1-siparis-kalem.png',
  fields: [
    ['Stok', 'U00006', 'Mamul kartı'],
    ['Miktar', '100', 'Üretim ve sevk ihtiyacının kaynağı'],
    ['Birim fiyat', '890', 'Satış fiyatı'],
    ['İskonto %', '5', 'Satır bazlı ticari şart'],
    ['KDV %', '20', 'Vergi'],
    ['Açıklama', 'ORNEK1 sipariş kalemi', 'Müşteriye görünen satır notu'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Satış siparişi · adres',
  title: 'Adres sekmesi — sevkiyat nereye?',
  lead: 'Cari seçilince sevk adresi, il/ilçe, posta kodu ve ülke otomatik gelir; gerekirse siparişe özel düzeltilir.',
  shot: '13-o1-siparis-adres.png',
  fields: [
    ['Sevk adresi', 'İstanbul OSB 1. Cad.', 'İrsaliye / sevk emrine taşınır'],
    ['İl / ilçe', 'İstanbul · Şişli', 'Lojistik bölge'],
    ['Posta / ülke', '34394 · TR', 'E-belge ve nakliye'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Satış siparişi · not & toplam',
  title: 'Müşteri notu, dahili not, finansal özet',
  lead: 'Dipte iki not: müşteriye giden ve içeride kalan. Sağda ara toplam → iskonto → KDV → genel toplam.',
  shot: '14-o1-siparis-not.png',
  fields: [
    ['Müşteri notu', 'Mağaza etiketli sevkiyat', 'İrsaliye / sevkte görünür operasyon notu'],
    ['Dahili not', 'Kapasite haftalık 50', 'Sadece iç ekip görür'],
    ['Genel toplam', '101.460,00', 'Onaylı finansal sonuç'],
  ],
  tip: 'Örnek 1’de MRP yok: planlamacı bu 100 adedi BOM ile çarpıp satınalma talebi ve üretim emrini elle açar.',
})}

${slide({
  eyebrow: 'Örnek 1 · Satınalma',
  title: 'Manuel satınalma talebi → sipariş',
  lead: `Talep ${ozet.ornek1.sa ? 'L00019' : 'L00019'} BOM×100 ile açıldı; tedarikçiye ${ozet.ornek1.sa} siparişi kesildi.`,
  shot: '15-o1-sa-talep.png',
  bullets: [
    'Talep: ihtiyaç nedeni, stok, miktar, termin ve notlar — onay sonrası siparişe dönüşür.',
    'Sipariş ekranında tedarikçi cari, teslim ve kalem fiyatları doldurulur (alış faturasına zemin).',
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Satınalma siparişi',
  title: 'Satınalma siparişi P00016 — tedarikçiye resmi talep',
  lead: 'Aynı kompakt kabuk: üst kimlik, kalemler, adres, notlar.',
  shot: '16-o1-sa-siparis.png',
  fields: [
    ['Sipariş no', ozet.ornek1.sa, 'Tedarikçiye giden belge'],
    ['Tedarikçi', 'Ege Denim / Aksesuar…', 'Cari kartı (satıcı)'],
    ['Kalemler', 'Hammadde satırları', 'Mal kabul ve alış faturasına kaynak'],
    ['Notlar', 'ORNEK1 satınalma…', 'Tedarikçi / iç iz'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Üretim',
  title: 'Üretim emri E00008 — atölyeye iş',
  lead: 'Sipariş kaleminden mamul, miktar, BOM ve rota bağlanır. Depolar (hammadde / mamul) netleşir.',
  shot: '17-o1-uretim.png',
  fields: [
    ['Emir no', ozet.ornek1.ue, 'Üretim belgesi'],
    ['Stok / miktar', 'U00006 · 100', 'Ne üretilecek'],
    ['BOM / rota', 'A00016 · O00017', 'Reçete ve operasyon sırası'],
    ['Depolar', 'Hammadde → Mamul', 'Malzeme çıkış / mamul giriş'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Sevk & irsaliye',
  title: 'Sevk emri → irsaliye — mal müşteriye',
  lead: 'Onaylı siparişten sevk; sevkten irsaliye. Adres ve kalemler zincir boyunca taşınır.',
  shot: '18-o1-sevk.png',
  bullets: [
    `Sevk ${ozet.ornek1.sevk}: hangi depodan, hangi kalem, ne kadar çıkacak.`,
    `İrsaliye ${ozet.ornek1.irsaliye}: yasal sevk belgesi; e-belge alanları ve taşıyıcı bilgisi.`,
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · İrsaliye ekranı',
  title: 'İrsaliye IR00006 — alanlar dolu',
  shot: '19-o1-irsaliye.png',
  fields: [
    ['İrsaliye no', ozet.ornek1.irsaliye, 'Sevk belgesi kimliği'],
    ['Cari / adres', 'M00017 + sevk adresi', 'Nereye gitti'],
    ['Kalemler', '100 adet U00006', 'Stok çıkış miktarı'],
    ['Notlar', 'ORNEK1 irsaliye…', 'Taşıma / müşteri notu'],
  ],
})}

${slide({
  eyebrow: 'Örnek 1 · Fatura',
  title: 'Satış faturası FA00006 — zincir kapanır',
  lead: 'İrsaliye / siparişten fatura. Ticari toplamlar, KDV ve müşteri notu burada kesinleşir.',
  shot: '20-o1-fatura.png',
  fields: [
    ['Fatura no', ozet.ornek1.fatura, 'Mali belge'],
    ['Kaynak', 'Sipariş / irsaliye', 'Çift fatura riskini azaltır'],
    ['Toplamlar', 'İskonto + KDV', 'Muhasebe ve tahsilat'],
  ],
  tip: 'Örnek 1 özeti: Teklif → Sipariş → (elle) Talep/SA → Üretim → Sevk → İrsaliye → Fatura. MRP tuşuna hiç basılmadı.',
})}

${slide({
  eyebrow: 'Örnek 2 · MRP var · giriş',
  title: 'Bağımsız ihtiyaç BI00005 — planı tetikleyen talep',
  lead: '250 adet Slim 32 için bağımsız ihtiyaç. Satış siparişi B00020 ile birlikte MRP havuzuna girer.',
  shot: '30-o2-bi.png',
  fields: [
    ['İhtiyaç no', ozet.ornek2.bi, 'MRP girdi belgesi'],
    ['Stok / miktar', 'U00006 · 250', 'Ne kadar planlanacak'],
    ['Termin / not', 'ORNEK2 bağımsız…', 'Planlama gerekçesi'],
  ],
})}

${slide({
  eyebrow: 'Örnek 2 · Satış siparişi',
  title: 'Sipariş B00020 — MRP’li senaryonun satış ayağı',
  lead: 'Jeans Outlet (M00018), 250 adet, proje PRJ-MRP. Aynı form kabuğu; fark planda.',
  shot: '31-o2-siparis.png',
  fields: [
    ['Sipariş no', ozet.ornek2.siparis, 'Ö2 satış belgesi'],
    ['Müşteri', 'M00018 Jeans Outlet', 'İkinci müşteri kartı'],
    ['Proje', 'PRJ-MRP', 'Plan/rapor boyut'],
    ['Miktar', '250', 'MRP brüt ihtiyaca eklenir'],
  ],
})}

${slide({
  eyebrow: 'Örnek 2 · MRP çalışması',
  title: 'MRP çalışması MR00004 — tek tuşla net ihtiyaç',
  lead: 'Çalışma kaydı: hangi firma/iş yeri, hangi ufuk, kim çalıştırdı. Sonuçlar ayrı ekranda.',
  shot: '32-o2-mrp-calisma.png',
  fields: [
    ['Çalışma no', ozet.ornek2.mrp, 'Tekrarlanabilir plan koşusu'],
    ['Açıklama', '250 adet bağımsız ihtiyaç…', 'İş gerekçesi'],
    ['Kapsam', 'TEKS / TEKS-MRK', 'Organizasyon filtresi'],
  ],
})}

${slide({
  eyebrow: 'Örnek 2 · MRP sonuçları',
  title: 'MRP sonuçları — sistem ne öneriyor?',
  lead: 'Net ihtiyaç > 0 satırlarda öneri: Satınalma veya Üretim emri. Yeterli stokta “Yeterli”.',
  shot: '33-o2-mrp-sonuc.png',
  bullets: [
    ...ozet.mrp.oneriler.slice(0, 6).map((o) => `<strong>${o.stok}</strong> net ${Number(o.net).toFixed(1)} → öneri: <strong>${o.oneri}</strong>`),
    'Seçilen satırlardan doğrudan «SA Talep» veya «Üretim Emri» üretilir — Örnek 1’deki elle açmanın otomatiği.',
  ],
  tip: 'Satış cümlesi: “Planlamacı Excel’e inmeden, ekrandan öneriyi belgeye çevirir.”',
})}

${slide({
  eyebrow: 'Örnek 2 · Öneriden belgeye',
  title: 'MRP → satınalma talebi L00020 → sipariş P00017',
  lead: 'Öneri satırları talebe, talep siparişe dönüştü. Notlarda MRP çalışma numarası iz olarak durur.',
  shot: '34-o2-sa-talep.png',
  fields: [
    ['Talep', ozet.ornek2.talep, 'MRP satınalma önerisinden'],
    ['SA sipariş', ozet.ornek2.sa, 'Tedarikçiye resmi PO'],
    ['İz', 'MR00004 referansı', 'Hangi çalışmadan geldiği'],
  ],
})}

${slide({
  eyebrow: 'Örnek 2 · Satınalma siparişi',
  title: 'P00017 — MRP sonrası tedarik',
  shot: '35-o2-sa-siparis.png',
  bullets: [
    'Üst şerit + kalemler + notlar yine aynı dil — kullanıcı yeni bir ekran öğrenmez.',
    'Fark: kalem miktarları MRP net ihtiyacından geldi.',
  ],
})}

${slide({
  eyebrow: 'Örnek 2 · Üretim emri',
  title: 'Üretim emri E00009 — MRP “üret” önerisi',
  lead: 'Mamul / yarı mamul için üretim önerisi emre döndü.',
  shot: '36-o2-uretim.png',
  fields: [
    ['Emir no', Array.isArray(ozet.ornek2.ue) ? ozet.ornek2.ue.join(', ') : ozet.ornek2.ue, 'MRP üretim önerisi'],
    ['Kaynak', 'MRP sonucu', 'Elle değil, öneriden'],
  ],
})}

${slide({
  eyebrow: 'Örnek 2 · Sevk & fatura',
  title: 'Sevk → fatura — satış tarafı Örnek 1 ile aynı',
  lead: `Sevk ${ozet.ornek2.sevk}, fatura ${ozet.ornek2.fatura}. Planlama değişti; müşteriye giden belge dili değişmedi.`,
  shot: '37-o2-sevk.png',
})}

${slide({
  eyebrow: 'Örnek 2 · Satış faturası',
  title: 'FA00007 — Örnek 2 kapanışı',
  shot: '38-o2-fatura.png',
  tip: 'Örnek 2 özeti: BI + Sipariş → MRP çalışması → Sonuçlardan SA talep / UE → Sevk → Fatura. Aynı form kabuğu, farklı planlama motoru.',
})}

<section class="slide page-break">
  <div class="eyebrow">Kapanış</div>
  <h2>Müşteriye bırakılacak mesaj</h2>
  <ul class="talk">
    <li><strong>Tek omurga:</strong> Cari, stok, BOM, rota bir kez tanımlanır; tüm belgeler bunları seçer.</li>
    <li><strong>Tek form dili:</strong> Teklif, sipariş, satınalma, sevk, fatura — kompakt üst şerit + kalem + adres + not.</li>
    <li><strong>İki planlama yolu:</strong> Küçük işte manuel (Ö1); büyüyünce MRP (Ö2) — ikisi de aynı ekranlardan.</li>
    <li><strong>İzlenebilirlik:</strong> Teklif→sipariş, MRP→talep, sevk→fatura bağlantıları kaybolmaz.</li>
  </ul>
  <div class="flow-box">
    Canlı veri: TEKS · Ö1 <strong>${ozet.ornek1.siparis}</strong> · Ö2 <strong>${ozet.ornek2.siparis}</strong> · MRP <strong>${ozet.ornek2.mrp}</strong><br/>
    Yeniden üretmek: <code>node scripts/purge-firma-veri.js TEKS && node scripts/demo-teks-ornek12.js && node scripts/capture-teks-sunum-ekranlari.js && node scripts/build-teks-kilavuz-pdf.js</code>
  </div>
  <p class="footer-note">Bu doküman satış sunumu içindir; ekran görüntüleri KTB ERP canlı oturumundan alınmıştır.</p>
</section>

</body>
</html>`;

async function main() {
  const missing = [
    '01-cari-musteri.png', '11-o1-siparis-ust.png', '33-o2-mrp-sonuc.png', '38-o2-fatura.png',
  ].filter((f) => !fs.existsSync(path.join(shotDir, f)));
  if (missing.length) {
    console.error('Eksik ekran görüntüsü. Önce çalıştırın: node scripts/capture-teks-sunum-ekranlari.js');
    console.error(missing);
    process.exit(1);
  }

  const tmp = '/tmp/teks-sunum.html';
  fs.writeFileSync(tmp, html);
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.goto(`file://${tmp}`, { waitUntil: 'networkidle0', timeout: 120000 });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '12mm', left: '9mm', right: '9mm' },
  });
  await browser.close();
  fs.writeFileSync(outPdf, pdf);
  fs.mkdirSync(path.dirname(outArtifact), { recursive: true });
  fs.writeFileSync(outArtifact, pdf);
  fs.writeFileSync(outArtifactAlias, pdf);
  console.log(JSON.stringify({
    ok: true,
    pdf: outPdf,
    artifact: outArtifact,
    bytes: pdf.length,
    pagesHint: 'cover + ~24 slides',
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
