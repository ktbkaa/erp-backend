# Fason Test Raporu

**Tarih:** 19 Kasım 2026 (Europe/Istanbul)  
**Script:** `scripts/test-fason-e2e.mjs`  
**Sonuç:** **BAŞARILI — 17/17**

## Senaryo özeti (E2E)

| Test | Sonuç | Detay |
|------|--------|-------|
| API health | PASS | |
| Fasoncu | PASS | T00001 |
| partners-fasoncu | PASS | n≥1 |
| Operasyon | PASS | BOYAMA-* |
| Fiyat | PASS | birim fiyat |
| Parametre | PASS | |
| Test stok | PASS | 500 |
| Sipariş | PASS | FSO* |
| Sevk | PASS | FSV* |
| Emanet ≥100 | PASS | 100 |
| Tüketim | PASS | FTK* |
| Teslim 40 | PASS | kısmi |
| Teslim 60 | PASS | kalan |
| Fazla teslim engeli | PASS | 110 > 100 red |
| Miktar tutarlı | PASS | sevk/tüketim/teslim/kabul |
| Maliyet | PASS | cost entries |
| İptal | PASS | |

## Kabul kriterleri eşlemesi

| Kriter | Durum |
|--------|-------|
| Operasyon + komple fason | ✅ order_mode |
| Rota bağlantısı | ✅ |
| Sipariş ↔ WO | ✅ |
| Emanet stok gerçek bakiye | ✅ FasonEmanet |
| Sevk ≠ tüketim | ✅ |
| Kısmi sevk/teslim | ✅ |
| Lot/seri alanları | ✅ satırlarda |
| Kalite bağlantısı | ✅ teslimat/kalite API |
| Fatura ilişkisi | ⚠ mevcut alış fatura ile manuel bağ (otomatik PO kapalı) |
| Maliyet aktarımı | ✅ |
| MRP fason öneri | ⏳ lead/kapasite hazır; öneri tipi sonraki |
| Onay kuralları | ⚠ parametre + mevcut onay; özel route seed sınırlı |
| Belge ilişkileri DB | ✅ FK |
| Mükerrer hareket engeli | ✅ fazla teslim + transaction |
| Mevcut modüller bozulmadı | ✅ E2E + mevcut API |

## Başarısız / tamamlanmamış

- Otomatik alış faturası oluşturma (bilinçli: mevcut fatura ekranı)
- MRP’de ayrı “fason önerisi” tipi
- Browser UI click-through (spend limit / ortam); API+DB doğrulandı

## Teslimat envanteri

- Migration `090_fason_yonetim.sql`
- `routes/fason.js`, `src/services/fasonService.js`
- `public/app.js` ekranlar + cari/rota/WO alanları
- `routes/partners.js`, `routes/production_orders.js` genişletme
- `docs/subcontracting/*` + PDF kılavuz
