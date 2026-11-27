-- Üretim + Satınalma döngüsü tabloları

-- İş merkezleri
CREATE TABLE IF NOT EXISTS is_merkezleri (
    id SERIAL PRIMARY KEY,
    is_yeri_id INT NOT NULL REFERENCES is_yerleri(id),
    merkez_kodu VARCHAR(50) NOT NULL,
    merkez_adi VARCHAR(255) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (is_yeri_id, merkez_kodu)
);

-- Ürün ağacı (BOM)
CREATE TABLE IF NOT EXISTS urun_agaclari (
    id SERIAL PRIMARY KEY,
    mamul_stok_id INT NOT NULL REFERENCES stoklar(id),
    agac_kodu VARCHAR(50) UNIQUE NOT NULL,
    agac_adi VARCHAR(255) NOT NULL,
    miktar NUMERIC(12, 3) NOT NULL DEFAULT 1,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS urun_agaci_satirlari (
    id SERIAL PRIMARY KEY,
    urun_agaci_id INT NOT NULL REFERENCES urun_agaclari(id) ON DELETE CASCADE,
    bilesen_stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(50),
    sira_no INT NOT NULL DEFAULT 10,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rota
CREATE TABLE IF NOT EXISTS rotalar (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    rota_kodu VARCHAR(50) UNIQUE NOT NULL,
    rota_adi VARCHAR(255) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rota_operasyonlari (
    id SERIAL PRIMARY KEY,
    rota_id INT NOT NULL REFERENCES rotalar(id) ON DELETE CASCADE,
    sira_no INT NOT NULL,
    operasyon_kodu VARCHAR(50) NOT NULL,
    operasyon_adi VARCHAR(255) NOT NULL,
    is_merkezi_id INT REFERENCES is_merkezleri(id),
    sure_dk NUMERIC(12, 2) DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rota_id, sira_no)
);

-- Satınalma talebi
CREATE TABLE IF NOT EXISTS satin_alma_talepleri (
    id SERIAL PRIMARY KEY,
    talep_no VARCHAR(50) UNIQUE NOT NULL,
    is_yeri_id INT REFERENCES is_yerleri(id),
    durum VARCHAR(30) NOT NULL DEFAULT 'Acik',
    aciklama TEXT,
    talep_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sat_talep_durum CHECK (durum IN ('Acik', 'SipariseDonustu', 'Iptal', 'Kapali'))
);

CREATE TABLE IF NOT EXISTS satin_alma_talep_satirlari (
    id SERIAL PRIMARY KEY,
    talep_id INT NOT NULL REFERENCES satin_alma_talepleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(50),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Satınalma siparişi
CREATE TABLE IF NOT EXISTS satin_alma_siparisleri (
    id SERIAL PRIMARY KEY,
    siparis_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INT NOT NULL REFERENCES cariler(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    talep_id INT REFERENCES satin_alma_talepleri(id),
    durum VARCHAR(30) NOT NULL DEFAULT 'Onayli',
    siparis_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    toplam_tutar NUMERIC(14, 2) NOT NULL DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sas_durum CHECK (durum IN ('Taslak', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'))
);

CREATE TABLE IF NOT EXISTS satin_alma_siparis_satirlari (
    id SERIAL PRIMARY KEY,
    siparis_id INT NOT NULL REFERENCES satin_alma_siparisleri(id) ON DELETE CASCADE,
    talep_satir_id INT REFERENCES satin_alma_talep_satirlari(id),
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    giren_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    birim_fiyat NUMERIC(12, 2) NOT NULL DEFAULT 0,
    birim VARCHAR(50),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Mal kabul / depo giriş
CREATE TABLE IF NOT EXISTS mal_kabuller (
    id SERIAL PRIMARY KEY,
    kabul_no VARCHAR(50) UNIQUE NOT NULL,
    siparis_id INT NOT NULL REFERENCES satin_alma_siparisleri(id),
    depo_id INT NOT NULL REFERENCES depolar(id),
    kabul_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    stok_hareket_id INT REFERENCES stok_hareketleri(id),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mal_kabul_satirlari (
    id SERIAL PRIMARY KEY,
    kabul_id INT NOT NULL REFERENCES mal_kabuller(id) ON DELETE CASCADE,
    siparis_satir_id INT NOT NULL REFERENCES satin_alma_siparis_satirlari(id),
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Üretim iş emri
CREATE TABLE IF NOT EXISTS uretim_emirleri (
    id SERIAL PRIMARY KEY,
    emir_no VARCHAR(50) UNIQUE NOT NULL,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    urun_agaci_id INT REFERENCES urun_agaclari(id),
    rota_id INT REFERENCES rotalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    hammadde_depo_id INT REFERENCES depolar(id),
    mamul_depo_id INT REFERENCES depolar(id),
    planlanan_miktar NUMERIC(12, 3) NOT NULL CHECK (planlanan_miktar > 0),
    uretilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    durum VARCHAR(30) NOT NULL DEFAULT 'Acik',
    baslangic_tarihi DATE DEFAULT CURRENT_DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ue_durum CHECK (durum IN ('Acik', 'Uretimde', 'Kapali', 'Iptal'))
);

CREATE TABLE IF NOT EXISTS uretim_emri_bilesenleri (
    id SERIAL PRIMARY KEY,
    emir_id INT NOT NULL REFERENCES uretim_emirleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    planlanan_miktar NUMERIC(12, 3) NOT NULL,
    tuketilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    birim VARCHAR(50),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uretim_girisleri (
    id SERIAL PRIMARY KEY,
    giris_no VARCHAR(50) UNIQUE NOT NULL,
    emir_id INT NOT NULL REFERENCES uretim_emirleri(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    giris_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    tuketim_hareket_id INT REFERENCES stok_hareketleri(id),
    mamul_hareket_id INT REFERENCES stok_hareketleri(id),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Belge tipleri
INSERT INTO belge_numaralari (belge_tipi, onek, yil, son_numara)
VALUES
    ('SATINALMA_TALEP', 'TAL', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('MAL_KABUL', 'MKB', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('URETIM_GIRIS', 'UGI', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0)
ON CONFLICT (belge_tipi) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_bom_mamul ON urun_agaclari(mamul_stok_id);
CREATE INDEX IF NOT EXISTS idx_sas_talep ON satin_alma_siparisleri(talep_id);
CREATE INDEX IF NOT EXISTS idx_ue_stok ON uretim_emirleri(stok_id);
