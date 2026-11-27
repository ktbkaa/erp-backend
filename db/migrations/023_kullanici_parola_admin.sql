-- Kullanıcı adı (giriş) + ADMIN tam yetki
-- parola_hash zaten 019'da; UI/API üzerinden atanacak.

ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS kullanici_adi VARCHAR(80);

-- Giriş adı boşsa kullanıcı kodundan doldur
UPDATE kisiler
SET kullanici_adi = kullanici_kodu
WHERE kullanici_adi IS NULL AND kullanici_kodu IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kisiler_kullanici_adi
  ON kisiler (kullanici_adi) WHERE kullanici_adi IS NOT NULL;

-- ADMIN grubu: tüm onay / kalite / modül / depo yetkileri
INSERT INTO kullanici_gruplari (
  grup_kodu, grup_adi, aciklama, aktif,
  satinalma_onay, satinalma_talep, kalite_kontrol,
  modul_yetkileri, depo_yetkileri
) VALUES (
  'ADMIN', 'Yöneticiler', 'Tam yetkili sistem yöneticisi', TRUE,
  TRUE, TRUE, TRUE,
  '["*"]', '["*"]'
)
ON CONFLICT (grup_kodu) DO UPDATE SET
  grup_adi = EXCLUDED.grup_adi,
  aciklama = EXCLUDED.aciklama,
  aktif = TRUE,
  satinalma_onay = TRUE,
  satinalma_talep = TRUE,
  kalite_kontrol = TRUE,
  modul_yetkileri = '["*"]',
  depo_yetkileri = '["*"]';
