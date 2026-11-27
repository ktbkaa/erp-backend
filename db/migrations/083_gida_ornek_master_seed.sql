-- GIDA örnek master veri (idempotent). Belge hareketi yok; liste ekranlarını doldurur.
-- Veri SİLMEZ.

INSERT INTO units_of_measure (uom_code, uom_name, is_active) VALUES
  ('AD', 'Adet', TRUE),
  ('KG', 'Kilogram', TRUE),
  ('LT', 'Litre', TRUE),
  ('MT', 'Metre', TRUE)
ON CONFLICT (uom_code) DO NOTHING;

-- Firma / iş yeri / depo (yoksa)
INSERT INTO companies (company_code, company_name, address, email, is_profile)
SELECT 'GIDA', 'Anadolu Süt ve Süt Ürünleri A.Ş.', 'Konya OSB', 'info@gida.local', TRUE
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE UPPER(company_code)='GIDA');

UPDATE companies SET is_profile = TRUE WHERE UPPER(company_code)='GIDA' AND is_profile IS DISTINCT FROM TRUE;

INSERT INTO plants (company_id, plant_code, plant_name, address)
SELECT c.id, 'GIDA-MR', 'GIDA Merkez Fabrika', 'Konya'
FROM companies c
WHERE UPPER(c.company_code)='GIDA'
  AND NOT EXISTS (SELECT 1 FROM plants p WHERE p.company_id=c.id);

INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name, is_active, warehouse_role)
SELECT p.id, v.code, v.name, TRUE, v.rol
FROM plants p
JOIN companies c ON c.id = p.company_id AND UPPER(c.company_code)='GIDA'
CROSS JOIN (VALUES
  ('GIDA-ANA', 'Ana Depo', 'Normal'),
  ('GIDA-HMD', 'Hammadde', 'Hammadde'),
  ('GIDA-MAM', 'Mamul', 'Mamul'),
  ('GIDA-YM',  'Yarı Mamul', 'YariMamul')
) AS v(code, name, rol)
WHERE NOT EXISTS (
  SELECT 1 FROM warehouses w WHERE w.plant_id=p.id AND w.warehouse_code=v.code
);

-- Stoklar
INSERT INTO items (
  item_code, item_name, uom_code, sales_price, item_type, procurement_type,
  is_active, company_id, quality_control_required, description,
  default_receipt_warehouse_id, default_issue_warehouse_id
)
SELECT v.code, v.name, v.uom, v.price, v.itype, v.proc, TRUE, c.id, v.qc, '[ORNEK-GIDA-2026] '||v.name,
  wh_in.id, wh_out.id
FROM companies c
CROSS JOIN (VALUES
  ('OG-H01', 'Çiğ İnek Sütü', 'LT', 18, 'Hammadde', 'Satinalma', TRUE, 'GIDA-HMD', 'GIDA-HMD'),
  ('OG-H02', 'Keçi Sütü', 'LT', 28, 'Hammadde', 'Satinalma', TRUE, 'GIDA-HMD', 'GIDA-HMD'),
  ('OG-H03', 'Yoğurt Kültürü', 'KG', 220, 'Hammadde', 'Satinalma', TRUE, 'GIDA-HMD', 'GIDA-HMD'),
  ('OG-A01', '1L PET Şişe', 'AD', 1.4, 'Hammadde', 'Satinalma', FALSE, 'GIDA-HMD', 'GIDA-HMD'),
  ('OG-A02', 'Şişe Kapağı', 'AD', 0.35, 'Hammadde', 'Satinalma', FALSE, 'GIDA-HMD', 'GIDA-HMD'),
  ('OG-A03', 'Shrink Etiket', 'AD', 0.22, 'Hammadde', 'Satinalma', FALSE, 'GIDA-HMD', 'GIDA-HMD'),
  ('OG-Y01', 'Pastörize Süt Ara Ürün', 'LT', 22, 'YariMamul', 'Uretim', TRUE, 'GIDA-YM', 'GIDA-YM'),
  ('OG-M01', 'Tam Yağlı Süt 1L', 'AD', 32, 'Mamul', 'Uretim', TRUE, 'GIDA-MAM', 'GIDA-MAM'),
  ('OG-M02', 'Yarım Yağlı Süt 1L', 'AD', 29, 'Mamul', 'Uretim', TRUE, 'GIDA-MAM', 'GIDA-MAM'),
  ('OG-M03', 'Sade Yoğurt 1KG', 'AD', 48, 'Mamul', 'Uretim', TRUE, 'GIDA-MAM', 'GIDA-MAM'),
  ('OG-M04', 'Beyaz Peynir 500g', 'AD', 95, 'Mamul', 'Uretim', TRUE, 'GIDA-MAM', 'GIDA-MAM'),
  ('OG-M05', 'Ayran 1L', 'AD', 26, 'Mamul', 'Uretim', TRUE, 'GIDA-MAM', 'GIDA-MAM')
) AS v(code, name, uom, price, itype, proc, qc, wh_in_code, wh_out_code)
JOIN plants p ON p.company_id = c.id
LEFT JOIN warehouses wh_in ON wh_in.plant_id = p.id AND wh_in.warehouse_code = v.wh_in_code
LEFT JOIN warehouses wh_out ON wh_out.plant_id = p.id AND wh_out.warehouse_code = v.wh_out_code
WHERE UPPER(c.company_code)='GIDA'
  AND NOT EXISTS (SELECT 1 FROM items i WHERE i.item_code = v.code);

