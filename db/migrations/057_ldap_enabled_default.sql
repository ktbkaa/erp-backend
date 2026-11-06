-- LDAP anahtarı kullanılabilsin; sunucu URL/UPN ayrıca ayrı girilir
UPDATE system_parameters
SET value = 'Evet',
    parametre_name = COALESCE(parametre_name, 'LDAP açık'),
    description = 'Evet ise giriş ekranında LDAP anahtarı kullanılabilir; Hayir = tamamen kapalı'
WHERE parametre_code = 'LDAP_ENABLED'
  AND LOWER(TRIM(value)) IN ('hayir', 'hayır', 'false', '0', 'no', '');
