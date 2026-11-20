-- Fason giriş kalite (GKK) kapısı — firma bazlı altyapı
-- Teslim alınan ürün KK onayı olmadan üretime/kabul miktarına yansımaz (opsiyonel sıkı tüketim kilidi).

ALTER TABLE subcontract_parameters
  ADD COLUMN IF NOT EXISTS qc_on_receipt BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS block_production_until_qc BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS require_qc_before_consume BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN subcontract_parameters.qc_on_receipt IS
  'Fason teslimatta GKK emri açılsın; stok Kalitede beklesin.';
COMMENT ON COLUMN subcontract_parameters.block_production_until_qc IS
  'KK kabul edilmeden operasyon tamamlanmasın / produced_qty artmasın.';
COMMENT ON COLUMN subcontract_parameters.require_qc_before_consume IS
  'Açıkken: emanet tüketimi, siparişte bekleyen GKK varken engellenir (5→GKK→6 sırası).';

-- Mevcut qc_required ile hizala
UPDATE subcontract_parameters
SET qc_on_receipt = qc_required
WHERE TRUE;

ALTER TABLE subcontract_receipt_lines
  ADD COLUMN IF NOT EXISTS qc_order_id INT REFERENCES qc_orders(id);

-- receipts.qc_order_id FK (yoksa ekle)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subcontract_receipts_qc_order_id_fkey'
  ) THEN
    ALTER TABLE subcontract_receipts
      ADD CONSTRAINT subcontract_receipts_qc_order_id_fkey
      FOREIGN KEY (qc_order_id) REFERENCES qc_orders(id);
  END IF;
EXCEPTION WHEN others THEN
  NULL; -- mevcut veri / kısmi ortamlar
END $$;
