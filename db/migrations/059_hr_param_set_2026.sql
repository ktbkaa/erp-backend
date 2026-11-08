-- TR bordro parametre setini 2026 boyunca geçerli tut (demo + canlı dönem).
UPDATE hr_payroll_param_sets
SET effective_to = '2026-12-31'
WHERE country_code = 'TR'
  AND set_code = 'TR-2025'
  AND (effective_to IS NULL OR effective_to < DATE '2026-12-31');
