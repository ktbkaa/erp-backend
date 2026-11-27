# Canias Tam Döngü → KTB ERP Ekran Eşlemesi (GIDA)

| # | Canias | KTB ekran / endpoint | Durum |
|---|--------|----------------------|-------|
| 1 | BAST03 Malzeme | Stok Kartı `/items` | Var |
| 2 | BOMT01 Ürün Ağacı | Ürün Ağacı `/urun-agaclari` | Var |
| 3 | BAST06 Maliyet Merkezi | Ayrı ekran yok | **Gap** — iş merkezi adına MC-SUT-01 not |
| 4 | ROUT02 İş Merkezi | İş Merkezleri `/is-merkezleri` | Var |
| 5 | ROUT01 Rota | Rotalar `/routings` | Var |
| — | CALT01 Standart Maliyet | Kısmi (item cost / precost) | Kısmi |
| 6 | BAST02 Cari | Cari Kartları `/partners` | Var |
| 7 | SALT02 Fiyat Listesi | Fiyat Listeleri `/fiyat-listeleri` | Var |
| 8 | SALT01 Satış Teklifi | Satış Teklifleri `/satis-teklifleri` | Var |
| 9 | SALT01 Satış Siparişi | Satış Siparişleri `/sales_orders` | Var |
| 10 | MRPT05/06 MRP | MRP Çalışma `/mrp` | Var |
| 11 | MRPT04/07 Analiz | MRP Sonuçlar | Var |
| 12 | PURT04/12 SA İstek | Satınalma Talepleri | Var |
| 13 | PURT01 Teklif İstek | RFQ (deprecated UI) | Kısmi |
| 14 | PURT02 SA Bilgi | Tedarikçi / anlaşma | Kısmi |
| 15 | PURT05 SA Sipariş | Satınalma Siparişleri | Var |
| 16 | INVT01 Malzeme Giriş | Mal Kabuller → Giriş Depo | Var (+Giriş Kontrol) |
| 17 | VERT01 SA Fatura | Alış Faturası `/mal-kabuller/:id/fatura-olustur` | Var |
| 18 | MRPT02 Üretim Planı | Üretim Planları | Var |
| 19 | PRDT06 Plan→İş Emri | `/uretim-planlari/:id/cevir` | Var |
| 20 | PRDT01 Çizelgeleme | UE operasyon sırası | Kısmi |
| 21 | INVT01 Malzeme Çıkış | UE operasyon tamamla (tüketim) | Var |
| 22 | PRDT02 İş Bitiş | Operasyon tamamla / UE kapat | Var |
| 23 | INVT01 Ürün Giriş | UE → CKK → Mamul/YM | Var |
| 24 | SALT01 Satış İrsaliye | İrsaliye Yönetimi | Var |
| 25 | INVT01 Ürün Çıkış | İrsaliye onayı stok çıkış | Var |
| 26 | SALT01 Satış Fatura | Fatura Yönetimi | Var |
| — | FINT02 Finans | `/invoices/:id/muhasebelestir` | Var |

## Kalite (Canias dışı ek akış — mevcut ERP)

Mal kabul → **Giriş Depo** → **Giriş Kontrolleri** → **Giriş Kalite (GKK)** → **Hammadde**  
Üretim çıktısı → **Çıkış Kalite (CKK)** → **Mamul / YarıMamul**
