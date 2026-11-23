-- Satış siparişi onay kapısı: OnayBekliyor durumu
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE sales_orders
  ADD CONSTRAINT sales_orders_status_check
  CHECK (status::text = ANY (ARRAY[
    'Taslak'::varchar,
    'OnayBekliyor'::varchar,
    'Onayli'::varchar,
    'Kismi'::varchar,
    'Kapali'::varchar,
    'Iptal'::varchar
  ]::text[]));
