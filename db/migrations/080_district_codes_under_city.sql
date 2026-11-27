-- District codes: city_code + consonants of the district name (TR).
-- Districts are managed as a sub-list of the city card; the standalone
-- district screen and its ILCE number series are retired.

CREATE OR REPLACE FUNCTION erp_district_code(p_city_code text, p_district_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  vowels constant text := 'aeıioöuüâêîôûAEIİOÖUÜÂÊÎÔÛ';
  src text := coalesce(p_district_name, '');
  ch text;
  up text;
  cons text := '';
  i int;
BEGIN
  FOR i IN 1..char_length(src) LOOP
    ch := substr(src, i, 1);
    IF ch ~ '[A-Za-zÇĞİÖŞÜçğıöşü]' AND position(ch IN vowels) = 0 THEN
      up := CASE ch
        WHEN 'ç' THEN 'Ç' WHEN 'ğ' THEN 'Ğ' WHEN 'ş' THEN 'Ş'
        WHEN 'ö' THEN 'Ö' WHEN 'ü' THEN 'Ü'
        WHEN 'i' THEN 'İ' WHEN 'ı' THEN 'I'
        ELSE upper(ch)
      END;
      cons := cons || up;
    END IF;
  END LOOP;
  RETURN coalesce(nullif(trim(p_city_code), ''), '') || cons;
END;
$$;

-- Recode only legacy codes ("34-KAD", "DE-BE-MI", "IC0001"); codes already
-- in the new format or typed by the user are left alone.
ALTER TABLE districts ADD COLUMN IF NOT EXISTS _tmp_new_code VARCHAR(60);

UPDATE districts d
SET _tmp_new_code = erp_district_code(d.city_code, d.district_name)
WHERE d.city_code IS NOT NULL
  AND (d.district_code LIKE d.city_code || '-%' OR d.district_code ~ '^IC[0-9]+$')
  AND d.district_code IS DISTINCT FROM erp_district_code(d.city_code, d.district_name);

UPDATE districts d
SET _tmp_new_code = d._tmp_new_code || d.id::text
WHERE d._tmp_new_code IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM districts o
      WHERE o.id <> d.id AND o._tmp_new_code IS NULL
        AND lower(o.district_code) = lower(d._tmp_new_code)
    )
    OR d.id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(_tmp_new_code) ORDER BY id) AS rn
        FROM districts WHERE _tmp_new_code IS NOT NULL
      ) x WHERE rn > 1
    )
  );

UPDATE districts SET district_code = 'TMP-' || id::text WHERE _tmp_new_code IS NOT NULL;
UPDATE districts SET district_code = _tmp_new_code WHERE _tmp_new_code IS NOT NULL;
ALTER TABLE districts DROP COLUMN IF EXISTS _tmp_new_code;

UPDATE number_series
SET is_active = FALSE,
    screen_code = 'sehir-tanimi',
    screen_name = 'Şehir / İl Tanımı (ilçe alt liste)'
WHERE series_code = 'ILCE';

-- Renaming a city code on the city card carries its districts along.
ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_city_code_fkey;
ALTER TABLE districts
  ADD CONSTRAINT districts_city_code_fkey
  FOREIGN KEY (city_code) REFERENCES cities(city_code) ON UPDATE CASCADE;
