-- Satınalma siparişi merkezi onay rotası (Canias PURT05 / OR-SA-SIPARIS)
-- Daha önce yalnızca talep rotası (OR-SA-TALEP) vardı; sipariş ekranı için rota eksikti.
-- Ayrıca 042 yanlış rename: approved_by_user_kisi_id → kodun beklediği approved_by_kisi_id

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_record_steps' AND column_name = 'approved_by_user_kisi_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_record_steps' AND column_name = 'approved_by_kisi_id'
  ) THEN
    ALTER TABLE approval_record_steps RENAME COLUMN approved_by_user_kisi_id TO approved_by_kisi_id;
  END IF;
END $$;

-- GIDA için satınalma / finans onay rolleri
INSERT INTO approval_roles (role_code, role_name, description, kisi_id, company_id, is_active)
SELECT 'SA_MUDUR-GIDA', 'Satınalma Müdürü', 'GIDA satınalma sipariş onayı', u.id, c.id, TRUE
FROM users u
CROSS JOIN companies c
WHERE u.user_code = 'owner'
  AND c.company_code = 'GIDA'
  AND NOT EXISTS (
    SELECT 1 FROM approval_roles r
    WHERE r.role_code = 'SA_MUDUR-GIDA' AND r.company_id = c.id
  );

INSERT INTO approval_roles (role_code, role_name, description, kisi_id, company_id, is_active)
SELECT 'FINANS-GIDA', 'Finans Onayı', 'GIDA satınalma finans eşiği', u.id, c.id, TRUE
FROM users u
CROSS JOIN companies c
WHERE u.user_code = 'owner'
  AND c.company_code = 'GIDA'
  AND NOT EXISTS (
    SELECT 1 FROM approval_roles r
    WHERE r.role_code = 'FINANS-GIDA' AND r.company_id = c.id
  );

-- Global yedek roller (rol adı eşleşmesi)
INSERT INTO approval_roles (role_code, role_name, description, kisi_id, company_id, is_active)
SELECT 'SA_MUDUR-GLOBAL', 'Satınalma Müdürü', 'Genel satınalma onay rolü', u.id, NULL, TRUE
FROM users u
WHERE u.user_code = 'owner'
  AND NOT EXISTS (SELECT 1 FROM approval_roles r WHERE r.role_code = 'SA_MUDUR-GLOBAL');

INSERT INTO approval_roles (role_code, role_name, description, kisi_id, company_id, is_active)
SELECT 'FINANS-GLOBAL', 'Finans Onayı', 'Genel finans onay rolü', u.id, NULL, TRUE
FROM users u
WHERE u.user_code = 'owner'
  AND NOT EXISTS (SELECT 1 FROM approval_roles r WHERE r.role_code = 'FINANS-GLOBAL');

-- Onay kuralı (module_code kolonu yok)
INSERT INTO approval_rules (
  rule_code, rule_name, description, screen_id,
  company_id, is_active, line_no, term_min_amount, otomatik_onay
)
SELECT
  'OM-SA-SIPARIS',
  'Satınalma siparişi onayı',
  'CANIAS-TAM-DONGU-TEST / PURT05 merkezi onay',
  'satin-alma-siparisleri',
  NULL,
  TRUE,
  10,
  0,
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE rule_code = 'OM-SA-SIPARIS');

-- Rota
INSERT INTO approval_routes (
  route_code, route_name, description, screen_id, rule_id, company_id, is_active, versiyon
)
SELECT
  'OR-SA-SIPARIS',
  'Satınalma sipariş rotası',
  'SA müdürü → tutar eşiğinde finans (CANIAS-TAM-DONGU-TEST)',
  'satin-alma-siparisleri',
  k.id,
  NULL,
  TRUE,
  1
FROM approval_rules k
WHERE k.rule_code = 'OM-SA-SIPARIS'
  AND NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code = 'OR-SA-SIPARIS');

UPDATE approval_routes r
SET
  screen_id = COALESCE(r.screen_id, 'satin-alma-siparisleri'),
  rule_id = COALESCE(r.rule_id, k.id),
  is_active = TRUE
FROM approval_rules k
WHERE r.route_code = 'OR-SA-SIPARIS'
  AND k.rule_code = 'OM-SA-SIPARIS';

-- Adımlar (rol adı ile)
INSERT INTO approval_route_steps (
  route_id, line_no, step_name, role_id, role_name, zorunlu, min_amount
)
SELECT r.id, 10, 'Satınalma müdürü onayı', rol.id, 'Satınalma Müdürü', TRUE, NULL
FROM approval_routes r
LEFT JOIN approval_roles rol ON rol.role_code = 'SA_MUDUR-GLOBAL'
WHERE r.route_code = 'OR-SA-SIPARIS'
  AND NOT EXISTS (
    SELECT 1 FROM approval_route_steps a WHERE a.route_id = r.id AND a.line_no = 10
  );

INSERT INTO approval_route_steps (
  route_id, line_no, step_name, role_id, role_name, zorunlu, min_amount
)
SELECT r.id, 20, 'Finans onayı (eşik üzeri)', rol.id, 'Finans Onayı', TRUE, 50000
FROM approval_routes r
LEFT JOIN approval_roles rol ON rol.role_code = 'FINANS-GLOBAL'
WHERE r.route_code = 'OR-SA-SIPARIS'
  AND NOT EXISTS (
    SELECT 1 FROM approval_route_steps a WHERE a.route_id = r.id AND a.line_no = 20
  );

-- Modül kullanımı (geriye uyum)
INSERT INTO approval_module_usages (
  kullanim_code, kullanim_name, module_code, screen_id, route_id, min_amount, is_active, description
)
SELECT
  'OM-SA-SIPARIS',
  'Satınalma siparişi onayı',
  'SATINALMA',
  'satin-alma-siparisleri',
  r.id,
  0,
  TRUE,
  'Satınalma siparişi Onayla → merkezi onay rotası'
FROM approval_routes r
WHERE r.route_code = 'OR-SA-SIPARIS'
  AND NOT EXISTS (
    SELECT 1 FROM approval_module_usages m WHERE m.kullanim_code = 'OM-SA-SIPARIS'
  );
