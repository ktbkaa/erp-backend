-- 150: Onaylı / muhasebeleşmiş / sevk edilmiş belgeler için DB seviyesinde savunma (P0 #8).
-- Uygulama kuralları src/services/belgeKilitService.js içindedir; bu tetikleyiciler
-- API dışından (SQL konsolu, script, hatalı servis) yapılan hard delete ve finansal
-- alan değişikliklerini engeller.
--
-- Bilinçli bakım (demo temizliği, firma purge) için oturum bazlı kaçış:
--   SELECT set_config('erp.belge_kilit_bypass', 'on', false);
-- Hata kodu: SQLSTATE 'BK001' (API bunu 409 BELGE_KILITLI olarak döner).

CREATE OR REPLACE FUNCTION erp_belge_kilit_bypass() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('erp.belge_kilit_bypass', true), '') = 'on'
$$;

CREATE OR REPLACE FUNCTION erp_belge_kilit_hata(p_mesaj text, p_detay text, p_ipucu text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'BK001',
    MESSAGE = p_mesaj,
    DETAIL = COALESCE(p_detay, ''),
    HINT = COALESCE(p_ipucu, '');
END;
$$;

-- ---------------------------------------------------------------------------
-- Faturalar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp_fatura_finansal_kilitli(f invoices) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(f.is_posted, FALSE)
      OR f.gl_document_id IS NOT NULL
      OR COALESCE(f.e_document_status, '') IN ('Kuyrukta', 'Gonderildi')
$$;

CREATE OR REPLACE FUNCTION trg_invoices_belge_kilit() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF erp_belge_kilit_bypass() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF erp_fatura_finansal_kilitli(OLD) OR COALESCE(NULLIF(OLD.status, ''), 'Taslak') <> 'Taslak' THEN
      PERFORM erp_belge_kilit_hata(
        format('Fatura %s silinemez: belge %s.', OLD.invoice_no,
          CASE WHEN erp_fatura_finansal_kilitli(OLD) THEN 'muhasebeleşmiş veya e-belge olarak gönderilmiş'
               ELSE 'durumu ' || OLD.status END),
        format('invoices.id=%s', OLD.id),
        'Silme yerine iptal (ters kayıt) veya iade faturası kullanın.'
      );
    END IF;
    RETURN OLD;
  END IF;

  IF erp_fatura_finansal_kilitli(OLD) THEN
    IF NEW.invoice_no IS DISTINCT FROM OLD.invoice_no
       OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.invoice_type IS DISTINCT FROM OLD.invoice_type
       OR NEW.invoice_date IS DISTINCT FROM OLD.invoice_date
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
       OR NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
       OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.total_discount IS DISTINCT FROM OLD.total_discount
       OR NEW.payable_amount IS DISTINCT FROM OLD.payable_amount
       OR (OLD.gl_document_id IS NOT NULL AND NEW.gl_document_id IS DISTINCT FROM OLD.gl_document_id)
       OR (COALESCE(OLD.is_posted, FALSE) AND NOT COALESCE(NEW.is_posted, FALSE))
       OR (OLD.uuid_ettn IS NOT NULL AND NEW.uuid_ettn IS DISTINCT FROM OLD.uuid_ettn)
    THEN
      PERFORM erp_belge_kilit_hata(
        format('Fatura %s muhasebeleşmiş veya e-belge olarak gönderilmiş; tutar/cari/tarih alanları değiştirilemez.', OLD.invoice_no),
        format('invoices.id=%s', OLD.id),
        'Düzeltme için iptal (ters kayıt) veya iade faturası kullanın.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_belge_kilit ON invoices;
CREATE TRIGGER trg_invoices_belge_kilit
  BEFORE UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION trg_invoices_belge_kilit();

CREATE OR REPLACE FUNCTION trg_invoice_lines_belge_kilit() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_fatura invoices;
BEGIN
  IF erp_belge_kilit_bypass() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT * INTO v_fatura FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF FOUND AND erp_fatura_finansal_kilitli(v_fatura) THEN
    PERFORM erp_belge_kilit_hata(
      format('Fatura %s muhasebeleşmiş veya e-belge olarak gönderilmiş; satırları değiştirilemez.', v_fatura.invoice_no),
      format('invoices.id=%s', v_fatura.id),
      'Düzeltme için iptal (ters kayıt) veya iade faturası kullanın.'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_lines_belge_kilit ON invoice_lines;
CREATE TRIGGER trg_invoice_lines_belge_kilit
  BEFORE INSERT OR UPDATE OR DELETE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION trg_invoice_lines_belge_kilit();

-- ---------------------------------------------------------------------------
-- Muhasebe fişleri (kesinleşmiş fiş satırları ve silme)
-- Satır INSERT serbest: createJournalEntry kesin fişi önce başlık, sonra satır yazar.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_journal_entries_belge_kilit() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF erp_belge_kilit_bypass() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF OLD.status = 'Onayli' OR COALESCE(OLD.is_locked, FALSE) OR COALESCE(OLD.is_posted, FALSE) THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM erp_belge_kilit_hata(
        format('Muhasebe fişi %s kesinleşmiş; silinemez.', OLD.document_no),
        format('journal_entries.id=%s', OLD.id),
        'Ters kayıt kullanın.'
      );
    ELSIF NEW.document_no IS DISTINCT FROM OLD.document_no
       OR NEW.document_date IS DISTINCT FROM OLD.document_date
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
       OR NEW.exchange_rate IS DISTINCT FROM OLD.exchange_rate
       OR NEW.journal_number IS DISTINCT FROM OLD.journal_number
    THEN
      PERFORM erp_belge_kilit_hata(
        format('Muhasebe fişi %s kesinleşmiş; başlık alanları değiştirilemez.', OLD.document_no),
        format('journal_entries.id=%s', OLD.id),
        'Ters kayıt kullanın.'
      );
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entries_belge_kilit ON journal_entries;
CREATE TRIGGER trg_journal_entries_belge_kilit
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION trg_journal_entries_belge_kilit();

CREATE OR REPLACE FUNCTION trg_journal_entry_lines_belge_kilit() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_fis journal_entries;
BEGIN
  IF erp_belge_kilit_bypass() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT * INTO v_fis FROM journal_entries WHERE id = OLD.document_id;
  IF FOUND AND (v_fis.status = 'Onayli' OR COALESCE(v_fis.is_locked, FALSE) OR COALESCE(v_fis.is_posted, FALSE)) THEN
    PERFORM erp_belge_kilit_hata(
      format('Muhasebe fişi %s kesinleşmiş; satırları değiştirilemez.', v_fis.document_no),
      format('journal_entries.id=%s', v_fis.id),
      'Ters kayıt kullanın.'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entry_lines_belge_kilit ON journal_entry_lines;
CREATE TRIGGER trg_journal_entry_lines_belge_kilit
  BEFORE UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION trg_journal_entry_lines_belge_kilit();

-- ---------------------------------------------------------------------------
-- Sipariş / mal kabul / irsaliye / üretim emri: hard delete yalnız taslakta
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_belge_silme_kilit() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_kilitli boolean := FALSE;
  v_etiket text;
  v_no text;
BEGIN
  IF erp_belge_kilit_bypass() THEN
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME = 'sales_orders' THEN
    v_etiket := 'Satış siparişi';
    v_no := OLD.order_no;
    v_kilitli := COALESCE(NULLIF(OLD.status, ''), 'Taslak') <> 'Taslak';
  ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
    v_etiket := 'Satınalma siparişi';
    v_no := OLD.order_no;
    v_kilitli := COALESCE(NULLIF(OLD.status, ''), 'Taslak') <> 'Taslak';
  ELSIF TG_TABLE_NAME = 'goods_receipts' THEN
    v_etiket := 'Mal kabul';
    v_no := OLD.receipt_no;
    v_kilitli := OLD.item_movement_id IS NOT NULL
      OR COALESCE(NULLIF(OLD.status, ''), 'Taslak') <> 'Taslak';
  ELSIF TG_TABLE_NAME = 'delivery_notes' THEN
    v_etiket := 'İrsaliye';
    v_no := OLD.delivery_note_no;
    v_kilitli := OLD.item_movement_id IS NOT NULL
      OR COALESCE(OLD.status, '') IN ('Onayli', 'FaturayaDonustu', 'Kapali')
      OR COALESCE(OLD.e_document_status, '') IN ('Kuyrukta', 'Gonderildi');
  ELSIF TG_TABLE_NAME = 'production_orders' THEN
    v_etiket := 'Üretim emri';
    v_no := OLD.order_no;
    v_kilitli := COALESCE(OLD.status, '') IN ('Uretimde', 'Kapali', 'Iptal')
      OR COALESCE(OLD.is_started, FALSE)
      OR COALESCE(OLD.is_approved, FALSE)
      OR COALESCE(OLD.produced_quantity, 0) > 0;
  END IF;

  IF v_kilitli THEN
    PERFORM erp_belge_kilit_hata(
      format('%s %s silinemez: belge onaylı, işlenmiş veya kapalı (durum: %s).', v_etiket, v_no, COALESCE(OLD.status, '-')),
      format('%s.id=%s', TG_TABLE_NAME, OLD.id),
      'Silme yerine iptal veya iade akışını kullanın.'
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_orders_silme_kilit ON sales_orders;
CREATE TRIGGER trg_sales_orders_silme_kilit
  BEFORE DELETE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION trg_belge_silme_kilit();

DROP TRIGGER IF EXISTS trg_purchase_orders_silme_kilit ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_silme_kilit
  BEFORE DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trg_belge_silme_kilit();

DROP TRIGGER IF EXISTS trg_goods_receipts_silme_kilit ON goods_receipts;
CREATE TRIGGER trg_goods_receipts_silme_kilit
  BEFORE DELETE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION trg_belge_silme_kilit();

DROP TRIGGER IF EXISTS trg_delivery_notes_silme_kilit ON delivery_notes;
CREATE TRIGGER trg_delivery_notes_silme_kilit
  BEFORE DELETE ON delivery_notes
  FOR EACH ROW EXECUTE FUNCTION trg_belge_silme_kilit();

DROP TRIGGER IF EXISTS trg_production_orders_silme_kilit ON production_orders;
CREATE TRIGGER trg_production_orders_silme_kilit
  BEFORE DELETE ON production_orders
  FOR EACH ROW EXECUTE FUNCTION trg_belge_silme_kilit();
