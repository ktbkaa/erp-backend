-- Satış zinciri: Teklif → Sipariş → Sevk Emri → İrsaliye → Fatura
-- Sabit tanım: hareket kodları (tüm belgeler için)
-- e-İrsaliye / e-Fatura zorunlu alan iskeleti (UBL-TR / GİB)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Firma kimlik alanları (gönderici e-belge)
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS adres TEXT;
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS telefon VARCHAR(30);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS fax VARCHAR(30);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS vergi_dairesi VARCHAR(100);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS vkn VARCHAR(20);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS ticaret_sicil_no VARCHAR(50);
ALTER TABLE firmalar ADD COLUMN IF NOT EXISTS mersis_no VARCHAR(30);

-- ========== HAREKET KODLARI ==========
CREATE TABLE IF NOT EXISTS hareket_kodlari (
    id SERIAL PRIMARY KEY,
    hareket_kodu VARCHAR(40) UNIQUE NOT NULL,
    hareket_adi VARCHAR(150) NOT NULL,
    belge_tipi VARCHAR(40) NOT NULL,
    -- Yon: stok etkisi yönü
    yon VARCHAR(20) NOT NULL DEFAULT 'Bilgi'
        CHECK (yon IN ('Giris', 'Cikis', 'Transfer', 'Bilgi')),
    stok_etkisi BOOLEAN NOT NULL DEFAULT FALSE,
    cari_zorunlu BOOLEAN NOT NULL DEFAULT FALSE,
    depo_zorunlu BOOLEAN NOT NULL DEFAULT FALSE,
    eksi_bakiye_izin BOOLEAN NOT NULL DEFAULT FALSE,
    muhasebe_hesap_kodu VARCHAR(40),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hareket_kod_belge ON hareket_kodlari(belge_tipi);

ALTER TABLE stok_hareketleri
    ADD COLUMN IF NOT EXISTS hareket_kodu_id INT REFERENCES hareket_kodlari(id);

-- ========== SATIŞ TEKLİFİ ==========
CREATE TABLE IF NOT EXISTS satis_teklifleri (
    id SERIAL PRIMARY KEY,
    teklif_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INT NOT NULL REFERENCES cariler(id),
    teklif_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    gecerlilik_tarihi DATE,
    para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY',
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak'
        CHECK (durum IN ('Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali')),
    hareket_kodu_id INT REFERENCES hareket_kodlari(id),
    aciklama TEXT,
    toplam_tutar NUMERIC(14, 2) NOT NULL DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satis_teklif_satirlari (
    id SERIAL PRIMARY KEY,
    teklif_id INT NOT NULL REFERENCES satis_teklifleri(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(20),
    birim_fiyat NUMERIC(14, 4) NOT NULL DEFAULT 0,
    iskonto_oran NUMERIC(8, 2) NOT NULL DEFAULT 0,
    iskonto_tutari NUMERIC(14, 2) NOT NULL DEFAULT 0,
    kdv_oran NUMERIC(8, 2) NOT NULL DEFAULT 20,
    kdv_tutari NUMERIC(14, 2) NOT NULL DEFAULT 0,
    mal_hizmet_tutari NUMERIC(14, 2) NOT NULL DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS teklif_id INT REFERENCES satis_teklifleri(id);
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS hareket_kodu_id INT REFERENCES hareket_kodlari(id);
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS sevk_adresi TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS aciklama TEXT;

ALTER TABLE siparis_detaylari ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8, 2) DEFAULT 0;
ALTER TABLE siparis_detaylari ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE siparis_detaylari ADD COLUMN IF NOT EXISTS kdv_oran NUMERIC(8, 2) DEFAULT 20;
ALTER TABLE siparis_detaylari ADD COLUMN IF NOT EXISTS kdv_tutari NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE siparis_detaylari ADD COLUMN IF NOT EXISTS sira_no INT DEFAULT 1;

-- ========== SEVK EMRİ ==========
CREATE TABLE IF NOT EXISTS sevk_emirleri (
    id SERIAL PRIMARY KEY,
    sevk_no VARCHAR(50) UNIQUE NOT NULL,
    siparis_id INT NOT NULL REFERENCES siparisler(id),
    cari_id INT NOT NULL REFERENCES cariler(id),
    depo_id INT NOT NULL REFERENCES depolar(id),
    sevk_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    sevk_adresi TEXT,
    sevk_il VARCHAR(50),
    sevk_ilce VARCHAR(50),
    sevk_ulke VARCHAR(50) DEFAULT 'Türkiye',
    sevk_posta_kodu VARCHAR(20),
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak'
        CHECK (durum IN ('Taslak', 'Onayli', 'IrsaliyeDonustu', 'Iptal', 'Kapali')),
    hareket_kodu_id INT REFERENCES hareket_kodlari(id),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sevk_emri_satirlari (
    id SERIAL PRIMARY KEY,
    sevk_id INT NOT NULL REFERENCES sevk_emirleri(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    siparis_detay_id INT REFERENCES siparis_detaylari(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(20),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== İRSALİYE (e-İrsaliye alanları) ==========
CREATE TABLE IF NOT EXISTS irsaliyeler (
    id SERIAL PRIMARY KEY,
    irsaliye_no VARCHAR(50) UNIQUE NOT NULL,
    ettn UUID NOT NULL DEFAULT gen_random_uuid(),
    ozellestirme_no VARCHAR(20) NOT NULL DEFAULT 'TR1.2.1',
    senaryo VARCHAR(40) NOT NULL DEFAULT 'TEMELIRSALIYE',
    irsaliye_tipi VARCHAR(20) NOT NULL DEFAULT 'SEVK',
    irsaliye_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    irsaliye_zamani TIME NOT NULL DEFAULT CURRENT_TIME,
    sevk_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    sevk_zamani TIME NOT NULL DEFAULT CURRENT_TIME,
    cari_id INT NOT NULL REFERENCES cariler(id),
    siparis_id INT REFERENCES siparisler(id),
    sevk_emri_id INT REFERENCES sevk_emirleri(id),
    depo_id INT NOT NULL REFERENCES depolar(id),
    hareket_kodu_id INT REFERENCES hareket_kodlari(id),
    -- Teslim / sevk adresi (zorunlu e-irsaliye)
    sevk_adresi TEXT,
    sevk_il VARCHAR(50),
    sevk_ilce VARCHAR(50),
    sevk_ulke VARCHAR(50) DEFAULT 'Türkiye',
    sevk_posta_kodu VARCHAR(20),
    -- Taşıyıcı
    arac_plaka VARCHAR(20),
    dorse_plaka VARCHAR(20),
    sofor_adi VARCHAR(150),
    sofor_soyadi VARCHAR(150),
    sofor_tckn VARCHAR(20),
    tasiyici_unvan VARCHAR(255),
    tasiyici_vkn VARCHAR(20),
    aciklama TEXT,
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak'
        CHECK (durum IN ('Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali')),
    stok_hareket_id INT REFERENCES stok_hareketleri(id),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS irsaliye_satirlari (
    id SERIAL PRIMARY KEY,
    irsaliye_id INT NOT NULL REFERENCES irsaliyeler(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(20),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== FATURA e-belge alanları ==========
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS ettn UUID;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS ozellestirme_no VARCHAR(20) DEFAULT 'TR1.2';
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS senaryo VARCHAR(40) DEFAULT 'TICARIFATURA';
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS fatura_tipi VARCHAR(20) DEFAULT 'SATIS';
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS fatura_tarihi DATE DEFAULT CURRENT_DATE;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS irsaliye_id INT REFERENCES irsaliyeler(id);
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS siparis_id INT REFERENCES siparisler(id);
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS hareket_kodu_id INT REFERENCES hareket_kodlari(id);
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS sevk_adresi TEXT;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS odeme_vadesi_gun INT DEFAULT 0;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS aciklama TEXT;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS mal_hizmet_toplam NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS toplam_iskonto NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS toplam_kdv NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS odenecek_tutar NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS durum VARCHAR(30) DEFAULT 'Taslak';

ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS sira_no INT DEFAULT 1;
ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS birim VARCHAR(20);
ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8, 2) DEFAULT 0;
ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS kdv_oran NUMERIC(8, 2) DEFAULT 20;
ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS kdv_tutari NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE fatura_detaylari ADD COLUMN IF NOT EXISTS mal_hizmet_tutari NUMERIC(14, 2) DEFAULT 0;

-- ETTN doldur (eski kayıtlar)
UPDATE faturalar SET ettn = gen_random_uuid() WHERE ettn IS NULL;

-- Numaratörler (onek benzersiz)
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('HAREKET_KOD', 'HK', 'Hareket Kodu', 0, 'hareket-kodlari', 'Hareket Kodları', TRUE),
    ('SATIS_TEKLIF', 'ST', 'Satış Teklifi', 0, 'satis-teklifleri', 'Satış Teklifleri', TRUE),
    ('SEVK_EMRI', 'SE', 'Sevk Emri', 0, 'sevk-emirleri', 'Sevk Emirleri', TRUE),
    ('IRSALIYE', 'IR', 'Satış İrsaliyesi', 0, 'irsaliyeler', 'İrsaliyeler', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi,
    onek = EXCLUDED.onek;

-- Seed hareket kodları
INSERT INTO hareket_kodlari
    (hareket_kodu, hareket_adi, belge_tipi, yon, stok_etkisi, cari_zorunlu, depo_zorunlu, aciklama)
VALUES
    ('STK-01', 'Satış Teklifi', 'SatisTeklif', 'Bilgi', FALSE, TRUE, FALSE, 'Teklif belgesi'),
    ('SSP-01', 'Satış Siparişi', 'SatisSiparis', 'Bilgi', FALSE, TRUE, FALSE, 'Sipariş belgesi'),
    ('SEV-01', 'Sevk Emri', 'SevkEmri', 'Bilgi', FALSE, TRUE, TRUE, 'Sevkiyat planı'),
    ('SIR-01', 'Satış İrsaliyesi', 'SatisIrsaliye', 'Cikis', TRUE, TRUE, TRUE, 'e-İrsaliye SEVK'),
    ('SFA-01', 'Satış Faturası', 'SatisFatura', 'Bilgi', FALSE, TRUE, FALSE, 'e-Fatura SATIS'),
    ('STA-01', 'Satınalma Talebi', 'SatinAlmaTalep', 'Bilgi', FALSE, FALSE, FALSE, NULL),
    ('SAS-01', 'Satınalma Siparişi', 'SatinAlmaSiparis', 'Bilgi', FALSE, TRUE, FALSE, NULL),
    ('MKB-01', 'Mal Kabul', 'MalKabul', 'Giris', TRUE, TRUE, TRUE, 'Satınalma giriş'),
    ('AFA-01', 'Alış Faturası', 'AlisFatura', 'Bilgi', FALSE, TRUE, FALSE, NULL),
    ('UEM-01', 'Üretim Emri', 'UretimEmri', 'Bilgi', FALSE, FALSE, FALSE, NULL),
    ('UGI-01', 'Üretim Girişi', 'UretimGiris', 'Giris', TRUE, FALSE, TRUE, 'Mamul giriş'),
    ('UTK-01', 'Üretim Tüketim', 'UretimTuketim', 'Cikis', TRUE, FALSE, TRUE, 'Hammadde tüketim'),
    ('TRF-01', 'Depolar Arası Transfer', 'Transfer', 'Transfer', TRUE, FALSE, TRUE, NULL),
    ('SAY-01', 'Sayım Farkı', 'Sayim', 'Giris', TRUE, FALSE, TRUE, 'Sayım +/-'),
    ('FIR-01', 'Fire / Sarf', 'Fire', 'Cikis', TRUE, FALSE, TRUE, NULL),
    ('DUZ-01', 'Stok Düzeltme', 'Duzeltme', 'Giris', TRUE, FALSE, TRUE, NULL)
ON CONFLICT (hareket_kodu) DO NOTHING;
