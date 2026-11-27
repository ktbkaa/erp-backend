-- 050: Giriş depo + Giriş/Çıkış kalite ayrımı + YarıMamul depo + giriş kontrol belgeleri

-- Depo rolleri genişlet
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS depolar_depo_rolu_check;
ALTER TABLE warehouses ADD CONSTRAINT warehouses_warehouse_rolu_check
  CHECK (warehouse_rolu IN ('Normal', 'Giris', 'GKK', 'CKK', 'Hammadde', 'Mamul', 'YariMamul', 'Bloke'));

-- Mevcut tek kalite deposunu Giriş Kalite (GKK) olarak netleştir
UPDATE warehouses
SET warehouse_name = CASE
      WHEN warehouse_code LIKE '%-KK' AND warehouse_rolu = 'GKK' THEN 'Giriş Kalite Depo'
      ELSE warehouse_name
    END,
    warehouse_rolu = 'GKK'
WHERE warehouse_rolu = 'GKK'
   OR (warehouse_code LIKE '%-KK' AND warehouse_rolu NOT IN ('CKK'));

-- Her tesis için Giriş / Çıkış Kalite / YarıMamul depo (yoksa oluştur)
INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, warehouse_rolu, is_active)
SELECT p.id,
       CASE
         WHEN p.plant_code ILIKE 'ELEK%' THEN 'ELEK-GIR'
         WHEN p.plant_code ILIKE 'TEKS%' THEN 'TEKS-GIR'
         WHEN p.plant_code ILIKE 'META%' THEN 'META-GIR'
         WHEN p.plant_code ILIKE 'GIDA%' THEN 'GIDA-GIR'
         ELSE LEFT(COALESCE(p.plant_code, 'P') || '-GIR', 20)
       END,
       'Giriş Depo',
       'Giris',
       TRUE
FROM plants p
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.plant_id = p.id AND w.warehouse_rolu = 'Giris'
);

INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, warehouse_rolu, is_active)
SELECT p.id,
       CASE
         WHEN p.plant_code ILIKE 'ELEK%' THEN 'ELEK-CKK'
         WHEN p.plant_code ILIKE 'TEKS%' THEN 'TEKS-CKK'
         WHEN p.plant_code ILIKE 'META%' THEN 'META-CKK'
         WHEN p.plant_code ILIKE 'GIDA%' THEN 'GIDA-CKK'
         ELSE LEFT(COALESCE(p.plant_code, 'P') || '-CKK', 20)
       END,
       'Çıkış Kalite Depo',
       'CKK',
       TRUE
FROM plants p
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.plant_id = p.id AND w.warehouse_rolu = 'CKK'
);

INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, warehouse_rolu, is_active)
SELECT p.id,
       CASE
         WHEN p.plant_code ILIKE 'ELEK%' THEN 'ELEK-YM'
         WHEN p.plant_code ILIKE 'TEKS%' THEN 'TEKS-YM'
         WHEN p.plant_code ILIKE 'META%' THEN 'META-YM'
         WHEN p.plant_code ILIKE 'GIDA%' THEN 'GIDA-YM'
         ELSE LEFT(COALESCE(p.plant_code, 'P') || '-YM', 20)
       END,
       'Yarı Mamul Depo',
       'YariMamul',
       TRUE
FROM plants p
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.plant_id = p.id AND w.warehouse_rolu = 'YariMamul'
);

-- Parametreler
INSERT INTO system_parameters (parametre_code, parametre_name, value, module, description)
VALUES
  ('GIRIS_DEPO_KODU', 'Varsayılan giriş depo kodu', 'ELEK-GIR', 'KALITE', 'Mal kabul sonrası ilk depo'),
  ('GKK_DEPO_KODU', 'Varsayılan giriş kalite depo', 'ELEK-KK', 'KALITE', 'Giriş kalite (GKK) deposu'),
  ('CKK_DEPO_KODU', 'Varsayılan çıkış kalite depo', 'ELEK-CKK', 'KALITE', 'Çıkış kalite (CKK) deposu'),
  ('HAMMADDE_DEPO_KODU', 'Varsayılan hammadde depo', 'ELEK-HMD', 'KALITE', 'GKK onay sonrası hedef'),
  ('MAMUL_DEPO_KODU', 'Varsayılan mamul depo', 'ELEK-MAM', 'KALITE', 'CKK onay sonrası mamul hedef'),
  ('YARIMAMUL_DEPO_KODU', 'Varsayılan yarı mamul depo', 'ELEK-YM', 'KALITE', 'CKK onay sonrası yarı mamul hedef')
ON CONFLICT (parametre_code) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  module = EXCLUDED.module;

-- Giriş kontrol belgeleri (mal kabul → miktar doğrulama → GKK)
CREATE TABLE IF NOT EXISTS incoming_inspections (
  id              SERIAL PRIMARY KEY,
  inspection_no   VARCHAR(50) NOT NULL UNIQUE,
  company_id      INTEGER REFERENCES companies(id),
  plant_id        INTEGER REFERENCES plants(id),
  purchase_order_id INTEGER REFERENCES purchase_orders(id),
  goods_receipt_id  INTEGER REFERENCES goods_receipts(id),
  source_warehouse_id INTEGER REFERENCES warehouses(id),
  target_warehouse_id INTEGER REFERENCES warehouses(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'Acik'
                  CHECK (status IN ('Acik', 'Onayli', 'Red', 'Iptal')),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  inspected_by    VARCHAR(80),
  approved_at     TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incoming_inspection_lines (
  id                 SERIAL PRIMARY KEY,
  inspection_id      INTEGER NOT NULL REFERENCES incoming_inspections(id) ON DELETE CASCADE,
  line_no            INTEGER NOT NULL DEFAULT 1,
  order_line_id      INTEGER REFERENCES purchase_order_lines(id),
  receipt_line_id    INTEGER REFERENCES goods_receipt_lines(id),
  item_id            INTEGER NOT NULL REFERENCES items(id),
  ordered_quantity   NUMERIC(18,4) NOT NULL DEFAULT 0,
  received_quantity  NUMERIC(18,4) NOT NULL DEFAULT 0,
  accepted_quantity  NUMERIC(18,4) NOT NULL DEFAULT 0,
  rejected_quantity  NUMERIC(18,4) NOT NULL DEFAULT 0,
  uom_code           VARCHAR(50),
  match_ok           BOOLEAN NOT NULL DEFAULT FALSE,
  item_code          VARCHAR(80),
  item_name          VARCHAR(200),
  description        TEXT,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incoming_insp_po ON incoming_inspections(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_incoming_insp_gr ON incoming_inspections(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_incoming_insp_status ON incoming_inspections(status);

INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES ('GIRIS_KONTROL', 'GK', 'Giriş kontrol belgesi', 0, 'giris-kontrolleri', 'Giriş Kontrolleri', TRUE)
ON CONFLICT (series_code) DO NOTHING;
