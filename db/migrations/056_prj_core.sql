-- 056: PRJ Project Management core (Canias PRJT05 + Jira work items)
-- Soft archive; no cascade delete into financial/operational docs.
-- Existing belgeler.project_code VARCHAR remains; projects.project_code is the master.

-- ========== Tanımlar (şirket bağımsız seed; isteğe bağlı company_id) ==========
CREATE TABLE IF NOT EXISTS prj_project_types (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  type_code VARCHAR(40) NOT NULL,
  type_name VARCHAR(160) NOT NULL,
  line_no INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (type_code)
);

CREATE TABLE IF NOT EXISTS prj_project_categories (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  category_code VARCHAR(40) NOT NULL,
  category_name VARCHAR(160) NOT NULL,
  line_no INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (category_code)
);

CREATE TABLE IF NOT EXISTS prj_project_statuses (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  status_code VARCHAR(40) NOT NULL,
  status_name VARCHAR(160) NOT NULL,
  line_no INT NOT NULL DEFAULT 10,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (status_code)
);

CREATE TABLE IF NOT EXISTS prj_project_priorities (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  priority_code VARCHAR(40) NOT NULL,
  priority_name VARCHAR(160) NOT NULL,
  rank_no INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (priority_code)
);

CREATE TABLE IF NOT EXISTS prj_project_roles (
  id SERIAL PRIMARY KEY,
  role_code VARCHAR(40) NOT NULL UNIQUE,
  role_name VARCHAR(160) NOT NULL,
  can_view_budget BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_budget BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_costs BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_team BOOLEAN NOT NULL DEFAULT FALSE,
  can_close_project BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prj_work_item_types (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  type_code VARCHAR(40) NOT NULL,
  type_name VARCHAR(160) NOT NULL,
  hierarchy_level VARCHAR(40) NOT NULL DEFAULT 'task'
    CHECK (hierarchy_level IN ('portfolio','program','phase','epic','story','task','subtask','milestone','other')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (type_code)
);

CREATE TABLE IF NOT EXISTS prj_work_item_statuses (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  status_code VARCHAR(40) NOT NULL,
  status_name VARCHAR(160) NOT NULL,
  line_no INT NOT NULL DEFAULT 10,
  category VARCHAR(40) NOT NULL DEFAULT 'todo'
    CHECK (category IN ('backlog','todo','in_progress','review','done','cancelled','blocked')),
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (status_code)
);

CREATE TABLE IF NOT EXISTS prj_work_item_priorities (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id),
  priority_code VARCHAR(40) NOT NULL,
  priority_name VARCHAR(160) NOT NULL,
  rank_no INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (priority_code)
);

CREATE TABLE IF NOT EXISTS prj_relation_types (
  id SERIAL PRIMARY KEY,
  relation_code VARCHAR(40) NOT NULL UNIQUE,
  relation_name VARCHAR(160) NOT NULL,
  inverse_code VARCHAR(40),
  blocks_schedule BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== Proje master ==========
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  project_code VARCHAR(40) NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  description TEXT,
  type_id INT REFERENCES prj_project_types(id),
  category_id INT REFERENCES prj_project_categories(id),
  status_id INT REFERENCES prj_project_statuses(id),
  priority_id INT REFERENCES prj_project_priorities(id),
  partner_id INT REFERENCES partners(id),
  manager_user_id INT REFERENCES users(id),
  sponsor_user_id INT REFERENCES users(id),
  department_code VARCHAR(40),
  plant_id INT REFERENCES plants(id),
  warehouse_id INT REFERENCES warehouses(id),
  plan_start_date DATE,
  plan_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  currency_code VARCHAR(10) DEFAULT 'TRY',
  planned_budget NUMERIC(18, 2) DEFAULT 0,
  actual_cost NUMERIC(18, 2) DEFAULT 0,
  expected_revenue NUMERIC(18, 2) DEFAULT 0,
  actual_revenue NUMERIC(18, 2) DEFAULT 0,
  percent_complete NUMERIC(5, 2) DEFAULT 0,
  approach VARCHAR(20) NOT NULL DEFAULT 'classic'
    CHECK (approach IN ('classic', 'scrum', 'kanban')),
  portfolio_code VARCHAR(40),
  crm_opportunity_id INT,
  sales_order_id INT,
  sales_order_line_id INT,
  cost_center_code VARCHAR(40),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, project_code),
  CHECK (plan_end_date IS NULL OR plan_start_date IS NULL OR plan_end_date >= plan_start_date)
);

