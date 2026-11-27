-- 018: Parti (lot), stok statüleri, kalite kontrol (GKK/ÇKK), malzeme-depo kuralları,
-- satınalma onay e-posta, emniyet stok / MRP destek alanları

-- ========== Depo rolleri ==========
ALTER TABLE depolar
    ADD COLUMN IF NOT EXISTS depo_rolu VARCHAR(20) NOT NULL DEFAULT 'Normal'
        CHECK (depo_rolu IN ('Normal', 'GKK', 'CKK', 'Hammadde', 'Mamul', 'Bloke'));

-- ========== Stok kartı: parti politikası, KK, varsayılan depolar ==========
ALTER TABLE stoklar
    ADD COLUMN IF NOT EXISTS parti_politika VARCHAR(20) NOT NULL DEFAULT 'Takipsiz'
        CHECK (parti_politika IN ('Zorunlu', 'IstegeBagli', 'Takipsiz')),
    ADD COLUMN IF NOT EXISTS kalite_kontrol_gerekli BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS varsayilan_giris_depo_id INTEGER REFERENCES depolar(id),
    ADD COLUMN IF NOT EXISTS varsayilan_cikis_depo_id INTEGER REFERENCES depolar(id);

-- emniyet_stok zaten 009'da var; yoksa ekle
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stoklar' AND column_name = 'emniyet_stok'
    ) THEN
        ALTER TABLE stoklar ADD COLUMN emniyet_stok NUMERIC(18,4);
    END IF;
END $$;

-- ========== Malzeme-depo: varsayılan bayraklar ==========
ALTER TABLE stok_depo
    ADD COLUMN IF NOT EXISTS varsayilan_giris BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS varsayilan_cikis BOOLEAN NOT NULL DEFAULT FALSE;

-- ========== Parti (lot) ==========
CREATE TABLE IF NOT EXISTS stok_partileri (
    id SERIAL PRIMARY KEY,
    stok_id INTEGER NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    parti_no VARCHAR(60) NOT NULL,
    uretim_tarihi DATE,
    son_kullanma_tarihi DATE,
    kaynak_tipi VARCHAR(40),
    kaynak_id INTEGER,
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (stok_id, parti_no)
);
CREATE INDEX IF NOT EXISTS idx_stok_partileri_stok ON stok_partileri(stok_id);

-- ========== Stok hareket satırı: parti + statü ==========
ALTER TABLE stok_hareket_satirlari
    ADD COLUMN IF NOT EXISTS parti_id INTEGER REFERENCES stok_partileri(id),
    ADD COLUMN IF NOT EXISTS stok_statu VARCHAR(20) NOT NULL DEFAULT 'Kullanilabilir'
        CHECK (stok_statu IN ('Kullanilabilir', 'Kalitede', 'Bloke'));

CREATE INDEX IF NOT EXISTS idx_shs_parti ON stok_hareket_satirlari(parti_id);
CREATE INDEX IF NOT EXISTS idx_shs_statu ON stok_hareket_satirlari(stok_statu);

