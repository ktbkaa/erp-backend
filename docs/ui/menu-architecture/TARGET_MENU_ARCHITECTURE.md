# Hedef Menü Mimarisi

KTB ERP menüsü en fazla üç görünür seviye kullanır: **Ana modül → İşlem grubu → Ekran**.

## Modül sırası

1. **Ana Veri** (`ana-veri`)
2. **Cari** (`cari`)
3. **Stok** (`stok`)
4. **Satınalma** (`satinalma`)
5. **Satış** (`satis`)
6. **Üretim** (`uretim`)
7. **Kalite** (`kalite`)
8. **Finans** (`finans`)
9. **CRM** (`crm`)
10. **Proje Yönetimi** (`proje`)
11. **İnsan Kaynakları** (`insan-kaynaklari`)
12. **Onay Yönetimi** (`onay`)
13. **Sistem** (`sistem`)

## Hiyerarşi

### Ana Veri

#### Organizasyon

- **Firmalar** — `companies` / `MDM-CO-SCR-001`
- **İş Yerleri** — `is-yerleri` / `MDM-PLANT-SCR-001`
- **Depolar** — `warehouses` / `MDM-WH-SCR-001`

#### Coğrafya

- **Ülkeler** — `country-tanimi` / `MDM-CTRY-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Şehir / İl** — `sehir-tanimi` / `MDM-CITY-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_

#### Ölçü ve Dil

- **Ölçü Birimleri** — `olcu-birimleri` / `MDM-UOM-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Diller** — `dil-tanimi` / `MDM-LANG-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_

#### Para ve Kur

