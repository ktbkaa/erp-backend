-- Stok kartı: aynı firma altında birden fazla iş yeri parametre satırı
-- UNIQUE(item_id, company_id) → plant bazlı tekillik

ALTER TABLE item_company_params
  DROP CONSTRAINT IF EXISTS item_company_params_item_id_company_id_key;

-- Eski ad (bazı ortamlarda)
ALTER TABLE item_company_params
  DROP CONSTRAINT IF EXISTS item_company_params_item_id_firma_id_key;

-- plant_id dolu satırlar: (item, firma, iş yeri) tekil
CREATE UNIQUE INDEX IF NOT EXISTS uq_item_company_params_item_firma_plant
  ON item_company_params (item_id, company_id, plant_id)
  WHERE plant_id IS NOT NULL;

-- plant_id henüz seçilmemiş taslak: firma başına en fazla bir satır
CREATE UNIQUE INDEX IF NOT EXISTS uq_item_company_params_item_firma_draft
  ON item_company_params (item_id, company_id)
  WHERE plant_id IS NULL;

COMMENT ON TABLE item_company_params IS
  'Stok × firma × iş yeri parametreleri; bir stok birden fazla firma/iş yerine bağlanabilir.';
