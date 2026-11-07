-- Rollback for 056_prj_core.sql (manual). Does NOT delete number_series rows.
-- WARNING: destroys PRJ data. Do not run on production with live projects.

DROP TABLE IF EXISTS project_risks CASCADE;
DROP TABLE IF EXISTS project_purchase_links CASCADE;
DROP TABLE IF EXISTS project_sales_links CASCADE;
DROP TABLE IF EXISTS project_cost_entries CASCADE;
DROP TABLE IF EXISTS project_budget_lines CASCADE;
DROP TABLE IF EXISTS work_item_history CASCADE;
DROP TABLE IF EXISTS work_item_comments CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS work_confirmations CASCADE;
DROP TABLE IF EXISTS work_item_resources CASCADE;
DROP TABLE IF EXISTS work_item_materials CASCADE;
DROP TABLE IF EXISTS work_item_relations CASCADE;
DROP TABLE IF EXISTS work_items CASCADE;
DROP TABLE IF EXISTS project_milestones CASCADE;
DROP TABLE IF EXISTS project_phases CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS prj_relation_types CASCADE;
DROP TABLE IF EXISTS prj_work_item_priorities CASCADE;
DROP TABLE IF EXISTS prj_work_item_statuses CASCADE;
DROP TABLE IF EXISTS prj_work_item_types CASCADE;
DROP TABLE IF EXISTS prj_project_roles CASCADE;
DROP TABLE IF EXISTS prj_project_priorities CASCADE;
DROP TABLE IF EXISTS prj_project_statuses CASCADE;
DROP TABLE IF EXISTS prj_project_categories CASCADE;
DROP TABLE IF EXISTS prj_project_types CASCADE;

DELETE FROM schema_migrations WHERE filename = '056_prj_core.sql';
