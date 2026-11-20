# Müşteri Go-live Kapsam Kesimi

**Tarih:** 19 Kasım 2026 (Europe/Istanbul)

## Gün-1 (zorunlu omurga)

- Ana veri: cari, stok, depo, UOM, numaratör, firma/iş yeri
- Satınalma: talep → sipariş → mal kabul → (GKK) → alış fatura + 3-way
- Satış: teklif/sipariş → irsaliye → fatura
- Stok: hareket, transfer, lot (zorunlu politikalarda)
- Üretim: BOM, rota, iş emri, üretim girişi
- MRP: konsol + öneri → talep/WO
- Kalite: GKK/CKK emir onay
- Onay yönetimi (kritik belgeler)
- Finans: fiş motoru, fatura muhasebeleştirme, mizan/yevmiye
- Auth: `AUTH_ZORUNLU=Evet` (prod)

## Gün-1 opsiyonel (müşteriye göre)

- Fason operasyon/komple (API hazır; fatura bağlantısı kısmi)
- CRM lead→fırsat→teklif
- HR bordro (TR kurallar)
- PRJ proje yönetimi
- Banka mutabakat (temel ekstre eşleştirme)
- Cari yaşlandırma raporu

## Bilinçli dışarıda (v1)

- Canlı GİB e-Fatura/e-İrsaliye/e-Defter gönderimi (entegratör)
- Finite kapasite / OEE / CMMS
- Sabit kıymet amortisman motoru
- Bütçe/gerçekleşen
- Çek-senet portföyü
- Mobil saha terminali
- FIFO maliyet + tam stok revalüasyon job’u (ağırlıklı ortalama + opsiyonel STOK_MUHASEBE)

## Kabul kapısı

Pilot öncesi P0 kapanmalı: auth zorunlu, BUG-008/009, GKK/CKK ekranları, GİB stratejisi yazılı, stok invariant testleri yeşil.
