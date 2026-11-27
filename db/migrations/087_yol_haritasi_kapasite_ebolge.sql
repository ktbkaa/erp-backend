-- Yol haritası: iş merkezi kapasite alanları + e-belge kuyruk iskeleti
-- + üretim parametrelerinin yeni firmalarda otomatik oluşması için yardımcı

ALTER TABLE work_centers
  ADD COLUMN IF NOT EXISTS daily_capacity_hours NUMERIC(12,2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS efficiency_pct NUMERIC(8,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN work_centers.daily_capacity_hours IS 'Günlük teorik kapasite (saat)';
COMMENT ON COLUMN work_centers.efficiency_pct IS 'Verimlilik % (yük hesabında çarpan)';

-- E-belge gönderim kuyruğu (harici entegratör yok; durum makinesi lokal)
CREATE TABLE IF NOT EXISTS e_document_queue (
  id              BIGSERIAL PRIMARY KEY,
  company_id      INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,          -- Fatura | Irsaliye
  document_id     INTEGER NOT NULL,
  document_no     TEXT,
  direction       TEXT NOT NULL DEFAULT 'Giden', -- Giden | Gelen
  status          TEXT NOT NULL DEFAULT 'Taslak',
  -- Taslak | Hazir | Kuyrukta | Gonderildi | Hata | Iptal
  provider_code   TEXT,                   -- ileride bağlanacak adaptör kodu
  uuid_ettn       TEXT,
  gib_number      TEXT,
  payload_json    JSONB,
  last_error      TEXT,
  queued_at       TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_e_document_queue_status ON e_document_queue(status);
CREATE INDEX IF NOT EXISTS idx_e_document_queue_doc ON e_document_queue(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_e_document_queue_company ON e_document_queue(company_id);

-- Eksik firma üretim parametrelerini tamamla (idempotent)
INSERT INTO production_parameters (
  company_id, plant_id,
  allow_over_production, over_production_pct,
  allow_under_production, under_production_pct,
  enforce_op_sequence, require_material_consume, auto_close_on_complete,
  description, is_active
)
SELECT c.id, NULL,
       FALSE, 0,
       TRUE, 0,
       TRUE, TRUE, TRUE,
       'Otomatik (087) — güvenli varsayılan', TRUE
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM production_parameters p
  WHERE p.company_id = c.id AND p.plant_id IS NULL AND p.is_active = TRUE
);
