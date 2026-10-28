# Test Results — GIDA TEST-SUT

**Koşu:** `npm run demo:gida-dongu` (ikinci başarılı koşu)  
**Özet:** `evidence/gida-tam-dongu-ozet.json`  
**Mutabakat:** `evidence/reconciliations.json`

## MAN (TEST-SUT-MAN)

| Adım | Belge | Sonuç |
|------|-------|-------|
| Satış teklifi | ST00019 | OK |
| Satış siparişi | B00047 | OK |
| SA talep | L00044 | OK |
| SA sipariş | P00043 | OK |
| Mal kabul | R00028 | OK (Giriş Depo) |
| Giriş kontrol / GKK | GK + QE | OK → Hammadde |
| Alış fatura | AF00018 | OK + muhasebe |
| Üretim | E00064 | OK + CKK onay |
| İrsaliye | IR00026 | OK |
| Satış fatura | FA00020 | OK |

## MRP (TEST-SUT-MRP)

| Adım | Belge | Sonuç |
|------|-------|-------|
| Satış siparişi | B00048 | OK |
| MRP run | MR00012 | OK (net+ 5) |
| SA talep/PO/MK | L00045 / P00044 / R00029 | OK |
| Giriş kontrol/GKK | GK00005 + QE | OK |
| Alış fatura | AF00019 | OK |
| Üretim | E00066 | OK (4 op + CKK) |
| İrsaliye / satış fatura | IR00027 / FA00021 | OK |

## Otomatik test notu

Bu koşu entegrasyon scripti ile yapıldı (`scripts/demo-gida-tam-dongu.js`). Birim test suite’i ayrıca koşturulmadı; süreç kanıtı UI ekran görüntüleri + reconciliations JSON.
