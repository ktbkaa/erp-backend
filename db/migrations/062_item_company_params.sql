-- Stok kartı: firmaya özgü parametreler (çoklu firma tik seçimi)
CREATE TABLE IF NOT EXISTS item_company_params (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sales_price NUMERIC(18, 6),
  purchase_uom VARCHAR(20),
  sales_uom VARCHAR(20),
  sa_tolerans_min_yuzde NUMERIC(8, 4),
  sa_tolerans_max_yuzde NUMERIC(8, 4),
  temin_suresi_days INTEGER,
  cikis_type VARCHAR(40),
  default_tax_code_id INTEGER REFERENCES fin_tax_codes(id) ON DELETE SET NULL,
  varsayilan_vat_rate NUMERIC(8, 4),
  safety_stock NUMERIC(18, 6),
  min_stock NUMERIC(18, 6),
  max_stock NUMERIC(18, 6),
  reorder_level NUMERIC(18, 6),
  fixed_order_quantity NUMERIC(18, 6),
  optimum_order_quantity NUMERIC(18, 6),
  varsayilan_giris_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
  varsayilan_cikis_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
  lot_politika VARCHAR(40),
  series_politika VARCHAR(40),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_item_company_params_company
  ON item_company_params (company_id);

CREATE INDEX IF NOT EXISTS idx_item_company_params_item
  ON item_company_params (item_id);

-- Mevcut stoklardan tek satırlık firma parametresi üret
INSERT INTO item_company_params (
  item_id, company_id, plant_id, is_active,
  sales_price, purchase_uom, sales_uom,
  sa_tolerans_min_yuzde, sa_tolerans_max_yuzde, temin_suresi_days, cikis_type,
  default_tax_code_id, varsayilan_vat_rate,
  safety_stock, min_stock, max_stock, reorder_level, fixed_order_quantity, optimum_order_quantity,
  varsayilan_giris_warehouse_id, varsayilan_cikis_warehouse_id,
  lot_politika, series_politika
)
SELECT
  s.id,
  s.company_id,
  (
    SELECT siy.plant_id
    FROM item_plants siy
    WHERE siy.item_id = s.id AND siy.is_active IS DISTINCT FROM FALSE
    ORDER BY siy.id
    LIMIT 1
  ),
  TRUE,
  s.sales_price, s.purchase_uom, s.sales_uom,
  s.sa_tolerans_min_yuzde, s.sa_tolerans_max_yuzde, s.temin_suresi_days, s.cikis_type,
  s.default_tax_code_id, s.varsayilan_vat_rate,
  s.safety_stock, s.min_stock, s.max_stock, s.reorder_level, s.fixed_order_quantity, s.optimum_order_quantity,
  s.varsayilan_giris_warehouse_id, s.varsayilan_cikis_warehouse_id,
  s.lot_politika, s.series_politika
FROM items s
WHERE s.company_id IS NOT NULL
ON CONFLICT (item_id, company_id) DO NOTHING;
