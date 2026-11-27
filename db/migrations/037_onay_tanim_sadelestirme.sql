-- Onay tanımları v2 — kullanıcı geri bildirimleri
-- 1) Rol: kişi + rol adı + firma + iş yeri (üye grid yok)
-- 2) Kural: ekran + mesaj şablonu + kullanıcı dostu koşullar
-- 3) Rota: kural/ekran bağları + adımda mail/geri gönder vb.

-- ========== Rol: düz kayıt ==========
ALTER TABLE onay_rolleri ADD COLUMN IF NOT EXISTS kisi_id INT REFERENCES kisiler(id);
ALTER TABLE onay_rolleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);
ALTER TABLE onay_rolleri ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id);

-- Eski üye satırlarını kişi bazlı rol kayıtlarına taşı
INSERT INTO onay_rolleri (rol_kodu, rol_adi, kisi_id, aktif, aciklama)
SELECT
    LEFT(r.rol_kodu || '-K' || u.kisi_id::text, 40),
    r.rol_adi,
    u.kisi_id,
    COALESCE(u.aktif, TRUE),
    'üyeden taşındı'
FROM onay_rol_uyeleri u
JOIN onay_rolleri r ON r.id = u.rol_id
WHERE u.kisi_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM onay_rolleri x
      WHERE x.kisi_id = u.kisi_id AND x.rol_adi = r.rol_adi
  );

DROP TABLE IF EXISTS onay_rol_uyeleri CASCADE;

-- Seed rollerine örnek kişi bağla (yönetici)
UPDATE onay_rolleri r SET
    kisi_id = COALESCE(r.kisi_id, (SELECT id FROM kisiler WHERE kullanici_adi = 'kagantalha.b' LIMIT 1)),
    firma_id = COALESCE(r.firma_id, 2),
    is_yeri_id = COALESCE(r.is_yeri_id, (SELECT id FROM is_yerleri WHERE firma_id = 2 ORDER BY id LIMIT 1))
WHERE r.kisi_id IS NULL
  AND r.rol_kodu IN ('SA_MUDUR', 'FINANS', 'GM', 'URETIM_PLAN');

CREATE INDEX IF NOT EXISTS idx_onay_rolleri_kisi ON onay_rolleri(kisi_id);
CREATE INDEX IF NOT EXISTS idx_onay_rolleri_adi ON onay_rolleri(rol_adi);

-- ========== Kural (eski modül kullanımı yerine) ==========
CREATE TABLE IF NOT EXISTS onay_kurallari (
    id SERIAL PRIMARY KEY,
    kural_kodu VARCHAR(40) UNIQUE NOT NULL,
    kural_adi VARCHAR(160) NOT NULL,
    sira_no INT NOT NULL DEFAULT 10,
    firma_id INT REFERENCES firmalar(id),
    is_yeri_id INT REFERENCES is_yerleri(id),
    ekran_id VARCHAR(80) NOT NULL,
    sablon_id INT REFERENCES onay_mesaj_sablonlari(id),
    -- Kullanıcı dostu koşullar (VE mantığı)
    kosul_yon VARCHAR(20) NOT NULL DEFAULT 'Hepsi'
        CHECK (kosul_yon IN ('Hepsi', 'Alis', 'Satis')),
    kosul_min_tutar NUMERIC(18, 2),
    kosul_max_tutar NUMERIC(18, 2),
    kosul_durumlar TEXT,
    otomatik_onay BOOLEAN NOT NULL DEFAULT FALSE,
    onaylaninca_aktif BOOLEAN NOT NULL DEFAULT TRUE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onay_kural_hareketleri (
    id SERIAL PRIMARY KEY,
    kural_id INT NOT NULL REFERENCES onay_kurallari(id) ON DELETE CASCADE,
    hareket_kodu_id INT REFERENCES hareket_kodlari(id),
    hareket_kodu VARCHAR(40),
    UNIQUE (kural_id, hareket_kodu)
);

CREATE INDEX IF NOT EXISTS idx_onay_kurallari_ekran ON onay_kurallari(ekran_id, sira_no);

-- Eski modül kullanımlarından kural üret
INSERT INTO onay_kurallari (
    kural_kodu, kural_adi, sira_no, firma_id, ekran_id, sablon_id,
    kosul_min_tutar, otomatik_onay, aktif, aciklama
)
SELECT
    m.kullanim_kodu,
    m.kullanim_adi,
    10,
    m.firma_id,
    m.ekran_id,
    m.sablon_id,
    NULLIF(m.min_tutar, 0),
    COALESCE(m.otomatik_gonder, FALSE),
    m.aktif,
    m.aciklama
FROM onay_modul_kullanimlari m
WHERE NOT EXISTS (
    SELECT 1 FROM onay_kurallari k WHERE k.kural_kodu = m.kullanim_kodu
);

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, ekran_kodu, ekran_adi, son_numara, aktif)
VALUES ('ONAY_KURAL', 'NKR', 'Onay kuralı', 'onay-kural-tanim', 'Onay Kuralı', 0, TRUE)
ON CONFLICT (seri_kodu) DO NOTHING;