CREATE INDEX IF NOT EXISTS idx_projects_company_status ON projects(company_id, status_id) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_projects_partner ON projects(partner_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);

CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT REFERENCES prj_project_roles(id),
  can_view_budget BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_budget BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_costs BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS project_phases (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  phase_code VARCHAR(40) NOT NULL,
  phase_name VARCHAR(200) NOT NULL,
  parent_phase_id INT REFERENCES project_phases(id),
  line_no INT NOT NULL DEFAULT 10,
  plan_start_date DATE,
  plan_end_date DATE,
  percent_complete NUMERIC(5, 2) DEFAULT 0,
  status_code VARCHAR(40) DEFAULT 'OPEN',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, phase_code)
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  milestone_code VARCHAR(40) NOT NULL,
  milestone_name VARCHAR(200) NOT NULL,
  due_date DATE,
  actual_date DATE,
  status_code VARCHAR(40) DEFAULT 'OPEN',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, milestone_code)
);

-- ========== İş kayıtları ==========
CREATE TABLE IF NOT EXISTS work_items (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  project_id INT NOT NULL REFERENCES projects(id),
  work_item_no VARCHAR(40) NOT NULL,
  type_id INT REFERENCES prj_work_item_types(id),
  status_id INT REFERENCES prj_work_item_statuses(id),
  priority_id INT REFERENCES prj_work_item_priorities(id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  parent_id INT REFERENCES work_items(id),
  phase_id INT REFERENCES project_phases(id),
  assignee_user_id INT REFERENCES users(id),
  reporter_user_id INT REFERENCES users(id),
  plan_start_date DATE,
  plan_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_hours NUMERIC(12, 2) DEFAULT 0,
  actual_hours NUMERIC(12, 2) DEFAULT 0,
  story_points NUMERIC(10, 2),
  percent_complete NUMERIC(5, 2) DEFAULT 0,
  backlog_rank INT,
  labels TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  updated_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, work_item_no),
  CHECK (plan_end_date IS NULL OR plan_start_date IS NULL OR plan_end_date >= plan_start_date)
);

CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items(project_id, status_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_work_items_parent ON work_items(parent_id);

CREATE TABLE IF NOT EXISTS work_item_relations (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  from_work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  to_work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  relation_type_id INT NOT NULL REFERENCES prj_relation_types(id),
  description TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (from_work_item_id, to_work_item_id, relation_type_id),
  CHECK (from_work_item_id <> to_work_item_id)
);

CREATE TABLE IF NOT EXISTS work_item_materials (
  id SERIAL PRIMARY KEY,
  work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  item_id INT REFERENCES items(id),
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 1,
  uom_code VARCHAR(20),
  planned_unit_cost NUMERIC(18, 4) DEFAULT 0,
  actual_unit_cost NUMERIC(18, 4) DEFAULT 0,
  line_no INT NOT NULL DEFAULT 10,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_item_resources (
  id SERIAL PRIMARY KEY,
  work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  user_id INT REFERENCES users(id),
  employee_id INT,
  plant_id INT REFERENCES plants(id),
  work_center_id INT,
  role_name VARCHAR(120),
  planned_hours NUMERIC(12, 2) DEFAULT 0,
  actual_hours NUMERIC(12, 2) DEFAULT 0,
  line_no INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_confirmations (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  project_id INT NOT NULL REFERENCES projects(id),
  work_item_id INT NOT NULL REFERENCES work_items(id),
  confirmation_no VARCHAR(40) NOT NULL,
  confirmed_by INT REFERENCES users(id),
  confirmation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  quantity NUMERIC(18, 4) DEFAULT 0,
  uom_code VARCHAR(20),
  hours_spent NUMERIC(12, 2) DEFAULT 0,
  status_code VARCHAR(40) NOT NULL DEFAULT 'PENDING'
    CHECK (status_code IN ('PENDING', 'APPROVED', 'REJECTED')),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, confirmation_no)
);

CREATE TABLE IF NOT EXISTS work_logs (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id),
  project_id INT NOT NULL REFERENCES projects(id),
  work_item_id INT NOT NULL REFERENCES work_items(id),
  user_id INT NOT NULL REFERENCES users(id),
  work_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  hours_spent NUMERIC(12, 2) NOT NULL CHECK (hours_spent > 0),
  description TEXT,
  approval_status VARCHAR(40) NOT NULL DEFAULT 'DRAFT'
    CHECK (approval_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_work_logs_wi ON work_logs(work_item_id);

CREATE TABLE IF NOT EXISTS work_item_comments (
  id SERIAL PRIMARY KEY,
  work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_item_history (
  id SERIAL PRIMARY KEY,
  work_item_id INT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  field_name VARCHAR(80) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ========== Bütçe / maliyet (çekirdek) ==========
CREATE TABLE IF NOT EXISTS project_budget_lines (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id INT NOT NULL REFERENCES companies(id),
  line_no INT NOT NULL DEFAULT 10,
  category_code VARCHAR(40) NOT NULL,
  category_name VARCHAR(160) NOT NULL,
  planned_qty NUMERIC(18, 4) DEFAULT 0,
  uom_code VARCHAR(20),
  unit_price NUMERIC(18, 4) DEFAULT 0,
  currency_code VARCHAR(10) DEFAULT 'TRY',
  exchange_rate NUMERIC(18, 6) DEFAULT 1,
  planned_amount NUMERIC(18, 2) DEFAULT 0,
  actual_amount NUMERIC(18, 2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_cost_entries (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id INT NOT NULL REFERENCES companies(id),
  work_item_id INT REFERENCES work_items(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_code VARCHAR(40) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency_code VARCHAR(10) DEFAULT 'TRY',
  exchange_rate NUMERIC(18, 6) DEFAULT 1,
  amount_company NUMERIC(18, 2),
  source_module VARCHAR(40) NOT NULL,
  source_table VARCHAR(80) NOT NULL,
  source_id INT NOT NULL,
  is_commitment BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_module, source_table, source_id, category_code)
);

CREATE TABLE IF NOT EXISTS project_sales_links (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id INT NOT NULL REFERENCES companies(id),
  document_type VARCHAR(40) NOT NULL,
  document_id INT NOT NULL,
  document_line_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_type, document_id, document_line_id)
);

CREATE TABLE IF NOT EXISTS project_purchase_links (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  company_id INT NOT NULL REFERENCES companies(id),
  work_item_id INT REFERENCES work_items(id),
  document_type VARCHAR(40) NOT NULL,
  document_id INT NOT NULL,
  document_line_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_type, document_id, document_line_id)
);

CREATE TABLE IF NOT EXISTS project_risks (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id),
  risk_code VARCHAR(40) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  probability VARCHAR(20) DEFAULT 'Medium',
  impact VARCHAR(20) DEFAULT 'Medium',
  score INT DEFAULT 0,
  owner_user_id INT REFERENCES users(id),
  status_code VARCHAR(40) DEFAULT 'OPEN',
  mitigation TEXT,
  contingency TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (project_id, risk_code)
);

-- ========== Seed tanımlar ==========
INSERT INTO prj_project_types (type_code, type_name, line_no) VALUES
  ('MUSTERI', 'Müşteri Projesi', 10),
  ('IC', 'İç Proje', 20),
  ('YATIRIM', 'Yatırım Projesi', 30),
  ('URUN', 'Ürün Geliştirme', 40),
  ('YAZILIM', 'Yazılım Projesi', 50),
  ('MAKINE', 'Makine / Tesis Kurulum', 60),
  ('BAKIM', 'Bakım ve Revizyon', 70),
  ('ARGE', 'Ar-Ge Projesi', 80),
  ('ERP', 'ERP Uygulama Projesi', 90)
ON CONFLICT (type_code) DO NOTHING;

INSERT INTO prj_project_categories (category_code, category_name, line_no) VALUES
  ('TICARI', 'Ticari', 10),
  ('OPERASYON', 'Operasyon', 20),
  ('IT', 'BT / Yazılım', 30),
  ('URETIM', 'Üretim', 40)
ON CONFLICT (category_code) DO NOTHING;

INSERT INTO prj_project_statuses (status_code, status_name, line_no, is_terminal, is_cancelled) VALUES
  ('10', 'Başlatıldı', 10, FALSE, FALSE),
  ('20', 'Planlandı', 20, FALSE, FALSE),
  ('30', 'Devam Ediyor', 30, FALSE, FALSE),
  ('40', 'Beklemede', 40, FALSE, FALSE),
  ('80', 'Tamamlandı', 80, TRUE, FALSE),
  ('90', 'İptal', 90, TRUE, TRUE),
  ('95', 'Arşiv', 95, TRUE, FALSE)
ON CONFLICT (status_code) DO NOTHING;

INSERT INTO prj_project_priorities (priority_code, priority_name, rank_no) VALUES
  ('CRITICAL', 'Critical', 10),
  ('HIGHEST', 'Highest', 20),
  ('HIGH', 'High', 30),
  ('MEDIUM', 'Medium', 50),
  ('LOW', 'Low', 70),
  ('LOWEST', 'Lowest', 90)
ON CONFLICT (priority_code) DO NOTHING;

INSERT INTO prj_project_roles (role_code, role_name, can_view_budget, can_edit_budget, can_view_costs, can_manage_team, can_close_project) VALUES
  ('PM', 'Proje Yöneticisi', TRUE, TRUE, TRUE, TRUE, TRUE),
  ('SPONSOR', 'Proje Sponsoru', TRUE, FALSE, TRUE, FALSE, FALSE),
  ('LEAD', 'Takım Lideri', FALSE, FALSE, FALSE, TRUE, FALSE),
  ('MEMBER', 'Proje Üyesi', FALSE, FALSE, FALSE, FALSE, FALSE),
  ('OWNER', 'Görev Sorumlusu', FALSE, FALSE, FALSE, FALSE, FALSE),
  ('WATCHER', 'İzleyici', FALSE, FALSE, FALSE, FALSE, FALSE),
  ('FIN', 'Proje Finans Sorumlusu', TRUE, TRUE, TRUE, FALSE, FALSE),
  ('APPROVER', 'Onaylayıcı', FALSE, FALSE, FALSE, FALSE, FALSE),
  ('ADMIN', 'PRJ Admin', TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO prj_work_item_types (type_code, type_name, hierarchy_level) VALUES
  ('EPIC', 'Epic / İş Paketi', 'epic'),
  ('STORY', 'Story', 'story'),
  ('TASK', 'Görev', 'task'),
  ('SUBTASK', 'Alt Görev', 'subtask'),
  ('BUG', 'Hata', 'task'),
  ('IMPROVEMENT', 'İyileştirme', 'task'),
  ('CHANGE', 'Değişiklik Talebi', 'task'),
  ('RISK', 'Risk', 'other'),
  ('ISSUE', 'Problem', 'other'),
  ('MILESTONE', 'Kilometre Taşı', 'milestone'),
  ('APPROVAL', 'Onay', 'other'),
  ('DECISION', 'Karar', 'other'),
  ('ACTIVITY', 'Operasyon / Aktivite', 'task')
ON CONFLICT (type_code) DO NOTHING;

INSERT INTO prj_work_item_statuses (status_code, status_name, line_no, category, is_done, is_cancelled) VALUES
  ('DRAFT', 'Taslak', 5, 'backlog', FALSE, FALSE),
  ('OPEN', 'Açık', 10, 'todo', FALSE, FALSE),
  ('ANALYSIS', 'Analiz Ediliyor', 15, 'todo', FALSE, FALSE),
  ('TODO', 'Yapılacak', 20, 'todo', FALSE, FALSE),
  ('IN_PROGRESS', 'Devam Ediyor', 30, 'in_progress', FALSE, FALSE),
  ('REVIEW', 'İncelemede', 40, 'review', FALSE, FALSE),
  ('TESTING', 'Test Ediliyor', 45, 'review', FALSE, FALSE),
  ('APPROVAL', 'Onay Bekliyor', 50, 'review', FALSE, FALSE),
  ('DONE', 'Tamamlandı', 80, 'done', TRUE, FALSE),
  ('ON_HOLD', 'Beklemede', 60, 'blocked', FALSE, FALSE),
  ('BLOCKED', 'Bloke Edildi', 65, 'blocked', FALSE, FALSE),
  ('CANCELLED', 'İptal Edildi', 90, 'cancelled', FALSE, TRUE),
  ('REJECTED', 'Reddedildi', 92, 'cancelled', FALSE, TRUE),
  ('REOPENED', 'Yeniden Açıldı', 25, 'todo', FALSE, FALSE)
ON CONFLICT (status_code) DO NOTHING;

INSERT INTO prj_work_item_priorities (priority_code, priority_name, rank_no) VALUES
  ('CRITICAL', 'Critical', 10),
  ('HIGHEST', 'Highest', 20),
  ('HIGH', 'High', 30),
  ('MEDIUM', 'Medium', 50),
  ('LOW', 'Low', 70),
  ('LOWEST', 'Lowest', 90)
ON CONFLICT (priority_code) DO NOTHING;

INSERT INTO prj_relation_types (relation_code, relation_name, inverse_code, blocks_schedule) VALUES
  ('BLOCKS', 'Engeller', 'IS_BLOCKED_BY', TRUE),
  ('IS_BLOCKED_BY', 'Tarafından engelleniyor', 'BLOCKS', TRUE),
  ('RELATES', 'İlişkilidir', 'RELATES', FALSE),
  ('DUPLICATES', 'Yineler', 'IS_DUPLICATED_BY', FALSE),
  ('IS_DUPLICATED_BY', 'Tarafından yineleniyor', 'DUPLICATES', FALSE),
  ('DEPENDS_ON', 'Bağımlıdır', 'IS_REQUIRED_BY', TRUE),
  ('IS_REQUIRED_BY', 'Gereklidir', 'DEPENDS_ON', TRUE),
  ('PARENT_CHILD', 'Üst-alt', 'PARENT_CHILD', FALSE)
ON CONFLICT (relation_code) DO NOTHING;

INSERT INTO number_series (series_code, onek, description, son_numara, screen_code, screen_name, is_active)
VALUES
  ('PRJ_PROJECT', 'PRJ', 'Proje kodu', 0, 'prj-projeler', 'Proje Listesi', TRUE),
  ('PRJ_WORK_ITEM', 'WI', 'İş kaydı no', 0, 'prj-isler', 'İş Listesi', TRUE),
  ('PRJ_CONFIRM', 'CNF', 'Operasyon onayı', 0, 'prj-onaylarim', 'Operasyon Onayları', TRUE),
  ('PRJ_RISK', 'RSK', 'Proje riski', 0, 'prj-riskler', 'Riskler', TRUE),
  ('PRJ_PHASE', 'PH', 'Proje fazı', 0, 'prj-projeler', 'Proje Fazları', TRUE)
ON CONFLICT (series_code) DO NOTHING;
