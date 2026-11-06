-- İlçe kodları: şehir_kodu + ilçe adındaki ünsüz harfler
-- Bağımsız İlçe Tanımı ekranı kaldırıldı; ilçeler şehir kartı altında yönetilir.

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
        WHEN 'ç' THEN 'Ç' WHEN 'Ç' THEN 'Ç'
        WHEN 'ğ' THEN 'Ğ' WHEN 'Ğ' THEN 'Ğ'
        WHEN 'ş' THEN 'Ş' WHEN 'Ş' THEN 'Ş'
        WHEN 'ö' THEN 'Ö' WHEN 'Ö' THEN 'Ö'
        WHEN 'ü' THEN 'Ü' WHEN 'Ü' THEN 'Ü'
        WHEN 'i' THEN 'İ' WHEN 'İ' THEN 'İ'
        WHEN 'ı' THEN 'I' WHEN 'I' THEN 'I'
        ELSE upper(ch)
      END;
      cons := cons || up;
    END IF;
  END LOOP;
  RETURN coalesce(nullif(trim(p_city_code), ''), '') || cons;
END;
$$;

-- Çakışmasız güncelleme: önce geçici kod, sonra nihai
ALTER TABLE districts ADD COLUMN IF NOT EXISTS _tmp_new_code VARCHAR(60);

UPDATE districts d
SET _tmp_new_code = erp_district_code(d.city_code, d.district_name);

-- Aynı hedef koda düşenlerde id soneki
UPDATE districts d
SET _tmp_new_code = d._tmp_new_code || d.id::text
WHERE d.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY _tmp_new_code ORDER BY id) AS rn
    FROM districts
    WHERE _tmp_new_code IS NOT NULL AND _tmp_new_code <> ''
  ) x
  WHERE rn > 1
);

-- Unique ihlali olmaması için iki adım
UPDATE districts SET district_code = 'TMP-' || id::text;
UPDATE districts SET district_code = _tmp_new_code WHERE _tmp_new_code IS NOT NULL AND _tmp_new_code <> '';
ALTER TABLE districts DROP COLUMN IF EXISTS _tmp_new_code;

-- Eski ILCE numaratörünü pasifleştir / ekran bağını şehir kartına çek
UPDATE number_series
SET is_active = FALSE,
    screen_code = 'sehir-tanimi',
    screen_name = 'Şehir / İl Tanımı (ilçe alt liste)'
WHERE series_code = 'ILCE';
