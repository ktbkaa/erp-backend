-- Uyumsoft eğitim dokümanlarından uyarlanan üretim/envanter genişletmeleri
-- (Canias mimarisine hizalı; Uyumsoft şema kopyası değil)

-- ========== İş Emri Tipi (Uyumsoft: Tip zorunlu) ==========
CREATE TABLE IF NOT EXISTS uretim_emri_tipleri (
    id SERIAL PRIMARY KEY,
    tip_kodu VARCHAR(40) UNIQUE NOT NULL,
    tip_adi VARCHAR(120) NOT NULL,
    planli_kesin VARCHAR(10) NOT NULL DEFAULT 'Kesin'
        CHECK (planli_kesin IN ('Planli', 'Kesin')),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO uretim_emri_tipleri (tip_kodu, tip_adi, planli_kesin, aciklama) VALUES
    ('STD', 'Standart Üretim', 'Kesin', 'Normal mamul üretimi'),
    ('PLN', 'Planlı Üretim', 'Planli', 'Planlama amaçlı emir'),
    ('SIP', 'Sipariş Bağlı', 'Kesin', 'Satış siparişinden açılan emir')
ON CONFLICT (tip_kodu) DO NOTHING;

ALTER TABLE uretim_emirleri
    ADD COLUMN IF NOT EXISTS emir_tipi_id INT REFERENCES uretim_emri_tipleri(id),
    ADD COLUMN IF NOT EXISTS planli_kesin VARCHAR(10) DEFAULT 'Kesin';

UPDATE uretim_emirleri ue
SET emir_tipi_id = t.id
FROM uretim_emri_tipleri t
WHERE ue.emir_tipi_id IS NULL
  AND t.tip_kodu = CASE WHEN ue.siparis_id IS NOT NULL THEN 'SIP' ELSE 'STD' END;

-- ========== BOM geçerlilik / miktar aralığı (Uyumsoft ürün ağacı) ==========
ALTER TABLE urun_agaclari
    ADD COLUMN IF NOT EXISTS gecerlilik_baslangic DATE,
    ADD COLUMN IF NOT EXISTS gecerlilik_bitis DATE,
    ADD COLUMN IF NOT EXISTS min_miktar NUMERIC(14, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_miktar NUMERIC(14, 3) DEFAULT 999999999;

-- ========== Rota şablonu bayrağı + geçerlilik ==========
ALTER TABLE rotalar
    ADD COLUMN IF NOT EXISTS sablon BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS gecerlilik_baslangic DATE,
    ADD COLUMN IF NOT EXISTS gecerlilik_bitis DATE,
    ADD COLUMN IF NOT EXISTS varsayilan BOOLEAN NOT NULL DEFAULT FALSE;

-- Şablon rotalarda stok opsiyonel olabilir — mevcut NOT NULL korunur;
-- şablon için joker stok yerine sablon=true + aynı operasyon seti kullanılır.

-- ========== İşyeri Depo Stok Kart (Uyumsoft: stok→işyeri→depo bağ) ==========
CREATE TABLE IF NOT EXISTS stok_depo (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    depo_id INT NOT NULL REFERENCES depolar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (stok_id, depo_id)
);

CREATE INDEX IF NOT EXISTS idx_stok_depo_depo ON stok_depo(depo_id);

-- Mevcut hareketlerden görünen stok-depo çiftlerini geri doldur (opsiyonel başlangıç)
INSERT INTO stok_depo (stok_id, depo_id, is_yeri_id, aktif)
SELECT DISTINCT s.stok_id, h.depo_id, h.is_yeri_id, TRUE
FROM stok_hareket_satirlari s
JOIN stok_hareketleri h ON h.id = s.hareket_id
WHERE h.depo_id IS NOT NULL
ON CONFLICT (stok_id, depo_id) DO NOTHING;

-- ========== Belge tipi + numaratör ==========
INSERT INTO belge_tipleri (belge_tipi_kodu, belge_tipi_adi, modul, stok_etkisi)
VALUES
    ('URETIM_EMRI_TIP', 'Üretim Emri Tipi', 'PRD', FALSE),
    ('STOK_DEPO', 'Depo Stok Bağ', 'INV', FALSE)
ON CONFLICT (belge_tipi_kodu) DO NOTHING;

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('URETIM_EMRI_TIP', 'UT', 'Üretim emri tipi', 0, 'uretim-emri-tipleri', 'Üretim Emri Tipleri', TRUE)
ON CONFLICT (seri_kodu) DO NOTHING;
