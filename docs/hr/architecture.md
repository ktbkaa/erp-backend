# İK Mimari ve Veri Modeli

## Katmanlar

```
UI (public/app.js MODULES insan-kaynaklari)
  → Express routes (/hr-personel, /hr-org, /hr-izin, /hr-takvim, /hr-puantaj, /hr-bordro, /hr-ise-alim)
    → services/hrPayrollService.js
      → PostgreSQL hr_* tabloları
```

## Varlık ilişkileri (özet)

- `companies` 1—N `hr_departments` / `hr_employees` / dönemler
- `hr_departments` parent_id (ağaç); `hr_positions.department_id`
- `hr_employees.manager_employee_id` → self; `user_id` → `users` (opsiyonel)
- `hr_employment_history` zaman çizelgesi (org/ücret)
- `hr_work_calendars` (sürümlü) + `hr_shifts` + atamalar
- `hr_attendance_raw` → `hr_attendance_days`
- `hr_leave_types` → balances / movements / requests
- `hr_payroll_param_sets` → values / tax_brackets
- `hr_employee_salaries` → `hr_payroll_runs` / `hr_payroll_lines`
- `hr_advances` mahsup bordro hesabında
- `hr_job_requisitions` → `hr_candidates` → `hr_employees`
- `hr_onboarding_tasks`, `hr_asset_assignments`, `hr_terminations`

## Entegrasyon durumu

| Modül | Durum |
|-------|--------|
| users / roller | `user_id` FK; ekran yetkisi mevcut shell |
| Firma izolasyonu | `company_id` + header |
| Onay motoru | İzin için durum makinesi; genel onay rotası bağlanabilir (`approval_route_screen`) |
| Muhasebe | `journal_entry_id` rezerv; otomatik fiş sonraki |
| PDKS | Ham import API; cihaz adaptörü harici |
| Üretim vardiya | Ortak vardiya tanımı; üretim planına senkron sonraki |
| Zimmet / demirbaş | İK zimmet tablosu; stok kartı bağlama sonraki |

## Mevcut vs yeni

| Özellik | Önce | Sonra |
|---------|------|--------|
| Personel özlük | Yok | `hr_employees` + UI |
| Org hiyerarşi | Yok | Departman ağacı + yönetici |
| İzin | Yok | Tür / bakiye / talep / onay |
| Puantaj | Yok | Ham + günlük |
| Bordro | Yok | Parametre + brüt→net + dönem |
| İşe alım | CRM lead (satış) | İK aday → personel |
| İşten çıkış | Yok | Süreç + ön hesaplaşma |
