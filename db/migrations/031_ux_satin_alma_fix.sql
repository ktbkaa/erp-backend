-- 031: UX / satınalma düzeltmeleri
-- - Anlaşma para birimi / kur / iş yeri
-- - Tedarikçi irsaliye belgesi (mal kabul kaynağı)
-- - Stok birim dönüşümü açıklık
-- - Legacy firma_id NULL kayıtları için soft backfill notu (uygulama tarafında yazılır)

ALTER TABLE satin_alma_anlasmalari
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1;

ALTER TABLE satin_alma_anlasma_satirlari
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10),
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6);

ALTER TABLE satin_alma_teklif_satirlari
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10),
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6);

ALTER TABLE satin_alma_siparis_satirlari
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10),
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6);

-- Tedarikçi irsaliyesi (alış lojistik belgesi) — mal kabul kaynağı
CREATE TABLE IF NOT EXISTS tedarikci_irsaliyeleri (
    id SERIAL PRIMARY KEY,
    irsaliye_no VARCHAR(80) NOT NULL,
    firma_id INT REFERENCES firmalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    cari_id INT NOT NULL REFERENCES cariler(id),
    siparis_id INT REFERENCES satin_alma_siparisleri(id),
    irsaliye_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    durum VARCHAR(30) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Kismi', 'Kapali', 'Iptal')),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (firma_id, cari_id, irsaliye_no)
);

CREATE TABLE IF NOT EXISTS tedarikci_irsaliye_satirlari (
    id SERIAL PRIMARY KEY,
    irsaliye_id INT NOT NULL REFERENCES tedarikci_irsaliyeleri(id) ON DELETE CASCADE,
    siparis_satir_id INT REFERENCES satin_alma_siparis_satirlari(id),
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(18,4) NOT NULL CHECK (miktar > 0),
    kabul_edilen NUMERIC(18,4) NOT NULL DEFAULT 0,
    birim VARCHAR(20),
    birim_fiyat NUMERIC(18,4) DEFAULT 0,
    satir_aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ted_irs_cari ON tedarikci_irsaliyeleri(cari_id);
CREATE INDEX IF NOT EXISTS idx_ted_irs_durum ON tedarikci_irsaliyeleri(durum);
CREATE INDEX IF NOT EXISTS idx_ted_irs_firma ON tedarikci_irsaliyeleri(firma_id);

ALTER TABLE mal_kabuller
  ADD COLUMN IF NOT EXISTS tedarikci_irsaliye_id INT REFERENCES tedarikci_irsaliyeleri(id);

-- Barkod izleme (depo hareketlerinde okutma kaydı)
CREATE TABLE IF NOT EXISTS stok_barkod_okumalari (
    id SERIAL PRIMARY KEY,
    firma_id INT REFERENCES firmalar(id),
    hareket_id INT REFERENCES stok_hareketleri(id) ON DELETE SET NULL,
    hareket_satir_id INT REFERENCES stok_hareket_satirlari(id) ON DELETE SET NULL,
    barkod VARCHAR(80) NOT NULL,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    depo_id INT REFERENCES depolar(id),
    miktar NUMERIC(18,4) NOT NULL DEFAULT 1,
    hareket_tipi VARCHAR(40),
    sonuc VARCHAR(40) NOT NULL DEFAULT 'Ok'
        CHECK (sonuc IN ('Ok', 'HataliEslesme', 'Bilinmeyen', 'Red')),
    mesaj TEXT,
    okuyan_kullanici VARCHAR(40),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_barkod_okuma_barkod ON stok_barkod_okumalari(barkod);
CREATE INDEX IF NOT EXISTS idx_barkod_okuma_hareket ON stok_barkod_okumalari(hareket_id);

COMMENT ON TABLE tedarikci_irsaliyeleri IS 'Tedarikçiden gelen irsaliye; mal kabulde seçilir, kısmi kabul destekler';
COMMENT ON COLUMN stok_birim_tanimlari.katsayi IS '1 birim_kodu = katsayi × cevrilecek_birim (veya stok baz birimi)';

ALTER TABLE satin_alma_teklifleri
  ADD COLUMN IF NOT EXISTS talep_id INT REFERENCES satin_alma_talepleri(id),
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1;

-- Teklif istek zorunluluğu kaldırıldı; talep üzerinden teklif desteklenir
