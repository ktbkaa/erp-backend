-- 019: Kısmi / incelenmesi gereken maddelerin kapatılması
-- odeme_kosulu, mal_kabul→fatura, kullanıcı parola, menü yetki, hareket raf, indeksler

-- SA teklif durum: siparişe dönüşüm
ALTER TABLE satin_alma_teklifleri DROP CONSTRAINT IF EXISTS satin_alma_teklifleri_durum_check;
ALTER TABLE satin_alma_teklifleri
  ADD CONSTRAINT satin_alma_teklifleri_durum_check
  CHECK (durum IN ('Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'SipariseDonustu', 'Iptal', 'Kapali'));

ALTER TABLE satin_alma_teklifleri ADD COLUMN IF NOT EXISTS is_yeri_id INT REFERENCES is_yerleri(id);

-- Fatura / sipariş ödeme koşulu
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS odeme_kosulu VARCHAR(80);
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS mal_kabul_id INT REFERENCES mal_kabuller(id);
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS kur NUMERIC(18, 6) DEFAULT 1;
ALTER TABLE faturalar ADD COLUMN IF NOT EXISTS kdv_oran_varsayilan NUMERIC(8, 2) DEFAULT 20;

ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS odeme_kosulu VARCHAR(80);
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

ALTER TABLE satin_alma_siparisleri ADD COLUMN IF NOT EXISTS odeme_kosulu VARCHAR(80);
ALTER TABLE satin_alma_siparisleri ADD COLUMN IF NOT EXISTS teklif_id INT;
ALTER TABLE satin_alma_siparisleri ADD COLUMN IF NOT EXISTS firma_id INT REFERENCES firmalar(id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'satin_alma_siparisleri_teklif_id_fkey'
  ) THEN
    ALTER TABLE satin_alma_siparisleri
      ADD CONSTRAINT satin_alma_siparisleri_teklif_id_fkey
      FOREIGN KEY (teklif_id) REFERENCES satin_alma_teklifleri(id);
  END IF;
END $$;

-- Kullanıcı parola (bcrypt hash metin) + son giriş
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS parola_hash TEXT;
ALTER TABLE kisiler ADD COLUMN IF NOT EXISTS son_giris_at TIMESTAMP;

-- Grup menü/modül yetkileri (JSON dizi: ["stok","satis",...] veya ["*"])
ALTER TABLE kullanici_gruplari ADD COLUMN IF NOT EXISTS modul_yetkileri TEXT DEFAULT '["*"]';
ALTER TABLE kullanici_gruplari ADD COLUMN IF NOT EXISTS depo_yetkileri TEXT DEFAULT '["*"]';

-- Stok hareket satırında raf/konum (WMS light)
ALTER TABLE stok_hareket_satirlari ADD COLUMN IF NOT EXISTS raf_kodu VARCHAR(50);
ALTER TABLE stok_hareket_satirlari ADD COLUMN IF NOT EXISTS konum_kodu VARCHAR(50);

-- Belge numaraları legacy notu
COMMENT ON TABLE belge_numaralari IS 'LEGACY — runtime numaralandırma kod_serileri üzerinden; yeni kod yazmayın (019).';

-- Performans indeksleri (N+1 / liste)
CREATE INDEX IF NOT EXISTS idx_faturalar_turu ON faturalar(fatura_turu);
CREATE INDEX IF NOT EXISTS idx_faturalar_cari ON faturalar(cari_id);
CREATE INDEX IF NOT EXISTS idx_stok_hareket_satir_stok ON stok_hareket_satirlari(stok_id);
CREATE INDEX IF NOT EXISTS idx_stok_hareket_satir_parti ON stok_hareket_satirlari(parti_id);
CREATE INDEX IF NOT EXISTS idx_stok_hareket_depo ON stok_hareketleri(depo_id);
CREATE INDEX IF NOT EXISTS idx_siparis_detay_stok ON siparis_detaylari(stok_id);
CREATE INDEX IF NOT EXISTS idx_mal_kabul_siparis ON mal_kabuller(siparis_id);
CREATE INDEX IF NOT EXISTS idx_kk_emir_durum ON kk_emirleri(durum);
CREATE INDEX IF NOT EXISTS idx_eposta_durum ON eposta_gonderimleri(durum);

-- Numaratör: transfer / sayım
INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
  ('STOK_TRANSFER', 'TR', 'Depolar Arası Transfer', 0, 'stok-hareketleri', 'Stok Hareketleri', TRUE),
  ('STOK_SAYIM', 'SY', 'Stok Sayımı', 0, 'stok-sayim', 'Stok Sayım', TRUE),
  ('STOK_FIRE', 'FR', 'Fire / Düzeltme', 0, 'stok-hareketleri', 'Stok Hareketleri', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE SET
  ekran_kodu = EXCLUDED.ekran_kodu,
  ekran_adi = EXCLUDED.ekran_adi;

-- Sistem parametreleri
INSERT INTO sistem_parametreleri (parametre_kodu, parametre_adi, deger, modul, aciklama)
VALUES
  ('ATP_SERT', 'ATP sert kontrol', 'Hayir', 'STOK', 'Evet ise satış siparişinde yetersiz stokta kayıt engellenir'),
  ('AUTH_ZORUNLU', 'Auth zorunlu', 'Hayir', 'SYS', 'Evet ise X-Kullanici-Kodu veya oturum zorunlu'),
  ('VARSAYILAN_PARA', 'Varsayılan para birimi', 'TRY', 'FIN', 'Tek para birimi (çoklu kur v2)'),
  ('VARSAYILAN_KDV', 'Varsayılan KDV %', '20', 'FIN', 'Fatura satır KDV varsayılanı')
ON CONFLICT (parametre_kodu) DO NOTHING;

-- Gruplara geniş yetki seed
UPDATE kullanici_gruplari SET modul_yetkileri = '["*"]', depo_yetkileri = '["*"]'
WHERE modul_yetkileri IS NULL OR modul_yetkileri = '';
