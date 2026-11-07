# Test Sonuçları

**Son güncelleme:** 7 Kasım 2026 (Europe/Istanbul)

## Otomatik suite

| Dosya | Test | Sonuç |
|-------|------|--------|
| `tests/prj_core.test.js` | tür seed | PASS |
| | proje + iş + worklog + çakışma + tarih | PASS |
| | döngüsel parent engeli | PASS |
| `tests/prj_full.test.js` | şablondan işler | PASS |
| | board + transition | PASS |
| | sprint yaşam döngüsü | PASS |
| | bütçe + maliyet + aşım | PASS |
| | gantt/backlog/workload/dashboard | PASS |
| | risk + kapanış checklist | PASS |
| | alt açıkken Done engeli | PASS |

**Toplam: 10/10 PASS** (`node --test tests/prj_core.test.js tests/prj_full.test.js`)

## Henüz yok

- Tarayıcı UI E2E (Aşama 8 genişletme)  
- Tam regresyon suite tüm ERP modülleri  

## P0/P1 açık hatalar

Yok (testlerde yakalananlar düzeltildi). Bilinen ürün boşlukları: `12_KNOWN_ISSUES.md`.
