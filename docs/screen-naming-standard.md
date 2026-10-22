# KTB ERP — Ekran İsimlendirme Standardı

## Amaç

Bu belge, KTB ERP içindeki ekranlar ve ilgili UI nesneleri için proje içi teknik adlandırma standardını tanımlar.
Biçim: `MODULE-SUBAREA-OBJECTTYPE-NNN` (ör. `SAL-ORD-SCR-001`).

Bu bir proje standardıdır; evrensel bir ERP standardı değildir.

## Kavram ayrımı

| Kavram | Örnek | Açıklama |
|---|---|---|
| Teknik kimlik | `SAL-ORD-SCR-001` | Stabil, büyük harfli kimlik |
| İngilizce teknik ad | `SalesOrderScreen` | Kod/dokümantasyon adı |
| Görünen ad (TR) | Satış Siparişleri | Kullanıcı arayüzü metni — korunur |
| Route / legacy id | `satis-siparisleri` | Hash, yetki `ekran_id`, menü — **değiştirilmedi** |
| Belge numarası | `ST00003` | İş belgesi numarası — bu standardın dışında |

## Modül sözlüğü

| Kod | İngilizce | Kapsam |
|---|---|---|
| `MDM` | Master Data Management | Cari ve diğer ana veriler |
| `FIN` | Finance | Finans, muhasebe ve finansal belgeler |
| `INV` | Inventory | Stok ve stok hareketleri |
| `WMS` | Warehouse Management | Depo operasyonları |
| `PUR` | Purchasing | Satın alma |
| `SAL` | Sales | Satış süreçleri |
| `CRM` | Customer Relationship Management | Müşteri ilişkileri |
| `MFG` | Manufacturing | Üretim ve MRP |
| `QLT` | Quality Management | Kalite yönetimi |
| `MNT` | Maintenance | Bakım yönetimi |
| `HR` | Human Resources | İnsan kaynakları |
| `SYS` | System Administration | Sistem ve kullanıcı yönetimi |
| `INT` | Integration | Entegrasyonlar |
| `RPT` | Reporting | Raporlama |
| `PRJ` | Project Management | Proje yönetimi |
| `DMS` | Document Management | Doküman yönetimi |

## Nesne türü sözlüğü

| Kod | Anlam |
|---|---|
| `SCR` | Ekran / sayfa |
| `RPT` | Rapor |
| `API` | API tanımı |
| `WF` | İş akışı |
| `JOB` | Arka plan görevi |
| `SRV` | Servis |
| `CMP` | Yeniden kullanılabilir arayüz bileşeni |
| `ACT` | İşlem / aksiyon |
| `RES` | Sonuç veya sonuç ekranı |
| `PRT` | Yazdırma / çıktı bileşeni |

## Uygulama notları (bu tur)

1. `public/app.js` içindeki her MODULES ekranına `techId` ve `businessNameEn` eklendi.
2. Route hash (`#legacyId`), yetki `ekran_id` değerleri ve API endpoint yolları **korundu**.
3. Veritabanı tablo/kolon adları ve belge numaratörleri **değiştirilmedi**.
4. Makine okunur envanter: [`screen-registry.json`](./screen-registry.json).
5. Onay ekran kataloğuna (`routes/onay_ekranlari.js`) `tech_id` alanı eklendi; `ekran_id` legacy kaldı.

## Ekran envanteri

Toplam ekran: **96**

