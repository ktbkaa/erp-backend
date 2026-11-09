-- Stok kartı: varsayılan vergi kodu + depo bağları zaten item_warehouses'ta
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS default_tax_code_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_default_tax_code_id_fkey'
  ) THEN
    ALTER TABLE items
      ADD CONSTRAINT items_default_tax_code_id_fkey
      FOREIGN KEY (default_tax_code_id) REFERENCES fin_tax_codes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_default_tax_code_id
  ON items (default_tax_code_id)
  WHERE default_tax_code_id IS NOT NULL;

-- Mevcut oranlardan mümkünse KDV koduna eşle (TR, aynı oran)
UPDATE items s
SET default_tax_code_id = sub.id
FROM (
  SELECT DISTINCT ON (vo.rate)
    vk.id,
    vo.rate
  FROM fin_tax_codes vk
  JOIN fin_tax_rates vo ON vo.tax_code_id = vk.id
  WHERE vk.country_code = 'TR'
    AND COALESCE(vk.tax_type, 'KDV') = 'KDV'
    AND vk.is_active IS DISTINCT FROM FALSE
    AND vo.valid_from <= CURRENT_DATE
    AND (vo.valid_to IS NULL OR vo.valid_to >= CURRENT_DATE)
  ORDER BY vo.rate, vk.id
) sub
WHERE s.default_tax_code_id IS NULL
  AND s.varsayilan_vat_rate IS NOT NULL
  AND s.varsayilan_vat_rate = sub.rate;
