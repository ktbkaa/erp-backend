# Türkiye Bordro Kuralları (ERP Motoru)

**Parametre seti:** `TR-2025` (`hr_payroll_param_sets`)  
**Motor:** `src/services/hrPayrollService.js` → `calculateEmployeePayroll`  
**Doğrulama:** Birim test `tests/hr-payroll.test.js`

## Girdi

- Brüt ücret (aylık / dönemsel brüt)
- Önceki kümülatif GV matrahı (yıl içi)
- Avans mahsubu, diğer kesintiler
- İşveren SGK indirimi bayrağı (5 puan)

## Hesap sırası (brüt → net)

1. SGK işçi = brüt × `SGK_EMPLOYEE_RATE`
2. İşsizlik işçi = brüt × `UNEMP_EMPLOYEE_RATE`
3. GV matrahı = brüt − SGK işçi − işsizlik işçi
4. GV = dilim yürüyüşü(kümülatif_önce + matrah) − dilim(kümülatif_önce)
5. Ödenecek GV = max(0, GV − `MIN_WAGE_IT_EXEMPTION`)
6. Damga ham = brüt × `STAMP_TAX_RATE`
7. Damga = max(0, ham − `MIN_WAGE_STAMP_EXEMPTION`)
8. Net = brüt − SGK − işsizlik − GV − damga − avans − diğer
9. İşveren SGK = brüt × (`SGK_EMPLOYER_RATE_DISC` veya `_FULL`)
10. İşveren işsizlik = brüt × `UNEMP_EMPLOYER_RATE`
11. İşveren maliyeti = brüt + işveren SGK + işveren işsizlik

## Seed değerleri (2025 — dönemsel doğrula)

| Anahtar | Değer | Not |
|---------|-------|-----|
| MIN_WAGE_GROSS | 26005.50 | CSGB |
| SGK_EMPLOYEE_RATE | 0.14 | |
| UNEMP_EMPLOYEE_RATE | 0.01 | |
| SGK_EMPLOYER_RATE_FULL | 0.2075 | |
| SGK_EMPLOYER_RATE_DISC | 0.1575 | 5 puan indirim |
| UNEMP_EMPLOYER_RATE | 0.02 | |
| STAMP_TAX_RATE | 0.00759 | binde 7,59 |
| MIN_WAGE_IT_EXEMPTION | 3315.70 | Aylık; dönem güncelle |
| MIN_WAGE_STAMP_EXEMPTION | 197.38 | |

### GV dilimleri (ücret, 2025 seed)

| Sıra | Üst sınır | Oran |
|------|-----------|------|
| 10 | 158.000 | %15 |
| 20 | 330.000 | %20 |
| 30 | 1.200.000 | %27 |
| 40 | 4.300.000 | %35 |
| 50 | (üstü) | %40 |

## Akış

`Acik` → çalışma oluştur → `Hesapla` → `Onayla` → `Kesinleştir`  
Kesin kayıtta satırlar korunur; aynı run tekrar muhasebeleştirilemez (`journal_entry_id` doluysa engel).

## Bilinçli sınırlar

- AGİ kaldırılmış dönem varsayımı (2022 sonrası); ek istisnalar parametre ile.
- SGK tavanı / eksik gün / istisna matrahları sonraki parametre anahtarları.
- Net→brüt henüz yok.
- Fazla mesai çarpanı bordro satırına otomatik eklenmez; puantajdan ayrı aktarım gerekir.
