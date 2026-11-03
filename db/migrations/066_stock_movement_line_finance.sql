-- Stok hareket satırları: birim fiyat, para birimi, kur tipi, parti no, KDV
ALTER TABLE stock_movement_lines
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS rate_type VARCHAR(30) DEFAULT 'TCMB-ALIS',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lot_no VARCHAR(80);

COMMENT ON COLUMN stock_movement_lines.unit_price IS 'Birim fiyat (belge PB)';
COMMENT ON COLUMN stock_movement_lines.currency_code IS 'Satır para birimi';
COMMENT ON COLUMN stock_movement_lines.rate_type IS 'Kur tipi (TCMB-ALIS vb.)';
COMMENT ON COLUMN stock_movement_lines.lot_no IS 'Parti no (görüntü / çözümleme)';

-- Belge başlığı finansal özet
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS goods_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(18,2) DEFAULT 0;

COMMENT ON COLUMN stock_movements.goods_amount IS 'Mal tutarı (satır toplamı)';
COMMENT ON COLUMN stock_movements.tax_amount IS 'Toplam KDV';
COMMENT ON COLUMN stock_movements.grand_total IS 'Genel toplam';
