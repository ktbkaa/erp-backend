-- Kaydedilmiş ama company_id null kalan belgeler firma listesinde görünmüyordu.
-- Cari / kaynak belge / fırsat üzerinden geri doldur.

UPDATE sales_quotations t
SET company_id = COALESCE(
  t.company_id,
  (SELECT c.company_id FROM partners c WHERE c.id = t.partner_id),
  (SELECT f.company_id FROM crm_opportunities f WHERE f.id = t.opportunity_id),
  (SELECT a.company_id FROM crm_leads a WHERE a.id = t.lead_id)
)
WHERE t.company_id IS NULL;

UPDATE sales_orders s
SET company_id = COALESCE(
  s.company_id,
  (SELECT t.company_id FROM sales_quotations t WHERE t.id = s.quotation_id),
  (SELECT c.company_id FROM partners c WHERE c.id = s.partner_id)
)
WHERE s.company_id IS NULL;

UPDATE shipment_orders se
SET company_id = COALESCE(
  se.company_id,
  (SELECT s.company_id FROM sales_orders s WHERE s.id = se.sales_order_id),
  (SELECT c.company_id FROM partners c WHERE c.id = se.partner_id)
)
WHERE se.company_id IS NULL;

UPDATE delivery_notes i
SET company_id = COALESCE(
  i.company_id,
  (SELECT s.company_id FROM sales_orders s WHERE s.id = i.sales_order_id),
  (SELECT se.company_id FROM shipment_orders se WHERE se.id = i.shipment_order_id),
  (SELECT c.company_id FROM partners c WHERE c.id = i.partner_id)
)
WHERE i.company_id IS NULL;

UPDATE invoices f
SET company_id = COALESCE(
  f.company_id,
  (SELECT s.company_id FROM sales_orders s WHERE s.id = f.sales_order_id),
  (SELECT i.company_id FROM delivery_notes i WHERE i.id = f.delivery_note_id),
  (SELECT c.company_id FROM partners c WHERE c.id = f.partner_id)
)
WHERE f.company_id IS NULL;

UPDATE purchase_orders sa
SET company_id = COALESCE(
  sa.company_id,
  (SELECT c.company_id FROM partners c WHERE c.id = sa.partner_id)
)
WHERE sa.company_id IS NULL;

UPDATE goods_receipts mk
SET company_id = COALESCE(
  mk.company_id,
  (SELECT sa.company_id FROM purchase_orders sa WHERE sa.id = mk.purchase_order_id)
)
WHERE mk.company_id IS NULL;

UPDATE routings r
SET company_id = COALESCE(
  r.company_id,
  (SELECT s.company_id FROM items s WHERE s.id = r.item_id)
)
WHERE r.company_id IS NULL;
