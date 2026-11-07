# Test Sonuçları

**Son güncelleme:** 2026-11-07 (Europe/Istanbul)

## Aşama 3 çekirdek (`tests/prj_core.test.js`)

| Test | Sonuç |
|------|--------|
| Proje türleri seed listelenir | PASS |
| TEST_ proje + iş + alt iş + worklog + çakışma + tarih validasyonu | PASS |
| Döngüsel parent engeli | PASS |

Komut: `node --test tests/prj_core.test.js` → 3/3 pass.

## Henüz yok

- UI tarayıcı testleri (Aşama 8)
- Entegrasyon CRM/SAL/PUR (Aşama 6)
- Kanban/Sprint/Gantt (Aşama 4–5)
- Regresyon tam suite bu turda koşturulmadı (yalnız PRJ çekirdek)
