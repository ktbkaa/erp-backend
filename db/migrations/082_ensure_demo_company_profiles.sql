-- Demo firma profilleri (idempotent). Veri silmez; yoksa ekler.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_profile BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE companies
SET is_profile = TRUE
WHERE (
    UPPER(company_code) IN ('GIDA', 'DOKUM', 'ELEK', 'TEKS', 'META', 'KILIF', 'MOBIL')
    OR company_code ILIKE 'FRM%'
  )
  AND is_profile IS DISTINCT FROM TRUE;

INSERT INTO companies (company_code, company_name, address, email, is_profile)
SELECT v.code, v.name, v.city || ' OSB', 'info@' || lower(v.code) || '.local', TRUE
FROM (VALUES
  ('GIDA',  'Anadolu Süt ve Süt Ürünleri A.Ş.', 'Konya'),
  ('DOKUM', 'Anadolu Döküm Sanayi A.Ş.', 'Kayseri'),
  ('ELEK',  'Kompanzasyon Röle Elektronik A.Ş.', 'İstanbul'),
  ('TEKS',  'Denim Tekstil Üretim A.Ş.', 'Gaziantep'),
  ('META',  'Oto Kapı Metal Sanayi A.Ş.', 'Bursa'),
  ('KILIF', 'CaseForm Silikon & Plastik Kılıf A.Ş.', 'İstanbul'),
  ('MOBIL', 'Mobilite Tekerlekli Sandalye A.Ş.', 'Ankara')
) AS v(code, name, city)
WHERE NOT EXISTS (
  SELECT 1 FROM companies c WHERE UPPER(c.company_code) = UPPER(v.code)
);

-- Her demo firma için merkez iş yeri (yoksa)
INSERT INTO plants (company_id, plant_code, plant_name, address)
SELECT c.id, c.company_code || '-MR', c.company_code || ' Merkez', COALESCE(c.address, '')
FROM companies c
WHERE UPPER(c.company_code) IN ('GIDA', 'DOKUM', 'ELEK', 'TEKS', 'META', 'KILIF', 'MOBIL')
  AND NOT EXISTS (
    SELECT 1 FROM plants p WHERE p.company_id = c.id
  );

-- Aktif kullanıcılara tüm profil firmaları
INSERT INTO user_company_permissions (user_id, company_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN companies c
WHERE COALESCE(u.is_active, TRUE) = TRUE
  AND COALESCE(c.is_profile, FALSE) = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM user_company_permissions p
    WHERE p.user_id = u.id AND p.company_id = c.id
  );
