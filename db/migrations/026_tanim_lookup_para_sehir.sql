-- Para birimi / şehir (il) / ilçe tanımları + mevcut serbest metin ülke adlarını koda çevirme

CREATE TABLE IF NOT EXISTS para_birimleri (
    id SERIAL PRIMARY KEY,
    pb_kodu VARCHAR(10) UNIQUE NOT NULL,
    pb_adi VARCHAR(100) NOT NULL,
    sembol VARCHAR(10),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO para_birimleri (pb_kodu, pb_adi, sembol) VALUES
    ('TRY', 'Türk Lirası', '₺'),
    ('USD', 'ABD Doları', '$'),
    ('EUR', 'Euro', '€'),
    ('GBP', 'Sterlin', '£'),
    ('CHF', 'İsviçre Frangı', 'Fr')
ON CONFLICT (pb_kodu) DO NOTHING;

CREATE TABLE IF NOT EXISTS sehirler (
    id SERIAL PRIMARY KEY,
    sehir_kodu VARCHAR(20) UNIQUE NOT NULL,
    sehir_adi VARCHAR(100) NOT NULL,
    ulke_kodu VARCHAR(10) REFERENCES ulkeler(ulke_kodu),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sehirler_ulke ON sehirler (ulke_kodu);
CREATE INDEX IF NOT EXISTS idx_sehirler_adi ON sehirler (sehir_adi);

INSERT INTO sehirler (sehir_kodu, sehir_adi, ulke_kodu) VALUES
    ('34', 'İstanbul', 'TR'),
    ('06', 'Ankara', 'TR'),
    ('35', 'İzmir', 'TR'),
    ('16', 'Bursa', 'TR'),
    ('27', 'Gaziantep', 'TR'),
    ('42', 'Konya', 'TR'),
    ('01', 'Adana', 'TR'),
    ('07', 'Antalya', 'TR'),
    ('41', 'Kocaeli', 'TR'),
    ('33', 'Mersin', 'TR'),
    ('55', 'Samsun', 'TR'),
    ('21', 'Diyarbakır', 'TR'),
    ('26', 'Eskişehir', 'TR'),
    ('31', 'Hatay', 'TR'),
    ('09', 'Aydın', 'TR'),
    ('45', 'Manisa', 'TR'),
    ('48', 'Muğla', 'TR'),
    ('59', 'Tekirdağ', 'TR'),
    ('61', 'Trabzon', 'TR'),
    ('54', 'Sakarya', 'TR')
ON CONFLICT (sehir_kodu) DO NOTHING;

CREATE TABLE IF NOT EXISTS ilceler (
    id SERIAL PRIMARY KEY,
    ilce_kodu VARCHAR(30) UNIQUE NOT NULL,
    ilce_adi VARCHAR(100) NOT NULL,
    sehir_kodu VARCHAR(20) REFERENCES sehirler(sehir_kodu),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ilceler_sehir ON ilceler (sehir_kodu);
CREATE INDEX IF NOT EXISTS idx_ilceler_adi ON ilceler (ilce_adi);

INSERT INTO ilceler (ilce_kodu, ilce_adi, sehir_kodu) VALUES
    ('34-KAD', 'Kadıköy', '34'),
    ('34-BES', 'Beşiktaş', '34'),
    ('34-USK', 'Üsküdar', '34'),
    ('34-BAK', 'Bakırköy', '34'),
    ('34-SIS', 'Şişli', '34'),
    ('06-CAN', 'Çankaya', '06'),
    ('06-KEC', 'Keçiören', '06'),
    ('35-KON', 'Konak', '35'),
    ('35-BOR', 'Bornova', '35'),
    ('16-NIL', 'Nilüfer', '16'),
    ('16-OSM', 'Osmangazi', '16'),
    ('27-SEH', 'Şahinbey', '27'),
    ('27-SEI', 'Şehitkamil', '27'),
    ('42-SEL', 'Selçuklu', '42'),
    ('42-MER', 'Meram', '42')
ON CONFLICT (ilce_kodu) DO NOTHING;

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('PARA_BIRIM', 'PB', 'Para Birimi Tanımı', 0, 'para-birimi-tanimi', 'Para Birimi Tanımı', TRUE),
    ('SEHIR', 'SH', 'Şehir / İl Tanımı', 0, 'sehir-tanimi', 'Şehir / İl Tanımı', TRUE),
    ('ILCE', 'IC', 'İlçe Tanımı', 0, 'ilce-tanimi', 'İlçe Tanımı', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
    ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;

-- Serbest metin ülke adlarını koda çevir (cari + CRM aday + sevk alanları)
UPDATE cariler c
SET ulke = u.ulke_kodu
FROM ulkeler u
WHERE c.ulke IS NOT NULL
  AND lower(trim(c.ulke)) = lower(trim(u.ulke_adi));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_adaylar' AND column_name = 'ulke'
  ) THEN
    UPDATE crm_adaylar a
    SET ulke = u.ulke_kodu
    FROM ulkeler u
    WHERE a.ulke IS NOT NULL
      AND lower(trim(a.ulke)) = lower(trim(u.ulke_adi));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'siparisler' AND column_name = 'sevk_ulke'
  ) THEN
    UPDATE siparisler s
    SET sevk_ulke = u.ulke_kodu
    FROM ulkeler u
    WHERE s.sevk_ulke IS NOT NULL
      AND lower(trim(s.sevk_ulke)) = lower(trim(u.ulke_adi));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cari_sevk_adresleri' AND column_name = 'ulke'
  ) THEN
    UPDATE cari_sevk_adresleri s
    SET ulke = u.ulke_kodu
    FROM ulkeler u
    WHERE s.ulke IS NOT NULL
      AND lower(trim(s.ulke)) = lower(trim(u.ulke_adi));
  END IF;
END $$;
