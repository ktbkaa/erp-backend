-- Geri al: bitiş alanını DATE'e düşür (saat bilgisi kaybolur)
ALTER TABLE production_orders
  ALTER COLUMN end_date TYPE DATE
  USING CASE
    WHEN end_date IS NULL THEN NULL
    ELSE end_date::date
  END;
