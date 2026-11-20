-- MRP parametre setleri: konsoldan bağımsız kaydedilebilir şablonlar
CREATE TABLE IF NOT EXISTS mrp_parameter_sets (
  id BIGSERIAL PRIMARY KEY,
  parameter_code VARCHAR(64) NOT NULL,
  description TEXT,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  plant_id INT REFERENCES plants(id) ON DELETE SET NULL,
  parameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mrp_parameter_sets_code_uq UNIQUE (parameter_code)
);

CREATE INDEX IF NOT EXISTS idx_mrp_parameter_sets_active
  ON mrp_parameter_sets (is_active, parameter_code);

-- Çalışmaya hangi parametre setinin uygulandığını izle
ALTER TABLE mrp_runs
  ADD COLUMN IF NOT EXISTS parameter_set_id BIGINT REFERENCES mrp_parameter_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mrp_runs_parameter_set
  ON mrp_runs (parameter_set_id);

INSERT INTO number_series (series_code, prefix, description, last_number, screen_code, screen_name, is_active)
VALUES ('MRP_PARAM', 'MP', 'MRP Parametre Seti', 0, 'mrp-parametre', 'MRP Parametreleri', TRUE)
ON CONFLICT (series_code) DO NOTHING;

-- Varsayılan aktif set (yoksa)
INSERT INTO mrp_parameter_sets (
  parameter_code, description, parameters_json, start_date, end_date, notes, is_active
)
SELECT
  'MRP-STD',
  'Standart MRP parametreleri',
  jsonb_build_object(
    'parameter_code', 'MRP-STD',
    'consider_po', true,
    'open_po_as_on_hand', true,
    'open_wo_as_on_hand', true,
    'negative_stock_as_zero', true,
    'supply_in_period_as_available', true,
    'ignore_safety_when_no_demand', true,
    'so_forecast_mode', 'sales_orders',
    'wo_program_mode', 'isemri'
  ),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  'Sistem varsayılanı',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM mrp_parameter_sets WHERE parameter_code = 'MRP-STD'
);
