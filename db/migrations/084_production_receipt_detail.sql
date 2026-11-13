-- Operasyonel / hızlı üretim girişi: başlık alanları + kullanılan malzemeler

ALTER TABLE production_receipts
  ADD COLUMN IF NOT EXISTS plant_id INTEGER REFERENCES plants(id),
  ADD COLUMN IF NOT EXISTS operation_id INTEGER REFERENCES production_order_operations(id),
  ADD COLUMN IF NOT EXISTS work_center_id INTEGER,
  ADD COLUMN IF NOT EXISTS actual_work_center_id INTEGER,
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(40) DEFAULT 'Operasyonel',
  ADD COLUMN IF NOT EXISTS consume_materials BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS net_quantity NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS gross_quantity NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS scrap_quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rework_quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS serial_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS shift_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS product_warehouse_id INTEGER REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS material_warehouse_id INTEGER REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS wip_warehouse_id INTEGER REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS scrap_warehouse_id INTEGER REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS byproduct_warehouse_id INTEGER REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

CREATE TABLE IF NOT EXISTS production_receipt_materials (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER NOT NULL REFERENCES production_receipts(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL DEFAULT 1,
  line_type VARCHAR(40) DEFAULT 'Hammadde',
  item_id INTEGER REFERENCES items(id),
  item_code VARCHAR(40),
  item_name VARCHAR(160),
  alternative_no VARCHAR(20),
  quantity_type VARCHAR(40) DEFAULT 'Net',
  unit_quantity NUMERIC(18,6),
  quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  scrap_quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  rework_quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  gross_quantity NUMERIC(18,6),
  net_quantity NUMERIC(18,6),
  uom_code VARCHAR(20),
  warehouse_id INTEGER REFERENCES warehouses(id),
  warehouse_code VARCHAR(40),
  warehouse_name VARCHAR(120),
  warehouse_balance NUMERIC(18,6),
  lot_no VARCHAR(80),
  note TEXT,
  revision VARCHAR(40),
  brand VARCHAR(80),
  feature_3 VARCHAR(80),
  general_feature_1 VARCHAR(80),
  entry_mode VARCHAR(40),
  source_ref VARCHAR(80),
  source_material_id INTEGER,
  is_byproduct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_production_receipt_materials_receipt
  ON production_receipt_materials(receipt_id);

CREATE INDEX IF NOT EXISTS idx_production_receipts_order
  ON production_receipts(order_id);
