#!/usr/bin/env node
/**
 * ERP Kapsam Analizi ve Eksik Özellikler Matrisi — Excel üretici
 * Analiz-only: kod/şema değiştirmez. Kanıtlar 2026-10-16 kod/docs tarama anına aittir.
 */
const path = require('path');
const ExcelJS = require('exceljs');

const OUT = path.resolve(
  process.env.KAPSAM_XLSX_OUT
    || '/opt/cursor/artifacts/reports/ERP_Kapsam_Analizi_Eksik_Ozellikler_Matrisi.xlsx'
);
const OUT_REPO = path.resolve('/workspace/docs/raporlar/ERP_Kapsam_Analizi_Eksik_Ozellikler_Matrisi.xlsx');

/** @typedef {'Mevcut ve doğrulandı'|'Kısmen mevcut / eksik'|'Tanımlanmış ancak çalıştığı doğrulanamadı'|'Mevcut değil'|'İncelenmesi gerekiyor'|'Proje kapsamı dışında / karar bekliyor'} Durum */

const DURUM = {
  OK: 'Mevcut ve doğrulandı',
  KISMI: 'Kısmen mevcut / eksik',
  TANIM: 'Tanımlanmış ancak çalıştığı doğrulanamadı',
  YOK: 'Mevcut değil',
  INC: 'İncelenmesi gerekiyor',
  DISI: 'Proje kapsamı dışında / karar bekliyor',
};

/**
 * row: [id, ana, alt, ozellik, aciklama, durum, kanit, eksik, onem, teknikRisk, bagimli, oncelikSirasi, oneri, onceki, karar, uygulama]
 * karar & uygulama boş bırakılır (kullanıcı doldurur).
 */
function R(id, ana, alt, ozellik, aciklama, durum, kanit, eksik, onem, teknikRisk, bagimli, oncelikSirasi, oneri, onceki) {
  return {
    id, ana, alt, ozellik, aciklama, durum, kanit, eksik,
    onem, teknikRisk, bagimli, oncelikSirasi, oneri, onceki,
    karar: '', uygulama: '',
  };
}

