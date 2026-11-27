-- Numaratörleri ekran kodlarıyla bağla (takip ve UI eşlemesi)

ALTER TABLE kod_serileri ADD COLUMN IF NOT EXISTS ekran_kodu VARCHAR(80);
ALTER TABLE kod_serileri ADD COLUMN IF NOT EXISTS ekran_adi VARCHAR(120);
ALTER TABLE kod_serileri ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE kod_serileri SET ekran_kodu = 'firmalar', ekran_adi = 'Firmalar' WHERE seri_kodu = 'FIRMA';
UPDATE kod_serileri SET ekran_kodu = 'is-yerleri', ekran_adi = 'İş Yerleri' WHERE seri_kodu = 'ISYERI';
UPDATE kod_serileri SET ekran_kodu = 'depolar', ekran_adi = 'Depolar' WHERE seri_kodu = 'DEPO';
UPDATE kod_serileri SET ekran_kodu = 'cari-kartlari', ekran_adi = 'Cari Kartları' WHERE seri_kodu IN ('MUSTERI', 'TEDARIKCI', 'CARI_HERIKISI');
UPDATE kod_serileri SET ekran_kodu = 'stok-karti', ekran_adi = 'Stok Kartı' WHERE seri_kodu IN ('HAMMADDE', 'YARIMAMUL', 'MAMUL', 'TICARI');
UPDATE kod_serileri SET ekran_kodu = 'satin-alma-talepleri', ekran_adi = 'Satınalma Talepleri' WHERE seri_kodu = 'SATINALMA_TALEP';
UPDATE kod_serileri SET ekran_kodu = 'satin-alma-siparisleri', ekran_adi = 'Satınalma Siparişleri' WHERE seri_kodu = 'SATINALMA_SIPARIS';
UPDATE kod_serileri SET ekran_kodu = 'mal-kabuller', ekran_adi = 'Mal Kabuller' WHERE seri_kodu = 'MAL_KABUL';
UPDATE kod_serileri SET ekran_kodu = 'uretim-emirleri', ekran_adi = 'Üretim Emirleri' WHERE seri_kodu = 'URETIM_EMRI';
UPDATE kod_serileri SET ekran_kodu = 'kisiler', ekran_adi = 'Kişiler' WHERE seri_kodu = 'KISI';
UPDATE kod_serileri SET ekran_kodu = 'stok-hareketleri', ekran_adi = 'Stok Hareketleri' WHERE seri_kodu = 'STOK_HAREKET';
UPDATE kod_serileri SET ekran_kodu = 'satis-siparisleri', ekran_adi = 'Satış Siparişleri' WHERE seri_kodu = 'SATIS_SIPARIS';
UPDATE kod_serileri SET ekran_kodu = 'uretim-girisleri', ekran_adi = 'Üretim Girişleri' WHERE seri_kodu = 'URETIM_GIRIS';

INSERT INTO kod_serileri (seri_kodu, onek, aciklama, son_numara, ekran_kodu, ekran_adi, aktif)
VALUES
    ('URUN_AGACI', 'A', 'Ürün ağacı', 0, 'urun-agaci', 'Ürün Ağacı', TRUE),
    ('ROTA', 'O', 'Rota', 0, 'rotalar', 'Rotalar', TRUE),
    ('IS_MERKEZI', 'W', 'İş merkezi', 0, 'is-merkezleri', 'İş Merkezleri', TRUE)
ON CONFLICT (seri_kodu) DO UPDATE
SET ekran_kodu = EXCLUDED.ekran_kodu,
    ekran_adi = EXCLUDED.ekran_adi;

CREATE INDEX IF NOT EXISTS idx_kod_serileri_ekran ON kod_serileri (ekran_kodu);
