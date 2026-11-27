-- 046: BOMT01 (Canias) ürün ağacı alan seti — başlık + satır zenginleştirme
-- UI etiketleri Türkçe kalır; fiziksel kolonlar İngilizce.

BEGIN;

-- ─── boms (ürün ağacı başlık) ───────────────────────────────────────────────
ALTER TABLE boms ADD COLUMN IF NOT EXISTS plant_id INTEGER REFERENCES plants(id);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'Standart';
ALTER TABLE boms ADD COLUMN IF NOT EXISTS alt_no VARCHAR(10) NOT NULL DEFAULT '00';
ALTER TABLE boms ADD COLUMN IF NOT EXISTS bom_type VARCHAR(20) NOT NULL DEFAULT 'Uretim';
ALTER TABLE boms ADD COLUMN IF NOT EXISTS design_department VARCHAR(40) NOT NULL DEFAULT 'Standart';
ALTER TABLE boms ADD COLUMN IF NOT EXISTS bom_status VARCHAR(40) NOT NULL DEFAULT 'Aktif';
ALTER TABLE boms ADD COLUMN IF NOT EXISTS uom_code VARCHAR(20);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS element_interval INTEGER NOT NULL DEFAULT 10;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS proportional_qty NUMERIC(18,6) NOT NULL DEFAULT 1;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS drawing_no VARCHAR(80);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS revision VARCHAR(40);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS customer_partner_id INTEGER REFERENCES partners(id);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS is_cad BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS is_default_for_wo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS is_disassembly BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE boms ADD COLUMN IF NOT EXISTS created_by VARCHAR(80);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS updated_by VARCHAR(80);
ALTER TABLE boms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Mevcut silindi / is_active kolonları kullanılsın
UPDATE boms SET category = 'Standart' WHERE category IS NULL OR category = '';
UPDATE boms SET alt_no = '00' WHERE alt_no IS NULL OR alt_no = '';
UPDATE boms SET bom_type = 'Uretim' WHERE bom_type IS NULL OR bom_type = '';
UPDATE boms SET design_department = 'Standart' WHERE design_department IS NULL OR design_department = '';
UPDATE boms SET bom_status = 'Aktif' WHERE bom_status IS NULL OR bom_status = '';

-- Aynı mamul + tesis + alt no tekil (aktif kayıtlarda)
CREATE UNIQUE INDEX IF NOT EXISTS boms_fg_plant_alt_uidx
  ON boms (finished_good_item_id, COALESCE(plant_id, 0), alt_no)
  WHERE COALESCE(silindi, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS boms_category_idx ON boms (category);
CREATE INDEX IF NOT EXISTS boms_plant_idx ON boms (plant_id);
CREATE INDEX IF NOT EXISTS boms_alt_no_idx ON boms (alt_no);
CREATE INDEX IF NOT EXISTS boms_status_idx ON boms (bom_status);
CREATE INDEX IF NOT EXISTS boms_default_wo_idx ON boms (finished_good_item_id, is_default_for_wo)
  WHERE is_default_for_wo = TRUE;

-- ─── bom_lines (eleman satırları) ───────────────────────────────────────────
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS component_type VARCHAR(20) NOT NULL DEFAULT 'Stok';
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS component_alt_no VARCHAR(10) DEFAULT '00';
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS line_description VARCHAR(255);
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS scrap_pct NUMERIC(8,4) NOT NULL DEFAULT 0;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS operation_seq INTEGER;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS is_fixed_qty BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS goes_to_wo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS is_phantom BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS is_byproduct BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS valid_to DATE;

CREATE INDEX IF NOT EXISTS bom_lines_component_idx ON bom_lines (component_item_id);
CREATE INDEX IF NOT EXISTS bom_lines_op_seq_idx ON bom_lines (product_bom_id, operation_seq);

-- Mamul birimini stok kartından doldur (boş olanlar)
UPDATE boms ua
SET uom_code = s.uom_code
FROM items s
WHERE s.id = ua.finished_good_item_id
  AND (ua.uom_code IS NULL OR ua.uom_code = '');

COMMIT;
