-- Firma izolasyonu geçişi (companyContext artık user_company_permissions zorunlu kılar).
-- Mevcut user_company_permissions satırları KORUNUR; hiçbir satır silinmez.
-- Yönetici (group ADMIN / role admin|yonetici|administrator / user_code owner) kısıtsızdır.
-- Hiç firma yetkisi olmayan aktif, yönetici olmayan kullanıcılara yalnız kanıtlanabilir yetki eklenir:
--   1) depo yetkisi (user_warehouses → warehouses → plants) olan firmalar
--   2) veritabanında tek firma varsa o firma (tek firmalı kurulumda izolasyon sorunu yoktur)

WITH bos AS (
  SELECT u.id
  FROM users u
  WHERE COALESCE(u.is_active, TRUE) = TRUE
    AND UPPER(COALESCE(u.group_code, '')) <> 'ADMIN'
    AND LOWER(COALESCE(u.role, '')) NOT IN ('admin', 'yonetici', 'administrator')
    AND LOWER(COALESCE(u.user_code, '')) <> 'owner'
    AND NOT EXISTS (SELECT 1 FROM user_company_permissions p WHERE p.user_id = u.id)
)
INSERT INTO user_company_permissions (user_id, company_id)
SELECT DISTINCT b.id, pl.company_id
FROM bos b
JOIN user_warehouses uw ON uw.user_id = b.id
JOIN warehouses w ON w.id = uw.warehouse_id
JOIN plants pl ON pl.id = w.plant_id
WHERE pl.company_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO user_company_permissions (user_id, company_id)
SELECT u.id, (SELECT id FROM companies LIMIT 1)
FROM users u
WHERE (SELECT COUNT(*) FROM companies) = 1
  AND COALESCE(u.is_active, TRUE) = TRUE
  AND UPPER(COALESCE(u.group_code, '')) <> 'ADMIN'
  AND LOWER(COALESCE(u.role, '')) NOT IN ('admin', 'yonetici', 'administrator')
  AND LOWER(COALESCE(u.user_code, '')) <> 'owner'
  AND NOT EXISTS (SELECT 1 FROM user_company_permissions p WHERE p.user_id = u.id)
ON CONFLICT DO NOTHING;
