-- Malzeme tüketiminde parti kaynağı: "Manuel giriş" veya otomatik düşülen parti(ler)
ALTER TABLE production_receipt_materials
  ADD COLUMN IF NOT EXISTS lot_source VARCHAR(500);

ALTER TABLE production_order_operation_components
  ADD COLUMN IF NOT EXISTS lot_source VARCHAR(500);

ALTER TABLE production_order_components
  ADD COLUMN IF NOT EXISTS lot_source VARCHAR(500);

COMMENT ON COLUMN production_receipt_materials.lot_source IS
  'Tüketim parti kaynağı: Manuel giriş veya otomatik (FIFO) düşülen parti(ler)';
COMMENT ON COLUMN production_order_operation_components.lot_source IS
  'Rota malzemesinde tüketilen parti kaynak(lar)ı (birikimli)';
COMMENT ON COLUMN production_order_components.lot_source IS
  'İş emri malzemesinde tüketilen parti kaynak(lar)ı (birikimli)';
