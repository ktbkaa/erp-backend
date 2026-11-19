-- 090 Fason Yönetimi — emanet stok, sipariş, sevk, tüketim, teslimat, maliyet
-- Mevcut WO/rota fason bayraklarını süreçle bağlar; mükerrer cari kart oluşturmaz.

-- ─── Cari: fasoncu rolü (aynı kart) ─────────────────────────────────────────
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS is_subcontractor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subcontract_capacity_daily NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS subcontract_lead_days INT,
  ADD COLUMN IF NOT EXISTS subcontract_min_qty NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS subcontract_pricing_method VARCHAR(40),
  ADD COLUMN IF NOT EXISTS subcontract_quality_score NUMERIC(8,2);

CREATE INDEX IF NOT EXISTS idx_partners_is_subcontractor
  ON partners (is_subcontractor) WHERE is_subcontractor = TRUE;

-- ─── Depo rolü: FasonEmanet ─────────────────────────────────────────────────
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_warehouse_role_check;
ALTER TABLE warehouses ADD CONSTRAINT warehouses_warehouse_role_check CHECK (
  warehouse_role::text = ANY (ARRAY[
    'Normal','Giris','GKK','CKK','Hammadde','Mamul','YariMamul','Bloke','FasonEmanet'
  ]::text[])
);

ALTER TABLE warehouses
  ADD COLUMN IF NOT EXISTS partner_id INT REFERENCES partners(id);

CREATE INDEX IF NOT EXISTS idx_warehouses_partner_fason
  ON warehouses (partner_id) WHERE partner_id IS NOT NULL;

-- ─── WO operasyon: fason alanları ───────────────────────────────────────────
ALTER TABLE production_order_operations
  ADD COLUMN IF NOT EXISTS is_subcontract BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subcontractor_partner_id INT REFERENCES partners(id),
  ADD COLUMN IF NOT EXISTS subcontract_status VARCHAR(40) NOT NULL DEFAULT 'Yok',
  ADD COLUMN IF NOT EXISTS qty_sent NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_received NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_accepted NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_rejected NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_scrap NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_unit_price NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10);

-- Routing ops: fiyat / varsayılan fasoncu
ALTER TABLE routing_operations
  ADD COLUMN IF NOT EXISTS default_subcontractor_partner_id INT REFERENCES partners(id),
  ADD COLUMN IF NOT EXISTS subcontract_unit_price NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS subcontract_currency_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS subcontract_lead_days INT;

-- ─── Parametreler (şirket) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_parameters (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  ship_warehouse_id INT REFERENCES warehouses(id),
  default_scrap_tolerance_pct NUMERIC(8,4) NOT NULL DEFAULT 2,
  max_scrap_pct NUMERIC(8,4) NOT NULL DEFAULT 5,
  allow_partial_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  allow_over_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  over_receipt_tolerance_pct NUMERIC(8,4) NOT NULL DEFAULT 0,
  under_delivery_tolerance_pct NUMERIC(8,4) NOT NULL DEFAULT 0,
  qc_required BOOLEAN NOT NULL DEFAULT TRUE,
  order_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  price_approval_limit NUMERIC(18,4),
  auto_create_po BOOLEAN NOT NULL DEFAULT FALSE,
  auto_create_op_demand BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

-- ─── Operasyon kataloğu ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_operation_defs (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  operation_code VARCHAR(40) NOT NULL,
  operation_name VARCHAR(200) NOT NULL,
  description TEXT,
  uom_code VARCHAR(20),
  std_time_hours NUMERIC(18,4),
  pricing_method VARCHAR(40) NOT NULL DEFAULT 'Adet',
  qc_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, operation_code)
);

CREATE TABLE IF NOT EXISTS subcontract_operation_partners (
  id SERIAL PRIMARY KEY,
  operation_def_id INT NOT NULL REFERENCES subcontract_operation_defs(id) ON DELETE CASCADE,
  partner_id INT NOT NULL REFERENCES partners(id),
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (operation_def_id, partner_id)
);

-- ─── Fiyat tarifesi ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_prices (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  partner_id INT NOT NULL REFERENCES partners(id),
  operation_def_id INT REFERENCES subcontract_operation_defs(id),
  item_id INT REFERENCES items(id),
  pricing_method VARCHAR(40) NOT NULL DEFAULT 'Adet',
  unit_price NUMERIC(18,6) NOT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'TRY',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  min_qty NUMERIC(18,4),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcontract_prices_lookup
  ON subcontract_prices (partner_id, operation_def_id, item_id, valid_from);

-- ─── Fason sipariş ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_orders (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  plant_id INT REFERENCES plants(id),
  order_no VARCHAR(40) NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id INT NOT NULL REFERENCES partners(id),
  production_order_id INT REFERENCES production_orders(id),
  route_id INT REFERENCES routings(id),
  order_mode VARCHAR(20) NOT NULL DEFAULT 'Operasyon', -- Operasyon | Komple
  status VARCHAR(40) NOT NULL DEFAULT 'Taslak',
  planned_delivery_date DATE,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'TRY',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  description TEXT,
  estimated_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  invoiced_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  purchase_order_id INT REFERENCES purchase_orders(id),
  created_by VARCHAR(80),
  updated_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_no)
);