-- ========== Kalite kontrol tanımları ==========
CREATE TABLE IF NOT EXISTS kk_kontrol_planlari (
    id SERIAL PRIMARY KEY,
    plan_kodu VARCHAR(40) NOT NULL UNIQUE,
    plan_adi VARCHAR(120) NOT NULL,
    yon VARCHAR(10) NOT NULL DEFAULT 'GKK' CHECK (yon IN ('GKK', 'CKK', 'HerIkisi')),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kk_kriterleri (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES kk_kontrol_planlari(id) ON DELETE CASCADE,
    sira_no INTEGER NOT NULL DEFAULT 1,
    kriter_kodu VARCHAR(40) NOT NULL,
    kriter_adi VARCHAR(160) NOT NULL,
    olcum_tipi VARCHAR(20) NOT NULL DEFAULT 'Sayisal'
        CHECK (olcum_tipi IN ('Sayisal', 'Metin', 'EvetHayir')),
    min_deger NUMERIC(18,6),
    max_deger NUMERIC(18,6),
    hedef_deger NUMERIC(18,6),
    birim VARCHAR(20),
    zorunlu BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (plan_id, kriter_kodu)
);

CREATE TABLE IF NOT EXISTS kk_stok_planlari (
    id SERIAL PRIMARY KEY,
    stok_id INTEGER NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES kk_kontrol_planlari(id),
    yon VARCHAR(10) NOT NULL CHECK (yon IN ('GKK', 'CKK')),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (stok_id, yon)
);

CREATE TABLE IF NOT EXISTS kk_ret_nedenleri (
    id SERIAL PRIMARY KEY,
    neden_kodu VARCHAR(40) NOT NULL UNIQUE,
    neden_adi VARCHAR(160) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS kk_emirleri (
    id SERIAL PRIMARY KEY,
    emir_no VARCHAR(40) NOT NULL UNIQUE,
    yon VARCHAR(10) NOT NULL CHECK (yon IN ('GKK', 'CKK')),
    stok_id INTEGER NOT NULL REFERENCES stoklar(id),
    parti_id INTEGER REFERENCES stok_partileri(id),
    depo_id INTEGER NOT NULL REFERENCES depolar(id),
    hedef_depo_id INTEGER REFERENCES depolar(id),
    plan_id INTEGER REFERENCES kk_kontrol_planlari(id),
    miktar NUMERIC(18,4) NOT NULL,
    uygun_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
    uygunsuz_miktar NUMERIC(18,4) NOT NULL DEFAULT 0,
    numune_miktar NUMERIC(18,4),
    durum VARCHAR(20) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Kaydedildi', 'Onayli', 'Red', 'Kismi', 'Iptal')),
    kaynak_tipi VARCHAR(40),
    kaynak_id INTEGER,
    stok_hareket_id INTEGER REFERENCES stok_hareketleri(id),
    transfer_hareket_id INTEGER REFERENCES stok_hareketleri(id),
    onaylayan_id INTEGER REFERENCES kisiler(id),
    onay_tarihi TIMESTAMP,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kk_emir_durum ON kk_emirleri(durum, yon);

CREATE TABLE IF NOT EXISTS kk_olcumler (
    id SERIAL PRIMARY KEY,
    emir_id INTEGER NOT NULL REFERENCES kk_emirleri(id) ON DELETE CASCADE,
    kriter_id INTEGER NOT NULL REFERENCES kk_kriterleri(id),
    olcum_deger VARCHAR(120),
    uygun BOOLEAN,
    aciklama TEXT,
    UNIQUE (emir_id, kriter_id)
);

CREATE TABLE IF NOT EXISTS kk_uygunsuzluklar (
    id SERIAL PRIMARY KEY,
    emir_id INTEGER NOT NULL REFERENCES kk_emirleri(id) ON DELETE CASCADE,
    ret_neden_id INTEGER REFERENCES kk_ret_nedenleri(id),
    miktar NUMERIC(18,4),
    aciklama TEXT,
    duzeltici_faaliyet TEXT,
    durum VARCHAR(20) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Kapali', 'Iptal')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kk_onay_gecmisi (
    id SERIAL PRIMARY KEY,
    emir_id INTEGER NOT NULL REFERENCES kk_emirleri(id) ON DELETE CASCADE,
    islem VARCHAR(20) NOT NULL
        CHECK (islem IN ('Kaydet', 'Onay', 'Red', 'Kismi', 'Duzeltme', 'Iptal')),
    kullanici_id INTEGER REFERENCES kisiler(id),
    kullanici_kodu VARCHAR(40),
    uygun_miktar NUMERIC(18,4),
    uygunsuz_miktar NUMERIC(18,4),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== Satınalma talep: oluşturan + onaylayan ==========
ALTER TABLE satin_alma_talepleri
    ADD COLUMN IF NOT EXISTS olusturan_id INTEGER REFERENCES kisiler(id),
    ADD COLUMN IF NOT EXISTS onaylayan_id INTEGER REFERENCES kisiler(id),
    ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
    ADD COLUMN IF NOT EXISTS tedarikci_cari_id INTEGER REFERENCES cariler(id);

-- ========== E-posta kuyruğu / geçmiş ==========
CREATE TABLE IF NOT EXISTS eposta_gonderimleri (
    id SERIAL PRIMARY KEY,
    kaynak_tipi VARCHAR(40) NOT NULL,
    kaynak_id INTEGER NOT NULL,
    alici VARCHAR(255) NOT NULL,
    konu VARCHAR(255) NOT NULL,
    govde TEXT,
    durum VARCHAR(20) NOT NULL DEFAULT 'Bekliyor'
        CHECK (durum IN ('Bekliyor', 'Gonderildi', 'Basarisiz')),
    deneme_sayisi INTEGER NOT NULL DEFAULT 0,
    son_hata TEXT,
    gonderim_tarihi TIMESTAMP,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_eposta_kaynak ON eposta_gonderimleri(kaynak_tipi, kaynak_id);
CREATE INDEX IF NOT EXISTS idx_eposta_durum ON eposta_gonderimleri(durum);

-- ========== Kullanıcı grubu yetki bayrakları ==========
ALTER TABLE kullanici_gruplari
    ADD COLUMN IF NOT EXISTS satinalma_onay BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS satinalma_talep BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS kalite_kontrol BOOLEAN NOT NULL DEFAULT FALSE;

-- ========== Sistem parametreleri seed (e-posta / depo kuralları) ==========
INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, modul, aciklama)
VALUES
    ('SMTP_HOST', 'SMTP sunucu', '', 'EPOSTA', 'E-posta SMTP host (boşsa gönderim simüle/kuyrukta kalır)'),
    ('SMTP_PORT', 'SMTP port', '587', 'EPOSTA', 'SMTP port'),
    ('SMTP_USER', 'SMTP kullanıcı', '', 'EPOSTA', 'SMTP auth user'),
    ('SMTP_PASS', 'SMTP şifre', '', 'EPOSTA', 'SMTP auth password'),
    ('SMTP_FROM', 'Gönderen e-posta', '', 'EPOSTA', 'From adresi'),
    ('SMTP_SECURE', 'SMTP TLS', 'Hayir', 'EPOSTA', 'Evet=TLS'),
    ('STOK_DEPO_ZORUNLU', 'Malzeme-depo zorunlu', 'Evet', 'STOK', 'Evet ise stok_depo tanımı olmayan depoya giriş/transfer engellenir'),
    ('GKK_DEPO_KODU', 'Varsayılan GKK depo kodu', 'GKK', 'KALITE', 'Kalite giriş deposu'),
    ('CKK_DEPO_KODU', 'Varsayılan ÇKK depo kodu', 'CKK', 'KALITE', 'Kalite çıkış deposu'),
    ('HAMMADDE_DEPO_KODU', 'Varsayılan hammadde depo', 'HAM', 'KALITE', 'GKK onay sonrası hedef'),
    ('MAMUL_DEPO_KODU', 'Varsayılan mamul depo', 'MAM', 'KALITE', 'ÇKK onay sonrası hedef'),
    ('SATINALMA_ONAY_GRUP', 'Satınalma onay grup kodu', 'SATINALMA', 'SATINALMA', 'Onay yetkisi için grup_kodu')
ON CONFLICT (parametre_kodu) DO NOTHING;

-- Kod serileri
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('PARTI', 'LT', 'Stok parti numarası', 0, 'stok-partileri', 'Stok Partileri', TRUE),
    ('KK_PLAN', 'QP', 'Kalite kontrol planı', 0, 'kk-kontrol-planlari', 'KK Kontrol Planları', TRUE),
    ('KK_EMIR', 'QE', 'Kalite kontrol emri', 0, 'kk-emirleri', 'KK Emirleri', TRUE)
ON CONFLICT (seri_kodu) DO NOTHING;

-- Seed: kalite grupları / ret nedenleri / örnek plan
INSERT INTO kullanici_gruplari (grup_kodu, grup_adi, aciklama, aktif, satinalma_onay, satinalma_talep, kalite_kontrol)
VALUES
    ('SATINALMA', 'Satın Alma', 'Satınalma talep onay ve tedarik', TRUE, TRUE, TRUE, FALSE),
    ('KALITE', 'Kalite Kontrol', 'GKK/ÇKK kayıt ve onay', TRUE, FALSE, TRUE, TRUE),
    ('GENEL', 'Genel Kullanıcı', 'Talep oluşturabilir', TRUE, FALSE, TRUE, FALSE)
ON CONFLICT (grup_kodu) DO UPDATE SET
    satinalma_onay = EXCLUDED.satinalma_onay,
    satinalma_talep = EXCLUDED.satinalma_talep,
    kalite_kontrol = EXCLUDED.kalite_kontrol;

INSERT INTO kk_ret_nedenleri (neden_kodu, neden_adi) VALUES
    ('OLCUM', 'Ölçüm dışı'),
    ('HASAR', 'Hasarlı / bozuk'),
    ('EKSIK', 'Eksik doküman'),
    ('DIGER', 'Diğer')
ON CONFLICT (neden_kodu) DO NOTHING;

INSERT INTO kk_kontrol_planlari (plan_kodu, plan_adi, yon, aciklama)
VALUES ('STD-GKK', 'Standart Giriş KK', 'GKK', 'Tedarikçi malı görsel/ölçü kontrolü'),
       ('STD-CKK', 'Standart Çıkış KK', 'CKK', 'Üretim mamul kontrolü')
ON CONFLICT (plan_kodu) DO NOTHING;

INSERT INTO kk_kriterleri (plan_id, sira_no, kriter_kodu, kriter_adi, olcum_tipi, min_deger, max_deger, zorunlu)
SELECT p.id, 1, 'GORSEL', 'Görsel uygunluk', 'EvetHayir', NULL, NULL, TRUE
FROM kk_kontrol_planlari p WHERE p.plan_kodu IN ('STD-GKK', 'STD-CKK')
AND NOT EXISTS (
    SELECT 1 FROM kk_kriterleri k WHERE k.plan_id = p.id AND k.kriter_kodu = 'GORSEL'
);

INSERT INTO kk_kriterleri (plan_id, sira_no, kriter_kodu, kriter_adi, olcum_tipi, min_deger, max_deger, birim, zorunlu)
SELECT p.id, 2, 'OLCU', 'Ölçü kontrolü', 'Sayisal', 0, 999999, 'mm', FALSE
FROM kk_kontrol_planlari p WHERE p.plan_kodu IN ('STD-GKK', 'STD-CKK')
AND NOT EXISTS (
    SELECT 1 FROM kk_kriterleri k WHERE k.plan_id = p.id AND k.kriter_kodu = 'OLCU'
);
