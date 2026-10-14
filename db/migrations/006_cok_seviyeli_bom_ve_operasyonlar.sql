-- Çok seviyeli ürün ağacı + rota/iş emri operasyon sırası

-- İş emrinde yarı mamul deposu ayrımı
ALTER TABLE uretim_emirleri
    ADD COLUMN IF NOT EXISTS yari_mamul_depo_id INT REFERENCES depolar(id);

-- BOM satırında hiyerarşi (üst satır = yarı mamul satırı, alt = hammadde)
ALTER TABLE urun_agaci_satirlari
    ADD COLUMN IF NOT EXISTS ust_satir_id INT REFERENCES urun_agaci_satirlari(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bom_satir_ust ON urun_agaci_satirlari(ust_satir_id);

-- Rota operasyonuna çıktı stoğu ve sonraki operasyon sırası
ALTER TABLE rota_operasyonlari
    ADD COLUMN IF NOT EXISTS cikti_stok_id INT REFERENCES stoklar(id);

ALTER TABLE rota_operasyonlari
    ADD COLUMN IF NOT EXISTS sonraki_sira_no INT;

-- Operasyonda kullanılan bileşenler
CREATE TABLE IF NOT EXISTS rota_operasyon_bilesenleri (
    id SERIAL PRIMARY KEY,
    operasyon_id INT NOT NULL REFERENCES rota_operasyonlari(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(12, 3) NOT NULL CHECK (miktar > 0),
    birim VARCHAR(50),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- İş emri operasyon adımları (rotadan kopyalanır)
CREATE TABLE IF NOT EXISTS uretim_emri_operasyonlari (
    id SERIAL PRIMARY KEY,
    emir_id INT NOT NULL REFERENCES uretim_emirleri(id) ON DELETE CASCADE,
    sira_no INT NOT NULL,
    operasyon_kodu VARCHAR(50) NOT NULL,
    operasyon_adi VARCHAR(255) NOT NULL,
    is_merkezi_id INT REFERENCES is_merkezleri(id),
    cikti_stok_id INT REFERENCES stoklar(id),
    sonraki_sira_no INT,
    planlanan_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    uretilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    durum VARCHAR(30) NOT NULL DEFAULT 'Bekliyor',
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ueo_durum CHECK (durum IN ('Bekliyor', 'Hazir', 'Tamamlandi', 'Atlandi')),
    UNIQUE (emir_id, sira_no)
);

CREATE TABLE IF NOT EXISTS uretim_emri_operasyon_bilesenleri (
    id SERIAL PRIMARY KEY,
    operasyon_id INT NOT NULL REFERENCES uretim_emri_operasyonlari(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    planlanan_miktar NUMERIC(12, 3) NOT NULL,
    tuketilen_miktar NUMERIC(12, 3) NOT NULL DEFAULT 0,
    birim VARCHAR(50),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ueo_emir ON uretim_emri_operasyonlari(emir_id);
