-- Firma bazlı üretim parametreleri (fazla/eksik üretim toleransı vb.)
CREATE TABLE IF NOT EXISTS production_parameters (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plant_id INTEGER NULL REFERENCES plants(id) ON DELETE CASCADE,
  allow_over_production BOOLEAN NOT NULL DEFAULT FALSE,
  over_production_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  allow_under_production BOOLEAN NOT NULL DEFAULT TRUE,
  under_production_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  enforce_op_sequence BOOLEAN NOT NULL DEFAULT TRUE,
  require_material_consume BOOLEAN NOT NULL DEFAULT TRUE,
  auto_close_on_complete BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT production_parameters_over_pct_chk
    CHECK (over_production_pct >= 0 AND over_production_pct <= 1000),
  CONSTRAINT production_parameters_under_pct_chk
    CHECK (under_production_pct >= 0 AND under_production_pct <= 100)
);

-- Firma geneli (plant_id NULL) tek kayıt
CREATE UNIQUE INDEX IF NOT EXISTS production_parameters_company_default_uq
  ON production_parameters (company_id)
  WHERE plant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS production_parameters_company_plant_uq
  ON production_parameters (company_id, plant_id)
  WHERE plant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS production_parameters_company_idx
  ON production_parameters (company_id);

-- Mevcut firmalar için varsayılan: fazla üretime izin yok
INSERT INTO production_parameters (company_id, allow_over_production, over_production_pct)
SELECT c.id, FALSE, 0
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM production_parameters p
  WHERE p.company_id = c.id AND p.plant_id IS NULL
);
