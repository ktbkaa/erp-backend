-- Cari kart: kategori tipleri, 30 kategori + 30 ek alan, firma param zenginleştirme

CREATE TABLE IF NOT EXISTS category_types (
  type_code VARCHAR(40) PRIMARY KEY,
  type_name VARCHAR(120) NOT NULL,
  applies_to VARCHAR(30) NOT NULL DEFAULT 'Genel',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_category_types_applies CHECK (
    applies_to IN ('Genel', 'Stok', 'Cari', 'Hepsi')
  )
);

INSERT INTO category_types (type_code, type_name, applies_to, description) VALUES
  ('ABC', 'ABC', 'Stok', 'Stok ABC sınıflandırma'),
  ('Marka', 'Marka', 'Stok', 'Stok marka'),
  ('TeminSekli', 'Temin şekli', 'Stok', 'Temin şekli'),
  ('Sektor', 'Sektör', 'Cari', 'Cari sektör'),
  ('Bolge', 'Bölge', 'Cari', 'Cari bölge'),
  ('Cari', 'Cari kategori', 'Cari', 'Cari kart kategori slotları')
ON CONFLICT (type_code) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  applies_to = EXCLUDED.applies_to,
  is_active = TRUE;

-- categories: Cari tipine izin ver
ALTER TABLE categories DROP CONSTRAINT IF EXISTS chk_kategori_tipi;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS chk_category_type;
ALTER TABLE categories
  ADD CONSTRAINT chk_category_type CHECK (
    category_type IN ('ABC', 'Marka', 'TeminSekli', 'Sektor', 'Bolge', 'Cari')
  );

-- Örnek cari kategorileri (slot seçimleri için)
INSERT INTO categories (category_code, category_name, category_type, description)
VALUES
  ('CRI-A', 'A sınıfı cari', 'Cari', 'Cari kategori'),
  ('CRI-B', 'B sınıfı cari', 'Cari', 'Cari kategori'),
  ('CRI-C', 'C sınıfı cari', 'Cari', 'Cari kategori'),
  ('CRI-YERLI', 'Yerli', 'Cari', 'Cari kategori'),
  ('CRI-ITHAL', 'İthal', 'Cari', 'Cari kategori')
ON CONFLICT (category_code) DO NOTHING;

-- Cari kart: 30 kategori + 30 ek alan (JSON slot map)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS category_slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN partners.category_slots IS
  'Cari kategori slotları: {"category_01":"CRI-A", ... "category_30":"..."}';
COMMENT ON COLUMN partners.extra_fields IS
  'Cari ek alanlar: {"ek_alan_01":"...", ... "ek_alan_30":"..."}';

-- Firma parametreleri: stok tarzı aktif bayrak
ALTER TABLE partner_company_params
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_due_days INTEGER,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(18,2);

CREATE INDEX IF NOT EXISTS idx_partner_company_params_active
  ON partner_company_params (partner_id) WHERE is_active;

-- Numaratörler
INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES
  ('KATEGORI_TIPI', 'KTP', 'Kategori tipi', 0, 'kategori-tip-tanimi', 'Kategori Tip Tanımı', TRUE)
ON CONFLICT (series_code) DO NOTHING;
