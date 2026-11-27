-- Satış siparişini genel onay kapısına bağlanabilir yapar (kural yoksa etkisiz).
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_status_check
  CHECK (status::text = ANY (ARRAY[
    'Taslak', 'OnayBekliyor', 'Onayli', 'Kismi', 'Kapali', 'Iptal'
  ]::text[]));

INSERT INTO approval_document_types (
  document_type_code, document_type_name, module_code, screen_id, table_name,
  no_column, status_column, company_column, plant_column, amount_column, currency_column,
  direction, pending_values, approved_values, outcomes,
  default_reject_outcome, default_cancel_outcome, description
) VALUES (
  'SATIS_SIPARIS', 'Satış siparişi', 'SATIS', 'satis-siparisleri', 'sales_orders',
  'order_no', 'status', 'company_id', 'plant_id', 'grand_total', 'currency_code',
  'Satis',
  '{"status": "OnayBekliyor"}',
  '{"status": "Onayli", "approved_at": "$now", "approved_by": "$user_code"}',
  '{"TASLAK": {"status": "Taslak"}, "IPTAL": {"status": "Iptal"}}',
  'TASLAK', 'TASLAK',
  'Sipariş Onaylı durumuna geçerken (tekliften dönüşüm, kayıt veya durum değişikliği) onaya gönderilir; onay beklerken sevk emri ve elle durum değişikliği engelli.'
)
ON CONFLICT (document_type_code) DO NOTHING;
