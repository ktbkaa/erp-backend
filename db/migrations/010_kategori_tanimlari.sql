-- Kategori Tanımı (ABC / Marka / TeminSekli) — stok kart lookup kaynağı

-- Numaratör önekleri tek karakterle sınırlıydı; sabit tanımlar için genişlet
ALTER TABLE kod_serileri
    ALTER COLUMN onek TYPE VARCHAR(10);

CREATE TABLE IF NOT EXISTS kategori_tanimlari (
    id SERIAL PRIMARY KEY,
    kategori_kodu VARCHAR(50) UNIQUE NOT NULL,
    kategori_adi VARCHAR(255) NOT NULL,
    kategori_tipi VARCHAR(30) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_kategori_tipi') THEN
        ALTER TABLE kategori_tanimlari
            ADD CONSTRAINT chk_kategori_tipi
            CHECK (kategori_tipi IN ('ABC', 'Marka', 'TeminSekli'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kategori_tipi ON kategori_tanimlari (kategori_tipi);

INSERT INTO kategori_tanimlari (kategori_kodu, kategori_adi, kategori_tipi, aciklama)
VALUES
    ('A', 'A Sınıfı', 'ABC', 'Yüksek önem'),
    ('B', 'B Sınıfı', 'ABC', 'Orta önem'),
    ('C', 'C Sınıfı', 'ABC', 'Düşük önem'),
    ('GENEL', 'Genel Marka', 'Marka', 'Varsayılan marka'),
    ('SATINALMA', 'Satınalma', 'TeminSekli', 'Dış tedarik'),
    ('URETIM', 'Üretim', 'TeminSekli', 'İç üretim')
ON CONFLICT (kategori_kodu) DO NOTHING;

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('KATEGORI', 'KT', 'Kategori Tanımı', 0, 'kategori-tanimi', 'Kategori Tanımı', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    onek = EXCLUDED.onek,
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;
