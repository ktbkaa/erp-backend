/**
 * KTB ERP — tüm ekranlar sunum PDF’i (işlev odaklı).
 * Önce screens-live.json gerekir (betik içinde üretir).
 *   node scripts/build-tam-ekran-sunum-pdf.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const outPdf = path.join(ROOT, 'docs', 'KTB_ERP_Tum_Ekranlar_Sunum.pdf');
const outArtifact = '/opt/cursor/artifacts/KTB_ERP_Tum_Ekranlar_Sunum.pdf';
const shotDirs = [
  path.join(ROOT, 'docs', 'ekran-katalog', 'shots'),
  path.join(ROOT, 'docs', 'teks-sunum-shots'),
  path.join(ROOT, 'docs', 'onay-dokuman-shots'),
  '/opt/cursor/artifacts',
];

function extractScreens() {
  const src = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');
  const start = src.indexOf('const MODULES = [');
  let i = src.indexOf('[', start);
  let depth = 0;
  let end = -1;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && n === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && n === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && n === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const arr = src.slice(src.indexOf('[', start), end);
  const ctx = {};
  vm.runInNewContext(`MODULES = ${arr};`, ctx);
  const out = [];
  for (const mod of ctx.MODULES) {
    for (const s of mod.screens || []) {
      if (!s?.id) continue;
      out.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        sectionTitles: (mod.sections || [])
          .filter((sec) => (sec.screenIds || []).includes(s.id))
          .map((sec) => sec.title || sec.id),
        id: s.id,
        techId: s.techId || null,
        title: s.title,
        endpoint: s.endpoint || null,
        crud: !(s.crud === false || s.readOnly === true || s.hideActions === true),
        readOnly: !!s.readOnly,
        hidden: !!s.hidden,
        deprecated: !!s.deprecated,
        helpText: s.helpText || null,
        numeratorSeri: s.numeratorSeri || null,
        approveAction: s.approveAction?.label || null,
        convertAction: s.convertAction?.label || null,
        filters: (s.filters || []).map((f) => f.label || f.key),
        columns: (s.columns || []).slice(0, 10).map((c) => c.label || c.key),
      });
    }
  }
  return out;
}

/** Ekran id → kısa işlev açıklaması (sunum dili) */
const BLURBS = {
  'numarator-tanimi': 'Belge ve kart kodlarının otomatik numarasını üretir (seri, önek, uzunluk).',
  'olcu-birimleri': 'Adet, kg, mt gibi ölçü birimlerini tanımlar; stok ve belgeler buradan seçer.',
  'kategori-tanimi': 'ABC, marka, sektör, bölge vb. sınıflandırma kodlarını tutar.',
  'ulke-tanimi': 'Ülke listesi; cari adres ve belge sevk/fatura ülkesi için kaynak.',
  'para-birimi-tanimi': 'TRY, EUR, USD… para birimleri; kur ve belge PB alanlarının kaynağı.',
  'sehir-tanimi': 'İl / şehir tanımları; adres lookup’larında kullanılır.',
  'ilce-tanimi': 'İlçeler; şehir ile ilişkili adres alanları.',
  'odeme-kosulu-tanimi': 'Peşin, 30 gün vb. ödeme koşulları; sipariş ve faturada seçilir.',
  'teslimat-kosulu-tanimi': 'Incoterms / teslim şekilleri (FOB, DAP…).',
  'dil-tanimi': 'Sistem ve belge dilleri.',
  'banka-tanimi': 'Banka kartları; firma/cari IBAN ve finans banka hesaplarında kullanılır.',
  'doviz-kur-tanimi': 'Günlük alış/satış kurları; dövizli belgelerde çeviri.',
  'hareket-kodlari': 'Belge tipine göre hareket anahtarları (satış, irsaliye, fatura, stok…).',
  kullanicilar: 'Kullanıcı hesapları, şifre, grup ve ekran yetkileri.',
  'kullanici-gruplari': 'Rol grupları ve modül yetki paketleri.',
  'sistem-parametreleri': 'Firma/genel sistem ayarları.',
  'audit-log': 'Kim ne zaman hangi kaydı değiştirdi — denetim izi.',
  'eposta-gonderimleri': 'Sistemden giden e-postaların kaydı.',
  'tablo-bilgileri': 'Ekran → tablo → alan kataloğu; F1 alan yardımı kaynağı.',
  firmalar: 'Çok firmalı yapıda tüzel kişilik / şirket kartları.',
  'is-yerleri': 'Firma altındaki iş yerleri / tesisler.',
  depolar: 'Stok depoları; sevk, irsaliye ve üretim depo seçimleri.',
  'stok-karti': 'Malzeme/mamul kartı: birim, fiyat, depo, parti, satış/satınalma özellikleri.',
  'depo-bakiye': 'Depo bazında anlık stok bakiyesi (salt okunur özet).',
  'stok-hareketleri': 'Giriş/çıkış/transfer/fire hareketleri; stok defteri.',
  'transfer-emirleri': 'Depolar arası transfer belgesi ve onayı.',
  'sayim-belgeleri': 'Sayım fişi; farkların stoka işlenmesi.',
  'stok-partileri': 'Parti/lot takibi.',
  'stok-serileri': 'Seri numarası takibi.',
  'stok-rezervasyonlari': 'Sipariş/iş emri için ayrılmış stok.',
  'stok-ikame': 'İkame malzeme ilişkileri.',
  'mrp-bagimsiz-ihtiyac': 'MRP’ye giren bağımsız ihtiyaç talepleri.',
  'mrp-calisma': 'MRP çalıştırma ve parametreler.',
  'mrp-sonuclar': 'MRP önerileri (satınalma / üretim).',
  'cari-kartlari': 'Müşteri/tedarikçi kartı: adres, vergi, risk, ödeme.',
  'cari-ekstre': 'Cari hesap hareket dökümü.',
  'tahsilat-odemeler': 'Tahsilat ve ödeme fişleri; cari bakiyeyi etkiler.',
  'urun-agaci': 'BOM — mamulün bileşen ağacı; patlatma/MRP girdisi.',
  'urun-agaci-patlatma': 'Belirli miktarda mamul için tüm seviye ihtiyaç listesi.',
  rotalar: 'Üretim operasyon sırası ve iş merkezleri.',
  'is-merkezleri': 'Makine/hat/iş merkezi tanımları.',
  'uretim-emri-tipleri': 'İş emri tipleri ve varsayılanlar.',
  'uretim-planlari': 'Üretim planı satırları.',
  'uretim-emirleri': 'İş emri: BOM/rota uygula, başlat, tamamla.',
  'toplu-is-emri': 'Birden fazla sipariş kaleminden toplu iş emri.',
  'uretim-girisleri': 'Mamul stok girişleri.',
  'stok-siniflari': 'Stok sınıflandırma tanımları.',
  'satin-alma-talepleri': 'İç talep; onay sonrası teklif/siparişe döner.',
  'satin-alma-teklifleri': 'Tedarikçi teklifleri; siparişe dönüşüm.',
  'satin-alma-anlasmalari': 'Çerçeve / fiyat anlaşmaları.',
  'satin-alma-siparisleri': 'Satınalma siparişi; mal kabule bağlanır.',
  'mal-kabuller': 'Mal kabul; tedarikçi irsaliyesinden, alış faturasına.',
  'tedarikci-irsaliyeleri': 'Gelen irsaliye kayıtları.',
  'crm-adaylar': 'Potansiyel müşteri; cariye dönüştürme.',
  'crm-kontaklar': 'Kişi / kontak kartları.',
  'crm-firsatlar': 'Satış fırsatı pipeline; teklife dönüşüm.',
  'crm-faaliyetler': 'Görüşme, arama, görev faaliyetleri.',
  'crm-faaliyet-planlari': 'Planlı faaliyetler.',
  'crm-gorevler': 'CRM görev listesi ve kapatma.',
  'crm-ajanda': 'Takvim / ajanda görünümü.',
  'crm-firsat-asamalari': 'Fırsat aşama tanımları (kazanan/kaybeden).',
  'crm-faaliyet-tipleri': 'Faaliyet tipi tanımları.',
  'satis-teklifleri': 'Satış teklifi; siparişe dönüştür.',
  'satis-siparisleri': 'Satış siparişi; sevk, irsaliye, iş emri bağlantıları.',
  'sevk-emirleri': 'Sevkiyat planı; irsaliye oluştur.',
  'irsaliye-yonetimi': 'Satış irsaliyesi: onay (stok çıkış), e-İrsaliye, faturaya dönüşüm.',
  'fatura-yonetimi': 'Alış ve satış faturaları tek ekranda; muhasebeleştirme, 3-way eşleştirme.',
  'kk-emirleri-gkk': 'Giriş kalite kontrol emirleri.',
  'kk-emirleri-ckk': 'Çıkış kalite kontrol emirleri.',
  'kk-uygunsuzluklar': 'Uygunsuzluk kayıtları.',
  'kk-capa': 'Düzeltici / önleyici faaliyet (CAPA).',
  'kk-kontrol-planlari': 'Kalite kontrol plan tanımları.',
  'kk-stok-planlari': 'Stok–kontrol plan eşlemesi.',
  'kk-ret-nedenleri': 'Ret nedeni tanımları.',
  onaylarim: 'Bana düşen onay bekleyen belgeler.',
  'onay-izleme': 'Tüm onay süreçlerinin izlenmesi.',
  'onay-yetki-devri': 'Onay yetkisini geçici devretme.',
  'onay-rol-tanim': 'Onay rolleri (kim onaylar).',
  'onay-kural-tanim': 'Hangi ekranda / koşulda onay gerekir.',
  'onay-rota-tanim': 'Onay adımları ve sıra.',
  'onay-mesaj-sablon': 'Onay e-posta / mesaj şablonları.',
  'onay-durum-tanim': 'Onay durum kodları.',
  'hesap-plani': 'Muhasebe hesapları (Ana/Üst/Doğrudan); ülke paketine göre.',
  'hesap-belirleme-kurallari': 'Fatura vb. belgenin hangi hesaplara yazılacağı.',
  'finans-vergi-kodlari': 'KDV/USt/BTW kodları ve tarihli oranlar.',
  'muhasebe-donemleri': 'Mali dönem aç/kapa; kapalı döneme kesin fiş engeli.',
  'muhasebe-belgeleri': 'Muhasebe fişi: borç=alacak, kesinleştir, ters kayıt.',
  'finans-nakit-hareketleri': 'Banka/kasa giriş-çıkış; isteğe bağlı muhasebe fişi.',
  'finans-banka-hesaplari': 'Şirket banka hesap kartları.',
  'finans-kasa-hesaplari': 'Kasa hesap kartları.',
  mizan: 'Hesap bazında borç/alacak/bakiye mizanı.',
  'finans-yevmiye': 'Kesinleşmiş fişlerin tarih sırası yevmiye listesi.',
  'finans-bilanco': 'Bilanço özeti (hesap sınıflarından).',
  'finans-gelir-tablosu': 'Gelir tablosu (sınıf 6 hareketleri).',
  kokpit: 'Finansal özet göstergeler.',
  'fiyat-listeleri': 'Satış/alış fiyat listeleri ve kalemler.',
  'fatura-kontrolleri': 'Fatura–sipariş–mal kabul kontrol / eşleştirme yardımı.',
  'tedarikci-degerlendirme': 'Tedarikçi performans değerlendirme.',
};