/** @type {ReturnType<typeof R>[]} */
const MATRIX = [
  // ——— PLATFORM ———
  R('REQ-PLT-001', 'Platform', 'Organizasyon', 'Firma tanımı', 'Çoklu firma kartı; belgelerde firma bağlamı.', DURUM.KISMI,
    'Tablo firmalar; ekran firmalar; routes/firmalar.js. Belgelerde firma_id tutarlı zorunluluk kısmi.',
    'Multi-company filtre/zorunluluk eksik (P14).', 5, 'Orta — veri karışması riski', 'REQ-PLT-002', 15,
    'Belge/org filtrelerinde firma_id zorunlu kıl.', 'P14 skor16 YAPILMADI; scope Aşama2 Evet'),
  R('REQ-PLT-002', 'Platform', 'Organizasyon', 'İş yeri tanımı', 'Firma altında tesis/iş yeri.', DURUM.OK,
    'is_yerleri; ekran is-yerleri; migration 001/002.', '', 5, 'Düşük', 'REQ-PLT-001', 90,
    'Koruma; regresyon testi.', 'Aşama2 zorunlu — mevcut'),
  R('REQ-PLT-003', 'Platform', 'Organizasyon', 'Depo tanımı', 'İş yeri altında depo; varsayılan/rol.', DURUM.OK,
    'depolar + depo_rolu (018); ekran depolar; varsayilan.', '', 5, 'Düşük', 'REQ-PLT-002', 90,
    'Koruma.', 'Aşama2 zorunlu ek — mevcut'),
  R('REQ-PLT-004', 'Platform', 'Kullanıcı', 'Kullanıcı kartı', 'Kullanıcı kodu, grup, aktif.', DURUM.KISMI,
    'kisiler/kullanicilar CRUD; password/login yok.', 'Oturum ve kimlik doğrulama yok.', 5, 'Yüksek — spoofable header', 'REQ-PLT-006', 5,
    'JWT/oturum + parola hash.', 'P20 skor12; NEXT_STEPS bekleyen'),
  R('REQ-PLT-005', 'Platform', 'Kullanıcı', 'Kullanıcı grupları', 'Grup tanımı + yetki bayrakları.', DURUM.KISMI,
    'kullanici_gruplari; satinalma_onay/talep/kalite_kontrol (018).', 'Menü/depo yetkisi yok; bayraklar sınırlı.', 4, 'Orta', 'REQ-PLT-004', 20,
    'Menü+depo yetki matrisi.', 'P20'),
  R('REQ-PLT-006', 'Platform', 'Yetki', 'JWT / oturum tabanlı auth', 'Login, token, güvenli API.', DURUM.YOK,
    'src/utils/yetki.js: “JWT henüz yok”; X-Kullanici-Kodu header.', 'Tüm API spoof edilebilir.', 5, 'Kritik', '', 1,
    'Auth middleware + login UI.', 'P20 YAPILMADI; docs/20 bilinçli sınır'),
  R('REQ-PLT-007', 'Platform', 'Yetki', 'Menü / ekran yetkisi', 'Rol bazlı menü görünürlüğü.', DURUM.YOK,
    'public/app.js MODULES herkese açık.', 'UI gate yok.', 4, 'Yüksek', 'REQ-PLT-006', 6,
    'Screen ACL.', 'P20; Canias SYST07/08'),
  R('REQ-PLT-008', 'Platform', 'Yetki', 'Depo bazlı yetki', 'Kullanıcının depo erişimi.', DURUM.YOK,
    'Kanıt yok (tablo/middleware yok).', 'Depo izolasyonu yok.', 4, 'Yüksek', 'REQ-PLT-006', 7,
    'kullanici_depo tablosu + assert.', 'P20'),
  R('REQ-PLT-009', 'Platform', 'Yetki', 'Satınalma onay yetkisi', 'Talep oluşturma/onay grup bayrağı.', DURUM.OK,
    'assertYetki satinalma_talep/onay; routes/satin_alma_talepleri.js; test docs/20.', '', 5, 'Orta — header spoof', 'REQ-PLT-006', 25,
    'Auth ile birleştir.', 'docs/20 doğrulandı'),
  R('REQ-PLT-010', 'Platform', 'Yetki', 'Kalite kontrol yetkisi', 'KK kaydet/onay/red yetkisi.', DURUM.OK,
    'assertYetki kalite_kontrol; routes/kk_emirleri.js; docs/20.', '', 5, 'Orta — header spoof', 'REQ-PLT-006', 25,
    'Auth ile birleştir.', 'docs/20'),
  R('REQ-PLT-011', 'Platform', 'Parametreler', 'Sistem parametreleri', 'Key/value parametre ekranı.', DURUM.OK,
    'sistem_parametreleri; ekran sistem-parametreleri; STOK_NEGATIF, SMTP_*, STOK_DEPO_ZORUNLU.', '', 4, 'Düşük', '', 80,
    'Koruma; parametre kataloğu dokümante et.', 'Dalga1'),
  R('REQ-PLT-012', 'Platform', 'Numaralandırma', 'Kod serisi / numaratör', 'Belge ve kart kod üretimi.', DURUM.OK,
    'kod_serileri; ekran numarator-tanimi; kodUretici.js/belgeNo.js.', '', 5, 'Düşük', '', 85,
    'Koruma.', 'docs/08'),
  R('REQ-PLT-013', 'Platform', 'Belge tipi', 'Belge tipi sözlüğü', 'DOCTYPE kataloğu.', DURUM.OK,
    'belge_tipleri (014); /belge-tipleri read-only.', '', 4, 'Düşük', '', 70,
    'UI tanım ekranı opsiyonel.', 'P15 KISMİ'),
  R('REQ-PLT-014', 'Platform', 'Hareket kodu', 'Hareket kodu tanımı ve belge bağ', 'Stok/finans hareket kodları.', DURUM.OK,
    'hareket_kodlari; zorunlu bağ Dalga A (P02); routes/hareket_kodlari.js.', '', 5, 'Düşük', 'REQ-PLT-013', 70,
    'Koruma.', 'P02 YAPILDI skor25'),
  R('REQ-PLT-015', 'Platform', 'Belge omurgası', 'Kaynak belge referansı (REFDOC)', 'kaynak_belge_tipi/id + kalem ref.', DURUM.OK,
    '014_dalga_a_belge_omurga; belgeOmurga.js.', '', 5, 'Düşük', '', 70,
    'Koruma; tüm zincirlerde tutarlılık audit.', 'P01 YAPILDI skor25'),
  R('REQ-PLT-016', 'Platform', 'Audit', 'Alan / belge tarihçesi', 'Kim neyi ne zaman değiştirdi.', DURUM.YOK,
    'Audit tablosu/middleware yok.', 'Uyuşmazlık ve compliance riski.', 3, 'Orta', 'REQ-PLT-006', 55,
    'audit_log tablosu.', 'P21 skor12 YAPILMADI'),
  R('REQ-PLT-017', 'Platform', 'Bildirim', 'E-posta kuyruğu', 'Olay e-postası kuyruk + gönderim.', DURUM.KISMI,
    'eposta_gonderimleri; epostaService; SA onay e-posta; nodemailer opsiyonel.', 'SMTP/nodemailer yoksa gerçek gönderim yok.', 3, 'Orta', 'REQ-PLT-011', 45,
    'nodemailer bağımlılığı + SMTP kurulum.', 'P34 skor8 → docs/20 kısmi'),
  R('REQ-PLT-018', 'Platform', 'Bildirim', 'Uygulama içi bildirim / kokpit', 'Operasyonel uyarılar, dashboard.', DURUM.YOK,
    'Kokpit ekranı yok.', '', 3, 'Düşük', '', 100,
    'Açık sipariş/kritik stok widget.', 'P33 skor12 YAPILMADI'),
  R('REQ-PLT-019', 'Platform', 'İş akışı', 'Genel onay motoru', 'Çok seviyeli onay, workflow engine.', DURUM.KISMI,
    'SA talep onay + KK onay özel kod; genel WF yok.', 'Diğer belgelerde generic onay yok.', 3, 'Orta', 'REQ-PLT-006', 60,
    'Ortak onay servisi veya bilinçli sınırlı tut.', 'Aşama1 belirsiz onay seviyeleri'),
  R('REQ-PLT-020', 'Platform', 'Hata yönetimi', 'API hata standardı', 'Tutarlı JSON hata + HTTP kodları.', DURUM.KISMI,
    'Çoğu route try/catch + res.status; merkezi error middleware yok.', 'Tutarsız yanıtlar mümkün.', 3, 'Orta', '', 50,
    'Express error middleware.', 'İnceleme bulgusu'),
  R('REQ-PLT-021', 'Platform', 'UI shell', 'Modül menü + sekmeler + filtre', 'SPA shell, LIKE filtre, sekmeler.', DURUM.OK,
    'public/app.js MODULES 58 ekran; build 20261016i; içerir LIKE.', '', 4, 'Düşük', '', 95,
    'Koruma.', 'UI dalgaları'),
  R('REQ-PLT-022', 'Platform', 'UI listeler', 'Liste satır ID + tekil seçim', 'Her satırda benzersiz id; tek seçim.', DURUM.OK,
    'listColumns + rowKey/ensureRowIds; depoBakiyeListesi composite id; headless test 2026-10-16.', '', 4, 'Düşük', '', 95,
    'Koruma.', 'Bugfix 20261016h/i'),

  // ——— ANA VERİ ———
  R('REQ-MDM-001', 'Ana Veri', 'Stok', 'Stok kartı', 'Malzeme master + tip/tedarik/birim.', DURUM.OK,
    'stoklar + detay tablolar; ekran stok-karti; routes/stoklar.js.', '', 5, 'Düşük', '', 85,
    'Koruma.', 'Aşama2'),
  R('REQ-MDM-002', 'Ana Veri', 'Stok', 'Stok–iş yeri ilişkisi', 'Malzeme-tesis bağı.', DURUM.OK,
    'stok_is_yeri (002); stok kartında kullanılıyor.', '', 4, 'Düşük', 'REQ-MDM-001', 80,
    'Koruma.', 'Aşama2'),
  R('REQ-MDM-003', 'Ana Veri', 'Stok', 'Stok–depo ilişkisi', 'Malzeme-depo varsayılan giriş/çıkış.', DURUM.KISMI,
    'stok_depo (016); ekran stok-depo; STOK_DEPO_ZORUNLU parametre.', 'Zorunluluk varsayılan kapalı; satış belgelerinde otomatik depo kademeli.', 4, 'Orta', 'REQ-MDM-001', 40,
    'Zorunluluk rollout + belge default depo.', 'U07 Yapildi; docs/20 sınır'),
  R('REQ-MDM-004', 'Ana Veri', 'Stok', 'Ölçü birimleri', 'Birim lookup tablosu.', DURUM.OK,
    'olcu_birimleri; ekran olcu-birimleri.', '', 5, 'Düşük', '', 85,
    'Koruma.', 'Aşama2 zorunlu'),
  R('REQ-MDM-005', 'Ana Veri', 'Stok', 'Birim dönüşümleri', 'Stok bazlı alternatif birim + katsayı.', DURUM.KISMI,
    'stok_birim_tanimlari (009); UI/iş kuralı belgelerin hepsinde zorunlu dönüşüm yok.', 'Belge satırında otomatik çevrim eksik olabilir.', 3, 'Orta', 'REQ-MDM-004', 65,
    'Belge satırında birim çevrim doğrula.', 'İncelenmesi'),
  R('REQ-MDM-006', 'Ana Veri', 'Stok', 'Kategori / sınıf tanımları', 'ABC, marka, temin, sınıf.', DURUM.OK,
    'kategori_tanimlari; stok_siniflari; ekranlar kategori-tanimi, sinif-tanimi.', '', 3, 'Düşük', '', 90,
    'Koruma.', '010/012'),
  R('REQ-MDM-007', 'Ana Veri', 'Stok', 'Barkod tanımları', 'Stok barkod tablosu.', DURUM.KISMI,
    'stok_barkodlari (009/011); tam barkod süreç/UI matris derinliği sınırlı.', 'Okuma/toplama süreci yok.', 2, 'Düşük', 'REQ-MDM-001', 110,
    'WMS/toplama ile birlikte.', 'docs/10 erteleme'),
  R('REQ-MDM-008', 'Ana Veri', 'Stok', 'Çoklu dil stok etiketleri', 'Dil tabloları + UI dil seçimi.', DURUM.KISMI,
    'stok_dil_tanimlari var; UI dil seçimi yok.', 'UI eksik.', 2, 'Düşük', '', 120,
    'UI dil seçici veya kapsam dışı.', 'P35 skor6'),
  R('REQ-MDM-009', 'Ana Veri', 'Stok', 'Alternatif / ikame malzeme', 'BOM/ikame alternatifleri.', DURUM.YOK,
    'Kanıt yok; bilinçli kaldırılmış (P36).', '', 2, 'Düşük', 'REQ-PRD-001', 130,
    'Karar: kapsam dışı veya BOM ikame.', 'P36 YAPILMADI'),
  R('REQ-MDM-010', 'Ana Veri', 'Cari', 'Cari kartı', 'Müşteri/tedarikçi master.', DURUM.OK,
    'cariler + detay/banka/sevk/dil; ekran cari-kartlari.', '', 5, 'Düşük', '', 85,
    'Koruma.', 'Aşama2; 009'),
  R('REQ-MDM-011', 'Ana Veri', 'Cari', 'Cari–iş yeri / firma parametreleri', 'Cari firma parametreleri.', DURUM.KISMI,
    'cari_firma_parametreleri (011).', 'UI derinliği / zorunluluk doğrulanmalı.', 3, 'Orta', 'REQ-MDM-010', 70,
    'Ekran ve zorunluluk audit.', 'Aşama2 kısmi'),
  R('REQ-MDM-012', 'Ana Veri', 'Cari', 'Kişiler / kontaklar (cari)', 'Cari yetkili kişiler.', DURUM.KISMI,
    'CRM kontaklar var; klasik cari kişi alt grid ayrı değerlendirilmeli.', 'Çift model riski (kisiler vs crm_kontaklar).', 3, 'Orta', 'REQ-CRM-003', 75,
    'Model birleştirme kararı.', 'INC'),
  R('REQ-MDM-013', 'Ana Veri', 'Adres', 'Ülke tanımı', 'Ülke lookup.', DURUM.OK,
    'ulkeler; ekran ulke-tanimi.', '', 2, 'Düşük', '', 100,
    'Koruma.', '011'),
  R('REQ-MDM-014', 'Ana Veri', 'Parti', 'Parti / lot master', 'Lot kaydı + politika.', DURUM.OK,
    'stok_partileri; parti_politika; partiService; ekran stok-partileri; docs/20 test.', '', 4, 'Orta', 'REQ-INV-001', 35,
    'Seri takibini ayrı ele al.', 'P25 parti kısmı → docs/20 Yapildi'),
  R('REQ-MDM-015', 'Ana Veri', 'Seri', 'Seri numarası izlenebilirlik', 'Birim başına seri.', DURUM.YOK,
    'Seri tablosu/akış yok; yalnızca lot.', 'Regülasyon sektörlerde eksik.', 3, 'Orta', 'REQ-MDM-014', 85,
    'Karar: parti yeterli mi / seri gerekir mi.', 'P25 seri kısmı açık; scope Aşama2 Hayır'),

  // ——— STOK ———
  R('REQ-INV-001', 'Stok', 'Hareket motoru', 'Merkezi stok hareket servisi', 'Giriş/çıkış/transfer bakiye motoru.', DURUM.OK,
    'stokHareketService.js; stok_hareketleri(+satirlar); withTransaction.', '', 5, 'Düşük', '', 10,
    'Koruma; N+1 ve performans izle.', 'Aşama2 zorunlu'),
  R('REQ-INV-002', 'Stok', 'Bakiye', 'Depo bakiye listesi', 'Depo+stok+statü+parti bakiye.', DURUM.OK,
    '/stok-bakiyeleri; depoBakiyeListesi; ekran depo-bakiye; composite id.', '', 5, 'Düşük', 'REQ-INV-001', 30,
    'Koruma.', ''),
  R('REQ-INV-003', 'Stok', 'Statü', 'Stok statüleri (Kullanılabilir/Kalitede/Bloke)', 'Bakiye boyutu olarak statü.', DURUM.OK,
    'stok_hareket_satirlari.stok_statu; 018; docs/20.', '', 5, 'Orta', 'REQ-INV-001', 30,
    'Rezerve boyutunu ayrı ekle.', 'P07 → docs/20 Yapildi (rezerve hariç)'),
  R('REQ-INV-004', 'Stok', 'Rezervasyon', 'Satış rezervasyonu', 'Sipariş onayında rezerve; irsaliyede tüket.', DURUM.YOK,
    'Rezervasyon tablosu/alanı yok; bakiye yalnızca hareket.', 'Çift satış / ATP riski.', 5, 'Yüksek', 'REQ-INV-002;REQ-SAL-002', 2,
    'rezerve_miktar + rezervasyon belgeleri.', 'P03 skor20 YAPILMADI'),
  R('REQ-INV-005', 'Stok', 'Negatif stok', 'Negatif stok parametresi', 'STOK_NEGATIF parametresine uyum.', DURUM.OK,
    'belgeOmurga + stokHareketService; P38 Dalga A.', '', 5, 'Düşük', 'REQ-PLT-011', 70,
    'Koruma.', 'P38 YAPILDI'),
  R('REQ-INV-006', 'Stok', 'Manuel hareket', 'Manuel giriş/çıkış/transfer belgesi', 'Stok hareketleri ekranı.', DURUM.OK,
    '015; routes/stok_hareketleri.js; ekran stok-hareketleri; hedef_depo_id.', '', 4, 'Düşük', 'REQ-INV-001', 40,
    'Sayım belgesinden ayır.', '015'),
  R('REQ-INV-007', 'Stok', 'Transfer', 'Depolar arası transfer süreci (TRO)', 'Talep→emir→yoldaki stok.', DURUM.KISMI,
    'Manuel TRANSFER çift hareket var; TRO belge/workflow/yoldaki stok yok.', 'Süreç eksik; yalnızca anlık transfer.', 4, 'Orta', 'REQ-INV-006', 18,
    'Transfer emri belgesi + in-transit.', 'P08 skor16 YAPILMADI'),
  R('REQ-INV-008', 'Stok', 'Sayım', 'Stok sayım / düzeltme belgesi', 'Sayım belgesi + fark hareketi.', DURUM.KISMI,
    'Hareket tipi SAYIM/SAY-01 kodu var; ayrı sayım UI/workflow yok.', 'Sayım süreci operasyonel değil.', 4, 'Orta', 'REQ-INV-001', 12,
    'Sayım belgesi ekranı + onay.', 'P09 skor20 YAPILMADI'),
  R('REQ-INV-009', 'Stok', 'WMS', 'Raf/konum hareketi', 'Hareket satırında raf + toplama.', DURUM.KISMI,
    'depolar.raf_kodu/konum_kodu (011); hareket satırında konum yok.', 'WMS light eksik.', 2, 'Düşük', 'REQ-INV-001', 115,
    'Ertele veya WMS light.', 'P26 skor9'),
  R('REQ-INV-010', 'Stok', 'Emniyet stok', 'Minimum / emniyet stok', 'Stok kartı emniyet + MRP kullanımı.', DURUM.OK,
    'stoklar.emniyet_stok; mrpService dahil; docs/20 test.', '', 4, 'Düşük', 'REQ-PRD-010', 50,
    'Koruma.', 'docs/20'),
  R('REQ-INV-011', 'Stok', 'Değerleme', 'Stok maliyet / değerleme', 'FIFO/ortalama maliyet katmanı.', DURUM.YOK,
    'Maliyet katmanı yok.', 'Finans/üretim maliyet bağı yok.', 3, 'Yüksek', 'REQ-FIN-005;REQ-PRD-011', 95,
    'Karar: kapsam / yöntem.', 'P22 skor8; Aşama2 finans Hayır'),
  R('REQ-INV-012', 'Stok', 'Fire', 'Fire hareketi', 'Fire belge tipi / süreç.', DURUM.KISMI,
    'belge_tipi Fire seçeneklerde; özel fire süreci/UI yok.', 'Manuel hareketle simüle edilebilir.', 2, 'Düşük', 'REQ-INV-006', 105,
    'Üretim fire ile birleştir.', 'TANIM'),

  // ——— SATINALMA ———
  R('REQ-PUR-001', 'Satınalma', 'Talep', 'Satınalma talebi + onay', 'Talep oluşturma, onay, e-posta.', DURUM.OK,
    'satin_alma_talepleri; onayla + eposta; yetki; ekran satin-alma-talepleri.', '', 5, 'Orta — auth spoof', 'REQ-PLT-009', 28,
    'Auth sertleştir.', 'docs/20'),
  R('REQ-PUR-002', 'Satınalma', 'Sipariş', 'Satınalma siparişi', 'SA sipariş + talepten dönüşüm.', DURUM.OK,
    'satin_alma_siparisleri; /talep-donustur.', '', 5, 'Düşük', 'REQ-PUR-001', 35,
    'Koruma.', ''),
  R('REQ-PUR-003', 'Satınalma', 'Teklif', 'Teklif isteği / teklif / anlaşma CRUD', 'PUR teklif zinciri tabloları.', DURUM.KISMI,
    'createBelgeRouter thin CRUD (3 route ~14 satır); dönüşüm yok.', 'İş akışı yok.', 4, 'Orta', 'REQ-PUR-002', 16,
    'Teklif→sipariş dönüştür.', 'P40 skor20 YAPILMADI'),
  R('REQ-PUR-004', 'Satınalma', 'Teklif', 'Teklif → sipariş dönüşüm', 'Satıştaki gibi dönüştür butonu.', DURUM.YOK,
    'routes/satin_alma_teklifleri.js factory only; dönüşüm endpoint yok.', '', 4, 'Orta', 'REQ-PUR-003', 16,
    'siparise-donustur + UI.', 'P40'),
  R('REQ-PUR-005', 'Satınalma', 'Mal kabul', 'Mal kabul + stok girişi', 'Siparişten kabul, kalan miktar kilidi.', DURUM.OK,
    'mal_kabuller; stok + GKK tetik; fazla kabul engeli.', '', 5, 'Düşük', 'REQ-PUR-002;REQ-INV-001', 22,
    'Koruma.', ''),
  R('REQ-PUR-006', 'Satınalma', 'Fatura', 'Mal kabul → alış fatura bağ', 'Kabule dayalı alış faturası.', DURUM.YOK,
    'Alış faturaları bağımsız CRUD; kabulden oluşturma yok.', '3-way match önkoşulu eksik.', 4, 'Orta', 'REQ-PUR-005;REQ-FIN-001', 17,
    'mal-kabulden fatura-olustur.', 'P13 skor16'),
  R('REQ-PUR-007', 'Satınalma', 'Kontrol', '3 yönlü fatura kontrolü (VER)', 'Sipariş fiyat ↔ kabul miktar ↔ fatura.', DURUM.YOK,
    'Kanıt yok.', '', 5, 'Yüksek', 'REQ-PUR-006', 55,
    'Fatura askı/fark süreci.', 'P05 skor15'),
  R('REQ-PUR-008', 'Satınalma', 'Tedarikçi', 'Tedarikçi değerlendirme', 'Skor/KPI tedarikçi.', DURUM.YOK,
    'Kanıt yok.', '', 2, 'Düşük', 'REQ-MDM-010', 140,
    'Kapsam kararı.', 'DISI aday'),
  R('REQ-PUR-009', 'Satınalma', 'Anlaşma', 'Satınalma anlaşması fiyat bağ', 'Anlaşmadan sipariş fiyatı.', DURUM.KISMI,
    'Tablo + thin CRUD; fiyat motoru yok.', '', 3, 'Orta', 'REQ-PUR-003;REQ-SAL-007', 75,
    'Fiyat listesi ile birleştir.', 'P28'),

  // ——— SATIŞ ———
  R('REQ-SAL-001', 'Satış', 'Teklif', 'Satış teklifi → sipariş', 'Teklif CRUD + siparise-donustur.', DURUM.OK,
    'satis_teklifleri; /siparise-donustur; CRM firsat_id.', '', 5, 'Düşük', 'REQ-CRM-007', 40,
    'Koruma.', ''),
  R('REQ-SAL-002', 'Satış', 'Sipariş', 'Satış siparişi', 'Sipariş + kalan sevk/irsaliye/fatura.', DURUM.OK,
    'siparisler; kalan_* alanları; sevk-emri-olustur.', '', 5, 'Düşük', '', 30,
    'Rezervasyon ekle.', 'P32 iskelet YAPILDI'),
  R('REQ-SAL-003', 'Satış', 'Sevk', 'Sevk emri', 'Siparişten sevk emri.', DURUM.OK,
    'sevk_emirleri; routes/sevk_emirleri.js; siparisler sevk oluştur.', '', 4, 'Düşük', 'REQ-SAL-002', 40,
    'ATP uyarısını güçlendir.', 'P11 iskelet'),
  R('REQ-SAL-004', 'Satış', 'İrsaliye', 'İrsaliye onay + stok çıkış', 'Onayda depo doğrulama, stok çıkış.', DURUM.OK,
    'irsaliyeler onayla; P04/P39 Dalga A; STOK_NEGATIF.', '', 5, 'Düşük', 'REQ-INV-001', 25,
    'Koruma.', 'P04/P39 YAPILDI'),
  R('REQ-SAL-005', 'Satış', 'Fatura', 'İrsaliyeden satış faturası', 'Onaylı irsaliyeden fatura.', DURUM.OK,
    'irsaliyeler /fatura-olustur; durum kilidi Onayli.', '', 5, 'Düşük', 'REQ-SAL-004', 30,
    'Liste filtresi tutarlılığı audit.', 'P39 YAPILDI; P37 açık'),
  R('REQ-SAL-006', 'Satış', 'Fatura', 'Fatura liste filtresi (alış/satış)', 'fatura_turu query tutarlılığı.', DURUM.INC,
    'UI alis/satis-faturalari ?fatura_turu=; PUT e-belge alanları şüpheli (P37).', 'Kod audit gerekir.', 4, 'Orta', 'REQ-FIN-001', 14,
    'Endpoint/PUT audit + test.', 'P37 skor20 YAPILMADI'),
  R('REQ-SAL-007', 'Satış', 'Fiyat', 'Fiyat listesi / iskonto', 'Cari+stok+miktar fiyat.', DURUM.YOK,
    'Fiyat listesi tablosu/motor yok.', 'Teklif/sipariş manuel fiyat.', 4, 'Orta', 'REQ-MDM-010;REQ-MDM-001', 58,
    'Fiyat koşulu motoru.', 'P28 skor12'),
  R('REQ-SAL-008', 'Satış', 'ATP', 'ATP / kullanılabilir stok kontrolü', 'Siparişte miktar ≤ kullanılabilir.', DURUM.KISMI,
    'Sevk oluştururken bakiye uyarı iskeleti (siparisler.js); rezervasyon yok.', 'Sert ATP yok.', 4, 'Orta', 'REQ-INV-004', 19,
    'Sipariş onayında sert kontrol.', 'P11 skor16'),
  R('REQ-SAL-009', 'Satış', 'İade', 'Satış/alış iade süreçleri', 'İade irsaliye/fatura.', DURUM.YOK,
    'IADE DOCTYPE/süreç yok.', '', 4, 'Orta', 'REQ-SAL-004;REQ-PUR-005', 48,
    'İade belge tipi + stok ters hareket.', 'P27 skor16'),
  R('REQ-SAL-010', 'Satış', 'Çıktı', 'PDF/QR irsaliye-fatura', 'Yazdırılabilir çıktı.', DURUM.YOK,
    'PDF motoru yok.', '', 3, 'Düşük', 'REQ-SAL-005', 90,
    'HTML/PDF şablon.', 'P18 skor16'),
  R('REQ-SAL-011', 'Satış', 'Ödeme', 'Ödeme koşulları / vade belgede', 'Belgede ödeme koşulu zorunlu.', DURUM.KISMI,
    'Cari kartta alanlar olabilir; belge zorunluluğu/tahsilat planı yok.', '', 3, 'Orta', 'REQ-FIN-003', 70,
    'Belge alanı + vade hesap.', 'P29 skor12'),

  // ——— CRM ———
  R('REQ-CRM-001', 'CRM', 'Aday', 'Müşteri adayları + cariye dönüşüm', 'Aday kartı ve dönüştür.', DURUM.OK,
    'crm_adaylar; /cariye-donustur; ekran crm-adaylar; C01-C02.', '', 4, 'Düşük', 'REQ-MDM-010', 60,
    'Koruma.', 'C01-C02 Yapildi'),
  R('REQ-CRM-002', 'CRM', 'Kontak', 'CRM kontakları', 'Aday/cari kontak.', DURUM.OK,
    'crm_kontaklar; C03.', '', 3, 'Düşük', 'REQ-CRM-001', 80,
    'Cari kişilerle birleştirme kararı.', 'C03'),
  R('REQ-CRM-003', 'CRM', 'Fırsat', 'Fırsat + satırlar + aşama', 'Pipeline fırsat.', DURUM.OK,
    'crm_firsatlar(+satirlari); aşamalar; C04-C05.', '', 4, 'Düşük', '', 60,
    'Koruma.', 'C04-C05'),
  R('REQ-CRM-004', 'CRM', 'Fırsat', 'Fırsat kapat', 'Kazanıldı/kaybedildi kapatma.', DURUM.KISMI,
    'API /kapat; UI birincil buton zayıf (docs/19 kalan).', 'UX eksik.', 3, 'Düşük', 'REQ-CRM-003', 85,
    'Birincil kapat butonu.', 'C06 Yapildi + kalan UX'),
  R('REQ-CRM-005', 'CRM', 'Fırsat', 'Fırsat → satış teklifi', 'Nested convert.', DURUM.OK,
    '/teklife-donustur; firsat_id; C07.', '', 4, 'Düşük', 'REQ-SAL-001', 55,
    'Koruma.', 'C07'),
  R('REQ-CRM-006', 'CRM', 'Faaliyet', 'Faaliyet tipi / plan / faaliyet', 'Aktivite yönetimi.', DURUM.OK,
    'crm_faaliyet_*; C08-C10.', '', 3, 'Düşük', '', 80,
    'Koruma.', 'C08-C10'),
  R('REQ-CRM-007', 'CRM', 'Görev', 'CRM görevleri', 'Görev takibi.', DURUM.OK,
    'crm_gorevler; C11.', '', 3, 'Düşük', '', 85,
    'Koruma.', 'C11'),
  R('REQ-CRM-008', 'CRM', 'Kampanya', 'Kampanya yönetimi', 'Pazarlama kampanyası.', DURUM.DISI,
    'C13 Yapilmadi; dalga dışı.', '', 2, 'Düşük', '', 150,
    'Kapsam kararı.', 'C13'),
  R('REQ-CRM-009', 'CRM', 'Anket', 'Anket', 'Müşteri anketi.', DURUM.DISI,
    'C14 Yapilmadi.', '', 1, 'Düşük', '', 160,
    'Kapsam dışı önerilir.', 'C14'),
  R('REQ-CRM-010', 'CRM', 'Ajanda', 'Ajanda / takvim UI', 'Takvim görünümü.', DURUM.YOK,
    'C15; plan listesi mevcut.', '', 2, 'Düşük', 'REQ-CRM-006', 145,
    'Takvim veya ertele.', 'C15'),
  R('REQ-CRM-011', 'CRM', 'Cari kopya', 'CRM müşteri kartı kopyası', 'Ayrı CRM müşteri ekranı.', DURUM.DISI,
    'C12; mevcut cari kullanılır (bilinçli).', '', 1, 'Düşük', 'REQ-MDM-010', 155,
    'Kapsam dışı tut.', 'C12'),

  // ——— ÜRETİM ———
  R('REQ-PRD-001', 'Üretim', 'BOM', 'Ürün ağacı (çok seviyeli)', 'BOM + bileşenler.', DURUM.OK,
    'urun_agaclari; 005/006; ekran urun-agaci; geçerlilik/min-max (016).', '', 5, 'Düşük', 'REQ-MDM-001', 40,
    'Koruma.', 'U05'),
  R('REQ-PRD-002', 'Üretim', 'BOM', 'BOM seviye listesi / malzeme değişikliği', 'BOM araçları.', DURUM.OK,
    '/bom/seviye-listesi; malzeme-degistir; ekranlar.', '', 3, 'Düşük', 'REQ-PRD-001', 90,
    'Koruma.', ''),
  R('REQ-PRD-003', 'Üretim', 'BOM', 'Varyant / konfigüratör', 'Varyant BOM.', DURUM.DISI,
    'P24; bilinçli yok.', '', 2, 'Yüksek eğer yapılırsa', 'REQ-PRD-001', 160,
    'Kapsam kararı.', 'P24 skor6'),
  R('REQ-PRD-004', 'Üretim', 'Rota', 'Rotalar + operasyonlar', 'Rota şablon/varsayılan/geçerlilik.', DURUM.OK,
    'rotalar; 016 alanları; U06.', '', 5, 'Düşük', 'REQ-PRD-005', 45,
    'Koruma.', 'U06'),
  R('REQ-PRD-005', 'Üretim', 'İş merkezi', 'İş merkezleri', 'Kaynak tanımı.', DURUM.OK,
    'is_merkezleri; ekran.', '', 4, 'Düşük', '', 80,
    'Koruma.', 'Aşama2'),
  R('REQ-PRD-006', 'Üretim', 'İş emri', 'Üretim emirleri + tip', 'Emir tipi, planlı/kesin, onay.', DURUM.OK,
    'uretim_emirleri; uretim_emri_tipleri; U01-U02; büyük route.', '', 5, 'Orta — karmaşık route', '', 35,
    'Route parçalama / test.', 'U01-U02'),
  R('REQ-PRD-007', 'Üretim', 'İş emri', 'Siparişten / toplu iş emri', 'Satış siparişinden WO UI.', DURUM.OK,
    'siparis-is-emri; toplu-is-emri; U03-U04. P12 docs/17 YAPILMADI → 18 kapandı.', '', 4, 'Düşük', 'REQ-SAL-002', 45,
    'Sipariş formunda 2. convert (U09).', 'P12 → U03 Yapildi; U09 Kismi'),
  R('REQ-PRD-008', 'Üretim', 'Operasyon', 'Operasyon tamamlama', 'Op tamamla + miktar kilidi.', DURUM.OK,
    'uretim_emirleri operasyon-tamamla.', '', 4, 'Düşük', 'REQ-PRD-006', 50,
    'Koruma.', ''),
  R('REQ-PRD-009', 'Üretim', 'Giriş', 'Üretim girişi + stok', 'Mamul giriş / tüketim.', DURUM.OK,
    'uretim-giris; stok motoru; ÇKK tetik (kalite).', '', 5, 'Orta', 'REQ-INV-001;REQ-QLT-003', 35,
    'Koruma.', ''),
  R('REQ-PRD-010', 'Üretim', 'MRP', 'MRP net ihtiyaç (v1)', 'Emniyet+talep−stok−açık PO öneri listesi.', DURUM.KISMI,
    'mrpService; ekran mrp-hesap readOnly; otomatik talimat oluşturma yok; kapasite yok.', 'Öneri→talep/WO otomasyonu yok.', 4, 'Orta', 'REQ-INV-010;REQ-PUR-001', 42,
    'Öneriden SA talep/WO oluştur.', 'P06 → docs/20 kısmi; U10 kapasite açık'),
  R('REQ-PRD-011', 'Üretim', 'Maliyet', 'Fiili üretim maliyeti', 'Tüketim+işçilik → birim maliyet.', DURUM.YOK,
    'Kanıt yok.', '', 3, 'Yüksek', 'REQ-INV-011', 100,
    'Ertele veya basit standart maliyet.', 'P22 skor8'),
  R('REQ-PRD-012', 'Üretim', 'Kapasite', 'Kapasite / çizelgeleme', 'İş merkezi yük.', DURUM.DISI,
    'Kanıt yok; Canias CAP.', '', 2, 'Yüksek', 'REQ-PRD-005', 150,
    'Kapsam dışı önerilir (v1).', 'P23 skor6; Aşama2 Hayır'),
  R('REQ-PRD-013', 'Üretim', 'Yan ürün / fire', 'Yan ürün ve fire üretimi', 'WO yan ürün/fire kayıtları.', DURUM.YOK,
    'Özel yan ürün akışı yok.', '', 2, 'Orta', 'REQ-PRD-009', 120,
    'Karar.', 'INC/DISI'),
  R('REQ-PRD-014', 'Üretim', 'Fason', 'Fason üretim', 'Dış üretim süreci.', DURUM.YOK,
    'Kanıt yok; YouTube Faz2 adayı.', '', 2, 'Orta', '', 140,
    'Kapsam kararı.', 'Faz2'),

  // ——— KALİTE ———
  R('REQ-QLT-001', 'Kalite', 'Plan', 'Kontrol planı + kriterler', 'Plan/kriter tanımı.', DURUM.OK,
    'kk_kontrol_planlari/kriterleri; ekranlar; 018.', '', 4, 'Düşük', '', 50,
    'Koruma.', 'P30 → docs/20'),
  R('REQ-QLT-002', 'Kalite', 'Plan', 'Stok–plan bağları + ret nedenleri', 'Malzeme plan eşlemesi.', DURUM.OK,
    'kk_stok_planlari; kk_ret_nedenleri.', '', 3, 'Düşük', 'REQ-QLT-001', 70,
    'Koruma.', ''),
  R('REQ-QLT-003', 'Kalite', 'GKK/ÇKK', 'GKK/ÇKK emirleri onay/red', 'Mal kabul/üretim kalite emri.', DURUM.KISMI,
    'kaliteService + API kaydet/onayla/reddet; UI ekranları readOnly/liste odaklı; docs/20 API test OK.', 'Kısmi ret/ölçüm UI formu sınırlı.', 5, 'Orta', 'REQ-PUR-005;REQ-PRD-009', 24,
    'Ölçüm/ret UI formunu tamamla.', 'docs/20 bilinçli sınır'),
  R('REQ-QLT-004', 'Kalite', 'Uygunsuzluk', 'Uygunsuzluk kaydı', 'NC kayıtları.', DURUM.KISMI,
    'kk_uygunsuzluklar tablosu (018); tam UI/süreç derinliği sınırlı.', 'CAPA ile bağ yok.', 3, 'Orta', 'REQ-QLT-003', 80,
    'UI + CAPA.', 'INC'),
  R('REQ-QLT-005', 'Kalite', 'CAPA', 'Düzeltici faaliyet', 'CAPA süreci.', DURUM.YOK,
    'Kanıt yok.', '', 2, 'Düşük', 'REQ-QLT-004', 135,
    'Kapsam kararı.', 'DISI aday'),
  R('REQ-QLT-006', 'Kalite', 'Numune/tolerans', 'Numune ve tolerans yönetimi', 'İleri kalite.', DURUM.KISMI,
    'Kriterlerde tolerans alanları olabilir; numune süreci ayrı değil.', '', 2, 'Düşük', 'REQ-QLT-001', 125,
    'İhtiyaç doğrula.', 'INC'),

  // ——— FİNANS ———
  R('REQ-FIN-001', 'Finans', 'Fatura', 'Alış/satış fatura kayıtları', 'Fatura master-detail.', DURUM.KISMI,
    'faturalar CRUD; zincir satışta güçlü, alışta bağ zayıf; muhasebe otomatik yok.', 'AR/AP ve muhasebe entegrasyonu eksik.', 5, 'Yüksek', 'REQ-SAL-005;REQ-PUR-006', 20,
    'Alış bağ + muhasebe öneri.', 'Aşama2 kısmi; finans v1.x'),
  R('REQ-FIN-002', 'Finans', 'Muhasebe', 'Hesap planı', 'Muhasebe hesapları.', DURUM.OK,
    'muhasebe_hesaplari; ekran hesap-plani.', '', 4, 'Düşük', '', 75,
    'Koruma.', '012'),
  R('REQ-FIN-003', 'Finans', 'Muhasebe', 'Muhasebe belgeleri (manuel fiş)', 'Fiş CRUD + onay + denge kontrolü.', DURUM.OK,
    'muhasebe_belgeleri onayla/onay-kaldir; denge check.', '', 4, 'Orta', 'REQ-FIN-002', 55,
    'Belgeden otomatik fiş ekle.', ''),
  R('REQ-FIN-004', 'Finans', 'Muhasebe', 'Belge → muhasebe entegrasyonu', 'Onaylı faturadan otomatik/öneri fiş.', DURUM.YOK,
    'Otomatik entegrasyon yok.', '', 5, 'Yüksek', 'REQ-FIN-001;REQ-FIN-003', 52,
    'Hesap belirleme kuralları.', 'P16 skor15'),
  R('REQ-FIN-005', 'Finans', 'Cari hareket', 'Cari borç/alacak ekstre', 'Fatura+ödeme hareketi.', DURUM.YOK,
    'Cari hareket motoru yok.', '', 4, 'Yüksek', 'REQ-FIN-001', 53,
    'Cari hareket + tahsilat/ödeme.', 'P17 skor12'),
  R('REQ-FIN-006', 'Finans', 'Tahsilat/ödeme', 'Tahsilat ve ödeme belgeleri', 'Kasa/banka tahsilat.', DURUM.YOK,
    'Kanıt yok.', '', 4, 'Yüksek', 'REQ-FIN-005', 54,
    'FIN temel tahsilat.', 'Canias FIN Faz2/3'),
  R('REQ-FIN-007', 'Finans', 'Rapor', 'Mizan', 'Hesap mizanı.', DURUM.OK,
    '/mizan; ekran mizan readOnly.', '', 3, 'Düşük', 'REQ-FIN-003', 85,
    'Koruma.', ''),
  R('REQ-FIN-008', 'Finans', 'Vergi/kur', 'Vergi motoru / çoklu kur', 'KDV/kur motoru.', DURUM.KISMI,
    'Faturada KDV alanları olası; tam vergi/kur motoru yok (Aşama2 kısmi).', 'Çoklu para birimi yok.', 3, 'Orta', 'REQ-FIN-001', 90,
    'İhtiyaç doğrula.', 'Aşama2 kısmi'),
  R('REQ-FIN-009', 'Finans', 'Mutabakat', 'Cari/banka mutabakat', 'Mutabakat araçları.', DURUM.YOK,
    'Kanıt yok.', '', 2, 'Orta', 'REQ-FIN-005', 130,
    'Ertele.', 'Faz3'),
  R('REQ-FIN-010', 'Finans', 'e-Dönüşüm', 'GİB e-fatura/e-irsaliye', 'UBL+imza+gönderim.', DURUM.DISI,
    'Alan iskeleti 013; entegrasyon yok.', 'Ayrı proje.', 3, 'Kritik dış bağımlılık', 'REQ-SAL-010', 170,
    'Ayrı proje olarak tut.', 'P19 skor3; Aşama2 Hayır'),

  // ——— İK / BAKIM ———
  R('REQ-HR-001', 'İnsan Kaynakları', 'Personel', 'Personel / özlük', 'İK personel kartı.', DURUM.DISI,
    'Modül/tablo yok. kisiler kullanıcı için kullanılıyor.', 'Kapsam dışı (mevcut proje).', 1, '—', '', 180,
    'Kapsam dışı önerilir.', 'Aşama2 dışı'),
  R('REQ-HR-002', 'İnsan Kaynakları', 'Puantaj', 'İzin / vardiya / puantaj / bordro', 'İK operasyonları.', DURUM.DISI,
    'Kanıt yok.', '', 1, '—', 'REQ-HR-001', 185,
    'Kapsam dışı.', ''),
  R('REQ-MNT-001', 'Bakım', 'Ekipman', 'Ekipman / bakım emirleri', 'CMMS.', DURUM.DISI,
    'Kanıt yok.', '', 1, '—', '', 190,
    'Kapsam dışı.', ''),

  // ——— RAPOR ———
  R('REQ-RPT-001', 'Raporlama', 'Liste', 'Ekran filtre + dışa aktarma', 'LIKE filtre var; Excel export?', DURUM.KISMI,
    'Filtre paneli var; CSV/Excel export kanıtı yok.', 'Export eksik.', 3, 'Düşük', 'REQ-PLT-021', 95,
    'Liste export.', ''),
  R('REQ-RPT-002', 'Raporlama', 'Dashboard', 'Operasyonel kokpit', 'KPI panosu.', DURUM.YOK,
    'Yok.', '', 3, 'Düşük', '', 100,
    'P33.', 'P33'),
  R('REQ-RPT-003', 'Raporlama', 'Yetki', 'Yetkiye bağlı veri görünürlüğü', 'Row-level security.', DURUM.YOK,
    'Auth/ACL yok.', '', 4, 'Yüksek', 'REQ-PLT-006;REQ-PLT-007', 8,
    'Auth sonrası RLS.', 'P20'),

  // ——— TEKNİK ———
  R('REQ-TEC-001', 'Teknik', 'Migration', 'Sıralı migration + IF NOT EXISTS', 'Güvenli şema evrimi.', DURUM.OK,
    'db/migrate.js BEGIN/COMMIT; 001–018 IF NOT EXISTS; DROP TABLE yok.', '', 5, 'Düşük', '', 5,
    'Koruma; DATABASE.md güncelle.', 'Dalga A risk notu kapandı'),
  R('REQ-TEC-002', 'Teknik', 'Transaction', 'Yazma işlemlerinde withTransaction', 'Atomik belge+stok.', DURUM.OK,
    'src/utils/withTransaction.js; mutasyon route’larında yaygın.', 'Tüm route’ların kapsaması audit edilmeli.', 5, 'Orta', '', 10,
    'Coverage checklist.', ''),
  R('REQ-TEC-003', 'Teknik', 'Bütünlük', 'Master-detail PK/FK', 'CASCADE çocuklar; header FK’ler.', DURUM.KISMI,
    'Çocuklarda ON DELETE CASCADE yaygın; bazı header FK’lerde ON DELETE yok.', 'Yetim belge riski sınırlı.', 4, 'Orta', '', 35,
    'FK politikası dokümante et.', 'P01 sonrası'),
  R('REQ-TEC-004', 'Teknik', 'Test', 'Otomatik test suite', 'Unit/integration/CI test.', DURUM.YOK,
    'npm test stub; yalnızca demo:cycle / demo:ornek-dongu.', 'Regresyon riski yüksek.', 5, 'Yüksek', '', 3,
    'Kritik yollar için test suite.', 'docs/18 kalan'),
  R('REQ-TEC-005', 'Teknik', 'Güvenlik', 'Sırlar / env', 'DB şifresi .env.', DURUM.KISMI,
    'dotenv kullanılıyor; eski dokümanlarda gömülü şifre uyarısı (01).', 'Repo taraması gerekir.', 5, 'Yüksek', '', 4,
    'Secret audit + .gitignore.', '01_DOCUMENT_ANALYSIS'),
  R('REQ-TEC-006', 'Teknik', 'Performans', 'N+1 / indeks', 'Liste sorguları optimize.', DURUM.INC,
    'Sistematik N+1 audit yok; büyük listelerde risk.', '', 3, 'Orta', '', 65,
    'EXPLAIN + indeks geçişi.', 'P-list teknik borç'),
  R('REQ-TEC-007', 'Teknik', 'Backup', 'Yedekleme / geri yükleme', 'PG backup prosedürü.', DURUM.INC,
    'Kodda prosedür yok; altyapı ops.', 'Ops runbook eksik.', 4, 'Yüksek (ops)', '', 40,
    'Backup runbook.', 'INC'),
  R('REQ-TEC-008', 'Teknik', 'Mimari', 'Frontend stack', 'React+Vite hedef vs vanilla SPA.', DURUM.KISMI,
    'ARCHITECTURE React planlı; üretimde public/app.js monolith ~5k satır.', 'Bakım maliyeti.', 2, 'Orta', '', 125,
    'Karar: vanilla devam / React migrasyon.', '05_TECHNOLOGY'),
  R('REQ-TEC-009', 'Teknik', 'Dokümantasyon', 'Yaşayan ekran/katalog dokümanı', 'docs/09 güncelliği.', DURUM.KISMI,
    'docs/09 build notu eski (20261014d); CRM/parti sonrası güncellenmemiş olabilir.', 'Doküman sapması.', 2, 'Düşük', '', 110,
    'docs/09 güncelle.', ''),
  R('REQ-TEC-010', 'Teknik', 'Legacy', 'belge_numaralari vs kod_serileri', 'Çift numaralandırma modeli.', DURUM.KISMI,
    'belge_numaralari şemada; runtime kod_serileri.', 'Kafa karışıklığı.', 2, 'Düşük', 'REQ-PLT-012', 115,
    'Legacy tabloyu deprecate et.', ''),

  // ——— EK: UX dönüştür / açık miktar ———
  R('REQ-UX-001', 'Platform', 'UX', 'Dönüştür diyalogları (depo seçimi)', 'Prompt yerine form diyaloğu + timeline.', DURUM.KISMI,
    'P31 Dalga A YAPILDI; U09 sipariş formunda 2. convert hâlâ kısmi.', 'Sipariş formu 2. convert eksik.', 3, 'Düşük', 'REQ-PRD-007', 75,
    'Sipariş formuna WO convert.', 'P31 YAPILDI; U09 Kismi'),
  R('REQ-UX-002', 'Satış', 'Açık miktar', 'Kalem bazlı açık miktar takibi', 'Kısmi sevk/irsaliye/fatura.', DURUM.OK,
    'siparis_detay sevk/irsaliye/fatura edilen; kalan_* API.', '', 5, 'Düşük', 'REQ-SAL-002', 40,
    'Koruma.', 'P32 YAPILDI iskelet'),
];

