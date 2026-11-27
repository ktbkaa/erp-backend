-- Cari / Stok kart entegrasyonu (referans prompt uyarlaması)
-- Yıkıcı değil: ADD COLUMN IF NOT EXISTS + CREATE IF NOT EXISTS

-- ========== CARİ ANA KART GENİŞLETMESİ ==========
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS cari_adi_2 VARCHAR(255);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS aciklama TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS telefon2 VARCHAR(30);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS cep_tel VARCHAR(30);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS fax VARCHAR(30);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS pasaport_no VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS ad VARCHAR(100);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS soyad VARCHAR(100);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS fatura_adres1 TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS fatura_adres2 TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS fatura_adres3 TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS enlem NUMERIC(12, 6);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS boylam NUMERIC(12, 6);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS sektor_kodu VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS bolge_kodu VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS nace_kodu VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS kurulus_tarihi DATE;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS sermaye NUMERIC(18, 2);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

-- Mevcut fatura_adresi → fatura_adres1 (boşsa)
UPDATE cariler
SET fatura_adres1 = fatura_adresi
WHERE (fatura_adres1 IS NULL OR fatura_adres1 = '')
  AND fatura_adresi IS NOT NULL
  AND fatura_adresi <> '';

CREATE TABLE IF NOT EXISTS cari_banka_bilgileri (
    id SERIAL PRIMARY KEY,
    cari_id INT NOT NULL REFERENCES cariler(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    iban VARCHAR(50),
    banka_kodu VARCHAR(20),
    banka_adi VARCHAR(150),
    swift_no VARCHAR(20),
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    pasif BOOLEAN NOT NULL DEFAULT FALSE,
    sube_kodu VARCHAR(20),
    sube_adi VARCHAR(100),
    hesap_no VARCHAR(50),
    muhabir_hesap_no VARCHAR(50),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cari_banka_cari ON cari_banka_bilgileri(cari_id);

CREATE TABLE IF NOT EXISTS cari_sevk_adresleri (
    id SERIAL PRIMARY KEY,
    cari_id INT NOT NULL REFERENCES cariler(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    adres_adi VARCHAR(100),
    adres1 TEXT,
    adres2 TEXT,
    adres3 TEXT,
    ulke VARCHAR(50),
    il VARCHAR(50),
    ilce VARCHAR(50),
    posta_kodu VARCHAR(20),
    telefon VARCHAR(30),
    yetkili_adi VARCHAR(150),
    varsayilan BOOLEAN NOT NULL DEFAULT FALSE,
    pasif BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cari_sevk_cari ON cari_sevk_adresleri(cari_id);

CREATE TABLE IF NOT EXISTS cari_dil_tanimlari (
    id SERIAL PRIMARY KEY,
    cari_id INT NOT NULL REFERENCES cariler(id) ON DELETE CASCADE,
    dil_kodu VARCHAR(10) NOT NULL,
    dil_adi VARCHAR(50),
    cari_adi VARCHAR(255),
    aciklama TEXT,
    varsayilan BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cari_dil_cari ON cari_dil_tanimlari(cari_id);

-- ========== STOK ANA KART GENİŞLETMESİ ==========
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS aciklama TEXT;
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS stok_adi_2 VARCHAR(255);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS uzun_stok_kodu VARCHAR(100);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS stok_takip_birimi VARCHAR(20);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS abc_kodu VARCHAR(1);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS hacim NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS yogunluk NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS hacim_birimi VARCHAR(20);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS yogunluk_birimi VARCHAR(20);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS agirlik_birimi VARCHAR(20);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS koli_brut_agirlik NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS kutu_brut_agirlik NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS kutu_en_mm NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS kutu_boy_mm NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS kutu_yukseklik_mm NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS barkod VARCHAR(50);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS emniyet_stok NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS maksimum_stok NUMERIC(18, 4);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS ulke_mensei VARCHAR(50);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS raf_omru_gun INT;
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS marka VARCHAR(100);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS temin_sekli VARCHAR(50);
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS miktar_hassasiyeti INT DEFAULT 3;

UPDATE stoklar
SET stok_takip_birimi = birim
WHERE (stok_takip_birimi IS NULL OR stok_takip_birimi = '')
  AND birim IS NOT NULL
  AND birim <> '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_stok_abc_kodu') THEN
        ALTER TABLE stoklar
            ADD CONSTRAINT chk_stok_abc_kodu
            CHECK (abc_kodu IS NULL OR abc_kodu IN ('A', 'B', 'C'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS stok_birim_tanimlari (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    birim_kodu VARCHAR(20) NOT NULL,
    katsayi NUMERIC(18, 6) NOT NULL DEFAULT 1,
    cevrilecek_birim VARCHAR(20),
    barkod VARCHAR(50),
    kutu_en_mm NUMERIC(18, 4),
    kutu_boy_mm NUMERIC(18, 4),
    kutu_yukseklik_mm NUMERIC(18, 4),
    hacim NUMERIC(18, 4),
    agirlik NUMERIC(18, 4),
    takip_birimi_mi BOOLEAN NOT NULL DEFAULT FALSE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stok_birim_stok ON stok_birim_tanimlari(stok_id);

-- Mevcut stok biriminden ilk birim tanımı (yoksa)
INSERT INTO stok_birim_tanimlari (stok_id, sira_no, birim_kodu, katsayi, takip_birimi_mi)
SELECT s.id, 1, COALESCE(NULLIF(s.stok_takip_birimi, ''), NULLIF(s.birim, ''), 'AD'), 1, TRUE
FROM stoklar s
WHERE NOT EXISTS (
    SELECT 1 FROM stok_birim_tanimlari b WHERE b.stok_id = s.id
);