-- ========== Rota başlık zenginleştirme ==========
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS ekran_id VARCHAR(80);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS kural_id INT REFERENCES onay_kurallari(id);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS versiyon INT NOT NULL DEFAULT 1;
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS ilk_mesaj_sablon_id INT REFERENCES onay_mesaj_sablonlari(id);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS red_mesaj_sablon_id INT REFERENCES onay_mesaj_sablonlari(id);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS ekstra_mesaj_sablon_id INT REFERENCES onay_mesaj_sablonlari(id);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS iptal_rol_adi VARCHAR(120);
ALTER TABLE onay_rotalari ADD COLUMN IF NOT EXISTS ekli_dosya_mail BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE onay_rotalari r SET
    ekran_id = COALESCE(r.ekran_id, k.ekran_id),
    kural_id = COALESCE(r.kural_id, k.id)
FROM onay_kurallari k
WHERE k.kural_kodu = 'OM-SA-TALEP'
  AND r.rota_kodu = 'OR-SA-TALEP';

-- ========== Rota adımları ==========
ALTER TABLE onay_rota_adimlari ADD COLUMN IF NOT EXISTS rol_adi VARCHAR(120);
ALTER TABLE onay_rota_adimlari ADD COLUMN IF NOT EXISTS mail_gonder BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE onay_rota_adimlari ADD COLUMN IF NOT EXISTS sms_gonder BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE onay_rota_adimlari ADD COLUMN IF NOT EXISTS deger_degistirebilir BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE onay_rota_adimlari ADD COLUMN IF NOT EXISTS geri_gonder_sira INT;

UPDATE onay_rota_adimlari a SET
    rol_adi = COALESCE(a.rol_adi, r.rol_adi)
FROM onay_rolleri r
WHERE r.id = a.rol_id AND a.rol_adi IS NULL;

-- rol_id artık zorunlu değil (rol adı ile eşleşir)
ALTER TABLE onay_rota_adimlari ALTER COLUMN rol_id DROP NOT NULL;

-- ========== Kayıt adımları: rol_adi ==========
ALTER TABLE onay_kayit_adimlari ADD COLUMN IF NOT EXISTS rol_adi VARCHAR(120);
UPDATE onay_kayit_adimlari a SET
    rol_adi = COALESCE(a.rol_adi, r.rol_adi)
FROM onay_rolleri r
WHERE r.id = a.rol_id AND a.rol_adi IS NULL;
ALTER TABLE onay_kayit_adimlari ALTER COLUMN rol_id DROP NOT NULL;

-- Kayıt → kural bağlantısı
ALTER TABLE onay_kayitlari ADD COLUMN IF NOT EXISTS kural_id INT REFERENCES onay_kurallari(id);
