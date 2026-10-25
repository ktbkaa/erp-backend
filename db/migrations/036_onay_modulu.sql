-- Onay Yönetimi (v1)
-- Canias tarzı menüden sadeleştirilmiş: durum, rol, rota(+adım), mesaj şablon,
-- modül kullanımı, yetki devri, onay kaydı(+adım).
-- Ayrı «Onay Kuralı / Rota Tasarım / Otomatik gönderim» ekranları rota + modül
-- kullanımına katlandı; üzerine çalışılacak omurga.

-- ========== Durum tanımları ==========
CREATE TABLE IF NOT EXISTS onay_durumlari (
    id SERIAL PRIMARY KEY,
    durum_kodu VARCHAR(40) UNIQUE NOT NULL,
    durum_adi VARCHAR(120) NOT NULL,
    sira_no INT NOT NULL DEFAULT 10,
    nihai BOOLEAN NOT NULL DEFAULT FALSE,
    olumlu BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO onay_durumlari (durum_kodu, durum_adi, sira_no, nihai, olumlu) VALUES
    ('TASLAK', 'Taslak', 5, FALSE, FALSE),
    ('BEKLIYOR', 'Onay bekliyor', 10, FALSE, FALSE),
    ('ONAYLANDI', 'Onaylandı', 90, TRUE, TRUE),
    ('REDDEDILDI', 'Reddedildi', 91, TRUE, FALSE),
    ('IPTAL', 'İptal', 92, TRUE, FALSE),
    ('DEVREDILDI', 'Devredildi', 40, FALSE, FALSE)
ON CONFLICT (durum_kodu) DO NOTHING;

-- ========== Roller (+ üyeler) ==========
CREATE TABLE IF NOT EXISTS onay_rolleri (
    id SERIAL PRIMARY KEY,
    rol_kodu VARCHAR(40) UNIQUE NOT NULL,
    rol_adi VARCHAR(120) NOT NULL,
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onay_rol_uyeleri (
    id SERIAL PRIMARY KEY,
    rol_id INT NOT NULL REFERENCES onay_rolleri(id) ON DELETE CASCADE,
    kisi_id INT REFERENCES kisiler(id) ON DELETE CASCADE,
    grup_kodu VARCHAR(40),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (kisi_id IS NOT NULL OR grup_kodu IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_onay_rol_uyeleri_rol ON onay_rol_uyeleri(rol_id);
CREATE INDEX IF NOT EXISTS idx_onay_rol_uyeleri_kisi ON onay_rol_uyeleri(kisi_id);

INSERT INTO onay_rolleri (rol_kodu, rol_adi, aciklama) VALUES
    ('SA_MUDUR', 'Satınalma Müdürü', 'Satınalma talebi / sipariş onayı'),
    ('FINANS', 'Finans Onayı', 'Tutar eşiği üzeri finans onayı'),
    ('GM', 'Genel Müdür', 'Üst seviye onay'),
    ('URETIM_PLAN', 'Üretim Planlama', 'Üretim emri / plan onayı')
ON CONFLICT (rol_kodu) DO NOTHING;

-- ========== Rota (+ adımlar = tasarım) ==========
CREATE TABLE IF NOT EXISTS onay_rotalari (
    id SERIAL PRIMARY KEY,
    rota_kodu VARCHAR(40) UNIQUE NOT NULL,
    rota_adi VARCHAR(160) NOT NULL,
    aciklama TEXT,
    firma_id INT REFERENCES firmalar(id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onay_rota_adimlari (
    id SERIAL PRIMARY KEY,
    rota_id INT NOT NULL REFERENCES onay_rotalari(id) ON DELETE CASCADE,
    sira_no INT NOT NULL DEFAULT 10,
    adim_adi VARCHAR(120) NOT NULL,
    rol_id INT NOT NULL REFERENCES onay_rolleri(id),
    zorunlu BOOLEAN NOT NULL DEFAULT TRUE,
    paralel BOOLEAN NOT NULL DEFAULT FALSE,
    min_tutar NUMERIC(18, 2),
    aciklama TEXT,
    UNIQUE (rota_id, sira_no)
);

CREATE INDEX IF NOT EXISTS idx_onay_rota_adimlari_rota ON onay_rota_adimlari(rota_id);

-- ========== Mesaj şablonları ==========
CREATE TABLE IF NOT EXISTS onay_mesaj_sablonlari (
    id SERIAL PRIMARY KEY,
    sablon_kodu VARCHAR(40) UNIQUE NOT NULL,
    sablon_adi VARCHAR(160) NOT NULL,
    olay VARCHAR(40) NOT NULL DEFAULT 'Bekleme'
        CHECK (olay IN ('Bekleme', 'Onay', 'Red', 'Devret', 'Iptal', 'Tamam')),
    konu VARCHAR(200),
    govde TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO onay_mesaj_sablonlari (sablon_kodu, sablon_adi, olay, konu, govde) VALUES
    ('ONAY_BEKLEME', 'Onay bekliyor bildirimi', 'Bekleme',
     'Onay bekleyen belge: {{belge_no}}',
     'Sayın {{onayci}}, {{modul}} belgesi {{belge_no}} onayınızı bekliyor. Tutar: {{tutar}}.'),
    ('ONAY_TAMAM', 'Onay tamamlandı', 'Tamam',
     'Belge onaylandı: {{belge_no}}',
     '{{belge_no}} numaralı {{modul}} belgesi onay sürecini tamamladı.'),
    ('ONAY_RED', 'Onay reddedildi', 'Red',
     'Belge reddedildi: {{belge_no}}',
     '{{belge_no}} reddedildi. Gerekçe: {{gerekce}}.')
ON CONFLICT (sablon_kodu) DO NOTHING;

-- ========== Modül kullanımı (+ otomatik gönder / min tutar kuralı) ==========
CREATE TABLE IF NOT EXISTS onay_modul_kullanimlari (
    id SERIAL PRIMARY KEY,
    kullanim_kodu VARCHAR(40) UNIQUE NOT NULL,
    kullanim_adi VARCHAR(160) NOT NULL,
    modul_kodu VARCHAR(40) NOT NULL,
    ekran_id VARCHAR(80) NOT NULL,
    rota_id INT NOT NULL REFERENCES onay_rotalari(id),
    firma_id INT REFERENCES firmalar(id),
    min_tutar NUMERIC(18, 2) DEFAULT 0,
    otomatik_gonder BOOLEAN NOT NULL DEFAULT FALSE,
    sablon_id INT REFERENCES onay_mesaj_sablonlari(id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onay_modul_ekran ON onay_modul_kullanimlari(ekran_id);

-- ========== Yetki devri ==========
CREATE TABLE IF NOT EXISTS onay_yetki_devirleri (
    id SERIAL PRIMARY KEY,
    devir_kodu VARCHAR(40) UNIQUE NOT NULL,
    veren_kisi_id INT NOT NULL REFERENCES kisiler(id),
    alan_kisi_id INT NOT NULL REFERENCES kisiler(id),
    rol_id INT REFERENCES onay_rolleri(id),
    baslangic_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    bitis_tarihi DATE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (veren_kisi_id <> alan_kisi_id)
);

CREATE INDEX IF NOT EXISTS idx_onay_devir_alan ON onay_yetki_devirleri(alan_kisi_id, aktif);

-- ========== Onay kaydı (örnek / işlem omurgası) ==========
CREATE TABLE IF NOT EXISTS onay_kayitlari (
    id SERIAL PRIMARY KEY,
    onay_no VARCHAR(40) UNIQUE NOT NULL,
    kullanim_id INT REFERENCES onay_modul_kullanimlari(id),
    rota_id INT NOT NULL REFERENCES onay_rotalari(id),
    firma_id INT REFERENCES firmalar(id),
    modul_kodu VARCHAR(40) NOT NULL,
    ekran_id VARCHAR(80) NOT NULL,
    belge_id INT,
    belge_no VARCHAR(60),
    belge_ozet VARCHAR(240),
    tutar NUMERIC(18, 2) DEFAULT 0,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    durum_kodu VARCHAR(40) NOT NULL DEFAULT 'BEKLIYOR'
        REFERENCES onay_durumlari(durum_kodu),
    aktif_adim_sira INT,
    baslatan_kisi_id INT REFERENCES kisiler(id),
    baslama_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    kapanis_tarihi TIMESTAMP,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onay_kayit_durum ON onay_kayitlari(durum_kodu);
CREATE INDEX IF NOT EXISTS idx_onay_kayit_modul ON onay_kayitlari(modul_kodu, belge_id);
CREATE INDEX IF NOT EXISTS idx_onay_kayit_firma ON onay_kayitlari(firma_id);

CREATE TABLE IF NOT EXISTS onay_kayit_adimlari (
    id SERIAL PRIMARY KEY,
    kayit_id INT NOT NULL REFERENCES onay_kayitlari(id) ON DELETE CASCADE,
    sira_no INT NOT NULL,
    adim_adi VARCHAR(120) NOT NULL,
    rol_id INT NOT NULL REFERENCES onay_rolleri(id),
    durum_kodu VARCHAR(40) NOT NULL DEFAULT 'BEKLIYOR'
        REFERENCES onay_durumlari(durum_kodu),
    zorunlu BOOLEAN NOT NULL DEFAULT TRUE,
    onaylayan_kisi_id INT REFERENCES kisiler(id),
    islem_tarihi TIMESTAMP,
    notlar TEXT,
    UNIQUE (kayit_id, sira_no)
);

CREATE INDEX IF NOT EXISTS idx_onay_kayit_adim_kayit ON onay_kayit_adimlari(kayit_id);
CREATE INDEX IF NOT EXISTS idx_onay_kayit_adim_durum ON onay_kayit_adimlari(durum_kodu, rol_id);

-- ========== Kod serileri ==========
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, ekran_kodu, ekran_adi, son_numara, aktif)
VALUES
    ('ONAY_ROTA', 'NR', 'Onay rotası', 'onay-rota-tanim', 'Onay Rotası', 0, TRUE),
    ('ONAY_ROL', 'NL', 'Onay rolü', 'onay-rol-tanim', 'Onay Rolü', 0, TRUE),
    ('ONAY_SABLON', 'NS', 'Onay mesaj şablonu', 'onay-mesaj-sablon', 'Onay Mesaj Şablonu', 0, TRUE),
    ('ONAY_KULLANIM', 'NM', 'Onay modül kullanımı', 'onay-modul-kullanim', 'Onay Modül Kullanımı', 0, TRUE),
    ('ONAY_DEVIR', 'NV', 'Onay yetki devri', 'onay-yetki-devri', 'Onay Yetki Devri', 0, TRUE),
    ('ONAY_KAYIT', 'NK', 'Onay kaydı', 'onaylarim', 'Onaylarım', 0, TRUE)
ON CONFLICT (seri_kodu) DO NOTHING;

-- Örnek rota: Satınalma talebi (SA müdür → tutarlıysa finans)
INSERT INTO onay_rotalari (rota_kodu, rota_adi, aciklama)
SELECT 'OR-SA-TALEP', 'Satınalma talep rotası', 'Önce satınalma müdürü, yüksek tutarda finans'
WHERE NOT EXISTS (SELECT 1 FROM onay_rotalari WHERE rota_kodu = 'OR-SA-TALEP');

INSERT INTO onay_rota_adimlari (rota_id, sira_no, adim_adi, rol_id, zorunlu, min_tutar)
SELECT r.id, 10, 'Satınalma müdürü onayı', rol.id, TRUE, NULL
FROM onay_rotalari r
JOIN onay_rolleri rol ON rol.rol_kodu = 'SA_MUDUR'
WHERE r.rota_kodu = 'OR-SA-TALEP'
  AND NOT EXISTS (
      SELECT 1 FROM onay_rota_adimlari a WHERE a.rota_id = r.id AND a.sira_no = 10
  );

INSERT INTO onay_rota_adimlari (rota_id, sira_no, adim_adi, rol_id, zorunlu, min_tutar)
SELECT r.id, 20, 'Finans onayı (eşik üzeri)', rol.id, TRUE, 50000
FROM onay_rotalari r
JOIN onay_rolleri rol ON rol.rol_kodu = 'FINANS'
WHERE r.rota_kodu = 'OR-SA-TALEP'
  AND NOT EXISTS (
      SELECT 1 FROM onay_rota_adimlari a WHERE a.rota_id = r.id AND a.sira_no = 20
  );

INSERT INTO onay_modul_kullanimlari (
    kullanim_kodu, kullanim_adi, modul_kodu, ekran_id, rota_id, min_tutar, otomatik_gonder, aciklama
)
SELECT
    'OM-SA-TALEP',
    'Satınalma talebi onayı',
    'Satinalma',
    'satin-alma-talepleri',
    r.id,
    0,
    FALSE,
    'Talep Onayla yerine merkezi onay rotasına bağlanabilir (sonraki iterasyon)'
FROM onay_rotalari r
WHERE r.rota_kodu = 'OR-SA-TALEP'
  AND NOT EXISTS (SELECT 1 FROM onay_modul_kullanimlari WHERE kullanim_kodu = 'OM-SA-TALEP');