| Teknik kimlik | TR görünen ad | EN iş adı | Legacy id | Nav modül | Route | Endpoint | Durum |
|---|---|---|---|---|---|---|---|
| `SYS-NUM-SCR-001` | Numaratör Tanımı | Number Series | `numarator-tanimi` | Sabit Tanımlar | `#numarator-tanimi` | `/kod-serileri` | Changed |
| `MDM-UOM-SCR-001` | Ölçü Birimleri | Unit Of Measure | `olcu-birimleri` | Sabit Tanımlar | `#olcu-birimleri` | `/olcu-birimleri` | Changed |
| `MDM-CAT-SCR-001` | Kategori Tanımı | Category Definition | `kategori-tanimi` | Sabit Tanımlar | `#kategori-tanimi` | `/kategoriler` | Changed |
| `MDM-CTRY-SCR-001` | Ülke Tanımı | Country Definition | `ulke-tanimi` | Sabit Tanımlar | `#ulke-tanimi` | `/ulkeler` | Changed |
| `MDM-CUR-SCR-001` | Para Birimi Tanımı | Currency Definition | `para-birimi-tanimi` | Sabit Tanımlar | `#para-birimi-tanimi` | `/para-birimleri` | Changed |
| `MDM-CITY-SCR-001` | Şehir / İl Tanımı | City Province | `sehir-tanimi` | Sabit Tanımlar | `#sehir-tanimi` | `/sehirler` | Changed |
| `MDM-DIST-SCR-001` | İlçe Tanımı | District Definition | `ilce-tanimi` | Sabit Tanımlar | `#ilce-tanimi` | `/ilceler` | Changed |
| `MDM-PAYT-SCR-001` | Ödeme Koşulu | Payment Terms | `odeme-kosulu-tanimi` | Sabit Tanımlar | `#odeme-kosulu-tanimi` | `/odeme-kosullari` | Changed |
| `MDM-DLVT-SCR-001` | Teslimat Koşulu | Delivery Terms | `teslimat-kosulu-tanimi` | Sabit Tanımlar | `#teslimat-kosulu-tanimi` | `/teslimat-kosullari` | Changed |
| `MDM-LANG-SCR-001` | Dil Tanımı | Language Definition | `dil-tanimi` | Sabit Tanımlar | `#dil-tanimi` | `/diller` | Changed |
| `MDM-BANK-SCR-001` | Banka Tanımı | Bank Definition | `banka-tanimi` | Sabit Tanımlar | `#banka-tanimi` | `/bankalar` | Changed |
| `FIN-FX-SCR-001` | Döviz Kurları | Exchange Rate | `doviz-kur-tanimi` | Sabit Tanımlar | `#doviz-kur-tanimi` | `/doviz-kurlari` | Changed |
| `INV-MVTC-SCR-001` | Hareket Kodları | Movement Code | `hareket-kodlari` | Sabit Tanımlar | `#hareket-kodlari` | `/hareket-kodlari` | Changed |
| `SYS-USR-SCR-001` | Kullanıcılar | Users | `kullanicilar` | Sistem | `#kullanicilar` | `/kullanicilar` | Changed |
| `SYS-GRP-SCR-001` | Kullanıcı Grupları | User Groups | `kullanici-gruplari` | Sistem | `#kullanici-gruplari` | `/kullanici-gruplari` | Changed |
| `SYS-PRM-SCR-001` | Sistem Parametreleri | System Parameters | `sistem-parametreleri` | Sistem | `#sistem-parametreleri` | `/sistem-parametreleri` | Changed |
| `SYS-AUD-SCR-001` | Audit Log | Audit Log | `audit-log` | Sistem | `#audit-log` | `/audit-log` | Changed |
| `SYS-MAIL-SCR-001` | E-posta Gönderimleri | Email Dispatch | `eposta-gonderimleri` | Sistem | `#eposta-gonderimleri` | `/eposta-gonderimleri` | Changed |
| `MDM-CO-SCR-001` | Firmalar | Company | `firmalar` | Ana Veri | `#firmalar` | `/firmalar` | Changed |
| `MDM-PLANT-SCR-001` | İş Yerleri | Plant Site | `is-yerleri` | Ana Veri | `#is-yerleri` | `/is-yerleri` | Changed |
| `MDM-WH-SCR-001` | Depolar | Warehouse Master | `depolar` | Ana Veri | `#depolar` | `/depolar` | Changed |
| `INV-ITM-SCR-001` | Stok Kartı | Item Master | `stok-karti` | Stok | `#stok-karti` | `/stoklar` | Changed |
| `INV-BAL-SCR-001` | Depo Bakiye | Warehouse Balance | `depo-bakiye` | Stok | `#depo-bakiye` | `/stok-bakiyeleri` | Changed |
| `INV-MVT-SCR-001` | Stok Hareketleri | Stock Movement | `stok-hareketleri` | Stok | `#stok-hareketleri` | `/stok-hareketleri` | Changed |
| `WMS-XFER-SCR-001` | Transfer Emirleri | Transfer Order | `transfer-emirleri` | Stok | `#transfer-emirleri` | `/transfer-emirleri` | Changed |
| `WMS-CNT-SCR-001` | Sayım Belgeleri | Physical Count | `sayim-belgeleri` | Stok | `#sayim-belgeleri` | `/sayim-belgeleri` | Changed |
| `INV-LOT-SCR-001` | Stok Partileri | Lot Batch | `stok-partileri` | Stok | `#stok-partileri` | `/stok-partileri` | Changed |
| `MFG-IR-SCR-001` | MRP Bağımsız İhtiyaç | Independent Requirements | `mrp-bagimsiz-ihtiyac` | Stok | `#mrp-bagimsiz-ihtiyac` | `/mrp/bagimsiz-ihtiyaclar` | Changed |
| `MFG-MRP-SCR-001` | MRP Çalıştır | Mrp Run | `mrp-calisma` | Stok | `#mrp-calisma` | `/mrp/calismalar` | Changed |
| `MFG-MRP-SCR-002` | MRP Anlık Hesap | Mrp Instant Calc | `mrp-hesap` | Stok | `#mrp-hesap` | `/mrp` | Changed |
| `MFG-MRP-RES-001` | MRP Sonuçları | Mrp Results | `mrp-sonuclar` | Stok | `#mrp-sonuclar` | `/mrp/calismalar` | Changed |
| `INV-RSV-SCR-001` | Stok Rezervasyonları | Stock Reservation | `stok-rezervasyonlari` | Stok | `#stok-rezervasyonlari` | `/stok-rezervasyonlari` | Changed |
| `INV-SER-SCR-001` | Stok Serileri | Serial Number | `stok-serileri` | Stok | `#stok-serileri` | `/stok-serileri` | Changed |
| `INV-SUB-SCR-001` | Stok İkame | Item Substitution | `stok-ikame` | Stok | `#stok-ikame` | `/stok-ikame` | Changed |
| `MDM-BP-SCR-001` | Cari Kartları | Business Partner | `cari-kartlari` | Cari | `#cari-kartlari` | `/cariler` | Changed |
| `FIN-BPST-SCR-001` | Cari Ekstre | Business Partner Statement | `cari-ekstre` | Cari | `#cari-ekstre` | `/cari-hareketleri` | Changed |
| `FIN-APAR-SCR-001` | Tahsilat / Ödeme | Collection Payment | `tahsilat-odemeler` | Cari | `#tahsilat-odemeler` | `/tahsilat-odemeler` | Changed |
| `MFG-BOM-SCR-001` | Ürün Ağacı | Bill Of Materials | `urun-agaci` | Üretim | `#urun-agaci` | `/urun-agaclari` | Changed |
| `MFG-BOM-SCR-002` | Ürün Ağacı Patlatma | Bom Explosion | `bom-patlatma` | Üretim | `#bom-patlatma` | `/bom/patlatma` | Changed |
| `MFG-BOM-SCR-003` | Ürün Ağacı Seviye Listesi | Bom Level List | `bom-seviye-listesi` | Üretim | `#bom-seviye-listesi` | `/bom/seviye-listesi` | Changed |
| `MFG-BOM-SCR-004` | Malzeme Değişikliği | Bom Material Change | `bom-malzeme-degisikligi` | Üretim | `#bom-malzeme-degisikligi` | `/bom/malzeme-degisikligi` | Changed |
| `MFG-CLS-SCR-001` | Sınıf Tanımı | Class Definition | `sinif-tanimi` | Üretim | `#sinif-tanimi` | `/stok-siniflari` | Changed |
| `MFG-WC-SCR-001` | İş Merkezleri | Work Center | `is-merkezleri` | Üretim | `#is-merkezleri` | `/is-merkezleri` | Changed |
| `MFG-ROUT-SCR-001` | Rotalar | Routing | `rotalar` | Üretim | `#rotalar` | `/rotalar` | Changed |
| `MFG-WOT-SCR-001` | Üretim Emri Tipleri | Work Order Type | `uretim-emri-tipleri` | Üretim | `#uretim-emri-tipleri` | `/uretim-emri-tipleri` | Changed |
| `MFG-PLN-SCR-001` | Üretim Planları | Production Plan | `uretim-planlari` | Üretim | `#uretim-planlari` | `/uretim-planlari` | Changed |
| `MFG-WO-SCR-001` | Üretim Emirleri | Work Order | `uretim-emirleri` | Üretim | `#uretim-emirleri` | `/uretim-emirleri` | Changed |
| `MFG-WO-SCR-002` | Siparişten İş Emri | Order To Work Order | `siparis-is-emri` | Üretim | `#siparis-is-emri` | `/uretim-emirleri/siparis-adaylari` | Changed |
| `MFG-WO-SCR-003` | Toplu İş Emri | Bulk Work Order | `toplu-is-emri` | Üretim | `#toplu-is-emri` | `/uretim-emirleri/siparis-adaylari` | Changed |
| `INV-WHL-SCR-001` | Depo Stok Bağ | Item Warehouse Link | `stok-depo` | Üretim | `#stok-depo` | `/stok-depo` | Changed |
| `MFG-RCPT-SCR-001` | Üretim Girişleri | Production Receipt | `uretim-girisleri` | Üretim | `#uretim-girisleri` | `/uretim-girisleri` | Changed |
| `PUR-RFQ-SCR-001` | Satınalma Teklif İstekleri | Request For Quotation | `satin-alma-teklif-istekleri` | Satınalma | `#satin-alma-teklif-istekleri` | `/satin-alma-teklif-istekleri` | Changed |
| `PUR-QUO-SCR-001` | Satınalma Teklifleri | Purchase Quotation | `satin-alma-teklifleri` | Satınalma | `#satin-alma-teklifleri` | `/satin-alma-teklifleri` | Changed |
| `PUR-AGR-SCR-001` | Satınalma Anlaşmaları | Purchase Agreement | `satin-alma-anlasmalari` | Satınalma | `#satin-alma-anlasmalari` | `/satin-alma-anlasmalari` | Changed |
| `FIN-PINV-SCR-001` | Alış Faturaları | Purchase Invoice | `alis-faturalari` | Satınalma | `#alis-faturalari` | `/faturalar?fatura_turu=Alis` | Changed |
| `PUR-REQ-SCR-001` | Satınalma Talepleri | Purchase Requisition | `satin-alma-talepleri` | Satınalma | `#satin-alma-talepleri` | `/satin-alma-talepleri` | Changed |
| `PUR-ORD-SCR-001` | Satınalma Siparişleri | Purchase Order | `satin-alma-siparisleri` | Satınalma | `#satin-alma-siparisleri` | `/satin-alma-siparisleri` | Changed |
| `PUR-GR-SCR-001` | Mal Kabuller | Goods Receipt | `mal-kabuller` | Satınalma | `#mal-kabuller` | `/mal-kabuller` | Changed |
| `PUR-DLV-SCR-001` | Tedarikçi İrsaliyeleri | Supplier Delivery Note | `tedarikci-irsaliyeleri` | Satınalma | `#tedarikci-irsaliyeleri` | `/tedarikci-irsaliyeleri` | Changed |
| `PUR-DOC-SCR-001` | İrsaliye / Fatura Yönetimi | Delivery Invoice Management | `belge-yonetimi` | Satınalma | `#belge-yonetimi` | `/belge-yonetimi` | Changed |
| `CRM-STG-SCR-001` | Fırsat Aşamaları | Opportunity Stage | `crm-firsat-asamalari` | CRM | `#crm-firsat-asamalari` | `/crm-firsat-asamalari` | Changed |
| `CRM-ACTT-SCR-001` | Faaliyet Tipleri | Activity Type | `crm-faaliyet-tipleri` | CRM | `#crm-faaliyet-tipleri` | `/crm-faaliyet-tipleri` | Changed |
| `CRM-LEAD-SCR-001` | Müşteri Adayları | Lead | `crm-adaylar` | CRM | `#crm-adaylar` | `/crm-adaylar` | Changed |
| `CRM-CNT-SCR-001` | Kontaklar | Contact | `crm-kontaklar` | CRM | `#crm-kontaklar` | `/crm-kontaklar` | Changed |
| `CRM-OPP-SCR-001` | Fırsatlar | Opportunity | `crm-firsatlar` | CRM | `#crm-firsatlar` | `/crm-firsatlar` | Changed |
| `CRM-APLN-SCR-001` | Faaliyet Planları | Activity Plan | `crm-faaliyet-planlari` | CRM | `#crm-faaliyet-planlari` | `/crm-faaliyet-planlari` | Changed |
| `CRM-ACT-SCR-001` | Faaliyetler | Activity | `crm-faaliyetler` | CRM | `#crm-faaliyetler` | `/crm-faaliyetler` | Changed |
| `CRM-TASK-SCR-001` | Görevler | Task | `crm-gorevler` | CRM | `#crm-gorevler` | `/crm-gorevler` | Changed |
| `CRM-CAL-SCR-001` | Ajanda | Agenda Calendar | `crm-ajanda` | CRM | `#crm-ajanda` | `/crm-ajanda` | Changed |
| `SAL-QUO-SCR-001` | Satış Teklifleri | Sales Quotation | `satis-teklifleri` | Satış | `#satis-teklifleri` | `/satis-teklifleri` | Changed |
| `SAL-ORD-SCR-001` | Satış Siparişleri | Sales Order | `satis-siparisleri` | Satış | `#satis-siparisleri` | `/siparisler` | Changed |
| `SAL-SHP-SCR-001` | Sevk Emirleri | Shipment | `sevk-emirleri` | Satış | `#sevk-emirleri` | `/sevk-emirleri` | Changed |
| `SAL-DLV-SCR-001` | İrsaliyeler | Delivery Note | `irsaliyeler` | Satış | `#irsaliyeler` | `/irsaliyeler` | Changed |
| `FIN-SINV-SCR-001` | Satış Faturaları | Sales Invoice | `satis-faturalari` | Satış | `#satis-faturalari` | `/faturalar?fatura_turu=Satis` | Changed |
| `QLT-IQC-SCR-001` | GKK Emirleri | Incoming Qc Order | `kk-emirleri-gkk` | Kalite | `#kk-emirleri-gkk` | `/kk-emirleri?yon=GKK` | Changed |
| `QLT-OQC-SCR-001` | ÇKK Emirleri | Outgoing Qc Order | `kk-emirleri-ckk` | Kalite | `#kk-emirleri-ckk` | `/kk-emirleri?yon=CKK` | Changed |
| `QLT-NCR-SCR-001` | KK Uygunsuzluklar | Nonconformance | `kk-uygunsuzluklar` | Kalite | `#kk-uygunsuzluklar` | `/kk-uygunsuzluklar` | Changed |
| `QLT-CAPA-SCR-001` | CAPA | Capa | `kk-capa` | Kalite | `#kk-capa` | `/kk-capa` | Changed |
| `QLT-PLAN-SCR-001` | KK Kontrol Planları | Control Plan | `kk-kontrol-planlari` | Kalite | `#kk-kontrol-planlari` | `/kk-kontrol-planlari` | Changed |
| `QLT-ITMP-SCR-001` | KK Stok Plan Bağları | Item Control Plan Link | `kk-stok-planlari` | Kalite | `#kk-stok-planlari` | `/kk-stok-planlari` | Changed |
| `QLT-REJ-SCR-001` | KK Ret Nedenleri | Rejection Reason | `kk-ret-nedenleri` | Kalite | `#kk-ret-nedenleri` | `/kk-ret-nedenleri` | Changed |
| `SYS-APR-SCR-001` | Onaylarım | My Approvals | `onaylarim` | Onay | `#onaylarim` | `/onay-kayitlari?benim=true` | Changed |
| `SYS-APR-SCR-002` | Onay İzleme | Approval Monitoring | `onay-izleme` | Onay | `#onay-izleme` | `/onay-kayitlari` | Changed |
| `SYS-APR-SCR-003` | Onay Yetki Devri | Approval Delegation | `onay-yetki-devri` | Onay | `#onay-yetki-devri` | `/onay-yetki-devirleri` | Changed |
| `SYS-APR-SCR-004` | Onay Rolü | Approval Role | `onay-rol-tanim` | Onay | `#onay-rol-tanim` | `/onay-rolleri` | Changed |
| `SYS-APR-SCR-005` | Onay Kuralı | Approval Rule | `onay-kural-tanim` | Onay | `#onay-kural-tanim` | `/onay-kurallari` | Changed |
| `SYS-APR-SCR-006` | Onay Rotası | Approval Route | `onay-rota-tanim` | Onay | `#onay-rota-tanim` | `/onay-rotalari` | Changed |
| `SYS-APR-SCR-007` | Onay Mesaj Şablonu | Approval Message Template | `onay-mesaj-sablon` | Onay | `#onay-mesaj-sablon` | `/onay-mesaj-sablonlari` | Changed |
| `SYS-APR-SCR-008` | Onay Durum Tanımı | Approval Status | `onay-durum-tanim` | Onay | `#onay-durum-tanim` | `/onay-durumlari` | Changed |
| `FIN-COA-SCR-001` | Hesap Planı | Chart Of Accounts | `hesap-plani` | Finans | `#hesap-plani` | `/muhasebe-hesaplari` | Changed |
| `FIN-JE-SCR-001` | Muhasebe Belgeleri | Accounting Document | `muhasebe-belgeleri` | Finans | `#muhasebe-belgeleri` | `/muhasebe-belgeleri` | Changed |
| `FIN-TB-RPT-001` | Mizan | Trial Balance | `mizan` | Finans | `#mizan` | `/mizan` | Changed |
| `FIN-ACR-SCR-001` | Hesap Belirleme Kuralları | Account Determination Rule | `hesap-belirleme-kurallari` | Finans | `#hesap-belirleme-kurallari` | `/hesap-belirleme-kurallari` | Changed |
| `FIN-PRC-SCR-001` | Fiyat Listeleri | Price List | `fiyat-listeleri` | Finans | `#fiyat-listeleri` | `/fiyat-listeleri` | Changed |
| `FIN-3WAY-SCR-001` | Fatura Kontrolleri (3-way) | Three Way Match | `fatura-kontrolleri` | Finans | `#fatura-kontrolleri` | `/fatura-kontrolleri` | Changed |
| `RPT-CPIT-SCR-001` | Kokpit | Cockpit Dashboard | `kokpit` | Finans | `#kokpit` | `/kokpit` | Changed |

## Needs Review

| Konu | Açıklama |
|---|---|
| Onay modülü kodu | Onay ekranları `SYS-APR-*` altına alındı (ayrı APR/WF modülü yok). İleride ayrı modül istenirse kimlikler planlı taşınabilir. |
| Faturalar | Alış/satış faturaları menüde Satınalma/Satış altında; teknik modül `FIN` (`FIN-PINV` / `FIN-SINV`). |
| MRP menü konumu | MRP ekranları Stok menüsünde; teknik modül `MFG`. |
| Mizan | Rapor niteliği nedeniyle `FIN-TB-RPT-001` (`objectType=RPT`). |
| Kokpit | Raporlama yüzeyi olarak `RPT-CPIT-SCR-001`. |
| Depo master | Ana veri menüsünde; `MDM-WH-SCR-001` (operasyonel transfer/sayım `WMS`). |

## Numaralandırma kuralı

Aynı `MODULE-SUBAREA-OBJECTTYPE` grubunda sonraki nesne bir sonraki üç haneli numarayı alır (`001`, `002`…).
Yeni ekran eklerken mevcut kimlikleri yeniden numaralandırmayın; `docs/screen-registry.json` üzerinden boş numarayı seçin.
