/**
 * Entegrasyon sırları (SMTP_PASS, LDAP_BIND_PASSWORD, …) için geriye uyumlu okuma:
 * 1) env değişkeni (önerilen — secret manager / PaaS env)
 * 2) system_parameters (eski yöntem; SECRETS_FROM_ENV_ONLY=1 ise kapalı)
 */
const { parametreAl } = require('./yetki');
const { envFlag } = require('./securityConfig');

const warned = new Set();

function secretsFromEnvOnly(env = process.env) {
  return envFlag('SECRETS_FROM_ENV_ONLY', false, env);
}

async function getSecretSetting(clientOrPool, code, defaultValue = '', env = process.env) {
  const fromEnv = env[code];
  if (fromEnv != null && String(fromEnv) !== '') return String(fromEnv);
  if (secretsFromEnvOnly(env) || !clientOrPool) return defaultValue;
  let v;
  try {
    v = await parametreAl(clientOrPool, code, null);
  } catch (_) {
    return defaultValue;
  }
  if (v == null || v === '') return defaultValue;
  if (!warned.has(code)) {
    warned.add(code);
    console.warn(`[secrets] ${code} system_parameters'tan okundu (düz metin). Env değişkenine taşıyın ve parametre değerini boşaltın.`);
  }
  return String(v);
}

/** Ayarlar ekranında env’de tanımlı olanlar DB değerinin önüne geçer (sır olmayan SMTP_HOST vb.). */
async function getSetting(clientOrPool, code, defaultValue = '', env = process.env) {
  const fromEnv = env[code];
  if (fromEnv != null && String(fromEnv).trim() !== '') return String(fromEnv).trim();
  if (!clientOrPool) return defaultValue;
  return parametreAl(clientOrPool, code, defaultValue);
}

/** Canlı açılışta: system_parameters içinde düz metin duran sırları listeler (değerleri değil). */
async function warnDbStoredSecrets(pool, logger = console) {
  const r = await pool.query(
    `SELECT parameter_code FROM system_parameters
     WHERE COALESCE(value, '') <> '' AND parameter_code ~* $1`,
    ['(PASS|PASSWORD|PAROLA|SIFRE|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY)'],
  );
  const codes = r.rows.map((x) => x.parameter_code);
  if (codes.length) {
    logger.warn(
      `[güvenlik] system_parameters'ta düz metin sır var: ${codes.join(', ')}. `
      + 'Env değişkenine taşıyıp parametre değerini boşaltın (SECRETS_FROM_ENV_ONLY=1 ile DB okuması kapatılır).',
    );
  }
  return codes;
}

module.exports = { getSecretSetting, getSetting, secretsFromEnvOnly, warnDbStoredSecrets };
