-- Rota ↔ ürün ağacı bağı: operasyon bileşenleri seçilen BOM malzemeleriyle sınırlanır
ALTER TABLE rotalar
    ADD COLUMN IF NOT EXISTS urun_agaci_id INT REFERENCES urun_agaclari(id);

CREATE INDEX IF NOT EXISTS idx_rotalar_urun_agaci ON rotalar(urun_agaci_id);

COMMENT ON COLUMN rotalar.urun_agaci_id IS 'Rota için referans ürün ağacı; bileşen/çıktı stok seçimi bu ağaca göre filtrelenir';
