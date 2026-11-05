# Regresyon Sonuçları

**Tarih:** 2026-11-05 Europe/Istanbul

| Suite | Komut | Sonuç |
|---|---|---|
| Unit/API mevcut | `npm test` | **33/33 pass** (ödeme koşulu testine `term_code` eklendi) |
| Ekran envanteri | `node scripts/qa/extract-screen-inventory.mjs` | 132 |
| API smoke | `node scripts/qa/api-smoke.mjs` | 129 pass / 0 fail / 3 skip |
| DB integrity | `node scripts/qa/db-integrity-audit.mjs` | P0=0 P1=0 |
| Finance seed | `node scripts/qa/ensure-finance-seed.js` | 36 hesap, 12 dönem |
| GIDA org | `node scripts/qa/ensure-gida-org.js` | id=9 |
| GIDA E2E | `npm run demo:gida-dongu` | MAN OK; MRP kısmi |
| FA00009 muhasebe | faturadanMuhasebe | MB00001 PASS (seed sonrası) |

## Düzeltilen bug regresyonları
| Bug | Regresyon | Sonuç |
|---|---|---|
| BUG-001 sql-console GET | smoke `/sql-console` | PASS |
| BUG-002 login alanları | smoke login | PASS |
| BUG-004 GL boş | FA00009 → MB00001 | PASS |
| BUG-007 onaylarim 401 | smoke | PASS |