const NEW_SINCE_TEKS = [
  { id: 'irsaliye-yonetimi', note: 'Eski “İrsaliyeler” ekranı Satış → Belge Yönetimi altında yeniden konumlandı; e-İrsaliye / GİB sonrası fatura akışı güçlendirildi.' },
  { id: 'fatura-yonetimi', note: 'Alış + Satış faturaları ve eski birleşik belge yönetimi tek “Fatura Yönetimi” ekranında birleştirildi.' },
  { id: 'hesap-plani', note: 'Çok ülkeli hesap planı alanları (ülke, sınıf, mutabakat).' },
  { id: 'muhasebe-belgeleri', note: 'Çift taraflı motor: denge, dönem kilidi, ters kayıt, mükerrer kaynak engeli.' },
  { id: 'muhasebe-donemleri', note: 'Yeni — dönem kapat / yeniden aç.' },
  { id: 'finans-vergi-kodlari', note: 'Yeni — tarihli vergi oranları.' },
  { id: 'finans-banka-hesaplari', note: 'Yeni — banka hesap kartları.' },
  { id: 'finans-kasa-hesaplari', note: 'Yeni — kasa kartları.' },
  { id: 'finans-nakit-hareketleri', note: 'Yeni — nakit hareket + muhasebe bağlantısı.' },
  { id: 'finans-yevmiye', note: 'Yeni — yevmiye defteri raporu.' },
  { id: 'finans-bilanco', note: 'Yeni — bilanço özeti.' },
  { id: 'finans-gelir-tablosu', note: 'Yeni — gelir tablosu.' },
  { id: 'hesap-belirleme-kurallari', note: 'Fatura muhasebeleştirmede hesap eşlemesi.' },
  { id: 'tablo-bilgileri', note: 'Yeni — ekran/tablo/alan meta kataloğu + F1 yardım.' },
  { id: 'onay-rol-tanim', note: 'Onay Yönetimi tanım ekranları eklendi.' },
  { id: 'onay-kural-tanim', note: 'Onay kuralları (ekran + koşul).' },
  { id: 'onay-rota-tanim', note: 'Onay rotaları / adımlar.' },
  { id: 'onaylarim', note: 'Kullanıcı onay kuyruğu.' },
  { id: 'ulke-tanimi', note: 'Sabit tanımlar — ülke.' },
  { id: 'para-birimi-tanimi', note: 'Sabit tanımlar — para birimi.' },
  { id: 'sehir-tanimi', note: 'Sabit tanımlar — şehir.' },
  { id: 'ilce-tanimi', note: 'Sabit tanımlar — ilçe.' },
  { id: 'odeme-kosulu-tanimi', note: 'Ödeme koşulu tanımı.' },
  { id: 'teslimat-kosulu-tanimi', note: 'Teslimat koşulu tanımı.' },
  { id: 'urun-agaci-patlatma', note: 'BOM patlatma görünümü.' },
  { id: 'toplu-is-emri', note: 'Toplu iş emri oluşturma.' },
];

