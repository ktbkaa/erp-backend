# İK Test Sonuçları

**Tarih:** 2026-10-28 (Europe/Istanbul)

## Birim testler

Komut: `node --test tests/hr-payroll.test.js`

| Test | Sonuç |
|------|--------|
| Yıllık izin hak ediş (4857 md.53) | PASS |
| Kümülatif GV dilim yürüyüşü | PASS |
| Asgari ücret brüt→net deterministik | PASS |
| Yüksek brüt + kümülatif matrah | PASS |
| Avans mahsubu net etkisi | PASS |

**Özet:** 5/5 geçti.

## Uçtan uca duman (`scripts/hr-smoke.js`)

Firma: ELEK (id=1)

| Adım | Sonuç |
|------|--------|
| Departman + pozisyon | OK |
| Çalışma takvimi (5 gün / 9.5 net) | OK |
| Personel HE00001 + ücret 50.000 | OK |
| İzin hak ediş 14 + talep onay | IZ00001 Onaylandi |
| PDKS ham + günlük işleme | plan=570 actual=570 FM=0 |
| Bordro simülasyon | net 39.258,58 (TR-2025) |
| Dönem 2025-06 → hesapla/onay/kesin | BR00001 Kesin, 1 kişi |
| Aday → işe alım | HE00002 |

**SMOKE_OK**

## Bordro örnek (50.000 brüt, kümülatif 0, indirimli işveren)

Motor çıktısı smoke ile: net ≈ 39.258,58 TRY (parametre seti TR-2025).  
Aynı girdilerle tekrar çağrı aynı sonucu üretir (birim test).
