-- 091 Go-live sertleştirme: auth varsayılan, banka mutabakat, stok→GL / 3-way / GİB parametreleri

-- ─── Auth: prod varsayılan zorunlu ───────────────────────────────────────────
UPDATE system_parameters
SET value = 'Evet',
    description = COALESCE(description, '') || ' [091] Varsayılan Evet. Yerel soft: ERP_AUTH_SOFT=1 veya value=Hayir.'
WHERE parameter_code = 'AUTH_ZORUNLU';

INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description)
VALUES
  ('STOK_MUHASEBE', 'Stok hareketinden muhasebe fişi', 'Hayir', 'FIN',
   'Evet ise stok giriş/çıkışında maliyet×miktar ile stok/COGS fişi (hesap belirleme STOK_HAREKET).'),
  ('ALIS_3WAY_ZORUNLU', 'Alış fatura 3-way zorunlu', 'Evet', 'FIN',
   'Evet ise alış muhasebeleştirmede invoice_matches.result=Uyumlu gerekir (?force=1 ile aşılabilir).'),
  ('GIB_CANLI', 'GİB canlı gönderim', 'Hayir', 'SYS',
   'Evet + provider_code olmadan canlı Gonderildi yazılmaz. Varsayılan simülasyon.')
ON CONFLICT (parameter_code) DO NOTHING;

-- Hesap belirleme: stok hareketi
INSERT INTO account_determination_rules
  (rule_code, document_type, debit_account_code, credit_account_code, description, is_active)
SELECT 'STOK_HAREKET_TR', 'STOK_HAREKET', '150', '600', 'Stok giriş (150) / çıkış COGS (600) şablonu', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM account_determination_rules WHERE document_type = 'STOK_HAREKET'
);

-- ─── Banka ekstresi / mutabakat ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_statements (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  bank_account_id INT REFERENCES fin_bank_accounts(id),
  statement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_no VARCHAR(80),
  opening_balance NUMERIC(18,4) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(18,4),
  currency_code VARCHAR(10) DEFAULT 'TRY',
  status VARCHAR(30) NOT NULL DEFAULT 'Taslak',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id SERIAL PRIMARY KEY,
  statement_id INT NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 1,
  value_date DATE,
  amount NUMERIC(18,4) NOT NULL,
  direction SMALLINT NOT NULL DEFAULT 1,
  counterparty_name VARCHAR(200),
  description TEXT,
  external_ref VARCHAR(120),
  matched_cash_movement_id INT,
  match_status VARCHAR(30) NOT NULL DEFAULT 'Acik',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_stmt_company ON bank_statements (company_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_stmt ON bank_statement_lines (statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_lines_match ON bank_statement_lines (match_status)
  WHERE match_status = 'Acik';

COMMENT ON TABLE bank_statements IS '091: Banka ekstresi başlığı — mutabakat';
COMMENT ON TABLE bank_statement_lines IS '091: Ekstre satırları; nakit hareketleri ile eşleştirilir';
