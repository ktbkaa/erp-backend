-- Schema ID / column name fixups after English rename gaps
-- 1) items.item_takip_uom → stock_takip_uom (code uses stock_*)
-- 2) movement_codes.item_etkisi → stock_etkisi (code uses stock_*)
-- 3) document_types.item_etkisi → stock_etkisi (align with movement_codes + optional UI)
-- 4) invoice_matches.sales_order_id → purchase_order_id (purchase 3-way match)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='items' AND column_name='item_takip_uom'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='items' AND column_name='stock_takip_uom'
  ) THEN
    ALTER TABLE items RENAME COLUMN item_takip_uom TO stock_takip_uom;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movement_codes' AND column_name='item_etkisi'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movement_codes' AND column_name='stock_etkisi'
  ) THEN
    ALTER TABLE movement_codes RENAME COLUMN item_etkisi TO stock_etkisi;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_types' AND column_name='item_etkisi'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='document_types' AND column_name='stock_etkisi'
  ) THEN
    ALTER TABLE document_types RENAME COLUMN item_etkisi TO stock_etkisi;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoice_matches' AND column_name='sales_order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='invoice_matches' AND column_name='purchase_order_id'
  ) THEN
    ALTER TABLE invoice_matches RENAME COLUMN sales_order_id TO purchase_order_id;
  END IF;
END $$;
