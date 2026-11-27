# Fason Tanımlamaları (Master Data)

## 1. Fasoncu (cari rolü)

Ayrı cari türü yok. `partners.is_subcontractor = true`.

| Alan | Açıklama |
|------|----------|
| `is_subcontractor` | Fasoncu rolü |
| `subcontract_capacity_daily` | Günlük kapasite |
| `subcontract_lead_days` | Standart teslim (gün) |
| `subcontract_min_qty` | Min. sipariş miktarı |
| `subcontract_pricing_method` | Adet / Kg / Metre / Saat / Operasyon / Parti / Sabit / Ozel |
| `subcontract_quality_score` | Kalite değerlendirme |

Aynı cari hem tedarikçi hem fasoncu olabilir.

**Emanet depo:** İlk sevkte veya parametreye göre fasoncuya özel `FasonEmanet` deposu (`warehouses.partner_id`) oluşturulur / kullanılır.

## 2. Fason operasyon tanımları

Tablo: `subcontract_operation_defs`  
Ekran: Fason Operasyon Tanımları

- Kod, ad, açıklama, UOM, standart süre
- Fiyatlandırma yöntemi, KK zorunluluğu, aktif
- İsteğe bağlı partner eşlemesi: `subcontract_operation_partners`

Üretim rotasındaki `is_subcontract` satırlarıyla birlikte kullanılır.

## 3. Fiyat tarifeleri

Tablo: `subcontract_prices`

- Fasoncu + (opsiyonel) operasyon + (opsiyonel) malzeme
- Birim fiyat, PB, geçerlilik `valid_from` / `valid_to`
- Eski fiyatlar korunur; sipariş satırı kendi birim fiyatını kilitler (geriye dönük değişmez)

## 4. Şirket parametreleri

Tablo: `subcontract_parameters` (şirket başına tek)

| Parametre | Varsayılan anlam |
|-----------|------------------|
| Sevk deposu | Çıkış deposu |
| Fire toleransı / max fire | % |
| Kısmi teslimat | Açık |
| Fazla teslimat | Kapalı (+ tolerans %) |
| KK zorunlu | Açık |
| Sipariş onay zorunlu | Kapalı |
| Fiyat onay limiti | Opsiyonel |
| Otomatik PO | Kapalı |
| Otomatik op ihtiyacı | Açık |

## 5. Rota / WO alanları

**routing_operations:** `is_subcontract`, `default_subcontractor_partner_id`, `subcontract_unit_price`, `subcontract_currency_code`, `subcontract_lead_days`

**production_order_operations:** fason bayrağı, fasoncu, status, qty_sent/received/accepted/rejected/scrap, estimated_unit_price
