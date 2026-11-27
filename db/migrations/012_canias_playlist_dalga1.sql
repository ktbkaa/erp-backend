-- Canias YouTube (SYS/BAS/BOM/PRD/PUR/FIN) 1. dalga
-- TX: SYST03/06/40, PURT01-03, VERT01, BOMT03/05, BAST05, PRDT02/13, FINT01/06/62

-- SYS: kullanıcı alanları
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS kullanici_kodu VARCHAR(50);
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS grup_kodu VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kisiler_kullanici_kodu
    ON kisiler (kullanici_kodu) WHERE kullanici_kodu IS NOT NULL;

CREATE TABLE IF NOT EXISTS kullanici_gruplari (
    id SERIAL PRIMARY KEY,
    grup_kodu VARCHAR(50) UNIQUE NOT NULL,
    grup_adi VARCHAR(150) NOT NULL,
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sistem_parametreleri (
    id SERIAL PRIMARY KEY,
    parametre_kodu VARCHAR(80) UNIQUE NOT NULL,
    parametre_adi VARCHAR(200) NOT NULL,
    deger TEXT,
    modul VARCHAR(40),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PRD,BAS: sınıf (BAST05 sade)
CREATE TABLE IF NOT EXISTS stok_siniflari (
    id SERIAL PRIMARY KEY,
    sinif_kodu VARCHAR(50) UNIQUE NOT NULL,
    sinif_adi VARCHAR(150) NOT NULL,
    ust_sinif_kodu VARCHAR(50),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS sinif_kodu VARCHAR(50);

-- PUR: teklif isteği / teklif / anlaşma
CREATE TABLE IF NOT EXISTS satin_alma_teklif_istekleri (
    id SERIAL PRIMARY KEY,
    istek_no VARCHAR(50) UNIQUE NOT NULL,
    is_yeri_id INT REFERENCES is_yerleri(id),
    aciklama TEXT,
    durum VARCHAR(30) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Onayli', 'TeklifeDonustu', 'Iptal', 'Kapali')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satin_alma_teklif_istek_satirlari (
    id SERIAL PRIMARY KEY,
    istek_id INT NOT NULL REFERENCES satin_alma_teklif_istekleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 2) NOT NULL,
    birim VARCHAR(20),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satin_alma_teklifleri (
    id SERIAL PRIMARY KEY,
    teklif_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INT NOT NULL REFERENCES cariler(id),
    istek_id INT REFERENCES satin_alma_teklif_istekleri(id),
    aciklama TEXT,
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak'
        CHECK (durum IN ('Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'Iptal', 'Kapali')),
    gecerlilik_tarihi DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satin_alma_teklif_satirlari (
    id SERIAL PRIMARY KEY,
    teklif_id INT NOT NULL REFERENCES satin_alma_teklifleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 2) NOT NULL,
    birim_fiyat NUMERIC(12, 2) NOT NULL DEFAULT 0,
    birim VARCHAR(20),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satin_alma_anlasmalari (
    id SERIAL PRIMARY KEY,
    anlasma_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INT NOT NULL REFERENCES cariler(id),
    teklif_id INT REFERENCES satin_alma_teklifleri(id),
    aciklama TEXT,
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak'
        CHECK (durum IN ('Taslak', 'Onayli', 'Kapali', 'Iptal')),
    baslangic_tarihi DATE,
    bitis_tarihi DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS satin_alma_anlasma_satirlari (
    id SERIAL PRIMARY KEY,
    anlasma_id INT NOT NULL REFERENCES satin_alma_anlasmalari(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 2),
    birim_fiyat NUMERIC(12, 2) NOT NULL DEFAULT 0,
    birim VARCHAR(20),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PRD: satış siparişi bağı
ALTER TABLE uretim_emirleri ADD COLUMN IF NOT EXISTS siparis_id INT REFERENCES siparisler(id);
ALTER TABLE uretim_emirleri DROP CONSTRAINT IF EXISTS chk_ue_durum;
ALTER TABLE uretim_emirleri DROP CONSTRAINT IF EXISTS chk_uretim_emri_durum;
ALTER TABLE uretim_emirleri
    ADD CONSTRAINT chk_ue_durum
    CHECK (durum IN ('Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'));

-- FIN: hesap planı + muhasebe belgesi
CREATE TABLE IF NOT EXISTS muhasebe_hesaplari (
    id SERIAL PRIMARY KEY,
    hesap_kodu VARCHAR(40) UNIQUE NOT NULL,
    hesap_adi VARCHAR(200) NOT NULL,
    hesap_tipi VARCHAR(30) NOT NULL DEFAULT 'Dogrudan'
        CHECK (hesap_tipi IN ('Ana', 'Ust', 'Dogrudan')),
    ust_hesap_kodu VARCHAR(40),
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    silinecek BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS muhasebe_belgeleri (
    id SERIAL PRIMARY KEY,
    belge_no VARCHAR(50) UNIQUE NOT NULL,
    belge_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    aciklama TEXT,
    durum VARCHAR(30) NOT NULL DEFAULT 'Taslak'
        CHECK (durum IN ('Taslak', 'Onayli', 'Iptal')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS muhasebe_belge_kalemleri (
    id SERIAL PRIMARY KEY,
    belge_id INT NOT NULL REFERENCES muhasebe_belgeleri(id) ON DELETE CASCADE,
    hesap_id INT NOT NULL REFERENCES muhasebe_hesaplari(id),
    borc NUMERIC(14, 2) NOT NULL DEFAULT 0,
    alacak NUMERIC(14, 2) NOT NULL DEFAULT 0,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (borc >= 0 AND alacak >= 0),
    CHECK (NOT (borc > 0 AND alacak > 0))
);

-- Numaratörler
-- onek benzersiz olmalı (mevcut: A..Y, FA, KT, UL)
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('KULLANICI', 'KU', 'Sistem Kullanıcısı', 0, 'kullanicilar', 'Kullanıcılar', TRUE),
    ('KULLANICI_GRUP', 'KG', 'Kullanıcı Grubu', 0, 'kullanici-gruplari', 'Kullanıcı Grupları', TRUE),
    ('SISTEM_PARAM', 'SP', 'Sistem Parametresi', 0, 'sistem-parametreleri', 'Sistem Parametreleri', TRUE),
    ('STOK_SINIF', 'SN', 'Stok Sınıfı', 0, 'sinif-tanimi', 'Sınıf Tanımı', TRUE),
    ('SATINALMA_TEKLIF_ISTEK', 'QI', 'Satınalma Teklif İsteği', 0, 'satin-alma-teklif-istekleri', 'Satınalma Teklif İstekleri', TRUE),
    ('SATINALMA_TEKLIF', 'QF', 'Satınalma Teklifi', 0, 'satin-alma-teklifleri', 'Satınalma Teklifleri', TRUE),
    ('SATINALMA_ANLASMA', 'QA', 'Satınalma Anlaşması', 0, 'satin-alma-anlasmalari', 'Satınalma Anlaşmaları', TRUE),
    ('ALIS_FATURA', 'AF', 'Alış Faturası', 0, 'alis-faturalari', 'Alış Faturaları', TRUE),
    ('MUHASEBE_HESAP', 'HP', 'Muhasebe Hesabı', 0, 'hesap-plani', 'Hesap Planı', TRUE),
    ('MUHASEBE_BELGE', 'MB', 'Muhasebe Belgesi', 0, 'muhasebe-belgeleri', 'Muhasebe Belgeleri', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi,
    aciklama = EXCLUDED.aciklama,
    onek = EXCLUDED.onek;

-- Seed parametreler + örnek hesaplar
INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, modul, aciklama)
VALUES
    ('FIRMA_PB', 'Varsayılan para birimi', 'TRY', 'BAS', 'Belge para birimi'),
    ('STOK_NEGATIF', 'Negatif stok izni', 'Hayir', 'INV', 'Depo çıkışında negatif bakiye'),
    ('URETIM_OTOMATIK_ONAY', 'Üretim emri otomatik onay', 'Hayir', 'PRD', 'PRDT02/03 akışı')
ON CONFLICT (parametre_kodu) DO NOTHING;

INSERT INTO muhasebe_hesaplari (hesap_kodu, hesap_adi, hesap_tipi, ust_hesap_kodu)
VALUES
    ('100', 'Dönen Varlıklar', 'Ana', NULL),
    ('100.01', 'Kasa', 'Ust', '100'),
    ('100.01.001', 'Merkez Kasa', 'Dogrudan', '100.01'),
    ('120', 'Ticari Alacaklar', 'Ana', NULL),
    ('120.01.001', 'Yurt İçi Alacaklar', 'Dogrudan', '120'),
    ('150', 'Stoklar', 'Ana', NULL),
    ('150.01.001', 'Hammaddeler', 'Dogrudan', '150'),
    ('320', 'Ticari Borçlar', 'Ana', NULL),
    ('320.01.001', 'Yurt İçi Borçlar', 'Dogrudan', '320'),
    ('600', 'Gelirler', 'Ana', NULL),
    ('600.01.001', 'Yurt İçi Satışlar', 'Dogrudan', '600'),
    ('700', 'Maliyetler', 'Ana', NULL),
    ('700.01.001', 'Satılan Mamul Maliyeti', 'Dogrudan', '700')
ON CONFLICT (hesap_kodu) DO NOTHING;

INSERT INTO kullanici_gruplari (grup_kodu, grup_adi, aciklama)
VALUES
    ('ADMIN', 'Yöneticiler', 'Tam yetki (mantıksal)'),
    ('SATINALMA', 'Satınalma', 'PUR kullanıcıları'),
    ('URETIM', 'Üretim', 'PRD kullanıcıları'),
    ('FINANS', 'Finans', 'FIN kullanıcıları')
ON CONFLICT (grup_kodu) DO NOTHING;

INSERT INTO stok_siniflari (sinif_kodu, sinif_adi, aciklama)
VALUES
    ('HM', 'Hammadde', 'Hammadde sınıfı'),
    ('YM', 'Yarı Mamul', 'Yarı mamul sınıfı'),
    ('MM', 'Mamul', 'Mamul sınıfı')
ON CONFLICT (sinif_kodu) DO NOTHING;