const IMPROVEMENTS = [
  'Satış siparişi kompakt başlık + Kalemler/Adres sekmeleri; belge kabuğu diğer belgelere yayıldı.',
  'İrsaliye formu: e-İrsaliye, araç bilgileri, sevk adresi, GİB sonrası fatura oluşturma diyaloğu.',
  'Fatura formu: e-Fatura alanları, senaryo/tip, muhasebeleştirme, alış–satış birleşik yönetim.',
  'Satınalma formları profesyonel kabuk + mal kabulden fatura.',
  'Ürün ağacı / rota çalışma alanı UX iyileştirmeleri.',
  'Çok firma izolasyonu; firma seçici; kullanıcı–firma yetkisi.',
  'Lookupup/lookup sarı alanlar; para birimi–şehir–ülke tanımları.',
  'Onay modülü (tanım + kuyruk); onay kaldır yerine muhasebede ters kayıt.',
  'Finans çekirdeği: ülke paketleri TR/AZ/DE/NL, dönem, vergi kodu, raporlar.',
  'Sekmeli üst belgeler; CSV dışa aktarma; F1 / Tablo Bilgileri.',
];

function blurb(s) {
  if (BLURBS[s.id]) return BLURBS[s.id];
  if (s.helpText) return s.helpText;
  if (s.readOnly) return `${s.title}: liste / rapor ekranı (salt okunur veya işlem odaklı).`;
  if (s.crud) return `${s.title}: kayıt oluşturma, inceleme, düzeltme ve silme.`;
  return `${s.title}: işlem / liste ekranı.`;
}

