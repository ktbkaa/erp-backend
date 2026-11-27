'use strict';

/**
 * Backend yetki haritası — ekran ↔ modül ↔ API route eşlemesinin TEK kaynağı.
 *
 * - MODULE_SCREENS: SPA `MODULES` (public/app.js) ile birebir; ekran kimlikleri
 *   `user_screen_permissions.screen_id` değerleridir.
 * - ROUTE_POLICIES: Express mount prefix’i → sahip ekran(lar) + okuma/yazma seviyesi.
 *   En uzun prefix kazanır; `rules` ile alt yol / metot bazında daraltılır.
 *
 * Okuma seviyeleri (GET/HEAD):
 *   public  → kimlik dahi aranmaz (yalnız /health, /auth)
 *   auth    → oturumlu her kullanıcı (modüller arası lookup kaynakları)
 *   module  → route ekranlarının modüllerinden en az birine erişim (varsayılan)
 *   screen  → route ekranlarından birine erişim
 *   admin   → yalnız yönetici
 * Yazma seviyeleri (POST/PUT/PATCH/DELETE):
 *   screen  → ekran aksiyon bayrağı (varsayılan): POST kök=yeni, PUT/PATCH=duzelt,
 *             DELETE=sil, POST alt yol=islem (yeni|duzelt)
 *   admin   → yalnız yönetici
 *   auth    → oturumlu her kullanıcı (route kendi iç kontrolünü yapar)
 * Haritada olmayan prefix → `full` (tam yetkili kullanıcı) — yeni route’lar burada
 * tanımlanmadan kısıtlı kullanıcılara açılmaz (bkz. tests/yetki_harita.test.js).
 */

