-- Üretim emri bitiş alanı: tarih + saat (plan_start / plan_end zaten TIMESTAMP)
ALTER TABLE production_orders
  ALTER COLUMN end_date TYPE TIMESTAMP
  USING CASE
    WHEN end_date IS NULL THEN NULL
    ELSE end_date::timestamp
  END;
