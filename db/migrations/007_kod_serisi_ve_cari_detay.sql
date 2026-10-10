-- Ana veri kod sistemi: 1 sessiz harf + 5 rakam (örn. M00001, H00001)
-- Cari kart detaylandırma + müşteri/tedarikçi ayrımı

CREATE TABLE IF NOT EXISTS kod_serileri (
    seri_kodu VARCHAR(50) PRIMARY KEY,
    onek CHAR(1) NOT NULL UNIQUE,
    aciklama VARCHAR(255) NOT NULL,
    son_numara INT NOT NULL DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara) VALUES
    ('FIRMA', 'F', 'Firma', 0),
    ('ISYERI', 'I', 'İş yeri', 0),
    ('DEPO', 'D', 'Depo', 0),
    ('MUSTERI', 'M', 'Müşteri cari', 0),
    ('TEDARIKCI', 'T', 'Tedarikçi cari', 0),
    ('CARI_HERIKISI', 'C', 'Hem müşteri hem tedarikçi', 0),
    ('HAMMADDE', 'H', 'Hammadde stok', 0),
    ('YARIMAMUL', 'Y', 'Yarı mamul stok', 0),
    ('MAMUL', 'U', 'Mamul / ürün stok', 0),
    ('TICARI', 'S', 'Ticari stok', 0),
    ('KISI', 'K', 'Kişi / kullanıcı', 0),
    ('SATINALMA_TALEP', 'L', 'Satınalma talebi', 0),
    ('SATINALMA_SIPARIS', 'P', 'Satınalma siparişi', 0),
    ('MAL_KABUL', 'R', 'Mal kabul', 0),
    ('URETIM_EMRI', 'E', 'Üretim iş emri', 0),
    ('URETIM_GIRIS', 'G', 'Üretim girişi', 0),
    ('STOK_HAREKET', 'V', 'Stok hareket belgesi', 0),
    ('SATIS_SIPARIS', 'B', 'Satış siparişi', 0)
ON CONFLICT (seri_kodu) DO NOTHING;

-- Cari kart genişletme
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS vergi_no VARCHAR(30);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS vergi_dairesi VARCHAR(100);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS yetkili_adi VARCHAR(150);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS yetkili_telefon VARCHAR(30);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS adres TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS fatura_adresi TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS il VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS ilce VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS ulke VARCHAR(50) DEFAULT 'Türkiye';
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS posta_kodu VARCHAR(20);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY';
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS odeme_vadesi_gun INT DEFAULT 0;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS notlar TEXT;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id);

-- cari_turu normalize
UPDATE cariler SET cari_turu = 'Tedarikci'
WHERE cari_turu ILIKE '%tedarik%' OR cari_turu ILIKE '%supplier%';

UPDATE cariler SET cari_turu = 'Musteri'
WHERE cari_turu ILIKE '%müşteri%' OR cari_turu ILIKE '%musteri%' OR cari_turu ILIKE '%customer%';

UPDATE cariler SET cari_turu = 'HerIkisi'
WHERE cari_turu ILIKE '%her%' OR cari_turu ILIKE '%both%';

UPDATE cariler SET cari_turu = 'Tedarikci' WHERE cari_turu IS NULL OR cari_turu = '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cari_turu') THEN
        ALTER TABLE cariler
            ADD CONSTRAINT chk_cari_turu
            CHECK (cari_turu IN ('Musteri', 'Tedarikci', 'HerIkisi'));
    END IF;
END $$;

-- Eski detay satırlarındaki ilk kaydı master'a taşı (varsa)
UPDATE cariler c
SET
    adres = COALESCE(c.adres, d.adres),
    fatura_adresi = COALESCE(c.fatura_adresi, d.fatura_adresi),
    yetkili_adi = COALESCE(c.yetkili_adi, d.yetkili_adi),
    yetkili_telefon = COALESCE(c.yetkili_telefon, d.yetkili_telefon)
FROM (
    SELECT DISTINCT ON (cari_id) *
    FROM cari_detaylari
    ORDER BY cari_id, id
) d
WHERE d.cari_id = c.id;
