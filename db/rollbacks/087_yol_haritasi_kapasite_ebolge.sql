DROP TABLE IF EXISTS e_document_queue;
ALTER TABLE work_centers
  DROP COLUMN IF EXISTS daily_capacity_hours,
  DROP COLUMN IF EXISTS efficiency_pct,
  DROP COLUMN IF EXISTS description;
