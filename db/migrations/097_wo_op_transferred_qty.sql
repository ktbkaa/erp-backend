-- Operasyonlar: bir sonraki operasyona aktarılan miktar
ALTER TABLE production_order_operations
  ADD COLUMN IF NOT EXISTS transferred_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0;

COMMENT ON COLUMN production_order_operations.transferred_quantity IS
  'Bu operasyonda üretilip sonraki operasyona aktarılan miktar';
