-- Birim dönüşümü: kaynak_katsayi × birim_kodu = katsayi × cevrilecek_birim
ALTER TABLE stok_birim_tanimlari
  ADD COLUMN IF NOT EXISTS kaynak_katsayi NUMERIC(18, 6) NOT NULL DEFAULT 1;

UPDATE stok_birim_tanimlari
SET kaynak_katsayi = 1
WHERE kaynak_katsayi IS NULL OR kaynak_katsayi <= 0;

COMMENT ON COLUMN stok_birim_tanimlari.kaynak_katsayi IS
  'kaynak_katsayi × birim_kodu = katsayi × cevrilecek_birim (sol taraf miktarı)';
COMMENT ON COLUMN stok_birim_tanimlari.katsayi IS
  'kaynak_katsayi × birim_kodu = katsayi × cevrilecek_birim (sağ taraf miktarı)';
