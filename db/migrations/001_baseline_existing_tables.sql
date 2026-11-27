-- Mevcut prototip tabloları (canlı şema ile uyumlu).
-- CREATE IF NOT EXISTS: senin bilgisayarındaki dolu tabloları silmez.

CREATE TABLE IF NOT EXISTS firmalar (
    id SERIAL PRIMARY KEY,
    firma_kodu VARCHAR(50) UNIQUE NOT NULL,
    firma_adi VARCHAR(255) NOT NULL,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS is_yerleri (
    id SERIAL PRIMARY KEY,
    firma_id INT NOT NULL REFERENCES firmalar(id),
    is_yeri_kodu VARCHAR(50) UNIQUE NOT NULL,
    is_yeri_adi VARCHAR(255) NOT NULL,
    adres TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stoklar (
    id SERIAL PRIMARY KEY,
    stok_kodu VARCHAR(50) UNIQUE NOT NULL,
    stok_adi VARCHAR(255) NOT NULL,
    birim VARCHAR(50),
    satis_fiyati NUMERIC(12, 2) DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stok_detaylari (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    boyut VARCHAR(100),
    agirlik NUMERIC(12, 3),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cariler (
    id SERIAL PRIMARY KEY,
    cari_kodu VARCHAR(50) UNIQUE NOT NULL,
    cari_adi VARCHAR(255) NOT NULL,
    cari_turu VARCHAR(50),
    telefon VARCHAR(30),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cari_detaylari (
    id SERIAL PRIMARY KEY,
    cari_id INT NOT NULL REFERENCES cariler(id) ON DELETE CASCADE,
    adres TEXT,
    fatura_adresi TEXT,
    yetkili_adi VARCHAR(255),
    yetkili_telefon VARCHAR(30),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faturalar (
    id SERIAL PRIMARY KEY,
    fatura_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INT NOT NULL REFERENCES cariler(id),
    fatura_turu VARCHAR(50),
    toplam_tutar NUMERIC(12, 2) DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fatura_detaylari (
    id SERIAL PRIMARY KEY,
    fatura_id INT NOT NULL REFERENCES faturalar(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 2) NOT NULL,
    birim_fiyat NUMERIC(12, 2) NOT NULL,
    toplam_tutar NUMERIC(12, 2) NOT NULL,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kisiler (
    id SERIAL PRIMARY KEY,
    ad VARCHAR(100) NOT NULL,
    soyad VARCHAR(100) NOT NULL,
    eposta VARCHAR(100) UNIQUE,
    telefon VARCHAR(30),
    rol VARCHAR(50) DEFAULT 'Personel',
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS siparisler (
    id SERIAL PRIMARY KEY,
    siparis_no VARCHAR(50) UNIQUE NOT NULL,
    cari_id INT REFERENCES cariler(id),
    cari_kodu VARCHAR(50) NOT NULL,
    cari_adi VARCHAR(255),
    siparis_tarihi DATE DEFAULT CURRENT_DATE,
    siparis_turu VARCHAR(50) NOT NULL,
    toplam_tutar NUMERIC(12, 2) DEFAULT 0,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS siparis_detaylari (
    id SERIAL PRIMARY KEY,
    siparis_id INT NOT NULL REFERENCES siparisler(id) ON DELETE CASCADE,
    stok_kodu VARCHAR(50) NOT NULL,
    stok_adi VARCHAR(255),
    stok_birimi VARCHAR(50),
    miktar NUMERIC(12, 2) NOT NULL,
    birim_fiyat NUMERIC(12, 2) NOT NULL,
    toplam_tutar NUMERIC(12, 2) NOT NULL,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
