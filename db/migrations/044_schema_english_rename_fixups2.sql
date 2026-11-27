-- 044: Additional English rename fixups (RENAME only)
-- Align leftover 042 token results with the corrected dictionary used in application code.

BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_counts' AND column_name='created_by_user') THEN
    ALTER TABLE inventory_counts RENAME COLUMN created_by_user TO created_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_counts' AND column_name='approved_by_user') THEN
    ALTER TABLE inventory_counts RENAME COLUMN approved_by_user TO approved_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfer_orders' AND column_name='created_by_user') THEN
    ALTER TABLE transfer_orders RENAME COLUMN created_by_user TO created_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfer_orders' AND column_name='approved_by_user') THEN
    ALTER TABLE transfer_orders RENAME COLUMN approved_by_user TO approved_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mrp_runs' AND column_name='created_by_user') THEN
    ALTER TABLE mrp_runs RENAME COLUMN created_by_user TO created_by;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_order_lines' AND column_name='item_uom') THEN
    ALTER TABLE sales_order_lines RENAME COLUMN item_uom TO stock_uom;
  END IF;
END $$;

COMMIT;
