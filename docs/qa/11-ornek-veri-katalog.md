# Örnek Veri Kataloğu — GIDA & DOKUM

Üretim: 2026-11-11T13:17:02.998Z

Bu set, rapor eksiklerini **gerçek ekran/alan** üzerinden düzeltmek için hazırlandı. Her firma kendi şirket kurgusuyla (cari, stok, BOM, rota, CRM, SA/SO, UE, irsaliye, fatura, finans, HR, kalite, transfer, sayım) doldurulur.

## Firmalar

| Firma | Şirket | Etiket | Kod öneki | Şehir |
|---|---|---|---|---|
| GIDA | Anadolu Süt ve Süt Ürünleri A.Ş. | `ORNEK-GIDA-2026` | `OG-*` | Konya |
| DOKUM | Anadolu Döküm Sanayi A.Ş. | `ORNEK-DOKUM-2026` | `OD-*` | Kayseri |

## Nasıl filtrelerim?

1. Üst bardan firma seç: **GIDA** veya **DOKUM**
2. Belge listelerinde `project_code` / açıklama: `ORNEK-GIDA-2026` / `ORNEK-DOKUM-2026`
3. Stok/cari: kod öneki `OG-` / `OD-`

## Örnek stok / cari kodları

- GIDA mamul: `OG-M01` Tam Yağlı Süt 1L · `OG-M03` Sade Yoğurt · `OG-M04` Beyaz Peynir
- GIDA hammadde: `OG-H01` Çiğ İnek Sütü · `OG-A01` PET Şişe
- DOKUM mamul: `OD-M01` Fren Diski · `OD-M02` Motor Blok · `OD-M04` Pompa Gövdesi
- DOKUM hammadde: `OD-H01` Pik Demir · `OD-A01` Kalıp Kumu
- Cari: `OG-T01`…`OG-T06` / `OG-M01`…`OG-M06` · `OD-T*` / `OD-M*`

## GIDA
Filtre: `Üst bardan firma = GIDA. Açıklama/project: ORNEK-GIDA-2026`
Örnek SO: `B00116`
Örnek UE: `E00111`
Örnek MK: `R00091`

| Ekran / alan grubu | Kayıt |
|---|---:|
| stok-karti | 15 |
| cari-kartlari | 13 |
| hr-personel | 11 |
| warehouses | 8 |
| crm-faaliyetler | 8 |
| hr-departmanlar | 8 |
| satis-siparisleri | 7 |
| faturalar | 7 |
| stok-partileri | 6 |
| crm-adaylar | 6 |
| uretim-emirleri | 6 |
| olcu-birimleri | 5 |
| crm-kontaklar | 5 |
| crm-firsatlar | 5 |
| crm-gorevler | 5 |
| mrp-bagimsiz-ihtiyac | 5 |
| hr-pozisyonlar | 5 |
| urun-agaci | 4 |
| routings | 4 |
| satis-teklifleri | 4 |
| irsaliyeler | 4 |
| satin-alma-siparisleri | 4 |
| odeme-kosulu-tanimi | 3 |
| is-istasyonlari | 3 |
| satin-alma-talepleri | 3 |
| mal-kabuller | 3 |
| alis-faturalari | 3 |
| sevk-emirleri | 2 |
| satis-faturalari | 2 |
| companies | 1 |
| is-yerleri | 1 |
| is-merkezleri | 1 |
| fiyat-listeleri | 1 |
| stok-hareketleri | 1 |
| finans-banka-hesaplari | 1 |
| finans-kasa-hesaplari | 1 |
| finans-nakit-hareketleri | 1 |
| hr-izin-turleri | 1 |
| hr-izin-talepleri | 1 |
| kk-kontrol-planlari | 1 |
| transfer-emirleri | 1 |
| sayim-belgeleri | 1 |

## Çalıştırma
```bash
npm run qa:ornek-all          # GIDA + DOKUM
npm run qa:ornek-gida         # yalnız süt
npm run qa:ornek-dokum        # yalnız döküm
```

Idempotent: mevcut `OG-*` / `OD-*` master veriyi silmez; eksikleri tamamlar, belge zincirine yeni örnekler ekler.

Not: `TEST-SUT-*` / `TEST-DKM-*` tam döngü verisi ayrıdır; bu katalog onun üzerine ek ORNEK katmanıdır.