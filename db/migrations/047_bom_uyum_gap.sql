-- 047: Ürün ağacı — Uyum/Excel gap alanları (başlık + satır + alternatif malzemeler)
-- UI etiketleri Türkçe; fiziksel kolonlar İngilizce.

BEGIN;

-- ─── boms (başlık) ──────────────────────────────────────────────────────────
ALTER TABLE boms ADD COLUMN IF NOT EXISTS fg_warehouse_id INTEGER REFERENCES warehouses(id);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS alt_description VARCHAR(255);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS version_code VARCHAR(40);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS brand_code VARCHAR(80);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS attr3_code VARCHAR(80);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS wo_change_mode VARCHAR(40) NOT NULL DEFAULT 'Serbest';
ALTER TABLE boms ADD COLUMN IF NOT EXISTS lock_when_used_in_route BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS std_cost NUMERIC(18,6);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS precost_amount NUMERIC(18,6);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS precost_at TIMESTAMPTZ;

COMMENT ON COLUMN boms.fg_warehouse_id IS 'Mamulün gireceği depo';
COMMENT ON COLUMN boms.wo_change_mode IS 'Serbest | Yasak | Onayli';
COMMENT ON COLUMN boms.lock_when_used_in_route IS 'Rotada kullanılıyorsa yapı değişikliği engelle';

CREATE INDEX IF NOT EXISTS boms_fg_wh_idx ON boms (fg_warehouse_id);
CREATE INDEX IF NOT EXISTS boms_version_idx ON boms (version_code);

-- ─── bom_lines (satır) ──────────────────────────────────────────────────────
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS line_type VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS qty_entry_type VARCHAR(10) NOT NULL DEFAULT 'Net';
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS net_quantity NUMERIC(18,6);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS gross_quantity NUMERIC(18,6);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(id);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS operation_code VARCHAR(50);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS operation_name VARCHAR(255);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS operation_no VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS stop_explosion BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS no_consume_on_receipt BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS no_subcontract BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS byproduct_cost_ratio NUMERIC(8,4) NOT NULL DEFAULT 0;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS is_disassemble BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS disassemble_operation_code VARCHAR(50);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS disassemble_operation_name VARCHAR(255);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS disassemble_operation_no VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS position_no VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS drawing_no VARCHAR(80);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS line_revision VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS brand_code VARCHAR(80);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS attr3_code VARCHAR(80);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS delivery_control_code VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS packaging_dependent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS packaging_type_code VARCHAR(40);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS packaging_type_name VARCHAR(120);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS line_description_2 VARCHAR(255);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS std_cost NUMERIC(18,6);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS precost_amount NUMERIC(18,6);

COMMENT ON COLUMN bom_lines.qty_entry_type IS 'Net | Brut';
COMMENT ON COLUMN bom_lines.stop_explosion IS 'Patlatmayı bu seviyede durdur';
COMMENT ON COLUMN bom_lines.no_consume_on_receipt IS 'Üretim girişinde tüketilmesin';
COMMENT ON COLUMN bom_lines.no_subcontract IS 'Fasona gönderilemez';

-- Mevcut satırlar: net = quantity, brüt = quantity * (1+fire/100)
UPDATE bom_lines
SET net_quantity = quantity,
    gross_quantity = ROUND(quantity * (1 + COALESCE(scrap_pct, 0) / 100.0), 6)
WHERE net_quantity IS NULL;

CREATE INDEX IF NOT EXISTS bom_lines_warehouse_idx ON bom_lines (warehouse_id);
CREATE INDEX IF NOT EXISTS bom_lines_op_code_idx ON bom_lines (product_bom_id, operation_code);

-- ─── bom_line_alternatives (alternatif malzemeler) ──────────────────────────
CREATE TABLE IF NOT EXISTS bom_line_alternatives (
  id              SERIAL PRIMARY KEY,
  bom_line_id     INTEGER NOT NULL REFERENCES bom_lines(id) ON DELETE CASCADE,
  alt_item_id     INTEGER NOT NULL REFERENCES items(id),
  priority        INTEGER NOT NULL DEFAULT 10,
  quantity        NUMERIC(18,6),
  uom_code        VARCHAR(50),
  quality_code    VARCHAR(40),
  color_code      VARCHAR(40),
  packaging_type_code VARCHAR(40),
  notes           VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bom_line_alts_line_idx ON bom_line_alternatives (bom_line_id);
CREATE INDEX IF NOT EXISTS bom_line_alts_item_idx ON bom_line_alternatives (alt_item_id);

COMMIT;