function findShot(...names) {
  for (const dir of shotDirs) {
    for (const name of names) {
      const p = path.join(dir, name.endsWith('.png') ? name : `${name}.png`);
      if (fs.existsSync(p)) {
        return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
      }
    }
  }
  return '';
}

const SHOT_ALIASES = {
  'irsaliye-yonetimi': ['19-o1-irsaliye', 'belge_irsaliyeler'],
  'fatura-yonetimi': ['20-o1-fatura', 'belge_satis-faturalari'],
  'satis-siparisleri': ['11-o1-siparis-ust', 'belge_satis-siparisleri'],
  'satis-teklifleri': ['10-o1-teklif', 'belge_satis-teklifleri'],
  'sevk-emirleri': ['18-o1-sevk', 'belge_sevk-emirleri'],
  'satin-alma-talepleri': ['15-o1-sa-talep', 'belge_satin-alma-talepleri'],
  'satin-alma-siparisleri': ['16-o1-sa-siparis', 'belge_satin-alma-siparisleri'],
  'mal-kabuller': ['belge_mal-kabuller'],
  'uretim-emirleri': ['17-o1-uretim'],
  'cari-kartlari': ['01-cari-musteri'],
  'stok-karti': ['02-stok-mamul'],
  'urun-agaci': ['03-urun-agaci'],
  rotalar: ['04-rota'],
  'mrp-calisma': ['32-o2-mrp-calisma'],
  'mrp-sonuclar': ['33-o2-mrp-sonuc'],
  onaylarim: ['50-onaylarim'],
  'onay-izleme': ['51-izleme'],
  'onay-rol-tanim': ['10-rol-liste', '11-rol-form'],
  'onay-kural-tanim': ['20-kural-liste'],
  'onay-rota-tanim': ['30-rota-liste'],
};