// ——— Teknik borç satırları (Sheet C kaynağı; Matrix'te de TEC ile örtüşür) ———
const TECH_DEBT = [
  { id: 'TD-01', baslik: 'JWT / auth yok — header spoof', durum: DURUM.YOK, onem: 5, kanit: 'yetki.js; docs/20', onceki: 'P20', oneri: 'Auth öncelikli' },
  { id: 'TD-02', baslik: 'Otomatik test yok', durum: DURUM.YOK, onem: 5, kanit: 'package.json test stub', onceki: 'docs/18 kalan', oneri: 'Kritik path testleri' },
  { id: 'TD-03', baslik: 'DROP TABLE riski', durum: DURUM.OK, onem: 5, kanit: 'migrations: DROP TABLE yok; yalnız CHECK DROP', onceki: 'Dalga A notu', oneri: 'Politika koru' },
  { id: 'TD-04', baslik: 'Transaction kapsamı', durum: DURUM.KISMI, onem: 5, kanit: 'withTransaction yaygın; %100 coverage doğrulanmadı', onceki: '', oneri: 'Route checklist' },
  { id: 'TD-05', baslik: 'Master-detail FK politikası', durum: DURUM.KISMI, onem: 4, kanit: 'CASCADE çocuklar; header FK varyasyonu', onceki: 'P01', oneri: 'Standartlaştır' },
  { id: 'TD-06', baslik: 'Snapshot vs ilişkisel tutarlılık', durum: DURUM.INC, onem: 4, kanit: 'Belge satırlarında stok kod/ad snapshot olası', onceki: 'gap raporları', oneri: 'Audit' },
  { id: 'TD-07', baslik: 'Sipariş türü / belge tipi tanımları', durum: DURUM.KISMI, onem: 3, kanit: 'belge_tipleri var; geniş destek tabloları kısmi', onceki: 'P15', oneri: 'Destek tablo UI' },
  { id: 'TD-08', baslik: 'N+1 sorgu riski', durum: DURUM.INC, onem: 3, kanit: 'Sistematik audit yok', onceki: '', oneri: 'Profil + indeks' },
  { id: 'TD-09', baslik: 'Stok hareketleri / fatura-irsaliye akışı', durum: DURUM.KISMI, onem: 5, kanit: 'Satış zinciri güçlü; alış fatura bağ ve rezervasyon eksik', onceki: 'P03/P13', oneri: 'Dalga B' },
  { id: 'TD-10', baslik: 'SA teklif zinciri thin CRUD', durum: DURUM.KISMI, onem: 4, kanit: '_belgeCrud factory', onceki: 'P40', oneri: 'Dönüşüm workflow' },
  { id: 'TD-11', baslik: 'E-posta: nodemailer opsiyonel', durum: DURUM.KISMI, onem: 3, kanit: 'epostaService require optional', onceki: 'P34/docs/20', oneri: 'Bağımlılık ekle' },
  { id: 'TD-12', baslik: 'DATABASE.md / CHANGELOG güncelliği', durum: DURUM.KISMI, onem: 2, kanit: 'DATABASE.md 001–003; CHANGELOG 0.3.2 CRM öncesi', onceki: '', oneri: 'Doküman sync' },
  { id: 'TD-13', baslik: 'KK UI readOnly vs API yazma', durum: DURUM.KISMI, onem: 4, kanit: 'app.js kk-emirleri readOnly; API kaydet/onay', onceki: 'docs/20', oneri: 'UI aksiyonları' },
  { id: 'TD-14', baslik: 'belge_numaralari legacy', durum: DURUM.KISMI, onem: 2, kanit: '002 tablo; runtime kod_serileri', onceki: '', oneri: 'Deprecate' },
  { id: 'TD-15', baslik: 'Secret / gömülü şifre uyarısı', durum: DURUM.INC, onem: 5, kanit: 'docs/01 uyarısı; dotenv var', onceki: '01', oneri: 'Repo secret scan' },
];

