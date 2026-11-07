-- 057: PRJ Agile (board/sprint/WF) + otomasyon + şablon + ekler
-- Bağımlılık: 056_prj_core

CREATE TABLE IF NOT EXISTS prj_workflows (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  workflow_code VARCHAR(40) NOT NULL,
  workflow_name VARCHAR(160) NOT NULL,
  applies_to VARCHAR(40) NOT NULL DEFAULT 'work_item'
    CHECK (applies_to IN ('work_item', 'project', 'confirmation')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workflow_code)
);

CREATE TABLE IF NOT EXISTS prj_workflow_transitions (
  id SERIAL PRIMARY KEY,
  workflow_id INT NOT NULL REFERENCES prj_workflows(id) ON DELETE CASCADE,
  from_status_id INT REFERENCES prj_work_item_statuses(id),
  to_status_id INT NOT NULL REFERENCES prj_work_item_statuses(id),
  transition_code VARCHAR(40) NOT NULL,
  transition_name VARCHAR(160) NOT NULL,
  require_role_codes TEXT[],
  require_fields TEXT[],
  block_if_open_children BOOLEAN NOT NULL DEFAULT FALSE,
  line_no INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (workflow_id, transition_code)
);

CREATE TABLE IF NOT EXISTS prj_boards (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  board_code VARCHAR(40) NOT NULL,
  board_name VARCHAR(160) NOT NULL,
  board_type VARCHAR(20) NOT NULL DEFAULT 'kanban'
    CHECK (board_type IN ('kanban', 'scrum')),
  workflow_id INT REFERENCES prj_workflows(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, board_code)
);

CREATE TABLE IF NOT EXISTS prj_board_columns (
  id SERIAL PRIMARY KEY,
  board_id INT NOT NULL REFERENCES prj_boards(id) ON DELETE CASCADE,
  status_id INT NOT NULL REFERENCES prj_work_item_statuses(id),
  column_name VARCHAR(160) NOT NULL,
  line_no INT NOT NULL DEFAULT 10,
  wip_limit INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (board_id, status_id)
);