function esc(t) {
  return String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(screens) {
  const visible = screens.filter((s) => !s.hidden && !s.deprecated);
  const modules = [];
  const seen = new Set();
  for (const s of visible) {
    if (!seen.has(s.moduleId)) {
      seen.add(s.moduleId);
      modules.push({ id: s.moduleId, title: s.moduleTitle });
    }
  }

  const today = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'long',
  }).format(new Date());

  let body = `
<section class="cover">
  <div class="eyebrow">KTB ERP · Ekran sunumu</div>
  <h1>Tüm ekranlar ve işlevler</h1>
  <p class="sub">
    Sistem ve sabit tanımlardan satış, satınalma, üretim, kalite, onay ve finansa kadar
    menüdeki her ekranın <strong>ne işe yaradığı</strong> sade Türkçe ile anlatılır.
    Önceki TEKS sunumundaki eksikler (tanım / sistem ekranları ve son dalga yenilikler) tamamlanmıştır.
  </p>
  <div class="pills">
    <span class="pill">${visible.length} görünür ekran</span>
    <span class="pill b">${modules.length} menü modülü</span>
    <span class="pill b">Sunum dili · işlev odaklı</span>
  </div>
  <p class="meta">Tarih: ${esc(today)} (Europe/Istanbul) · Dal: cursor/erp-irsaliye-fatura-yonetim-4f63</p>
</section>

<section class="slide page-break">
  <div class="eyebrow">Nasıl okunur?</div>
  <h2>Bu doküman bir satış / eğitim sunumudur</h2>
  <ul class="talk">
    <li>Her modülde önce <strong>ekran kataloğu tablosu</strong> (tüm ekranlar), sonra önemli ekranlarda kısa anlatım vardır.</li>
    <li>Teknik terimler yerine “ne seçilir, ne olur” dili kullanılır.</li>
    <li>Görseller mevcut demo çekimlerinden veya yeni liste görüntülerinden gelir; her satır için zorunlu değildir.</li>
    <li>Gizli / kullanımdan kalkmış ekranlar listelenmez.</li>
  </ul>
  <div class="tip">Ortak kabuk: sol menü → liste (filtre + aksiyonlar) → Yeni/İncele/Düzelt formu → üst sekmeler. Kod alanları numaratörden gelir.</div>
</section>

<section class="slide page-break">
  <div class="eyebrow">Ortak kabuk</div>
  <h2>Her ekranda aynı oyun kuralları</h2>
  <table class="fields">
    <thead><tr><th>Parça</th><th>Ne yapar?</th></tr></thead>
    <tbody>
      <tr><td class="f">Sol menü</td><td>Modül → alt bölüm → ekran. Yetkiniz olmayan ekran görünmez.</td></tr>
      <tr><td class="f">Firma seçici</td><td>Aktif şirket; kayıtlar firmaya göre ayrılır.</td></tr>
      <tr><td class="f">Liste</td><td>Filtre (eşit / değil / arasında) + satır seçimi.</td></tr>
      <tr><td class="f">Yeni / İncele / Düzelt / Kopyala / Sil</td><td>Standart kart aksiyonları. İncele salt okunur.</td></tr>
      <tr><td class="f">Sarı alanlar</td><td>Başka tablodan lookup (cari, stok, depo, PB…).</td></tr>
      <tr><td class="f">Dönüştür / Onayla</td><td>Belgeyi sonraki adıma veya muhasebeye bağlar.</td></tr>
      <tr><td class="f">CSV</td><td>Listeyi dışa aktarma (yetkiye bağlı).</td></tr>
    </tbody>
  </table>
</section>

<section class="slide page-break">
  <div class="eyebrow">TEKS sunumundan bu yana</div>
  <h2>Yeni ekranlar ve büyük geliştirmeler</h2>
  <h3>Geliştirmeler (mevcut ekranlar)</h3>
  <ul class="talk">${IMPROVEMENTS.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <h3>Öne çıkan yeni / yeniden konumlanan ekranlar</h3>
  <table class="fields">
    <thead><tr><th>Ekran</th><th>Ne değişti?</th></tr></thead>
    <tbody>
      ${NEW_SINCE_TEKS.map((n) => {
        const s = visible.find((x) => x.id === n.id);
        const title = s ? s.title : n.id;
        return `<tr><td class="f">${esc(title)}</td><td>${esc(n.note)}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</section>
