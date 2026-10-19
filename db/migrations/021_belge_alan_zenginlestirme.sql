-- 021: Belge/işlem tabloları alan zenginleştirme
-- Kaynaklar (açık şema/dokümantasyon):
--   Dolibarr: llx_commande, llx_commandedet, llx_facture, llx_facturedet, llx_stock_mouvement
--   ERPNext: Sales Order / Sales Invoice field model
--   Sage X3 / D365 InventTrans: fulfillment & inventory ledger patterns
-- Amaç: başlık+satırlarda gerçek ERP'lerde görülen ticari/lojistik/finans alanları

-- ========== Satış siparişi (≈ llx_commande) ==========
ALTER TABLE siparisler
  ADD COLUMN IF NOT EXISTS musteri_siparis_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS fiyat_liste_id INT REFERENCES fiyat_listeleri(id),
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS gecerlilik_tarihi DATE,
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ara_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS toplam_kdv NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS genel_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS odeme_sekli VARCHAR(40),
  ADD COLUMN IF NOT EXISTS sevk_il VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sevk_ilce VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sevk_ulke VARCHAR(80) DEFAULT 'Türkiye',
  ADD COLUMN IF NOT EXISTS sevk_posta_kodu VARCHAR(20),
  ADD COLUMN IF NOT EXISTS faturalandi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sevk_tamamlandi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kapanis_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS not_public TEXT,
  ADD COLUMN IF NOT EXISTS not_internal TEXT,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS siparis_kaynak VARCHAR(40) DEFAULT 'Manuel';

ALTER TABLE siparis_detaylari
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS net_birim_fiyat NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS tutar_ht NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS tutar_ttc NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS urun_tipi VARCHAR(20) DEFAULT 'Stok',
  ADD COLUMN IF NOT EXISTS maliyet_birim NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kar_marji NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS rezerv_durum VARCHAR(20) DEFAULT 'Yok',
  ADD COLUMN IF NOT EXISTS teslim_edilen_miktar NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bekleyen_miktar NUMERIC(18,4);

-- ========== Satış teklifi ==========
ALTER TABLE satis_teklifleri
  ADD COLUMN IF NOT EXISTS musteri_teklif_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS fiyat_liste_id INT REFERENCES fiyat_listeleri(id),
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ara_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS toplam_kdv NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS genel_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS odeme_kosulu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS odeme_sekli VARCHAR(40),
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS not_public TEXT,
  ADD COLUMN IF NOT EXISTS not_internal TEXT,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE satis_teklif_satirlari
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS net_birim_fiyat NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS tutar_ht NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS tutar_ttc NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS urun_tipi VARCHAR(20) DEFAULT 'Stok',
  ADD COLUMN IF NOT EXISTS maliyet_birim NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE;

-- ========== Sevk emri ==========
ALTER TABLE sevk_emirleri
  ADD COLUMN IF NOT EXISTS planlanan_sevk_tarihi DATE,
  ADD COLUMN IF NOT EXISTS oncelik VARCHAR(20) DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS tasiyici_unvan VARCHAR(160),
  ADD COLUMN IF NOT EXISTS tasiyici_vkn VARCHAR(20),
  ADD COLUMN IF NOT EXISTS arac_plaka VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sofor_adi VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sofor_telefon VARCHAR(40),
  ADD COLUMN IF NOT EXISTS paket_adet INT,
  ADD COLUMN IF NOT EXISTS brut_agirlik NUMERIC(18,3),
  ADD COLUMN IF NOT EXISTS net_agirlik NUMERIC(18,3),
  ADD COLUMN IF NOT EXISTS hacim NUMERIC(18,3),
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS not_internal TEXT,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE sevk_emri_satirlari
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS parti_id INT REFERENCES stok_partileri(id),
  ADD COLUMN IF NOT EXISTS seri_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sevk_edilen_miktar NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kalan_miktar NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS raf_kodu VARCHAR(50);

