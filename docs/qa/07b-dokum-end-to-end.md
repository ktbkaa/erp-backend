# Uçtan Uca — DOKUM (Anadolu Döküm Sanayi)

**Tarih:** 2026-11-05 Europe/Istanbul  
**Firma:** DOKUM / Anadolu Döküm Sanayi A.Ş. (id=11)  
**Etiketler:** `TEST-DKM-BASE` · `TEST-DKM-MAN` · `TEST-DKM-MRP`  
**Özet:** `docs/erp-full-cycle-test/evidence/dokum-tam-dongu-ozet.json`

## Kurulum
```bash
npm run qa:finance-seed
npm run demo:4-firma          # EN org (ELEK/TEKS/META/GIDA/DOKUM)
npm run qa:dokum-org
npm run demo:dokum-dongu
```

## TEST-DKM-MAN

| Adım | Belge | Sonuç |
|---|---|---|
| Teklif | ST00012 | OK |
| Satış siparişi | B00028 | OK |
| SA talep / sipariş / onay | L00017 / P00035 / NK00016 | OK |
| Mal kabul + GKK | R00034 | OK |
| Üretim + CKK | E00033 | OK |
| İrsaliye | IR00027 Onayli | OK |
| Alış / satış fatura | AF00016 / FA00018 | OK |

## TEST-DKM-MRP

| Adım | Belge | Sonuç |
|---|---|---|
| BI + MRP | BI00012 / MR00015 | OK (net_pozitif=4) |
| MRP→SA talep | L00018 | OK |
| MRP→PO / onay / MK | P00036 / NK00017 / R00035 | OK |
| MRP→UE | E00035 | OK |
| İrsaliye / satış fatura | IR00028 / FA00019 | OK (mamul güvence sonrası) |

## Bulgular
- Lot bazlı stok + lotsuz çıkış negatif bakiye üretebiliyor (P2) — `stokWipe` + mamul güvence.
- CKK onayından sonra mamul kullanılabilir bakiye bazen negatif/yetersiz kalıyor (P2) — demo güvence girişi; kök neden ayrı sprint.

## Süreç kapsamı
- MAN ~%100 (bu tur kanıtlı)
- MRP ~%95 (güvence workaround ile sevk/fatura)
