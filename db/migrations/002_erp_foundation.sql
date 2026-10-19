-- Gerçek ERP çekirdeğinde olması gereken temel yapılar.
-- Mevcut veriyi silmez; yeni tablolar ekler.

-- 1) Ölçü birimi (stokta serbest metin yerine kontrollü değer)
CREATE TABLE IF NOT EXISTS olcu_birimleri (
    id SERIAL PRIMARY KEY,
    birim_kodu VARCHAR(20) UNIQUE NOT NULL,
    birim_adi VARCHAR(100) NOT NULL,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO olcu_birimleri (birim_kodu, birim_adi)
VALUES
    ('AD', 'Adet'),
    ('KG', 'Kilogram'),
    ('MT', 'Metre'),
    ('LT', 'Litre')
ON CONFLICT (birim_kodu) DO NOTHING;

-- 2) Depo (iş yeri altında)
CREATE TABLE IF NOT EXISTS depolar (
    id SERIAL PRIMARY KEY,
    is_yeri_id INT NOT NULL REFERENCES is_yerleri(id),
    depo_kodu VARCHAR(50) NOT NULL,
    depo_adi VARCHAR(255) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (is_yeri_id, depo_kodu)
);

-- 3) Stok - iş yeri bağlantısı
CREATE TABLE IF NOT EXISTS stok_is_yeri (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    is_yeri_id INT NOT NULL REFERENCES is_yerleri(id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (stok_id, is_yeri_id)
);

-- 4) Belge numara serisi (SAS-2026-0001 gibi kontrollü numara)
CREATE TABLE IF NOT EXISTS belge_numaralari (
    id SERIAL PRIMARY KEY,
    belge_tipi VARCHAR(50) UNIQUE NOT NULL,
    onek VARCHAR(20) NOT NULL,
    yil INT NOT NULL,
    son_numara INT NOT NULL DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO belge_numaralari (belge_tipi, onek, yil, son_numara)
VALUES
    ('SATINALMA_SIPARIS', 'SAS', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('SATIS_SIPARIS', 'SSS', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('DEPO_GIRIS', 'GIR', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('DEPO_CIKIS', 'CIK', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('IRSALIYE', 'IRS', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('FATURA', 'FAT', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('URETIM_EMRI', 'UEM', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0),
    ('STOK_HAREKET', 'STH', EXTRACT(YEAR FROM CURRENT_DATE)::INT, 0)
ON CONFLICT (belge_tipi) DO NOTHING;

-- 5) Stok hareket motoru (miktar değişiminin tek kaynağı)
CREATE TABLE IF NOT EXISTS stok_hareketleri (
    id SERIAL PRIMARY KEY,
    hareket_no VARCHAR(50) UNIQUE NOT NULL,
    hareket_tipi VARCHAR(50) NOT NULL,
    -- Ornek tipler: SATINALMA_GIRIS, SATIS_CIKIS, URETIM_TUKETIM, URETIM_GIRIS, SAYIM, TRANSFER
    is_yeri_id INT REFERENCES is_yerleri(id),
    depo_id INT REFERENCES depolar(id),
    belge_tipi VARCHAR(50),
    belge_id INT,
    aciklama TEXT,
    hareket_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stok_hareket_tipi CHECK (
        hareket_tipi IN (
            'SATINALMA_GIRIS',
            'SATIS_CIKIS',
            'URETIM_TUKETIM',
            'URETIM_GIRIS',
            'SAYIM',
            'TRANSFER',
            'DUZELTME'
        )
    )
);

CREATE TABLE IF NOT EXISTS stok_hareket_satirlari (
    id SERIAL PRIMARY KEY,
    hareket_id INT NOT NULL REFERENCES stok_hareketleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL,
    -- + giriş, - çıkış (uygulama bu işareti hareket tipine göre koyar)
    yon SMALLINT NOT NULL,
    birim VARCHAR(50),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stok_hareket_yon CHECK (yon IN (-1, 1)),
    CONSTRAINT chk_stok_hareket_miktar CHECK (miktar > 0)
);

CREATE INDEX IF NOT EXISTS idx_stok_hareket_satir_stok ON stok_hareket_satirlari(stok_id);
CREATE INDEX IF NOT EXISTS idx_stok_hareket_depo ON stok_hareketleri(depo_id);
CREATE INDEX IF NOT EXISTS idx_stok_hareket_belge ON stok_hareketleri(belge_tipi, belge_id);
