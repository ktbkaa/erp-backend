-- Stok firma parametreleri: satınalma / satış para birimi
ALTER TABLE item_company_params
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS purchase_currency_code VARCHAR(10);

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS purchase_currency_code VARCHAR(10);

COMMENT ON COLUMN item_company_params.currency_code IS 'Satış para birimi (satış fiyatı)';
COMMENT ON COLUMN item_company_params.purchase_currency_code IS 'Satınalma para birimi';