INSERT INTO item_plants (item_id, plant_id, is_active)
SELECT i.id, p.id, TRUE
FROM items i
JOIN companies c ON c.id = i.company_id AND UPPER(c.company_code)='GIDA'
JOIN plants p ON p.company_id = c.id
WHERE i.item_code LIKE 'OG-%'
  AND NOT EXISTS (
    SELECT 1 FROM item_plants ip WHERE ip.item_id=i.id AND ip.plant_id=p.id
  );

-- Cariler
INSERT INTO partners (
  partner_code, partner_name, partner_type, phone, email, province, country,
  currency_code, payment_due_days, is_active, company_id, plant_id, notes
)
SELECT v.code, v.name, v.ptype, v.phone, lower(v.code)||'@ornek.local', 'Konya', 'TR',
  'TRY', v.due, TRUE, c.id, p.id, 'ORNEK-GIDA-2026'
FROM companies c
JOIN plants p ON p.company_id = c.id
CROSS JOIN (VALUES
  ('OG-T01', 'OG Tedarik — Çiftlik Koop. Konya', 'Tedarikci', '03325550001', 30),
  ('OG-T02', 'OG Tedarik — Ambalaj Paket A.Ş.', 'Tedarikci', '03325550002', 30),
  ('OG-T03', 'OG Tedarik — Soğuk Zincir Lojistik', 'Tedarikci', '03325550003', 30),
  ('OG-M01', 'OG Müşteri — Anadolu Market Zinciri', 'Musteri', '03325551001', 45),
  ('OG-M02', 'OG Müşteri — Oteller Tedarik Ltd.', 'Musteri', '03325551002', 45),
  ('OG-M03', 'OG Müşteri — Okul Kantinleri Birliği', 'Musteri', '03325551003', 45)
) AS v(code, name, ptype, phone, due)
WHERE UPPER(c.company_code)='GIDA'
  AND NOT EXISTS (SELECT 1 FROM partners x WHERE x.partner_code = v.code);

-- Ürün ağacı (mamulde ağaç yoksa)
INSERT INTO boms (bom_code, bom_name, finished_good_item_id, quantity, uom_code, is_active, company_id, plant_id)
SELECT 'OG-BOM-SUT', 'Tam Yağlı Süt 1L Ağacı', fg.id, 1, 'AD', TRUE, c.id, p.id
FROM companies c
JOIN plants p ON p.company_id = c.id
JOIN items fg ON fg.item_code = 'OG-M01' AND fg.company_id = c.id
WHERE UPPER(c.company_code)='GIDA'
  AND NOT EXISTS (SELECT 1 FROM boms b WHERE b.bom_code = 'OG-BOM-SUT')
  AND NOT EXISTS (SELECT 1 FROM boms b2 WHERE b2.finished_good_item_id = fg.id);

INSERT INTO bom_lines (product_bom_id, component_item_id, quantity, uom_code, line_no)
SELECT b.id, comp.id, v.qty, v.uom, v.ord
FROM boms b
JOIN items fg ON fg.id = b.finished_good_item_id AND fg.item_code = 'OG-M01'
CROSS JOIN (VALUES
  ('OG-H01', 1.02, 'LT', 10),
  ('OG-A01', 1, 'AD', 20),
  ('OG-A02', 1, 'AD', 30),
  ('OG-A03', 1, 'AD', 40)
) AS v(code, qty, uom, ord)
JOIN items comp ON comp.item_code = v.code
WHERE b.bom_code IN ('OG-BOM-SUT', 'OG-BOM-01')
  AND NOT EXISTS (
    SELECT 1 FROM bom_lines bl
    WHERE bl.product_bom_id = b.id AND bl.component_item_id = comp.id
  );

-- Aktif kullanıcılara GIDA yetkisi
INSERT INTO user_company_permissions (user_id, company_id)
SELECT u.id, c.id
FROM users u
CROSS JOIN companies c
WHERE UPPER(c.company_code)='GIDA'
  AND COALESCE(u.is_active, TRUE) = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM user_company_permissions p
    WHERE p.user_id = u.id AND p.company_id = c.id
  );
