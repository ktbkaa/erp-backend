-- İş emri formu 1. dalga: tarih/birim/flag alanları + malzeme sıra no

ALTER TABLE uretim_emirleri
  ADD COLUMN IF NOT EXISTS emir_tarihi DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS plan_baslangic TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS plan_bitis TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS bitis_tarihi DATE NULL,
  ADD COLUMN IF NOT EXISTS birim VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS acik_kapali VARCHAR(20) NOT NULL DEFAULT 'Acik',
  ADD COLUMN IF NOT EXISTS onayli BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS yayinlandi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS yazdirildi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urun_girisi_tamamlandi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aciklama TEXT NULL;

UPDATE uretim_emirleri
SET emir_tarihi = COALESCE(emir_tarihi, baslangic_tarihi, CURRENT_DATE)
WHERE emir_tarihi IS NULL;

UPDATE uretim_emirleri
SET acik_kapali = CASE
  WHEN durum IN ('Kapali', 'Iptal') THEN 'Kapali'
  ELSE 'Acik'
END
WHERE acik_kapali IS NULL OR acik_kapali = '';

ALTER TABLE uretim_emirleri DROP CONSTRAINT IF EXISTS chk_ue_acik_kapali;
ALTER TABLE uretim_emirleri
  ADD CONSTRAINT chk_ue_acik_kapali CHECK (acik_kapali IN ('Acik', 'Kapali'));

ALTER TABLE uretim_emri_bilesenleri
  ADD COLUMN IF NOT EXISTS sira_no INT NULL,
  ADD COLUMN IF NOT EXISTS depo_id INT NULL REFERENCES depolar(id);

COMMENT ON COLUMN uretim_emirleri.acik_kapali IS 'İş emri açık/kapalı bayrağı (süreç durumundan ayrı)';
COMMENT ON COLUMN uretim_emirleri.onayli IS 'Onaylanmış iş emri bayrağı';
COMMENT ON COLUMN uretim_emirleri.yayinlandi IS 'Yayınlanmış iş emri bayrağı';
