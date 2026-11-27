-- MRP konsol: ufuk tarihleri, not, çalıştırma mesaj günlüğü
ALTER TABLE mrp_runs
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS mrp_run_messages (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES mrp_runs(id) ON DELETE CASCADE,
  level VARCHAR(16) NOT NULL DEFAULT 'INFO',
  code VARCHAR(64),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mrp_run_messages_run
  ON mrp_run_messages (run_id, id);
