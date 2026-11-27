# Menü Migrasyon Raporu

## Yapılan değişiklikler

1. `fixed-tanimlar` (Sabit Tanımlar) modülü kaldırıldı.
2. Ortak tanımlar `ana-veri` altına işlem gruplarıyla taşındı.
3. `mesaj-tanimlari` → `sistem` / Parametreler.
4. `stok-depo` → `stok` / Depo İşlemleri.
5. Modül içi işlem grupları süreç diline göre yenilendi (Satış, Satınalma, Kalite, İK, Finans, Onay, CRM, Proje).
6. Görünen ekran adları tutarlı Türkçe iş terimlerine çekildi (teknik ID değişmedi).
7. `modulYetkiliMi`: `fixed-tanimlar` yetkisi `ana-veri` ve `sistem` için geriye dönük geçerli.
8. MODULE_TITLE_EN / SECTION_TITLE_EN / MOD_ICONS güncellendi.

## Korunan teknik kimlikler

- Ekran ID, techId, endpoint, route/component bağlantıları, CRUD alanları değiştirilmedi.
- Orphan ekranlar (`satin-alma-teklif-istekleri`, `vergi-kodlari`) kodda bırakıldı; menüye alınmadı.

## Taşınan ekranlar (16)

| Ekran ID | Eski | Yeni |
|---|---|---|
| `country-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Coğrafya |
| `sehir-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Coğrafya |
| `olcu-birimleri` | Sabit Tanımlar / (düz liste) | Ana Veri / Ölçü ve Dil |
| `dil-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Ölçü ve Dil |
| `para-birimi-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Para ve Kur |
| `doviz-exchange_rate-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Para ve Kur |
| `banka-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Para ve Kur |
| `odeme-kosulu-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Ticari Tanımlamalar |
| `teslimat-kosulu-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Ticari Tanımlamalar |
| `belge-tipleri` | Sabit Tanımlar / (düz liste) | Ana Veri / Ticari Tanımlamalar |
| `hareket-kodlari` | Sabit Tanımlar / (düz liste) | Ana Veri / Ticari Tanımlamalar |
| `kategori-tip-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Ticari Tanımlamalar |
| `kategori-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Ticari Tanımlamalar |
| `numarator-tanimi` | Sabit Tanımlar / (düz liste) | Ana Veri / Numaratör |
| `stok-depo` | Üretim / Depo | Stok / Depo İşlemleri |
| `mesaj-tanimlari` | Sabit Tanımlar / (düz liste) | Sistem / Parametreler |

## Yeniden adlandırılan ekranlar (34)

| Ekran ID | Eski ad | Yeni ad |
|---|---|---|
| `country-tanimi` | Ülke Tanımı | Ülkeler |
| `sehir-tanimi` | Şehir / İl Tanımı | Şehir / İl |
| `dil-tanimi` | Dil Tanımı | Diller |
| `para-birimi-tanimi` | Para Birimi Tanımı | Para Birimleri |
| `banka-tanimi` | Banka Tanımı | Bankalar |
| `odeme-kosulu-tanimi` | Ödeme Koşulu | Ödeme Koşulları |
| `teslimat-kosulu-tanimi` | Teslimat Koşulu | Teslimat Koşulları |
| `numarator-tanimi` | Numaratör Tanımı | Numaratörler |
| `tahsilat-odemeler` | Tahsilat / Ödeme | Tahsilat ve Ödemeler |
| `e-belge-kuyruk` | e-Belge Kuyruk | e-Belge Kuyruğu |
| `stok-karti` | Stok Kartı | Stok Kartları |
| `depo-bakiye` | Depo Bakiye | Depo Bakiyeleri |
| `stok-depo` | Depo Stok Bağ | Depo Stok Bağları |
| `tedarikci-irsaliyeleri` | Tedarikçi İrsaliyeleri | Alış İrsaliyeleri |
| `irsaliye-yonetimi` | İrsaliye Yönetimi | Satış İrsaliyeleri |
| `fatura-yonetimi` | Fatura Yönetimi | Satış Faturaları |
| `kk-uygunsuzluklar` | KK Uygunsuzluklar | Uygunsuzluklar |
| `kk-kontrol-planlari` | KK Kontrol Planları | Kontrol Planları |
| `kk-stok-planlari` | KK Stok Plan Bağları | Stok Plan Bağları |
| `kk-ret-nedenleri` | KK Ret Nedenleri | Ret Nedenleri |
| `fatura-kontrolleri` | Fatura Kontrolleri (3-way) | Fatura Kontrolleri |
| `finans-bilanco` | Bilanço (Özet) | Bilanço |
| `prj-projeler` | Proje Listesi | Projeler |
| `prj-isler` | İş Listesi | İşler |
| `prj-board` | Kanban Board | Kanban |
| `prj-butce` | Proje Bütçe Özeti | Proje Bütçesi |
| `hr-onboarding` | Onboarding Görevleri | İşe Giriş Görevleri |
| `onay-role-tanim` | Onay Rolü | Onay Rolleri |
| `onay-kural-tanim` | Onay Kuralı | Onay Kuralları |
| `onay-rota-tanim` | Onay Rotası | Onay Rotaları |
| `onay-message-template` | Onay Mesaj Şablonu | Onay Mesaj Şablonları |
| `onay-status-tanim` | Onay Durum Tanımı | Onay Durumları |
| `zorunlu-alan-tanimlari` | Zorunlu Alan Tanımı | Zorunlu Alanlar |
| `sayfa-sorgulari` | Sayfa Sorgu | Sayfa Sorguları |

