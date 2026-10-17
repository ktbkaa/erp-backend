# Çok Firmalı Demo Ortamı

## Temizlik
- Yedek: `backups/demo-cleanup/pre-clean-*.dump` + özet JSON
- Script: `npm run demo:cleanup` → `node scripts/demo-cleanup.js`
- Silinen: işlem ve ana kart verileri (stok, cari, belgeler, üretim, CRM, kalite…)
- Korunan: `kod_serileri`, `olcu_birimleri`, `hareket_kodlari`, `sistem_parametreleri`, `belge_tipleri`, `ulkeler`, kullanıcı/grup, KK plan/ret, CRM aşama/tip…

## Demo firmalar (`npm run demo:4-firma`)
| Kod | Firma | Sektör |
|-----|--------|--------|
| ELEK | Kompanzasyon Röle Elektronik A.Ş. | Elektrik/Elektronik |
| TEKS | Denim Tekstil Üretim A.Ş. | Tekstil |
| META | Oto Kapı Metal Sanayi A.Ş. | Metal / Otomotiv |
| GIDA | Anadolu Süt ve Süt Ürünleri A.Ş. | Gıda |

Her firmada: iş yeri, 5 depo, 2 tedarikçi + 2 müşteri, hammaddeler + mamul, BOM, iş merkezi, rota,
SA talep → teklif isteği → **teklif (onaylı)** → sipariş (`teklif_id`) → mal kabul,
stok girişleri, üretim emri, CRM fırsat, satış siparişi→sevk→irsaliye→fatura, KK emri; GIDA/META’da parti.

UI: üst bar **Firma profil alanı**; listelerde firma/iş yeri filtreleri profil seçimine göre dolar.
Aktif alanları formda **Pasif** checkbox’ı olarak gösterilir (tik = pasif); filtre varsayılanı `Aktif = Eşit / Evet`.

## İzolasyon
- Header: `X-Firma-Id` (`src/middleware/firmaContext.js` + `src/utils/firmaScope.js`)
- Migration: `022_cok_firma_izolasyon.sql` (stok/BOM/rota/üretim/KK/CRM vb. `firma_id`)
- Liste filtreleri: stok, cari, depo, iş yeri, iş merkezi, sipariş, fatura, irsaliye, sevk, üretim, BOM, rota, SA talep/sipariş, mal kabul, stok hareket, stok bakiyesi, stok parti, CRM fırsat, KK, kokpit özet
- Detay GET: stok ve cari kartında yanlış firma → 404
- UI: üst barda firma seçici (Anasayfa metni kaldırıldı); değişince form sekmeleri kapanır, lookup cache temizlenir, listeler yenilenir
- Ortak tanımlar (ölçü, numaratör, hareket kodu, belge tipi) paylaşılır

## Bilinen sınırlar
- Satış teklifi demo kaydı üretilmedi (doğrudan satış siparişi zinciri var)
- Bakım / İK / bütçe modüllerinde demo kayıt yok (ekranlar boş kalabilir)
- Tüm route’larda detay GET izolasyonu yok; kritik ana kartlar (stok/cari) ve listeler korunuyor
- Gerçek e-posta gönderimi demo scriptlerinde tetiklenmez
