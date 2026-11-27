-- 160 e-Belge (GİB e-Fatura / e-Arşiv / e-İrsaliye): UBL-TR üretimi, gönderim takibi,
-- yeniden deneme kuyruğu, olay/hata kaydı, numara serisi, değiştirilemez arşiv.

-- ─── Firma e-belge ayarları ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS e_document_settings (
  company_id            INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  provider_code         VARCHAR(30),               -- MOCK | REST | GIB_PORTAL (boş: EBELGE_SAGLAYICI)
  invoice_prefix        CHAR(3) NOT NULL DEFAULT 'EFT',
  archive_prefix        CHAR(3) NOT NULL DEFAULT 'EAR',
  despatch_prefix       CHAR(3) NOT NULL DEFAULT 'IRS',
  invoice_sender_alias  VARCHAR(200),              -- urn:mail:defaultgb@...
  despatch_sender_alias VARCHAR(200),
  default_profile       VARCHAR(30) NOT NULL DEFAULT 'TICARIFATURA',
  street_name           VARCHAR(250),
  building_number       VARCHAR(30),
  district              VARCHAR(100),
  city                  VARCHAR(100),
  postal_code           VARCHAR(10),
  country_name          VARCHAR(100) NOT NULL DEFAULT 'Türkiye',
  iban                  VARCHAR(40),
  bank_name             VARCHAR(150),
  pdf_template          VARCHAR(20) NOT NULL DEFAULT 'standart',
  pdf_footer_note       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_e_doc_settings_prefix CHECK (
    invoice_prefix ~ '^[A-Z0-9]{3}$' AND archive_prefix ~ '^[A-Z0-9]{3}$' AND despatch_prefix ~ '^[A-Z0-9]{3}$'
  ),
  CONSTRAINT chk_e_doc_settings_template CHECK (pdf_template IN ('standart', 'matbu'))
);

-- ─── GİB belge numarası serisi: ABC + yıl + 9 hane, firma/tür/önek/yıl bazında ardışık ───
CREATE TABLE IF NOT EXISTS e_document_series (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL DEFAULT 0,          -- 0: firma kapsamı yok
  series_kind  VARCHAR(20) NOT NULL,                -- EFATURA | EARSIV | EIRSALIYE
  prefix       CHAR(3) NOT NULL,
  year         INTEGER NOT NULL,
  last_number  BIGINT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_e_document_series UNIQUE (company_id, series_kind, prefix, year),
  CONSTRAINT chk_e_document_series_kind CHECK (series_kind IN ('EFATURA', 'EARSIV', 'EIRSALIYE')),
  CONSTRAINT chk_e_document_series_prefix CHECK (prefix ~ '^[A-Z0-9]{3}$'),
  CONSTRAINT chk_e_document_series_range CHECK (last_number BETWEEN 0 AND 999999999)
);

-- ─── Kuyruk: gönderim durumu ve yeniden deneme alanları ─────────────────────
ALTER TABLE e_document_queue
  ADD COLUMN IF NOT EXISTS profile_id              VARCHAR(30),
  ADD COLUMN IF NOT EXISTS invoice_type_code       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS series_kind             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS send_mode               VARCHAR(10),      -- mock | test | live
  ADD COLUMN IF NOT EXISTS is_simulated            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sender_alias            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS receiver_alias          VARCHAR(200),
  ADD COLUMN IF NOT EXISTS envelope_uuid           TEXT,
  ADD COLUMN IF NOT EXISTS provider_ref            TEXT,
  ADD COLUMN IF NOT EXISTS provider_status_code    VARCHAR(40),
  ADD COLUMN IF NOT EXISTS provider_status_message TEXT,
  ADD COLUMN IF NOT EXISTS attempt_count           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts            INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS next_attempt_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempt_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error_code         VARCHAR(60),
  ADD COLUMN IF NOT EXISTS retryable               BOOLEAN,
  ADD COLUMN IF NOT EXISTS last_status_check_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason           TEXT,
  ADD COLUMN IF NOT EXISTS cancel_ref              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS xml_sha256              CHAR(64),
  ADD COLUMN IF NOT EXISTS validation_json         JSONB,
  ADD COLUMN IF NOT EXISTS created_by              VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_e_document_queue_due
  ON e_document_queue (next_attempt_at)
  WHERE status IN ('Kuyrukta', 'Hata');

