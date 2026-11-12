-- Demo firma kodlarını profil seçicide görünür tut (veri silmez).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_profile BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE companies
SET is_profile = TRUE
WHERE UPPER(company_code) IN ('KILIF', 'MOBIL', 'GIDA', 'DOKUM', 'ELEK', 'TEKS', 'META')
  AND is_profile IS DISTINCT FROM TRUE;