`;

  // İçindekiler
  body += `
<section class="slide page-break">
  <div class="eyebrow">İçindekiler</div>
  <h2>Modüller</h2>
  <table class="fields">
    <thead><tr><th>#</th><th>Modül</th><th>Ekran sayısı</th></tr></thead>
    <tbody>
      ${modules.map((m, idx) => {
        const n = visible.filter((s) => s.moduleId === m.id).length;
        return `<tr><td>${idx + 1}</td><td>${esc(m.title)}</td><td>${n}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</section>`;

  for (const mod of modules) {
    const list = visible.filter((s) => s.moduleId === mod.id);
    body += `
<section class="slide page-break mod-cover">
  <div class="eyebrow">Modül</div>
  <h1 class="mod-h">${esc(mod.title)}</h1>
  <p class="lead">${list.length} ekran · işlev özeti aşağıdaki tabloda</p>
  <table class="fields compact">
    <thead><tr><th>Ekran</th><th>Tür</th><th>Ne işe yarar?</th><th>Özel işlem</th></tr></thead>
    <tbody>
      ${list.map((s) => {
        const kind = s.readOnly || !s.crud ? 'Liste / rapor' : 'Kart (CRUD)';
        const acts = [s.approveAction, s.convertAction].filter(Boolean).join(' · ');
        return `<tr>
          <td class="f">${esc(s.title)}</td>
          <td>${kind}</td>
          <td>${esc(blurb(s))}</td>
          <td>${esc(acts || '—')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</section>`;

    // Detay slaytları — her ekran (kompakt); görsel varsa ekle
    for (const s of list) {
      const aliases = SHOT_ALIASES[s.id] || [];
      const shot = findShot(s.id, `list-${s.id}`, ...aliases);
      const sec = (s.sectionTitles || []).join(' / ');
      body += `
<section class="slide page-break">
  <div class="eyebrow">${esc(mod.title)}${sec ? ` · ${esc(sec)}` : ''}</div>
  <h2>${esc(s.title)}</h2>
  <p class="lead">${esc(blurb(s))}</p>
  ${shot ? `<figure class="shot"><img src="${shot}" alt="${esc(s.title)}"/></figure>` : ''}
  <ul class="talk">
    <li><strong>Menü yolu:</strong> ${esc(mod.title)}${sec ? ` → ${esc(sec)}` : ''} → ${esc(s.title)}</li>
    <li><strong>Ekran kodu:</strong> <code>${esc(s.id)}</code>${s.techId ? ` · ${esc(s.techId)}` : ''}</li>
    <li><strong>Kullanım:</strong> ${s.crud ? 'Yeni kayıt açılır, listeden İncele/Düzelt yapılır.' : 'Liste veya işlem ekranı; kayıt kartı sınırlı olabilir.'}</li>
    ${s.numeratorSeri ? `<li><strong>Numaratör:</strong> ${esc(s.numeratorSeri)} serisinden kod üretir.</li>` : ''}
    ${s.approveAction ? `<li><strong>Onay / işlem:</strong> ${esc(s.approveAction)}</li>` : ''}
    ${s.convertAction ? `<li><strong>Dönüşüm:</strong> ${esc(s.convertAction)}</li>` : ''}
    ${s.columns?.length ? `<li><strong>Liste sütunları (örnek):</strong> ${esc(s.columns.slice(0, 6).join(', '))}</li>` : ''}
  </ul>
  ${s.helpText ? `<div class="tip">${esc(s.helpText)}</div>` : ''}
</section>`;
    }
  }

  body += `
<section class="slide page-break">
  <div class="eyebrow">Süreç özeti</div>
  <h2>Uçtan uca akışlar (hatırlatma)</h2>
  <div class="flow-box">
    <strong>Satış:</strong> Teklif → Sipariş → Sevk → İrsaliye Yönetimi → Fatura Yönetimi → Muhasebeleştir → Tahsilat
  </div>
  <div class="flow-box">
    <strong>Satınalma:</strong> Talep → Teklif → Sipariş → Mal kabul → Fatura Yönetimi (Alış) → Muhasebeleştir → Ödeme
  </div>
  <div class="flow-box">
    <strong>Üretim:</strong> Sipariş / MRP → İş emri → Üretim girişi → Stok → Sevk
  </div>
  <div class="flow-box">
    <strong>Finans:</strong> Hesap planı + dönem → Fiş / otomatik muhasebe → Mizan / Yevmiye / Bilanço / Gelir
  </div>
  <p class="footer-note">Ayrıntılı muhasebe kullanımı: docs/finance-accounting/user-guide-tr.md</p>
</section>

<section class="slide page-break">
  <div class="eyebrow">Kapanış</div>
  <h2>Özet</h2>
  <ul class="talk">
    <li>Bu PDF menüdeki <strong>tüm görünür ekranları</strong> kapsar (sabit tanımlar ve sistem dahil).</li>
    <li>TEKS örnek sunumundan sonra gelen Onay, Finans/Muhasebe, İrsaliye/Fatura Yönetimi ve meta ekranlar eklenmiştir.</li>
    <li>Canlı sistem: <code>http://localhost:3000/</code> — ekran araması en az 3 karakter.</li>
  </ul>
  <p class="meta">Üretim: scripts/build-tam-ekran-sunum-pdf.js · ${esc(today)}</p>
</section>
`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>KTB ERP — Tüm Ekranlar Sunumu</title>
<style>
  @page { size: A4; margin: 11mm 10mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", "Segoe UI", sans-serif;
    color: #15202b; font-size: 9pt; line-height: 1.38; margin: 0;
  }
  h1 { font-size: 22pt; margin: 0 0 8pt; color: #0a3d34; line-height: 1.15; }
  h1.mod-h { font-size: 20pt; }
  h2 { font-size: 12.5pt; margin: 0 0 4pt; color: #0a3d34; page-break-after: avoid; }
  h3 { font-size: 10.5pt; margin: 10pt 0 4pt; color: #1a4a40; }
  p { margin: 0 0 6pt; }
  code { font-family: ui-monospace, monospace; font-size: 8.5pt; background: #eef3f1; padding: 1pt 4pt; border-radius: 3pt; }
  .cover {
    min-height: 255mm; padding: 26pt 24pt;
    background: linear-gradient(160deg, #dceee8 0%, #f4f8f7 42%, #ffffff 100%);
    border: 1px solid #b9d0c8; border-radius: 10pt;
    display: flex; flex-direction: column; justify-content: center;
  }
  .eyebrow {
    text-transform: uppercase; letter-spacing: .12em; font-size: 8pt;
    color: #5a6a78; margin-bottom: 5pt; font-weight: 650;
  }
  .sub { font-size: 11pt; color: #334155; margin: 0 0 14pt; max-width: 94%; }
  .pill {
    display: inline-block; background: #0c7c69; color: #fff;
    padding: 3pt 10pt; border-radius: 999pt; font-size: 8.5pt; margin: 0 5pt 5pt 0;
  }
  .pill.b { background: #1a5f8a; }
  .meta { font-size: 8.5pt; color: #5a6a78; margin-top: 18pt; }
  .page-break { page-break-before: always; }
  .lead { color: #3a4654; margin: 0 0 7pt; }
  .shot {
    margin: 5pt 0 7pt; border: 1px solid #c9d4de; border-radius: 5pt;
    overflow: hidden; background: #eef2f5; max-height: 105mm;
  }
  .shot img { width: 100%; display: block; }
  .talk { margin: 3pt 0 7pt 15pt; padding: 0; }
  .talk li { margin-bottom: 2.5pt; }
  table.fields { width: 100%; border-collapse: collapse; margin: 5pt 0 7pt; font-size: 8pt; }
  table.fields.compact { font-size: 7.6pt; }
  table.fields th, table.fields td {
    border: 1px solid #d5dde6; padding: 3.5pt 5pt; vertical-align: top; text-align: left;
  }
  table.fields th { background: #e8f3ef; color: #0a3d34; }
  table.fields td.f { font-family: ui-monospace, monospace; background: #f7faf9; font-weight: 650; }
  .tip {
    background: #fff8e8; border-left: 3px solid #c9a227;
    padding: 6pt 8pt; margin: 5pt 0 0; font-size: 8.3pt;
  }
  .flow-box {
    background: #f3f8f6; border: 1px solid #c9d4de; border-radius: 7pt;
    padding: 9pt 11pt; margin: 7pt 0; font-size: 9.5pt;
  }
  .flow-box strong { color: #0c7c69; }
  .footer-note { font-size: 7.5pt; color: #6b7785; margin-top: 8pt; }
  .mod-cover { page-break-inside: avoid; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

async function main() {
  const screens = extractScreens();
  fs.mkdirSync(path.join(ROOT, 'docs', 'ekran-katalog'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'docs', 'ekran-katalog', 'screens-live.json'),
    JSON.stringify(screens, null, 2),
  );
  const html = buildHtml(screens);
  const htmlPath = path.join(ROOT, 'docs', 'ekran-katalog', 'tum-ekranlar-sunum.html');
  fs.writeFileSync(htmlPath, html);

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    headless: 'new',
  });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.pdf({
      path: outPdf,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '12mm', left: '9mm', right: '9mm' },
    });
    fs.copyFileSync(outPdf, outArtifact);
    const kb = Math.round(fs.statSync(outPdf).size / 1024);
    console.log('PDF:', outPdf, `${kb} KB`);
    console.log('Artifact:', outArtifact);
    console.log('Screens visible:', screens.filter((s) => !s.hidden && !s.deprecated).length);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
