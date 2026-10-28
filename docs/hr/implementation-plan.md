# İK Modülü — Uygulama Planı ve İlerleme

**Dal:** `cursor/erp-hr-modul-4f63`  
**Varsayılan ülke:** TR  
**Son güncelleme:** 2026-10-28 (Europe/Istanbul)

## Keşif özeti

| Alan | Bulgu |
|------|--------|
| Mevcut `hr_*` tabloları | Yoktu (greenfield) |
| Personel kartı ekranı | Yoktu |
| Kullanıcı (`users`) | Ayrı kimlik; `hr_employees.user_id` ile opsiyonel bağ |
| PDKS | Yoktu; ham/işlenmiş puantaj altyapısı eklendi |
| Bordro | Yoktu; parametre tabloları + brüt→net motor |
| Demo şirketler / kullanıcılar | Korundu; migration yalnızca ekler |

## Faz durumu

| Faz | Kapsam | Durum |
|-----|--------|--------|
| 1 | Keşif + TR mevzuat dokümanları | Tamam |
| 2 | Core HR (departman, pozisyon, personel, geçmiş) | Tamam (API+UI+migration) |
| 3 | Takvim, vardiya, puantaj, izin | Tamam (iskelet + gerçek hesap) |
| 4 | Ücret, avans, bordro motoru | Tamam (TR-2025 parametre seti) |
| 5 | İşe alım, onboarding, zimmet | Tamam |
| 6 | İşten çıkış / ön hesaplaşma | Tamam (uzman onayı zorunlu notu ile) |
| 7 | Test + kullanıcı kılavuzu + PDF | Tamam (birim 5/5, smoke OK, IK_Modul_Rehberi.pdf) |

## Teknik kararlar

1. **Personel ≠ kullanıcı.** Sistem girişi `users`; özlük `hr_employees`.
2. **Ülke kuralları tabloda.** Oranlar kodda sabitlenmez; `hr_payroll_param_*`.
3. **Takvim sürümleme.** `calendar_code + version_no`; yeni sürüm eskiyi pasife alır.
4. **Ham PDKS korunur.** Düzeltmeler `hr_attendance_days` üzerinde gerekçeli.
5. **Kesin bordro immutable.** Değişiklik için yeni çalışma / düzeltme akışı.
6. **Kıdem/ihbar.** Uygunluk önce; tutar ön hesap; kesin hukuk iddiası yok.
7. **AZ/DE/NL.** Adaptasyon mimarisi `country-adaptation.md`; henüz hesaplama yok.

## Dosya haritası

| Tür | Yol |
|-----|-----|
| Migration | `db/migrations/053_hr_core_time_payroll.sql` |
| Bordro motoru | `src/services/hrPayrollService.js` |
| API | `routes/hr_*.js` |
| UI | `public/app.js` → modül `insan-kaynaklari` |
| Dokümanlar | `docs/hr/*` |
| Test | `tests/hr-payroll.test.js` |

## Bilinen eksikler / bağımlılıklar

- Muhasebe fişi otomatik oluşturma: `journal_entry_id` alanı hazır; hesap eşleme UI’si sonraki iterasyon.
- Net→brüt iteratif çözücü henüz yok (yalnızca brüt→net).
- Belge dosya depolama: metadata + `storage_key`; nesne depolama (S3 vb.) harici.
- Vekâlet / geçici yönetici: onay modülündeki yetki devri ile birleştirilecek.
- AZ/DE/NL bordro parametre setleri doğrulanmadan üretilmeyecek.
