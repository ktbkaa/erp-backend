/**
 * Modül tanıtım HTML dokümanı üretir (görsellerle).
 *   node scripts/build-modul-tanitim-html.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'docs', 'modul-tanitim');
const SHOTS = path.join(ROOT, 'shots');
const OUT = path.join(ROOT, 'KTB_ERP_Modul_Tanitim.html');

function img(file, alt) {
  const p = path.join(SHOTS, file);
  if (!fs.existsSync(p)) {
    return `<p class="missing">[Görsel yok: ${file}]</p>`;
  }
  return `<figure class="shot"><img src="shots/${file}" alt="${alt || file}" /><figcaption>${alt || ''}</figcaption></figure>`;
}

function section(title, body) {
  return `<section class="mod"><h2>${title}</h2>${body}</section>`;
}

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KTB ERP — Modül Tanıtım Rehberi</title>
<style>
  :root {
    --ink: #15202b; --muted: #4a5a68; --brand: #0a3d34; --accent: #0c7c69;
    --line: #c9d4de; --bg: #f4f7f9; --card: #fff; --tip: #fff8e8; --tip-b: #c9a227;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Segoe UI", "DejaVu Sans", sans-serif;
    color: var(--ink); background: var(--bg); line-height: 1.45; font-size: 15px;
  }
  .wrap { width: min(980px, calc(100% - 2rem)); margin: 0 auto 3rem; }
  .cover {
    margin: 1.25rem 0 2rem; padding: 2.2rem 2rem;
    background: linear-gradient(155deg, #d7ebe4, #f7faf9 45%, #fff);
    border: 1px solid #b7cfc6; border-radius: 14px;
  }
  .eyebrow { text-transform: uppercase; letter-spacing: .1em; font-size: .75rem; color: var(--muted); font-weight: 700; }
  h1 { margin: .2rem 0 .6rem; font-size: 2rem; color: var(--brand); line-height: 1.15; }
  h2 { margin: 2rem 0 .6rem; font-size: 1.45rem; color: var(--brand); border-bottom: 2px solid #cfe3dc; padding-bottom: .35rem; }
  h3 { margin: 1.2rem 0 .4rem; font-size: 1.08rem; color: #1a4a40; }
  h4 { margin: .9rem 0 .3rem; font-size: .98rem; color: #234; }
  p, li { color: #243040; }
  .lead { font-size: 1.05rem; color: #334155; max-width: 46rem; }
  .toc { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.2rem; }
  .toc ol { margin: .4rem 0 0; padding-left: 1.2rem; }
  .toc a { color: var(--accent); text-decoration: none; }
  .shot {
    margin: .7rem 0 1rem; border: 1px solid var(--line); border-radius: 8px;
    overflow: hidden; background: #eef2f5;
  }
  .shot img { width: 100%; display: block; }
  .shot figcaption { font-size: .82rem; color: var(--muted); padding: .4rem .7rem; background: #f8fafb; }
  .tip {
    background: var(--tip); border-left: 4px solid var(--tip-b);
    padding: .7rem .85rem; margin: .7rem 0 1rem; border-radius: 0 8px 8px 0;
  }
  .box {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: .85rem 1rem; margin: .7rem 0 1rem;
  }
  .flow { font-weight: 650; color: var(--accent); }
  table { width: 100%; border-collapse: collapse; margin: .5rem 0 1rem; font-size: .9rem; }
  th, td { border: 1px solid var(--line); padding: .45rem .55rem; text-align: left; vertical-align: top; }
  th { background: #e8f3ef; color: var(--brand); }
  .pill { display: inline-block; background: var(--accent); color: #fff; padding: .15rem .55rem; border-radius: 999px; font-size: .78rem; margin-right: .3rem; }
  .mod { margin-bottom: 1.5rem; }
  .page-break { page-break-before: always; }
  @media print {
    body { background: #fff; font-size: 10.5pt; }
    .wrap { width: 100%; margin: 0; }
    .shot { break-inside: avoid; max-height: 110mm; }
    .shot img { max-height: 105mm; object-fit: contain; object-position: top; }
    h2 { break-after: avoid; }
    .cover { break-after: page; }
  }
</style>
</head>
<body>
<div class="wrap">

<div class="cover">
  <div class="eyebrow">KTB ERP · Kullanıcı rehberi</div>
  <h1>Modül Tanıtım Rehberi</h1>
  <p class="lead">Bu doküman, sistemi hiç bilmeyen birinin ekranları tanıyıp günlük işini yapabilmesi içindir.
  Her modülde <strong>ne işe yaradığı</strong>, <strong>ana ekranların görüntüsü</strong> ve
  <strong>ekrandaki düğme/başlıkların kullanımı</strong> anlatılır.</p>
  <p><span class="pill">Görseller canlı sistemden</span><span class="pill" style="background:#1a5f8a">Türkçe arayüz</span></p>
  <p style="color:var(--muted);font-size:.9rem;margin:1rem 0 0">Güncelleme: 8 Kasım 2026 (Europe/Istanbul) · Uygulama: http://localhost:3000</p>
</div>

<nav class="toc">
  <strong>İçindekiler</strong>
  <ol>
    <li><a href="#giris">Sisteme giriş ve ortak kullanım</a></li>
    <li><a href="#ana-veri">Ana Veri (Firma, iş yeri, depo)</a></li>
    <li><a href="#stok">Stok</a></li>
    <li><a href="#cari">Cari</a></li>
    <li><a href="#uretim">Üretim</a></li>
    <li><a href="#satinalma">Satınalma</a></li>
    <li><a href="#crm">CRM</a></li>
    <li><a href="#proje">Proje Yönetimi</a></li>
    <li><a href="#satis">Satış</a></li>
    <li><a href="#kalite">Kalite</a></li>
    <li><a href="#onay">Onay Yönetimi</a></li>
    <li><a href="#finans">Finans</a></li>
    <li><a href="#ik">İnsan Kaynakları</a></li>
    <li><a href="#sistem">Sistem ve Sabit Tanımlar</a></li>
    <li><a href="#akis">Uçtan uca iş akışları</a></li>
  </ol>
</nav>

${section('1) Sisteme giriş ve ortak kullanım', `
<p id="giris">Adrese girdiğinizde giriş ekranı çıkar. Kullanıcı kodu ve şifre ile oturum açarsınız.
Sağ üstte kullanıcı adı, solda menü, ortada çalışma alanı görünür.</p>
${img('00-shell-anasayfa.png', 'Ana kabuk — menü, üst bar ve çalışma alanı')}
${img('00-shell-menu.png', 'Sol menüden modül seçimi')}

<div class="box">
  <h4>Her liste ekranında ortak parçalar</h4>
  <table>
    <tr><th>Bölüm</th><th>Ne işe yarar?</th></tr>
    <tr><td><strong>Yeni / İncele / Düzelt / Kopyala / Sil</strong></td>
        <td>Kayıt oluşturma, okuma, düzenleme, kopyalama, silme. Önce listeden satır seçilir (Yeni hariç).</td></tr>
    <tr><td><strong>Filtre</strong></td>
        <td>Firma, kod, ad gibi alanlarla listeyi daraltırsınız. <em>Uygula</em> çalıştırır, <em>Temizle</em> sıfırlar.</td></tr>
    <tr><td><strong>Liste</strong></td>
        <td>Kayıtların tablo hâli. Satıra tıklayınca seçilir; İncele/Düzelt ile form açılır.</td></tr>
    <tr><td><strong>Alt sekmeler</strong></td>
        <td>Açık ekranlar altta sekmeler olarak durur; aralarında geçiş yapabilirsiniz.</td></tr>
    <tr><td><strong>Firma profili</strong> (üst bar)</td>
        <td>Hangi firmanın verisini gördüğünüzü seçer. Yanlış firmadaysanız liste boş gelebilir.</td></tr>
    <tr><td><strong>Ekran arama</strong></td>
        <td>Üstteki kutuya en az 3 harf yazarak ekran bulursunuz.</td></tr>
  </table>
</div>
<div class="tip"><strong>İpucu:</strong> Birçok ekranda form sekmeleri vardır (ör. Genel, Kalemler, Notlar).
Sekmeler aynı belgenin farklı bölümleridir; kaydetmeden sekme değiştirmek veriyi kaybetmez, ama işiniz bitince kaydedin.</div>
`)}

${section('2) Ana Veri — organizasyon iskeleti', `
<p id="ana-veri">Ana Veri olmadan diğer modüller çalışmaz. Önce <strong>Firma</strong>, sonra <strong>İş yeri</strong>, sonra <strong>Depo</strong> tanımlanır.</p>
<h3>Firmalar</h3>
<p>Şirket kartı: unvan, vergi, adres, para birimi. Çok firmalı kullanımda her kullanıcının göreceği firmalar yetkiyle sınırlanır.</p>
${img('01-firmalar.png', 'Firmalar listesi')}
<h3>İş Yerleri</h3>
<p>Fabrika / şube. Üretim, depo ve MRP iş yeri üzerinden bağlanır.</p>
${img('01-is-yerleri.png', 'İş yerleri')}
<h3>Depolar</h3>
<p>Hammadde, mamul, giriş, kalite (GKK/CKK) gibi roller. Mal kabul ve üretim doğru depoya yazılmalıdır.</p>
${img('01-depolar.png', 'Depolar')}
<div class="tip">İlk kurulumda sıra: Firma → İş yeri → Depolar → Stok/Cari kartları.</div>
`)}

${section('3) Stok', `
<p id="stok">Stok modülü ürünleri tanımlar, depodaki miktarı gösterir, giriş-çıkış hareketlerini tutar ve MRP ile ihtiyaç planlar.</p>

<h3>Stok Kartı (ana ekran)</h3>
<p>Her malzeme/mamul/hizmet için bir kart. Tip (Hammadde, Mamul…), tedarik şekli (Satınalma/Üretim), birim ve fiyat burada tanımlanır.</p>
${img('02-stok-karti-liste.png', 'Stok Kartı — liste, filtre ve aksiyonlar')}
${img('02-stok-karti-form.png', 'Stok Kartı — kayıt formu / sekmeler')}
<div class="box">
  <h4>Listede dikkat edilecekler</h4>
  <ul>
    <li><strong>Stok kodu / adı:</strong> belgelerde seçilecek kimlik.</li>
    <li><strong>Tip:</strong> Hammadde, yarı mamul, mamul, ticari, hizmet.</li>
    <li><strong>Tedarik:</strong> Satınalma mı üretim mi? MRP buna göre talep veya iş emri önerir.</li>
    <li><strong>Yeni:</strong> yeni kart. <strong>İncele/Düzelt:</strong> mevcut kartı açar.</li>
  </ul>
</div>

<h3>Depo Bakiye</h3>
<p>Hangi depoda ne kadar var? Rapor niteliğindedir; buradan stok “üretilmez”, sadece görülür.</p>
${img('02-depo-bakiye.png', 'Depo bakiye')}

<h3>Stok Hareketleri</h3>
<p>Giriş, çıkış, transfer, sayım, fire gibi hareketlerin belgesi. Elle düzeltme veya süreçlerin otomatik yazdığı kayıtlar burada izlenir.</p>
${img('02-stok-hareketleri.png', 'Stok hareketleri')}

<h3>MRP Çalıştır</h3>
<p>Bağımsız ihtiyaç ve siparişlere göre malzeme planı üretir. Sonuçlardan satınalma talebi veya üretim emri doğabilir.</p>
${img('02-mrp-calistir.png', 'MRP çalıştır')}
`)}

${section('4) Cari', `
<p id="cari">Müşteri ve tedarikçi kartları ile tahsilat/ödeme. Satış ve satınalma belgeleri cariye bağlanır.</p>
<h3>Cari Kartları</h3>
<p>Musteri, Tedarikçi veya her ikisi. Adres, vergi, ödeme koşulu burada tutulur.</p>
${img('03-cari-kartlari-liste.png', 'Cari kartları listesi')}
${img('03-cari-kartlari-form.png', 'Cari kart formu')}
<h3>Tahsilat / Ödeme</h3>
<p>Faturaya bağlı nakit hareketi. Kasa veya banka hesabı seçilir.</p>
${img('03-tahsilat-odemeler.png', 'Tahsilat / ödeme')}
`)}

${section('5) Üretim', `
<p id="uretim">Ürünün nasıl üretileceğini (ürün ağacı + rota) ve iş emirlerini yönetir.</p>
<h3>Ürün Ağacı (BOM)</h3>
<p>Mamulün hangi malzemelerden, hangi miktarla oluştuğu. MRP ve iş emri buradan patlatır.</p>
${img('04-urun-agaci.png', 'Ürün ağacı')}
<h3>Rotalar</h3>
<p>İş merkezleri ve operasyon sırası (kesme, montaj, test…). Süre ve istasyon bilgisi burada.</p>
${img('04-rotalar.png', 'Rotalar')}
<h3>Üretim Emirleri</h3>
<p>Fiilî iş emri: miktar, depolar, operasyon tamamlama, mamul giriş. Satış siparişinden veya MRP’den gelebilir.</p>
${img('04-uretim-emirleri-liste.png', 'Üretim emirleri listesi')}
${img('04-uretim-emirleri-form.png', 'Üretim emri formu')}
<div class="tip"><span class="flow">Akış:</span> Ürün ağacı + Rota hazır → Üretim emri oluştur/onayla → Operasyonları tamamla → Çıkış kalite (CKK) → Mamul depo.</div>
`)}

${section('6) Satınalma', `
<p id="satinalma">Malzeme ihtiyacını dışarıdan karşılar: talep → sipariş → mal kabul → (isteğe bağlı) giriş kontrol / GKK → alış faturası.</p>
<h3>Satınalma Talepleri</h3>
<p>İç ihtiyaç belgesi. MRP veya manuel açılır; sonra siparişe dönüşür.</p>
${img('05-sa-talepleri.png', 'Satınalma talepleri')}
<h3>Satınalma Siparişleri</h3>
<p>Tedarikçiye verilen sipariş. Onay süreci varsa Onay modülüne düşer.</p>
${img('05-sa-siparisleri.png', 'Satınalma siparişleri')}
<h3>Mal Kabuller</h3>
<p>Fiziksel giriş. Stok önce giriş/kalite deposuna düşebilir.</p>
${img('05-mal-kabuller.png', 'Mal kabuller')}
<h3>Giriş Kontrolleri</h3>
<p>Ürün/miktar tutuşması sonrası GKK’ya aktarım. Kalite sürecinin ilk kapısıdır.</p>
${img('05-giris-kontrolleri.png', 'Giriş kontrolleri')}
`)}

${section('7) CRM', `
<p id="crm">Satış öncesi ilişki: aday → kontak → fırsat → faaliyet/görev → ajanda. Teklif ve siparişle bağlanabilir.</p>
<h3>Müşteri Adayları</h3>
<p>Henüz cari olmayan potansiyel müşteri.</p>
${img('06-crm-adaylar.png', 'CRM adaylar')}
<h3>Fırsatlar</h3>
<p>Tutara ve aşamaya bağlı satış fırsatı; kalem satırları olabilir.</p>
${img('06-crm-firsatlar.png', 'CRM fırsatlar')}
<h3>Faaliyetler / Ajanda</h3>
<p>Arama, ziyaret, toplantı kayıtları ve takvim.</p>
${img('06-crm-faaliyetler.png', 'CRM faaliyetler')}
${img('06-crm-ajanda.png', 'CRM ajanda')}
`)}

${section('8) Proje Yönetimi', `
<p id="proje">İşleri proje çatısında planlar: proje kartı, iş kalemleri, sprint/board, bütçe ve risk.
Satış siparişi veya üretimle <em>project_code</em> üzerinden bağlanabilir.</p>
<h3>Proje Listesi</h3>
${img('07-prj-projeler.png', 'Projeler')}
${img('07-prj-proje-form.png', 'Proje formu')}
<h3>İşler ve Kanban Board</h3>
<p>İş kalemleri liste veya tahta görünümünde yönetilir; durum sütunları arasında sürüklenir.</p>
${img('07-prj-isler.png', 'Proje işleri')}
${img('07-prj-board.png', 'Kanban board')}
`)}

${section('9) Satış', `
<p id="satis">Tekliften tahsilata kadar müşteri süreci.</p>
<div class="box flow">Teklif → Sipariş → Sevk emri → İrsaliye → Fatura → Tahsilat</div>
<h3>Satış Teklifleri / Siparişleri</h3>
${img('08-satis-teklifleri.png', 'Satış teklifleri')}
${img('08-satis-siparisleri.png', 'Satış siparişleri')}
<h3>Sevk Emirleri</h3>
<p>Depodan çıkacak miktarın planı.</p>
${img('08-sevk-emirleri.png', 'Sevk emirleri')}
<h3>İrsaliye ve Fatura Yönetimi</h3>
<p>Sevkiyat belgesi ve satış faturası; e-belge alanları burada izlenir.</p>
${img('08-irsaliye.png', 'İrsaliye yönetimi')}
${img('08-fatura.png', 'Fatura yönetimi')}
`)}

${section('10) Kalite', `
<p id="kalite">Giriş (GKK) ve çıkış (CKK) kalite emirleri, kontrol planları, uygunsuzluk ve CAPA.</p>
<h3>Giriş Kalite Emirleri (GKK)</h3>
<p>Mal kabul / giriş kontrol sonrası stok “Kalitede” iken onay veya red. Onaylanınca hammadde deposuna geçer.</p>
${img('09-gkk.png', 'Giriş kalite emirleri')}
<h3>Çıkış Kalite Emirleri (CKK)</h3>
<p>Üretim sonrası mamul kalitesi. Onaylanınca mamul depoda kullanılabilir olur.</p>
${img('09-ckk.png', 'Çıkış kalite emirleri')}
<h3>Kontrol Planları</h3>
<p>Ölçüm kriterleri ve kabul aralıkları.</p>
${img('09-kk-planlari.png', 'KK kontrol planları')}
<div class="tip">Kalite ekranlarında genelde <strong>Yeni</strong> yoktur; emir süreçten doğar. <strong>İncele / Düzelt / Onayla</strong> kullanılır.</div>
`)}

${section('11) Onay Yönetimi', `
<p id="onay">Belge onayları (ör. satınalma siparişi) kural ve rota ile yürür.</p>
<h3>Onaylarım</h3>
<p>Size düşen bekleyen onaylar. İnceleyip onay/red verirsiniz.</p>
${img('10-onaylarim.png', 'Onaylarım')}
<h3>Onay Rotası (tanım)</h3>
<p>Hangi belge hangi sırayla kimlere gider — yöneticinin kurduğu iskelet.</p>
${img('10-onay-rota.png', 'Onay rotası tanımı')}
`)}

${section('12) Finans', `
<p id="finans">Muhasebe ve nakit: hesap planı, fişler, kasa/banka, mizan, kokpit.</p>
<h3>Hesap Planı</h3>
${img('11-hesap-plani.png', 'Hesap planı')}
<h3>Kasa / Banka</h3>
${img('11-kasa.png', 'Kasa hesapları')}
${img('11-banka.png', 'Banka hesapları')}
<h3>Mizan ve Kokpit</h3>
<p>Mizan dönem bakiyelerini; kokpit özet göstergeleri gösterir.</p>
${img('11-mizan.png', 'Mizan')}
${img('11-kokpit.png', 'Finans kokpit')}
`)}

${section('13) İnsan Kaynakları', `
<p id="ik">Personel, izin, puantaj, bordro ve işe alım.</p>
<h3>Personel Kartları</h3>
${img('12-hr-personel-liste.png', 'Personel listesi')}
${img('12-hr-personel-form.png', 'Personel formu')}
<h3>İzin Talepleri</h3>
<p>Çalışan izin ister; onay sonrası bakiye düşer.</p>
${img('12-hr-izin.png', 'İzin talepleri')}
<h3>Bordro Çalışmaları</h3>
<p>Dönem seçilir, brütten nete hesaplanır, onay/kesinleştirme yapılır.</p>
${img('12-hr-bordro.png', 'Bordro çalışmaları')}
<h3>İş İlanları</h3>
${img('12-hr-ilanlar.png', 'İş ilanları')}
`)}

${section('14) Sistem ve Sabit Tanımlar', `
<p id="sistem">Numaratörler (belge numarası serileri), ölçü birimi, para birimi, kullanıcı ve sistem parametreleri.</p>
${img('13-numarator.png', 'Numaratör tanımı — belge numaralarının kaynağı')}
${img('13-kullanicilar.png', 'Kullanıcılar')}
${img('13-sistem-parametreleri.png', 'Sistem parametreleri')}
<div class="tip">Numaratör bozulursa yeni belgeler numara alamaz. Serilere dokunmadan önce yedek alın.</div>
`)}

${section('15) Uçtan uca iş akışları (özet)', `
<p id="akis">Modülleri ezberlemek yerine şu iki ana yolu aklınızda tutun:</p>
<div class="box">
  <p><strong>Satış (müşteriye):</strong></p>
  <p class="flow">CRM fırsat → Satış teklifi → Satış siparişi → (gerekirse üretim) → Sevk → İrsaliye → Fatura → Tahsilat</p>
  <p><strong>Satınalma + üretim (tedarik/imalat):</strong></p>
  <p class="flow">MRP / talep → SA siparişi → Mal kabul → Giriş kontrol → GKK → Üretim emri → CKK → Mamul stok → Sevk</p>
</div>
<p>Her adım bir önceki belgenin devamıdır. Listede belge numarası ve durum sütunu sürecin neresinde olduğunuzu gösterir.</p>
`)}

<footer style="margin:2.5rem 0 1rem;color:var(--muted);font-size:.85rem;border-top:1px solid var(--line);padding-top:.8rem">
  KTB ERP Modül Tanıtım Rehberi · Görseller: <code>docs/modul-tanitim/shots</code> ·
  Yeniden çekmek için: <code>node scripts/capture-modul-tanitim-shots.js</code> ·
  HTML yenilemek: <code>node scripts/build-modul-tanitim-html.js</code>
</footer>

</div>
</body>
</html>`;

fs.mkdirSync(ROOT, { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log('Yazıldı:', OUT);
console.log('Boyut:', fs.statSync(OUT).size, 'bayt');
