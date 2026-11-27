-- İK / HR: Core personel, organizasyon, takvim, izin, puantaj iskeleti, bordro parametreleri
-- Kullanıcı (users) ile personel (hr_employees) ayrı; isteğe bağlı user_id bağlantısı.

-- ========== Organizasyon ==========
CREATE TABLE IF NOT EXISTS hr_departments (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  department_code VARCHAR(40) NOT NULL,
  department_name VARCHAR(160) NOT NULL,
  parent_id INT REFERENCES hr_departments(id),
  cost_center_code VARCHAR(40),
  manager_employee_id INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, department_code)
);

CREATE TABLE IF NOT EXISTS hr_positions (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  position_code VARCHAR(40) NOT NULL,
  position_name VARCHAR(160) NOT NULL,
  department_id INT REFERENCES hr_departments(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, position_code)
);

-- ========== Personel ==========
CREATE TABLE IF NOT EXISTS hr_employees (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  plant_id INT REFERENCES plants(id),
  employee_no VARCHAR(40) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  national_id VARCHAR(32),
  birth_date DATE,
  nationality_code VARCHAR(10) DEFAULT 'TR',
  country_code VARCHAR(10) NOT NULL DEFAULT 'TR',
  gender VARCHAR(20),
  marital_status VARCHAR(30),
  blood_type VARCHAR(10),
  email VARCHAR(160),
  phone VARCHAR(40),
  mobile_phone VARCHAR(40),
  address TEXT,
  emergency_contact_name VARCHAR(120),
  emergency_contact_phone VARCHAR(40),
  department_id INT REFERENCES hr_departments(id),
  position_id INT REFERENCES hr_positions(id),
  manager_employee_id INT REFERENCES hr_employees(id),
  user_id INT REFERENCES users(id),
  hire_date DATE NOT NULL,
  contract_type VARCHAR(40) NOT NULL DEFAULT 'BelirsizSureli',
  employment_status VARCHAR(40) NOT NULL DEFAULT 'Aktif',
  probation_end_date DATE,
  contract_end_date DATE,
  termination_date DATE,
  work_calendar_id INT,
  shift_id INT,
  cost_center_code VARCHAR(40),
  employee_type VARCHAR(40) NOT NULL DEFAULT 'Normal',
  iban VARCHAR(40),
  bank_name VARCHAR(120),
  sgk_sicil_no VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, employee_no)
);

ALTER TABLE hr_departments
  DROP CONSTRAINT IF EXISTS hr_departments_manager_employee_id_fkey;
ALTER TABLE hr_departments
  ADD CONSTRAINT hr_departments_manager_employee_id_fkey
  FOREIGN KEY (manager_employee_id) REFERENCES hr_employees(id);

CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON hr_employees(company_id, employment_status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_manager ON hr_employees(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_user ON hr_employees(user_id);

CREATE TABLE IF NOT EXISTS hr_employment_history (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  change_type VARCHAR(40) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  department_id INT REFERENCES hr_departments(id),
  position_id INT REFERENCES hr_positions(id),
  manager_employee_id INT REFERENCES hr_employees(id),
  plant_id INT REFERENCES plants(id),
  cost_center_code VARCHAR(40),
  salary_amount NUMERIC(18,2),
  currency_code VARCHAR(10),
  description TEXT,
  created_by_user_id INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_employee_documents (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  document_type VARCHAR(60) NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120),
  file_size_bytes INT,
  document_date DATE,
  valid_until DATE,
  confidentiality VARCHAR(30) NOT NULL DEFAULT 'Normal',
  status VARCHAR(30) NOT NULL DEFAULT 'Aktif',
  uploaded_by_user_id INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== Çalışma takvimi / vardiya ==========
CREATE TABLE IF NOT EXISTS hr_work_calendars (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  calendar_code VARCHAR(40) NOT NULL,
  calendar_name VARCHAR(160) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'TR',
  version_no INT NOT NULL DEFAULT 1,
  work_days_per_week NUMERIC(4,1) NOT NULL DEFAULT 5,
  daily_presence_hours NUMERIC(6,2) NOT NULL DEFAULT 9,
  daily_net_hours NUMERIC(6,2) NOT NULL DEFAULT 8,
  break_minutes INT NOT NULL DEFAULT 60,
  weekly_net_hours NUMERIC(6,2) NOT NULL DEFAULT 40,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, calendar_code, version_no)
);

ALTER TABLE hr_employees
  DROP CONSTRAINT IF EXISTS hr_employees_work_calendar_id_fkey;
ALTER TABLE hr_employees
  ADD CONSTRAINT hr_employees_work_calendar_id_fkey
  FOREIGN KEY (work_calendar_id) REFERENCES hr_work_calendars(id);

CREATE TABLE IF NOT EXISTS hr_shifts (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  shift_code VARCHAR(40) NOT NULL,
  shift_name VARCHAR(160) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 60,
  crosses_midnight BOOLEAN NOT NULL DEFAULT FALSE,
  net_hours NUMERIC(6,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, shift_code)
);

ALTER TABLE hr_employees
  DROP CONSTRAINT IF EXISTS hr_employees_shift_id_fkey;
ALTER TABLE hr_employees
  ADD CONSTRAINT hr_employees_shift_id_fkey
  FOREIGN KEY (shift_id) REFERENCES hr_shifts(id);

CREATE TABLE IF NOT EXISTS hr_shift_assignments (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  shift_id INT NOT NULL REFERENCES hr_shifts(id),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_public_holidays (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(10) NOT NULL DEFAULT 'TR',
  company_id INT REFERENCES companies(id),
  holiday_date DATE NOT NULL,
  holiday_name VARCHAR(160) NOT NULL,
  is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
  year_no INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (country_code, holiday_date, company_id)
);

-- ========== İzin ==========
CREATE TABLE IF NOT EXISTS hr_leave_types (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  country_code VARCHAR(10) NOT NULL DEFAULT 'TR',
  leave_code VARCHAR(40) NOT NULL,
  leave_name VARCHAR(160) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  unit VARCHAR(20) NOT NULL DEFAULT 'Gun',
  accrual_method VARCHAR(40) NOT NULL DEFAULT 'YillikKidem',
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  affects_payroll BOOLEAN NOT NULL DEFAULT TRUE,
  approval_route_screen VARCHAR(80) DEFAULT 'hr-izin-talepleri',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_leave_types_code
  ON hr_leave_types (COALESCE(company_id, 0), leave_code);

CREATE TABLE IF NOT EXISTS hr_leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  leave_type_id INT NOT NULL REFERENCES hr_leave_types(id),
  year_no INT NOT NULL,
  opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  accrued NUMERIC(10,2) NOT NULL DEFAULT 0,
  used NUMERIC(10,2) NOT NULL DEFAULT 0,
  adjusted NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (employee_id, leave_type_id, year_no)
);

CREATE TABLE IF NOT EXISTS hr_leave_requests (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  request_no VARCHAR(40) NOT NULL,
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  leave_type_id INT NOT NULL REFERENCES hr_leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'Gun',
  quantity NUMERIC(10,2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Taslak',
  description TEXT,
  rejection_reason TEXT,
  requested_by_user_id INT REFERENCES users(id),
  approved_by_user_id INT REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, request_no),
  CHECK (end_date >= start_date),
  CHECK (status IN ('Taslak','Gonderildi','YoneticiOnay','IkOnay','Onaylandi','Reddedildi','Iptal'))
);

CREATE TABLE IF NOT EXISTS hr_leave_balance_movements (
  id SERIAL PRIMARY KEY,
  balance_id INT NOT NULL REFERENCES hr_leave_balances(id) ON DELETE CASCADE,
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  leave_request_id INT REFERENCES hr_leave_requests(id),
  movement_type VARCHAR(40) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== Puantaj ==========
CREATE TABLE IF NOT EXISTS hr_attendance_raw (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  employee_id INT REFERENCES hr_employees(id),
  source_system VARCHAR(60) NOT NULL DEFAULT 'MANUAL',
  source_record_id VARCHAR(120),
  event_time TIMESTAMP NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  device_code VARCHAR(60),
  raw_payload JSONB,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_attendance_raw_source
  ON hr_attendance_raw (company_id, source_system, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS hr_attendance_days (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  work_date DATE NOT NULL,
  planned_minutes INT NOT NULL DEFAULT 0,
  actual_minutes INT NOT NULL DEFAULT 0,
  break_minutes INT NOT NULL DEFAULT 0,
  late_minutes INT NOT NULL DEFAULT 0,
  early_leave_minutes INT NOT NULL DEFAULT 0,
  overtime_minutes INT NOT NULL DEFAULT 0,
  leave_minutes INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Acik',
  description TEXT,
  UNIQUE (employee_id, work_date)
);

-- ========== Ücret / bordro ==========
CREATE TABLE IF NOT EXISTS hr_payroll_param_sets (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(10) NOT NULL,
  set_code VARCHAR(40) NOT NULL,
  set_name VARCHAR(160) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  source_url TEXT,
  source_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (country_code, set_code, effective_from)
);

CREATE TABLE IF NOT EXISTS hr_payroll_param_values (
  id SERIAL PRIMARY KEY,
  param_set_id INT NOT NULL REFERENCES hr_payroll_param_sets(id) ON DELETE CASCADE,
  param_key VARCHAR(80) NOT NULL,
  param_value NUMERIC(18,6) NOT NULL,
  value_text VARCHAR(200),
  description TEXT,
  UNIQUE (param_set_id, param_key)
);

CREATE TABLE IF NOT EXISTS hr_payroll_tax_brackets (
  id SERIAL PRIMARY KEY,
  param_set_id INT NOT NULL REFERENCES hr_payroll_param_sets(id) ON DELETE CASCADE,
  line_no INT NOT NULL,
  up_to_amount NUMERIC(18,2),
  rate NUMERIC(8,4) NOT NULL,
  fixed_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  UNIQUE (param_set_id, line_no)
);

CREATE TABLE IF NOT EXISTS hr_employee_salaries (
  id SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  wage_type VARCHAR(20) NOT NULL DEFAULT 'Aylik',
  gross_amount NUMERIC(18,2) NOT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'TRY',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_advances (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  advance_no VARCHAR(40) NOT NULL,
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(18,2) NOT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'TRY',
  status VARCHAR(40) NOT NULL DEFAULT 'Taslak',
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  deducted_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, advance_no),
  CHECK (status IN ('Taslak','OnayBekliyor','Onaylandi','Odendi','Mahsup','Iptal'))
);

CREATE TABLE IF NOT EXISTS hr_payroll_periods (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  period_code VARCHAR(20) NOT NULL,
  year_no INT NOT NULL,
  month_no INT NOT NULL CHECK (month_no BETWEEN 1 AND 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Acik',
  country_code VARCHAR(10) NOT NULL DEFAULT 'TR',
  param_set_id INT REFERENCES hr_payroll_param_sets(id),
  UNIQUE (company_id, period_code),
  CHECK (status IN ('Acik','Hesaplama','Kontrol','Onay','Kesin','Iptal'))
);

CREATE TABLE IF NOT EXISTS hr_payroll_runs (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  period_id INT NOT NULL REFERENCES hr_payroll_periods(id),
  run_no VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Taslak',
  employee_count INT NOT NULL DEFAULT 0,
  total_gross NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_employer_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  param_set_id INT REFERENCES hr_payroll_param_sets(id),
  calculated_at TIMESTAMP,
  finalized_at TIMESTAMP,
  journal_entry_id INT,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, run_no),
  CHECK (status IN ('Taslak','Hesaplandi','Onaylandi','Kesin','Iptal'))
);

CREATE TABLE IF NOT EXISTS hr_payroll_lines (
  id SERIAL PRIMARY KEY,
  run_id INT NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  company_id INT NOT NULL REFERENCES companies(id),
  gross_wage NUMERIC(18,2) NOT NULL DEFAULT 0,
  sgk_employee NUMERIC(18,2) NOT NULL DEFAULT 0,
  unemployment_employee NUMERIC(18,2) NOT NULL DEFAULT 0,
  income_tax_base NUMERIC(18,2) NOT NULL DEFAULT 0,
  cumulative_tax_base NUMERIC(18,2) NOT NULL DEFAULT 0,
  income_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  income_tax_exemption NUMERIC(18,2) NOT NULL DEFAULT 0,
  stamp_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  stamp_tax_exemption NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
  advance_deduction NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_wage NUMERIC(18,2) NOT NULL DEFAULT 0,
  sgk_employer NUMERIC(18,2) NOT NULL DEFAULT 0,
  unemployment_employer NUMERIC(18,2) NOT NULL DEFAULT 0,
  employer_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  calc_detail JSONB,
  UNIQUE (run_id, employee_id)
);

-- ========== İşe alım / çıkış (iskelet) ==========
CREATE TABLE IF NOT EXISTS hr_job_requisitions (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  requisition_no VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  department_id INT REFERENCES hr_departments(id),
  position_id INT REFERENCES hr_positions(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Acik',
  headcount INT NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, requisition_no)
);

CREATE TABLE IF NOT EXISTS hr_candidates (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  candidate_no VARCHAR(40) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(160),
  phone VARCHAR(40),
  requisition_id INT REFERENCES hr_job_requisitions(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Aday',
  employee_id INT REFERENCES hr_employees(id),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, candidate_no)
);

CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  task_code VARCHAR(40) NOT NULL,
  task_name VARCHAR(200) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Bekliyor',
  due_date DATE,
  completed_at TIMESTAMP,
  assignee_user_id INT REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_asset_assignments (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  asset_code VARCHAR(60) NOT NULL,
  asset_name VARCHAR(200) NOT NULL,
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_at DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'Zimmette',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_terminations (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  termination_no VARCHAR(40) NOT NULL,
  employee_id INT NOT NULL REFERENCES hr_employees(id),
  notice_date DATE,
  last_work_date DATE NOT NULL,
  termination_date DATE NOT NULL,
  reason_code VARCHAR(40) NOT NULL,
  reason_name VARCHAR(200),
  status VARCHAR(40) NOT NULL DEFAULT 'Taslak',
  severance_eligible BOOLEAN,
  notice_eligible BOOLEAN,
  unused_leave_days NUMERIC(10,2),
  severance_amount NUMERIC(18,2),
  notice_amount NUMERIC(18,2),
  unused_leave_amount NUMERIC(18,2),
  other_amount NUMERIC(18,2),
  deduction_amount NUMERIC(18,2),
  net_settlement NUMERIC(18,2),
  calc_detail JSONB,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, termination_no)
);

-- ========== Kod serileri ==========
INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES
  ('HR_EMPLOYEE', 'HE', 'İK Personel', 0, 'hr-personel', 'Personel Kartı', TRUE),
  ('HR_DEPT', 'HD', 'İK Departman', 0, 'hr-departmanlar', 'Departmanlar', TRUE),
  ('HR_POS', 'HZ', 'İK Pozisyon', 0, 'hr-pozisyonlar', 'Pozisyonlar', TRUE),
  ('HR_LEAVE_REQ', 'IZ', 'İK İzin Talebi', 0, 'hr-izin-talepleri', 'İzin Talepleri', TRUE),
  ('HR_ADVANCE', 'AV', 'İK Avans', 0, 'hr-avanslar', 'Avanslar', TRUE),
  ('HR_PAYROLL_RUN', 'BR', 'İK Bordro Çalışması', 0, 'hr-bordro-calismalari', 'Bordro Çalışmaları', TRUE),
  ('HR_JOB_REQ', 'JP', 'İK İş İlanı', 0, 'hr-is-ilanlari', 'İş İlanları', TRUE),
  ('HR_CANDIDATE', 'HC', 'İK Aday', 0, 'hr-adaylar', 'Adaylar', TRUE),
  ('HR_TERMINATION', 'CI', 'İK İşten Çıkış', 0, 'hr-isten-cikis', 'İşten Çıkış', TRUE),
  ('HR_CAL', 'HT', 'İK Çalışma Takvimi', 0, 'hr-calisma-takvimleri', 'Çalışma Takvimleri', TRUE),
  ('HR_SHIFT', 'VR', 'İK Vardiya', 0, 'hr-vardiyalar', 'Vardiyalar', TRUE)
ON CONFLICT (series_code) DO NOTHING;

-- ========== TR 2025 bordro parametre seti (CSGB / GİB kaynaklı; doğrulanabilir) ==========
INSERT INTO hr_payroll_param_sets (country_code, set_code, set_name, effective_from, effective_to, source_url, source_note, is_active)
SELECT 'TR', 'TR-2025', 'Türkiye 2025 bordro parametreleri', '2025-01-01', '2025-12-31',
       'https://csgb.gov.tr/Media/f4xjys1e/2025-asgari-ucret_.pdf',
       'CSGB 2025 asgari ücret; GİB 2025 GV tarifesi; damga binde 7,59. İstisna ve tavanlar dönemsel doğrulanmalı.',
       TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM hr_payroll_param_sets WHERE country_code='TR' AND set_code='TR-2025' AND effective_from='2025-01-01'
);

INSERT INTO hr_payroll_param_values (param_set_id, param_key, param_value, description)
SELECT s.id, v.param_key, v.param_value, v.description
FROM hr_payroll_param_sets s
JOIN (VALUES
  ('MIN_WAGE_GROSS', 26005.50, '2025 brüt asgari ücret (aylık)'),
  ('SGK_EMPLOYEE_RATE', 0.14, 'SGK işçi payı'),
  ('UNEMP_EMPLOYEE_RATE', 0.01, 'İşsizlik işçi payı'),
  ('SGK_EMPLOYER_RATE_FULL', 0.2075, 'SGK işveren payı (indirimsiz; KV %2.25 dahil)'),
  ('SGK_EMPLOYER_RATE_DISC', 0.1575, 'SGK işveren payı (5 puan indirimli)'),
  ('UNEMP_EMPLOYER_RATE', 0.02, 'İşsizlik işveren payı'),
  ('STAMP_TAX_RATE', 0.00759, 'Damga vergisi oranı (binde 7,59)'),
  ('MIN_WAGE_IT_EXEMPTION', 3315.70, 'Asgari ücret GV istisnası (Ocak-Tem örnek; aylık doğrula)'),
  ('MIN_WAGE_STAMP_EXEMPTION', 197.38, 'Asgari ücret damga istisnası')
) AS v(param_key, param_value, description) ON TRUE
WHERE s.set_code='TR-2025'
  AND NOT EXISTS (
    SELECT 1 FROM hr_payroll_param_values x WHERE x.param_set_id=s.id AND x.param_key=v.param_key
  );

INSERT INTO hr_payroll_tax_brackets (param_set_id, line_no, up_to_amount, rate, fixed_amount)
SELECT s.id, b.line_no, b.up_to_amount, b.rate, b.fixed_amount
FROM hr_payroll_param_sets s
JOIN (VALUES
  (10, 158000.00::numeric, 0.15::numeric, 0::numeric),
  (20, 330000.00, 0.20, 23700.00),
  (30, 1200000.00, 0.27, 58100.00),
  (40, 4300000.00, 0.35, 293000.00),
  (50, NULL::numeric, 0.40, 1378000.00)
) AS b(line_no, up_to_amount, rate, fixed_amount) ON TRUE
WHERE s.set_code='TR-2025'
  AND NOT EXISTS (SELECT 1 FROM hr_payroll_tax_brackets x WHERE x.param_set_id=s.id AND x.line_no=b.line_no);

-- Varsayılan izin türleri (global TR)
INSERT INTO hr_leave_types (company_id, country_code, leave_code, leave_name, is_paid, unit, accrual_method, requires_document, description)
SELECT NULL, 'TR', v.code, v.name, v.paid, 'Gun', v.method, v.doc, v.descr
FROM (VALUES
  ('YILLIK', 'Yıllık Ücretli İzin', TRUE, 'YillikKidem', FALSE, '4857 md.53 — kıdem bazlı hak ediş'),
  ('MAZERET', 'Mazeret İzni', TRUE, 'Talep', FALSE, 'Şirket politikası / sözleşme'),
  ('RAPOR', 'Hastalık / Rapor', TRUE, 'Talep', TRUE, 'Sağlık raporu belgesi ile'),
  ('UCRETSIZ', 'Ücretsiz İzin', FALSE, 'Talep', FALSE, 'Bordroya yansıyan ücretsiz süre'),
  ('EVLILIK', 'Evlilik İzni', TRUE, 'Talep', FALSE, 'İş Kanunu / sözleşme'),
  ('BABALIK', 'Babalık İzni', TRUE, 'Talep', FALSE, 'İş Kanunu'),
  ('IDARI', 'İdari İzin', TRUE, 'Talep', FALSE, 'Şirket politikası')
) AS v(code, name, paid, method, doc, descr)
WHERE NOT EXISTS (SELECT 1 FROM hr_leave_types t WHERE t.company_id IS NULL AND t.leave_code=v.code);

-- 2025 TR resmi tatiller (örnek set; şirket özel günleri ayrıca tanımlanabilir)
INSERT INTO hr_public_holidays (country_code, company_id, holiday_date, holiday_name, year_no)
SELECT 'TR', NULL, d::date, n, 2025
FROM (VALUES
  ('2025-01-01', 'Yılbaşı'),
  ('2025-03-30', 'Ramazan Bayramı 1. Gün'),
  ('2025-03-31', 'Ramazan Bayramı 2. Gün'),
  ('2025-04-01', 'Ramazan Bayramı 3. Gün'),
  ('2025-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'),
  ('2025-05-01', 'Emek ve Dayanışma Günü'),
  ('2025-05-19', 'Atatürk''ü Anma, Gençlik ve Spor Bayramı'),
  ('2025-06-06', 'Kurban Bayramı 1. Gün'),
  ('2025-06-07', 'Kurban Bayramı 2. Gün'),
  ('2025-06-08', 'Kurban Bayramı 3. Gün'),
  ('2025-06-09', 'Kurban Bayramı 4. Gün'),
  ('2025-07-15', 'Demokrasi ve Millî Birlik Günü'),
  ('2025-08-30', 'Zafer Bayramı'),
  ('2025-10-28', 'Cumhuriyet Bayramı arifesi (yarım gün)'),
  ('2025-10-29', 'Cumhuriyet Bayramı')
) AS x(d, n)
WHERE NOT EXISTS (
  SELECT 1 FROM hr_public_holidays h
  WHERE h.country_code='TR' AND h.company_id IS NULL AND h.holiday_date=x.d::date
);

UPDATE hr_public_holidays SET is_half_day = TRUE
WHERE country_code='TR' AND holiday_date='2025-10-28' AND company_id IS NULL;
