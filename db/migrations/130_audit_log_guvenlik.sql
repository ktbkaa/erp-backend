-- G-07: audit_logs — HTTP durum kodu, istemci IP / user-agent, uzun yol, sorgu indeksleri.
-- Yalnız ekleme/genişletme; mevcut veri korunur.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status_code INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent VARCHAR(300);

ALTER TABLE audit_logs ALTER COLUMN request_path TYPE VARCHAR(500);
ALTER TABLE audit_logs ALTER COLUMN action TYPE VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_code ON audit_logs (user_code);
