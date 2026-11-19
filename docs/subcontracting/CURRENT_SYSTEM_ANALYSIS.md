# Mevcut Sistem Analizi — Fason Öncesi / Sonrası

## Özet

Fason süreci Canias/PRD belgelerinde **Faz 2 / Yapılmadı** olarak geçiyordu. Kodda yalnızca bayraklar vardı; uçtan uca süreç yoktu. Bu çalışma mevcut WO, rota, cari, stok motoru, GKK ve alış faturası altyapısını genişleterek fasonu entegre eder.

## Envanter — mevcut modüller

| Modül | Ekran / endpoint | Veri | Fason kullanımı |
|-------|------------------|------|-----------------|
| Üretim emirleri | `uretim-emirleri` / `/production-orders` | `production_orders`, `production_order_operations` | `is_subcontract`, fasoncu, qty_* |
| Üretim rotası | `uretim-rotalari` / `/routings` | `routings`, `routing_operations` | `is_subcontract`, varsayılan fasoncu, fiyat, lead |
| Ürün ağacı | `urun-agaci` / `/boms` | `boms`, `bom_lines` | `component_type=Fason` |
| İş merkezi / operasyon | mevcut tanım ekranları | `work_centers`, ops | Fason op kataloğu ile ilişkilendirilebilir |
| Satınalma sipariş | `satin-alma-siparisleri` | PO header/lines | Hizmet faturası bağlanabilir |
| Mal kabul / irsaliye | mevcut | receipt / waybill | Teslimat sonrası stok girişi benzer mantık |
| Alış faturası | mevcut | AP invoices | Fason hizmet bedeli |
| Stok hareket | merkezi `createStockMovement` | `stock_movements`, bakiyeler | Sevk / tüketim / iade / teslim |
| Depo | `depolar` | `warehouses` | Rol `FasonEmanet` + `partner_id` |
| Lot / seri | mevcut | lot/serial kolonları | Sevk/teslim satırlarında korunur |
| Kalite | `qc_orders` / kaliteService | GKK | Teslimatta KK emri |
| Onay | onay modülü | approval routes | Sipariş / fazla teslim / fire |
| MRP | MRP konsol | öneriler | Fason kapasite/lead sonraki faz |
| Partner / cari | `cari-kart` / `/partners` | `partners` | `is_subcontractor` rolü |
| Maliyet | WO maliyet satırları | `subcontract_cost_entries` | Tahmini vs gerçekleşen |

## Kullanılabilir API’ler (öncesi)

- `/production-orders`, `/routings`, `/boms`
- `/partners`, `/warehouses`, `/stock-movements`
- `/purchase-orders`, mal kabul, faturalar
- Kalite emirleri servisi

## Yeni API yüzeyi

Prefix: `/fason`

- Parametreler, operasyon tanımları, fiyat tarifeleri
- Sipariş CRUD + `sevk` / `tuketim` / `iade` / `teslimat` / `iptal`
- Teslimat satırı kalite sonucu
- Sevkiyat / tüketim / teslimat listeleri
- Emanet stok bakiyesi
- Özet rapor
- İş emrinden sipariş oluşturma

## Mevcut iş akışları (korunan)

1. Rota tanımı → iş emri oluşturma → op kopyalama
2. Stok hareketi atomik transaction + movement_codes
3. GKK emri ve kabul/ret
4. Alış faturası ve muhasebe hesap belirleme

## Eksikler (öncesi) → durum

| Eksik | Durum |
|-------|--------|
| Fason sipariş belgesi | ✅ `subcontract_orders` |
| Emanet stok (sevk ≠ tüketim) | ✅ FasonEmanet depo |
| Kısmi sevk/teslim + fazla engeli | ✅ |
| Fire bildirimi (silme yok) | ✅ tüketim scrap |
| Tahmini / gerçekleşen maliyet | ✅ cost entries |
| Menü ekranları | ✅ Üretim → Fason Operasyon |
| MRP fason öneri tipi | ⏳ sonraki faz (lead/kapasite alanları hazır) |
| Otomatik alış faturası oluşturma | ⏳ mevcut fatura ekranı ile manuel bağ |

## Değiştirilen mevcut ekranlar / tablolar

- **Cari kart:** `is_subcontractor`, kapasite, lead, min qty, fiyat yöntemi, kalite skoru
- **Rota operasyon:** varsayılan fasoncu, birim fiyat, PB, lead gün
- **Üretim emri:** fason emri / fasoncu; op kopyada `is_subcontract`
- **Depo rolü:** `FasonEmanet`; `warehouses.partner_id`
- **Lookup:** `partners-fasoncu`

## Gerekli entegrasyonlar (karşılandı)

Üretim ↔ Fason sipariş ↔ Stok (emanet) ↔ Tüketim ↔ Teslimat ↔ Kalite ↔ Maliyet ↔ (Fatura bağlanabilir)
