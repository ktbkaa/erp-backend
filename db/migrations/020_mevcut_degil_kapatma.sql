-- 020: Matris "Mevcut değil" maddeleri — JWT destek, rezervasyon, cari hareket,
-- tahsilat, fiyat listesi, audit, seri, iade, maliyet, ikame, CAPA, fason, ajanda

-- JWT / oturum
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;

INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, modul, aciklama)
VALUES
  ('JWT_SECRET', 'JWT imza anahtarı', '', 'SYS', 'Boşsa JWT_SECRET env veya geçici anahtar'),
  ('JWT_TTL_DK', 'JWT süre (dk)', '480', 'SYS', 'Access token süresi'),
  ('EKRAN_YETKI_ZORUNLU', 'Ekran yetkisi zorunlu', 'Hayir', 'SYS', 'Evet ise modul_yetkileri ekran bazlı da uygulanır')
ON CONFLICT (parametre_kodu) DO NOTHING;

-- Depo yetki tablosu (grup JSON yanında satır bazlı)
CREATE TABLE IF NOT EXISTS kullanici_depo (
    id SERIAL PRIMARY KEY,
    kisi_id INT NOT NULL REFERENCES kisiler(id) ON DELETE CASCADE,
    depo_id INT NOT NULL REFERENCES depolar(id) ON DELETE CASCADE,
    UNIQUE (kisi_id, depo_id)
);

