-- Satış teklifi: satır KDV durumu + başlık firma bağlamı
ALTER TABLE sales_quotation_lines
  ADD COLUMN IF NOT EXISTS vat_mode VARCHAR(20) DEFAULT 'Haric';

ALTER TABLE sales_quotation_lines
  ADD COLUMN IF NOT EXISTS discount_rate_2 NUMERIC(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_rate_3 NUMERIC(8,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_tutari2 NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_tutari3 NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_ex_tax NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS amount_ttc NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS line_type VARCHAR(8) DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8),
  ADD COLUMN IF NOT EXISTS warehouse_id INTEGER,
  ADD COLUMN IF NOT EXISTS project_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS region VARCHAR(64);

-- Eski kayıtlarda company_id boşsa müşteri firmasından / tek firmadan doldur
UPDATE sales_quotations t
SET company_id = c.company_id
FROM partners c
WHERE t.company_id IS NULL
  AND c.id = t.partner_id
  AND c.company_id IS NOT NULL;