-- ========== İrsaliye satır (başlık zaten zengin) ==========
ALTER TABLE irsaliye_satirlari
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS birim_fiyat NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kdv_oran NUMERIC(8,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS kdv_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutar_ht NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutar_ttc NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parti_id INT REFERENCES stok_partileri(id),
  ADD COLUMN IF NOT EXISTS parti_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS seri_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS stok_statu VARCHAR(20) DEFAULT 'Kullanilabilir',
  ADD COLUMN IF NOT EXISTS raf_kodu VARCHAR(50),
  ADD COLUMN IF NOT EXISTS konum_kodu VARCHAR(50);

ALTER TABLE irsaliyeler
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ara_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS toplam_kdv NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS genel_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS iade_mi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS iade_kaynak_id INT,
  ADD COLUMN IF NOT EXISTS not_public TEXT,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ========== Fatura (≈ llx_facture) ==========
ALTER TABLE faturalar
  ADD COLUMN IF NOT EXISTS musteri_fatura_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS fiyat_liste_id INT REFERENCES fiyat_listeleri(id),
  ADD COLUMN IF NOT EXISTS odeme_sekli VARCHAR(40),
  ADD COLUMN IF NOT EXISTS vade_tarihi DATE,
  ADD COLUMN IF NOT EXISTS odeme_durumu VARCHAR(20) DEFAULT 'Odenmedi'
    CHECK (odeme_durumu IN ('Odenmedi', 'Kismi', 'Odendi', 'Iptal')),
  ADD COLUMN IF NOT EXISTS odenen_tutar NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kalan_tutar NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS fatura_kaynak_id INT REFERENCES faturalar(id),
  ADD COLUMN IF NOT EXISTS iade_mi BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS muhasebe_belge_id INT REFERENCES muhasebe_belgeleri(id),
  ADD COLUMN IF NOT EXISTS not_public TEXT,
  ADD COLUMN IF NOT EXISTS not_internal TEXT,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE fatura_detaylari
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS net_birim_fiyat NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS tutar_ht NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS tutar_ttc NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS urun_tipi VARCHAR(20) DEFAULT 'Stok',
  ADD COLUMN IF NOT EXISTS maliyet_birim NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS parti_id INT REFERENCES stok_partileri(id),
  ADD COLUMN IF NOT EXISTS seri_no VARCHAR(80);

-- ========== Satınalma siparişi ==========
ALTER TABLE satin_alma_siparisleri
  ADD COLUMN IF NOT EXISTS tedarikci_siparis_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS depo_id INT REFERENCES depolar(id),
  ADD COLUMN IF NOT EXISTS para_birimi VARCHAR(10) DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ara_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS toplam_kdv NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS genel_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS odeme_sekli VARCHAR(40),
  ADD COLUMN IF NOT EXISTS hareket_kodu_id INT REFERENCES hareket_kodlari(id),
  ADD COLUMN IF NOT EXISTS aciklama TEXT,
  ADD COLUMN IF NOT EXISTS not_public TEXT,
  ADD COLUMN IF NOT EXISTS not_internal TEXT,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sevk_adresi TEXT,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

ALTER TABLE satin_alma_siparis_satirlari
  ADD COLUMN IF NOT EXISTS sira_no INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS iskonto_oran NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iskonto_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kdv_oran NUMERIC(8,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS kdv_tutari NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutar_ht NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS tutar_ttc NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS teslim_tarihi DATE,
  ADD COLUMN IF NOT EXISTS kabul_edilen_miktar NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fatura_edilen_miktar NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stok_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS stok_adi VARCHAR(200);

-- ========== Mal kabul ==========
ALTER TABLE mal_kabuller
  ADD COLUMN IF NOT EXISTS durum VARCHAR(20) NOT NULL DEFAULT 'Onayli'
    CHECK (durum IN ('Taslak', 'Onayli', 'Kismi', 'Iptal', 'Kapali')),
  ADD COLUMN IF NOT EXISTS irsaliye_no_tedarikci VARCHAR(80),
  ADD COLUMN IF NOT EXISTS irsaliye_tarihi DATE,
  ADD COLUMN IF NOT EXISTS fatura_no_tedarikci VARCHAR(80),
  ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS hareket_kodu_id INT REFERENCES hareket_kodlari(id),
  ADD COLUMN IF NOT EXISTS kabul_eden_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS aciklama TEXT,
  ADD COLUMN IF NOT EXISTS not_internal TEXT,
  ADD COLUMN IF NOT EXISTS gkk_gerekli BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS kaynak_belge_tipi VARCHAR(40),
  ADD COLUMN IF NOT EXISTS kaynak_belge_id INT;

ALTER TABLE mal_kabul_satirlari
  ADD COLUMN IF NOT EXISTS sira_no INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS birim VARCHAR(20),
  ADD COLUMN IF NOT EXISTS birim_fiyat NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kabul_edilen NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS reddedilen NUMERIC(18,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parti_id INT REFERENCES stok_partileri(id),
  ADD COLUMN IF NOT EXISTS parti_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS seri_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS stok_statu VARCHAR(20) DEFAULT 'Kalitede',
  ADD COLUMN IF NOT EXISTS raf_kodu VARCHAR(50),
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS son_kullanma_tarihi DATE;

-- ========== Stok hareket (≈ InventTrans / llx_stock_mouvement) ==========
ALTER TABLE stok_hareketleri
  ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id),
  ADD COLUMN IF NOT EXISTS cari_id INT REFERENCES cariler(id),
  ADD COLUMN IF NOT EXISTS kullanici_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS referans_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS maliyet_toplam NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envanter_kodu VARCHAR(80),
  ADD COLUMN IF NOT EXISTS fiziksel_tarih DATE,
  ADD COLUMN IF NOT EXISTS mali_tarih DATE,
  ADD COLUMN IF NOT EXISTS onay_durumu VARCHAR(20) DEFAULT 'Onayli',
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE stok_hareket_satirlari
  ADD COLUMN IF NOT EXISTS birim_maliyet NUMERIC(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutar_maliyet NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS satir_aciklama TEXT,
  ADD COLUMN IF NOT EXISTS seri_id INT REFERENCES stok_serileri(id),
  ADD COLUMN IF NOT EXISTS seri_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS sira_no INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kaynak_belge_satir_id INT;

-- ========== Cari hareket / tahsilat ==========
ALTER TABLE cari_hareketleri
  ADD COLUMN IF NOT EXISTS vade_tarihi DATE,
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS bakiye_sonrasi NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS kapama_belge_id INT,
  ADD COLUMN IF NOT EXISTS kapama_belge_tipi VARCHAR(40);

ALTER TABLE tahsilat_odemeler
  ADD COLUMN IF NOT EXISTS proje_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id),
  ADD COLUMN IF NOT EXISTS kasa_hesap_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS banka_hesap_kodu VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cek_no VARCHAR(40),
  ADD COLUMN IF NOT EXISTS vade_tarihi DATE,
  ADD COLUMN IF NOT EXISTS kur NUMERIC(18,6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS olusturan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onaylayan_kullanici VARCHAR(40),
  ADD COLUMN IF NOT EXISTS onay_tarihi TIMESTAMP,
  ADD COLUMN IF NOT EXISTS guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Mevcut kayıtlarda türetilmiş toplamları doldur (best-effort)
UPDATE siparisler SET
  ara_toplam = COALESCE(NULLIF(ara_toplam, 0), toplam_tutar),
  genel_toplam = COALESCE(NULLIF(genel_toplam, 0), toplam_tutar)
WHERE ara_toplam = 0 OR ara_toplam IS NULL OR genel_toplam = 0 OR genel_toplam IS NULL;

UPDATE faturalar SET
  kalan_tutar = COALESCE(kalan_tutar, COALESCE(odenecek_tutar, toplam_tutar) - COALESCE(odenen_tutar, 0))
WHERE kalan_tutar IS NULL;

UPDATE siparis_detaylari SET
  tutar_ht = COALESCE(tutar_ht, toplam_tutar),
  tutar_ttc = COALESCE(tutar_ttc, toplam_tutar + COALESCE(kdv_tutari, 0)),
  net_birim_fiyat = COALESCE(net_birim_fiyat, birim_fiyat),
  bekleyen_miktar = COALESCE(bekleyen_miktar,
    GREATEST(0, COALESCE(miktar,0) - COALESCE(sevk_edilen_miktar,0)))
WHERE tutar_ht IS NULL OR bekleyen_miktar IS NULL;
