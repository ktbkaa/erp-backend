-- MRP sonuç: min/max/hedef ortalama bandı + izlenebilir rapor alanları
ALTER TABLE mrp_results
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hedef_ortalama NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS giris_toplam NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cikis_toplam NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acik_isemri NUMERIC(18,4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN mrp_results.hedef_ortalama IS
  'Stok kartı min/max ortalaması — ufuk içi hedef seviye';
COMMENT ON COLUMN mrp_results.giris_toplam IS
  'Ufuk içinde stok hareketi giriş toplamı (rapor)';
COMMENT ON COLUMN mrp_results.cikis_toplam IS
  'Ufuk içinde stok hareketi çıkış toplamı (rapor)';
