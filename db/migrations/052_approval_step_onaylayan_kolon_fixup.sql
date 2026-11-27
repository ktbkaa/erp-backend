-- 042 rename hatası: approved_by_user_kisi_id → approved_by_kisi_id
-- 051 içinde de aynı DO var; bu dosya daha önce 051 uygulanmış ortamlara güvenlik ağıdır.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_record_steps' AND column_name = 'approved_by_user_kisi_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_record_steps' AND column_name = 'approved_by_kisi_id'
  ) THEN
    ALTER TABLE approval_record_steps RENAME COLUMN approved_by_user_kisi_id TO approved_by_kisi_id;
  END IF;
END $$;
