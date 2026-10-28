# Ülke Adaptasyonu (TR / AZ / DE / NL)

## Mimari ilke

Türkiye kuralları diğer ülkelere **kopyalanmaz**. Her ülke için:

1. `hr_payroll_param_sets.country_code`
2. İzin türleri `hr_leave_types.country_code`
3. Resmî tatiller `hr_public_holidays.country_code`
4. Personel `hr_employees.country_code`
5. Bordro dönemi `hr_payroll_periods.country_code` → ilgili param seti

Motor `getParamSet({ countryCode, onDate })` ile sürüm seçer.

## Ülke durum matrisi

| Ülke | Özlük | Takvim/izin | Bordro parametre | Hesap motoru iddiası |
|------|-------|-------------|------------------|----------------------|
| TR | Aktif | Aktif + 2025 tatil seed | TR-2025 | Brüt→net (doğrulanabilir seed) |
| AZ | Alan hazır | Tatil/izin ayrı tanımlanmalı | Yok | **Yok** — doğrulanmadan hesap yok |
| DE | Alan hazır | Haftalık süre / tatil farklı | Yok | **Yok** |
| NL | Alan hazır | Vakantieuren vb. ayrı model | Yok | **Yok** |

## Ülkeye özel dikkat noktaları (araştırma notu)

### Azerbaycan
- SGK/vergi oranları ve asgari ücret Azerbaycan mevzuatına göre ayrı set.
- TR dilimleri / damga oranı kullanılmaz.

### Almanya
- Lohnsteuer sınıfı, Kirchensteuer, Sozialversicherung tavanları.
- Aylık / yıllık Lohnsteuer tabloları; TR progressive walk birebir uygulanmaz.

### Hollanda
- Loonheffing, premies werknemersverzekeringen.
- İzin: yasal minimum gün + collective agreement.

## Adaptasyon checklist (yeni ülke)

1. Resmî kaynak URL’leri `source_url` / `docs/hr/legal-research-<cc>.md`
2. Parametre seti + dilimler + istisnalar
3. İzin türleri ve hak ediş yöntemi
4. Resmî tatil takvimi (yıl bazlı, geçmişi bozmadan)
5. Birim testlerle örnek bordro
6. Kullanıcı kılavuzu bölümü

**Kural:** Kaynak doğrulanmadan `is_active=TRUE` bordro seti yayınlanmaz.
