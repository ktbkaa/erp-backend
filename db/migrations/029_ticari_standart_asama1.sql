-- Aşama 1: Ticari ERP standart — referans tanımlar + transfer emri + sayım belgesi + ATP param
-- Kaynak: docs/27_TICARI_ERP_GAP_ANALIZI.md

-- ========== Ödeme koşulları ==========
CREATE TABLE IF NOT EXISTS odeme_kosullari (
    id SERIAL PRIMARY KEY,
    kosul_kodu VARCHAR(30) UNIQUE NOT NULL,
    kosul_adi VARCHAR(120) NOT NULL,
    vade_gun INT NOT NULL DEFAULT 0,
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO odeme_kosullari (kosul_kodu, kosul_adi, vade_gun) VALUES
    ('PESIN', 'Peşin', 0),
    ('NET30', 'Net 30 gün', 30),
    ('NET60', 'Net 60 gün', 60),
    ('NET90', 'Net 90 gün', 90),
    ('KD15', '15 gün vadeli', 15)
ON CONFLICT (kosul_kodu) DO NOTHING;

-- ========== Teslimat koşulları (Incoterms benzeri) ==========
CREATE TABLE IF NOT EXISTS teslimat_kosullari (
    id SERIAL PRIMARY KEY,
    kosul_kodu VARCHAR(30) UNIQUE NOT NULL,
    kosul_adi VARCHAR(120) NOT NULL,
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO teslimat_kosullari (kosul_kodu, kosul_adi, aciklama) VALUES
    ('EXW', 'Ex Works', 'Satıcı teslim noktası'),
    ('FCA', 'Free Carrier', 'Taşıyıcıya teslim'),
    ('CPT', 'Carriage Paid To', 'Navlun ödenmiş'),
    ('CIP', 'Carriage Insurance Paid', 'Navlun + sigorta'),
    ('DAP', 'Delivered At Place', 'Belirtilen yerde teslim'),
    ('DDP', 'Delivered Duty Paid', 'Gümrük dahil teslim'),
    ('FOB', 'Free On Board', 'Gemide teslim'),
    ('CIF', 'Cost Insurance Freight', 'Maliyet + sigorta + navlun')
ON CONFLICT (kosul_kodu) DO NOTHING;

-- ========== Dil tanımları ==========
CREATE TABLE IF NOT EXISTS diller (
    id SERIAL PRIMARY KEY,
    dil_kodu VARCHAR(10) UNIQUE NOT NULL,
    dil_adi VARCHAR(80) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO diller (dil_kodu, dil_adi) VALUES
    ('tr', 'Türkçe'),
    ('en', 'English'),
    ('de', 'Deutsch'),
    ('fr', 'Français'),
    ('ar', 'العربية')
ON CONFLICT (dil_kodu) DO NOTHING;

-- ========== Banka tanımları ==========
CREATE TABLE IF NOT EXISTS bankalar (
    id SERIAL PRIMARY KEY,
    banka_kodu VARCHAR(20) UNIQUE NOT NULL,
    banka_adi VARCHAR(120) NOT NULL,
    swift_kodu VARCHAR(20),
    ulke_kodu VARCHAR(10) REFERENCES ulkeler(ulke_kodu),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO bankalar (banka_kodu, banka_adi, swift_kodu, ulke_kodu) VALUES
    ('0001', 'T.C. Ziraat Bankası', 'TCZBTR2A', 'TR'),
    ('0010', 'T. Vakıflar Bankası', 'TVBATR2A', 'TR'),
    ('0012', 'T. Halk Bankası', 'TRHBTR2A', 'TR'),
    ('0046', 'Akbank', 'AKBKTRIS', 'TR'),
    ('0062', 'Garanti BBVA', 'TGBATRIS', 'TR'),
    ('0064', 'İş Bankası', 'ISBKTRIS', 'TR'),
    ('0067', 'Yapı Kredi', 'YAPITRIS', 'TR')
ON CONFLICT (banka_kodu) DO NOTHING;

-- ========== Döviz kurları ==========
CREATE TABLE IF NOT EXISTS doviz_kurlari (
    id SERIAL PRIMARY KEY,
    kur_tarihi DATE NOT NULL,
    kaynak_pb VARCHAR(10) NOT NULL REFERENCES para_birimleri(pb_kodu),
    hedef_pb VARCHAR(10) NOT NULL REFERENCES para_birimleri(pb_kodu),
    alis_kuru NUMERIC(18,6) NOT NULL CHECK (alis_kuru > 0),
    satis_kuru NUMERIC(18,6) NOT NULL CHECK (satis_kuru > 0),
    efektif_alis NUMERIC(18,6),
    efektif_satis NUMERIC(18,6),
    kaynak VARCHAR(40) NOT NULL DEFAULT 'Manuel',
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_doviz_kur UNIQUE (kur_tarihi, kaynak_pb, hedef_pb),
    CONSTRAINT chk_doviz_farkli CHECK (kaynak_pb <> hedef_pb)
);

CREATE INDEX IF NOT EXISTS idx_doviz_kur_tarih ON doviz_kurlari (kur_tarihi DESC);
CREATE INDEX IF NOT EXISTS idx_doviz_kur_pb ON doviz_kurlari (kaynak_pb, hedef_pb);

INSERT INTO doviz_kurlari (kur_tarihi, kaynak_pb, hedef_pb, alis_kuru, satis_kuru, kaynak)
VALUES
    (CURRENT_DATE, 'USD', 'TRY', 34.500000, 34.650000, 'Seed'),
    (CURRENT_DATE, 'EUR', 'TRY', 37.200000, 37.400000, 'Seed'),
    (CURRENT_DATE, 'GBP', 'TRY', 44.100000, 44.400000, 'Seed')
ON CONFLICT (kur_tarihi, kaynak_pb, hedef_pb) DO NOTHING;

-- Belgelere teslimat_kosulu kolonu (serbest kod; lookup ile doldurulur)
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS teslimat_kosulu VARCHAR(30);
ALTER TABLE satin_alma_siparisleri ADD COLUMN IF NOT EXISTS teslimat_kosulu VARCHAR(30);
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS teslimat_kosulu VARCHAR(30);
ALTER TABLE satis_teklifleri ADD COLUMN IF NOT EXISTS teslimat_kosulu VARCHAR(30);
ALTER TABLE irsaliyeler ADD COLUMN IF NOT EXISTS teslimat_kosulu VARCHAR(30);

-- Cari banka satırına banka_id (opsiyonel FK)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cari_banka_bilgileri') THEN
    ALTER TABLE cari_banka_bilgileri ADD COLUMN IF NOT EXISTS banka_id INT REFERENCES bankalar(id);
  END IF;
END $$;

-- ========== Transfer emri ==========
CREATE TABLE IF NOT EXISTS transfer_emirleri (
    id SERIAL PRIMARY KEY,
    emir_no VARCHAR(50) UNIQUE NOT NULL,
    firma_id INT REFERENCES firmalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    kaynak_depo_id INT NOT NULL REFERENCES depolar(id),
    hedef_depo_id INT NOT NULL REFERENCES depolar(id),
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak',
    talep_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    planlanan_tarih DATE,
    onay_tarihi TIMESTAMP,
    onaylayan VARCHAR(80),
    kaynak_hareket_id INT,
    hedef_hareket_id INT,
    aciklama TEXT,
    olusturan VARCHAR(80),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_transfer_depo CHECK (kaynak_depo_id <> hedef_depo_id),
    CONSTRAINT chk_transfer_durum CHECK (durum IN ('Taslak', 'Onayli', 'Tamamlandi', 'Iptal'))
);

CREATE TABLE IF NOT EXISTS transfer_emri_satirlari (
    id SERIAL PRIMARY KEY,
    emir_id INT NOT NULL REFERENCES transfer_emirleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(18,4) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(30),
    parti_id INT,
    raf_kodu VARCHAR(40),
    aciklama TEXT
);

CREATE INDEX IF NOT EXISTS idx_transfer_emir_durum ON transfer_emirleri (durum);
CREATE INDEX IF NOT EXISTS idx_transfer_emir_firma ON transfer_emirleri (firma_id);

-- ========== Sayım belgesi ==========
CREATE TABLE IF NOT EXISTS sayim_belgeleri (
    id SERIAL PRIMARY KEY,
    belge_no VARCHAR(50) UNIQUE NOT NULL,
    firma_id INT REFERENCES firmalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    depo_id INT NOT NULL REFERENCES depolar(id),
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak',
    sayim_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    onay_tarihi TIMESTAMP,
    onaylayan VARCHAR(80),
    hareket_id INT,
    aciklama TEXT,
    olusturan VARCHAR(80),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sayim_durum CHECK (durum IN ('Taslak', 'Onayli', 'Iptal'))
);

CREATE TABLE IF NOT EXISTS sayim_belge_satirlari (
    id SERIAL PRIMARY KEY,
    belge_id INT NOT NULL REFERENCES sayim_belgeleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    sistem_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
    sayilan_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
    fark_miktar NUMERIC(18,4) GENERATED ALWAYS AS (sayilan_miktar - sistem_miktar) STORED,
    birim VARCHAR(30),
    parti_id INT,
    raf_kodu VARCHAR(40),
    aciklama TEXT
);

CREATE INDEX IF NOT EXISTS idx_sayim_belge_durum ON sayim_belgeleri (durum);
CREATE INDEX IF NOT EXISTS idx_sayim_belge_depo ON sayim_belgeleri (depo_id);

-- Numaratörler
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('ODEME_KOSUL', 'OK', 'Ödeme Koşulu', 0, 'odeme-kosulu-tanimi', 'Ödeme Koşulu', TRUE),
    ('TESLIMAT_KOSUL', 'TK', 'Teslimat Koşulu', 0, 'teslimat-kosulu-tanimi', 'Teslimat Koşulu', TRUE),
    ('DIL', 'DL', 'Dil Tanımı', 0, 'dil-tanimi', 'Dil Tanımı', TRUE),
    ('BANKA', 'BN', 'Banka Tanımı', 0, 'banka-tanimi', 'Banka Tanımı', TRUE),
    ('TRANSFER_EMRI', 'TE', 'Transfer Emri', 0, 'transfer-emirleri', 'Transfer Emirleri', TRUE),
    ('SAYIM_BELGE', 'SB', 'Sayım Belgesi', 0, 'sayim-belgeleri', 'Sayım Belgeleri', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;

-- Belge tipi sözlüğü
INSERT INTO belge_tipleri (belge_tipi_kodu, belge_tipi_adi, modul, aktif)
VALUES
    ('TRANSFER_EMRI', 'Depolar Arası Transfer Emri', 'INV', TRUE),
    ('SAYIM_BELGE', 'Stok Sayım Belgesi', 'INV', TRUE)
ON CONFLICT (belge_tipi_kodu) DO NOTHING;

-- Sistem parametreleri
INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, aciklama)
VALUES
    ('ATP_ZORUNLU', 'ATP stok kontrolü', 'Hayir',
     'Evet ise satış siparişi satırında kullanılabilir stok yetersizse kayıt engellenir.'),
    ('TANIM_SOFT_DELETE', 'Tanım soft-delete', 'Evet',
     'Evet ise tanım silme pasifleştirir (aktif=false); fiziksel silmez.')
ON CONFLICT (parametre_kodu) DO UPDATE SET
    aciklama = EXCLUDED.aciklama;

UPDATE sistem_parametreleri SET
    aciklama = COALESCE(aciklama, '') ||
      CASE WHEN aciklama IS NULL OR aciklama NOT LIKE '%JWT%'
           THEN ' Prod ortamda Evet önerilir (yalnız JWT; header spoof kapalı).'
           ELSE '' END
WHERE parametre_kodu = 'AUTH_ZORUNLU';
