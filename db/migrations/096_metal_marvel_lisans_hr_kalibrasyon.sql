-- Metal Marvel simülasyonu: İK sicil zenginleştirme + lisans altyapısı + kalibrasyon
-- 2026-11-24

-- ─── İK personel (sicil) ek alanlar ───
ALTER TABLE hr_employees
  ADD COLUMN IF NOT EXISTS collar_type VARCHAR(20) NOT NULL DEFAULT 'BeyazYaka',
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(40),
  ADD COLUMN IF NOT EXISTS education_school VARCHAR(160),
  ADD COLUMN IF NOT EXISTS education_field VARCHAR(120),
  ADD COLUMN IF NOT EXISTS military_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS disability_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS work_location VARCHAR(120),
  ADD COLUMN IF NOT EXISTS city_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS district_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS driver_license_class VARCHAR(40),
  ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(60),
  ADD COLUMN IF NOT EXISTS union_member BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payroll_group_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS badge_no VARCHAR(40),
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_hr_employees_collar
  ON hr_employees(company_id, collar_type, employment_status);

COMMENT ON COLUMN hr_employees.collar_type IS 'BeyazYaka | MaviYaka';
COMMENT ON COLUMN hr_employees.badge_no IS 'Kart / yaka numarası (PDKS)';

-- ─── Lisans (firma + modül koltuk) ───
CREATE TABLE IF NOT EXISTS system_licenses (
  id SERIAL PRIMARY KEY,
  license_code VARCHAR(40) NOT NULL UNIQUE,
  license_name VARCHAR(160) NOT NULL,
  vendor_name VARCHAR(120) DEFAULT 'KTB ERP',
  edition VARCHAR(40) NOT NULL DEFAULT 'Enterprise',
  max_named_users INT NOT NULL DEFAULT 50,
  max_concurrent_users INT,
  max_companies INT NOT NULL DEFAULT 1,
  modules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  license_key VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_licenses (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  system_license_id INT NOT NULL REFERENCES system_licenses(id) ON DELETE CASCADE,
  seat_named INT NOT NULL DEFAULT 0,
  seat_used INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE (company_id, system_license_id)
);

CREATE TABLE IF NOT EXISTS license_module_seats (
  id SERIAL PRIMARY KEY,
  company_license_id INT NOT NULL REFERENCES company_licenses(id) ON DELETE CASCADE,
  module_code VARCHAR(60) NOT NULL,
  module_name VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_users INT,
  UNIQUE (company_license_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_company_licenses_company ON company_licenses(company_id);

-- ─── Kalite kalibrasyon ───
CREATE TABLE IF NOT EXISTS qc_instruments (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  plant_id INT REFERENCES plants(id),
  instrument_code VARCHAR(40) NOT NULL,
  instrument_name VARCHAR(160) NOT NULL,
  instrument_type VARCHAR(60) NOT NULL DEFAULT 'Olcum',
  serial_no VARCHAR(80),
  manufacturer VARCHAR(120),
  model_name VARCHAR(120),
  measurement_range VARCHAR(120),
  accuracy_class VARCHAR(60),
  location_code VARCHAR(60),
  responsible_user_id INT REFERENCES users(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Aktif',
  next_calibration_date DATE,
  calibration_interval_days INT DEFAULT 365,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, instrument_code)
);

CREATE TABLE IF NOT EXISTS qc_calibrations (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  instrument_id INT NOT NULL REFERENCES qc_instruments(id) ON DELETE CASCADE,
  calibration_no VARCHAR(40) NOT NULL,
  calibration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  performed_by VARCHAR(120),
  lab_name VARCHAR(160),
  certificate_no VARCHAR(80),
  result_status VARCHAR(40) NOT NULL DEFAULT 'Uygun',
  deviation_note TEXT,
  next_due_date DATE,
  cost_amount NUMERIC(18,2),
  currency_code VARCHAR(10) DEFAULT 'TRY',
  status VARCHAR(40) NOT NULL DEFAULT 'Tamamlandi',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, calibration_no)
);

CREATE INDEX IF NOT EXISTS idx_qc_instruments_company ON qc_instruments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_qc_calibrations_instrument ON qc_calibrations(instrument_id, calibration_date DESC);
