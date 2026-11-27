-- Genel onay altyapısı (belge türünden bağımsız onay kapısı)
--
-- * approval_document_types: "bu belge türü onaya bağlanabilir" kaydı (registry).
--   Belgenin tablo/kolon eşlemesi ve onay bekleyen / onaylandı / ret-iptal sonuç
--   değerleri veri olarak tutulur; serviste belge türüne özel if/else yoktur.
-- * approval_rules.document_type_code: kuralı bir belge türünün onay kapısına bağlar.
--   Boşsa kural eski (ekran bazlı, bloklamayan) davranışını korur.
-- * approval_audit_log: tüm belge türleri için ortak onay izi.
--
-- Varsayılan KAPALI: bu migration hiçbir kurala document_type_code atamaz,
-- dolayısıyla hiçbir belge onaya takılmaz.

CREATE TABLE IF NOT EXISTS approval_document_types (
    id SERIAL PRIMARY KEY,
    document_type_code VARCHAR(40) UNIQUE NOT NULL,
    document_type_name VARCHAR(160) NOT NULL,
    module_code VARCHAR(40) NOT NULL,
    screen_id VARCHAR(80) NOT NULL,
    table_name VARCHAR(80) NOT NULL,
    no_column VARCHAR(80),
    status_column VARCHAR(80) NOT NULL DEFAULT 'status',
    company_column VARCHAR(80) DEFAULT 'company_id',
    plant_column VARCHAR(80),
    amount_column VARCHAR(80),
    currency_column VARCHAR(80),
    direction VARCHAR(20) CHECK (direction IS NULL OR direction IN ('Alis', 'Satis')),
    -- {"kolon": değer}; değer "$now" | "$user_id" | "$user_code" belirteçlerini alabilir
    pending_values JSONB NOT NULL,
    approved_values JSONB NOT NULL,
    -- {"TASLAK": {...}, "IPTAL": {...}} — ret/iptal için seçilebilir sonuçlar
    outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_reject_outcome VARCHAR(40) NOT NULL DEFAULT 'TASLAK',
    default_cancel_outcome VARCHAR(40) NOT NULL DEFAULT 'TASLAK',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE approval_rules
    ADD COLUMN IF NOT EXISTS document_type_code VARCHAR(40)
        REFERENCES approval_document_types(document_type_code),
    ADD COLUMN IF NOT EXISTS reject_outcome VARCHAR(40),
    ADD COLUMN IF NOT EXISTS cancel_outcome VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_approval_rules_document_type
    ON approval_rules (document_type_code, line_no)
    WHERE document_type_code IS NOT NULL;

ALTER TABLE approval_records
    ADD COLUMN IF NOT EXISTS document_type_code VARCHAR(40)
        REFERENCES approval_document_types(document_type_code),
    ADD COLUMN IF NOT EXISTS reject_outcome VARCHAR(40),
    ADD COLUMN IF NOT EXISTS cancel_outcome VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_approval_records_document_type_open
    ON approval_records (document_type_code, document_id)
    WHERE status_code = 'BEKLIYOR';

CREATE TABLE IF NOT EXISTS approval_audit_log (
    id BIGSERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id),
    document_type_code VARCHAR(40),
    screen_id VARCHAR(80),
    document_id INT,
    document_no VARCHAR(60),
    record_id INT REFERENCES approval_records(id) ON DELETE SET NULL,
    step_line_no INT,
    action VARCHAR(40) NOT NULL,
    from_status VARCHAR(40),
    to_status VARCHAR(40),
    user_id INT REFERENCES users(id),
    user_code VARCHAR(80),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_document
    ON approval_audit_log (document_type_code, document_id, id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_record
    ON approval_audit_log (record_id);

-- Onay bekleyen durumunu taşıyabilmesi için belge durum kısıtları
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders
    ADD CONSTRAINT purchase_orders_status_check
    CHECK (status::text = ANY (ARRAY[
        'Taslak', 'OnayBekliyor', 'Onayli', 'KismiTeslim', 'Kapali', 'Iptal'
    ]::text[]));

ALTER TABLE transfer_orders DROP CONSTRAINT IF EXISTS transfer_orders_status_check;
ALTER TABLE transfer_orders
    ADD CONSTRAINT transfer_orders_status_check
    CHECK (status::text = ANY (ARRAY[
        'Taslak', 'OnayBekliyor', 'Onayli', 'Tamamlandi', 'Iptal'
    ]::text[]));

-- Onaya bağlanabilir belge türleri (kural yoksa etkisizdir)
INSERT INTO approval_document_types (
    document_type_code, document_type_name, module_code, screen_id, table_name,
    no_column, status_column, company_column, plant_column, amount_column, currency_column,
    direction, pending_values, approved_values, outcomes,
    default_reject_outcome, default_cancel_outcome, description
) VALUES
(
    'SATINALMA_SIPARIS', 'Satınalma siparişi', 'SATINALMA', 'satin-alma-siparisleri', 'purchase_orders',
    'order_no', 'status', 'company_id', 'plant_id', 'total_amount', 'currency_code',
    'Alis',
    '{"status": "OnayBekliyor"}',
    '{"status": "Onayli", "approved_at": "$now"}',
    '{"TASLAK": {"status": "Taslak"}, "IPTAL": {"status": "Iptal"}}',
    'TASLAK', 'TASLAK',
    'Taslak sipariş "Onayla" ile onaya gönderilir; onay tamamlanınca Onaylı olur.'
),
(
    'DEPO_TRANSFER', 'Depo transfer emri', 'STOK', 'transfer-emirleri', 'transfer_orders',
    'order_no', 'status', 'company_id', 'plant_id', NULL, NULL,
    NULL,
    '{"status": "OnayBekliyor"}',
    '{"status": "Onayli", "approved_at": "$now", "approved_by": "$user_code"}',
    '{"TASLAK": {"status": "Taslak"}, "IPTAL": {"status": "Iptal"}}',
    'TASLAK', 'TASLAK',
    'Taslak emir "Onayla" ile onaya gönderilir; onaylanınca tekrar "Onayla" stok hareketini yapar.'
)
ON CONFLICT (document_type_code) DO NOTHING;
