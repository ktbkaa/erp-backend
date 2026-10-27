-- 049: Rota operasyonuna ürün ağacı (ve adım stoğu) — farklı op'lar farklı ağaç kullanabilir (yarı mamul)

BEGIN;

ALTER TABLE routing_operations
  ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES items(id);

ALTER TABLE routing_operations
  ADD COLUMN IF NOT EXISTS product_bom_id INTEGER REFERENCES boms(id);

CREATE INDEX IF NOT EXISTS routing_ops_item_idx ON routing_operations (item_id);
CREATE INDEX IF NOT EXISTS routing_ops_bom_idx ON routing_operations (product_bom_id);

-- Mevcut rota başlığındaki ağaç/stok → operasyonlara kopyala
UPDATE routing_operations o
SET product_bom_id = r.product_bom_id
FROM routings r
WHERE o.route_id = r.id
  AND o.product_bom_id IS NULL
  AND r.product_bom_id IS NOT NULL;

UPDATE routing_operations o
SET item_id = r.item_id
FROM routings r
WHERE o.route_id = r.id
  AND o.item_id IS NULL
  AND r.item_id IS NOT NULL;

COMMIT;