const MODULE_SCREENS = {
  'ana-veri': [
    'companies', 'is-yerleri', 'warehouses', 'country-tanimi', 'sehir-tanimi', 'olcu-birimleri',
    'dil-tanimi', 'para-birimi-tanimi', 'doviz-exchange_rate-tanimi', 'banka-tanimi',
    'odeme-kosulu-tanimi', 'teslimat-kosulu-tanimi', 'belge-tipleri', 'hareket-kodlari',
    'kategori-tip-tanimi', 'kategori-tanimi', 'numarator-tanimi',
  ],
  cari: ['cari-kartlari', 'tahsilat-odemeler', 'cari-ekstre', 'cari-mutabakat', 'e-belge-kuyruk'],
  stok: [
    'stok-karti', 'stok-hareketleri', 'stok-hareket-raporu', 'depo-bakiye', 'transfer-emirleri',
    'sayim-belgeleri', 'stok-depo', 'stok-partileri', 'stok-serileri', 'stok-rezervasyonlari',
    'stok-ikame',
  ],
  satinalma: [
    'satin-alma-talepleri', 'satin-alma-teklifleri', 'satin-alma-anlasmalari',
    'satin-alma-siparisleri', 'mal-kabuller', 'tedarikci-irsaliyeleri', 'giris-kontrolleri',
    'satin-alma-teklif-istekleri', 'alis-iade-faturalari',
  ],
  satis: [
    'satis-teklifleri', 'satis-siparisleri', 'sevk-emirleri', 'irsaliye-yonetimi',
    'fatura-yonetimi', 'satis-iade-faturalari',
  ],
  uretim: [
    'urun-agaci', 'bom-patlatma', 'bom-malzeme-degisikligi', 'uretim-planlari', 'mrp-parametre',
    'mrp-bagimsiz-ihtiyac', 'mrp-calisma', 'mrp-hesap', 'mrp-sonuclar', 'mrp-hareket-raporu',
    'uretim-emirleri', 'kolay-is-emri-onayi', 'siparis-is-emri', 'toplu-is-emri', 'uretim-girisleri', 'hizli-uretim-girisi',
    'is-merkezi-yuku', 'bakim-emirleri', 'sinif-tanimi', 'is-merkezleri', 'is-istasyonlari',
    'routings', 'uretim-emri-tipleri', 'uretim-parametreleri', 'uretim-parametre-dogrulama',
    'fason-parametreleri', 'fason-operasyonlari', 'fason-fiyatlari', 'fason-siparisleri',
    'fason-operasyon-takip', 'fason-sevkiyatlar', 'fason-tuketimler', 'fason-teslimatlar',
    'fason-emanet-stok',
  ],
  kalite: [
    'kk-emirleri-gkk', 'kk-emirleri-ckk', 'kk-cihazlar', 'kk-kalibrasyonlar', 'kk-uygunsuzluklar',
    'kk-capa', 'kk-kontrol-planlari', 'kk-stok-planlari', 'kk-ret-nedenleri',
  ],
  finans: [
    'hesap-plani', 'hesap-belirleme-kurallari', 'finans-vergi-kodlari', 'finans-ulke-paketleri',
    'mali-yillar', 'muhasebe-donemleri', 'fiyat-listeleri', 'muhasebe-belgeleri',
    'fatura-kontrolleri', 'finans-banka-hesaplari', 'finans-kasa-hesaplari',
    'finans-nakit-hareketleri', 'banka-mutabakat', 'finans-yaslandirma', 'sabit-kiymetler',
    'gl-butceler', 'mizan', 'finans-yevmiye', 'finans-bilanco', 'finans-gelir-tablosu', 'kokpit',
    'vergi-kodlari',
  ],
  crm: [
    'crm-adaylar', 'crm-kontaklar', 'crm-firsatlar', 'crm-faaliyet-planlari', 'crm-faaliyetler',
    'crm-gorevler', 'crm-ajanda', 'crm-firsat-asamalari', 'crm-faaliyet-tipleri',
  ],
  proje: [
    'prj-projeler', 'prj-isler', 'prj-dashboard', 'prj-portfolio', 'prj-board', 'prj-backlog',
    'prj-sprintler', 'prj-gantt', 'prj-workload', 'prj-butce', 'prj-riskler', 'prj-sablonlar',
    'prj-automations', 'prj-project-types', 'prj-project-categories', 'prj-project-statuses',
    'prj-project-priorities', 'prj-work-item-types', 'prj-work-item-statuses',
    'prj-work-item-priorities', 'prj-project-roles', 'prj-relation-types',
  ],
  'insan-kaynaklari': [
    'hr-personel', 'hr-departmanlar', 'hr-pozisyonlar', 'hr-calisma-takvimleri', 'hr-vardiyalar',
    'hr-vardiya-atamalari', 'hr-puantaj', 'hr-resmi-tatiller', 'hr-izin-turleri',
    'hr-izin-talepleri', 'hr-izin-bakiyeleri', 'hr-ucretler', 'hr-avanslar',
    'hr-bordro-parametreleri', 'hr-bordro-donemleri', 'hr-bordro-calismalari', 'hr-is-ilanlari',
    'hr-adaylar', 'hr-onboarding', 'hr-zimmetler', 'hr-isten-cikis', 'hr-cikis-nedenleri',
  ],
  onay: [
    'onay-bekleyenler', 'onaylarim', 'onay-izleme', 'onay-izi', 'onay-yetki-devri',
    'onay-belge-turleri', 'onay-role-tanim', 'onay-kural-tanim',
    'onay-rota-tanim', 'onay-message-template', 'onay-status-tanim', 'onay-modul-kullanimlari',
  ],
  sistem: [
    'sistem-lisanslar', 'firma-lisanslar', 'kullanicilar', 'kullanici-gruplari',
    'sistem-parametreleri', 'zorunlu-alan-tanimlari', 'mesaj-tanimlari', 'eposta-gonderimleri',
    'sistem-guncelleme', 'audit-log', 'tablo-bilgileri', 'sql-sorgu', 'sayfa-sorgulari',
  ],
};

/** SPA SCREEN_ALIASES ile aynı: eski ekran kimlikleriyle kaydedilmiş yetki satırları. */
const SCREEN_ALIASES = {
  delivery_notes: 'irsaliye-yonetimi',
  'satis-faturalari': 'fatura-yonetimi',
  'alis-faturalari': 'fatura-yonetimi',
  'belge-yonetimi': 'fatura-yonetimi',
  sales_orders: 'satis-siparisleri',
};

/** Geriye dönük modül yetkisi anahtarları (SPA modulYetkiliMi ile aynı). */
const MODULE_ALIASES = {
  'fixed-tanimlar': ['ana-veri', 'sistem'],
};

const SCREEN_MODULE = {};
for (const [mod, screens] of Object.entries(MODULE_SCREENS)) {
  for (const s of screens) SCREEN_MODULE[s] = mod;
}

