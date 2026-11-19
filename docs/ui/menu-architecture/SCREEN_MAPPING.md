# Ekran Eşleştirme Envanteri

Her satır bir ekranın eski/yeni konumunu ve teknik kimliğini gösterir. Teknik ID, endpoint ve ekran ID korunmuştur.

| Eski ekran | Yeni ekran | Eski modül | Yeni modül | Eski başlık | Yeni başlık | Ekran ID | Teknik ID | Endpoint |
|---|---|---|---|---|---|---|---|---|
| Firmalar | Firmalar | Ana Veri | Ana Veri | Organizasyon | Organizasyon | `companies` | `MDM-CO-SCR-001` | `/companies` |
| İş Yerleri | İş Yerleri | Ana Veri | Ana Veri | Organizasyon | Organizasyon | `is-yerleri` | `MDM-PLANT-SCR-001` | `/is-yerleri` |
| Depolar | Depolar | Ana Veri | Ana Veri | Organizasyon | Organizasyon | `warehouses` | `MDM-WH-SCR-001` | `/warehouses` |
| Ülke Tanımı | Ülkeler | Sabit Tanımlar | Ana Veri | (düz liste) | Coğrafya | `country-tanimi` | `MDM-CTRY-SCR-001` | `/countries` |
| Şehir / İl Tanımı | Şehir / İl | Sabit Tanımlar | Ana Veri | (düz liste) | Coğrafya | `sehir-tanimi` | `MDM-CITY-SCR-001` | `/cities` |
| Ölçü Birimleri | Ölçü Birimleri | Sabit Tanımlar | Ana Veri | (düz liste) | Ölçü ve Dil | `olcu-birimleri` | `MDM-UOM-SCR-001` | `/olcu-birimleri` |
| Dil Tanımı | Diller | Sabit Tanımlar | Ana Veri | (düz liste) | Ölçü ve Dil | `dil-tanimi` | `MDM-LANG-SCR-001` | `/languages` |
| Para Birimi Tanımı | Para Birimleri | Sabit Tanımlar | Ana Veri | (düz liste) | Para ve Kur | `para-birimi-tanimi` | `MDM-CUR-SCR-001` | `/para-birimleri` |
| Döviz Kurları | Döviz Kurları | Sabit Tanımlar | Ana Veri | (düz liste) | Para ve Kur | `doviz-exchange_rate-tanimi` | `FIN-FX-SCR-001` | `/doviz-kurlari` |
| Banka Tanımı | Bankalar | Sabit Tanımlar | Ana Veri | (düz liste) | Para ve Kur | `banka-tanimi` | `MDM-BANK-SCR-001` | `/banks` |
| Ödeme Koşulu | Ödeme Koşulları | Sabit Tanımlar | Ana Veri | (düz liste) | Ticari Tanımlamalar | `odeme-kosulu-tanimi` | `MDM-PAYT-SCR-001` | `/odeme-kosullari` |
| Teslimat Koşulu | Teslimat Koşulları | Sabit Tanımlar | Ana Veri | (düz liste) | Ticari Tanımlamalar | `teslimat-kosulu-tanimi` | `MDM-DLVT-SCR-001` | `/teslimat-kosullari` |
| Belge Tipleri | Belge Tipleri | Sabit Tanımlar | Ana Veri | (düz liste) | Ticari Tanımlamalar | `belge-tipleri` | `MDM-DOCTYPE-SCR-001` | `/belge-tipleri` |
| Hareket Kodları | Hareket Kodları | Sabit Tanımlar | Ana Veri | (düz liste) | Ticari Tanımlamalar | `hareket-kodlari` | `INV-MVTC-SCR-001` | `/hareket-kodlari` |
| Kategori Tip Tanımı | Kategori Tip Tanımı | Sabit Tanımlar | Ana Veri | (düz liste) | Ticari Tanımlamalar | `kategori-tip-tanimi` | `MDM-CATTYPE-SCR-001` | `/kategori-tipleri` |
| Kategori Tanımı | Kategori Tanımı | Sabit Tanımlar | Ana Veri | (düz liste) | Ticari Tanımlamalar | `kategori-tanimi` | `MDM-CAT-SCR-001` | `/kategoriler` |
| Numaratör Tanımı | Numaratörler | Sabit Tanımlar | Ana Veri | (düz liste) | Numaratör | `numarator-tanimi` | `SYS-NUM-SCR-001` | `/kod-serileri` |
| Cari Kartları | Cari Kartları | Cari | Cari | Kartlar | Cari Kartlar | `cari-kartlari` | `MDM-BP-SCR-001` | `/partners` |
| Tahsilat / Ödeme | Tahsilat ve Ödemeler | Cari | Cari | Finans | Cari İşlemler | `tahsilat-odemeler` | `FIN-APAR-SCR-001` | `/tahsilat-odemeler` |
| Cari Ekstre | Cari Ekstre | Cari | Cari | Finans | Cari İşlemler | `cari-ekstre` | `FIN-BPST-SCR-001` | `/cari-hareketleri` |
| Cari Mutabakat | Cari Mutabakat | Cari | Cari | Finans | Cari İşlemler | `cari-mutabakat` | `FIN-BP-REC-001` | `/cari-mutabakat` |
| e-Belge Kuyruk | e-Belge Kuyruğu | Cari | Cari | Finans | e-Belge | `e-belge-kuyruk` | `FIN-EDOC-QUE-001` | `/e-belge` |
| Stok Kartı | Stok Kartları | Stok | Stok | Kartlar | Stok Kartları | `stok-karti` | `INV-ITM-SCR-001` | `/items` |
| Stok Hareketleri | Stok Hareketleri | Stok | Stok | Bakiye & Hareket | Stok Hareketleri | `stok-hareketleri` | `INV-MVT-SCR-001` | `/stok-hareketleri` |
| Stok Hareket Raporu | Stok Hareket Raporu | Stok | Stok | Bakiye & Hareket | Stok Hareketleri | `stok-hareket-raporu` | `INV-MVT-RPT-001` | `/stok-hareket-raporu` |
| Depo Bakiye | Depo Bakiyeleri | Stok | Stok | Bakiye & Hareket | Stok Hareketleri | `depo-bakiye` | `INV-BAL-SCR-001` | `/stok-bakiyeleri` |
| Transfer Emirleri | Transfer Emirleri | Stok | Stok | Bakiye & Hareket | Depo İşlemleri | `transfer-emirleri` | `WMS-XFER-SCR-001` | `/transfer-emirleri` |
| Sayım Belgeleri | Sayım Belgeleri | Stok | Stok | Bakiye & Hareket | Depo İşlemleri | `sayim-belgeleri` | `WMS-CNT-SCR-001` | `/sayim-belgeleri` |
| Depo Stok Bağ | Depo Stok Bağları | Üretim | Stok | Depo | Depo İşlemleri | `stok-depo` | `INV-WHL-SCR-001` | `/stok-depo` |
| Stok Partileri | Stok Partileri | Stok | Stok | Bakiye & Hareket | Parti, Seri ve Rezervasyon | `stok-partileri` | `INV-LOT-SCR-001` | `/stok-partileri` |
| Stok Serileri | Stok Serileri | Stok | Stok | Bakiye & Hareket | Parti, Seri ve Rezervasyon | `stok-serileri` | `INV-SER-SCR-001` | `/stok-serileri` |
| Stok Rezervasyonları | Stok Rezervasyonları | Stok | Stok | Bakiye & Hareket | Parti, Seri ve Rezervasyon | `stok-rezervasyonlari` | `INV-RSV-SCR-001` | `/stok-rezervasyonlari` |
| Stok İkame | Stok İkame | Stok | Stok | Bakiye & Hareket | Parti, Seri ve Rezervasyon | `stok-ikame` | `INV-SUB-SCR-001` | `/stok-ikame` |
| MRP Parametreleri | MRP Parametreleri | Stok | Stok | Planlama | MRP Planlama | `mrp-parametre` | `MFG-MRP-PAR-001` | `/mrp/parametreler` |
| MRP Bağımsız İhtiyaç | MRP Bağımsız İhtiyaç | Stok | Stok | Planlama | MRP Planlama | `mrp-bagimsiz-ihtiyac` | `MFG-IR-SCR-001` | `/mrp/bagimsiz-ihtiyaclar` |
| MRP Konsol | MRP Konsol | Stok | Stok | Planlama | MRP Planlama | `mrp-calisma` | `MFG-MRP-SCR-001` | `/mrp/calismalar` |
| MRP Anlık Hesap | MRP Anlık Hesap | Stok | Stok | Planlama | MRP Planlama | `mrp-hesap` | `MFG-MRP-SCR-002` | `/mrp` |
| MRP Sonuçları | MRP Sonuçları | Stok | Stok | Planlama | MRP Planlama | `mrp-sonuclar` | `MFG-MRP-RES-001` | `/mrp/calismalar` |
| MRP Hareket Raporu | MRP Hareket Raporu | Stok | Stok | Planlama | MRP Planlama | `mrp-hareket-raporu` | `MFG-MRP-RPT-001` | `/mrp-hareket-raporu` |
| Satınalma Talepleri | Satınalma Talepleri | Satınalma | Satınalma | Sipariş | Talepler | `satin-alma-talepleri` | `PUR-REQ-SCR-001` | `/satin-alma-talepleri` |
| Satınalma Teklifleri | Satınalma Teklifleri | Satınalma | Satınalma | Teklif | Teklif ve Anlaşmalar | `satin-alma-teklifleri` | `PUR-QUO-SCR-001` | `/satin-alma-teklifleri` |
| Satınalma Anlaşmaları | Satınalma Anlaşmaları | Satınalma | Satınalma | Teklif | Teklif ve Anlaşmalar | `satin-alma-anlasmalari` | `PUR-AGR-SCR-001` | `/satin-alma-anlasmalari` |
| Satınalma Siparişleri | Satınalma Siparişleri | Satınalma | Satınalma | Sipariş | Siparişler | `satin-alma-siparisleri` | `PUR-ORD-SCR-001` | `/satin-alma-siparisleri` |
| Mal Kabuller | Mal Kabuller | Satınalma | Satınalma | Mal Kabul | Mal Kabul | `mal-kabuller` | `PUR-GR-SCR-001` | `/mal-kabuller` |
| Tedarikçi İrsaliyeleri | Alış İrsaliyeleri | Satınalma | Satınalma | Mal Kabul | Mal Kabul | `tedarikci-irsaliyeleri` | `PUR-DLV-SCR-001` | `/tedarikci-irsaliyeleri` |
| Giriş Kontrolleri | Giriş Kontrolleri | Satınalma | Satınalma | Mal Kabul | Mal Kabul | `giris-kontrolleri` | `QLT-INC-SCR-001` | `/giris-kontrolleri` |
| Satış Teklifleri | Satış Teklifleri | Satış | Satış | Sipariş | Teklifler | `satis-teklifleri` | `SAL-QUO-SCR-001` | `/satis-teklifleri` |
| Satış Siparişleri | Satış Siparişleri | Satış | Satış | Sipariş | Siparişler | `satis-siparisleri` | `SAL-ORD-SCR-001` | `/sales_orders` |
| Sevk Emirleri | Sevk Emirleri | Satış | Satış | Sevk | Sevkiyat | `sevk-emirleri` | `SAL-SHP-SCR-001` | `/sevk-emirleri` |
| İrsaliye Yönetimi | Satış İrsaliyeleri | Satış | Satış | Belge Yönetimi | Satış Belgeleri | `irsaliye-yonetimi` | `SAL-DLV-SCR-001` | `/delivery_notes` |
| Fatura Yönetimi | Satış Faturaları | Satış | Satış | Belge Yönetimi | Satış Belgeleri | `fatura-yonetimi` | `SAL-INV-SCR-001` | `/invoices` |
| Ürün Ağacı | Ürün Ağacı | Üretim | Üretim | Ürün Ağacı | Ürün Ağacı | `urun-agaci` | `MFG-BOM-SCR-001` | `/urun-agaclari` |
| Ürün Ağacı Patlatma | Ürün Ağacı Patlatma | Üretim | Üretim | Ürün Ağacı | Ürün Ağacı | `bom-patlatma` | `MFG-BOM-SCR-002` | `/bom/patlatma` |
| Ürün Ağacı Seviye Listesi | Ürün Ağacı Seviye Listesi | Üretim | Üretim | Ürün Ağacı | Ürün Ağacı | `bom-level-listesi` | `MFG-BOM-SCR-003` | `/bom/level-listesi` |
| Malzeme Değişikliği | Malzeme Değişikliği | Üretim | Üretim | Ürün Ağacı | Ürün Ağacı | `bom-malzeme-degisikligi` | `MFG-BOM-SCR-004` | `/bom/malzeme-degisikligi` |
| Üretim Planları | Üretim Planları | Üretim | Üretim | İş Emri | Üretim Planlama | `uretim-planlari` | `MFG-PLN-SCR-001` | `/uretim-planlari` |
| Üretim Emirleri | Üretim Emirleri | Üretim | Üretim | İş Emri | İş Emirleri | `uretim-emirleri` | `MFG-WO-SCR-001` | `/uretim-emirleri` |
| Siparişten İş Emri | Siparişten İş Emri | Üretim | Üretim | İş Emri | İş Emirleri | `siparis-is-emri` | `MFG-WO-SCR-002` | `/uretim-emirleri/siparis-adaylari` |
| Toplu İş Emri | Toplu İş Emri | Üretim | Üretim | İş Emri | İş Emirleri | `toplu-is-emri` | `MFG-WO-SCR-003` | `/uretim-emirleri/siparis-adaylari` |
| Operasyonel Üretim Girişi | Operasyonel Üretim Girişi | Üretim | Üretim | İş Emri | Üretim Gerçekleşme | `uretim-girisleri` | `MFG-RCPT-SCR-001` | `/uretim-girisleri` |
| Hızlı Üretim Girişi | Hızlı Üretim Girişi | Üretim | Üretim | İş Emri | Üretim Gerçekleşme | `hizli-uretim-girisi` | `MFG-RCPT-SCR-002` | `/uretim-girisleri` |
| İş Merkezi Yükü | İş Merkezi Yükü | Üretim | Üretim | Kapasite | Kapasite | `is-merkezi-yuku` | `MFG-WCL-RPT-001` | `/is-merkezi-yuku` |
| Sınıf Tanımı | Sınıf Tanımı | Üretim | Üretim | Tanımlar | Tanımlamalar | `sinif-tanimi` | `MFG-CLS-SCR-001` | `/stok-siniflari` |
| İş Merkezleri | İş Merkezleri | Üretim | Üretim | Tanımlar | Tanımlamalar | `is-merkezleri` | `MFG-WC-SCR-001` | `/is-merkezleri` |
| İş İstasyonları | İş İstasyonları | Üretim | Üretim | Tanımlar | Tanımlamalar | `is-istasyonlari` | `MFG-WS-SCR-001` | `/is-istasyonlari` |
| Rotalar | Rotalar | Üretim | Üretim | Tanımlar | Tanımlamalar | `routings` | `MFG-ROUT-SCR-001` | `/routings` |
| Üretim Emri Tipleri | Üretim Emri Tipleri | Üretim | Üretim | Tanımlar | Tanımlamalar | `uretim-emri-tipleri` | `MFG-WOT-SCR-001` | `/uretim-emri-tipleri` |
| Üretim Parametreleri | Üretim Parametreleri | Üretim | Üretim | Tanımlar | Tanımlamalar | `uretim-parametreleri` | `MFG-PRM-SCR-001` | `/uretim-parametreleri` |
| Üretim Parametre Doğrulama | Üretim Parametre Doğrulama | Üretim | Üretim | Tanımlar | Tanımlamalar | `uretim-parametre-dogrulama` | `MFG-PRM-RPT-001` | `/uretim-parametreleri/dogrula` |
| Giriş Kalite Emirleri | Giriş Kalite Emirleri | Kalite | Kalite | Emirler | Giriş Kalite | `kk-emirleri-gkk` | `QLT-IQC-SCR-001` | `` |
| Çıkış Kalite Emirleri | Çıkış Kalite Emirleri | Kalite | Kalite | Emirler | Çıkış Kalite | `kk-emirleri-ckk` | `QLT-OQC-SCR-001` | `` |
| KK Uygunsuzluklar | Uygunsuzluklar | Kalite | Kalite | Emirler | Uygunsuzluk ve CAPA | `kk-uygunsuzluklar` | `QLT-NCR-SCR-001` | `/kk-uygunsuzluklar` |
| CAPA | CAPA | Kalite | Kalite | Emirler | Uygunsuzluk ve CAPA | `kk-capa` | `QLT-CAPA-SCR-001` | `/kk-capa` |
| KK Kontrol Planları | Kontrol Planları | Kalite | Kalite | Tanımlar | Tanımlamalar | `kk-kontrol-planlari` | `QLT-PLAN-SCR-001` | `/kk-kontrol-planlari` |
| KK Stok Plan Bağları | Stok Plan Bağları | Kalite | Kalite | Tanımlar | Tanımlamalar | `kk-stok-planlari` | `QLT-ITMP-SCR-001` | `/kk-stok-planlari` |
| KK Ret Nedenleri | Ret Nedenleri | Kalite | Kalite | Tanımlar | Tanımlamalar | `kk-ret-nedenleri` | `QLT-REJ-SCR-001` | `/kk-ret-nedenleri` |
| Hesap Planı | Hesap Planı | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `hesap-plani` | `FIN-COA-SCR-001` | `/muhasebe-hesaplari` |
| Hesap Belirleme Kuralları | Hesap Belirleme Kuralları | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `hesap-belirleme-kurallari` | `FIN-ACR-SCR-001` | `/hesap-belirleme-kurallari` |
| Vergi Kodları | Vergi Kodları | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `finans-vergi-kodlari` | `FIN-TAX-SCR-001` | `/finans-vergi-kodlari` |
| Finans Ülke Paketleri | Finans Ülke Paketleri | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `finans-ulke-paketleri` | `FIN-CPK-SCR-001` | `/finans-country/paketler` |
| Mali Yıllar | Mali Yıllar | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `mali-yillar` | `FIN-FY-SCR-001` | `/muhasebe-donemleri/mali-yillar` |
| Muhasebe Dönemleri | Muhasebe Dönemleri | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `muhasebe-donemleri` | `FIN-PER-SCR-001` | `/muhasebe-donemleri` |
| Fiyat Listeleri | Fiyat Listeleri | Finans | Finans | Tanımlar | Muhasebe Tanımlamaları | `fiyat-listeleri` | `FIN-PRC-SCR-001` | `/fiyat-listeleri` |
| Muhasebe Belgeleri | Muhasebe Belgeleri | Finans | Finans | Belgeler | Muhasebe Belgeleri | `muhasebe-belgeleri` | `FIN-JE-SCR-001` | `/muhasebe-belgeleri` |
| Fatura Kontrolleri (3-way) | Fatura Kontrolleri | Finans | Finans | Belgeler | Muhasebe Belgeleri | `fatura-kontrolleri` | `FIN-3WAY-SCR-001` | `/fatura-kontrolleri` |
| Banka Hesapları | Banka Hesapları | Finans | Finans | Banka / Kasa | Banka ve Kasa | `finans-banka-hesaplari` | `FIN-BNK-SCR-001` | `/finans-nakit/banka-hesaplari` |
| Kasa Hesapları | Kasa Hesapları | Finans | Finans | Banka / Kasa | Banka ve Kasa | `finans-kasa-hesaplari` | `FIN-CSH-SCR-001` | `/finans-nakit/kasa-hesaplari` |
| Nakit Hareketleri | Nakit Hareketleri | Finans | Finans | Belgeler | Banka ve Kasa | `finans-nakit-hareketleri` | `FIN-CSHMV-SCR-001` | `/finans-nakit/hareketler` |
| Mizan | Mizan | Finans | Finans | Raporlar | Finansal Raporlar | `mizan` | `FIN-TB-RPT-001` | `/mizan` |
| Yevmiye Defteri | Yevmiye Defteri | Finans | Finans | Raporlar | Finansal Raporlar | `finans-yevmiye` | `FIN-JL-RPT-001` | `/finans-raporlar/yevmiye` |
| Bilanço (Özet) | Bilanço | Finans | Finans | Raporlar | Finansal Raporlar | `finans-bilanco` | `FIN-BS-RPT-001` | `/finans-raporlar/bilanco` |
| Gelir Tablosu | Gelir Tablosu | Finans | Finans | Raporlar | Finansal Raporlar | `finans-gelir-tablosu` | `FIN-PL-RPT-001` | `/finans-raporlar/gelir-tablosu` |
| Kokpit | Kokpit | Finans | Finans | Raporlar | Finansal Raporlar | `kokpit` | `RPT-CPIT-SCR-001` | `/kokpit` |
| Müşteri Adayları | Müşteri Adayları | CRM | CRM | Pipeline | Müşteri Yönetimi | `crm-adaylar` | `CRM-LEAD-SCR-001` | `/crm-adaylar` |
| Kontaklar | Kontaklar | CRM | CRM | Pipeline | Müşteri Yönetimi | `crm-kontaklar` | `CRM-CNT-SCR-001` | `/crm-kontaklar` |
| Fırsatlar | Fırsatlar | CRM | CRM | Pipeline | Müşteri Yönetimi | `crm-firsatlar` | `CRM-OPP-SCR-001` | `/crm-firsatlar` |
| Faaliyet Planları | Faaliyet Planları | CRM | CRM | Faaliyet | Faaliyet ve Görevler | `crm-faaliyet-planlari` | `CRM-APLN-SCR-001` | `/crm-faaliyet-planlari` |
| Faaliyetler | Faaliyetler | CRM | CRM | Faaliyet | Faaliyet ve Görevler | `crm-faaliyetler` | `CRM-ACT-SCR-001` | `/crm-faaliyetler` |
| Görevler | Görevler | CRM | CRM | Faaliyet | Faaliyet ve Görevler | `crm-gorevler` | `CRM-TASK-SCR-001` | `/crm-gorevler` |
| Ajanda | Ajanda | CRM | CRM | Faaliyet | Faaliyet ve Görevler | `crm-ajanda` | `CRM-CAL-SCR-001` | `/crm-ajanda` |
| Fırsat Aşamaları | Fırsat Aşamaları | CRM | CRM | Tanımlar | Tanımlamalar | `crm-firsat-asamalari` | `CRM-STG-SCR-001` | `/crm-firsat-asamalari` |
| Faaliyet Tipleri | Faaliyet Tipleri | CRM | CRM | Tanımlar | Tanımlamalar | `crm-faaliyet-tipleri` | `CRM-ACTT-SCR-001` | `/crm-faaliyet-tipleri` |
| Proje Listesi | Projeler | Proje Yönetimi | Proje Yönetimi | Projeler | Proje ve Portföy | `prj-projeler` | `PRJ-PRJ-SCR-001` | `/prj-projeler` |
| İş Listesi | İşler | Proje Yönetimi | Proje Yönetimi | Projeler | Proje ve Portföy | `prj-isler` | `PRJ-WI-SCR-001` | `/prj-isler` |
| Proje Özeti | Proje Özeti | Proje Yönetimi | Proje Yönetimi | Projeler | Proje ve Portföy | `prj-dashboard` | `PRJ-RPT-SCR-001` | `/prj-dashboard/overview` |
| Portföy Özeti | Portföy Özeti | Proje Yönetimi | Proje Yönetimi | Projeler | Proje ve Portföy | `prj-portfolio` | `PRJ-RPT-SCR-002` | `/prj-dashboard/portfolio` |
| Kanban Board | Kanban | Proje Yönetimi | Proje Yönetimi | Agile / Plan | Agile ve Planlama | `prj-board` | `PRJ-AGL-SCR-001` | `/prj-board` |
| Backlog | Backlog | Proje Yönetimi | Proje Yönetimi | Agile / Plan | Agile ve Planlama | `prj-backlog` | `PRJ-AGL-SCR-002` | `/prj-planning/backlog` |
| Sprintler | Sprintler | Proje Yönetimi | Proje Yönetimi | Agile / Plan | Agile ve Planlama | `prj-sprintler` | `PRJ-AGL-SCR-003` | `/prj-sprintler` |
| Gantt / Zaman Çizelgesi | Gantt / Zaman Çizelgesi | Proje Yönetimi | Proje Yönetimi | Agile / Plan | Agile ve Planlama | `prj-gantt` | `PRJ-PLN-SCR-001` | `/prj-planning/gantt` |
| Kaynak İş Yükü | Kaynak İş Yükü | Proje Yönetimi | Proje Yönetimi | Agile / Plan | Agile ve Planlama | `prj-workload` | `PRJ-RES-SCR-001` | `/prj-planning/workload` |
| Proje Bütçe Özeti | Proje Bütçesi | Proje Yönetimi | Proje Yönetimi | Bütçe / Risk | Bütçe ve Risk | `prj-butce` | `PRJ-FIN-SCR-001` | `/prj-budget` |
| Riskler | Riskler | Proje Yönetimi | Proje Yönetimi | Bütçe / Risk | Bütçe ve Risk | `prj-riskler` | `PRJ-RSK-SCR-001` | `/prj-riskler` |
| Proje Şablonları | Proje Şablonları | Proje Yönetimi | Proje Yönetimi | Şablon / Otomasyon | Şablon ve Otomasyon | `prj-sablonlar` | `PRJ-DEF-SCR-030` | `/prj-sablonlar` |
| Otomasyon Kuralları | Otomasyon Kuralları | Proje Yönetimi | Proje Yönetimi | Şablon / Otomasyon | Şablon ve Otomasyon | `prj-automations` | `PRJ-AUTO-SCR-001` | `/prj-automations` |
| Proje Türleri | Proje Türleri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-project-types` | `PRJ-DEF-SCR-001` | `/prj-project-types` |
| Proje Kategorileri | Proje Kategorileri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-project-categories` | `PRJ-DEF-SCR-002` | `/prj-project-categories` |
| Proje Durumları | Proje Durumları | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-project-statuses` | `PRJ-DEF-SCR-003` | `/prj-project-statuses` |
| Proje Öncelikleri | Proje Öncelikleri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-project-priorities` | `PRJ-DEF-SCR-004` | `/prj-project-priorities` |
| İş Türleri | İş Türleri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-work-item-types` | `PRJ-DEF-SCR-010` | `/prj-work-item-types` |
| İş Durumları | İş Durumları | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-work-item-statuses` | `PRJ-DEF-SCR-011` | `/prj-work-item-statuses` |
| İş Öncelikleri | İş Öncelikleri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-work-item-priorities` | `PRJ-DEF-SCR-012` | `/prj-work-item-priorities` |
| Proje Rolleri | Proje Rolleri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-project-roles` | `PRJ-DEF-SCR-020` | `/prj-project-roles` |
| İş İlişki Türleri | İş İlişki Türleri | Proje Yönetimi | Proje Yönetimi | Tanımlar | Tanımlamalar | `prj-relation-types` | `PRJ-DEF-SCR-021` | `/prj-relation-types` |
| Personel Kartları | Personel Kartları | İnsan Kaynakları | İnsan Kaynakları | Özlük | Özlük | `hr-personel` | `HR-EMP-SCR-001` | `/hr-personel` |
| Departmanlar | Departmanlar | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | Organizasyon | `hr-departmanlar` | `HR-DEPT-SCR-001` | `/hr-org/departmanlar` |
| Pozisyonlar | Pozisyonlar | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | Organizasyon | `hr-pozisyonlar` | `HR-POS-SCR-001` | `/hr-org/pozisyonlar` |
| Çalışma Takvimleri | Çalışma Takvimleri | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | Zaman ve Devam | `hr-calisma-takvimleri` | `HR-CAL-SCR-001` | `/hr-takvim/takvimler` |
| Vardiyalar | Vardiyalar | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | Zaman ve Devam | `hr-vardiyalar` | `HR-SHF-SCR-001` | `/hr-takvim/vardiyalar` |
| Vardiya Atamaları | Vardiya Atamaları | İnsan Kaynakları | İnsan Kaynakları | Zaman & İzin | Zaman ve Devam | `hr-vardiya-atamalari` | `HR-SHA-SCR-001` | `/hr-takvim/vardiya-atamalari` |
| Günlük Puantaj | Günlük Puantaj | İnsan Kaynakları | İnsan Kaynakları | Zaman & İzin | Zaman ve Devam | `hr-puantaj` | `HR-ATT-SCR-001` | `/hr-puantaj/gunluk` |
| Resmî Tatiller | Resmî Tatiller | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | Zaman ve Devam | `hr-resmi-tatiller` | `HR-HOL-SCR-001` | `/hr-takvim/tatiller` |
| İzin Türleri | İzin Türleri | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | İzin Yönetimi | `hr-izin-turleri` | `HR-LVT-SCR-001` | `/hr-izin/turler` |
| İzin Talepleri | İzin Talepleri | İnsan Kaynakları | İnsan Kaynakları | Zaman & İzin | İzin Yönetimi | `hr-izin-talepleri` | `HR-LV-SCR-001` | `/hr-izin/talepler` |
| İzin Bakiyeleri | İzin Bakiyeleri | İnsan Kaynakları | İnsan Kaynakları | Zaman & İzin | İzin Yönetimi | `hr-izin-bakiyeleri` | `HR-LVB-SCR-001` | `/hr-izin/bakiyeler` |
| Ücret Tanımları | Ücret Tanımları | İnsan Kaynakları | İnsan Kaynakları | Ücret & Bordro | Ücret ve Bordro | `hr-ucretler` | `HR-SAL-SCR-001` | `/hr-bordro/ucretler` |
| Avanslar | Avanslar | İnsan Kaynakları | İnsan Kaynakları | Ücret & Bordro | Ücret ve Bordro | `hr-avanslar` | `HR-ADV-SCR-001` | `/hr-bordro/avanslar` |
| Bordro Parametreleri | Bordro Parametreleri | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | Ücret ve Bordro | `hr-bordro-parametreleri` | `HR-PRM-SCR-001` | `/hr-bordro/parametreler` |
| Bordro Dönemleri | Bordro Dönemleri | İnsan Kaynakları | İnsan Kaynakları | Ücret & Bordro | Ücret ve Bordro | `hr-bordro-donemleri` | `HR-PRP-SCR-001` | `/hr-bordro/donemler` |
| Bordro Çalışmaları | Bordro Çalışmaları | İnsan Kaynakları | İnsan Kaynakları | Ücret & Bordro | Ücret ve Bordro | `hr-bordro-calismalari` | `HR-PRR-SCR-001` | `/hr-bordro/calismalar` |
| İş İlanları | İş İlanları | İnsan Kaynakları | İnsan Kaynakları | İşe Alım & Çıkış | İşe Alım ve Çıkış | `hr-is-ilanlari` | `HR-JOB-SCR-001` | `/hr-ise-alim/ilanlar` |
| Adaylar | Adaylar | İnsan Kaynakları | İnsan Kaynakları | İşe Alım & Çıkış | İşe Alım ve Çıkış | `hr-adaylar` | `HR-CAND-SCR-001` | `/hr-ise-alim/adaylar` |
| Onboarding Görevleri | İşe Giriş Görevleri | İnsan Kaynakları | İnsan Kaynakları | İşe Alım & Çıkış | İşe Alım ve Çıkış | `hr-onboarding` | `HR-ONB-SCR-001` | `/hr-ise-alim/onboarding` |
| Zimmetler | Zimmetler | İnsan Kaynakları | İnsan Kaynakları | İşe Alım & Çıkış | İşe Alım ve Çıkış | `hr-zimmetler` | `HR-AST-SCR-001` | `/hr-ise-alim/zimmetler` |
| İşten Çıkış | İşten Çıkış | İnsan Kaynakları | İnsan Kaynakları | İşe Alım & Çıkış | İşe Alım ve Çıkış | `hr-isten-cikis` | `HR-TRM-SCR-001` | `/hr-ise-alim/cikislar` |
| Çıkış Nedenleri | Çıkış Nedenleri | İnsan Kaynakları | İnsan Kaynakları | Tanımlar / Parametreler | İşe Alım ve Çıkış | `hr-cikis-nedenleri` | `HR-TRR-SCR-001` | `/hr-ise-alim/cikis-nedenleri` |
| Onaylarım | Onaylarım | Onay Yönetimi | Onay Yönetimi | Onay | Onay İşlemleri | `onaylarim` | `SYS-APR-SCR-001` | `/onay-kayitlari?benim=true` |
| Onay İzleme | Onay İzleme | Onay Yönetimi | Onay Yönetimi | Onay | Onay İşlemleri | `onay-izleme` | `SYS-APR-SCR-002` | `/onay-kayitlari` |
| Onay Yetki Devri | Onay Yetki Devri | Onay Yönetimi | Onay Yönetimi | Onay | Onay İşlemleri | `onay-yetki-devri` | `SYS-APR-SCR-003` | `/onay-yetki-devirleri` |
| Onay Rolü | Onay Rolleri | Onay Yönetimi | Onay Yönetimi | Sabit Tanımlar | Tanımlamalar | `onay-role-tanim` | `SYS-APR-SCR-004` | `/onay-rolleri` |
| Onay Kuralı | Onay Kuralları | Onay Yönetimi | Onay Yönetimi | Sabit Tanımlar | Tanımlamalar | `onay-kural-tanim` | `SYS-APR-SCR-005` | `/onay-kurallari` |
| Onay Rotası | Onay Rotaları | Onay Yönetimi | Onay Yönetimi | Sabit Tanımlar | Tanımlamalar | `onay-rota-tanim` | `SYS-APR-SCR-006` | `/onay-rotalari` |
| Onay Mesaj Şablonu | Onay Mesaj Şablonları | Onay Yönetimi | Onay Yönetimi | Sabit Tanımlar | Tanımlamalar | `onay-message-template` | `SYS-APR-SCR-007` | `/onay-message-sablonlari` |
| Onay Durum Tanımı | Onay Durumları | Onay Yönetimi | Onay Yönetimi | Sabit Tanımlar | Tanımlamalar | `onay-status-tanim` | `SYS-APR-SCR-008` | `/onay-durumlari` |
| Onay Modül Kullanımları | Onay Modül Kullanımları | Onay Yönetimi | Onay Yönetimi | Sabit Tanımlar | Tanımlamalar | `onay-modul-kullanimlari` | `SYS-APR-SCR-USG` | `/onay-module-kullanimlari` |
| Kullanıcılar | Kullanıcılar | Sistem | Sistem | Kullanıcılar | Kullanıcılar ve Yetkiler | `kullanicilar` | `SYS-USR-SCR-001` | `/kullanicilar` |
| Kullanıcı Grupları | Kullanıcı Grupları | Sistem | Sistem | Kullanıcılar | Kullanıcılar ve Yetkiler | `kullanici-gruplari` | `SYS-GRP-SCR-001` | `/kullanici-gruplari` |
| Sistem Parametreleri | Sistem Parametreleri | Sistem | Sistem | Tanımlar | Parametreler | `sistem-parametreleri` | `SYS-PRM-SCR-001` | `/sistem-parametreleri` |
| Zorunlu Alan Tanımı | Zorunlu Alanlar | Sistem | Sistem | Tanımlar | Parametreler | `zorunlu-alan-tanimlari` | `SYS-REQ-SCR-001` | `/zorunlu-alan-tanimlari` |
| Mesaj Tanımları | Mesaj Tanımları | Sabit Tanımlar | Sistem | (düz liste) | Parametreler | `mesaj-tanimlari` | `SYS-MSG-SCR-001` | `/mesaj-tanimlari` |
| E-posta Gönderimleri | E-posta Gönderimleri | Sistem | Sistem | İletişim | İletişim | `eposta-gonderimleri` | `SYS-MAIL-SCR-001` | `/eposta-gonderimleri` |
| Sistem Güncelleme | Sistem Güncelleme | Sistem | Sistem | Güncelleme | Güncelleme | `sistem-guncelleme` | `SYS-UPD-SCR-001` | `/sistem-guncelleme` |
| Audit Log | Audit Log | Sistem | Sistem | Gözlem | Teknik Gözlem | `audit-log` | `SYS-AUD-SCR-001` | `/audit-log` |
| Tablo Bilgileri | Tablo Bilgileri | Sistem | Sistem | Gözlem | Teknik Gözlem | `tablo-bilgileri` | `SYS-META-SCR-001` | `/meta/ekranlar` |
| SQL Sorgu | SQL Sorgu | Sistem | Sistem | Gözlem | Teknik Gözlem | `sql-sorgu` | `SYS-SQL-SCR-001` | `/sql-console` |
| Sayfa Sorgu | Sayfa Sorguları | Sistem | Sistem | Gözlem | Teknik Gözlem | `sayfa-sorgulari` | `SYS-QRY-SCR-001` | `/meta/sorgular` |


