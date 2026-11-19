# Fason Veri Modeli

Migration: `db/migrations/090_fason_yonetim.sql`

## Genişletilen tablolar

| Tablo | Ek |
|-------|-----|
| `partners` | is_subcontractor, kapasite, lead, min_qty, pricing_method, quality_score |
| `warehouses` | rol `FasonEmanet`, `partner_id` |
| `routing_operations` | default fasoncu, fiyat, PB, lead |
| `production_order_operations` | is_subcontract, fasoncu, status, qty_*, estimated price |
| `production_orders` | mevcut is_subcontract / subcontractor (kullanım) |

## Yeni tablolar

| Tablo | Amaç |
|-------|------|
| `subcontract_parameters` | Şirket parametreleri (UNIQUE company_id) |
| `subcontract_operation_defs` | Operasyon kataloğu |
| `subcontract_operation_partners` | Op ↔ fasoncu |
| `subcontract_prices` | Tarihsel fiyat tarifesi |
| `subcontract_orders` | Sipariş başlık (FS*) |
| `subcontract_order_lines` | Sipariş kalemleri |
| `subcontract_shipments` / `_lines` | Sevk |
| `subcontract_consumptions` / `_lines` | Tüketim + fire |
| `subcontract_receipts` / `_lines` | Teslimat |
| `subcontract_cost_entries` | Tahmini / gerçekleşen maliyet |
| `subcontract_audit_log` | İşlem geçmişi (varsa) |

## İlişkiler (özet)

```
companies 1—1 subcontract_parameters
partners 1—* subcontract_orders
production_orders 1—* subcontract_orders (opsiyonel)
subcontract_orders 1—* lines / shipments / consumptions / receipts
warehouses (FasonEmanet) *—1 partners
stock_movements ← sevk/tüketim/iade/teslim
```

## Kısıtlar ve indeks

- FK: partner, company, item, WO, warehouse
- UNIQUE: (company_id) parametre; (company_id, operation_code)
- Index: fasoncu, sipariş no, fiyat lookup, warehouse.partner_id
- Audit: created_at / updated_at; oluşturan kullanıcı soft auth header

## Stok hareket tipleri

Mevcut enum: TRANSFER (sevk/emanet), URETIM_TUKETIM, URETIM_GIRIS, IADE_* — fason işlemleri bunlarla map edilir; FAS-* movement_codes seed.