/** Önceki kararlar — P/C/U yeniden doğrulama */
const ONCEKI = [
  // P list
  ...[
    ['P01', 25, 'YAPILDI', DURUM.OK, '014 + belgeOmurga', 'REQ-PLT-015'],
    ['P02', 25, 'YAPILDI', DURUM.OK, 'hareket_kodu zorunlu bağ', 'REQ-PLT-014'],
    ['P03', 20, 'YAPILMADI', DURUM.YOK, 'Rezervasyon yok', 'REQ-INV-004'],
    ['P04', 25, 'YAPILDI', DURUM.OK, 'İrsaliye depo doğrulama', 'REQ-SAL-004'],
    ['P05', 15, 'YAPILMADI', DURUM.YOK, '3-way match yok', 'REQ-PUR-007'],
    ['P06', 15, 'YAPILMADI→sonra kısmi', DURUM.KISMI, 'docs/20 MRP Hesap; otomasyon yok', 'REQ-PRD-010'],
    ['P07', 12, 'YAPILMADI→sonra kısmi', DURUM.OK, 'stok_statu 018 (rezerve hariç)', 'REQ-INV-003'],
    ['P08', 16, 'YAPILMADI', DURUM.KISMI, 'Manuel transfer var; TRO yok', 'REQ-INV-007'],
    ['P09', 20, 'YAPILMADI', DURUM.KISMI, 'SAYIM tipi var; sayım UI yok', 'REQ-INV-008'],
    ['P10', 4, 'bilinçli erteleme', DURUM.DISI, 'Tek belge kalem motoru', ''],
    ['P11', 16, 'YAPILMADI (iskelet)', DURUM.KISMI, 'Sevk uyarı iskeleti', 'REQ-SAL-008'],
    ['P12', 20, 'YAPILMADI→U03 Yapildi', DURUM.OK, 'siparis-is-emri ekranı', 'REQ-PRD-007'],
    ['P13', 16, 'YAPILMADI', DURUM.YOK, 'Mal kabul→alış fatura yok', 'REQ-PUR-006'],
    ['P14', 16, 'YAPILMADI', DURUM.KISMI, 'Firma var; multi-company zorunluluk yok', 'REQ-PLT-001'],
    ['P15', 15, 'KISMİ', DURUM.KISMI, 'belge_tipleri; diğer destek kısmi', 'REQ-PLT-013'],
    ['P16', 15, 'YAPILMADI', DURUM.YOK, 'Belge→muhasebe yok', 'REQ-FIN-004'],
    ['P17', 12, 'YAPILMADI', DURUM.YOK, 'Cari ekstre yok', 'REQ-FIN-005'],
    ['P18', 16, 'YAPILMADI', DURUM.YOK, 'PDF/QR yok', 'REQ-SAL-010'],
    ['P19', 3, 'YAPILMADI', DURUM.DISI, 'GİB ayrı proje', 'REQ-FIN-010'],
    ['P20', 12, 'YAPILMADI', DURUM.YOK, 'JWT yok', 'REQ-PLT-006'],
    ['P21', 12, 'YAPILMADI', DURUM.YOK, 'Audit yok', 'REQ-PLT-016'],
    ['P22', 8, 'YAPILMADI', DURUM.YOK, 'Fiili maliyet yok', 'REQ-PRD-011'],
    ['P23', 6, 'YAPILMADI', DURUM.DISI, 'Kapasite yok', 'REQ-PRD-012'],
    ['P24', 6, 'YAPILMADI', DURUM.DISI, 'Varyant yok', 'REQ-PRD-003'],
    ['P25', 9, 'YAPILMADI→parti yapıldı', DURUM.KISMI, 'Lot OK; seri yok', 'REQ-MDM-014;REQ-MDM-015'],
    ['P26', 9, 'YAPILMADI', DURUM.KISMI, 'Raf alanları; hareket konum yok', 'REQ-INV-009'],
    ['P27', 16, 'YAPILMADI', DURUM.YOK, 'İade yok', 'REQ-SAL-009'],
    ['P28', 12, 'YAPILMADI', DURUM.YOK, 'Fiyat listesi yok', 'REQ-SAL-007'],
    ['P29', 12, 'YAPILMADI', DURUM.KISMI, 'Belge vade zorunluluğu yok', 'REQ-SAL-011'],
    ['P30', 6, 'YAPILMADI→docs/20', DURUM.KISMI, 'GKK/ÇKK API OK; UI kısmi', 'REQ-QLT-003'],
    ['P31', 20, 'YAPILDI', DURUM.KISMI, 'UX iyileşti; U09 kısmi', 'REQ-UX-001'],
    ['P32', 20, 'YAPILDI (iskelet)', DURUM.OK, 'kalan miktarlar', 'REQ-UX-002'],
    ['P33', 12, 'YAPILMADI', DURUM.YOK, 'Kokpit yok', 'REQ-PLT-018'],
    ['P34', 8, 'YAPILMADI→kısmi', DURUM.KISMI, 'E-posta kuyruk; SMTP opsiyonel', 'REQ-PLT-017'],
    ['P35', 6, 'YAPILMADI', DURUM.KISMI, 'Dil tablosu var; UI yok', 'REQ-MDM-008'],
    ['P36', 6, 'YAPILMADI', DURUM.YOK, 'İkame yok', 'REQ-MDM-009'],
    ['P37', 20, 'YAPILMADI', DURUM.INC, 'Fatura filtre/PUT audit gerekir', 'REQ-SAL-006'],
    ['P38', 20, 'YAPILDI', DURUM.OK, 'STOK_NEGATIF', 'REQ-INV-005'],
    ['P39', 25, 'YAPILDI', DURUM.OK, 'İrsaliye durum kilidi', 'REQ-SAL-005'],
    ['P40', 20, 'YAPILMADI', DURUM.YOK, 'SA teklif→sipariş yok', 'REQ-PUR-004'],
  ].map(([kod, skor, oncekiDurum, yeni, kanit, req]) => ({
    kaynak: 'docs/16+17 P-listesi', kod, madde: kod, oncekiSkor: skor, oncekiDurum, dogrulananDurum: yeni, kanit, reqId: req,
  })),
  // C list
  ...[
    ['C01', 'Yapildi', DURUM.OK, 'crm-adaylar', 'REQ-CRM-001'],
    ['C02', 'Yapildi', DURUM.OK, 'cariye-donustur', 'REQ-CRM-001'],
    ['C03', 'Yapildi', DURUM.OK, 'crm-kontaklar', 'REQ-CRM-002'],
    ['C04', 'Yapildi', DURUM.OK, 'crm-firsatlar', 'REQ-CRM-003'],
    ['C05', 'Yapildi', DURUM.OK, 'crm-firsat-asamalari', 'REQ-CRM-003'],
    ['C06', 'Yapildi', DURUM.KISMI, 'API var; UI buton zayıf', 'REQ-CRM-004'],
    ['C07', 'Yapildi', DURUM.OK, 'firsat→teklif', 'REQ-CRM-005'],
    ['C08', 'Yapildi', DURUM.OK, 'faaliyet tipleri', 'REQ-CRM-006'],
    ['C09', 'Yapildi', DURUM.OK, 'faaliyet planı', 'REQ-CRM-006'],
    ['C10', 'Yapildi', DURUM.OK, 'faaliyetler', 'REQ-CRM-006'],
    ['C11', 'Yapildi', DURUM.OK, 'görevler', 'REQ-CRM-007'],
    ['C12', 'Yapilmadi', DURUM.DISI, 'bilinçli; cari kullanılır', 'REQ-CRM-011'],
    ['C13', 'Yapilmadi', DURUM.DISI, 'kampanya', 'REQ-CRM-008'],
    ['C14', 'Yapilmadi', DURUM.DISI, 'anket', 'REQ-CRM-009'],
    ['C15', 'Yapilmadi', DURUM.YOK, 'ajanda UI', 'REQ-CRM-010'],
  ].map(([kod, oncekiDurum, yeni, kanit, req]) => ({
    kaynak: 'docs/19_CRM_YAPILAN_YAPILMAYAN.csv', kod, madde: kod, oncekiSkor: '', oncekiDurum, dogrulananDurum: yeni, kanit, reqId: req,
  })),
  // U list
  ...[
    ['U01', 'Yapildi', DURUM.OK, 'uretim_emri_tipleri', 'REQ-PRD-006'],
    ['U02', 'Yapildi', DURUM.OK, 'planli_kesin', 'REQ-PRD-006'],
    ['U03', 'Yapildi', DURUM.OK, 'siparis-is-emri', 'REQ-PRD-007'],
    ['U04', 'Yapildi', DURUM.OK, 'toplu-is-emri', 'REQ-PRD-007'],
    ['U05', 'Yapildi', DURUM.OK, 'BOM geçerlilik', 'REQ-PRD-001'],
    ['U06', 'Yapildi', DURUM.OK, 'rota geçerlilik', 'REQ-PRD-004'],
    ['U07', 'Yapildi', DURUM.KISMI, 'stok_depo; zorunlu değil', 'REQ-MDM-003'],
    ['U08', 'Yapilmadi→CRM 19', DURUM.OK, 'CRM C01–C11', 'REQ-CRM-001'],
    ['U09', 'Kismi', DURUM.KISMI, '2. convert eksik', 'REQ-UX-001'],
    ['U10', 'Yapilmadi→MRP kısmi', DURUM.KISMI, 'MRP v1 var; kapasite yok', 'REQ-PRD-010;REQ-PRD-012'],
  ].map(([kod, oncekiDurum, yeni, kanit, req]) => ({
    kaynak: 'docs/18_UYUMSOFT_YAPILAN_YAPILMAYAN.csv', kod, madde: kod, oncekiSkor: '', oncekiDurum, dogrulananDurum: yeni, kanit, reqId: req,
  })),
];

