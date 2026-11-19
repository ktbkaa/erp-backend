-- 092 P2 derinleştirme: bütçe iskeleti, bakım (CMMS hafif), amortisman log

-- ─── Şirket bütçesi (GL) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gl_budgets (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  budget_code VARCHAR(40) NOT NULL,
  budget_name VARCHAR(200) NOT NULL,
  fiscal_year INT NOT NULL,
  currency_code VARCHAR(10) DEFAULT 'TRY',
  status VARCHAR(30) NOT NULL DEFAULT 'Taslak',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, budget_code)
);

CREATE TABLE IF NOT EXISTS gl_budget_lines (
  id SERIAL PRIMARY KEY,
  budget_id INT NOT NULL REFERENCES gl_budgets(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 1,
  account_id INT REFERENCES gl_accounts(id),
  account_code VARCHAR(40),
  period_no INT, -- 1..12; null = yıllık
  budget_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gl_budgets_company ON gl_budgets (company_id);
CREATE INDEX IF NOT EXISTS idx_gl_budget_lines_budget ON gl_budget_lines (budget_id);

-- ─── Sabit kıymet amortisman log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixed_asset_depreciation_runs (
  id SERIAL PRIMARY KEY,
  asset_id INT NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  company_id INT REFERENCES companies(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_year INT,
  period_month INT,
  amount NUMERIC(18,4) NOT NULL,
  book_value_after NUMERIC(18,4),
  gl_document_id INT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fa_depr_asset ON fixed_asset_depreciation_runs (asset_id);

-- ─── CMMS hafif: bakım emirleri ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_orders (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  plant_id INT REFERENCES plants(id),
  order_no VARCHAR(40) NOT NULL,
  order_type VARCHAR(40) NOT NULL DEFAULT 'Ariza', -- Ariza | Periyodik | Prediktif
  status VARCHAR(30) NOT NULL DEFAULT 'Acik',
  work_center_id INT REFERENCES work_centers(id),
  equipment_code VARCHAR(80),
  equipment_name VARCHAR(200),
  priority VARCHAR(20) DEFAULT 'Normal',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  description TEXT,
  resolution_notes TEXT,
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_mnt_orders_company ON maintenance_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_mnt_orders_status ON maintenance_orders (status);

INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description)
VALUES
  ('CRP_OP_TIME', 'İş merkezi yükünde rota süresi kullan', 'Evet', 'URETIM',
   'Evet ise iş merkezi yükü routing_operations.op_time/setup_time kullanır; yoksa 0.1 saat/birim.')
ON CONFLICT (parameter_code) DO NOTHING;