CREATE TABLE IF NOT EXISTS prj_sprints (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_code VARCHAR(40) NOT NULL,
  sprint_name VARCHAR(160) NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  capacity_hours NUMERIC(12, 2) DEFAULT 0,
  status_code VARCHAR(20) NOT NULL DEFAULT 'PLANNING'
    CHECK (status_code IN ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  scope_change_log TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, sprint_code),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS prj_sprint_work_items (
  id SERIAL PRIMARY KEY,
  sprint_id INT NOT NULL REFERENCES prj_sprints(id) ON DELETE CASCADE,
  work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_at TIMESTAMP,
  UNIQUE (sprint_id, work_item_id)
);

CREATE TABLE IF NOT EXISTS work_item_attachments (
  id SERIAL PRIMARY KEY,
  work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  content_type VARCHAR(120),
  file_size INT,
  version_no INT NOT NULL DEFAULT 1,
  uploaded_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_attachments (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  content_type VARCHAR(120),
  file_size INT,
  version_no INT NOT NULL DEFAULT 1,
  uploaded_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prj_project_templates (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  template_code VARCHAR(40) NOT NULL,
  template_name VARCHAR(160) NOT NULL,
  project_type_id INT REFERENCES prj_project_types(id),
  approach VARCHAR(20) NOT NULL DEFAULT 'classic',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (template_code)
);

CREATE TABLE IF NOT EXISTS prj_project_template_items (
  id SERIAL PRIMARY KEY,
  template_id INT NOT NULL REFERENCES prj_project_templates(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 10,
  item_kind VARCHAR(20) NOT NULL DEFAULT 'phase'
    CHECK (item_kind IN ('phase', 'work_item', 'milestone')),
  code VARCHAR(40),
  title VARCHAR(300) NOT NULL,
  work_item_type_code VARCHAR(40),
  parent_line_no INT,
  estimated_hours NUMERIC(12, 2) DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS prj_automations (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  automation_code VARCHAR(40) NOT NULL,
  automation_name VARCHAR(160) NOT NULL,
  trigger_code VARCHAR(40) NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priority INT NOT NULL DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (automation_code)
);

CREATE TABLE IF NOT EXISTS prj_automation_logs (
  id SERIAL PRIMARY KEY,
  automation_id INT REFERENCES prj_automations(id),
  event_key VARCHAR(200) NOT NULL,
  payload JSONB,
  status_code VARCHAR(20) NOT NULL DEFAULT 'ok'
    CHECK (status_code IN ('ok', 'fail', 'skip')),
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  UNIQUE (event_key)
);

CREATE TABLE IF NOT EXISTS project_close_checklists (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 10,
  item_text VARCHAR(300) NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  done_by INT REFERENCES users(id),
  done_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS sprint_id INT REFERENCES prj_sprints(id),
  ADD COLUMN IF NOT EXISTS board_rank INT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS workflow_id INT REFERENCES prj_workflows(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS close_notes TEXT;

-- Varsayılan WF + geçişler
INSERT INTO prj_workflows (workflow_code, workflow_name, applies_to, is_default, description)
VALUES ('WI_DEFAULT', 'Varsayılan İş Akışı', 'work_item', TRUE, 'Jira-benzeri görev akışı')
ON CONFLICT (workflow_code) DO NOTHING;

INSERT INTO prj_workflow_transitions (workflow_id, from_status_id, to_status_id, transition_code, transition_name, block_if_open_children, line_no)
SELECT w.id, fs.id, ts.id, v.code, v.name, v.block_children, v.line_no
FROM prj_workflows w
CROSS JOIN (VALUES
  (NULL::varchar, 'OPEN', 'START', 'Başlat (Açık)', FALSE, 10),
  ('OPEN', 'TODO', 'TO_TODO', 'Yapılacak', FALSE, 20),
  ('OPEN', 'IN_PROGRESS', 'START_WORK', 'İşe Başla', FALSE, 30),
  ('TODO', 'IN_PROGRESS', 'START_FROM_TODO', 'İşe Başla', FALSE, 35),
  ('IN_PROGRESS', 'REVIEW', 'TO_REVIEW', 'İncelemeye Al', FALSE, 40),
  ('REVIEW', 'TESTING', 'TO_TEST', 'Teste Al', FALSE, 45),
  ('TESTING', 'APPROVAL', 'TO_APPROVAL', 'Onaya Gönder', FALSE, 50),
  ('APPROVAL', 'DONE', 'APPROVE_DONE', 'Onayla / Tamamla', TRUE, 60),
  ('IN_PROGRESS', 'DONE', 'COMPLETE', 'Tamamla', TRUE, 65),
  ('IN_PROGRESS', 'BLOCKED', 'BLOCK', 'Bloke Et', FALSE, 70),
  ('BLOCKED', 'IN_PROGRESS', 'UNBLOCK', 'Blokeyi Kaldır', FALSE, 75),
  ('DONE', 'REOPENED', 'REOPEN', 'Yeniden Aç', FALSE, 80),
  ('REOPENED', 'IN_PROGRESS', 'RESUME', 'Devam Et', FALSE, 85),
  (NULL, 'CANCELLED', 'CANCEL', 'İptal', FALSE, 90),
  (NULL, 'ON_HOLD', 'HOLD', 'Beklemeye Al', FALSE, 95)
) AS v(from_code, to_code, code, name, block_children, line_no)
LEFT JOIN prj_work_item_statuses fs ON fs.status_code = v.from_code
JOIN prj_work_item_statuses ts ON ts.status_code = v.to_code
WHERE w.workflow_code = 'WI_DEFAULT'
  AND NOT EXISTS (
    SELECT 1 FROM prj_workflow_transitions t
    WHERE t.workflow_id = w.id AND t.transition_code = v.code
  );

-- Otomasyon seed
INSERT INTO prj_automations (automation_code, automation_name, trigger_code, condition_json, action_json, priority, description) VALUES
  ('WI_ASSIGN_NOTIFY', 'Atama bildirimi', 'WI_ASSIGNED', '{}'::jsonb,
   '{"action":"NOTIFY_USER","target":"assignee"}'::jsonb, 10, 'Brief #1'),
  ('WI_OVERDUE_PM', 'Gecikme → PM', 'WI_OVERDUE', '{}'::jsonb,
   '{"action":"NOTIFY_ROLE","role":"PM"}'::jsonb, 20, 'Brief #3'),
  ('WI_CHILDREN_DONE', 'Alt işler bitince inceleme', 'WI_ALL_CHILDREN_DONE', '{}'::jsonb,
   '{"action":"TRANSITION","to_status":"REVIEW"}'::jsonb, 30, 'Brief #5'),
  ('BUDGET_OVERRUN', 'Bütçe aşımı onayı', 'BUDGET_OVERRUN', '{}'::jsonb,
   '{"action":"START_APPROVAL","type":"budget"}'::jsonb, 40, 'Brief #7'),
  ('PROJECT_CLOSE_CL', 'Kapanış checklist', 'PROJECT_STATUS', '{"to":"80"}'::jsonb,
   '{"action":"CREATE_CHECKLIST"}'::jsonb, 50, 'Brief #10')
ON CONFLICT (automation_code) DO NOTHING;

-- Şablonlar (Brief §9)
INSERT INTO prj_project_templates (template_code, template_name, approach, description)
SELECT 'TPL_YAZILIM', 'Yazılım Geliştirme', 'scrum', 'Epic/Story/Task/Bug + sprint'
WHERE NOT EXISTS (SELECT 1 FROM prj_project_templates WHERE template_code='TPL_YAZILIM');

INSERT INTO prj_project_templates (template_code, template_name, approach, description)
SELECT 'TPL_MAKINE', 'Makine / Tesis Kurulum', 'classic', 'Keşif→Kabul'
WHERE NOT EXISTS (SELECT 1 FROM prj_project_templates WHERE template_code='TPL_MAKINE');

INSERT INTO prj_project_templates (template_code, template_name, approach, description)
SELECT 'TPL_NPD', 'Yeni Ürün Geliştirme', 'classic', 'Fikir→Seri üretim'
WHERE NOT EXISTS (SELECT 1 FROM prj_project_templates WHERE template_code='TPL_NPD');

INSERT INTO prj_project_templates (template_code, template_name, approach, description)
SELECT 'TPL_ERP', 'ERP Implementasyon', 'classic', 'Analiz→Canlı'
WHERE NOT EXISTS (SELECT 1 FROM prj_project_templates WHERE template_code='TPL_ERP');

INSERT INTO prj_project_templates (template_code, template_name, approach, description)
SELECT 'TPL_OZEL_URETIM', 'Müşteri Siparişi / Özel Üretim', 'classic', 'Talep→Tahsilat'
WHERE NOT EXISTS (SELECT 1 FROM prj_project_templates WHERE template_code='TPL_OZEL_URETIM');

INSERT INTO prj_project_template_items (template_id, line_no, item_kind, code, title, work_item_type_code, estimated_hours)
SELECT t.id, v.line_no, v.kind, v.code, v.title, v.wit, v.hours
FROM prj_project_templates t
JOIN (VALUES
  ('TPL_MAKINE', 10, 'phase', 'KESIF', 'Keşif', NULL, 0),
  ('TPL_MAKINE', 20, 'work_item', 'TEK', 'Teknik değerlendirme', 'TASK', 16),
  ('TPL_MAKINE', 30, 'work_item', 'TEKLIF', 'Teklif', 'TASK', 8),
  ('TPL_MAKINE', 40, 'work_item', 'SA', 'Satın alma', 'TASK', 24),
  ('TPL_MAKINE', 50, 'work_item', 'TED', 'Tedarik', 'TASK', 40),
  ('TPL_MAKINE', 60, 'work_item', 'NAK', 'Nakliye', 'TASK', 8),
  ('TPL_MAKINE', 70, 'work_item', 'KUR', 'Kurulum', 'ACTIVITY', 80),
  ('TPL_MAKINE', 80, 'work_item', 'ELK', 'Elektrik bağlantıları', 'ACTIVITY', 24),
  ('TPL_MAKINE', 90, 'work_item', 'TEST', 'Test', 'TASK', 16),
  ('TPL_MAKINE', 100, 'work_item', 'DEV', 'Devreye alma', 'TASK', 16),
  ('TPL_MAKINE', 110, 'milestone', 'KABUL', 'Kabul', 'MILESTONE', 0),
  ('TPL_MAKINE', 120, 'work_item', 'KAP', 'Proje kapanışı', 'TASK', 8),
  ('TPL_ERP', 10, 'work_item', 'IA', 'İhtiyaç analizi', 'STORY', 40),
  ('TPL_ERP', 20, 'work_item', 'SA', 'Süreç analizi', 'STORY', 40),
  ('TPL_ERP', 30, 'work_item', 'CFG', 'Modül yapılandırması', 'TASK', 80),
  ('TPL_ERP', 40, 'work_item', 'MIG', 'Veri aktarımı', 'TASK', 40),
  ('TPL_ERP', 50, 'work_item', 'TST', 'Test', 'TASK', 40),
  ('TPL_ERP', 60, 'work_item', 'EGT', 'Kullanıcı eğitimi', 'TASK', 24),
  ('TPL_ERP', 70, 'milestone', 'GO', 'Canlıya geçiş', 'MILESTONE', 0),
  ('TPL_ERP', 80, 'work_item', 'SUP', 'Canlı sonrası destek', 'TASK', 40),
  ('TPL_YAZILIM', 10, 'work_item', 'EP1', 'Ürün omurgası', 'EPIC', 0),
  ('TPL_YAZILIM', 20, 'work_item', 'ST1', 'Kullanıcı hikayeleri', 'STORY', 16),
  ('TPL_YAZILIM', 30, 'work_item', 'TK1', 'Geliştirme görevleri', 'TASK', 40),
  ('TPL_YAZILIM', 40, 'work_item', 'BUG', 'Hata düzeltme', 'BUG', 8),
  ('TPL_OZEL_URETIM', 10, 'work_item', 'TALEP', 'Müşteri talebi', 'STORY', 4),
  ('TPL_OZEL_URETIM', 20, 'work_item', 'TEKLIF', 'Teklif', 'TASK', 8),
  ('TPL_OZEL_URETIM', 30, 'work_item', 'SIP', 'Sipariş', 'TASK', 4),
  ('TPL_OZEL_URETIM', 40, 'work_item', 'MUH', 'Mühendislik', 'TASK', 24),
  ('TPL_OZEL_URETIM', 50, 'work_item', 'MAL', 'Malzeme temini', 'TASK', 16),
  ('TPL_OZEL_URETIM', 60, 'work_item', 'URT', 'Üretim', 'ACTIVITY', 40),
  ('TPL_OZEL_URETIM', 70, 'work_item', 'KK', 'Kalite', 'TASK', 8),
  ('TPL_OZEL_URETIM', 80, 'work_item', 'SEVK', 'Sevkiyat', 'TASK', 4),
  ('TPL_OZEL_URETIM', 90, 'work_item', 'FAT', 'Faturalama', 'TASK', 4),
  ('TPL_OZEL_URETIM', 100, 'milestone', 'KAP', 'Kapanış', 'MILESTONE', 0),
  ('TPL_NPD', 10, 'work_item', 'FIKIR', 'Ürün fikri', 'STORY', 8),
  ('TPL_NPD', 20, 'work_item', 'ARGE', 'Ar-Ge', 'TASK', 40),
  ('TPL_NPD', 30, 'work_item', 'TAS', 'Tasarım', 'TASK', 40),
  ('TPL_NPD', 40, 'work_item', 'BOM', 'Ürün ağacı', 'TASK', 16),
  ('TPL_NPD', 50, 'work_item', 'PROT', 'Prototip', 'ACTIVITY', 40),
  ('TPL_NPD', 60, 'work_item', 'TED', 'Tedarik', 'TASK', 24),
  ('TPL_NPD', 70, 'work_item', 'DEN', 'Üretim denemesi', 'ACTIVITY', 24),
  ('TPL_NPD', 80, 'work_item', 'KAL', 'Kalite testleri', 'TASK', 16),
  ('TPL_NPD', 90, 'milestone', 'SERI', 'Seri üretim onayı', 'MILESTONE', 0)
) AS v(tpl, line_no, kind, code, title, wit, hours) ON t.template_code = v.tpl
WHERE NOT EXISTS (
  SELECT 1 FROM prj_project_template_items i WHERE i.template_id = t.id AND i.code = v.code
);

INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES
  ('PRJ_SPRINT', 'PJSP', 'Sprint kodu', 0, 'prj-sprintler', 'Sprintler', TRUE),
  ('PRJ_BOARD', 'PJBD', 'Board kodu', 0, 'prj-board', 'Kanban Board', TRUE),
  ('PRJ_TEMPLATE', 'PJTP', 'Proje şablonu', 0, 'prj-sablonlar', 'Proje Şablonları', TRUE)
ON CONFLICT (series_code) DO NOTHING;