const ROADMAP = [
  { faz: 1, ad: 'Veri bütünlüğü, güvenlik ve kritik hatalar', maddeler: 'REQ-PLT-006, REQ-TEC-004, REQ-TEC-005, REQ-INV-004, REQ-INV-008, REQ-SAL-006, REQ-TEC-002', gerekce: 'Auth spoof, test yok, rezervasyon/sayım boşlukları, fatura filtre audit.' },
  { faz: 2, ad: 'Temel ERP altyapısı ve ana veriler', maddeler: 'REQ-PLT-007, REQ-PLT-008, REQ-PLT-001, REQ-MDM-003, REQ-MDM-005, REQ-PLT-017', gerekce: 'Menü/depo yetkisi, multi-company, stok-depo zorunluluk, e-posta SMTP.' },
  { faz: 3, ad: 'Temel iş süreçleri', maddeler: 'REQ-PUR-004, REQ-PUR-006, REQ-INV-007, REQ-SAL-008, REQ-QLT-003, REQ-SAL-009', gerekce: 'SA teklif dönüşüm, alış fatura bağ, TRO, ATP, KK UI, iade.' },
  { faz: 4, ad: 'Modüller arası entegrasyonlar', maddeler: 'REQ-FIN-004, REQ-FIN-005, REQ-FIN-006, REQ-PUR-007, REQ-PRD-010, REQ-SAL-007', gerekce: 'Muhasebe entegrasyonu, cari hareket, 3-way match, MRP otomasyon, fiyat listesi.' },
  { faz: 5, ad: 'Raporlama, otomasyon ve ileri özellikler', maddeler: 'REQ-PLT-018, REQ-RPT-001, REQ-INV-009, REQ-MDM-015, REQ-PRD-011, REQ-FIN-010', gerekce: 'Kokpit, export, WMS/seri/maliyet; GİB ayrı proje.' },
];

