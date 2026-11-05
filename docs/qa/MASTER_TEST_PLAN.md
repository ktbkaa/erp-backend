# KTB ERP — MASTER TEST PLAN / QA Merkezi

**Başlangıç:** 2026-11-05 (Europe/Istanbul)  
**Dal:** `cursor/erp-qa-merkezi-4f63`  
**Amaç:** Kalıcı QA merkezi + tam sistem denetimi (ekran · fonksiyon · veri · süreç)

## Ölçüm ayrımı (zorunlu)

| Ölçüm | Tanım | Bu tur |
|---|---|---|
| Ekran kapsamı | Menüdeki ekranların kaçı gerçekten test edildi | Hedef ≥ %90 GET smoke |
| Fonksiyon kapsamı | CRUD/approve/convert/filtre işlevleri | Kritik yollar + örnekleme |
| Kod kapsamı | Otomatik unit/API testleri | `npm test` + `scripts/qa/*` |
| İş süreci kapsamı | Uçtan uca şirket senaryosu adımları | GIDA süt döngüsü |

## Aşamalar

| # | Aşama | Durum | Çıktı |
|---|---|---|---|
| 0 | Keşif + plan | done | bu dosya |
| 1 | Ekran envanteri | done | `01-screen-inventory.md` (132 ekran) |
| 2 | DB bütünlük | done | `02-database-integrity-audit.md` |
| 3 | API smoke (tüm endpoint) | done | `03-functional-test-results.md` |
| 4 | Entegrasyon / güvenlik örnekleri | done | `04` / `05` |
| 5 | Performans örnek | done | `06` |
| 6 | GIDA E2E simülasyon | done | `07` + evidence |
| 7 | Bug tracker + düzeltmeler | done | `08` |
| 8 | Regresyon | done | `09` |
| 9 | Final puan + PDF | done | `10` + PDF + dashboard |

## Komutlar

```bash
node scripts/qa/extract-screen-inventory.mjs
node scripts/qa/api-smoke.mjs
node scripts/qa/db-integrity-audit.mjs
node scripts/qa/e2e-gida-simulation.mjs
node scripts/qa/build-qa-dashboard.mjs
node scripts/qa/build-qa-pdf.mjs
npm test
```

## Test ortamı kuralları

- Üretim DB yok — yerel/test postgres.
- GIDA dışı firmalara (MOBIL/KILIF) toplu silme yok.
- Gerçek e-fatura / banka / e-posta gönderimi yok.
- TEST_* etiketli veri kullan.

## İlerleme günlüğü

- 2026-11-05 14:10 TR: Envanter 132 ekran; API smoke 129/129 pass (3 skip duplicate); DB audit P0/P1=0.
- 2026-11-05: sql-console GET `/` eklendi (404 düzeltmesi). Smoke login username/password hizalandı.
- 2026-11-05: GIDA org + owner; `demo:gida-dongu` MAN OK; finance seed (36 GL) → FA00009/MB00001; QA dashboard + PDF; skor 78/100.
