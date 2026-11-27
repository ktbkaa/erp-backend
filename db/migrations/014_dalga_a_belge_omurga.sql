-- Dalga A: Belge referans omurgası (DOCTYPE + REFDOC), açık miktar, satır bağları
-- Canias karşılığı: REFDOCTYPE/REFDOCNUM + ORDSTAT/DELSTAT iskeleti

-- ========== BELGE TİPİ SÖZLÜĞÜ ==========
CREATE TABLE IF NOT EXISTS belge_tipleri (
    id SERIAL PRIMARY KEY,
    belge_tipi_kodu VARCHAR(40) UNIQUE NOT NULL,
    belge_tipi_adi VARCHAR(120) NOT NULL,
    modul VARCHAR(30) NOT NULL DEFAULT 'GENEL',
    stok_etkisi BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO belge_tipleri (belge_tipi_kodu, belge_tipi_adi, modul, stok_etkisi) VALUES
    ('SATIS_TEKLIF', 'Satış Teklifi', 'SAL', FALSE),
    ('SATIS_SIPARIS', 'Satış Siparişi', 'SAL', FALSE),
    ('SEVK_EMRI', 'Sevk Emri', 'SAL', FALSE),
    ('IRSALIYE', 'Satış İrsaliyesi', 'SAL', TRUE),
    ('SATIS_FATURA', 'Satış Faturası', 'SAL', FALSE),
    ('SATINALMA_TALEP', 'Satınalma Talebi', 'PUR', FALSE),
    ('SATINALMA_SIPARIS', 'Satınalma Siparişi', 'PUR', FALSE),
    ('MAL_KABUL', 'Mal Kabul', 'PUR', TRUE),
    ('ALIS_FATURA', 'Alış Faturası', 'PUR', FALSE),
    ('URETIM_EMRI', 'Üretim Emri', 'PRD', FALSE),
    ('URETIM_GIRIS', 'Üretim Girişi', 'PRD', TRUE),
    ('STOK_HAREKET', 'Stok Hareketi', 'INV', TRUE),
    ('TRANSFER', 'Depolar Arası Transfer', 'INV', TRUE),
    ('SAYIM', 'Stok Sayımı', 'INV', TRUE)
ON CONFLICT (belge_tipi_kodu) DO NOTHING;

-- ========== KAYNAK BELGE (REFDOC) — başlık ==========
ALTER TABLE satis_teklifleri
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

ALTER TABLE siparisler
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

ALTER TABLE sevk_emirleri
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

ALTER TABLE irsaliyeler
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

ALTER TABLE faturalar
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

CREATE INDEX IF NOT EXISTS idx_siparis_kaynak ON siparisler(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_sevk_kaynak ON sevk_emirleri(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_irsaliye_kaynak ON irsaliyeler(kaynak_belge_tipi, kaynak_belge_id);
CREATE INDEX IF NOT EXISTS idx_fatura_kaynak ON faturalar(kaynak_belge_tipi, kaynak_belge_id);

-- ========== SATIR REF + AÇIK MİKTAR ==========
ALTER TABLE siparis_detaylari
    ADD COLUMN IF NOT EXISTS teklif_satir_id INT REFERENCES satis_teklif_satirlari(id),
    ADD COLUMN IF NOT EXISTS sevk_edilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS irsaliye_edilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fatura_edilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0;

ALTER TABLE sevk_emri_satirlari
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT,
    ADD COLUMN IF NOT EXISTS kaynak_belge_satir_id INT;

ALTER TABLE irsaliye_satirlari
    ADD COLUMN IF NOT EXISTS sevk_emri_satir_id INT REFERENCES sevk_emri_satirlari(id),
    ADD COLUMN IF NOT EXISTS siparis_detay_id INT REFERENCES siparis_detaylari(id),
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT,
    ADD COLUMN IF NOT EXISTS kaynak_belge_satir_id INT;

ALTER TABLE fatura_detaylari
    ADD COLUMN IF NOT EXISTS irsaliye_satir_id INT REFERENCES irsaliye_satirlari(id),
    ADD COLUMN IF NOT EXISTS siparis_detay_id INT REFERENCES siparis_detaylari(id),
    ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kaynak_belge_id INT,
    ADD COLUMN IF NOT EXISTS kaynak_belge_satir_id INT;

-- Mevcut zincir kayıtlarını geriye dönük doldur
UPDATE siparisler SET kaynak_belge_tipi = 'SATIS_TEKLIF', kaynak_belge_id = teklif_id
WHERE teklif_id IS NOT NULL AND kaynak_belge_id IS NULL;

UPDATE sevk_emirleri SET kaynak_belge_tipi = 'SATIS_SIPARIS', kaynak_belge_id = siparis_id
WHERE siparis_id IS NOT NULL AND kaynak_belge_id IS NULL;

UPDATE irsaliyeler SET
    kaynak_belge_tipi = CASE WHEN sevk_emri_id IS NOT NULL THEN 'SEVK_EMRI' ELSE 'SATIS_SIPARIS' END,
    kaynak_belge_id = COALESCE(sevk_emri_id, siparis_id)
WHERE kaynak_belge_id IS NULL AND (sevk_emri_id IS NOT NULL OR siparis_id IS NOT NULL);

UPDATE faturalar SET
    kaynak_belge_tipi = CASE WHEN irsaliye_id IS NOT NULL THEN 'IRSALIYE' ELSE 'SATIS_SIPARIS' END,
    kaynak_belge_id = COALESCE(irsaliye_id, siparis_id)
WHERE kaynak_belge_id IS NULL AND (irsaliye_id IS NOT NULL OR siparis_id IS NOT NULL);

-- STOK_NEGATIF parametresi (yoksa) — 012'de seed var; güvence
INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, modul, aciklama)
VALUES ('STOK_NEGATIF', 'Negatif stok izni', 'Hayir', 'INV', 'Depo çıkışında negatif bakiye (Evet/Hayir)')
ON CONFLICT (parametre_kodu) DO NOTHING;

-- Mevcut sevk / irsaliye / fatura miktarlarını açık miktar alanlarına geri yaz
UPDATE siparis_detaylari sd SET
    sevk_edilen_miktar = COALESCE((
        SELECT SUM(ss.miktar) FROM sevk_emri_satirlari ss
        JOIN sevk_emirleri se ON se.id = ss.sevk_id
        WHERE ss.siparis_detay_id = sd.id AND se.durum <> 'Iptal'
    ), 0)
WHERE COALESCE(sd.sevk_edilen_miktar, 0) = 0;

-- İrsaliye satır bağları yoksa stok_id + sipariş üzerinden yaklaşık doldurma (yalnız Onayli/Faturaya)
UPDATE siparis_detaylari sd SET
    irsaliye_edilen_miktar = COALESCE((
        SELECT SUM(ir.miktar) FROM irsaliye_satirlari ir
        JOIN irsaliyeler i ON i.id = ir.irsaliye_id
        WHERE i.siparis_id = sd.siparis_id
          AND ir.stok_id = sd.stok_id
          AND i.durum IN ('Onayli', 'FaturayaDonustu')
          AND (ir.siparis_detay_id IS NULL OR ir.siparis_detay_id = sd.id)
    ), sd.irsaliye_edilen_miktar, 0)
WHERE COALESCE(sd.irsaliye_edilen_miktar, 0) = 0;
