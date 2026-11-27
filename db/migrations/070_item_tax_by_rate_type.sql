-- Stok kartı: kur/fiyat tipine göre KDV tanımları (alış / satış / efektif)
CREATE TABLE IF NOT EXISTS item_tax_by_rate_type (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  rate_type VARCHAR(40) NOT NULL,
  tax_code_id INTEGER REFERENCES fin_tax_codes(id) ON DELETE SET NULL,
  vat_rate NUMERIC(8, 4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_item_tax_rate_type CHECK (
    rate_type IN ('Alış', 'Satış', 'Efektif alış', 'Efektif satış')
  ),
  UNIQUE (item_id, rate_type)
);

CREATE INDEX IF NOT EXISTS idx_item_tax_by_rate_type_item
  ON item_tax_by_rate_type (item_id);

CREATE INDEX IF NOT EXISTS idx_item_tax_by_rate_type_tax
  ON item_tax_by_rate_type (tax_code_id)
  WHERE tax_code_id IS NOT NULL;

COMMENT ON TABLE item_tax_by_rate_type IS
  'Stok kartı vergi satırları: Alış/Satış/Efektif alış/Efektif satış → KDV tanımı';

-- Mevcut varsayılan vergiyi «Satış» satırına taşı
INSERT INTO item_tax_by_rate_type (item_id, rate_type, tax_code_id, vat_rate, is_active)
SELECT s.id, 'Satış', s.default_tax_code_id, s.varsayilan_vat_rate, TRUE
FROM items s
WHERE s.default_tax_code_id IS NOT NULL OR s.varsayilan_vat_rate IS NOT NULL
ON CONFLICT (item_id, rate_type) DO NOTHING;
