-- Manuel stok hareketi: giriş / çıkış / transfer + hedef depo
-- Hareket tipi genişletme + INV hareket kodları

ALTER TABLE stok_hareketleri
    ADD COLUMN IF NOT EXISTS hedef_depo_id INT REFERENCES depolar(id),
    ADD COLUMN IF NOT EXISTS bagli_hareket_id INT REFERENCES stok_hareketleri(id);

-- CHECK genişlet
ALTER TABLE stok_hareketleri DROP CONSTRAINT IF EXISTS chk_stok_hareket_tipi;
ALTER TABLE stok_hareketleri
    ADD CONSTRAINT chk_stok_hareket_tipi CHECK (
        hareket_tipi IN (
            'SATINALMA_GIRIS',
            'SATIS_CIKIS',
            'URETIM_TUKETIM',
            'URETIM_GIRIS',
            'SAYIM',
            'TRANSFER',
            'DUZELTME',
            'STOK_GIRIS',
            'STOK_CIKIS'
        )
    );

INSERT INTO hareket_kodlari
    (hareket_kodu, hareket_adi, belge_tipi, yon, stok_etkisi, depo_zorunlu, eksi_bakiye_izin, aciklama, aktif)
VALUES
    ('STG-01', 'Stok Giriş', 'StokGiris', 'Giris', TRUE, TRUE, FALSE, 'Manuel depo girişi', TRUE),
    ('STC-01', 'Stok Çıkış', 'StokCikis', 'Cikis', TRUE, TRUE, FALSE, 'Manuel depo çıkışı', TRUE)
ON CONFLICT (hareket_kodu) DO NOTHING;

-- Transfer / sayım / düzeltme zaten 013'te; belge tipi sözlüğü
INSERT INTO belge_tipleri (belge_tipi_kodu, belge_tipi_adi, modul, stok_etkisi)
VALUES
    ('STOK_GIRIS', 'Stok Giriş', 'INV', TRUE),
    ('STOK_CIKIS', 'Stok Çıkış', 'INV', TRUE)
ON CONFLICT (belge_tipi_kodu) DO NOTHING;

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES ('STOK_HAREKET', 'V', 'Stok hareket belgesi', 0, 'stok-hareketleri', 'Stok Hareketleri', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE
SET ekran_kodu = EXCLUDED.ekran_kodu, ekran_adi = EXCLUDED.ekran_adi, aktif = TRUE;
