-- Sipariş satırına gerçek stok ilişkisi + sipariş durum alanı.
-- Mevcut satırlar stok_kodu üzerinden mümkünse doldurulur.

ALTER TABLE siparis_detaylari
    ADD COLUMN IF NOT EXISTS stok_id INT REFERENCES stoklar(id);

UPDATE siparis_detaylari sd
SET stok_id = s.id
FROM stoklar s
WHERE sd.stok_id IS NULL
  AND sd.stok_kodu = s.stok_kodu;

ALTER TABLE siparisler
    ADD COLUMN IF NOT EXISTS durum VARCHAR(30) NOT NULL DEFAULT 'Taslak';

-- Eski kayıtlarda durum yoksa Taslak kalsın; CHECK sonradan sıkılaştırılabilir.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_siparis_durum'
    ) THEN
        ALTER TABLE siparisler
            ADD CONSTRAINT chk_siparis_durum
            CHECK (durum IN ('Taslak', 'Onayli', 'Kismi', 'Kapali', 'Iptal'));
    END IF;
END $$;

-- Stok kartına tip / tedarik tipi (ERP ana veri)
ALTER TABLE stoklar
    ADD COLUMN IF NOT EXISTS stok_tipi VARCHAR(30) NOT NULL DEFAULT 'Ticari';

ALTER TABLE stoklar
    ADD COLUMN IF NOT EXISTS tedarik_tipi VARCHAR(30) NOT NULL DEFAULT 'Satinalma';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_stok_tipi'
    ) THEN
        ALTER TABLE stoklar
            ADD CONSTRAINT chk_stok_tipi
            CHECK (stok_tipi IN ('Hammadde', 'YariMamul', 'Mamul', 'Ticari', 'Hizmet'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tedarik_tipi'
    ) THEN
        ALTER TABLE stoklar
            ADD CONSTRAINT chk_tedarik_tipi
            CHECK (tedarik_tipi IN ('Satinalma', 'Uretim', 'HerIkisi'));
    END IF;
END $$;
