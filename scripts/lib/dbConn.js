/**
 * Ops script'leri (yedek / geri yükleme / tatbikat) için ortak bağlantı çözümü.
 *
 * Öncelik: açık URL argümanı → DATABASE_URL → DB_* (db.js ile aynı).
 * pg_dump / pg_restore / psql'e parola argv yerine PG* ortam değişkenleriyle
 * geçirilir (ps çıktısında görünmez).
 */

function fromUrl(url) {
  const u = new URL(url);
  const params = u.searchParams;
  return {
    host: decodeURIComponent(u.hostname || 'localhost'),
    port: u.port || '5432',
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database: decodeURIComponent((u.pathname || '/').slice(1)) || 'postgres',
    sslmode: params.get('sslmode') || null,
    url,
  };
}

function fromEnvParts(env = process.env) {
  return {
    host: env.DB_HOST || 'localhost',
    port: String(env.DB_PORT || '5432'),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'postgres',
    sslmode: env.DB_SSL === '1' ? 'require' : null,
    url: null,
  };
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|::1|postgres|db)$/i.test(String(host || ''));
}

/** @returns {{host,port,user,password,database,sslmode,url}} */
function resolveTarget(explicitUrl, env = process.env) {
  if (explicitUrl) return fromUrl(explicitUrl);
  if (env.DATABASE_URL) return fromUrl(env.DATABASE_URL);
  return fromEnvParts(env);
}

function describeTarget(explicitUrl, env = process.env) {
  const t = resolveTarget(explicitUrl, env);
  return { host: t.host, port: t.port, user: t.user, database: t.database };
}

/** Aynı sunucuda başka bir veritabanı (ör. tatbikat için geçici DB). */
function withDatabase(target, database) {
  const next = { ...target, database };
  if (target.url) {
    const u = new URL(target.url);
    u.pathname = `/${encodeURIComponent(database)}`;
    next.url = u.toString();
  }
  return next;
}

/** libpq ortamı: pg_dump/pg_restore/psql için. */
function libpqEnv(target, base = process.env) {
  const env = {
    ...base,
    PGHOST: target.host,
    PGPORT: String(target.port),
    PGUSER: target.user,
    PGDATABASE: target.database,
  };
  if (target.password) env.PGPASSWORD = target.password;
  else delete env.PGPASSWORD;
  if (target.sslmode) env.PGSSLMODE = target.sslmode;
  else if (!isLocalHost(target.host) && !env.PGSSLMODE) env.PGSSLMODE = 'prefer';
  return env;
}

/** node-postgres Client config. */
function pgClientConfig(target) {
  const cfg = {
    host: target.host,
    port: Number(target.port),
    user: target.user,
    password: target.password,
    database: target.database,
    connectionTimeoutMillis: 15000,
  };
  const wantsSsl = target.sslmode && target.sslmode !== 'disable';
  if (wantsSsl || (!isLocalHost(target.host) && target.sslmode !== 'disable')) {
    cfg.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === '1' };
  }
  return cfg;
}

function sameDatabase(a, b) {
  return String(a.host).toLowerCase() === String(b.host).toLowerCase()
    && String(a.port) === String(b.port)
    && a.database === b.database;
}

module.exports = {
  resolveTarget,
  describeTarget,
  withDatabase,
  libpqEnv,
  pgClientConfig,
  sameDatabase,
  isLocalHost,
};