## Aynı modülde başlık değişenler (136)

| Ekran ID | Eski başlık | Yeni başlık |
|---|---|---|
| `cari-kartlari` | Kartlar | Cari Kartlar |
| `tahsilat-odemeler` | Finans | Cari İşlemler |
| `cari-ekstre` | Finans | Cari İşlemler |
| `cari-mutabakat` | Finans | Cari İşlemler |
| `e-belge-kuyruk` | Finans | e-Belge |
| `stok-karti` | Kartlar | Stok Kartları |
| `stok-hareketleri` | Bakiye & Hareket | Stok Hareketleri |
| `stok-hareket-raporu` | Bakiye & Hareket | Stok Hareketleri |
| `depo-bakiye` | Bakiye & Hareket | Stok Hareketleri |
| `transfer-emirleri` | Bakiye & Hareket | Depo İşlemleri |
| `sayim-belgeleri` | Bakiye & Hareket | Depo İşlemleri |
| `stok-partileri` | Bakiye & Hareket | Parti, Seri ve Rezervasyon |
| `stok-serileri` | Bakiye & Hareket | Parti, Seri ve Rezervasyon |
| `stok-rezervasyonlari` | Bakiye & Hareket | Parti, Seri ve Rezervasyon |
| `stok-ikame` | Bakiye & Hareket | Parti, Seri ve Rezervasyon |
| `mrp-parametre` | Planlama | MRP Planlama |
| `mrp-bagimsiz-ihtiyac` | Planlama | MRP Planlama |
| `mrp-calisma` | Planlama | MRP Planlama |
| `mrp-hesap` | Planlama | MRP Planlama |
| `mrp-sonuclar` | Planlama | MRP Planlama |
| `mrp-hareket-raporu` | Planlama | MRP Planlama |
| `satin-alma-talepleri` | Sipariş | Talepler |
| `satin-alma-teklifleri` | Teklif | Teklif ve Anlaşmalar |
| `satin-alma-anlasmalari` | Teklif | Teklif ve Anlaşmalar |
| `satin-alma-siparisleri` | Sipariş | Siparişler |
| `satis-teklifleri` | Sipariş | Teklifler |
| `satis-siparisleri` | Sipariş | Siparişler |
| `sevk-emirleri` | Sevk | Sevkiyat |
| `irsaliye-yonetimi` | Belge Yönetimi | Satış Belgeleri |
| `fatura-yonetimi` | Belge Yönetimi | Satış Belgeleri |
| `uretim-planlari` | İş Emri | Üretim Planlama |
| `uretim-emirleri` | İş Emri | İş Emirleri |
| `siparis-is-emri` | İş Emri | İş Emirleri |
| `toplu-is-emri` | İş Emri | İş Emirleri |
| `uretim-girisleri` | İş Emri | Üretim Gerçekleşme |
| `hizli-uretim-girisi` | İş Emri | Üretim Gerçekleşme |
| `sinif-tanimi` | Tanımlar | Tanımlamalar |
| `is-merkezleri` | Tanımlar | Tanımlamalar |
| `is-istasyonlari` | Tanımlar | Tanımlamalar |
| `routings` | Tanımlar | Tanımlamalar |
| `uretim-emri-tipleri` | Tanımlar | Tanımlamalar |
| `uretim-parametreleri` | Tanımlar | Tanımlamalar |
| `uretim-parametre-dogrulama` | Tanımlar | Tanımlamalar |
| `kk-emirleri-gkk` | Emirler | Giriş Kalite |
| `kk-emirleri-ckk` | Emirler | Çıkış Kalite |
| `kk-uygunsuzluklar` | Emirler | Uygunsuzluk ve CAPA |
| `kk-capa` | Emirler | Uygunsuzluk ve CAPA |
| `kk-kontrol-planlari` | Tanımlar | Tanımlamalar |
| `kk-stok-planlari` | Tanımlar | Tanımlamalar |
| `kk-ret-nedenleri` | Tanımlar | Tanımlamalar |
| `hesap-plani` | Tanımlar | Muhasebe Tanımlamaları |
| `hesap-belirleme-kurallari` | Tanımlar | Muhasebe Tanımlamaları |
| `finans-vergi-kodlari` | Tanımlar | Muhasebe Tanımlamaları |
| `finans-ulke-paketleri` | Tanımlar | Muhasebe Tanımlamaları |
| `mali-yillar` | Tanımlar | Muhasebe Tanımlamaları |
| `muhasebe-donemleri` | Tanımlar | Muhasebe Tanımlamaları |
| `fiyat-listeleri` | Tanımlar | Muhasebe Tanımlamaları |
| `muhasebe-belgeleri` | Belgeler | Muhasebe Belgeleri |
| `fatura-kontrolleri` | Belgeler | Muhasebe Belgeleri |
| `finans-banka-hesaplari` | Banka / Kasa | Banka ve Kasa |
| `finans-kasa-hesaplari` | Banka / Kasa | Banka ve Kasa |
| `finans-nakit-hareketleri` | Belgeler | Banka ve Kasa |
| `mizan` | Raporlar | Finansal Raporlar |
| `finans-yevmiye` | Raporlar | Finansal Raporlar |
| `finans-bilanco` | Raporlar | Finansal Raporlar |
| `finans-gelir-tablosu` | Raporlar | Finansal Raporlar |
| `kokpit` | Raporlar | Finansal Raporlar |
| `crm-adaylar` | Pipeline | Müşteri Yönetimi |
| `crm-kontaklar` | Pipeline | Müşteri Yönetimi |
| `crm-firsatlar` | Pipeline | Müşteri Yönetimi |
| `crm-faaliyet-planlari` | Faaliyet | Faaliyet ve Görevler |
| `crm-faaliyetler` | Faaliyet | Faaliyet ve Görevler |
| `crm-gorevler` | Faaliyet | Faaliyet ve Görevler |
| `crm-ajanda` | Faaliyet | Faaliyet ve Görevler |
| `crm-firsat-asamalari` | Tanımlar | Tanımlamalar |
| `crm-faaliyet-tipleri` | Tanımlar | Tanımlamalar |
| `prj-projeler` | Projeler | Proje ve Portföy |
| `prj-isler` | Projeler | Proje ve Portföy |
| `prj-dashboard` | Projeler | Proje ve Portföy |
| `prj-portfolio` | Projeler | Proje ve Portföy |
| `prj-board` | Agile / Plan | Agile ve Planlama |
| `prj-backlog` | Agile / Plan | Agile ve Planlama |
| `prj-sprintler` | Agile / Plan | Agile ve Planlama |
| `prj-gantt` | Agile / Plan | Agile ve Planlama |
| `prj-workload` | Agile / Plan | Agile ve Planlama |
| `prj-butce` | Bütçe / Risk | Bütçe ve Risk |
| `prj-riskler` | Bütçe / Risk | Bütçe ve Risk |
| `prj-sablonlar` | Şablon / Otomasyon | Şablon ve Otomasyon |
| `prj-automations` | Şablon / Otomasyon | Şablon ve Otomasyon |
| `prj-project-types` | Tanımlar | Tanımlamalar |
| `prj-project-categories` | Tanımlar | Tanımlamalar |
| `prj-project-statuses` | Tanımlar | Tanımlamalar |
| `prj-project-priorities` | Tanımlar | Tanımlamalar |
| `prj-work-item-types` | Tanımlar | Tanımlamalar |
| `prj-work-item-statuses` | Tanımlar | Tanımlamalar |
| `prj-work-item-priorities` | Tanımlar | Tanımlamalar |
| `prj-project-roles` | Tanımlar | Tanımlamalar |
| `prj-relation-types` | Tanımlar | Tanımlamalar |
| `hr-departmanlar` | Tanımlar / Parametreler | Organizasyon |
| `hr-pozisyonlar` | Tanımlar / Parametreler | Organizasyon |
| `hr-calisma-takvimleri` | Tanımlar / Parametreler | Zaman ve Devam |
| `hr-vardiyalar` | Tanımlar / Parametreler | Zaman ve Devam |
| `hr-vardiya-atamalari` | Zaman & İzin | Zaman ve Devam |
| `hr-puantaj` | Zaman & İzin | Zaman ve Devam |
| `hr-resmi-tatiller` | Tanımlar / Parametreler | Zaman ve Devam |
| `hr-izin-turleri` | Tanımlar / Parametreler | İzin Yönetimi |
| `hr-izin-talepleri` | Zaman & İzin | İzin Yönetimi |
| `hr-izin-bakiyeleri` | Zaman & İzin | İzin Yönetimi |
| `hr-ucretler` | Ücret & Bordro | Ücret ve Bordro |
| `hr-avanslar` | Ücret & Bordro | Ücret ve Bordro |
| `hr-bordro-parametreleri` | Tanımlar / Parametreler | Ücret ve Bordro |
| `hr-bordro-donemleri` | Ücret & Bordro | Ücret ve Bordro |
| `hr-bordro-calismalari` | Ücret & Bordro | Ücret ve Bordro |
| `hr-is-ilanlari` | İşe Alım & Çıkış | İşe Alım ve Çıkış |
| `hr-adaylar` | İşe Alım & Çıkış | İşe Alım ve Çıkış |
| `hr-onboarding` | İşe Alım & Çıkış | İşe Alım ve Çıkış |
| `hr-zimmetler` | İşe Alım & Çıkış | İşe Alım ve Çıkış |
| `hr-isten-cikis` | İşe Alım & Çıkış | İşe Alım ve Çıkış |
| `hr-cikis-nedenleri` | Tanımlar / Parametreler | İşe Alım ve Çıkış |
| `onaylarim` | Onay | Onay İşlemleri |
| `onay-izleme` | Onay | Onay İşlemleri |
| `onay-yetki-devri` | Onay | Onay İşlemleri |
| `onay-role-tanim` | Sabit Tanımlar | Tanımlamalar |
| `onay-kural-tanim` | Sabit Tanımlar | Tanımlamalar |
| `onay-rota-tanim` | Sabit Tanımlar | Tanımlamalar |
| `onay-message-template` | Sabit Tanımlar | Tanımlamalar |
| `onay-status-tanim` | Sabit Tanımlar | Tanımlamalar |
| `onay-modul-kullanimlari` | Sabit Tanımlar | Tanımlamalar |
| `kullanicilar` | Kullanıcılar | Kullanıcılar ve Yetkiler |
| `kullanici-gruplari` | Kullanıcılar | Kullanıcılar ve Yetkiler |
| `sistem-parametreleri` | Tanımlar | Parametreler |
| `zorunlu-alan-tanimlari` | Tanımlar | Parametreler |
| `audit-log` | Gözlem | Teknik Gözlem |
| `tablo-bilgileri` | Gözlem | Teknik Gözlem |
| `sql-sorgu` | Gözlem | Teknik Gözlem |
| `sayfa-sorgulari` | Gözlem | Teknik Gözlem |

## Geriye dönük uyumluluk

- Eski screenId ile `findScreen` / sekmeler / favoriler çalışmaya devam eder.
- Route kırılmadı; ekran açılışı screenId üzerinden.
- `fixed-tanimlar` modül yetkisi ana-veri/sistem görünürlüğüne map edilir.
- hidden/deprecated orphan ekranlar silinmedi.

## Yeni modül sırası: Ana Veri → Cari → Stok → Satınalma → Satış → Üretim → Kalite → Finans → CRM → Proje Yönetimi → İnsan Kaynakları → Onay Yönetimi → Sistem
