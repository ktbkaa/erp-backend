-- CRM aday→cari dönüşümünde company_id yazılmadığı için firmasız kalan cariler
-- aktif firma lookup’larında görünmüyordu. Adayın firmasına geri bağla + params.

UPDATE partners p
SET
  company_id = a.company_id,
  plant_id = COALESCE(
    p.plant_id,
    (SELECT iy.id FROM plants iy WHERE iy.company_id = a.company_id ORDER BY iy.id LIMIT 1)
  )
FROM crm_leads a
WHERE a.partner_id = p.id
  AND p.company_id IS NULL
  AND a.company_id IS NOT NULL;

INSERT INTO partner_company_params (partner_id, company_id, plant_id, is_active)
SELECT
  p.id,
  p.company_id,
  p.plant_id,
  TRUE
FROM partners p
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM partner_company_params fp
    WHERE fp.partner_id = p.id AND fp.company_id = p.company_id
  )
ON CONFLICT (partner_id, company_id) DO UPDATE SET
  plant_id = COALESCE(EXCLUDED.plant_id, partner_company_params.plant_id),
  is_active = TRUE;
