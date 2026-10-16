-- CRM modülü (Uyumsoft CRM eğitim dokümanlarından Canias mimarisine uyarlama)
-- Mevcut cari / satış teklifi / kişi omurgasına bağlanır; cari kartı kopyalanmaz.

-- ========== Parametre: Fırsat aşamaları ==========
CREATE TABLE IF NOT EXISTS crm_firsat_asamalari (
    id SERIAL PRIMARY KEY,
    asama_kodu VARCHAR(40) UNIQUE NOT NULL,
    asama_adi VARCHAR(120) NOT NULL,
    sira_no INT NOT NULL DEFAULT 10,
    kazanan BOOLEAN NOT NULL DEFAULT FALSE,
    kaybeden BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO crm_firsat_asamalari (asama_kodu, asama_adi, sira_no, kazanan, kaybeden) VALUES
    ('YENI', 'Yeni', 10, FALSE, FALSE),
    ('ILETISIM', 'İletişim', 20, FALSE, FALSE),
    ('TEKLIF', 'Teklif', 30, FALSE, FALSE),
    ('MUZAKERE', 'Müzakere', 40, FALSE, FALSE),
    ('KAZANILDI', 'Kazanıldı', 90, TRUE, FALSE),
    ('KAYBEDILDI', 'Kaybedildi', 95, FALSE, TRUE)
ON CONFLICT (asama_kodu) DO NOTHING;

-- ========== Parametre: Faaliyet tipleri ==========
CREATE TABLE IF NOT EXISTS crm_faaliyet_tipleri (
    id SERIAL PRIMARY KEY,
    tip_kodu VARCHAR(40) UNIQUE NOT NULL,
    tip_adi VARCHAR(120) NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO crm_faaliyet_tipleri (tip_kodu, tip_adi) VALUES
    ('ZIYARET', 'Ziyaret'),
    ('TELEFON', 'Telefon'),
    ('EPOSTA', 'E-posta'),
    ('TOPLANTI', 'Toplantı'),
    ('DIGER', 'Diğer')
ON CONFLICT (tip_kodu) DO NOTHING;

-- ========== Müşteri adayları (lead) ==========
CREATE TABLE IF NOT EXISTS crm_adaylar (
    id SERIAL PRIMARY KEY,
    aday_kodu VARCHAR(40) UNIQUE NOT NULL,
    aday_adi VARCHAR(200) NOT NULL,
    durum VARCHAR(30) NOT NULL DEFAULT 'Yeni'
        CHECK (durum IN ('Yeni', 'Nitelikli', 'Kazanildi', 'Kaybedildi', 'Donusturuldu')),
    sorumlu_id INT REFERENCES kisiler(id),
    degerlendirme NUMERIC(5, 2),
    tercih_sebebi VARCHAR(200),
    bulma_yontemi VARCHAR(120),
    oncelik VARCHAR(40),
    telefon VARCHAR(40),
    cep_tel VARCHAR(40),
    email VARCHAR(120),
    website VARCHAR(200),
    fax VARCHAR(40),
    adres TEXT,
    il VARCHAR(80),
    ilce VARCHAR(80),
    ulke VARCHAR(80) DEFAULT 'Türkiye',
    posta_kodu VARCHAR(20),
    sektor_kodu VARCHAR(40),
    notlar TEXT,
    cari_id INT REFERENCES cariler(id),
    donusum_tarihi TIMESTAMP,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_adaylar_durum ON crm_adaylar(durum);
CREATE INDEX IF NOT EXISTS idx_crm_adaylar_sorumlu ON crm_adaylar(sorumlu_id);

-- ========== Kontaklar (cari veya aday) ==========
CREATE TABLE IF NOT EXISTS crm_kontaklar (
    id SERIAL PRIMARY KEY,
    kontak_kodu VARCHAR(40) UNIQUE NOT NULL,
    ad VARCHAR(80) NOT NULL,
    soyad VARCHAR(80) NOT NULL,
    unvan VARCHAR(120),
    email VARCHAR(120),
    telefon VARCHAR(40),
    cep_tel VARCHAR(40),
    cari_id INT REFERENCES cariler(id) ON DELETE CASCADE,
    aday_id INT REFERENCES crm_adaylar(id) ON DELETE CASCADE,
    birincil BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    notlar TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (cari_id IS NOT NULL OR aday_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_crm_kontaklar_cari ON crm_kontaklar(cari_id);
CREATE INDEX IF NOT EXISTS idx_crm_kontaklar_aday ON crm_kontaklar(aday_id);

-- ========== Fırsatlar ==========
CREATE TABLE IF NOT EXISTS crm_firsatlar (
    id SERIAL PRIMARY KEY,
    firsat_kodu VARCHAR(40) UNIQUE NOT NULL,
    firsat_adi VARCHAR(200) NOT NULL,
    konu VARCHAR(200),
    musteri_tipi VARCHAR(20) NOT NULL DEFAULT 'Musteri'
        CHECK (musteri_tipi IN ('Musteri', 'Aday')),
    cari_id INT REFERENCES cariler(id),
    aday_id INT REFERENCES crm_adaylar(id),
    asama_id INT NOT NULL REFERENCES crm_firsat_asamalari(id),
    olusturan_id INT REFERENCES kisiler(id),
    takip_eden_id INT REFERENCES kisiler(id),
    beklenen_gelir NUMERIC(18, 2) DEFAULT 0,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    degerlendirme NUMERIC(5, 2),
    hedef_kapatma_tarihi DATE,
    kapatma_tarihi DATE,
    kapanis_nedeni TEXT,
    ulke VARCHAR(80) DEFAULT 'Türkiye',
    is_yeri_id INT REFERENCES is_yerleri(id),
    aciklama TEXT,
    durum VARCHAR(20) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Kazanildi', 'Kaybedildi', 'Iptal')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (musteri_tipi = 'Musteri' AND cari_id IS NOT NULL)
        OR (musteri_tipi = 'Aday' AND aday_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_crm_firsatlar_cari ON crm_firsatlar(cari_id);
CREATE INDEX IF NOT EXISTS idx_crm_firsatlar_aday ON crm_firsatlar(aday_id);
CREATE INDEX IF NOT EXISTS idx_crm_firsatlar_asama ON crm_firsatlar(asama_id);

CREATE TABLE IF NOT EXISTS crm_firsat_satirlari (
    id SERIAL PRIMARY KEY,
    firsat_id INT NOT NULL REFERENCES crm_firsatlar(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 1,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(14, 3) NOT NULL DEFAULT 1,
    birim VARCHAR(20),
    birim_fiyat NUMERIC(18, 4) DEFAULT 0,
    tutar NUMERIC(18, 2) DEFAULT 0,
    aciklama TEXT
);

CREATE INDEX IF NOT EXISTS idx_crm_firsat_satirlari_firsat ON crm_firsat_satirlari(firsat_id);

-- ========== Faaliyet planları ==========
CREATE TABLE IF NOT EXISTS crm_faaliyet_planlari (
    id SERIAL PRIMARY KEY,
    plan_kodu VARCHAR(40) UNIQUE NOT NULL,
    musteri_tipi VARCHAR(20) NOT NULL DEFAULT 'Musteri'
        CHECK (musteri_tipi IN ('Musteri', 'Aday')),
    cari_id INT REFERENCES cariler(id),
    aday_id INT REFERENCES crm_adaylar(id),
    firsat_id INT REFERENCES crm_firsatlar(id),
    kontak_id INT REFERENCES crm_kontaklar(id),
    faaliyet_tipi_id INT REFERENCES crm_faaliyet_tipleri(id),
    giren_id INT REFERENCES kisiler(id),
    yapacak_id INT REFERENCES kisiler(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    baslangic_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bitis_tarihi TIMESTAMP,
    durum VARCHAR(30) NOT NULL DEFAULT 'Planlandi'
        CHECK (durum IN ('Planlandi', 'Devam', 'Tamamlandi', 'Iptal')),
    konu VARCHAR(200),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_plan_firsat ON crm_faaliyet_planlari(firsat_id);
CREATE INDEX IF NOT EXISTS idx_crm_plan_cari ON crm_faaliyet_planlari(cari_id);

-- ========== Faaliyetler (gerçekleşen) ==========
CREATE TABLE IF NOT EXISTS crm_faaliyetler (
    id SERIAL PRIMARY KEY,
    faaliyet_kodu VARCHAR(40) UNIQUE NOT NULL,
    musteri_tipi VARCHAR(20) NOT NULL DEFAULT 'Musteri'
        CHECK (musteri_tipi IN ('Musteri', 'Aday')),
    cari_id INT REFERENCES cariler(id),
    aday_id INT REFERENCES crm_adaylar(id),
    firsat_id INT REFERENCES crm_firsatlar(id),
    plan_id INT REFERENCES crm_faaliyet_planlari(id),
    kontak_id INT REFERENCES crm_kontaklar(id),
    faaliyet_tipi_id INT REFERENCES crm_faaliyet_tipleri(id),
    giren_id INT REFERENCES kisiler(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    baslangic_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bitis_tarihi TIMESTAMP,
    harcanan_dk INT DEFAULT 0,
    konu VARCHAR(200),
    aciklama TEXT,
    degerlendirme VARCHAR(200),
    durum VARCHAR(30) NOT NULL DEFAULT 'Tamamlandi'
        CHECK (durum IN ('Acik', 'Devam', 'Tamamlandi', 'Iptal')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_faaliyet_firsat ON crm_faaliyetler(firsat_id);
CREATE INDEX IF NOT EXISTS idx_crm_faaliyet_cari ON crm_faaliyetler(cari_id);
CREATE INDEX IF NOT EXISTS idx_crm_faaliyet_aday ON crm_faaliyetler(aday_id);

-- ========== Görevler (profesyonel CRM olmazsa olmaz; dokümanda ayrı ekran yok) ==========
CREATE TABLE IF NOT EXISTS crm_gorevler (
    id SERIAL PRIMARY KEY,
    gorev_kodu VARCHAR(40) UNIQUE NOT NULL,
    baslik VARCHAR(200) NOT NULL,
    aciklama TEXT,
    sorumlu_id INT REFERENCES kisiler(id),
    cari_id INT REFERENCES cariler(id),
    aday_id INT REFERENCES crm_adaylar(id),
    firsat_id INT REFERENCES crm_firsatlar(id),
    faaliyet_id INT REFERENCES crm_faaliyetler(id),
    oncelik VARCHAR(20) NOT NULL DEFAULT 'Normal'
        CHECK (oncelik IN ('Dusuk', 'Normal', 'Yuksek', 'Kritik')),
    durum VARCHAR(30) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Devam', 'Tamamlandi', 'Iptal')),
    son_tarih DATE,
    tamamlanma_tarihi TIMESTAMP,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_gorev_sorumlu ON crm_gorevler(sorumlu_id);
CREATE INDEX IF NOT EXISTS idx_crm_gorev_durum ON crm_gorevler(durum);

-- ========== Satış teklifi ← fırsat / aday bağ ==========
ALTER TABLE satis_teklifleri
    ADD COLUMN IF NOT EXISTS firsat_id INT REFERENCES crm_firsatlar(id),
    ADD COLUMN IF NOT EXISTS aday_id INT REFERENCES crm_adaylar(id);

CREATE INDEX IF NOT EXISTS idx_satis_teklif_firsat ON satis_teklifleri(firsat_id);

-- ========== Belge tipi + numaratör ==========
INSERT INTO belge_tipleri (belge_tipi_kodu, belge_tipi_adi, modul, stok_etkisi) VALUES
    ('CRM_ADAY', 'CRM Müşteri Adayı', 'CRM', FALSE),
    ('CRM_FIRSAT', 'CRM Fırsat', 'CRM', FALSE),
    ('CRM_FAALIYET', 'CRM Faaliyet', 'CRM', FALSE),
    ('CRM_PLAN', 'CRM Faaliyet Planı', 'CRM', FALSE),
    ('CRM_KONTAK', 'CRM Kontak', 'CRM', FALSE),
    ('CRM_GOREV', 'CRM Görev', 'CRM', FALSE)
ON CONFLICT (belge_tipi_kodu) DO NOTHING;

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif) VALUES
    ('CRM_ADAY', 'AD', 'CRM müşteri adayı', 0, 'crm-adaylar', 'Müşteri Adayları', TRUE),
    ('CRM_FIRSAT', 'FS', 'CRM fırsat', 0, 'crm-firsatlar', 'Fırsatlar', TRUE),
    ('CRM_FAALIYET', 'FY', 'CRM faaliyet', 0, 'crm-faaliyetler', 'Faaliyetler', TRUE),
    ('CRM_PLAN', 'FP', 'CRM faaliyet planı', 0, 'crm-faaliyet-planlari', 'Faaliyet Planları', TRUE),
    ('CRM_KONTAK', 'KK', 'CRM kontak', 0, 'crm-kontaklar', 'Kontaklar', TRUE),
    ('CRM_GOREV', 'GR', 'CRM görev', 0, 'crm-gorevler', 'Görevler', TRUE)
ON CONFLICT (seri_kodu) DO NOTHING;
