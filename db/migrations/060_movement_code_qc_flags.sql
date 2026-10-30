-- 060: Hareket kodunda giriş/çıkış kalite emri bayrakları
ALTER TABLE movement_codes
  ADD COLUMN IF NOT EXISTS gkk_emri_olussun BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ckk_emri_olussun BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN movement_codes.gkk_emri_olussun IS 'Stok hareketinde Giriş Kalite (GKK) emri oluştur';
COMMENT ON COLUMN movement_codes.ckk_emri_olussun IS 'Stok hareketinde Çıkış Kalite (CKK) emri oluştur';
