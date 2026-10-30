-- LDAP / Active Directory giriş parametreleri
INSERT INTO system_parameters (parametre_code, parametre_name, value, module, description)
VALUES
  ('LDAP_ENABLED', 'LDAP açık', 'Evet', 'SYS', 'Evet ise giriş ekranında LDAP anahtarı kullanılabilir; Hayir = tamamen kapalı'),
  ('LDAP_URL', 'LDAP sunucu URL', '', 'SYS', 'örn. ldap://dc.ornek.com:389 veya ldaps://dc.ornek.com:636'),
  ('LDAP_BASE_DN', 'LDAP Base DN', '', 'SYS', 'Arama kökü, örn. DC=ornek,DC=com'),
  ('LDAP_BIND_DN', 'LDAP servis bind DN', '', 'SYS', 'Kullanıcı aramak için servis hesabı (opsiyonel)'),
  ('LDAP_BIND_PASSWORD', 'LDAP servis şifre', '', 'SYS', 'Servis hesabı şifresi'),
  ('LDAP_USER_FILTER', 'LDAP kullanıcı filtresi', '(sAMAccountName={{username}})', 'SYS', '{{username}} yer tutuculu LDAP filtresi'),
  ('LDAP_USER_DN_TEMPLATE', 'LDAP kullanıcı DN şablonu', '', 'SYS', 'örn. CN={{username}},OU=Users,DC=ornek,DC=com — doluysa arama yapılmaz'),
  ('LDAP_UPN_SUFFIX', 'LDAP UPN soneki', '', 'SYS', 'örn. ornek.com → kullanıcı@ornek.com (AD bilgisayar şifresi)')
ON CONFLICT (parametre_code) DO NOTHING;
