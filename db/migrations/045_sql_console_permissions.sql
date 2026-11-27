-- SQL Sorgu ekranı: kullanıcı bazlı SELECT / INSERT / UPDATE / DELETE yetkileri
-- + isteğe bağlı kayıtlı bağlantı profili (şifre uygulama tarafında tutulmaz; sadece host meta)

CREATE TABLE IF NOT EXISTS user_sql_permissions (
  id SERIAL PRIMARY KEY,
  kisi_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_select BOOLEAN NOT NULL DEFAULT TRUE,
  can_insert BOOLEAN NOT NULL DEFAULT FALSE,
  can_update BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (kisi_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sql_perm_kisi ON user_sql_permissions (kisi_id);

COMMENT ON TABLE user_sql_permissions IS 'SQL Sorgu ekranı DML yetkileri; SELECT dışı işlemler transaction (commit/rollback) zorunlu.';

-- Yönetici / ADMIN kullanıcılara varsayılan tam SQL yetkisi
INSERT INTO user_sql_permissions (kisi_id, can_select, can_insert, can_update, can_delete)
SELECT u.id, TRUE, TRUE, TRUE, TRUE
FROM users u
WHERE UPPER(COALESCE(u.role, '')) IN ('YONETICI', 'ADMIN', 'YÖNETİCİ')
   OR UPPER(COALESCE(u.user_code, '')) = 'ADMIN'
ON CONFLICT (kisi_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sql_connection_profiles (
  id SERIAL PRIMARY KEY,
  profile_name VARCHAR(80) NOT NULL,
  host VARCHAR(200) NOT NULL DEFAULT 'localhost',
  port INTEGER NOT NULL DEFAULT 5432,
  database_name VARCHAR(120) NOT NULL DEFAULT 'postgres',
  username VARCHAR(120) NOT NULL DEFAULT 'postgres',
  -- password never stored; user re-enters when connecting
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_name)
);

INSERT INTO sql_connection_profiles (profile_name, host, port, database_name, username, is_default, created_by)
VALUES ('Yerel PostgreSQL', 'localhost', 5432, 'postgres', 'postgres', TRUE, 'system')
ON CONFLICT (profile_name) DO NOTHING;
