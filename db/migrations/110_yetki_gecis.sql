-- G-01 / G-02: backend rol / ekran / modül yetkilendirmesine güvenli geçiş.
-- Veri silmez; mevcut kullanıcı ve grup izinlerini korur.
--
-- 1) ADMIN grubu tam yetkili kalır (aktif, modül/depo '*').
-- 2) module_permissions / warehouse_permissions boş/NULL olan gruplar zaten '*' gibi
--    yorumlanıyordu (UI ve backend parseJsonArr varsayılanı) — bunu açık hale getir.
-- 3) Hiç aktif yönetici yoksa, auth.js’in eskiden örtük yönetici saydığı 'owner'
--    kullanıcısını (grubu boşsa) ADMIN grubuna al; yönetim ekranlarına erişim kaybolmasın.
-- 4) PAROLA_MIN_UZUNLUK parametresi (parola-ayarla) — yoksa ekle.

INSERT INTO user_groups (
  group_code, group_name, description, is_active,
  can_approve_purchase, purchase_requisition_ref, can_quality_control,
  module_permissions, warehouse_permissions
) VALUES (
  'ADMIN', 'Yöneticiler', 'Tam yetkili sistem yöneticisi', TRUE,
  TRUE, TRUE, TRUE,
  '["*"]', '["*"]'
)
ON CONFLICT (group_code) DO UPDATE SET
  is_active = TRUE,
  module_permissions = '["*"]',
  warehouse_permissions = '["*"]';

UPDATE user_groups
SET module_permissions = '["*"]'
WHERE module_permissions IS NULL OR btrim(module_permissions::text) = '';

UPDATE user_groups
SET warehouse_permissions = '["*"]'
WHERE warehouse_permissions IS NULL OR btrim(warehouse_permissions::text) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE is_active IS DISTINCT FROM FALSE
      AND (group_code = 'ADMIN'
           OR lower(COALESCE(role, '')) IN ('yonetici', 'admin', 'administrator'))
  ) THEN
    UPDATE users
    SET group_code = 'ADMIN'
    WHERE lower(COALESCE(user_code, '')) = 'owner'
      AND (group_code IS NULL OR btrim(group_code) = '')
      AND is_active IS DISTINCT FROM FALSE;
  END IF;
END $$;

INSERT INTO system_parameters (parameter_code, parameter_name, value, module, description, is_active)
SELECT 'PAROLA_MIN_UZUNLUK', 'Parola minimum uzunluğu', '8', 'Sistem',
       'POST /auth/parola-ayarla için en az karakter sayısı', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_parameters WHERE parameter_code = 'PAROLA_MIN_UZUNLUK');
