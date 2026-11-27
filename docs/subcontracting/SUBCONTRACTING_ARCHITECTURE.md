# Fason Yönetimi Mimarisi

## İlkeler

1. Fason, kopuk bir silo değil; Üretim + Satınalma + Stok + Kalite + Finans zincirinin parçasıdır.
2. **Sevk ≠ tüketim**, **teslim ≠ KK kabul**, **sipariş ≠ fatura**, **tahmini ≠ gerçekleşen**, **fire ≠ otomatik silme**.
3. Fasoncu = mevcut cari kartında rol (`is_subcontractor`); ikinci kart yok.
4. Emanet stok = gerçek `warehouses` (rol `FasonEmanet`) + `stock_movements` / bakiyeler.
5. Mevcut `createStockMovement` kullanılır; ayrı stok motoru yok.

## İki çalışma modeli

| Model | `order_mode` | Tetikleyici |
|-------|--------------|-------------|
| Fason operasyon | `Operasyon` | Rota satırı `is_subcontract`; WO op üzerinden |
| Komple fason üretim | `Komple` | Ürünün tamamı dış üreticiye |

Ortak tablolar ve API; farklı iş kuralları sipariş başlığında ve miktar doğrulamalarında.

## Belge zinciri

```
Üretim talebi / ihtiyaç
  → Üretim emri (WO)
  → Rota / fason operasyon
  → Fason siparişi (FS*)
  → Malzeme sevki (emanet↑, şirket deposu↓)
  → Fasoncu emanet stok
  → Malzeme tüketimi / fire (emanet↓, üretim tüketimi)
  → Ürün / YM teslimatı (stok↑)
  → Giriş kalite kontrol
  → Kabul sonrası kullanılabilir stok / op tamamlanma
  → Fason hizmet faturası (alış)
  → Muhasebe + üretim maliyeti
```

## Katmanlar

| Katman | Bileşen |
|--------|---------|
| UI | `public/app.js` — Üretim → Fason Operasyon ekran grubu |
| API | `routes/fason.js` |
| Domain | `src/services/fasonService.js` |
| DB | Migration `090_fason_yonetim.sql` |
| Stok | `createStockMovement` + movement codes FAS-* |

## Durum makinesi (sipariş / op)

Planlandı → Sipariş bekliyor / Onay → Malzeme hazır → Sevke hazır → Kısmen gönderildi → Fasoncuda → Kısmen teslim → Teslim alındı → KK bekliyor → Tamamlandı | İptal

Durum değişiklikleri sevk/tüketim/teslimat/iptal işlemleriyle yazılır; salt UI toggle değildir.

## Atomiklik ve mükerrer koruma

- Sevk, tüketim, iade, teslimat transaction içinde.
- Sipariş miktarı / tolerans kontrolü fazla teslimatı reddeder.
- İptal: açık sevk/teslim yoksa veya ters kayıt kurallarına uygun.

## Genişletilebilirlik

- Onay route_id parametreleri hazır.
- MRP lead/kapasite partner alanlarından okunabilir.
- Fatura: sipariş id üzerinden alış faturası satırına bağlanabilir.
