-- 032: Profesyonel stok + satınalma talep/sipariş süreç alanları
-- Kaynak analizi: Kitap1KTBSTOK + SA satır Excel (Canias/Uyumsoft export)
-- Faz-1 kesintisi yok: vergi / çoklu iskonto / tedarikçi stok / kur tipi süreçte yer alır.

-- ========== STOK KARTI ==========
ALTER TABLE stoklar
  ADD COLUMN IF NOT EXISTS satin_birimi VARCHAR(20),
  ADD COLUMN IF NOT EXISTS satis_birimi VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gtip_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS uretici_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS eski_stok_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS orijinal_kod VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sa_tolerans_min_yuzde NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sa_tolerans_max_yuzde NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS varsayilan_kdv_oran NUMERIC(8,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS minimum_stok NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optimum_siparis_miktari NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS net_agirlik NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS brut_agirlik NUMERIC(18,4);

COMMENT ON COLUMN stoklar.sa_tolerans_max_yuzde IS 'Satınalma kabul toleransı üst % (Excel tolerance_max_po)';
COMMENT ON COLUMN stoklar.gtip_kodu IS 'Gümrük tarife / CCCN';

-- ========== SATINALMA TALEP BAŞLIK ==========
ALTER TABLE satin_alma_talepleri
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS bolge VARCHAR(80),
  ADD COLUMN IF NOT EXISTS hedef_teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kur_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS not_internal TEXT;

-- ========== SATINALMA TALEP SATIR ==========
ALTER TABLE satin_alma_talep_satirlari
  ADD COLUMN IF NOT EXISTS sira_no INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS satir_tipi VARCHAR(10) DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS bolge VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tahmini_birim_fiyat NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10),
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS kur_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kdv_oran NUMERIC(8,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS kdv_durumu VARCHAR(20) DEFAULT 'Haric',
  ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tedarikci_stok_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tedarikci_stok_adi VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rezervasyon_tipi VARCHAR(60),
  ADD COLUMN IF NOT EXISTS rezervasyon_iliski_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS stok_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS stok_adi VARCHAR(200);

-- ========== SATINALMA SİPARİŞ BAŞLIK ==========
ALTER TABLE satin_alma_siparisleri
  ADD COLUMN IF NOT EXISTS kur_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS bolge VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sevk_tarihi DATE;

-- ========== SATINALMA SİPARİŞ SATIR ==========
ALTER TABLE satin_alma_siparis_satirlari
  ADD COLUMN IF NOT EXISTS satir_tipi VARCHAR(10) DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS kur_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kdv_durumu VARCHAR(20) DEFAULT 'Haric',
  ADD COLUMN IF NOT EXISTS iskonto_oran2 NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_oran3 NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari2 NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari3 NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tevkifat_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS tevkifat_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tevkifat_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otv_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otv_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tedarikci_stok_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tedarikci_stok_adi VARCHAR(255),
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS bolge VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sevk_tarihi DATE,
  ADD COLUMN IF NOT EXISTS rezervasyon_tipi VARCHAR(60),
  ADD COLUMN IF NOT EXISTS rezervasyon_iliski_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS yp_birim_fiyat NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS yp_tutar NUMERIC(18,2);

CREATE INDEX IF NOT EXISTS idx_sat_talep_depo ON satin_alma_talepleri(depo_id);
CREATE INDEX IF NOT EXISTS idx_sat_talep_satir_stok ON satin_alma_talep_satirlari(stok_id);
CREATE INDEX IF NOT EXISTS idx_sas_satir_depo ON satin_alma_siparis_satirlari(depo_id);
