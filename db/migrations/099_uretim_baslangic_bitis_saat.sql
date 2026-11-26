-- Üretim modülü başlangıç / bitiş alanları: tarih + saat birlikte
ALTER TABLE boms
  ALTER COLUMN valid_from TYPE TIMESTAMP USING valid_from::timestamp,
  ALTER COLUMN valid_to TYPE TIMESTAMP USING valid_to::timestamp;

ALTER TABLE bom_lines
  ALTER COLUMN valid_from TYPE TIMESTAMP USING valid_from::timestamp,
  ALTER COLUMN valid_to TYPE TIMESTAMP USING valid_to::timestamp;

ALTER TABLE routings
  ALTER COLUMN valid_from TYPE TIMESTAMP USING valid_from::timestamp,
  ALTER COLUMN valid_to TYPE TIMESTAMP USING valid_to::timestamp;

ALTER TABLE subcontract_prices
  ALTER COLUMN valid_from TYPE TIMESTAMP USING valid_from::timestamp,
  ALTER COLUMN valid_to TYPE TIMESTAMP USING valid_to::timestamp;

ALTER TABLE production_plans
  ALTER COLUMN planned_start TYPE TIMESTAMP USING planned_start::timestamp;
