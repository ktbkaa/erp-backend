-- Rollback for 150_belge_kilit_tetikleyicileri.sql (manual). Veri silmez; yalnız tetikleyicileri kaldırır.
-- Sonrasında: DELETE FROM schema_migrations WHERE filename='150_belge_kilit_tetikleyicileri.sql';

DROP TRIGGER IF EXISTS trg_invoices_belge_kilit ON invoices;
DROP TRIGGER IF EXISTS trg_invoice_lines_belge_kilit ON invoice_lines;
DROP TRIGGER IF EXISTS trg_journal_entries_belge_kilit ON journal_entries;
DROP TRIGGER IF EXISTS trg_journal_entry_lines_belge_kilit ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_sales_orders_silme_kilit ON sales_orders;
DROP TRIGGER IF EXISTS trg_purchase_orders_silme_kilit ON purchase_orders;
DROP TRIGGER IF EXISTS trg_goods_receipts_silme_kilit ON goods_receipts;
DROP TRIGGER IF EXISTS trg_delivery_notes_silme_kilit ON delivery_notes;
DROP TRIGGER IF EXISTS trg_production_orders_silme_kilit ON production_orders;

DROP FUNCTION IF EXISTS trg_invoices_belge_kilit();
DROP FUNCTION IF EXISTS trg_invoice_lines_belge_kilit();
DROP FUNCTION IF EXISTS trg_journal_entries_belge_kilit();
DROP FUNCTION IF EXISTS trg_journal_entry_lines_belge_kilit();
DROP FUNCTION IF EXISTS trg_belge_silme_kilit();
DROP FUNCTION IF EXISTS erp_fatura_finansal_kilitli(invoices);
DROP FUNCTION IF EXISTS erp_belge_kilit_hata(text, text, text);
DROP FUNCTION IF EXISTS erp_belge_kilit_bypass();
