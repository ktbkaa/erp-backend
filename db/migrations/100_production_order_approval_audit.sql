-- PRDT03 Kolay İş Emri Onayı — onay audit alanları

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS approved_by_user_code VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_production_orders_approval_queue
  ON production_orders (company_id, status, is_approved)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;
