-- 048: Rota (routing) Uyum gap — başlık + operasyon süreleri/bayraklar + istasyon + ekipman

BEGIN;

-- ─── work_stations (iş istasyonu) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_stations (
  id              SERIAL PRIMARY KEY,
  work_center_id  INTEGER NOT NULL REFERENCES work_centers(id) ON DELETE CASCADE,
  station_code    VARCHAR(50) NOT NULL,
  station_name    VARCHAR(255) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_center_id, station_code)
);
CREATE INDEX IF NOT EXISTS work_stations_center_idx ON work_stations (work_center_id);

-- ─── routings (başlık) ──────────────────────────────────────────────────────
ALTER TABLE routings ADD COLUMN IF NOT EXISTS plant_id INTEGER REFERENCES plants(id);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS route_type VARCHAR(20) NOT NULL DEFAULT 'Uretim';
ALTER TABLE routings ADD COLUMN IF NOT EXISTS alt_no VARCHAR(10) NOT NULL DEFAULT '00';
ALTER TABLE routings ADD COLUMN IF NOT EXISTS alt_description VARCHAR(255);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS min_quantity NUMERIC(18,6) NOT NULL DEFAULT 0;
ALTER TABLE routings ADD COLUMN IF NOT EXISTS max_quantity NUMERIC(18,6) NOT NULL DEFAULT 999999999;
ALTER TABLE routings ADD COLUMN IF NOT EXISTS revision VARCHAR(40);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS brand_code VARCHAR(80);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS attr3_code VARCHAR(80);
ALTER TABLE routings ADD COLUMN IF NOT EXISTS wo_change_mode VARCHAR(40) NOT NULL DEFAULT 'Serbest';
ALTER TABLE routings ADD COLUMN IF NOT EXISTS is_reverse BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE routings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS routings_plant_idx ON routings (plant_id);
CREATE INDEX IF NOT EXISTS routings_type_idx ON routings (route_type);
CREATE INDEX IF NOT EXISTS routings_alt_idx ON routings (item_id, alt_no);

-- ─── routing_operations (operasyon) ─────────────────────────────────────────
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS description VARCHAR(255);
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS work_station_id INTEGER REFERENCES work_stations(id);
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS op_time NUMERIC(18,4) NOT NULL DEFAULT 0;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS op_time_uom VARCHAR(10) NOT NULL DEFAULT 'dk';
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS wait_time NUMERIC(18,4) NOT NULL DEFAULT 0;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS wait_time_uom VARCHAR(10) NOT NULL DEFAULT 'dk';
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS setup_time NUMERIC(18,4) NOT NULL DEFAULT 0;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS setup_time_uom VARCHAR(10) NOT NULL DEFAULT 'dk';
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS unload_time NUMERIC(18,4) NOT NULL DEFAULT 0;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS unload_time_uom VARCHAR(10) NOT NULL DEFAULT 'dk';
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS include_precost BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS include_std_cost BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS include_actual_cost BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS cost_factor_1 NUMERIC(12,6) NOT NULL DEFAULT 1;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS cost_factor_2 NUMERIC(12,6) NOT NULL DEFAULT 1;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS is_disassemble BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS is_subcontract BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS is_shared_op BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS require_qc BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS require_spc BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS note1 VARCHAR(255);
ALTER TABLE routing_operations ADD COLUMN IF NOT EXISTS note2 VARCHAR(255);

-- Mevcut sure_dk → op_time
UPDATE routing_operations
SET op_time = COALESCE(sure_dk, 0)
WHERE COALESCE(op_time, 0) = 0 AND COALESCE(sure_dk, 0) <> 0;

CREATE INDEX IF NOT EXISTS routing_ops_station_idx ON routing_operations (work_station_id);

-- ─── routing_operation_equipment (ekipman) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS routing_operation_equipment (
  id                SERIAL PRIMARY KEY,
  operation_id      INTEGER NOT NULL REFERENCES routing_operations(id) ON DELETE CASCADE,
  line_no           INTEGER NOT NULL DEFAULT 10,
  equipment_code    VARCHAR(50) NOT NULL,
  equipment_name    VARCHAR(255),
  cavity_count      NUMERIC(12,3) NOT NULL DEFAULT 0,
  used_cavity_count NUMERIC(12,3) NOT NULL DEFAULT 0,
  notes             VARCHAR(255),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS routing_op_equip_op_idx ON routing_operation_equipment (operation_id);

-- Numaratör: iş istasyonu
INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES ('IS_ISTASYONU', 'WS', 'İş istasyonu', 0, 'is-istasyonlari', 'İş İstasyonları', TRUE)
ON CONFLICT (series_code) DO NOTHING;

COMMIT;
