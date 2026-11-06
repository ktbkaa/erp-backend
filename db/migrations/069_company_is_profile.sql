-- Firma kartında "Profil" tiki: işaretli firmalar üst bar Firma Profil Alanı'nda görünür.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_profile BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN companies.is_profile IS
  'TRUE ise üst bardaki Firma Profil Alanı seçicisinde listelenir.';

-- Mevcut demo / örnek firmaları profil olarak aç (geriye dönük UX)
UPDATE companies
SET is_profile = TRUE
WHERE company_code IN ('KILIF', 'MOBIL', 'GIDA', 'DOKUM', 'ELEK')
  AND is_profile IS DISTINCT FROM TRUE;
