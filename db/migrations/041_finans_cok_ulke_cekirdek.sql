-- 041: Çok ülkeli finans/muhasebe çekirdeği
-- Yalnızca ADD / CREATE IF NOT EXISTS — veri silinmez.

-- ========== 1) Firma muhasebe ülkesi ==========
ALTER TABLE firmalar
  ADD COLUMN IF NOT EXISTS muhasebe_ulke_kodu VARCHAR(10) NULL DEFAULT 'TR',
  ADD COLUMN IF NOT EXISTS fonksiyonel_pb VARCHAR(10) NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS hesap_plani_kodu VARCHAR(40) NULL DEFAULT 'TDHP',
  ADD COLUMN IF NOT EXISTS raporlama_cercevesi VARCHAR(40) NULL DEFAULT 'VUK_TDHP',
  ADD COLUMN IF NOT EXISTS mali_yil_baslangic_ay INT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ebelge_saglayici VARCHAR(40) NULL;

UPDATE firmalar SET muhasebe_ulke_kodu = COALESCE(muhasebe_ulke_kodu, 'TR'),
                 fonksiyonel_pb = COALESCE(fonksiyonel_pb, 'TRY'),
                 hesap_plani_kodu = COALESCE(hesap_plani_kodu, 'TDHP')
WHERE muhasebe_ulke_kodu IS NULL OR fonksiyonel_pb IS NULL;

-- ========== 2) Ülke muhasebe paketleri ==========
CREATE TABLE IF NOT EXISTS finans_ulke_paketleri (
    ulke_kodu VARCHAR(10) PRIMARY KEY,
    ulke_adi VARCHAR(80) NOT NULL,
    yerel_pb VARCHAR(10) NOT NULL,
    hesap_plani_kodu VARCHAR(40) NOT NULL,
    raporlama_cercevesi VARCHAR(40) NOT NULL DEFAULT 'Yerel',
    saklama_yil INT NOT NULL DEFAULT 7,
    ebelge_notu TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO finans_ulke_paketleri (ulke_kodu, ulke_adi, yerel_pb, hesap_plani_kodu, raporlama_cercevesi, saklama_yil, ebelge_notu)
VALUES
  ('TR', 'Türkiye', 'TRY', 'TDHP', 'VUK_TDHP', 10,
   'e-Fatura/e-Arşiv/e-Defter: GİB; canlı gönderim stub'),
  ('AZ', 'Azərbaycan', 'AZN', 'AZ_HP', 'Yerel', 5,
   'e-qaimə-faktura: taxes.gov.az — şema doğrulama beklemede'),
  ('DE', 'Deutschland', 'EUR', 'SKR04', 'HGB', 10,
   'E-Rechnung 2025+ EN 16931; BMF FAQ'),
  ('NL', 'Nederland', 'EUR', 'NL_FLEX', 'BW2', 7,
   'Belastingdienst: temel 7 yıl; gayrimenkul/OSS 10 yıl')
ON CONFLICT (ulke_kodu) DO UPDATE SET
  ulke_adi = EXCLUDED.ulke_adi,
  yerel_pb = EXCLUDED.yerel_pb,
  ebelge_notu = EXCLUDED.ebelge_notu;

-- ========== 3) Hesap planı genişletme ==========
ALTER TABLE muhasebe_hesaplari
  ADD COLUMN IF NOT EXISTS ulke_kodu VARCHAR(10) NULL DEFAULT 'TR',
  ADD COLUMN IF NOT EXISTS hesap_plani_kodu VARCHAR(40) NULL DEFAULT 'TDHP',
  ADD COLUMN IF NOT EXISTS hesap_sinifi VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS normal_bakiye VARCHAR(10) NULL DEFAULT 'Borc',
  ADD COLUMN IF NOT EXISTS kontrol_hesabi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mutabakat_tipi VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS firma_id INT NULL REFERENCES firmalar(id);

CREATE INDEX IF NOT EXISTS idx_mh_ulke_kod ON muhasebe_hesaplari(ulke_kodu, hesap_kodu);
CREATE INDEX IF NOT EXISTS idx_mh_firma ON muhasebe_hesaplari(firma_id);

