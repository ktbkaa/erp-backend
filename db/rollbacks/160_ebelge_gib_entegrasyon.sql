-- 160 geri alma. DİKKAT: e_document_archive yasal saklama verisidir; canlıda yedek almadan çalıştırmayın.
DROP TRIGGER IF EXISTS trg_e_document_archive_guard ON e_document_archive;
DROP TRIGGER IF EXISTS trg_e_document_events_guard ON e_document_events;
DROP FUNCTION IF EXISTS e_document_archive_guard();
DROP FUNCTION IF EXISTS e_document_events_guard();
DROP TABLE IF EXISTS e_document_registered_users;
DROP TABLE IF EXISTS e_document_archive;
DROP TABLE IF EXISTS e_document_events;
DROP TABLE IF EXISTS e_document_series;
DROP TABLE IF EXISTS e_document_settings;
DROP INDEX IF EXISTS idx_e_document_queue_due;
ALTER TABLE e_document_queue
  DROP COLUMN IF EXISTS profile_id,
  DROP COLUMN IF EXISTS invoice_type_code,
  DROP COLUMN IF EXISTS series_kind,
  DROP COLUMN IF EXISTS send_mode,
  DROP COLUMN IF EXISTS is_simulated,
  DROP COLUMN IF EXISTS sender_alias,
  DROP COLUMN IF EXISTS receiver_alias,
  DROP COLUMN IF EXISTS envelope_uuid,
  DROP COLUMN IF EXISTS provider_ref,
  DROP COLUMN IF EXISTS provider_status_code,
  DROP COLUMN IF EXISTS provider_status_message,
  DROP COLUMN IF EXISTS attempt_count,
  DROP COLUMN IF EXISTS max_attempts,
  DROP COLUMN IF EXISTS next_attempt_at,
  DROP COLUMN IF EXISTS last_attempt_at,
  DROP COLUMN IF EXISTS last_error_code,
  DROP COLUMN IF EXISTS retryable,
  DROP COLUMN IF EXISTS last_status_check_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS cancel_reason,
  DROP COLUMN IF EXISTS cancel_ref,
  DROP COLUMN IF EXISTS xml_sha256,
  DROP COLUMN IF EXISTS validation_json,
  DROP COLUMN IF EXISTS created_by;
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_exemption_code, DROP COLUMN IF EXISTS tax_exemption_reason;
ALTER TABLE invoice_lines DROP COLUMN IF EXISTS tax_exemption_code, DROP COLUMN IF EXISTS tax_exemption_reason;
DELETE FROM system_parameters WHERE parameter_code IN (
  'EBELGE_SAGLAYICI', 'EBELGE_REST_BASE_URL', 'EBELGE_REST_TEST_BASE_URL', 'EBELGE_REST_AUTH',
  'EBELGE_REST_ENDPOINTS', 'EBELGE_MAX_DENEME', 'EBELGE_ARSIV_YIL', 'EBELGE_KUYRUK_ARALIK_SN',
  'MATBU_SABLON_FATURA', 'MATBU_SABLON_IRSALIYE'
);