## Konum gerekçeleri (özet)

| Ekran ID | Neden bu modül / başlık? |
|---|---|
| cari-kartlari | Satış ve satınalmanın ortak kullandığı ana veri; ayrı Cari modülü |
| tahsilat-odemeler, cari-ekstre, cari-mutabakat | Cari süreç işlemleri; genel muhasebe belgelerinden ayrı |
| e-belge-kuyruk | Cari/ticari e-belge izleme |
| ülke/para/ölçü/belge tipi… | Ortak ana veri → Ana Veri |
| mesaj-tanimlari | Sistem konfigürasyonu → Sistem > Parametreler |
| stok-depo | Depo-stok bağları → Stok > Depo İşlemleri |
| mrp-* | Tek MRP grubu (Stok); çoğaltılmadı |
| tedarikci-irsaliyeleri | Alış süreci belgesi → Satınalma > Mal Kabul |
| irsaliye-yonetimi / fatura-yonetimi | Satış belgeleri (isim güncellendi, ID aynı) |
| finans-vergi-kodlari | Finans tanımları; vergi-kodlari menü dışı orphan |
| hr-* tanımları | İlgili İK süreç gruplarına dağıtıldı |
| onay-* tanımları | Onay > Tanımlamalar (operasyondan ayrıldı) |