-- Manual rollback for 057_prj_agile_finance.sql
ALTER TABLE projects DROP COLUMN IF EXISTS workflow_id;
ALTER TABLE projects DROP COLUMN IF EXISTS closed_at;
ALTER TABLE projects DROP COLUMN IF EXISTS close_notes;
ALTER TABLE work_items DROP COLUMN IF EXISTS sprint_id;
ALTER TABLE work_items DROP COLUMN IF EXISTS board_rank;

DROP TABLE IF EXISTS project_close_checklists CASCADE;
DROP TABLE IF EXISTS prj_automation_logs CASCADE;
DROP TABLE IF EXISTS prj_automations CASCADE;
DROP TABLE IF EXISTS prj_project_template_items CASCADE;
DROP TABLE IF EXISTS prj_project_templates CASCADE;
DROP TABLE IF EXISTS project_attachments CASCADE;
DROP TABLE IF EXISTS work_item_attachments CASCADE;
DROP TABLE IF EXISTS prj_sprint_work_items CASCADE;
DROP TABLE IF EXISTS prj_sprints CASCADE;
DROP TABLE IF EXISTS prj_board_columns CASCADE;
DROP TABLE IF EXISTS prj_boards CASCADE;
DROP TABLE IF EXISTS prj_workflow_transitions CASCADE;
DROP TABLE IF EXISTS prj_workflows CASCADE;

DELETE FROM schema_migrations WHERE filename = '057_prj_agile_finance.sql';
