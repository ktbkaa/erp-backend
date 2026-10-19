-- Çok firmalı demo: stok sahipliği + izolasyon indeksleri
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
CREATE INDEX IF NOT EXISTS idx_stoklar_firma ON stoklar(firma_id);

ALTER TABLE urun_agaclari ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
CREATE INDEX IF NOT EXISTS idx_urun_agaclari_firma ON urun_agaclari(firma_id);

ALTER TABLE rotalar ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
CREATE INDEX IF NOT EXISTS idx_rotalar_firma ON rotalar(firma_id);

ALTER TABLE sevk_emirleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
CREATE INDEX IF NOT EXISTS idx_sevk_emirleri_firma ON sevk_emirleri(firma_id);

ALTER TABLE satis_teklifleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
CREATE INDEX IF NOT EXISTS idx_satis_teklifleri_firma ON satis_teklifleri(firma_id);

ALTER TABLE satin_alma_talepleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE satin_alma_teklif_istekleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE satin_alma_teklifleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE satin_alma_anlasmalari ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

ALTER TABLE uretim_emirleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
CREATE INDEX IF NOT EXISTS idx_uretim_emirleri_firma ON uretim_emirleri(firma_id);

ALTER TABLE stok_partileri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE kk_emirleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE kk_uygunsuzluklar ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE kk_capa ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

ALTER TABLE crm_adaylar ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE crm_kontaklar ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE crm_firsatlar ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE crm_faaliyetler ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE crm_faaliyet_planlari ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE crm_gorevler ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

ALTER TABLE fiyat_listeleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE muhasebe_belgeleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

-- Mevcut stokları iş yeri bağından firma_id doldur (tek firma dönemi)
UPDATE stoklar s
SET firma_id = sub.firma_id
FROM (
  SELECT siy.stok_id, MIN(iy.firma_id) AS firma_id
  FROM stok_is_yeri siy
  JOIN is_yerleri iy ON iy.id = siy.is_yeri_id
  GROUP BY siy.stok_id
) sub
WHERE s.id = sub.stok_id AND s.firma_id IS NULL;

COMMENT ON COLUMN stoklar.firma_id IS 'Stok kartının sahibi firma (çok firmalı izolasyon)';