const FASON = MODULE_SCREENS.uretim.filter((s) => s.startsWith('fason-'));
const MRP = ['mrp-parametre', 'mrp-bagimsiz-ihtiyac', 'mrp-calisma', 'mrp-hesap', 'mrp-sonuclar'];
const NUMARATOR_AYIR = /^\/(stok-hareket\/(peek|ayir)|ayir-prefixed|[^/]+\/ayir)$/;

/* eslint-disable object-curly-newline */
const ROUTE_POLICIES = [
  { prefix: '/health', read: 'public', write: 'public' },
  { prefix: '/auth', read: 'public', write: 'public' },

  // Ana veri — modüller arası lookup kaynağı
  { prefix: '/companies', screens: ['companies'], read: 'auth' },
  { prefix: '/is-yerleri', screens: ['is-yerleri'], read: 'auth' },
  { prefix: '/warehouses', screens: ['warehouses'], read: 'auth' },
  { prefix: '/countries', screens: ['country-tanimi'], read: 'auth' },
  { prefix: '/cities', screens: ['sehir-tanimi'], read: 'auth' },
  { prefix: '/districts', screens: ['sehir-tanimi'], read: 'auth' },
  { prefix: '/olcu-birimleri', screens: ['olcu-birimleri'], read: 'auth' },
  { prefix: '/languages', screens: ['dil-tanimi'], read: 'auth' },
  { prefix: '/para-birimleri', screens: ['para-birimi-tanimi'], read: 'auth' },
  { prefix: '/doviz-kurlari', screens: ['doviz-exchange_rate-tanimi'], read: 'auth' },
  { prefix: '/banks', screens: ['banka-tanimi'], read: 'auth' },
  { prefix: '/odeme-kosullari', screens: ['odeme-kosulu-tanimi'], read: 'auth' },
  { prefix: '/teslimat-kosullari', screens: ['teslimat-kosulu-tanimi'], read: 'auth' },
  { prefix: '/belge-tipleri', screens: ['belge-tipleri'], read: 'auth' },
  { prefix: '/hareket-kodlari', screens: ['hareket-kodlari'], read: 'auth' },
  { prefix: '/kategori-tipleri', screens: ['kategori-tip-tanimi'], read: 'auth' },
  { prefix: '/kategoriler', screens: ['kategori-tanimi'], read: 'auth' },
  {
    // Numaratör yapısı yalnız yönetici; belge formlarının numara ayırma/önizleme uçları herkese
    prefix: '/kod-serileri',
    screens: ['numarator-tanimi'],
    read: 'auth',
    write: 'admin',
    rules: [{ methods: ['POST'], path: NUMARATOR_AYIR, write: 'auth' }],
  },

  // Cari
  { prefix: '/partners', screens: ['cari-kartlari'], read: 'auth' },
  { prefix: '/tahsilat-odemeler', screens: ['tahsilat-odemeler'] },
  { prefix: '/cari-hareketleri', screens: ['cari-ekstre'] },
  { prefix: '/cari-mutabakat', screens: ['cari-mutabakat'] },
  { prefix: '/e-belge', screens: ['e-belge-kuyruk', 'fatura-yonetimi', 'irsaliye-yonetimi'] },

  // Stok
  { prefix: '/items', screens: ['stok-karti'], read: 'auth' },
  { prefix: '/stok-hareketleri', screens: ['stok-hareketleri'], read: 'auth' },
  { prefix: '/stok-hareket-raporu', screens: ['stok-hareket-raporu'] },
  { prefix: '/stok-bakiyeleri', screens: ['depo-bakiye'], read: 'auth' },
  { prefix: '/transfer-emirleri', screens: ['transfer-emirleri'] },
  { prefix: '/sayim-belgeleri', screens: ['sayim-belgeleri'] },
  { prefix: '/stok-depo', screens: ['stok-depo', 'stok-karti'], read: 'auth' },
  { prefix: '/stok-partileri', screens: ['stok-partileri'], read: 'auth' },
  { prefix: '/stok-serileri', screens: ['stok-serileri'], read: 'auth' },
  { prefix: '/stok-rezervasyonlari', screens: ['stok-rezervasyonlari', 'satis-siparisleri'], read: 'auth' },
  { prefix: '/stok-ikame', screens: ['stok-ikame'], read: 'auth' },
  { prefix: '/mrp', screens: MRP },
  { prefix: '/mrp/parametreler', screens: ['mrp-parametre'] },
  { prefix: '/mrp/parametre-varsayilan', screens: ['mrp-parametre'] },
  { prefix: '/mrp/bagimsiz-ihtiyaclar', screens: ['mrp-bagimsiz-ihtiyac'] },
  { prefix: '/mrp/calismalar', screens: ['mrp-calisma', 'mrp-sonuclar', 'mrp-hareket-raporu'] },
  { prefix: '/mrp-hareket-raporu', screens: ['mrp-hareket-raporu'] },

  // Satınalma
  { prefix: '/satin-alma-talepleri', screens: ['satin-alma-talepleri'], read: 'auth' },
  { prefix: '/satin-alma-teklif-istekleri', screens: ['satin-alma-teklif-istekleri'], read: 'auth' },
  { prefix: '/satin-alma-teklifleri', screens: ['satin-alma-teklifleri'], read: 'auth' },
  { prefix: '/satin-alma-anlasmalari', screens: ['satin-alma-anlasmalari'], read: 'auth' },
  { prefix: '/satin-alma-siparisleri', screens: ['satin-alma-siparisleri'], read: 'auth' },
  { prefix: '/mal-kabuller', screens: ['mal-kabuller'], read: 'auth' },
  { prefix: '/tedarikci-irsaliyeleri', screens: ['tedarikci-irsaliyeleri'], read: 'auth' },
  { prefix: '/giris-kontrolleri', screens: ['giris-kontrolleri'], read: 'auth' },
  { prefix: '/tedarikci-degerlendirme', screens: ['satin-alma-siparisleri', 'mal-kabuller'] },

  // Satış
  { prefix: '/satis-teklifleri', screens: ['satis-teklifleri'], read: 'auth' },
  { prefix: '/sales_orders', screens: ['satis-siparisleri'], read: 'auth' },
  { prefix: '/sevk-emirleri', screens: ['sevk-emirleri'], read: 'auth' },
  { prefix: '/delivery_notes', screens: ['irsaliye-yonetimi'], read: 'auth' },
  {
    prefix: '/invoices',
    screens: ['fatura-yonetimi', 'alis-iade-faturalari', 'satis-iade-faturalari'],
    read: 'auth',
    rules: [
      {
        methods: ['POST'],
        path: /^\/[^/]+\/(eslestir|eslestirme-onay)$/,
        screens: ['fatura-yonetimi', 'alis-iade-faturalari', 'fatura-kontrolleri'],
      },
    ],
  },
  { prefix: '/belge-yonetimi', screens: ['fatura-yonetimi'], read: 'auth' },
  { prefix: '/fiyat-listeleri', screens: ['fiyat-listeleri'], read: 'auth' },

  // Üretim
  { prefix: '/urun-agaclari', screens: ['urun-agaci'], read: 'auth' },
  { prefix: '/bom', screens: ['urun-agaci', 'bom-patlatma', 'bom-malzeme-degisikligi'] },
  { prefix: '/bom/patlatma', screens: ['bom-patlatma'] },
  { prefix: '/bom/malzeme-degisikligi', screens: ['bom-malzeme-degisikligi'] },
  { prefix: '/bom/malzeme-degistir', screens: ['bom-malzeme-degisikligi'] },
  { prefix: '/uretim-planlari', screens: ['uretim-planlari'], read: 'auth' },
  {
    prefix: '/uretim-emirleri',
    screens: ['uretim-emirleri', 'siparis-is-emri', 'toplu-is-emri'],
    read: 'auth',
    rules: [
      {
        methods: ['POST'],
        path: /^\/(onay-adaylari|toplu-onay|[^/]+\/onayla)$/,
        screens: ['uretim-emirleri', 'kolay-is-emri-onayi'],
      },
    ],
  },
  { prefix: '/uretim-emri-tipleri', screens: ['uretim-emri-tipleri'], read: 'auth' },
  { prefix: '/uretim-girisleri', screens: ['uretim-girisleri', 'hizli-uretim-girisi'], read: 'auth' },
  { prefix: '/uretim-parametreleri', screens: ['uretim-parametreleri', 'uretim-parametre-dogrulama'], read: 'auth' },
  { prefix: '/is-merkezi-yuku', screens: ['is-merkezi-yuku'], read: 'auth' },
  { prefix: '/bakim-emirleri', screens: ['bakim-emirleri'] },
  { prefix: '/stok-siniflari', screens: ['sinif-tanimi'], read: 'auth' },
  { prefix: '/is-merkezleri', screens: ['is-merkezleri'], read: 'auth' },
  { prefix: '/is-istasyonlari', screens: ['is-istasyonlari'], read: 'auth' },
  { prefix: '/routings', screens: ['routings'], read: 'auth' },
  { prefix: '/fason', screens: FASON },
  { prefix: '/fason/parametreler', screens: ['fason-parametreleri'] },
  { prefix: '/fason/operasyonlar', screens: ['fason-operasyonlari'] },
  { prefix: '/fason/fiyatlar', screens: ['fason-fiyatlari'] },
  { prefix: '/fason/siparisler', screens: ['fason-siparisleri', 'fason-operasyon-takip'] },
  { prefix: '/fason/sevkiyatlar', screens: ['fason-sevkiyatlar'] },
  { prefix: '/fason/tuketimler', screens: ['fason-tuketimler'] },
  { prefix: '/fason/teslimatlar', screens: ['fason-teslimatlar'] },
  { prefix: '/fason/teslimat-satirlari', screens: ['fason-teslimatlar'] },
  { prefix: '/fason/emanet-stok', screens: ['fason-emanet-stok'] },
  { prefix: '/fason/is-emri', screens: ['fason-siparisleri', 'uretim-emirleri'] },

  // Kalite
  { prefix: '/kk-emirleri', screens: ['kk-emirleri-gkk', 'kk-emirleri-ckk'] },
  { prefix: '/kk-kalite', screens: ['kk-cihazlar', 'kk-kalibrasyonlar'] },
  { prefix: '/kk-kalite/cihazlar', screens: ['kk-cihazlar'] },
  { prefix: '/kk-kalite/kalibrasyonlar', screens: ['kk-kalibrasyonlar'] },
  { prefix: '/kk-uygunsuzluklar', screens: ['kk-uygunsuzluklar'] },
  { prefix: '/kk-capa', screens: ['kk-capa'] },
  { prefix: '/kk-kontrol-planlari', screens: ['kk-kontrol-planlari'] },
  { prefix: '/kk-stok-planlari', screens: ['kk-stok-planlari'] },
  { prefix: '/kk-ret-nedenleri', screens: ['kk-ret-nedenleri'] },

  // Finans
  { prefix: '/muhasebe-hesaplari', screens: ['hesap-plani'] },
  { prefix: '/hesap-belirleme-kurallari', screens: ['hesap-belirleme-kurallari'] },
  { prefix: '/finans-vergi-kodlari', screens: ['finans-vergi-kodlari', 'vergi-kodlari'], read: 'auth' },
  { prefix: '/finans-country', screens: ['finans-ulke-paketleri'], read: 'auth' },
  { prefix: '/muhasebe-donemleri', screens: ['muhasebe-donemleri'], read: 'auth' },
  { prefix: '/muhasebe-donemleri/mali-yillar', screens: ['mali-yillar'], read: 'auth' },
  { prefix: '/muhasebe-belgeleri', screens: ['muhasebe-belgeleri'] },
  // Kur farkı değerlemesi 646/656 fişi üretir — muhasebe belgesi yetkisi
  { prefix: '/kur-farki', screens: ['muhasebe-belgeleri'] },
  { prefix: '/fatura-kontrolleri', screens: ['fatura-kontrolleri'] },
  { prefix: '/finans-nakit', screens: ['finans-banka-hesaplari', 'finans-kasa-hesaplari', 'finans-nakit-hareketleri'] },
  { prefix: '/finans-nakit/banka-hesaplari', screens: ['finans-banka-hesaplari'] },
  { prefix: '/finans-nakit/kasa-hesaplari', screens: ['finans-kasa-hesaplari'] },
  { prefix: '/finans-nakit/hareketler', screens: ['finans-nakit-hareketleri'] },
  { prefix: '/banka-mutabakat', screens: ['banka-mutabakat'] },
  { prefix: '/finans-yaslandirma', screens: ['finans-yaslandirma'] },
  { prefix: '/sabit-kiymetler', screens: ['sabit-kiymetler'] },
  { prefix: '/gl-butceler', screens: ['gl-butceler'] },
  { prefix: '/mizan', screens: ['mizan'] },
  { prefix: '/finans-raporlar', screens: ['finans-yevmiye', 'finans-bilanco', 'finans-gelir-tablosu', 'mizan'] },
  { prefix: '/kokpit', screens: ['kokpit'] },

  // CRM
  { prefix: '/crm-adaylar', screens: ['crm-adaylar'], read: 'auth' },
  { prefix: '/crm-kontaklar', screens: ['crm-kontaklar'], read: 'auth' },
  { prefix: '/crm-firsatlar', screens: ['crm-firsatlar'], read: 'auth' },
  { prefix: '/crm-faaliyet-planlari', screens: ['crm-faaliyet-planlari'] },
  { prefix: '/crm-faaliyetler', screens: ['crm-faaliyetler'] },
  { prefix: '/crm-gorevler', screens: ['crm-gorevler'] },
  { prefix: '/crm-ajanda', screens: ['crm-ajanda'] },
  { prefix: '/crm-firsat-asamalari', screens: ['crm-firsat-asamalari'] },
  { prefix: '/crm-faaliyet-tipleri', screens: ['crm-faaliyet-tipleri'] },

  // Proje
  { prefix: '/projects', screens: ['prj-projeler'], read: 'auth' },
  { prefix: '/prj-projeler', screens: ['prj-projeler'], read: 'auth' },
  { prefix: '/work-items', screens: ['prj-isler'] },
  { prefix: '/prj-isler', screens: ['prj-isler'] },
  { prefix: '/prj-project-types', screens: ['prj-project-types'] },
  { prefix: '/prj-project-categories', screens: ['prj-project-categories'] },
  { prefix: '/prj-project-statuses', screens: ['prj-project-statuses'] },
  { prefix: '/prj-project-priorities', screens: ['prj-project-priorities'] },
  { prefix: '/prj-project-roles', screens: ['prj-project-roles'] },
  { prefix: '/prj-work-item-types', screens: ['prj-work-item-types'] },
  { prefix: '/prj-work-item-statuses', screens: ['prj-work-item-statuses'] },
  { prefix: '/prj-work-item-priorities', screens: ['prj-work-item-priorities'] },
  { prefix: '/prj-relation-types', screens: ['prj-relation-types'] },
  { prefix: '/prj-workflows', screens: ['prj-projeler'] },
  { prefix: '/prj-board', screens: ['prj-board', 'prj-isler'] },
  { prefix: '/prj-sprintler', screens: ['prj-sprintler'] },
  { prefix: '/prj-budget', screens: ['prj-butce'] },
  { prefix: '/prj-planning', screens: ['prj-gantt', 'prj-backlog', 'prj-workload'] },
  { prefix: '/prj-planning/gantt', screens: ['prj-gantt'] },
  { prefix: '/prj-planning/calendar', screens: ['prj-gantt'] },
  { prefix: '/prj-planning/backlog', screens: ['prj-backlog'] },
  { prefix: '/prj-planning/workload', screens: ['prj-workload'] },
  { prefix: '/prj-dashboard', screens: ['prj-dashboard', 'prj-portfolio'] },
  { prefix: '/prj-dashboard/overview', screens: ['prj-dashboard'] },
  { prefix: '/prj-dashboard/portfolio', screens: ['prj-portfolio'] },
  { prefix: '/prj-integrations', screens: ['prj-projeler'] },
  { prefix: '/prj-sablonlar', screens: ['prj-sablonlar'] },
  { prefix: '/prj-automations', screens: ['prj-automations'] },
  { prefix: '/prj-riskler', screens: ['prj-riskler'] },

  // İK — kişisel veri: okuma modül yetkisi ister
  { prefix: '/hr-personel', screens: ['hr-personel'] },
  { prefix: '/hr-org', screens: ['hr-departmanlar', 'hr-pozisyonlar'] },
  { prefix: '/hr-org/departmanlar', screens: ['hr-departmanlar'] },
  { prefix: '/hr-org/pozisyonlar', screens: ['hr-pozisyonlar'] },
  { prefix: '/hr-izin', screens: ['hr-izin-turleri', 'hr-izin-talepleri', 'hr-izin-bakiyeleri'] },
  { prefix: '/hr-izin/turler', screens: ['hr-izin-turleri'] },
  { prefix: '/hr-izin/talepler', screens: ['hr-izin-talepleri'] },
  { prefix: '/hr-izin/bakiyeler', screens: ['hr-izin-bakiyeleri'] },
  { prefix: '/hr-takvim', screens: ['hr-calisma-takvimleri', 'hr-vardiyalar', 'hr-vardiya-atamalari', 'hr-resmi-tatiller'] },
  { prefix: '/hr-takvim/takvimler', screens: ['hr-calisma-takvimleri'] },
  { prefix: '/hr-takvim/vardiyalar', screens: ['hr-vardiyalar'] },
  { prefix: '/hr-takvim/vardiya-atamalari', screens: ['hr-vardiya-atamalari'] },
  { prefix: '/hr-takvim/tatiller', screens: ['hr-resmi-tatiller'] },
  { prefix: '/hr-puantaj', screens: ['hr-puantaj'] },
  { prefix: '/hr-bordro', screens: ['hr-ucretler', 'hr-avanslar', 'hr-bordro-parametreleri', 'hr-bordro-donemleri', 'hr-bordro-calismalari'] },
  { prefix: '/hr-bordro/parametreler', screens: ['hr-bordro-parametreleri'] },
  { prefix: '/hr-bordro/hesapla-sim', screens: ['hr-bordro-parametreleri', 'hr-bordro-calismalari'] },
  { prefix: '/hr-bordro/ucretler', screens: ['hr-ucretler'] },
  { prefix: '/hr-bordro/avanslar', screens: ['hr-avanslar'] },
  { prefix: '/hr-bordro/donemler', screens: ['hr-bordro-donemleri'] },
  { prefix: '/hr-bordro/calismalar', screens: ['hr-bordro-calismalari'] },
  { prefix: '/hr-ise-alim', screens: ['hr-is-ilanlari', 'hr-adaylar', 'hr-onboarding', 'hr-zimmetler', 'hr-isten-cikis', 'hr-cikis-nedenleri'] },
  { prefix: '/hr-ise-alim/ilanlar', screens: ['hr-is-ilanlari'] },
  { prefix: '/hr-ise-alim/adaylar', screens: ['hr-adaylar'] },
  { prefix: '/hr-ise-alim/onboarding', screens: ['hr-onboarding'] },
  { prefix: '/hr-ise-alim/zimmetler', screens: ['hr-zimmetler'] },
  { prefix: '/hr-ise-alim/cikislar', screens: ['hr-isten-cikis'] },
  { prefix: '/hr-ise-alim/cikis-nedenleri', screens: ['hr-cikis-nedenleri'] },

  // Onay — kayıtlar her onaycıya açık; onay/ret yetkisini route kendisi denetler
  { prefix: '/onay-kayitlari', screens: ['onaylarim', 'onay-izleme'], read: 'auth', write: 'auth' },
  { prefix: '/onay-yetki-devirleri', screens: ['onay-yetki-devri'] },
  { prefix: '/onay-rolleri', screens: ['onay-role-tanim'], read: 'auth' },
  { prefix: '/onay-kurallari', screens: ['onay-kural-tanim'], read: 'auth' },
  { prefix: '/onay-rotalari', screens: ['onay-rota-tanim'], read: 'auth' },
  { prefix: '/onay-message-sablonlari', screens: ['onay-message-template'], read: 'auth' },
  { prefix: '/onay-durumlari', screens: ['onay-status-tanim'], read: 'auth' },
  { prefix: '/onay-module-kullanimlari', screens: ['onay-modul-kullanimlari'], read: 'auth' },
  { prefix: '/onay-ekranlari', screens: ['onay-kural-tanim', 'onay-rota-tanim'], read: 'auth' },
  { prefix: '/onay-bekleyenler', screens: ['onay-bekleyenler', 'onaylarim'], read: 'auth', write: 'auth' },
  { prefix: '/onay-izi', screens: ['onay-izi', 'onay-izleme'] },
  { prefix: '/onay-belge-turleri', screens: ['onay-belge-turleri', 'onay-kural-tanim'], read: 'auth' },

  // Sistem
  { prefix: '/lisanslar', screens: ['sistem-lisanslar'], read: 'auth', write: 'admin' },
  { prefix: '/lisanslar/firma', screens: ['firma-lisanslar'], read: 'auth', write: 'admin' },
  // Liste lookup (CRM/proje/onay sorumlu alanları); detay (/:id) route içinde öz/ekran kontrollü
  { prefix: '/users', screens: ['kullanicilar'], read: 'auth', write: 'admin' },
  { prefix: '/kullanicilar', screens: ['kullanicilar'], read: 'auth', write: 'admin' },
  { prefix: '/kullanici-gruplari', screens: ['kullanici-gruplari'], read: 'auth', write: 'admin' },
  { prefix: '/sistem-parametreleri', screens: ['sistem-parametreleri'], read: 'screen', write: 'admin' },
  { prefix: '/zorunlu-alan-tanimlari', screens: ['zorunlu-alan-tanimlari'], read: 'auth' },
  { prefix: '/mesaj-tanimlari', screens: ['mesaj-tanimlari'], read: 'auth' },
  { prefix: '/eposta-gonderimleri', screens: ['eposta-gonderimleri'] },
  { prefix: '/sistem-guncelleme', screens: ['sistem-guncelleme'], read: 'admin', write: 'admin' },
  { prefix: '/audit-log', screens: ['audit-log'], read: 'admin', write: 'admin' },
  { prefix: '/meta', screens: ['tablo-bilgileri', 'sayfa-sorgulari'], read: 'auth' },
  { prefix: '/sql-console', screens: ['sql-sorgu'], read: 'screen' },
];
/* eslint-enable object-curly-newline */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function normalizePath(p) {
  let s = String(p || '/').split('?')[0];
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

function matchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function findRoutePolicy(path) {
  const p = normalizePath(path);
  let best = null;
  for (const pol of ROUTE_POLICIES) {
    if (matchesPrefix(p, pol.prefix) && (!best || pol.prefix.length > best.prefix.length)) {
      best = pol;
    }
  }
  return best;
}

/**
 * Ekran aksiyonu: yeni | duzelt | sil | islem (yeni|duzelt) | null (erişim).
 * `rel` mount prefix’ine göre göreli yoldur.
 */
function actionFor(method, rel) {
  const m = String(method || 'GET').toUpperCase();
  if (!WRITE_METHODS.has(m)) return null;
  if (m === 'DELETE') return 'sil';
  if (m === 'PUT' || m === 'PATCH') return 'duzelt';
  if (rel === '' || rel === '/') return 'yeni';
  return 'islem';
}

/**
 * İstek için etkin yetki kuralı.
 * @returns {{ level: string, screens: string[], action: string|null, prefix: string|null }}
 */
function resolvePolicy(method, path) {
  const p = normalizePath(path);
  const m = String(method || 'GET').toUpperCase();
  const isWrite = WRITE_METHODS.has(m);
  const pol = findRoutePolicy(p);
  if (!pol) {
    return { level: 'full', screens: [], action: actionFor(m, p), prefix: null };
  }
  const rel = p.slice(pol.prefix.length);
  let level = isWrite ? (pol.write || 'screen') : (pol.read || 'module');
  let screens = pol.screens || [];
  let action = actionFor(m, rel);
  for (const rule of pol.rules || []) {
    if (rule.methods && !rule.methods.includes(m)) continue;
    if (rule.path && !rule.path.test(rel)) continue;
    if (isWrite && rule.write) level = rule.write;
    if (!isWrite && rule.read) level = rule.read;
    if (rule.screens) screens = rule.screens;
    if (rule.action !== undefined) action = rule.action;
    break;
  }
  return { level, screens, action, prefix: pol.prefix };
}

function modulesOfScreens(screens) {
  return [...new Set((screens || []).map((s) => SCREEN_MODULE[s]).filter(Boolean))];
}

function aliasCandidates(screenId) {
  const canonical = SCREEN_ALIASES[screenId] || screenId;
  const aliases = Object.entries(SCREEN_ALIASES).filter(([, v]) => v === canonical).map(([k]) => k);
  return [...new Set([screenId, canonical, ...aliases])];
}

module.exports = {
  MODULE_SCREENS,
  SCREEN_ALIASES,
  MODULE_ALIASES,
  SCREEN_MODULE,
  ROUTE_POLICIES,
  WRITE_METHODS,
  normalizePath,
  findRoutePolicy,
  resolvePolicy,
  actionFor,
  modulesOfScreens,
  aliasCandidates,
};
