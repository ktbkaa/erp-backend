const fs = require('fs');
const { isProduction, envFlag } = require('./securityConfig');

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(
      `Eksik ortam değişkeni: ${name}. ` +
      `.env dosyasını kontrol et (.env.example dosyasını örnek al).`
    );
  }
  return value;
}

/** DB_SSL_CA: PEM içeriği veya PEM dosya yolu. */
function readCa(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (v.includes('-----BEGIN')) return v.replace(/\\n/g, '\n');
  return fs.readFileSync(v, 'utf8');
}

/**
 * TLS doğrulaması: DB_SSL_REJECT_UNAUTHORIZED açıkça verilmezse canlıda true, yerelde false.
 * Açıkça verilirse connection string’deki sslmode yok sayılır (pg aksi halde URL’i öncelikli uygular).
 */
function buildSslConfig(env) {
  const explicit = env.DB_SSL_REJECT_UNAUTHORIZED != null && String(env.DB_SSL_REJECT_UNAUTHORIZED).trim() !== '';
  const rejectUnauthorized = envFlag('DB_SSL_REJECT_UNAUTHORIZED', isProduction(env), env);
  const ssl = { rejectUnauthorized };
  const ca = readCa(env.DB_SSL_CA);
  if (ca) ssl.ca = ca;
  return { ssl, explicit };
}

function stripSslMode(connectionString) {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete('sslmode');
    u.searchParams.delete('uselibpqcompat');
    return u.toString();
  } catch (_) {
    return connectionString;
  }
}

function buildPoolConfig(env = process.env) {
  // Managed Postgres (Neon / Render / Railway): DATABASE_URL tercih edilir
  if (env.DATABASE_URL) {
    const url = env.DATABASE_URL;
    const cfg = {
      connectionString: url,
      max: Number(env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
    };
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    if (!isLocal || env.DB_SSL === '1') {
      const { ssl, explicit } = buildSslConfig(env);
      cfg.ssl = ssl;
      if (explicit || ssl.ca) cfg.connectionString = stripSslMode(url);
    }
    return cfg;
  }

  const cfg = {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    database: requiredEnv(env, 'DB_NAME'),
    user: requiredEnv(env, 'DB_USER'),
    password: requiredEnv(env, 'DB_PASSWORD'),
    max: Number(env.DB_POOL_MAX || 10),
  };
  if (env.DB_SSL === '1') cfg.ssl = buildSslConfig(env).ssl;
  return cfg;
}

module.exports = { buildPoolConfig, buildSslConfig, stripSslMode };