CREATE INDEX IF NOT EXISTS idx_subcontract_orders_partner ON subcontract_orders (partner_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_orders_wo ON subcontract_orders (production_order_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_orders_company ON subcontract_orders (company_id);

CREATE TABLE IF NOT EXISTS subcontract_order_lines (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES subcontract_orders(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 10,
  production_order_id INT REFERENCES production_orders(id),
  production_order_operation_id INT REFERENCES production_order_operations(id),
  operation_def_id INT REFERENCES subcontract_operation_defs(id),
  item_id INT REFERENCES items(id),
  operation_code VARCHAR(40),
  operation_name VARCHAR(200),
  uom_code VARCHAR(20),
  ordered_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  sent_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  consumed_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  scrap_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  returned_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  accepted_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18,6) NOT NULL DEFAULT 0,
  line_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  UNIQUE (order_id, line_no)
);

-- ─── Sevkiyat (malzeme → emanet; tüketim değil) ──────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_shipments (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  shipment_no VARCHAR(40) NOT NULL,
  shipment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id INT NOT NULL REFERENCES partners(id),
  order_id INT NOT NULL REFERENCES subcontract_orders(id),
  production_order_id INT REFERENCES production_orders(id),
  from_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  to_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  stock_movement_id INT REFERENCES stock_movements(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Tamamlandi',
  description TEXT,
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shipment_no)
);

CREATE TABLE IF NOT EXISTS subcontract_shipment_lines (
  id SERIAL PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES subcontract_shipments(id) ON DELETE CASCADE,
  order_line_id INT REFERENCES subcontract_order_lines(id),
  item_id INT NOT NULL REFERENCES items(id),
  lot_id INT REFERENCES item_lots(id),
  quantity NUMERIC(18,4) NOT NULL,
  uom_code VARCHAR(20),
  notes TEXT
);

-- ─── Tüketim / fire bildirimi ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_consumptions (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  consumption_no VARCHAR(40) NOT NULL,
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id INT NOT NULL REFERENCES partners(id),
  order_id INT NOT NULL REFERENCES subcontract_orders(id),
  production_order_id INT REFERENCES production_orders(id),
  emanet_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  stock_movement_id INT REFERENCES stock_movements(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Tamamlandi',
  description TEXT,
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (consumption_no)
);

CREATE TABLE IF NOT EXISTS subcontract_consumption_lines (
  id SERIAL PRIMARY KEY,
  consumption_id INT NOT NULL REFERENCES subcontract_consumptions(id) ON DELETE CASCADE,
  order_line_id INT REFERENCES subcontract_order_lines(id),
  item_id INT NOT NULL REFERENCES items(id),
  lot_id INT REFERENCES item_lots(id),
  consumed_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  scrap_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  scrap_reason VARCHAR(200),
  uom_code VARCHAR(20),
  notes TEXT
);

-- ─── Malzeme iadesi (emanet → şirket) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_returns (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  return_no VARCHAR(40) NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id INT NOT NULL REFERENCES partners(id),
  order_id INT REFERENCES subcontract_orders(id),
  production_order_id INT REFERENCES production_orders(id),
  from_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  to_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  stock_movement_id INT REFERENCES stock_movements(id),
  qc_required BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(40) NOT NULL DEFAULT 'Tamamlandi',
  reason VARCHAR(200),
  description TEXT,
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (return_no)
);

CREATE TABLE IF NOT EXISTS subcontract_return_lines (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL REFERENCES subcontract_returns(id) ON DELETE CASCADE,
  order_line_id INT REFERENCES subcontract_order_lines(id),
  item_id INT NOT NULL REFERENCES items(id),
  lot_id INT REFERENCES item_lots(id),
  quantity NUMERIC(18,4) NOT NULL,
  uom_code VARCHAR(20),
  stock_status VARCHAR(40) NOT NULL DEFAULT 'Kullanilabilir',
  notes TEXT
);

-- ─── Ürün / yarı mamul teslimatı ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_receipts (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  receipt_no VARCHAR(40) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  partner_id INT NOT NULL REFERENCES partners(id),
  order_id INT NOT NULL REFERENCES subcontract_orders(id),
  production_order_id INT REFERENCES production_orders(id),
  to_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  stock_movement_id INT REFERENCES stock_movements(id),
  qc_order_id INT,
  status VARCHAR(40) NOT NULL DEFAULT 'TeslimAlindi',
  description TEXT,
  created_by VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (receipt_no)
);

CREATE TABLE IF NOT EXISTS subcontract_receipt_lines (
  id SERIAL PRIMARY KEY,
  receipt_id INT NOT NULL REFERENCES subcontract_receipts(id) ON DELETE CASCADE,
  order_line_id INT REFERENCES subcontract_order_lines(id),
  production_order_operation_id INT REFERENCES production_order_operations(id),
  item_id INT NOT NULL REFERENCES items(id),
  lot_id INT REFERENCES item_lots(id),
  received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  accepted_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
  uom_code VARCHAR(20),
  unit_price NUMERIC(18,6),
  notes TEXT
);

-- ─── Maliyet kayıtları (tahmini ≠ gerçekleşen) ─────────────────────────────
CREATE TABLE IF NOT EXISTS subcontract_cost_entries (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  order_id INT REFERENCES subcontract_orders(id),
  order_line_id INT REFERENCES subcontract_order_lines(id),
  production_order_id INT REFERENCES production_orders(id),
  production_order_operation_id INT REFERENCES production_order_operations(id),
  cost_type VARCHAR(40) NOT NULL, -- Tahmini | Gerceklesen | Fatura | Nakliye | Fire
  amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'TRY',
  quantity NUMERIC(18,4),
  unit_price NUMERIC(18,6),
  invoice_id INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcontract_cost_wo ON subcontract_cost_entries (production_order_id);

-- ─── Hareket kodları ────────────────────────────────────────────────────────
INSERT INTO movement_codes (
  movement_code, movement_name, document_type, direction, affects_stock,
  partner_required, warehouse_required, create_incoming_qc_order, create_outgoing_qc_order, is_active
)
SELECT v.movement_code, v.movement_name, v.document_type, v.direction, TRUE,
       TRUE, TRUE, v.gkk, FALSE, TRUE
FROM (VALUES
  ('FAS-SEVK', 'Fasona Malzeme Sevki', 'FasonSevk', 'Transfer', FALSE),
  ('FAS-TUKET', 'Fason Malzeme Tüketimi', 'FasonTuketim', 'Cikis', FALSE),
  ('FAS-IADE', 'Fason Malzeme İadesi', 'FasonIade', 'Transfer', FALSE),
  ('FAS-TESLIM', 'Fason Ürün Teslimatı', 'FasonTeslimat', 'Giris', TRUE)
) AS v(movement_code, movement_name, document_type, direction, gkk)
WHERE NOT EXISTS (
  SELECT 1 FROM movement_codes m WHERE m.movement_code = v.movement_code
);

-- ─── Numaratörler ───────────────────────────────────────────────────────────
INSERT INTO number_series (series_code, prefix, description, screen_name, last_number, is_active)
SELECT v.series_code, v.prefix, v.description, v.screen_name, 0, TRUE
FROM (VALUES
  ('FASON_SIPARIS', 'FSO', 'Fason Sipariş', 'fason-siparisleri'),
  ('FASON_SEVK', 'FSV', 'Fason Sevkiyat', 'fason-sevkiyatlar'),
  ('FASON_TUKET', 'FTK', 'Fason Tüketim', 'fason-tuketimler'),
  ('FASON_IADE', 'FIA', 'Fason İade', 'fason-iadeler'),
  ('FASON_TESLIM', 'FTS', 'Fason Teslimat', 'fason-teslimatlar')
) AS v(series_code, prefix, description, screen_name)
WHERE NOT EXISTS (SELECT 1 FROM number_series n WHERE n.series_code = v.series_code);

-- Üretim emri tipi: Fason
INSERT INTO production_order_types (type_code, type_name, planned_firm, is_active)
SELECT 'FAS', 'Fason Üretim', 'Kesin', TRUE
WHERE NOT EXISTS (SELECT 1 FROM production_order_types t WHERE t.type_code = 'FAS');

-- Belge tipi
INSERT INTO document_types (document_type_code, document_type_name, module, is_active)
SELECT v.c, v.n, 'FASON', TRUE
FROM (VALUES
  ('FasonSiparis', 'Fason Siparişi'),
  ('FasonSevk', 'Fason Sevkiyat'),
  ('FasonTuketim', 'Fason Tüketim'),
  ('FasonIade', 'Fason İade'),
  ('FasonTeslimat', 'Fason Teslimat')
) AS v(c, n)
WHERE NOT EXISTS (SELECT 1 FROM document_types d WHERE d.document_type_code = v.c);

-- Onay kullanımı: route_id zorunlu olduğu için seed atlanır; ekrandan tanımlanır.
