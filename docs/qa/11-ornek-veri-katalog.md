# Örnek Veri Kataloğu — GIDA / DOKUM / ELEK / KILIF

Üretim: 2026-11-11T15:53:36.269Z

Bu set, rapor eksiklerini **gerçek ekran/alan** üzerinden düzeltmek için hazırlandı. Her firma kendi şirket kurgusuyla (cari, stok, BOM, rota, CRM, SA/SO, UE, irsaliye, fatura, finans, HR, kalite, transfer, sayım) doldurulur.

## Firmalar

| Firma | Şirket | Etiket | Kod öneki | Şehir |
|---|---|---|---|---|
| GIDA | Anadolu Süt ve Süt Ürünleri A.Ş. | `ORNEK-GIDA-2026` | `OG-*` | Konya |
| DOKUM | Anadolu Döküm Sanayi A.Ş. | `ORNEK-DOKUM-2026` | `OD-*` | Kayseri |
| ELEK | Kompanzasyon Röle Elektronik A.Ş. | `ORNEK-ELEK-2026` | `OE-*` | İstanbul |
| KILIF | CaseForm Silikon & Plastik Kılıf A.Ş. | `ORNEK-KILIF-2026` | `OK-*` | Kocaeli |

## Nasıl filtrelerim?

1. Üst bardan firma seç: **GIDA**, **DOKUM**, **ELEK**, **KILIF**
2. Belge listelerinde `project_code` / açıklama: `ORNEK-GIDA-2026` / `ORNEK-DOKUM-2026` / `ORNEK-ELEK-2026` / `ORNEK-KILIF-2026`
3. Stok/cari: kod öneki `OG-` / `OD-` / `OE-` / `OK-`

## Örnek stok / cari kodları

- GIDA mamul: `OG-M01` Tam Yağlı Süt 1L · `OG-M03` Sade Yoğurt · `OG-M04` Beyaz Peynir
- GIDA hammadde: `OG-H01` Çiğ İnek Sütü · `OG-A01` PET Şişe
- DOKUM mamul: `OD-M01` Fren Diski · `OD-M02` Motor Blok · `OD-M04` Pompa Gövdesi
- DOKUM hammadde: `OD-H01` Pik Demir · `OD-A01` Kalıp Kumu
- ELEK mamul: `OE-M01` Reaktif Güç Rölesi · `OE-M02` Enerji Analizörü · yarı mamul `OE-Y01` Dizgili PCB
- KILIF mamul: `OK-M01` Silikon Kılıf iPhone 15 · `OK-M02` Şeffaf TPU Kılıf · `OK-M03` MagSafe Sert Kılıf
- Cari: `<önek>-T01`…`T06` tedarikçi / `<önek>-M01`…`M06` müşteri

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

## ELEK
Filtre: `Üst bardan firma = ELEK. Açıklama/project: ORNEK-ELEK-2026`
Örnek SO: `B00129`
Örnek UE: `E00129`
Örnek MK: `R00102`

| Ekran / alan grubu | Kayıt |
|---|---:|
| hr-personel | 25 |
| hr-departmanlar | 22 |
| stok-karti | 14 |
| cari-kartlari | 12 |
| crm-faaliyetler | 9 |
| faturalar | 9 |
| warehouses | 8 |
| crm-adaylar | 7 |
| crm-kontaklar | 7 |
| crm-firsatlar | 7 |
| satis-siparisleri | 7 |
| uretim-emirleri | 7 |
| stok-partileri | 6 |
| crm-gorevler | 6 |
| olcu-birimleri | 5 |
| satin-alma-siparisleri | 5 |
| hr-pozisyonlar | 5 |
| urun-agaci | 4 |
| routings | 4 |
| satis-teklifleri | 4 |
| irsaliyeler | 4 |
| mrp-bagimsiz-ihtiyac | 4 |
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

## KILIF
Filtre: `Üst bardan firma = KILIF. Açıklama/project: ORNEK-KILIF-2026`
Örnek SO: `B00134`
Örnek UE: `E00133`
Örnek MK: `R00105`

| Ekran / alan grubu | Kayıt |
|---|---:|
| stok-karti | 14 |
| hr-personel | 13 |
| cari-kartlari | 12 |
| hr-departmanlar | 10 |
| crm-faaliyetler | 9 |
| faturalar | 9 |
| warehouses | 8 |
| crm-adaylar | 7 |
| crm-kontaklar | 7 |
| crm-firsatlar | 7 |
| satis-siparisleri | 7 |
| uretim-emirleri | 7 |
| stok-partileri | 6 |
| crm-gorevler | 6 |
| olcu-birimleri | 5 |
| satin-alma-siparisleri | 5 |
| hr-pozisyonlar | 5 |
| urun-agaci | 4 |
| routings | 4 |
| satis-teklifleri | 4 |
| irsaliyeler | 4 |
| mrp-bagimsiz-ihtiyac | 4 |
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
npm run qa:ornek-all          # tüm sektörler
npm run qa:ornek-gida         # yalnız süt
npm run qa:ornek-dokum        # yalnız döküm
npm run qa:ornek-elek         # yalnız elektronik / PCB
npm run qa:ornek-kilif        # yalnız telefon kılıfı
```

Idempotent: mevcut `OG-*` / `OD-*` master veriyi silmez; eksikleri tamamlar, belge zincirine yeni örnekler ekler.

Not: `TEST-SUT-*` / `TEST-DKM-*` tam döngü verisi ayrıdır; bu katalog onun üzerine ek ORNEK katmanıdır.