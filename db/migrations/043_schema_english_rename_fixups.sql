-- 043: Fix imperfect English names from 042 (RENAME only, no data loss)
-- 042 applied partial/tokenized names (e.g. yeni→new, emniyet_stok→emniyet_item).
-- This migration aligns physical names with the corrected dictionary.

BEGIN;

-- Permissions: reserved word "new" → can_create (UI/API keeps action key `yeni` via alias)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_screen_permissions' AND column_name='new'
  ) THEN
    ALTER TABLE user_screen_permissions RENAME COLUMN "new" TO can_create;
  END IF;
END $$;

-- Items / MRP stock planning
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='emniyet_item') THEN
    ALTER TABLE items RENAME COLUMN emniyet_item TO safety_stock;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='minimum_item') THEN
    ALTER TABLE items RENAME COLUMN minimum_item TO min_stock;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='maksimum_item') THEN
    ALTER TABLE items RENAME COLUMN maksimum_item TO max_stock;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='yeniden_order_seviyesi') THEN
    ALTER TABLE items RENAME COLUMN yeniden_order_seviyesi TO reorder_level;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='sabit_order_quantity') THEN
    ALTER TABLE items RENAME COLUMN sabit_order_quantity TO fixed_order_quantity;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mrp_results' AND column_name='emniyet_item') THEN
    ALTER TABLE mrp_results RENAME COLUMN emniyet_item TO safety_stock;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mrp_results' AND column_name='yeniden_order') THEN
    ALTER TABLE mrp_results RENAME COLUMN yeniden_order TO reorder_point;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mrp_results' AND column_name='kullanilabilir_item') THEN
    ALTER TABLE mrp_results RENAME COLUMN kullanilabilir_item TO available_stock;
  END IF;
END $$;

-- Person-name-ish fields that were over-mapped from *ad*
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_notes' AND column_name='ecommerce_first_name') THEN
    ALTER TABLE delivery_notes RENAME COLUMN ecommerce_first_name TO ecommerce_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_notes' AND column_name='ship_first_name') THEN
    ALTER TABLE delivery_notes RENAME COLUMN ship_first_name TO ship_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_notes' AND column_name='driver_first_name') THEN
    ALTER TABLE delivery_notes RENAME COLUMN driver_first_name TO driver_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='ecommerce_first_name') THEN
    ALTER TABLE invoices RENAME COLUMN ecommerce_first_name TO ecommerce_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='ship_first_name') THEN
    ALTER TABLE invoices RENAME COLUMN ship_first_name TO ship_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_orders' AND column_name='driver_first_name') THEN
    ALTER TABLE shipment_orders RENAME COLUMN driver_first_name TO driver_name;
  END IF;
END $$;

-- Purchase context: siparis_id was wrongly renamed to sales_order_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='goods_receipts' AND column_name='sales_order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='goods_receipts' AND column_name='purchase_order_id'
  ) THEN
    ALTER TABLE goods_receipts RENAME COLUMN sales_order_id TO purchase_order_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='purchase_order_lines' AND column_name='sales_order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='purchase_order_lines' AND column_name='purchase_order_id'
  ) THEN
    ALTER TABLE purchase_order_lines RENAME COLUMN sales_order_id TO purchase_order_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vendor_delivery_notes' AND column_name='sales_order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='vendor_delivery_notes' AND column_name='purchase_order_id'
  ) THEN
    ALTER TABLE vendor_delivery_notes RENAME COLUMN sales_order_id TO purchase_order_id;
  END IF;
END $$;

COMMIT;
