/**
 * Canlı / geliştirme güvenlik bayrakları. Değerler her çağrıda env’den okunur
 * (testler ve yeniden başlatmasız yapılandırma için modül yüklemede önbelleğe alınmaz).
 */

const TRUE_SET = new Set(['1', 'true', 'evet', 'yes', 'on']);
const FALSE_SET = new Set(['0', 'false', 'hayir', 'hayır', 'no', 'off']);

const PLATFORM_ENV_KEYS = ['RENDER', 'DYNO', 'RAILWAY_ENVIRONMENT', 'FLY_APP_NAME', 'K_SERVICE'];

const DEV_JWT_SECRET = 'ktb-erp-dev-secret-change-me';
const WEAK_JWT_SECRETS = new Set([
  DEV_JWT_SECRET,
  'uzun-rastgele-bir-metin',
  'changeme',
  'change-me',
  'secret',
  'jwt-secret',
]);
const MIN_JWT_SECRET_LENGTH = 32;

const SECRET_PARAMETER_RE = /(PASS|PASSWORD|PAROLA|SIFRE|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY)/i;
const SECRET_MASK = '********';

function envFlag(name, defaultValue, env = process.env) {
  const raw = env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  if (TRUE_SET.has(v)) return true;
  if (FALSE_SET.has(v)) return false;
  return defaultValue;
}

/**
 * NODE_ENV=production veya NODE_ENV boşken bilinen PaaS ortamı (Render/Heroku/Railway/Fly/Cloud Run).
 * NODE_ENV=development|test açıkça verilirse platform algısı devre dışı kalır.
 */
function isProduction(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  if (nodeEnv === 'production' || nodeEnv === 'prod') return true;
  if (nodeEnv) return false;
  return PLATFORM_ENV_KEYS.some((k) => env[k] != null && String(env[k]).trim() !== '');
}

function isSqlConsoleEnabled(env = process.env) {
  return envFlag('ENABLE_SQL_CONSOLE', !isProduction(env), env);
}

/** Canlıda her zaman salt-okunur; geliştirmede SQL_CONSOLE_READONLY=1 ile zorlanabilir. */
function isSqlConsoleReadOnly(env = process.env) {
  if (isProduction(env)) return true;
  return envFlag('SQL_CONSOLE_READONLY', false, env);
}

/** /sql-console/connection/test|use — canlıda her koşulda kapalı (SSRF). */
function isSqlConsoleExternalDbAllowed(env = process.env) {
  if (isProduction(env)) return false;
  return envFlag('SQL_CONSOLE_ALLOW_EXTERNAL_DB', true, env);
}

function isSystemUpdateApplyEnabled(env = process.env) {
  return envFlag('ENABLE_SYSTEM_UPDATE_APPLY', !isProduction(env), env);
}

function parseList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Süper admin (SQL konsolu / sistem güncelleme):
 * - SUPER_ADMIN_USERS doluysa yalnızca listedeki kullanıcı kodları/kullanıcı adları
 * - boşsa group_code=ADMIN; geliştirmede ek olarak user_code ADMIN/owner
 * user_groups.module_permissions ['*'] varsayılanı bu karar için KULLANILMAZ.
 * Canlıda kimlik JWT ile gelmiş olmalı (X-Kullanici-Kodu yetmez).
 */
function isSuperAdmin(req, env = process.env) {
  const u = req?.user;
  if (!u || u.is_active === false) return false;
  const prod = isProduction(env);
  if (prod && req.auth?.type !== 'jwt') return false;
  const codes = [u.user_code, u.username].filter(Boolean).map((s) => String(s).toUpperCase());
  const allow = parseList(env.SUPER_ADMIN_USERS).map((s) => s.toUpperCase());
  if (allow.length) return codes.some((c) => allow.includes(c));
  if (String(u.group_code || '').toUpperCase() === 'ADMIN') return true;
  if (!prod && codes.some((c) => c === 'ADMIN' || c === 'OWNER')) return true;
  return false;
}

function allowedOrigins(env = process.env) {
  return parseList(env.ALLOWED_ORIGINS).map((o) => o.replace(/\/+$/, ''));
}

function isSecretParameterCode(code) {
  return SECRET_PARAMETER_RE.test(String(code || ''));
}

function maskSecretParameterRow(row) {
  if (!row || !isSecretParameterCode(row.parameter_code)) return row;
  const hasValue = row.value != null && String(row.value) !== '';
  return { ...row, value: hasValue ? SECRET_MASK : row.value, is_secret: true, value_set: hasValue };
}

/**
 * Başlangıç denetimi. Ölümcül hatalar `errors`, uyarılar `warnings` döner.
 * index.js canlıda errors doluysa süreci durdurur.
 */
function checkProductionConfig(env = process.env) {
  const errors = [];
  const warnings = [];
  if (!isProduction(env)) return { production: false, errors, warnings };

  if (!String(env.NODE_ENV || '').trim()) {
    warnings.push('NODE_ENV boş ama PaaS ortamı algılandı — canlı kuralları uygulanıyor. NODE_ENV=production ayarlayın.');
  }
  const secret = env.JWT_SECRET || env.JWT_SECRET_FALLBACK || '';
  if (!secret) {
    errors.push('JWT_SECRET canlıda zorunlu.');
  } else if (WEAK_JWT_SECRETS.has(secret)) {
    errors.push('JWT_SECRET varsayılan/örnek değer; güçlü rastgele bir değer üretin (openssl rand -base64 48).');
  } else if (secret.length < MIN_JWT_SECRET_LENGTH) {
    warnings.push(`JWT_SECRET ${MIN_JWT_SECRET_LENGTH} karakterden kısa; değiştirmeniz önerilir.`);
  }
  if (envFlag('ERP_AUTH_SOFT', false, env)) {
    warnings.push('ERP_AUTH_SOFT=1 canlıda açık — X-Kullanici-Kodu ile kimlik kabul edilir. Kapatın.');
  }
  if (isSqlConsoleEnabled(env)) {
    warnings.push('ENABLE_SQL_CONSOLE açık — salt-okunur, yalnız süper admin erişir.');
  }
  if (isSystemUpdateApplyEnabled(env)) {
    warnings.push('ENABLE_SYSTEM_UPDATE_APPLY açık — /sistem-guncelleme/uygula yalnız süper admin.');
  }
  if (env.DB_SSL_REJECT_UNAUTHORIZED != null && !envFlag('DB_SSL_REJECT_UNAUTHORIZED', true, env)) {
    warnings.push('DB_SSL_REJECT_UNAUTHORIZED=0 — DB TLS sertifikası doğrulanmıyor (MITM riski). DB_SSL_CA tercih edin.');
  }
  if (!allowedOrigins(env).length) {
    warnings.push('ALLOWED_ORIGINS boş — yalnızca aynı origin (SPA) çağrıları kabul edilir.');
  }
  return { production: true, errors, warnings };
}

module.exports = {
  DEV_JWT_SECRET,
  WEAK_JWT_SECRETS,
  SECRET_MASK,
  envFlag,
  isProduction,
  isSqlConsoleEnabled,
  isSqlConsoleReadOnly,
  isSqlConsoleExternalDbAllowed,
  isSystemUpdateApplyEnabled,
  isSuperAdmin,
  allowedOrigins,
  isSecretParameterCode,
  maskSecretParameterRow,
  checkProductionConfig,
  parseList,
};
