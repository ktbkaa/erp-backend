-- P0 #7: Dövizli fatura / GL / cari — kur dönüşümü altyapısı
-- Kural: journal_entry_lines.debit/credit ve partner_ledger_entries.amount_try = TRY (ulusal para)
--        döviz tutarı: journal_entry_lines.debit_fc/credit_fc, partner_ledger_entries.amount (currency_code)
-- TRY faturalarda davranış değişmez (kur=1, fc alanları NULL).

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE NULL,
  ADD COLUMN IF NOT EXISTS net_amount_try NUMERIC(18,2) NULL,
  ADD COLUMN IF NOT EXISTS tax_amount_try NUMERIC(18,2) NULL,
  ADD COLUMN IF NOT EXISTS payable_amount_try NUMERIC(18,2) NULL;

COMMENT ON COLUMN invoices.exchange_rate_date IS 'Kurun alındığı tarih (TCMB bülteni / manuel kur tarihi)';
COMMENT ON COLUMN invoices.payable_amount_try IS 'Muhasebeleştirme anında hesaplanan TRY karşılığı (payable_amount × exchange_rate)';

ALTER TABLE journal_entry_lines
  ADD COLUMN IF NOT EXISTS debit_fc NUMERIC(18,2) NULL,
  ADD COLUMN IF NOT EXISTS credit_fc NUMERIC(18,2) NULL;

COMMENT ON COLUMN journal_entry_lines.debit_fc IS 'Döviz borç tutarı (currency_code cinsinden); TRY satırda NULL';
COMMENT ON COLUMN journal_entry_lines.credit_fc IS 'Döviz alacak tutarı (currency_code cinsinden); TRY satırda NULL';

ALTER TABLE partner_ledger_entries
  ADD COLUMN IF NOT EXISTS amount_try NUMERIC(18,2) NULL;

UPDATE partner_ledger_entries
   SET amount_try = ROUND(amount * COALESCE(NULLIF(exchange_rate, 0), 1), 2)
 WHERE amount_try IS NULL;

ALTER TABLE partner_ledger_entries
  DROP CONSTRAINT IF EXISTS partner_ledger_entries_amount_try_check;
ALTER TABLE partner_ledger_entries
  ADD CONSTRAINT partner_ledger_entries_amount_try_check CHECK (amount_try IS NULL OR amount_try >= 0);

COMMENT ON COLUMN partner_ledger_entries.amount IS 'Hareket tutarı — currency_code cinsinden (döviz)';
COMMENT ON COLUMN partner_ledger_entries.amount_try IS 'TRY karşılığı (amount × exchange_rate veya kur farkı satırında doğrudan TRY)';

CREATE TABLE IF NOT EXISTS exchange_difference_entries (
  id SERIAL PRIMARY KEY,
  company_id INT NULL REFERENCES companies(id),
  partner_id INT NOT NULL REFERENCES partners(id),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('Gerceklesen', 'Gerceklesmemis')),
  currency_code VARCHAR(10) NOT NULL,
  fc_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  book_rate NUMERIC(18,6) NULL,
  settle_rate NUMERIC(18,6) NOT NULL,
  difference_try NUMERIC(18,2) NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_id INT NULL REFERENCES invoices(id),
  source_document_type VARCHAR(40) NULL,
  source_document_id INT NULL,
  gl_document_id INT NULL REFERENCES journal_entries(id),
  ledger_entry_id INT NULL REFERENCES partner_ledger_entries(id),
  reversed_gl_document_id INT NULL REFERENCES journal_entries(id),
  reversed_ledger_entry_id INT NULL REFERENCES partner_ledger_entries(id),
  reversed_at TIMESTAMP NULL,
  description TEXT NULL,
  created_by VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exchange_difference_partner ON exchange_difference_entries (partner_id, rate_date);
CREATE INDEX IF NOT EXISTS idx_exchange_difference_company ON exchange_difference_entries (company_id, kind, rate_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_difference_realized_doc
  ON exchange_difference_entries (source_document_type, source_document_id, invoice_id)
  WHERE kind = 'Gerceklesen' AND source_document_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_difference_revaluation
  ON exchange_difference_entries (COALESCE(company_id, 0), partner_id, currency_code, rate_date)
  WHERE kind = 'Gerceklesmemis';

INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description)
SELECT 'KUR_FARKI_KAR_HESAP', 'Kur farkı geliri hesabı', '646.01.001', 'FIN',
       'Gerçekleşen/gerçekleşmemiş kur farkı geliri (kambiyo kârı)'
WHERE NOT EXISTS (SELECT 1 FROM system_parameters WHERE parameter_code = 'KUR_FARKI_KAR_HESAP');

INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description)
SELECT 'KUR_FARKI_ZARAR_HESAP', 'Kur farkı gideri hesabı', '656.01.001', 'FIN',
       'Gerçekleşen/gerçekleşmemiş kur farkı gideri (kambiyo zararı)'
WHERE NOT EXISTS (SELECT 1 FROM system_parameters WHERE parameter_code = 'KUR_FARKI_ZARAR_HESAP');
