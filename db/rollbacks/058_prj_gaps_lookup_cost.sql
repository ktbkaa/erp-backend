-- Manual rollback 058
DELETE FROM approval_module_usages WHERE kullanim_code IN ('PRJ_USE_BUDGET','PRJ_USE_CLOSE','PRJ_USE_WI');
DELETE FROM approval_rules WHERE rule_code IN ('PRJ_BUDGET_OVERRUN','PRJ_PROJECT_CLOSE','PRJ_WI_APPROVAL');
DELETE FROM approval_route_steps WHERE route_id IN (
  SELECT id FROM approval_routes WHERE route_code IN ('PRJ_BUDGET','PRJ_CLOSE','PRJ_WI_APPROVAL')
);
DELETE FROM approval_routes WHERE route_code IN ('PRJ_BUDGET','PRJ_CLOSE','PRJ_WI_APPROVAL');
DELETE FROM system_parameters WHERE parametre_code='PRJ_EMAIL_NOTIFY';

DROP INDEX IF EXISTS idx_stock_movements_project_code;
DROP INDEX IF EXISTS idx_production_orders_project_code;
DROP INDEX IF EXISTS idx_qc_orders_project_code;
ALTER TABLE stock_movements DROP COLUMN IF EXISTS project_code;
ALTER TABLE production_orders DROP COLUMN IF EXISTS project_code;
ALTER TABLE qc_orders DROP COLUMN IF EXISTS project_code;
DELETE FROM schema_migrations WHERE filename='058_prj_gaps_lookup_cost.sql';
