-- Üretim (iş) emrini genel onay kapısına bağlanabilir yapar (kural yoksa etkisiz).
-- Onay izi approval_audit_log'a yazılır (DOGRUDAN_ONAY / GONDERILDI / ONAYLANDI …);
-- production_orders üzerinde ayrı onay kolonu tutulmaz.
INSERT INTO approval_document_types (
  document_type_code, document_type_name, module_code, screen_id, table_name,
  no_column, status_column, company_column, plant_column, amount_column, currency_column,
  direction, pending_values, approved_values, outcomes,
  default_reject_outcome, default_cancel_outcome, description
) VALUES (
  'URETIM_EMRI', 'Üretim (iş) emri', 'URETIM', 'uretim-emirleri', 'production_orders',
  'order_no', 'status', 'company_id', 'plant_id', NULL, NULL,
  NULL,
  '{"status": "OnayBekliyor"}',
  '{"status": "Acik", "is_approved": true, "is_open": "Acik"}',
  '{"TASLAK": {"status": "Taslak"}, "IPTAL": {"status": "Iptal"}}',
  'TASLAK', 'TASLAK',
  'İş emri Onayla / Kolay İş Emri Onayı ile (hazırlık kontrolünden sonra) onaya gönderilir; onaylanınca Açık olur.'
)
ON CONFLICT (document_type_code) DO NOTHING;
