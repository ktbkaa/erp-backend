-- MRP süreç modeli: bağımsız ihtiyaç, çalışma, sonuç, planlama parametreleri
-- Kaynak: klasik MRP + Canias MRPT* / Odoo Manufacturing akışları (sadeleştirilmiş)

ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS temin_suresi_gun INT DEFAULT 0;
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS yeniden_siparis_seviyesi NUMERIC(18,4) DEFAULT 0;
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS sabit_siparis_miktari NUMERIC(18,4);

COMMENT ON COLUMN stoklar.temin_suresi_gun IS 'MRP geri çizelgeleme (lead time) gün';
COMMENT ON COLUMN stoklar.yeniden_siparis_seviyesi IS 'ROP: stok bu seviyenin altına inerse net ihtiyaca eklenir';
COMMENT ON COLUMN stoklar.sabit_siparis_miktari IS 'Lot: sabit miktar (null = lot-for-lot)';

CREATE TABLE IF NOT EXISTS mrp_bagimsiz_ihtiyaclar (
    id SERIAL PRIMARY KEY,
    ihtiyac_no VARCHAR(50) UNIQUE NOT NULL,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(18,4) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(30),
    ihtiyac_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    kaynak VARCHAR(30) NOT NULL DEFAULT 'Manuel',
    siparis_id INT REFERENCES siparisler(id) ON DELETE SET NULL,
    firma_id INT REFERENCES firmalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mrp_bi_kaynak CHECK (kaynak IN ('Manuel', 'Siparis', 'Tahmin', 'Bütçe'))
);

CREATE INDEX IF NOT EXISTS idx_mrp_bi_stok ON mrp_bagimsiz_ihtiyaclar (stok_id);
CREATE INDEX IF NOT EXISTS idx_mrp_bi_tarih ON mrp_bagimsiz_ihtiyaclar (ihtiyac_tarihi);

CREATE TABLE IF NOT EXISTS mrp_calismalari (
    id SERIAL PRIMARY KEY,
    calisma_no VARCHAR(50) UNIQUE NOT NULL,
    firma_id INT REFERENCES firmalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    durum VARCHAR(30) NOT NULL DEFAULT 'Tamamlandi',
    baslangic_ts TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bitis_ts TIMESTAMP,
    parametre_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    satir_sayisi INT NOT NULL DEFAULT 0,
    net_pozitif INT NOT NULL DEFAULT 0,
    aciklama TEXT,
    olusturan VARCHAR(80),
    CONSTRAINT chk_mrp_calisma_durum CHECK (durum IN ('Taslak', 'Calisiyor', 'Tamamlandi', 'Hata'))
);

CREATE TABLE IF NOT EXISTS mrp_sonuclar (
    id SERIAL PRIMARY KEY,
    calisma_id INT NOT NULL REFERENCES mrp_calismalari(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    seviye INT NOT NULL DEFAULT 0,
    kaynak_stok_id INT REFERENCES stoklar(id),
    brut_ihtiyac NUMERIC(18,4) NOT NULL DEFAULT 0,
    bagimsiz_ihtiyac NUMERIC(18,4) NOT NULL DEFAULT 0,
    bagimli_ihtiyac NUMERIC(18,4) NOT NULL DEFAULT 0,
    emniyet_stok NUMERIC(18,4) NOT NULL DEFAULT 0,
    yeniden_siparis NUMERIC(18,4) NOT NULL DEFAULT 0,
    kullanilabilir_stok NUMERIC(18,4) NOT NULL DEFAULT 0,
    acik_satinalma NUMERIC(18,4) NOT NULL DEFAULT 0,
    planlanan_uretim NUMERIC(18,4) NOT NULL DEFAULT 0,
    net_ihtiyac NUMERIC(18,4) NOT NULL DEFAULT 0,
    onerilen_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
    oneri VARCHAR(40) NOT NULL DEFAULT 'Yeterli',
    ihtiyac_tarihi DATE,
    planlanan_baslangic DATE,
    birim VARCHAR(30),
    donusturuldu BOOLEAN NOT NULL DEFAULT FALSE,
    donusum_tipi VARCHAR(30),
    donusum_belge_id INT,
    donusum_belge_no VARCHAR(50),
    CONSTRAINT chk_mrp_oneri CHECK (oneri IN ('Yeterli', 'Satınalma', 'Üretim emri'))
);

CREATE INDEX IF NOT EXISTS idx_mrp_sonuc_calisma ON mrp_sonuclar (calisma_id);
CREATE INDEX IF NOT EXISTS idx_mrp_sonuc_stok ON mrp_sonuclar (stok_id);
CREATE INDEX IF NOT EXISTS idx_mrp_sonuc_net ON mrp_sonuclar (calisma_id, net_ihtiyac);

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('MRP_BI', 'BI', 'MRP Bağımsız İhtiyaç', 0, 'mrp-bagimsiz-ihtiyac', 'MRP Bağımsız İhtiyaç', TRUE),
    ('MRP_CALISMA', 'MR', 'MRP Çalışması', 0, 'mrp-calisma', 'MRP Çalıştır', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;

-- Örnek planlama parametreleri (hammaddelerde kısa tedarik süresi)
UPDATE stoklar SET temin_suresi_gun = 7, emniyet_stok = COALESCE(NULLIF(emniyet_stok, 0), 10)
WHERE stok_kodu LIKE 'H%' AND (temin_suresi_gun IS NULL OR temin_suresi_gun = 0);

UPDATE stoklar SET temin_suresi_gun = 3, emniyet_stok = COALESCE(NULLIF(emniyet_stok, 0), 2)
WHERE stok_kodu LIKE 'U%' AND (temin_suresi_gun IS NULL OR temin_suresi_gun = 0);