-- Satış rezervasyonu
CREATE TABLE IF NOT EXISTS stok_rezervasyonlari (
    id SERIAL PRIMARY KEY,
    rezervasyon_no VARCHAR(40) UNIQUE NOT NULL,
    siparis_id INT REFERENCES siparisler(id) ON DELETE CASCADE,
    siparis_detay_id INT REFERENCES siparis_detaylari(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    depo_id INT REFERENCES depolar(id),
    miktar NUMERIC(18,4) NOT NULL CHECK (miktar > 0),
    kalan_miktar NUMERIC(18,4) NOT NULL,
    durum VARCHAR(20) NOT NULL DEFAULT 'Aktif'
        CHECK (durum IN ('Aktif', 'Tuketildi', 'Iptal', 'SuresiDoldu')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    iptal_tarihi TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rezervasyon_stok ON stok_rezervasyonlari(stok_id, durum);
ALTER TABLE siparis_detaylari ADD COLUMN IF NOT EXISTS rezerve_miktar NUMERIC(18,4) NOT NULL DEFAULT 0;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    tablo_adi VARCHAR(80) NOT NULL,
    kayit_id INT,
    islem VARCHAR(20) NOT NULL,
    kullanici_kodu VARCHAR(40),
    eski_deger JSONB,
    yeni_deger JSONB,
    yol VARCHAR(200),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_tablo ON audit_log(tablo_adi, kayit_id);

-- Cari hareket (borç/alacak)
CREATE TABLE IF NOT EXISTS cari_hareketleri (
    id SERIAL PRIMARY KEY,
    hareket_no VARCHAR(40) UNIQUE NOT NULL,
    cari_id INT NOT NULL REFERENCES cariler(id),
    yon VARCHAR(10) NOT NULL CHECK (yon IN ('Borc', 'Alacak')),
    tutar NUMERIC(18,2) NOT NULL CHECK (tutar >= 0),
    para_birimi VARCHAR(10) NOT NULL DEFAULT 'TRY',
    kur NUMERIC(18,6) DEFAULT 1,
    belge_tipi VARCHAR(40),
    belge_id INT,
    aciklama TEXT,
    hareket_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cari_hareket_cari ON cari_hareketleri(cari_id, hareket_tarihi);

-- Tahsilat / ödeme
CREATE TABLE IF NOT EXISTS tahsilat_odemeler (
    id SERIAL PRIMARY KEY,
    belge_no VARCHAR(40) UNIQUE NOT NULL,
    tip VARCHAR(20) NOT NULL CHECK (tip IN ('Tahsilat', 'Odeme')),
    cari_id INT NOT NULL REFERENCES cariler(id),
    tutar NUMERIC(18,2) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    odeme_sekli VARCHAR(40) DEFAULT 'Nakit',
    fatura_id INT REFERENCES faturalar(id),
    durum VARCHAR(20) NOT NULL DEFAULT 'Onayli',
    aciklama TEXT,
    belge_tarihi DATE NOT NULL DEFAULT CURRENT_DATE,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fatura 3-way eşleştirme
CREATE TABLE IF NOT EXISTS fatura_eslestirme (
    id SERIAL PRIMARY KEY,
    fatura_id INT NOT NULL REFERENCES faturalar(id) ON DELETE CASCADE,
    siparis_id INT REFERENCES satin_alma_siparisleri(id),
    mal_kabul_id INT REFERENCES mal_kabuller(id),
    fiyat_fark NUMERIC(18,2) DEFAULT 0,
    miktar_fark NUMERIC(18,4) DEFAULT 0,
    sonuc VARCHAR(20) NOT NULL DEFAULT 'Bekliyor'
        CHECK (sonuc IN ('Bekliyor', 'Uyumlu', 'FiyatFark', 'MiktarFark', 'Askida')),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Hesap belirleme kuralları (belge→muhasebe)
CREATE TABLE IF NOT EXISTS hesap_belirleme_kurallari (
    id SERIAL PRIMARY KEY,
    kural_kodu VARCHAR(40) UNIQUE NOT NULL,
    belge_tipi VARCHAR(40) NOT NULL,
    borc_hesap_kodu VARCHAR(40),
    alacak_hesap_kodu VARCHAR(40),
    aciklama TEXT,
    aktif BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO hesap_belirleme_kurallari (kural_kodu, belge_tipi, borc_hesap_kodu, alacak_hesap_kodu, aciklama)
VALUES
  ('SATIS_FAT', 'Satis', '120', '600', 'Satış faturası: Alıcılar / Yurt içi satışlar'),
  ('ALIS_FAT', 'Alis', '150', '320', 'Alış faturası: Ticari mallar / Satıcılar')
ON CONFLICT (kural_kodu) DO NOTHING;

-- Fiyat listesi
CREATE TABLE IF NOT EXISTS fiyat_listeleri (
    id SERIAL PRIMARY KEY,
    liste_kodu VARCHAR(40) UNIQUE NOT NULL,
    liste_adi VARCHAR(160) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    baslangic_tarihi DATE,
    bitis_tarihi DATE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS fiyat_liste_satirlari (
    id SERIAL PRIMARY KEY,
    liste_id INT NOT NULL REFERENCES fiyat_listeleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    cari_id INT REFERENCES cariler(id),
    min_miktar NUMERIC(18,4) DEFAULT 0,
    birim_fiyat NUMERIC(18,4) NOT NULL,
    iskonto_oran NUMERIC(8,2) DEFAULT 0,
    UNIQUE (liste_id, stok_id, cari_id, min_miktar)
);

-- Seri numarası
CREATE TABLE IF NOT EXISTS stok_serileri (
    id SERIAL PRIMARY KEY,
    seri_no VARCHAR(80) NOT NULL,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    parti_id INT REFERENCES stok_partileri(id),
    depo_id INT REFERENCES depolar(id),
    durum VARCHAR(20) NOT NULL DEFAULT 'Depoda'
        CHECK (durum IN ('Depoda', 'SevkEdildi', 'Hurda', 'Serviste')),
    son_hareket_id INT REFERENCES stok_hareketleri(id),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (stok_id, seri_no)
);

ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS seri_politika VARCHAR(20) DEFAULT 'Takipsiz'
    CHECK (seri_politika IN ('Takipsiz', 'IstegeBagli', 'Zorunlu'));
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS maliyet_yontem VARCHAR(20) DEFAULT 'Ortalama';
ALTER TABLE stoklar ADD COLUMN IF NOT EXISTS son_maliyet NUMERIC(18,6) DEFAULT 0;

-- Stok maliyet hareket katmanı (basit ortalama)
CREATE TABLE IF NOT EXISTS stok_maliyet_hareket (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    hareket_id INT REFERENCES stok_hareketleri(id),
    miktar NUMERIC(18,4) NOT NULL,
    birim_maliyet NUMERIC(18,6) NOT NULL,
    yon SMALLINT NOT NULL,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- İkame / alternatif
CREATE TABLE IF NOT EXISTS stok_ikame (
    id SERIAL PRIMARY KEY,
    stok_id INT NOT NULL REFERENCES stoklar(id) ON DELETE CASCADE,
    ikame_stok_id INT NOT NULL REFERENCES stoklar(id),
    oncelik INT DEFAULT 1,
    aciklama TEXT,
    UNIQUE (stok_id, ikame_stok_id)
);

-- Tedarikçi değerlendirme
CREATE TABLE IF NOT EXISTS tedarikci_degerlendirme (
    id SERIAL PRIMARY KEY,
    cari_id INT NOT NULL REFERENCES cariler(id),
    donem VARCHAR(20) NOT NULL,
    kalite_puan NUMERIC(5,2),
    teslimat_puan NUMERIC(5,2),
    fiyat_puan NUMERIC(5,2),
    genel_puan NUMERIC(5,2),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CAPA (düzeltici faaliyet)
CREATE TABLE IF NOT EXISTS kk_capa (
    id SERIAL PRIMARY KEY,
    capa_no VARCHAR(40) UNIQUE NOT NULL,
    uygunsuzluk_id INT REFERENCES kk_uygunsuzluklar(id),
    baslik VARCHAR(200) NOT NULL,
    aciklama TEXT,
    sorumlu_kisi_id INT REFERENCES kisiler(id),
    hedef_tarih DATE,
    durum VARCHAR(20) NOT NULL DEFAULT 'Acik'
        CHECK (durum IN ('Acik', 'Devam', 'Kapali', 'Iptal')),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fason üretim işareti
ALTER TABLE uretim_emirleri ADD COLUMN IF NOT EXISTS fason BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE uretim_emirleri ADD COLUMN IF NOT EXISTS fason_cari_id INT REFERENCES cariler(id);

-- Yan ürün
CREATE TABLE IF NOT EXISTS uretim_yan_urunler (
    id SERIAL PRIMARY KEY,
    uretim_emri_id INT NOT NULL REFERENCES uretim_emirleri(id) ON DELETE CASCADE,
    stok_id INT NOT NULL REFERENCES stoklar(id),
    miktar NUMERIC(18,4) NOT NULL,
    birim VARCHAR(20),
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ajanda (CRM)
CREATE TABLE IF NOT EXISTS crm_ajanda (
    id SERIAL PRIMARY KEY,
    baslik VARCHAR(200) NOT NULL,
    baslangic_at TIMESTAMP NOT NULL,
    bitis_at TIMESTAMP,
    tip VARCHAR(40) DEFAULT 'Toplanti',
    cari_id INT REFERENCES cariler(id),
    aday_id INT,
    firsat_id INT,
    kullanici_kodu VARCHAR(40),
    aciklama TEXT,
    kayit_tarihi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- İade belge tipleri + stok hareket tipi
ALTER TABLE stok_hareketleri DROP CONSTRAINT IF EXISTS chk_stok_hareket_tipi;
ALTER TABLE stok_hareketleri
  ADD CONSTRAINT chk_stok_hareket_tipi CHECK (
    hareket_tipi IN (
      'SATINALMA_GIRIS', 'SATIS_CIKIS', 'URETIM_TUKETIM', 'URETIM_GIRIS',
      'SAYIM', 'TRANSFER', 'DUZELTME', 'STOK_GIRIS', 'STOK_CIKIS',
      'IADE_GIRIS', 'IADE_CIKIS'
    )
  );

INSERT INTO belge_tipleri (belge_tipi_kodu, belge_tipi_adi, modul, stok_etkisi)
VALUES
  ('SATIS_IADE', 'Satış İade İrsaliye/Fatura', 'SAL', TRUE),
  ('ALIS_IADE', 'Alış İade', 'PUR', TRUE)
ON CONFLICT (belge_tipi_kodu) DO NOTHING;

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
  ('REZERVASYON', 'RZ', 'Stok rezervasyonu', 0, 'satis-siparisleri', 'Satış Siparişleri', TRUE),
  ('TAHSILAT', 'TH', 'Tahsilat', 0, 'tahsilat-odemeler', 'Tahsilat / Ödeme', TRUE),
  ('ODEME', 'OD', 'Ödeme', 0, 'tahsilat-odemeler', 'Tahsilat / Ödeme', TRUE),
  ('CARI_HAREKET', 'CH', 'Cari hareket', 0, 'cari-ekstre', 'Cari Ekstre', TRUE),
  ('FIYAT_LISTE', 'FL', 'Fiyat listesi', 0, 'fiyat-listeleri', 'Fiyat Listeleri', TRUE),
  ('CAPA', 'CA', 'Düzeltici faaliyet', 0, 'kk-capa', 'CAPA', TRUE),
  ('SERI', 'SR', 'Seri numarası', 0, 'stok-serileri', 'Stok Serileri', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET ekran_kodu = EXCLUDED.ekran_kodu;

-- Seed muhasebe hesapları (yoksa)
INSERT INTO muhasebe_hesaplari (hesap_kodu, hesap_adi, hesap_tipi, aktif)
SELECT v.kod, v.adi, 'Dogrudan', TRUE FROM (VALUES
  ('120', 'Alıcılar'),
  ('150', 'Ticari Mallar'),
  ('320', 'Satıcılar'),
  ('600', 'Yurt İçi Satışlar'),
  ('100', 'Kasa'),
  ('102', 'Bankalar')
) AS v(kod, adi)
WHERE NOT EXISTS (SELECT 1 FROM muhasebe_hesaplari h WHERE h.hesap_kodu = v.kod);
