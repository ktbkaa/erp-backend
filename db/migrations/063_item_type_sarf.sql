-- Sarf malzeme tipi: genel merkez ofis/sarf stokları; kalite kontrol dışı
ALTER TABLE items DROP CONSTRAINT IF EXISTS chk_stok_tipi;
ALTER TABLE items ADD CONSTRAINT chk_stok_tipi CHECK (
  (item_type)::text = ANY ((ARRAY[
    'Hammadde'::character varying,
    'YariMamul'::character varying,
    'Mamul'::character varying,
    'Ticari'::character varying,
    'Hizmet'::character varying,
    'Sarf'::character varying
  ])::text[])
);