-- TDHP referans alt kümesi (mevcut seed ile uyumlu genişletme)
INSERT INTO muhasebe_hesaplari (hesap_kodu, hesap_adi, hesap_tipi, ust_hesap_kodu, ulke_kodu, hesap_plani_kodu, hesap_sinifi, normal_bakiye, kontrol_hesabi, mutabakat_tipi)
VALUES
  ('100', 'Kasa', 'Ana', NULL, 'TR', 'TDHP', '1', 'Borc', FALSE, 'Kasa'),
  ('100.01', 'TL Kasası', 'Ust', '100', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Kasa'),
  ('100.01.001', 'Merkez Kasa', 'Dogrudan', '100.01', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Kasa'),
  ('102', 'Bankalar', 'Ana', NULL, 'TR', 'TDHP', '1', 'Borc', TRUE, 'Banka'),
  ('102.01', 'TL Banka Hesapları', 'Ust', '102', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Banka'),
  ('102.01.001', 'Ana Banka Hesabı', 'Dogrudan', '102.01', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Banka'),
  ('120', 'Alıcılar', 'Ana', NULL, 'TR', 'TDHP', '1', 'Borc', TRUE, 'Cari'),
  ('120.01', 'Yurt İçi Alıcılar', 'Ust', '120', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Cari'),
  ('120.01.001', 'Yurt İçi Alacaklar', 'Dogrudan', '120.01', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Cari'),
  ('150', 'İlk Madde ve Malzeme', 'Ana', NULL, 'TR', 'TDHP', '1', 'Borc', FALSE, 'Stok'),
  ('150.01.001', 'Hammaddeler', 'Dogrudan', '150', 'TR', 'TDHP', '1', 'Borc', FALSE, 'Stok'),
  ('191', 'İndirilecek KDV', 'Ana', NULL, 'TR', 'TDHP', '1', 'Borc', FALSE, NULL),
  ('191.01.001', 'İndirilecek KDV %20', 'Dogrudan', '191', 'TR', 'TDHP', '1', 'Borc', FALSE, NULL),
  ('253', 'Tesis, Makine ve Cihazlar', 'Ana', NULL, 'TR', 'TDHP', '2', 'Borc', FALSE, 'SabitKiymet'),
  ('253.01.001', 'Üretim Makineleri', 'Dogrudan', '253', 'TR', 'TDHP', '2', 'Borc', FALSE, 'SabitKiymet'),
  ('257', 'Birikmiş Amortismanlar (-)', 'Ana', NULL, 'TR', 'TDHP', '2', 'Alacak', FALSE, 'SabitKiymet'),
  ('257.01.001', 'Tesis Makine Amortismanı', 'Dogrudan', '257', 'TR', 'TDHP', '2', 'Alacak', FALSE, 'SabitKiymet'),
  ('320', 'Satıcılar', 'Ana', NULL, 'TR', 'TDHP', '3', 'Alacak', TRUE, 'Cari'),
  ('320.01', 'Yurt İçi Satıcılar', 'Ust', '320', 'TR', 'TDHP', '3', 'Alacak', FALSE, 'Cari'),
  ('320.01.001', 'Yurt İçi Borçlar', 'Dogrudan', '320.01', 'TR', 'TDHP', '3', 'Alacak', FALSE, 'Cari'),
  ('360', 'Ödenecek Vergi ve Fonlar', 'Ana', NULL, 'TR', 'TDHP', '3', 'Alacak', FALSE, NULL),
  ('360.01.001', 'Ödenecek KDV', 'Dogrudan', '360', 'TR', 'TDHP', '3', 'Alacak', FALSE, NULL),
  ('391', 'Hesaplanan KDV', 'Ana', NULL, 'TR', 'TDHP', '3', 'Alacak', FALSE, NULL),
  ('391.01.001', 'Hesaplanan KDV %20', 'Dogrudan', '391', 'TR', 'TDHP', '3', 'Alacak', FALSE, NULL),
  ('500', 'Sermaye', 'Ana', NULL, 'TR', 'TDHP', '5', 'Alacak', FALSE, NULL),
  ('500.01.001', 'Ödenmiş Sermaye', 'Dogrudan', '500', 'TR', 'TDHP', '5', 'Alacak', FALSE, NULL),
  ('600', 'Yurt İçi Satışlar', 'Ana', NULL, 'TR', 'TDHP', '6', 'Alacak', FALSE, NULL),
  ('600.01.001', 'Yurt İçi Satışlar', 'Dogrudan', '600', 'TR', 'TDHP', '6', 'Alacak', FALSE, NULL),
  ('622', 'Satılan Ticari Mallar Maliyeti', 'Ana', NULL, 'TR', 'TDHP', '6', 'Borc', FALSE, NULL),
  ('622.01.001', 'SMM', 'Dogrudan', '622', 'TR', 'TDHP', '6', 'Borc', FALSE, NULL),
  ('770', 'Genel Yönetim Giderleri', 'Ana', NULL, 'TR', 'TDHP', '6', 'Borc', FALSE, NULL),
  ('770.01.001', 'Genel Yönetim Giderleri', 'Dogrudan', '770', 'TR', 'TDHP', '6', 'Borc', FALSE, NULL),
  ('646', 'Kambiyo Kârları', 'Ana', NULL, 'TR', 'TDHP', '6', 'Alacak', FALSE, NULL),
  ('646.01.001', 'Kur Farkı Gelirleri', 'Dogrudan', '646', 'TR', 'TDHP', '6', 'Alacak', FALSE, NULL),
  ('656', 'Kambiyo Zararları', 'Ana', NULL, 'TR', 'TDHP', '6', 'Borc', FALSE, NULL),
  ('656.01.001', 'Kur Farkı Giderleri', 'Dogrudan', '656', 'TR', 'TDHP', '6', 'Borc', FALSE, NULL)
ON CONFLICT (hesap_kodu) DO UPDATE SET
  ulke_kodu = COALESCE(muhasebe_hesaplari.ulke_kodu, EXCLUDED.ulke_kodu),
  hesap_plani_kodu = COALESCE(muhasebe_hesaplari.hesap_plani_kodu, EXCLUDED.hesap_plani_kodu),
  hesap_sinifi = COALESCE(muhasebe_hesaplari.hesap_sinifi, EXCLUDED.hesap_sinifi),
  normal_bakiye = COALESCE(muhasebe_hesaplari.normal_bakiye, EXCLUDED.normal_bakiye);

-- DE / AZ / NL iskelet (ayrı kod uzayı — TR ile çakışmasın diye önek)
INSERT INTO muhasebe_hesaplari (hesap_kodu, hesap_adi, hesap_tipi, ust_hesap_kodu, ulke_kodu, hesap_plani_kodu, hesap_sinifi, normal_bakiye)
VALUES
  ('DE-1200', 'Bank', 'Dogrudan', NULL, 'DE', 'SKR04', '1', 'Borc'),
  ('DE-1400', 'Forderungen aus L+L', 'Dogrudan', NULL, 'DE', 'SKR04', '1', 'Borc'),
  ('DE-1600', 'Verbindlichkeiten aus L+L', 'Dogrudan', NULL, 'DE', 'SKR04', '3', 'Alacak'),
  ('DE-8400', 'Erlöse 19% USt', 'Dogrudan', NULL, 'DE', 'SKR04', '6', 'Alacak'),
  ('DE-1776', 'Umsatzsteuer 19%', 'Dogrudan', NULL, 'DE', 'SKR04', '3', 'Alacak'),
  ('DE-1576', 'Abziehbare Vorsteuer 19%', 'Dogrudan', NULL, 'DE', 'SKR04', '1', 'Borc'),
  ('AZ-101', 'Kassa', 'Dogrudan', NULL, 'AZ', 'AZ_HP', '1', 'Borc'),
  ('AZ-121', 'Alıcılar', 'Dogrudan', NULL, 'AZ', 'AZ_HP', '1', 'Borc'),
  ('AZ-531', 'Satışlar', 'Dogrudan', NULL, 'AZ', 'AZ_HP', '6', 'Alacak'),
  ('NL-1000', 'Bank', 'Dogrudan', NULL, 'NL', 'NL_FLEX', '1', 'Borc'),
  ('NL-1300', 'Debiteuren', 'Dogrudan', NULL, 'NL', 'NL_FLEX', '1', 'Borc'),
  ('NL-1600', 'Crediteuren', 'Dogrudan', NULL, 'NL', 'NL_FLEX', '3', 'Alacak'),
  ('NL-8000', 'Omzet', 'Dogrudan', NULL, 'NL', 'NL_FLEX', '6', 'Alacak')
ON CONFLICT (hesap_kodu) DO NOTHING;

-- ========== 4) Mali yıl / dönem ==========
CREATE TABLE IF NOT EXISTS mali_yillar (
    id SERIAL PRIMARY KEY,
    firma_id INT REFERENCES firmalar(id),
    yil INT NOT NULL,
    baslangic_tarihi DATE NOT NULL,
    bitis_tarihi DATE NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'Acik'
      CHECK (durum IN ('Acik', 'Kapali', 'Kilitli')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (firma_id, yil)
);

CREATE TABLE IF NOT EXISTS muhasebe_donemleri (
    id SERIAL PRIMARY KEY,
    mali_yil_id INT NOT NULL REFERENCES mali_yillar(id) ON DELETE CASCADE,
    firma_id INT REFERENCES firmalar(id),
    donem_no INT NOT NULL CHECK (donem_no BETWEEN 1 AND 12),
    baslangic_tarihi DATE NOT NULL,
    bitis_tarihi DATE NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'Acik'
      CHECK (durum IN ('Acik', 'Kapali', 'YenidenAcik')),
    kapatan_kullanici VARCHAR(40),
    kapanis_tarihi TIMESTAMP,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (mali_yil_id, donem_no)
);

CREATE INDEX IF NOT EXISTS idx_md_firma_tarih ON muhasebe_donemleri(firma_id, baslangic_tarihi, bitis_tarihi);

-- Varsayılan: içinde bulunulan yıl şablonu (firma_id NULL)
DO $$
DECLARE
  y INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  my_id INT;
  m INT;
BEGIN
  SELECT id INTO my_id FROM mali_yillar WHERE firma_id IS NULL AND yil = y LIMIT 1;
  IF my_id IS NULL THEN
    INSERT INTO mali_yillar (firma_id, yil, baslangic_tarihi, bitis_tarihi, durum)
    VALUES (NULL, y, make_date(y,1,1), make_date(y,12,31), 'Acik')
    RETURNING id INTO my_id;
  END IF;
  FOR m IN 1..12 LOOP
    INSERT INTO muhasebe_donemleri (mali_yil_id, firma_id, donem_no, baslangic_tarihi, bitis_tarihi, durum)
    VALUES (
      my_id, NULL, m,
      make_date(y, m, 1),
      (make_date(y, m, 1) + INTERVAL '1 month - 1 day')::date,
      'Acik'
    )
    ON CONFLICT (mali_yil_id, donem_no) DO NOTHING;
  END LOOP;
END $$;

-- ========== 5) Muhasebe belgesi güçlendirme ==========
ALTER TABLE muhasebe_belgeleri
  ADD COLUMN IF NOT EXISTS fis_tipi VARCHAR(30) NULL DEFAULT 'Mahsup',
  ADD COLUMN IF NOT EXISTS firma_id INT NULL REFERENCES firmalar(id),
  ADD COLUMN IF NOT EXISTS ulke_kodu VARCHAR(10) NULL DEFAULT 'TR',
  ADD COLUMN IF NOT EXISTS islem_ulke_kodu VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS vergi_ulke_kodu VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS donem_id INT NULL REFERENCES muhasebe_donemleri(id),
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT NULL,
  ADD COLUMN IF NOT EXISTS ters_belge_id INT NULL REFERENCES muhasebe_belgeleri(id),
  ADD COLUMN IF NOT EXISTS orijinal_belge_id INT NULL REFERENCES muhasebe_belgeleri(id),
  ADD COLUMN IF NOT EXISTS kesinlestirme_tarihi TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS yevmiye_no INT NULL,
  ADD COLUMN IF NOT EXISTS kilitli BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_muh_belge_kaynak
  ON muhasebe_belgeleri (firma_id, kaynak_belge_tipi, kaynak_belge_id)
  WHERE kaynak_belge_id IS NOT NULL AND durum = 'Onayli' AND ters_belge_id IS NULL;

ALTER TABLE muhasebe_belge_kalemleri
  ADD COLUMN IF NOT EXISTS sira_no INT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cari_id INT NULL REFERENCES cariler(id),
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS borc_yb NUMERIC(18,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alacak_yb NUMERIC(18,2) NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vergi_kodu VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS maliyet_merkezi VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40) NULL;

-- ========== 6) Vergi kodları (tarihli oran) ==========
CREATE TABLE IF NOT EXISTS finans_vergi_kodlari (
    id SERIAL PRIMARY KEY,
    ulke_kodu VARCHAR(10) NOT NULL REFERENCES finans_ulke_paketleri(ulke_kodu),
    vergi_kodu VARCHAR(40) NOT NULL,
    vergi_adi VARCHAR(120) NOT NULL,
    vergi_turu VARCHAR(40) NOT NULL DEFAULT 'KDV',
    indirilecek_hesap_kodu VARCHAR(40),
    hesaplanan_hesap_kodu VARCHAR(40),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (ulke_kodu, vergi_kodu)
);

CREATE TABLE IF NOT EXISTS finans_vergi_oranlari (
    id SERIAL PRIMARY KEY,
    vergi_kod_id INT NOT NULL REFERENCES finans_vergi_kodlari(id) ON DELETE CASCADE,
    oran NUMERIC(8,4) NOT NULL,
    gecerlilik_baslangic DATE NOT NULL,
    gecerlilik_bitis DATE NULL,
    kaynak_notu TEXT,
    UNIQUE (vergi_kod_id, gecerlilik_baslangic)
);

INSERT INTO finans_vergi_kodlari (ulke_kodu, vergi_kodu, vergi_adi, vergi_turu, indirilecek_hesap_kodu, hesaplanan_hesap_kodu)
VALUES
  ('TR', 'KDV20', 'KDV %20 Genel', 'KDV', '191.01.001', '391.01.001'),
  ('TR', 'KDV10', 'KDV %10', 'KDV', '191.01.001', '391.01.001'),
  ('TR', 'KDV1', 'KDV %1', 'KDV', '191.01.001', '391.01.001'),
  ('TR', 'KDV0', 'KDV %0 / İstisna', 'KDV', NULL, NULL),
  ('DE', 'UST19', 'USt 19%', 'USt', 'DE-1576', 'DE-1776'),
  ('DE', 'UST7', 'USt 7%', 'USt', 'DE-1576', 'DE-1776'),
  ('NL', 'BTW21', 'BTW 21%', 'BTW', NULL, NULL),
  ('NL', 'BTW9', 'BTW 9%', 'BTW', NULL, NULL),
  ('AZ', 'EDV18', 'ƏDV 18%', 'EDV', NULL, NULL)
ON CONFLICT (ulke_kodu, vergi_kodu) DO NOTHING;

INSERT INTO finans_vergi_oranlari (vergi_kod_id, oran, gecerlilik_baslangic, kaynak_notu)
SELECT id, CASE vergi_kodu
  WHEN 'KDV20' THEN 20 WHEN 'KDV10' THEN 10 WHEN 'KDV1' THEN 1 WHEN 'KDV0' THEN 0
  WHEN 'UST19' THEN 19 WHEN 'UST7' THEN 7
  WHEN 'BTW21' THEN 21 WHEN 'BTW9' THEN 9
  WHEN 'EDV18' THEN 18 ELSE 0 END,
  DATE '2024-01-01',
  'Yapılandırma seed — resmi tebliğle güncellenir'
FROM finans_vergi_kodlari
ON CONFLICT (vergi_kod_id, gecerlilik_baslangic) DO NOTHING;

-- ========== 7) Banka hesapları / kasa / hareket ==========
CREATE TABLE IF NOT EXISTS finans_banka_hesaplari (
    id SERIAL PRIMARY KEY,
    firma_id INT REFERENCES firmalar(id),
    hesap_kodu VARCHAR(40) NOT NULL,
    hesap_adi VARCHAR(120) NOT NULL,
    banka_id INT REFERENCES bankalar(id),
    iban VARCHAR(40),
    para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY',
    muhasebe_hesap_id INT REFERENCES muhasebe_hesaplari(id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (firma_id, hesap_kodu)
);

CREATE TABLE IF NOT EXISTS finans_kasa_hesaplari (
    id SERIAL PRIMARY KEY,
    firma_id INT REFERENCES firmalar(id),
    kasa_kodu VARCHAR(40) NOT NULL,
    kasa_adi VARCHAR(120) NOT NULL,
    para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY',
    muhasebe_hesap_id INT REFERENCES muhasebe_hesaplari(id),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (firma_id, kasa_kodu)
);

CREATE TABLE IF NOT EXISTS finans_nakit_hareketleri (
    id SERIAL PRIMARY KEY,
    firma_id INT REFERENCES firmalar(id),
    hareket_no VARCHAR(50) NOT NULL,
    hareket_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    yon VARCHAR(20) NOT NULL CHECK (yon IN ('Giris', 'Cikis', 'Virman')),
    tutar NUMERIC(18,2) NOT NULL CHECK (tutar > 0),
    para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY',
    kur NUMERIC(18,6) NOT NULL DEFAULT 1,
    banka_hesap_id INT REFERENCES finans_banka_hesaplari(id),
    kasa_hesap_id INT REFERENCES finans_kasa_hesaplari(id),
    cari_id INT REFERENCES cariler(id),
    muhasebe_belge_id INT REFERENCES muhasebe_belgeleri(id),
    aciklama TEXT,
    durum VARCHAR(20) NOT NULL DEFAULT 'Taslak'
      CHECK (durum IN ('Taslak', 'Onayli', 'Iptal')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fnh_tarih ON finans_nakit_hareketleri(hareket_tarihi);

-- ========== 8) Sabit kıymet (çekirdek kart) ==========
CREATE TABLE IF NOT EXISTS sabit_kiymetler (
    id SERIAL PRIMARY KEY,
    firma_id INT REFERENCES firmalar(id),
    kiymet_kodu VARCHAR(40) NOT NULL,
    kiymet_adi VARCHAR(200) NOT NULL,
    sinif_kodu VARCHAR(40),
    edinme_tarihi DATE,
    edinme_maliyeti NUMERIC(18,2) NOT NULL DEFAULT 0,
    faydali_omur_ay INT NOT NULL DEFAULT 60,
    amortisman_yontemi VARCHAR(30) NOT NULL DEFAULT 'Normal',
    birikmis_amortisman NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_deger NUMERIC(18,2) NOT NULL DEFAULT 0,
    muhasebe_hesap_id INT REFERENCES muhasebe_hesaplari(id),
    amortisman_hesap_id INT REFERENCES muhasebe_hesaplari(id),
    durum VARCHAR(20) NOT NULL DEFAULT 'Aktif',
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (firma_id, kiymet_kodu)
);

-- ========== 9) Numaratörler ==========
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
  ('FIN_BANKA_HESAP', 'BH', 'Banka hesabı', 0, 'finans-banka-hesaplari', 'Banka Hesapları', TRUE),
  ('FIN_KASA', 'KS', 'Kasa hesabı', 0, 'finans-kasa-hesaplari', 'Kasa Hesapları', TRUE),
  ('FIN_NAKIT_HAREKET', 'NH', 'Nakit hareket', 0, 'finans-nakit-hareketleri', 'Nakit Hareketleri', TRUE),
  ('SABIT_KIYMET', 'SK', 'Sabit kıymet', 0, 'sabit-kiymetler', 'Sabit Kıymetler', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
  ekran_kodu = EXCLUDED.ekran_kodu,
  ekran_adi = EXCLUDED.ekran_adi,
  aktif = TRUE;

-- ========== 10) Hesap belirleme kuralları — KDV satırlı satış ==========
INSERT INTO hesap_belirleme_kurallari (kural_kodu, belge_tipi, borc_hesap_kodu, alacak_hesap_kodu, aciklama, aktif)
SELECT 'SATIS_FATURA_TR', 'Satis', '120.01.001', '600.01.001', 'Satış faturası alacak + gelir', TRUE
WHERE NOT EXISTS (SELECT 1 FROM hesap_belirleme_kurallari WHERE kural_kodu = 'SATIS_FATURA_TR');

INSERT INTO hesap_belirleme_kurallari (kural_kodu, belge_tipi, borc_hesap_kodu, alacak_hesap_kodu, aciklama, aktif)
SELECT 'ALIS_FATURA_TR', 'Alis', '150.01.001', '320.01.001', 'Alış faturası stok/gider + satıcı', TRUE
WHERE NOT EXISTS (SELECT 1 FROM hesap_belirleme_kurallari WHERE kural_kodu = 'ALIS_FATURA_TR');

COMMENT ON TABLE finans_ulke_paketleri IS 'Ülke muhasebe paketleri — kurallar JSON/seed ile genişler';
COMMENT ON TABLE muhasebe_donemleri IS 'Kapalı döneme kayıt motor tarafından engellenir';
