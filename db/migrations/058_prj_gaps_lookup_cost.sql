-- 058: PRJ gaps — belge proje kolonu, onay seed, maliyet bağları
-- KI-009 / KI-012 / KI-013

ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS project_code VARCHAR(40);

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS project_code VARCHAR(40);

ALTER TABLE qc_orders
  ADD COLUMN IF NOT EXISTS project_code VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_stock_movements_project_code ON stock_movements(project_code)
  WHERE project_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_orders_project_code ON production_orders(project_code)
  WHERE project_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qc_orders_project_code ON qc_orders(project_code)
  WHERE project_code IS NOT NULL;

-- Onay rotaları (screen_id ile baslatOnay eşleşir)
INSERT INTO approval_routes (route_code, route_name, screen_id, description, is_active)
SELECT 'PRJ_BUDGET', 'Proje Bütçe Aşımı', 'prj-butce', 'PRJ bütçe aşımı onay rotası', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code='PRJ_BUDGET');

INSERT INTO approval_routes (route_code, route_name, screen_id, description, is_active)
SELECT 'PRJ_CLOSE', 'Proje Kapanış', 'prj-projeler', 'PRJ proje kapanış onay rotası', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code='PRJ_CLOSE');

INSERT INTO approval_routes (route_code, route_name, screen_id, description, is_active)
SELECT 'PRJ_WI_APPROVAL', 'İş Onay Bekliyor', 'prj-isler', 'PRJ iş kaydı onay durumu', TRUE
WHERE NOT EXISTS (SELECT 1 FROM approval_routes WHERE route_code='PRJ_WI_APPROVAL');

INSERT INTO approval_route_steps (route_id, line_no, step_name, role_id, zorunlu, min_amount)
SELECT r.id, 10, 'Proje Onayı', NULL, TRUE, 0
FROM approval_routes r
WHERE r.route_code IN ('PRJ_BUDGET', 'PRJ_CLOSE', 'PRJ_WI_APPROVAL')
  AND NOT EXISTS (SELECT 1 FROM approval_route_steps s WHERE s.route_id = r.id);

INSERT INTO approval_rules (rule_code, rule_name, screen_id, line_no, is_active, description, term_min_amount)
SELECT v.code, v.name, v.screen, v.line_no, TRUE, v.descr, 0
FROM (VALUES
  ('PRJ_BUDGET_OVERRUN', 'Proje bütçe aşımı', 'prj-butce', 10, 'Otomatik bütçe aşımı'),
  ('PRJ_PROJECT_CLOSE', 'Proje kapanış', 'prj-projeler', 20, 'Proje kapanış onayı'),
  ('PRJ_WI_APPROVAL', 'İş onay bekliyor', 'prj-isler', 30, 'İş APPROVAL durumu')
) AS v(code, name, screen, line_no, descr)
WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE rule_code = v.code);

INSERT INTO approval_module_usages (
  kullanim_code, kullanim_name, module_code, screen_id, route_id, otomatik_gonder, is_active, description
)
SELECT v.code, v.name, 'proje', v.screen, r.id, TRUE, TRUE, v.descr
FROM (VALUES
  ('PRJ_USE_BUDGET', 'PRJ Bütçe Aşımı', 'prj-butce', 'PRJ_BUDGET', 'Bütçe aşımında onay'),
  ('PRJ_USE_CLOSE', 'PRJ Kapanış', 'prj-projeler', 'PRJ_CLOSE', 'Proje kapanış onayı'),
  ('PRJ_USE_WI', 'PRJ İş Onayı', 'prj-isler', 'PRJ_WI_APPROVAL', 'İş onay durumu')
) AS v(code, name, screen, route_code, descr)
JOIN approval_routes r ON r.route_code = v.route_code
WHERE NOT EXISTS (SELECT 1 FROM approval_module_usages u WHERE u.kullanim_code = v.code);

INSERT INTO system_parameters (parametre_code, parametre_name, value, description, is_active)
SELECT 'PRJ_EMAIL_NOTIFY', 'PRJ e-posta bildirimi', 'Evet',
       'PRJ olaylarında e-posta kuyruğa alınsın (SMTP yoksa Bekliyor)', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_parameters WHERE parametre_code='PRJ_EMAIL_NOTIFY');