const HEADERS = [
  'ID', 'Ana modül', 'Alt modül', 'Gereksinim / özellik', 'Açıklama ve beklenen davranış',
  'Mevcut durum', 'Kanıt / ilgili dosya, tablo, ekran veya kod', 'Eksiklik veya risk',
  'Önem puanı (1–5)', 'Teknik risk', 'Bağımlı olduğu maddeler', 'Öncelik sırası',
  'Önerilen işlem', 'Önceki değerlendirmedeki durum', 'Kullanıcı kararı', 'Uygulama durumu',
];

const DURUM_FILL = {
  [DURUM.OK]: 'C6EFCE',
  [DURUM.KISMI]: 'FFEB9C',
  [DURUM.TANIM]: 'FCE4D6',
  [DURUM.YOK]: 'FFC7CE',
  [DURUM.INC]: 'DDEBF7',
  [DURUM.DISI]: 'E2EFDA',
};

async function build() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KTB ERP Kapsam Analizi';
  wb.created = new Date();
  wb.properties.date1904 = false;

  const lastDataRow = MATRIX.length + 1;

  // ——— A (önce oluştur; formüller matris adını kullanır) ———
  const wsA = wb.addWorksheet('A. Yönetici Özeti', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsA.columns = [{ width: 42 }, { width: 18 }, { width: 50 }];
  wsA.addRow(['ERP Kapsam Analizi — Yönetici Özeti']).font = { bold: true, size: 14 };
  wsA.addRow(['Tarih', new Date().toISOString().slice(0, 10)]);
  wsA.addRow(['Kaynak dal', 'cursor/erp-lot-kalite-mrp-4f63 · migrations 001–018 · UI 20261016i']);
  wsA.addRow(['Not', 'Kod/şema değiştirilmedi. Durumlar kod+docs kanıtına dayanır; doğrulanamayanlar açık işaretlendi.']);
  wsA.addRow([]);
  wsA.addRow(['Toplam gereksinim (matris)', { formula: `COUNTA('B. ERP Gereksinim Matrisi'!A2:A${lastDataRow})` }]).font = { bold: true };
  wsA.addRow([]);
  wsA.addRow(['Duruma göre sayılar']).font = { bold: true, size: 12 };
  Object.values(DURUM).forEach((d) => {
    wsA.addRow([d, { formula: `COUNTIF('B. ERP Gereksinim Matrisi'!F:F,"${d}")` }]);
  });
  wsA.addRow([]);
  wsA.addRow(['Önem puanı dağılımı (1–5)']).font = { bold: true, size: 12 };
  for (let p = 5; p >= 1; p--) {
    wsA.addRow([`Puan ${p}`, { formula: `COUNTIF('B. ERP Gereksinim Matrisi'!I:I,${p})` }]);
  }
  wsA.addRow([]);
  wsA.addRow(['Modül bazında tamamlanma']).font = { bold: true, size: 12 };
  wsA.addRow(['Ana modül', 'Toplam', 'Mevcut ve doğrulandı', 'Eksik/Kısmi/Yok (yaklaşık)']);
  const moduller = [...new Set(MATRIX.map((m) => m.ana))];
  moduller.forEach((mod) => {
    const total = MATRIX.filter((m) => m.ana === mod).length;
    const ok = MATRIX.filter((m) => m.ana === mod && m.durum === DURUM.OK).length;
    const eksik = MATRIX.filter((m) => m.ana === mod && [DURUM.YOK, DURUM.KISMI, DURUM.TANIM, DURUM.INC].includes(m.durum)).length;
    wsA.addRow([mod, total, ok, eksik]);
  });
  wsA.addRow([]);
  wsA.addRow(['Kritik eksikler (önem≥5 ve mevcut değil / kısmi / incelenmeli)']).font = { bold: true, size: 12 };
  MATRIX.filter((m) => m.onem >= 5 && m.durum !== DURUM.OK && m.durum !== DURUM.DISI)
    .sort((a, b) => a.oncelikSirasi - b.oncelikSirasi)
    .slice(0, 15)
    .forEach((m) => wsA.addRow([m.id, m.ozellik, `${m.durum} · ${m.eksik || m.oneri}`]));
  wsA.addRow([]);
  wsA.addRow(['Başlıca teknik riskler']).font = { bold: true, size: 12 };
  [
    'API kimlik doğrulama yok (X-Kullanici-Kodu spoofable).',
    'Otomatik test suite yok; regresyon riski yüksek.',
    'Satış rezervasyonu yok → ATP/çift satış riski.',
    'Alış fatura–mal kabul bağı ve 3-way match yok.',
    'Belge→muhasebe ve cari borç/alacak motoru yok.',
    'nodemailer opsiyonel; e-posta gerçek gönderim ortam bağımlı.',
  ].forEach((t) => wsA.addRow([t]));

  // ——— B Matris ———
  const wsM = wb.addWorksheet('B. ERP Gereksinim Matrisi', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsM.columns = [
    { width: 14 }, { width: 16 }, { width: 16 }, { width: 36 }, { width: 48 },
    { width: 28 }, { width: 48 }, { width: 36 },
    { width: 12 }, { width: 22 }, { width: 28 }, { width: 12 },
    { width: 36 }, { width: 36 }, { width: 22 }, { width: 18 },
  ];
  const headerRow = wsM.addRow(HEADERS);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  headerRow.alignment = { wrapText: true, vertical: 'middle' };
  headerRow.height = 32;

  MATRIX.forEach((r) => {
    const row = wsM.addRow([
      r.id, r.ana, r.alt, r.ozellik, r.aciklama, r.durum, r.kanit, r.eksik,
      r.onem, r.teknikRisk, r.bagimli, r.oncelikSirasi, r.oneri, r.onceki, r.karar, r.uygulama,
    ]);
    row.alignment = { wrapText: true, vertical: 'top' };
    const fill = DURUM_FILL[r.durum];
    if (fill) {
      row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fill } };
    }
    const onemCell = row.getCell(9);
    if (r.onem >= 5) onemCell.font = { bold: true, color: { argb: 'FFC00000' } };
    else if (r.onem >= 4) onemCell.font = { bold: true, color: { argb: 'FFED7D31' } };
  });

  wsM.autoFilter = { from: { row: 1, column: 1 }, to: { row: lastDataRow, column: HEADERS.length } };
  for (let i = 2; i <= lastDataRow; i++) {
    wsM.getCell(i, 15).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Hemen yap,Ertele,Kapsam dışı,İncele,Karar bekliyor"'],
    };
    wsM.getCell(i, 16).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Bekliyor,Yapılacak,Devam ediyor,Tamamlandı,İptal"'],
    };
  }

  // ——— C Teknik borç ———
  const wsC = wb.addWorksheet('C. Teknik Borç ve Veri Bütün.', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsC.columns = [{ width: 10 }, { width: 42 }, { width: 28 }, { width: 10 }, { width: 48 }, { width: 22 }, { width: 28 }];
  const cHead = wsC.addRow(['ID', 'Başlık', 'Mevcut durum', 'Önem', 'Kanıt', 'Önceki ref', 'Öneri']);
  cHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF833C0C' } };
  TECH_DEBT.forEach((t) => {
    const row = wsC.addRow([t.id, t.baslik, t.durum, t.onem, t.kanit, t.onceki, t.oneri]);
    row.alignment = { wrapText: true, vertical: 'top' };
    const fill = DURUM_FILL[t.durum];
    if (fill) row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fill } };
  });
  wsC.autoFilter = { from: 'A1', to: `G${TECH_DEBT.length + 1}` };

  // ——— D Önceki kararlar ———
  const wsD = wb.addWorksheet('D. Önceki Kararlar ve Bekleyen', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsD.columns = [{ width: 36 }, { width: 10 }, { width: 12 }, { width: 28 }, { width: 28 }, { width: 40 }, { width: 18 }];
  const dHead = wsD.addRow(['Kaynak', 'Kod', 'Önceki skor', 'Önceki durum', '2026-10-16 doğrulama', 'Kanıt', 'Matris ID']);
  dHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  dHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } };
  ONCEKI.forEach((o) => {
    const row = wsD.addRow([o.kaynak, o.kod, o.oncekiSkor, o.oncekiDurum, o.dogrulananDurum, o.kanit, o.reqId]);
    row.alignment = { wrapText: true, vertical: 'top' };
    const fill = DURUM_FILL[o.dogrulananDurum];
    if (fill) row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + fill } };
  });
  wsD.autoFilter = { from: 'A1', to: `G${ONCEKI.length + 1}` };
  wsD.addRow([]);
  wsD.addRow(['Not: docs/17 Dalga A listesi 2026-10-15 tarihli; P06/P07/P12/P25/P30/P34 ve U08/U10 sonraki dalgalarda (18–20) kısmen/kapanmış olabilir — doğrulama sütunu günceldir.']).alignment = { wrapText: true };

  // ——— E Yol haritası ———
  const wsE = wb.addWorksheet('E. Geliştirme Yol Haritası', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsE.columns = [{ width: 8 }, { width: 48 }, { width: 70 }, { width: 60 }];
  const eHead = wsE.addRow(['Faz', 'Ad', 'Önerilen matris ID’leri', 'Gerekçe']);
  eHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  eHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7030A0' } };
  ROADMAP.forEach((r) => {
    const row = wsE.addRow([r.faz, r.ad, r.maddeler, r.gerekce]);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.height = 45;
  });
  wsE.addRow([]);
  wsE.addRow(['Tamamlanmış (yeniden yapılmayacak örnekler)', 'P01,P02,P04,P38,P39,P32 iskelet, U01–U07, C01–C11 çekirdek, parti/GKK API, liste ID seçim fix']).alignment = { wrapText: true };
  wsE.addRow(['Kullanıcı kararı', 'Excel “Kullanıcı kararı” sütununu doldurmadan geliştirme başlatılmamalı.']).font = { italic: true };

  // ——— Meta ———
  const wsMeta = wb.addWorksheet('Meta');
  wsMeta.columns = [{ width: 28 }, { width: 80 }];
  [
    ['Rapor', 'ERP Kapsam Analizi ve Eksik Özellikler Matrisi'],
    ['Üretim', new Date().toISOString()],
    ['Yöntem', 'Kod (routes/services/public/migrations) + docs/01–20 + P/C/U CSV yeniden doğrulama'],
    ['Sınır', 'Analiz-only; kod değişikliği yok'],
    ['Önceki skor sistemi', 'docs/16: skor = öncelik × yapılabilirlik (1–5). Matristeki “Önem puanı” ayrı 1–5 ölçeğidir; karıştırılmamalı.'],
    ['Durum etiketleri', Object.values(DURUM).join(' | ')],
    ['Çıktı yolları', `${OUT} ; ${OUT_REPO}`],
  ].forEach((r) => wsMeta.addRow(r));

  await wb.xlsx.writeFile(OUT);
  await wb.xlsx.writeFile(OUT_REPO);

  // Stats for console summary
  const stats = {};
  Object.values(DURUM).forEach((d) => { stats[d] = MATRIX.filter((m) => m.durum === d).length; });
  const kritikliler = MATRIX.filter((m) => m.onem >= 5 && m.durum !== DURUM.OK && m.durum !== DURUM.DISI)
    .sort((a, b) => a.oncelikSirasi - b.oncelikSirasi)
    .slice(0, 10);
  const bekleyen = ONCEKI.filter((o) => o.dogrulananDurum === DURUM.YOK || o.dogrulananDurum === DURUM.KISMI || o.dogrulananDurum === DURUM.INC);
  const dogrulanamayan = MATRIX.filter((m) => m.durum === DURUM.INC || m.durum === DURUM.TANIM);

  console.log(JSON.stringify({
    out: OUT,
    outRepo: OUT_REPO,
    total: MATRIX.length,
    stats,
    top10: kritikliler.map((m) => ({ id: m.id, ozellik: m.ozellik, durum: m.durum, onem: m.onem })),
    bekleyenOncekiCount: bekleyen.length,
    dogrulanamayan: dogrulanamayan.map((m) => m.id),
  }, null, 2));
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
