-- 033: Profesyonel süreç omurgası (Canias tarzı soft-delete, belge ref, açık miktar, üretim plan)
-- Yalnızca ADD COLUMN / CREATE IF NOT EXISTS — veri silinmez.

-- ========== 1) Soft-delete: silindi ==========
ALTER TABLE stoklar
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cariler
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE satin_alma_talepleri
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE satin_alma_siparisleri
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE siparisler
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE satis_teklifleri
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE irsaliyeler
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE faturalar
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE uretim_emirleri
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE urun_agaclari
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rotalar
  ADD COLUMN IF NOT EXISTS silindi BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_stoklar_silindi ON stoklar(silindi);
CREATE INDEX IF NOT EXISTS idx_cariler_silindi ON cariler(silindi);
CREATE INDEX IF NOT EXISTS idx_sat_talep_silindi ON satin_alma_talepleri(silindi);
CREATE INDEX IF NOT EXISTS idx_sas_silindi ON satin_alma_siparisleri(silindi);
CREATE INDEX IF NOT EXISTS idx_siparisler_silindi ON siparisler(silindi);
CREATE INDEX IF NOT EXISTS idx_satis_teklif_silindi ON satis_teklifleri(silindi);
CREATE INDEX IF NOT EXISTS idx_irsaliyeler_silindi ON irsaliyeler(silindi);
CREATE INDEX IF NOT EXISTS idx_faturalar_silindi ON faturalar(silindi);
CREATE INDEX IF NOT EXISTS idx_ue_silindi ON uretim_emirleri(silindi);
CREATE INDEX IF NOT EXISTS idx_urun_agaclari_silindi ON urun_agaclari(silindi);
CREATE INDEX IF NOT EXISTS idx_rotalar_silindi ON rotalar(silindi);

-- ========== 2) Belge referansları (eksik olanlar) ==========
-- 014/021: satış + satınalma sipariş / mal kabul zaten var; talep başlığı eksik
ALTER TABLE satin_alma_talepleri
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

-- Güvence: satış/satınalma belgelerinde REFDOC (IF NOT EXISTS)
ALTER TABLE satis_teklifleri
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;
ALTER TABLE siparisler
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;
ALTER TABLE irsaliyeler
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;
ALTER TABLE faturalar
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;
ALTER TABLE satin_alma_siparisleri
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;
ALTER TABLE uretim_emirleri
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

CREATE INDEX IF NOT EXISTS idx_sat_talep_kaynak ON satin_alma_talepleri(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_sas_kaynak ON satin_alma_siparisleri(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_satis_teklif_kaynak ON satis_teklifleri(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_siparis_kaynak ON siparisler(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_irsaliye_kaynak ON irsaliyeler(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_fatura_kaynak ON faturalar(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_ue_kaynak ON uretim_emirleri(kaynak_belge_tipi, kaynak_belge_id);

-- ========== 3) Satınalma sipariş satırı — açık miktar (sevk/fatura) ==========
-- giren_miktar (005), kabul_edilen_miktar + fatura_edilen_miktar (021) — güvence
ALTER TABLE satin_alma_siparis_satirlari
  ADD COLUMN IF NOT EXISTS giren_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kabul_edilen_miktar NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fatura_edilen_miktar NUMERIC(18,4) DEFAULT 0;

-- ========== 4) Satış sipariş satırı — açık miktar / rezerv ==========
-- 014/020/021 güvence
ALTER TABLE siparis_detaylari
  ADD COLUMN IF NOT EXISTS sevk_edilen_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fatura_edilen_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rezerve_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bekleyen_miktar NUMERIC(18,4);

-- ========== 5) Stok — çıkış tipi ==========
ALTER TABLE stoklar
  ADD COLUMN IF NOT EXISTS cikis_tipi VARCHAR(40) NOT NULL DEFAULT 'Manuel';

COMMENT ON COLUMN stoklar.cikis_tipi IS 'OtomatikEmis | Manuel | PartiDagitim';

-- ========== 6) Üretim emirleri — başlat / giriş-çıkış tipi ==========
ALTER TABLE uretim_emirleri
  ADD COLUMN IF NOT EXISTS baslatildi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cikis_tipi VARCHAR(40) NOT NULL DEFAULT 'Manuel',
  ADD COLUMN IF NOT EXISTS giris_tipi VARCHAR(40) NOT NULL DEFAULT 'Manuel';

COMMENT ON COLUMN uretim_emirleri.cikis_tipi IS 'Hammadde çıkış: OtomatikEmis | Manuel | PartiDagitim';
COMMENT ON COLUMN uretim_emirleri.giris_tipi IS 'Mamul giriş: OtomatikEmis | Manuel | PartiDagitim';

-- ========== 7) Üretim planları (MRP → plan) ==========
CREATE TABLE IF NOT EXISTS uretim_planlari (
    id SERIAL PRIMARY KEY,
    plan_no VARCHAR(50) UNIQUE NOT NULL,
    firma_id INT REFERENCES firmalar(id),
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(18,4) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(30),
    planlanan_baslangic DATE,
    teslim_tarihi DATE,
    baslatildi BOOLEAN NOT NULL DEFAULT FALSE,
    sabit BOOLEAN NOT NULL DEFAULT FALSE,
    durum VARCHAR(30) NOT NULL DEFAULT 'Acik',
    malzeme BOOLEAN NOT NULL DEFAULT FALSE,
    mrp_sonuc_id INT REFERENCES mrp_sonuclar(id) ON DELETE SET NULL,
    uretim_emri_id INT REFERENCES uretim_emirleri(id) ON DELETE SET NULL,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_up_durum CHECK (durum IN ('Acik', 'Baslatildi', 'Kapali', 'Iptal'))
);

COMMENT ON COLUMN uretim_planlari.malzeme IS 'MRP malzeme önerisinden türetildi';
CREATE INDEX IF NOT EXISTS idx_up_firma ON uretim_planlari(firma_id);
CREATE INDEX IF NOT EXISTS idx_up_stok ON uretim_planlari(stok_id);
CREATE INDEX IF NOT EXISTS idx_up_durum ON uretim_planlari(durum);

-- onek UNIQUE: 'UP' çakışma riski → 'UPL'
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES ('URETIM_PLAN', 'UPL', 'Üretim planı', 0, 'uretim-planlari', 'Üretim Planları', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi,
    aktif = TRUE;

-- ========== 8) Muhasebeleşti bayrağı ==========
ALTER TABLE faturalar
  ADD COLUMN IF NOT EXISTS muhasebelesti BOOLEAN NOT NULL DEFAULT FALSE;

-- Alış faturası da faturalar.fatura_tipi üzerinden; ayrıca muhasebe belgeleri
ALTER TABLE muhasebe_belgeleri
  ADD COLUMN IF NOT EXISTS muhasebelesti BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_faturalar_muhasebe ON faturalar(muhasebelesti);
