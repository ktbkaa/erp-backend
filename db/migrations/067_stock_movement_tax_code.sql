-- Stok hareket satırı: vergi tanımı (KDV) seçimi
ALTER TABLE stock_movement_lines
  ADD COLUMN IF NOT EXISTS tax_code_id INT REFERENCES fin_tax_codes(id) ON DELETE SET NULL;

COMMENT ON COLUMN stock_movement_lines.tax_code_id IS 'Vergi tanımı (finans vergi kodları); vat_rate senkron';
