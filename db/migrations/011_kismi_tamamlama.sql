-- Kısmi maddelerin tamamlanması + Yapıldı boşlukları
-- Tanım tabloları vs detay: ulke/parametre = tanım; bağlar/barkod/dil/firma param = detay

ALTER TABLE olcu_birimleri ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT TRUE;

-- Depo raf/konum (WMS basit)
ALTER TABLE depolar ADD COLUMN IF NOT EXISTS raf_kodu VARCHAR(50);
ALTER TABLE depolar ADD COLUMN IF NOT EXISTS konum_kodu VARCHAR(50);

-- Ülke tanımı (lookup)
CREATE TABLE IF NOT EXISTS ulkeler (
    id SERIAL PRIMARY KEY,
    ulke_kodu VARCHAR(10) UNIQUE NOT NULL,
    ulke_adi VARCHAR(100) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ulkeler (ulke_kodu, ulke_adi) VALUES
    ('TR', 'Türkiye'),
    ('DE', 'Almanya'),
    ('US', 'Amerika Birleşik Devletleri'),
    ('CN', 'Çin')
ON CONFLICT (ulke_kodu) DO NOTHING;

-- Kategori tipi genişletme (sektör/bölge de tanım ekranından)
ALTER TABLE kategori_tanimlari DROP CONSTRAINT IF EXISTS chk_kategori_tipi;
ALTER TABLE kategori_tanimlari
    ADD CONSTRAINT chk_kategori_tipi
    CHECK (kategori_tipi IN ('ABC', 'Marka', 'TeminSekli', 'Sektor', 'Bolge'));

INSERT INTO kategori_tanimlari (kategori_kodu, kategori_adi, kategori_tipi, aciklama)
VALUES
    ('SEK-URETIM', 'Üretim Sektörü', 'Sektor', 'Üretim'),
    ('SEK-TICARET', 'Ticaret Sektörü', 'Sektor', 'Ticaret'),
    ('BOL-MARMARA', 'Marmara', 'Bolge', 'Bölge'),
    ('BOL-EGE', 'Ege', 'Bolge', 'Bölge')
ON CONFLICT (kategori_kodu) DO NOTHING;

-- Cari firma bazlı parametreler (detay grid)
CREATE TABLE IF NOT EXISTS cari_firma_parametreleri (
    id SERIAL PRIMARY KEY,
    cari_id INT NOT NULL REFERENCES cariler(id) ON DELETE CASCADE,
    firma_id INT NOT NULL REFERENCES firmalar(id),
    muhasebe_hesap_kodu VARCHAR(50),
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    cari_tipi VARCHAR(30),
    risk_grup_kodu VARCHAR(30),
    nakit_akisa_dahil BOOLEAN NOT NULL DEFAULT TRUE,
    kur_degerlemeye_dahil BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cari_id, firma_id)
);

-- Stok barkodları (detay)
CREATE TABLE IF NOT EXISTS stok_barkodlari (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    barkod VARCHAR(50) NOT NULL,
    birim_kodu VARCHAR(20),
    varsayilan BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (barkod)
);

-- Stok dil tanımları (detay)
CREATE TABLE IF NOT EXISTS stok_dil_tanimlari (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    dil_kodu VARCHAR(10) NOT NULL,
    dil_adi VARCHAR(50),
    stok_adi VARCHAR(255),
    aciklama TEXT,
    varsayilan BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Satınalma talep onay durumu
ALTER TABLE satin_alma_talepleri DROP CONSTRAINT IF EXISTS chk_sat_talep_durum;
ALTER TABLE satin_alma_talepleri
    ADD CONSTRAINT chk_sat_talep_durum
    CHECK (durum IN ('Acik', 'Onayli', 'SipariseDonustu', 'Iptal', 'Kapali'));

-- Numaratörler
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('ULKE', 'UL', 'Ülke Tanımı', 0, 'ulke-tanimi', 'Ülke Tanımı', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;

UPDATE kod_serileri SET ekran_kodu = 'satis-siparisleri', ekran_adi = 'Satış Siparişleri'
WHERE seri_kodu = 'SATIS_SIPARIS';

UPDATE kod_serileri SET ekran_kodu = 'satis-faturalari', ekran_adi = 'Satış Faturaları'
WHERE seri_kodu = 'FATURA';

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES ('FATURA', 'FA', 'Fatura', 0, 'satis-faturalari', 'Satış Faturaları', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;
