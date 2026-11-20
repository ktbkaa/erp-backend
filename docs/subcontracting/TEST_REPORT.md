# Fason Test Raporu

**Tarih:** 20 Kasım 2026 (Europe/Istanbul)  
**Script:** `scripts/test-fason-e2e.mjs` + `tests/fason_gkk.test.js`  
**Sonuç:** E2E önceki 17/17; GKK kapısı **2/2 PASS**

## GKK kapısı (093)

| Test | Sonuç | Detay |
|------|--------|-------|
| Teslimatta GKK emri | PASS | `source_type=FASON_TESLIMAT`, `accepted_qty=0` |
| Tüketim kilidi | PASS | `require_qc_before_consume` → `FASON_GKK_BEKLIYOR` |
| GKK onay → kabul | PASS | `approveQcOrder` → `accepted_qty` + receipt `TeslimAlindi` |
| `create_qc:false` atlama | PASS | doğrudan kabul |

## Firma parametreleri

| Alan | Varsayılan | Anlam |
|------|------------|--------|
| `qc_on_receipt` | true | Teslimatta GKK emri |
| `block_production_until_qc` | true | KK öncesi üretim yansımaz |
| `require_qc_before_consume` | false | Açıkken 5→GKK→6 sıkı sıra |

## Senaryo özeti (E2E — önceki)

| Test | Sonuç |
|------|--------|
| Sevk ≠ tüketim | PASS |
| Emanet / kısmi teslim / fazla engeli | PASS |
| Maliyet / iptal | PASS |

## Başarısız / tamamlanmamış

- Otomatik alış faturası (kısmi API var)
- MRP ayrı fason öneri tipi
- Browser UI E2E
