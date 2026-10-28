# Test Results — GIDA TEST-SUT

**Koşu:** `npm run demo:gida-dongu` (SA onay rotası düzeltmesi sonrası)  
**Özet:** `evidence/gida-tam-dongu-ozet.json`  
**Mutabakat:** `evidence/reconciliations.json`

## MAN (TEST-SUT-MAN)

| Adım | Belge | Sonuç |
|------|-------|-------|
| Satış teklifi | ST00021 | OK |
| Satış siparişi | B00050 | OK |
| SA talep | L00047 | OK |
| SA sipariş | P00048 | OK |
| SA merkezi onay | NK00006 (OR-SA-SIPARIS) | OK → ONAYLANDI |
| Mal kabul | R00030 | OK (Giriş Depo) |
| Giriş kontrol / GKK | GK + QE | OK → Hammadde |
| Alış fatura | AF00020 | OK + muhasebe |
| Üretim | E00067 | OK + CKK onay |
| İrsaliye | IR00028 | OK |
| Satış fatura | FA00022 | OK |

## MRP (TEST-SUT-MRP)

| Adım | Belge | Sonuç |
|------|-------|-------|
| Satış siparişi | B00051 | OK |
| MRP run | MR00013 | OK (net+ 5) |
| SA talep/PO/MK | L00048 / P00049 / R00031 | OK |
| SA merkezi onay | NK00007 (OR-SA-SIPARIS) | OK → ONAYLANDI |
| Giriş kontrol/GKK | GK00007 + QE | OK |
| Alış fatura | AF00021 | OK |
| Üretim | E00069 | OK (4 op + CKK) |
| İrsaliye / satış fatura | IR00029 / FA00023 | OK |

## Otomatik test notu

Bu koşu entegrasyon scripti ile yapıldı (`scripts/demo-gida-tam-dongu.js`). SA sipariş onayı artık atlanmıyor: rota yoksa script fail eder; adımlar `onaylaAdim` ile tamamlanır.
