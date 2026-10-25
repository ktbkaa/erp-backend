# Uyumsoft → Canias Uyarlama Entegrasyon Raporu

Tarih: 2026-10-16  
Dalga: Üretim / envanter (iş emri tipi, siparişten/toplu iş emri, BOM-rota geçerlilik, depo-stok bağ)

## 1. Doküman analizi özeti

Kaynak: `Downloads.7z` → Uyumsoft WebERP eğitim PDF’leri (üretim, ürün ağacı, rota, depo/stok).

| Uyumsoft işlevi | Karar | Gerekçe |
|---|---|---|
| İş emri tipi (zorunlu tip, Planlı/Kesin) | **Alındı** | Canias PRD tip parametresine uyuyor; mevcut `uretim_emirleri` ile uyumlu |
| Siparişten iş emri | **Alındı** | API vardı, UI/aday listesi yoktu (P12 boşluğu) |
| Toplu iş emri | **Alındı** | Aynı omurgaya çoklu kalem; yeni mimari gerekmedi |
| BOM geçerlilik / miktar aralığı | **Alındı** | Mevcut `urun_agaclari` genişletmesi |
| Rota şablon / varsayılan / geçerlilik | **Alındı** | Mevcut `rotalar` genişletmesi |
| İşyeri–depo–stok bağ | **Alındı** | `stok_depo` tanım tablosu; hareket omurgasını bozmaz |
| CRM fırsat / aday müşteri | **Atlandı** | Satış zinciri ve Canias kapsamı dışı |
| Uyumsoft’a özgü ekran ağacı / menü kodları | **Atlandı** | Doğrudan kopyalanmadı; Canias ekran diline uyarlandı |

## 2. Eklenen / güncellenen özellikler

### Veritabanı (`016_uyumsoft_uretim_entegrasyon.sql`)
- `uretim_emri_tipleri` (STD, PLN, SIP seed)
- `uretim_emirleri.emir_tipi_id`, `planli_kesin`
- `urun_agaclari`: `gecerlilik_baslangic/bitis`, `min_miktar`, `max_miktar`
- `rotalar`: `sablon`, `varsayilan`, `gecerlilik_baslangic/bitis`
- `stok_depo` (stok↔depo, opsiyonel iş yeri); mevcut hareketlerden geri doldurma
- Belge tipi + kod serisi: `URETIM_EMRI_TIP`

### API
- `GET/POST/PUT/DELETE /uretim-emri-tipleri`
- `GET/POST/PUT/DELETE /stok-depo`
- `GET /uretim-emirleri/siparis-adaylari` (+ `/:id`)
- `POST /uretim-emirleri/satis-siparisinden` (tip + BOM/rota doğrulama)
- `POST /uretim-emirleri/toplu`
- `POST /uretim-emirleri` ve güncelleme: `emir_tipi_id` / `planli_kesin`
- Ürün ağacı / rota CRUD: geçerlilik alanları

### Ekranlar (Üretim modülü)
| Ekran | Endpoint | Not |
|---|---|---|
| Üretim Emri Tipleri | `/uretim-emri-tipleri` | Tanımlama |
| Üretim Emirleri | `/uretim-emirleri` | Tip, P/K, sipariş no; Onayla |
| Siparişten İş Emri | aday listesi → `satis-siparisinden` | Satır seç → Düzelt = ön doldurulmuş yeni |
| Toplu İş Emri | aday listesi → `/toplu` | Ortak depo/tip + kalem grid |
| Depo Stok Bağ | `/stok-depo` | Tanımlama |
| Ürün Ağacı / Rotalar | mevcut | Geçerlilik alanları eklendi |

## 3. Varsayımlar
- Siparişten açılan emir varsayılan tip: **SIP**, durum: **OnayBekliyor**.
- Manuel emir varsayılan tip: **STD**, durum: **Acik**.
- BOM/rota geçerlilik boşsa engel yok (geriye dönük uyumluluk).
- Toplu işlemde tek kalem hatası diğerlerini durdurmaz; hiçbiri oluşmazsa transaction hata verir.
- `stok_depo` zorunlu kısıt değil; tanımlama/filtre için.

## 4. Test sonuçları
| Test | Sonuç |
|---|---|
| Migration 016 | OK |
| Tip CRUD | OK |
| Sipariş adayları listesi | OK (açık mamul kalemleri) |
| Siparişten iş emri + tip SIP | OK (`OnayBekliyor` → onay → `Acik`) |
| Toplu iş emri | OK |
| Stok-depo bağ | OK |
| BOM geçerlilik engeli (bitiş geçmiş) | OK |
| Health / mevcut emir listesi | OK |

## 5. Bilinçli olarak yapılmayanlar
- Uyumsoft CRM / fırsat / kampanya
- Uyumsoft menü kodları ve ekran isimlendirmesinin birebir kopyası
- `stok_depo` zorunlu stok hareket kısıtı (mevcut bakiyeyi bozmamak için)
- MRP / kapasite planlama

## 6. Kalan eksikler
- Sipariş formundan tek tıkla ikinci dönüşüm butonu (şu an Sevk Emri convertAction dolu; üretim yolu ayrı ekran)
- Toplu ekranda çoklu aday çoklu seçim (şu an tek satırdan ön doldurma + grid’e ekleme)
- Geçerlilik tarihini UI’dan “temizleme” (NULL) — COALESCE ile yalnızca dolu güncelleme
- Otomatik birim test paketi yok; API smoke manuel çalıştırıldı
