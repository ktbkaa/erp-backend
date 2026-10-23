-- 034: Üretim planı numaratörü (033 INSERT onek çakışmasında kaçmış olabilir)
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES ('URETIM_PLAN', 'UPL', 'Üretim planı', 0, 'uretim-planlari', 'Üretim Planları', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
  ekran_kodu = EXCLUDED.ekran_kodu,
  ekran_adi = EXCLUDED.ekran_adi,
  aktif = TRUE;