-- ─── Olay / hata kaydı (silinmez, güncellenmez) ─────────────────────────────
CREATE TABLE IF NOT EXISTS e_document_events (
  id            BIGSERIAL PRIMARY KEY,
  queue_id      BIGINT NOT NULL,
  company_id    INTEGER,
  event_type    VARCHAR(30) NOT NULL,   -- HAZIRLA | KUYRUK | GONDER | DURUM | HATA | YENIDEN_DENE | IPTAL | MANUEL | UYARI
  status_from   TEXT,
  status_to     TEXT,
  success       BOOLEAN NOT NULL DEFAULT TRUE,
  send_mode     VARCHAR(10),
  error_code    VARCHAR(60),
  message       TEXT,
  detail_json   JSONB,
  created_by    VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_e_document_events_queue ON e_document_events(queue_id, id);
CREATE INDEX IF NOT EXISTS idx_e_document_events_errors ON e_document_events(created_at) WHERE success = FALSE;

-- ─── Arşiv: UBL XML, zarf, PDF görüntü, entegratör yanıtları ───────────────
-- VUK 253 / e-Fatura saklama: varsayılan 10 yıl. Kayıt değiştirilemez, süre dolmadan silinemez.
CREATE TABLE IF NOT EXISTS e_document_archive (
  id             BIGSERIAL PRIMARY KEY,
  queue_id       BIGINT,
  company_id     INTEGER,
  document_type  TEXT NOT NULL,
  document_id    INTEGER NOT NULL,
  uuid_ettn      TEXT,
  gib_number     TEXT,
  content_kind   VARCHAR(20) NOT NULL,  -- UBL_XML | ZARF_XML | PDF | YANIT
  mime_type      VARCHAR(80) NOT NULL,
  file_name      VARCHAR(200),
  content        BYTEA NOT NULL,
  sha256         CHAR(64) NOT NULL,
  byte_size      INTEGER NOT NULL,
  retain_until   DATE NOT NULL,
  created_by     VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_e_document_archive_kind CHECK (content_kind IN ('UBL_XML', 'ZARF_XML', 'PDF', 'YANIT'))
);
CREATE INDEX IF NOT EXISTS idx_e_document_archive_queue ON e_document_archive(queue_id);
CREATE INDEX IF NOT EXISTS idx_e_document_archive_doc ON e_document_archive(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_e_document_archive_ettn ON e_document_archive(uuid_ettn);

CREATE OR REPLACE FUNCTION e_document_archive_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'e-Belge arşiv kaydı değiştirilemez (id=%)', OLD.id USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.retain_until > CURRENT_DATE THEN
    RAISE EXCEPTION 'e-Belge arşiv kaydı saklama süresi (%) dolmadan silinemez (id=%)', OLD.retain_until, OLD.id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_e_document_archive_guard ON e_document_archive;
CREATE TRIGGER trg_e_document_archive_guard
  BEFORE UPDATE OR DELETE ON e_document_archive
  FOR EACH ROW EXECUTE FUNCTION e_document_archive_guard();

CREATE OR REPLACE FUNCTION e_document_events_guard() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'e-Belge olay kaydı değiştirilemez/silinemez (id=%)', OLD.id USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_e_document_events_guard ON e_document_events;
CREATE TRIGGER trg_e_document_events_guard
  BEFORE UPDATE OR DELETE ON e_document_events
  FOR EACH ROW EXECUTE FUNCTION e_document_events_guard();

-- ─── GİB kayıtlı kullanıcı (e-Fatura / e-İrsaliye mükellef) önbelleği ───────
CREATE TABLE IF NOT EXISTS e_document_registered_users (
  id            SERIAL PRIMARY KEY,
  tax_id        VARCHAR(11) NOT NULL,
  document_kind VARCHAR(20) NOT NULL,  -- EFATURA | EIRSALIYE
  alias         VARCHAR(200) NOT NULL, -- urn:mail:defaultpk@...
  title         VARCHAR(250),
  registered_at TIMESTAMPTZ,
  source        VARCHAR(30) NOT NULL DEFAULT 'MANUEL', -- MANUEL | ENTEGRATOR | GIB_LISTE
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_e_document_registered_users UNIQUE (tax_id, document_kind, alias),
  CONSTRAINT chk_e_document_registered_users_kind CHECK (document_kind IN ('EFATURA', 'EIRSALIYE'))
);
CREATE INDEX IF NOT EXISTS idx_e_document_registered_users_tax ON e_document_registered_users(tax_id);

-- ─── Fatura satırı/başlığı: KDV istisna kodu ────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tax_exemption_code   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tax_exemption_reason TEXT;
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS tax_exemption_code   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tax_exemption_reason TEXT;

-- ─── Parametreler (sır/kimlik bilgisi YOK — onlar yalnızca ortam değişkeninde) ──
UPDATE system_parameters
SET description = 'Evet: yalnızca sağlayıcı kimlik bilgileri tamamsa canlı gönderim. Eksikse gönderim engellenir (sahte Gönderildi yazılmaz). Hayir: sandbox (test entegratör veya mock).'
WHERE parameter_code = 'GIB_CANLI';

INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description)
VALUES
  ('EBELGE_SAGLAYICI', 'e-Belge sağlayıcı', 'MOCK', 'SYS',
   'MOCK | REST (özel entegratör REST) | GIB_PORTAL (manuel portal yükleme). Firma ayarı (e_document_settings.provider_code) önceliklidir.'),
  ('EBELGE_REST_BASE_URL', 'Entegratör REST canlı adres', '', 'SYS',
   'Canlı özel entegratör REST kök adresi (https://...). Kullanıcı/şifre/API anahtarı .env: EBELGE_REST_USERNAME / EBELGE_REST_PASSWORD / EBELGE_REST_API_KEY.'),
  ('EBELGE_REST_TEST_BASE_URL', 'Entegratör REST test adres', '', 'SYS',
   'Entegratör test portalı kök adresi. Kimlik: EBELGE_REST_TEST_USERNAME / EBELGE_REST_TEST_PASSWORD / EBELGE_REST_TEST_API_KEY (.env).'),
  ('EBELGE_REST_AUTH', 'Entegratör REST kimlik doğrulama', 'token', 'SYS',
   'token (kullanıcı/şifre → erişim anahtarı) | basic | bearer | apikey'),
  ('EBELGE_REST_ENDPOINTS', 'Entegratör REST uç eşlemesi', '', 'SYS',
   'JSON: {"token":"/auth/token","send":"/documents","status":"/documents/{uuid}/status","cancel":"/documents/{uuid}/cancel","checkUser":"/users/{taxId}"} ve alan eşlemeleri. Boş: varsayılan sözleşme.'),
  ('EBELGE_MAX_DENEME', 'e-Belge azami gönderim denemesi', '5', 'SYS',
   'Geçici hatalarda (ağ/5xx/429) otomatik yeniden deneme sayısı. Bekleme: 1, 5, 15, 60, 360 dk.'),
  ('EBELGE_ARSIV_YIL', 'e-Belge arşiv saklama (yıl)', '10', 'SYS',
   'UBL/zarf/PDF/yanıt arşiv kayıtlarının silinemeyeceği süre.'),
  ('EBELGE_KUYRUK_ARALIK_SN', 'e-Belge kuyruk işleme aralığı (sn)', '0', 'SYS',
   '0: otomatik işleme kapalı (POST /e-belge/kuyruk/isle ile tetiklenir). >0: sunucu içi zamanlayıcı.'),
  ('MATBU_SABLON_FATURA', 'Matbu fatura yerleşimi (JSON)', '', 'SYS',
   'Boş: varsayılan. JSON (pt, A4): {"fontSize":9,"fields":{"documentNo":{"x":440,"y":182,"w":110}},"lines":{"startY":280,"rowHeight":16,"maxRows":20,"cols":{...}},"totals":{...}}'),
  ('MATBU_SABLON_IRSALIYE', 'Matbu irsaliye yerleşimi (JSON)', '', 'SYS',
   'Boş: varsayılan. MATBU_SABLON_FATURA ile aynı yapı.')
ON CONFLICT (parameter_code) DO NOTHING;