- **Para Birimleri** — `para-birimi-tanimi` / `MDM-CUR-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Döviz Kurları** — `doviz-exchange_rate-tanimi` / `FIN-FX-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Bankalar** — `banka-tanimi` / `MDM-BANK-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_

#### Ticari Tanımlamalar

- **Ödeme Koşulları** — `odeme-kosulu-tanimi` / `MDM-PAYT-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Teslimat Koşulları** — `teslimat-kosulu-tanimi` / `MDM-DLVT-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Belge Tipleri** — `belge-tipleri` / `MDM-DOCTYPE-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Hareket Kodları** — `hareket-kodlari` / `INV-MVTC-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Kategori Tip Tanımı** — `kategori-tip-tanimi` / `MDM-CATTYPE-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_
- **Kategori Tanımı** — `kategori-tanimi` / `MDM-CAT-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_

#### Numaratör

- **Numaratörler** — `numarator-tanimi` / `SYS-NUM-SCR-001` _(taşındı: Sabit Tanımlar → Ana Veri)_

### Cari

#### Cari Kartlar

- **Cari Kartları** — `cari-kartlari` / `MDM-BP-SCR-001`

#### Cari İşlemler

- **Tahsilat ve Ödemeler** — `tahsilat-odemeler` / `FIN-APAR-SCR-001`
- **Cari Ekstre** — `cari-ekstre` / `FIN-BPST-SCR-001`
- **Cari Mutabakat** — `cari-mutabakat` / `FIN-BP-REC-001`

#### e-Belge

- **e-Belge Kuyruğu** — `e-belge-kuyruk` / `FIN-EDOC-QUE-001`

### Stok

#### Stok Kartları

- **Stok Kartları** — `stok-karti` / `INV-ITM-SCR-001`

#### Stok Hareketleri

- **Stok Hareketleri** — `stok-hareketleri` / `INV-MVT-SCR-001`
- **Stok Hareket Raporu** — `stok-hareket-raporu` / `INV-MVT-RPT-001`
- **Depo Bakiyeleri** — `depo-bakiye` / `INV-BAL-SCR-001`

#### Depo İşlemleri

- **Transfer Emirleri** — `transfer-emirleri` / `WMS-XFER-SCR-001`
- **Sayım Belgeleri** — `sayim-belgeleri` / `WMS-CNT-SCR-001`
- **Depo Stok Bağları** — `stok-depo` / `INV-WHL-SCR-001` _(taşındı: Üretim → Stok)_

#### Parti, Seri ve Rezervasyon

- **Stok Partileri** — `stok-partileri` / `INV-LOT-SCR-001`
- **Stok Serileri** — `stok-serileri` / `INV-SER-SCR-001`
- **Stok Rezervasyonları** — `stok-rezervasyonlari` / `INV-RSV-SCR-001`
- **Stok İkame** — `stok-ikame` / `INV-SUB-SCR-001`

#### MRP Planlama

- **MRP Parametreleri** — `mrp-parametre` / `MFG-MRP-PAR-001`
- **MRP Bağımsız İhtiyaç** — `mrp-bagimsiz-ihtiyac` / `MFG-IR-SCR-001`
- **MRP Konsol** — `mrp-calisma` / `MFG-MRP-SCR-001`
- **MRP Anlık Hesap** — `mrp-hesap` / `MFG-MRP-SCR-002`
- **MRP Sonuçları** — `mrp-sonuclar` / `MFG-MRP-RES-001`
- **MRP Hareket Raporu** — `mrp-hareket-raporu` / `MFG-MRP-RPT-001`

### Satınalma

#### Talepler

- **Satınalma Talepleri** — `satin-alma-talepleri` / `PUR-REQ-SCR-001`

#### Teklif ve Anlaşmalar

- **Satınalma Teklifleri** — `satin-alma-teklifleri` / `PUR-QUO-SCR-001`
- **Satınalma Anlaşmaları** — `satin-alma-anlasmalari` / `PUR-AGR-SCR-001`

#### Siparişler

- **Satınalma Siparişleri** — `satin-alma-siparisleri` / `PUR-ORD-SCR-001`

#### Mal Kabul

- **Mal Kabuller** — `mal-kabuller` / `PUR-GR-SCR-001`
- **Alış İrsaliyeleri** — `tedarikci-irsaliyeleri` / `PUR-DLV-SCR-001`
- **Giriş Kontrolleri** — `giris-kontrolleri` / `QLT-INC-SCR-001`

Menü dışı (kodda saklanır):
- Satınalma Teklif İstekleri (`satin-alma-teklif-istekleri`) — hidden/deprecated

### Satış

#### Teklifler

- **Satış Teklifleri** — `satis-teklifleri` / `SAL-QUO-SCR-001`

#### Siparişler

- **Satış Siparişleri** — `satis-siparisleri` / `SAL-ORD-SCR-001`

#### Sevkiyat

- **Sevk Emirleri** — `sevk-emirleri` / `SAL-SHP-SCR-001`

#### Satış Belgeleri

- **Satış İrsaliyeleri** — `irsaliye-yonetimi` / `SAL-DLV-SCR-001`
- **Satış Faturaları** — `fatura-yonetimi` / `SAL-INV-SCR-001`

### Üretim

#### Ürün Ağacı

- **Ürün Ağacı** — `urun-agaci` / `MFG-BOM-SCR-001`
- **Ürün Ağacı Patlatma** — `bom-patlatma` / `MFG-BOM-SCR-002`
- **Ürün Ağacı Seviye Listesi** — `bom-level-listesi` / `MFG-BOM-SCR-003`
- **Malzeme Değişikliği** — `bom-malzeme-degisikligi` / `MFG-BOM-SCR-004`

#### Üretim Planlama

- **Üretim Planları** — `uretim-planlari` / `MFG-PLN-SCR-001`

#### İş Emirleri

- **Üretim Emirleri** — `uretim-emirleri` / `MFG-WO-SCR-001`
- **Siparişten İş Emri** — `siparis-is-emri` / `MFG-WO-SCR-002`
- **Toplu İş Emri** — `toplu-is-emri` / `MFG-WO-SCR-003`

#### Üretim Gerçekleşme

- **Operasyonel Üretim Girişi** — `uretim-girisleri` / `MFG-RCPT-SCR-001`
- **Hızlı Üretim Girişi** — `hizli-uretim-girisi` / `MFG-RCPT-SCR-002`

#### Kapasite

- **İş Merkezi Yükü** — `is-merkezi-yuku` / `MFG-WCL-RPT-001`

#### Tanımlamalar

- **Sınıf Tanımı** — `sinif-tanimi` / `MFG-CLS-SCR-001`
- **İş Merkezleri** — `is-merkezleri` / `MFG-WC-SCR-001`
- **İş İstasyonları** — `is-istasyonlari` / `MFG-WS-SCR-001`
- **Rotalar** — `routings` / `MFG-ROUT-SCR-001`
- **Üretim Emri Tipleri** — `uretim-emri-tipleri` / `MFG-WOT-SCR-001`
- **Üretim Parametreleri** — `uretim-parametreleri` / `MFG-PRM-SCR-001`
- **Üretim Parametre Doğrulama** — `uretim-parametre-dogrulama` / `MFG-PRM-RPT-001`

### Kalite

#### Giriş Kalite

- **Giriş Kalite Emirleri** — `kk-emirleri-gkk` / `QLT-IQC-SCR-001`

#### Çıkış Kalite

- **Çıkış Kalite Emirleri** — `kk-emirleri-ckk` / `QLT-OQC-SCR-001`

#### Uygunsuzluk ve CAPA

- **Uygunsuzluklar** — `kk-uygunsuzluklar` / `QLT-NCR-SCR-001`
- **CAPA** — `kk-capa` / `QLT-CAPA-SCR-001`

#### Tanımlamalar

- **Kontrol Planları** — `kk-kontrol-planlari` / `QLT-PLAN-SCR-001`
- **Stok Plan Bağları** — `kk-stok-planlari` / `QLT-ITMP-SCR-001`
- **Ret Nedenleri** — `kk-ret-nedenleri` / `QLT-REJ-SCR-001`

### Finans

#### Muhasebe Tanımlamaları

- **Hesap Planı** — `hesap-plani` / `FIN-COA-SCR-001`
- **Hesap Belirleme Kuralları** — `hesap-belirleme-kurallari` / `FIN-ACR-SCR-001`
- **Vergi Kodları** — `finans-vergi-kodlari` / `FIN-TAX-SCR-001`
- **Finans Ülke Paketleri** — `finans-ulke-paketleri` / `FIN-CPK-SCR-001`
- **Mali Yıllar** — `mali-yillar` / `FIN-FY-SCR-001`
- **Muhasebe Dönemleri** — `muhasebe-donemleri` / `FIN-PER-SCR-001`
- **Fiyat Listeleri** — `fiyat-listeleri` / `FIN-PRC-SCR-001`

#### Muhasebe Belgeleri

- **Muhasebe Belgeleri** — `muhasebe-belgeleri` / `FIN-JE-SCR-001`
- **Fatura Kontrolleri** — `fatura-kontrolleri` / `FIN-3WAY-SCR-001`

#### Banka ve Kasa

- **Banka Hesapları** — `finans-banka-hesaplari` / `FIN-BNK-SCR-001`
- **Kasa Hesapları** — `finans-kasa-hesaplari` / `FIN-CSH-SCR-001`
- **Nakit Hareketleri** — `finans-nakit-hareketleri` / `FIN-CSHMV-SCR-001`

#### Finansal Raporlar

- **Mizan** — `mizan` / `FIN-TB-RPT-001`
- **Yevmiye Defteri** — `finans-yevmiye` / `FIN-JL-RPT-001`
- **Bilanço** — `finans-bilanco` / `FIN-BS-RPT-001`
- **Gelir Tablosu** — `finans-gelir-tablosu` / `FIN-PL-RPT-001`
- **Kokpit** — `kokpit` / `RPT-CPIT-SCR-001`

Menü dışı (kodda saklanır):
- Vergi Kodları (`vergi-kodlari`) — hidden/deprecated

### CRM

#### Müşteri Yönetimi

- **Müşteri Adayları** — `crm-adaylar` / `CRM-LEAD-SCR-001`
- **Kontaklar** — `crm-kontaklar` / `CRM-CNT-SCR-001`
- **Fırsatlar** — `crm-firsatlar` / `CRM-OPP-SCR-001`

#### Faaliyet ve Görevler

- **Faaliyet Planları** — `crm-faaliyet-planlari` / `CRM-APLN-SCR-001`
- **Faaliyetler** — `crm-faaliyetler` / `CRM-ACT-SCR-001`
- **Görevler** — `crm-gorevler` / `CRM-TASK-SCR-001`
- **Ajanda** — `crm-ajanda` / `CRM-CAL-SCR-001`

#### Tanımlamalar

- **Fırsat Aşamaları** — `crm-firsat-asamalari` / `CRM-STG-SCR-001`
- **Faaliyet Tipleri** — `crm-faaliyet-tipleri` / `CRM-ACTT-SCR-001`

### Proje Yönetimi

#### Proje ve Portföy

- **Projeler** — `prj-projeler` / `PRJ-PRJ-SCR-001`
- **İşler** — `prj-isler` / `PRJ-WI-SCR-001`
- **Proje Özeti** — `prj-dashboard` / `PRJ-RPT-SCR-001`
- **Portföy Özeti** — `prj-portfolio` / `PRJ-RPT-SCR-002`

#### Agile ve Planlama

- **Kanban** — `prj-board` / `PRJ-AGL-SCR-001`
- **Backlog** — `prj-backlog` / `PRJ-AGL-SCR-002`
- **Sprintler** — `prj-sprintler` / `PRJ-AGL-SCR-003`
- **Gantt / Zaman Çizelgesi** — `prj-gantt` / `PRJ-PLN-SCR-001`
- **Kaynak İş Yükü** — `prj-workload` / `PRJ-RES-SCR-001`

#### Bütçe ve Risk

- **Proje Bütçesi** — `prj-butce` / `PRJ-FIN-SCR-001`
- **Riskler** — `prj-riskler` / `PRJ-RSK-SCR-001`

#### Şablon ve Otomasyon

- **Proje Şablonları** — `prj-sablonlar` / `PRJ-DEF-SCR-030`
- **Otomasyon Kuralları** — `prj-automations` / `PRJ-AUTO-SCR-001`

#### Tanımlamalar

- **Proje Türleri** — `prj-project-types` / `PRJ-DEF-SCR-001`
- **Proje Kategorileri** — `prj-project-categories` / `PRJ-DEF-SCR-002`
- **Proje Durumları** — `prj-project-statuses` / `PRJ-DEF-SCR-003`
- **Proje Öncelikleri** — `prj-project-priorities` / `PRJ-DEF-SCR-004`
- **İş Türleri** — `prj-work-item-types` / `PRJ-DEF-SCR-010`
- **İş Durumları** — `prj-work-item-statuses` / `PRJ-DEF-SCR-011`
- **İş Öncelikleri** — `prj-work-item-priorities` / `PRJ-DEF-SCR-012`
- **Proje Rolleri** — `prj-project-roles` / `PRJ-DEF-SCR-020`
- **İş İlişki Türleri** — `prj-relation-types` / `PRJ-DEF-SCR-021`

### İnsan Kaynakları

#### Özlük

- **Personel Kartları** — `hr-personel` / `HR-EMP-SCR-001`

#### Organizasyon

- **Departmanlar** — `hr-departmanlar` / `HR-DEPT-SCR-001`
- **Pozisyonlar** — `hr-pozisyonlar` / `HR-POS-SCR-001`

#### Zaman ve Devam

- **Çalışma Takvimleri** — `hr-calisma-takvimleri` / `HR-CAL-SCR-001`
- **Vardiyalar** — `hr-vardiyalar` / `HR-SHF-SCR-001`
- **Vardiya Atamaları** — `hr-vardiya-atamalari` / `HR-SHA-SCR-001`
- **Günlük Puantaj** — `hr-puantaj` / `HR-ATT-SCR-001`
- **Resmî Tatiller** — `hr-resmi-tatiller` / `HR-HOL-SCR-001`

#### İzin Yönetimi

- **İzin Türleri** — `hr-izin-turleri` / `HR-LVT-SCR-001`
- **İzin Talepleri** — `hr-izin-talepleri` / `HR-LV-SCR-001`
- **İzin Bakiyeleri** — `hr-izin-bakiyeleri` / `HR-LVB-SCR-001`

#### Ücret ve Bordro

- **Ücret Tanımları** — `hr-ucretler` / `HR-SAL-SCR-001`
- **Avanslar** — `hr-avanslar` / `HR-ADV-SCR-001`
- **Bordro Parametreleri** — `hr-bordro-parametreleri` / `HR-PRM-SCR-001`
- **Bordro Dönemleri** — `hr-bordro-donemleri` / `HR-PRP-SCR-001`
- **Bordro Çalışmaları** — `hr-bordro-calismalari` / `HR-PRR-SCR-001`

#### İşe Alım ve Çıkış

- **İş İlanları** — `hr-is-ilanlari` / `HR-JOB-SCR-001`
- **Adaylar** — `hr-adaylar` / `HR-CAND-SCR-001`
- **İşe Giriş Görevleri** — `hr-onboarding` / `HR-ONB-SCR-001`
- **Zimmetler** — `hr-zimmetler` / `HR-AST-SCR-001`
- **İşten Çıkış** — `hr-isten-cikis` / `HR-TRM-SCR-001`
- **Çıkış Nedenleri** — `hr-cikis-nedenleri` / `HR-TRR-SCR-001`

### Onay Yönetimi

#### Onay İşlemleri

- **Onaylarım** — `onaylarim` / `SYS-APR-SCR-001`
- **Onay İzleme** — `onay-izleme` / `SYS-APR-SCR-002`
- **Onay Yetki Devri** — `onay-yetki-devri` / `SYS-APR-SCR-003`

#### Tanımlamalar

- **Onay Rolleri** — `onay-role-tanim` / `SYS-APR-SCR-004`
- **Onay Kuralları** — `onay-kural-tanim` / `SYS-APR-SCR-005`
- **Onay Rotaları** — `onay-rota-tanim` / `SYS-APR-SCR-006`
- **Onay Mesaj Şablonları** — `onay-message-template` / `SYS-APR-SCR-007`
- **Onay Durumları** — `onay-status-tanim` / `SYS-APR-SCR-008`
- **Onay Modül Kullanımları** — `onay-modul-kullanimlari` / `SYS-APR-SCR-USG`

### Sistem

#### Kullanıcılar ve Yetkiler

- **Kullanıcılar** — `kullanicilar` / `SYS-USR-SCR-001`
- **Kullanıcı Grupları** — `kullanici-gruplari` / `SYS-GRP-SCR-001`

#### Parametreler

- **Sistem Parametreleri** — `sistem-parametreleri` / `SYS-PRM-SCR-001`
- **Zorunlu Alanlar** — `zorunlu-alan-tanimlari` / `SYS-REQ-SCR-001`
- **Mesaj Tanımları** — `mesaj-tanimlari` / `SYS-MSG-SCR-001` _(taşındı: Sabit Tanımlar → Sistem)_

#### İletişim

- **E-posta Gönderimleri** — `eposta-gonderimleri` / `SYS-MAIL-SCR-001`

#### Güncelleme

- **Sistem Güncelleme** — `sistem-guncelleme` / `SYS-UPD-SCR-001`

#### Teknik Gözlem

- **Audit Log** — `audit-log` / `SYS-AUD-SCR-001`
- **Tablo Bilgileri** — `tablo-bilgileri` / `SYS-META-SCR-001`
- **SQL Sorgu** — `sql-sorgu` / `SYS-SQL-SCR-001`
- **Sayfa Sorguları** — `sayfa-sorgulari` / `SYS-QRY-SCR-001`

## Neden bu yapı?

- Ortak ana veriler tek çatıda (Ana Veri); sistem teknik ayarları ayrı (Sistem).
- Cari, Satış ve Satınalma süreçleri ayrı yetki ve belge akışlarıyla kalır.
- Stok operasyonu ile MRP planlama aynı modülde ama ayrı işlem gruplarında.
- Finans muhasebe tanımları / belgeler / nakit / raporlar olarak ayrılır.
- İK süreçleri (özlük, zaman, izin, bordro, işe alım) doğal iş dilinde gruplanır.
