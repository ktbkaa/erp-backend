/**
 * SQL Sorgu ekranı API.
 * - Bayrak: ENABLE_SQL_CONSOLE (canlıda varsayılan kapalı → 404)
 * - Erişim: süper admin (securityConfig.isSuperAdmin); geliştirmede ayrıca user_sql_permissions
 * - Canlıda salt-okunur; okuma sorguları her ortamda READ ONLY transaction içinde
 * - Harici DB bağlantısı (/connection/test|use) canlıda kapalı (SSRF)
 * - DML: txMode=commit|rollback zorunlu (BEGIN…COMMIT/ROLLBACK sarmalayıcı)
 */
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const defaultPool = require('../db');
const { validateBody, schemas } = require('../src/utils/validate');
const {
  isProduction,
  isSqlConsoleEnabled,
  isSqlConsoleReadOnly,
  isSqlConsoleExternalDbAllowed,
  isSuperAdmin,
} = require('../src/utils/securityConfig');

/** userKey → { pool, meta, createdAt } */
const sessionPools = new Map();
const SESSION_TTL_MS = 60 * 60 * 1000;
const STATEMENT_TIMEOUT_MS = Number(process.env.SQL_CONSOLE_STATEMENT_TIMEOUT_MS || 15000);

function userKey(req) {
  return String(req.user?.id || req.user?.user_code || 'anon');
}

const isAdmin = (req) => isSuperAdmin(req);

function primaryPool() {
  return defaultPool._primary || defaultPool;
}

router.use((req, res, next) => {
  if (!isSqlConsoleEnabled()) {
    return res.status(404).json({
      hata: 'SQL konsolu bu ortamda kapalı (ENABLE_SQL_CONSOLE).',
      kod: 'ERR-SQL-DISABLED',
    });
  }
  if (!req.user) {
    return res.status(401).json({ hata: 'SQL konsolu için giriş gerekli.', kod: 'ERR-SQL-AUTH' });
  }
  // Canlıda yalnız süper admin; geliştirmede user_sql_permissions ile sınırlı erişim sürer
  if (isProduction() && !isAdmin(req)) {
    return res.status(403).json({ hata: 'SQL konsolu yalnız süper admin içindir.', kod: 'ERR-SQL-FORBIDDEN' });
  }
  next();
});

function defaultMeta() {
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      return {
        source: 'env-url',
        host: u.hostname,
        port: Number(u.port || 5432),
        database: (u.pathname || '/postgres').replace(/^\//, '') || 'postgres',
        user: decodeURIComponent(u.username || 'postgres'),
        label: 'Uygulama DATABASE_URL',
      };
    } catch (_) { /* fallthrough */ }
  }
  return {
    source: 'env',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    label: 'Yerel / .env PostgreSQL',
  };
}

function dropSession(key) {
  const entry = sessionPools.get(key);
  if (entry) {
    entry.pool.end().catch(() => {});
    sessionPools.delete(key);
  }
}

function getActivePool(req) {
  const key = userKey(req);
  const entry = sessionPools.get(key);
  if (entry && isSqlConsoleExternalDbAllowed() && Date.now() - entry.createdAt < SESSION_TTL_MS) {
    return { pool: entry.pool, meta: entry.meta, override: true };
  }
  if (entry) dropSession(key);
  return { pool: primaryPool(), meta: defaultMeta(), override: false };
}

async function loadSqlPerms(pool, kisiId) {
  if (!kisiId) {
    return { can_select: true, can_insert: false, can_update: false, can_delete: false };
  }
  const r = await pool.query(
    `SELECT can_select, can_insert, can_update, can_delete
     FROM user_sql_permissions WHERE user_id=$1`,
    [kisiId]
  ).catch(() => ({ rows: [] }));
  if (r.rows[0]) {
    return {
      can_select: Boolean(r.rows[0].can_select),
      can_insert: Boolean(r.rows[0].can_insert),
      can_update: Boolean(r.rows[0].can_update),
      can_delete: Boolean(r.rows[0].can_delete),
    };
  }
  // Varsayılan: yalnızca SELECT (yöneticide migration seed dolu olabilir)
  return { can_select: true, can_insert: false, can_update: false, can_delete: false };
}

async function effectivePerms(req) {
  const perms = await loadSqlPerms(primaryPool(), req.user?.id);
  if (isAdmin(req)) {
    perms.can_select = perms.can_insert = perms.can_update = perms.can_delete = true;
  }
  if (isSqlConsoleReadOnly()) {
    perms.can_insert = perms.can_update = perms.can_delete = false;
  }
  return perms;
}

/** Sunucu dosyası / süreç / oturum ayarına dokunan fonksiyonlar her modda yasak. */
const BLOCKED_FUNCTIONS = /\b(pg_read_file|pg_read_binary_file|pg_ls_\w+|pg_stat_file|pg_file_write|lo_import|lo_export|lo_get|lo_put|lo_from_bytea|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_promote|dblink\w*|pg_sleep\w*|set_config|pg_advisory\w*|query_to_xml\w*|pg_logical_emit_message)\s*\(/i;

/** Tek statement; tehlikeli DDL engeli */
function analyzeSql(sql) {
  const raw = String(sql || '').trim();
  if (!raw) return { error: 'SQL boş.' };
  // Çoklu statement: ; ile ayır, boşları at; 1’den fazla yasak (transaction sarmalı hariç)
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
  const parts = stripped.split(';').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return { error: 'Tek seferde yalnızca bir SQL ifadesi çalıştırılabilir.' };
  }
  const one = parts[0] || stripped.trim();
  const head = one.replace(/^\(+/, '').trimStart();
  const verb = (head.match(/^(\w+)/i) || [])[1]?.toUpperCase() || '';

  const blocked = /^(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|COPY|VACUUM|REINDEX|CLUSTER|CALL|DO|EXECUTE|SECURITY)\b/i;
  if (blocked.test(head)) {
    return { error: `Bu ekranda «${verb || 'DDL'}» ifadelerine izin yok.` };
  }
  if (BLOCKED_FUNCTIONS.test(raw)) {
    return { error: 'Bu ekranda sunucu/oturum fonksiyonlarına izin yok.' };
  }

  const writes = {
    INSERT: 'insert',
    UPDATE: 'update',
    DELETE: 'delete',
    MERGE: 'update',
  };
  const writeKind = writes[verb] || null;
  const isSelect = verb === 'SELECT' || verb === 'WITH' || verb === 'SHOW' || verb === 'EXPLAIN' || verb === 'TABLE';
  if (!writeKind && !isSelect) {
    return { error: `Desteklenmeyen ifade: ${verb || '?'}. SELECT / INSERT / UPDATE / DELETE kullanın.` };
  }
  return { sql: raw.replace(/;\s*$/, ''), verb, writeKind, isSelect: Boolean(isSelect && !writeKind) };
}

const metaHandler = async (req, res) => {
  try {
    const { pool, meta, override } = getActivePool(req);
    const perms = await effectivePerms(req);
    const tables = await pool.query(`
      SELECT c.relname AS table_name,
             COALESCE(obj_description(c.oid), '') AS comment
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `).catch(() => ({ rows: [] }));

    const cols = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `).catch(() => ({ rows: [] }));

    const externalAllowed = isSqlConsoleExternalDbAllowed() && isAdmin(req);
    const profiles = externalAllowed
      ? await primaryPool().query(
        `SELECT id, profile_name, host, port, database_name, username, is_default
         FROM sql_connection_profiles ORDER BY is_default DESC, profile_name`
      ).catch(() => ({ rows: [] }))
      : { rows: [] };

    res.json({
      connection: { ...meta, override, password_set: false },
      permissions: perms,
      is_admin: isAdmin(req),
      read_only: isSqlConsoleReadOnly(),
      external_connections: externalAllowed,
      tables: tables.rows,
      columns: cols.rows,
      profiles: profiles.rows,
    });
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(500).json({ hata: err.message });
  }
};

router.get('/', metaHandler);
router.get('/meta', metaHandler);

function guardExternalDb(req, res) {
  if (!isSqlConsoleExternalDbAllowed()) {
    res.status(403).json({
      hata: 'Harici veritabanı bağlantısı bu ortamda kapalı.',
      kod: 'ERR-SQL-EXTERNAL-DISABLED',
    });
    return false;
  }
  if (!isAdmin(req)) {
    res.status(403).json({ hata: 'Bağlantı işlemleri için süper admin yetkisi gerekir.', kod: 'ERR-SQL-FORBIDDEN' });
    return false;
  }
  return true;
}

router.post('/connection/test', validateBody(schemas.sqlConnection), async (req, res) => {
  if (!guardExternalDb(req, res)) return;
  try {
    const { host, port, database, user, password } = req.body;
    const probe = new Pool({
      host,
      port: Number(port || 5432),
      database,
      user,
      password: password == null ? '' : String(password),
      max: 1,
      connectionTimeoutMillis: 8000,
      ssl: false,
    });
    try {
      const r = await probe.query('SELECT current_database() AS db, current_user AS usr, version() AS ver');
      res.json({ ok: true, ...r.rows[0] });
    } finally {
      await probe.end().catch(() => {});
    }
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.post('/connection/use', validateBody(schemas.sqlConnection), async (req, res) => {
  if (!guardExternalDb(req, res)) return;
  try {
    const { host, port, database, user, password, label } = req.body;
    const pool = new Pool({
      host,
      port: Number(port || 5432),
      database,
      user,
      password: password == null ? '' : String(password),
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    await pool.query('SELECT 1');
    const key = userKey(req);
    dropSession(key);
    const meta = {
      source: 'session',
      host,
      port: Number(port || 5432),
      database,
      user,
      label: label || `${host}/${database}`,
    };
    sessionPools.set(key, { pool, meta, createdAt: Date.now() });
    res.json({ ok: true, connection: { ...meta, override: true } });
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.post('/connection/reset', async (req, res) => {
  dropSession(userKey(req));
  res.json({ ok: true, connection: defaultMeta() });
});

router.post('/execute', validateBody(schemas.sqlExecute), async (req, res) => {
  const started = Date.now();
  try {
    const { sql, txMode } = req.body;
    const analyzed = analyzeSql(sql);
    if (analyzed.error) return res.status(400).json({ hata: analyzed.error });

    if (analyzed.writeKind && isSqlConsoleReadOnly()) {
      return res.status(403).json({
        hata: 'SQL konsolu salt-okunur modda; yazma sorgularına izin yok.',
        kod: 'ERR-SQL-READONLY',
      });
    }

    const perms = await effectivePerms(req);

    if (analyzed.isSelect && !perms.can_select) {
      return res.status(403).json({ hata: 'SELECT yetkiniz yok.' });
    }
    if (analyzed.writeKind === 'insert' && !perms.can_insert) {
      return res.status(403).json({ hata: 'INSERT yetkiniz yok.' });
    }
    if (analyzed.writeKind === 'update' && !perms.can_update) {
      return res.status(403).json({ hata: 'UPDATE yetkiniz yok.' });
    }
    if (analyzed.writeKind === 'delete' && !perms.can_delete) {
      return res.status(403).json({ hata: 'DELETE yetkiniz yok.' });
    }

    const mode = String(txMode || '').toLowerCase();
    if (analyzed.writeKind && mode !== 'commit' && mode !== 'rollback') {
      return res.status(400).json({
        hata: 'Yazma sorguları için txMode zorunlu: "commit" veya "rollback".',
        requires_transaction: true,
      });
    }

    const { pool, meta } = getActivePool(req);
    const client = await pool.connect();
    try {
      let result;
      let appliedTx = null;
      // Extended protocol: sunucu tek komuttan fazlasını reddeder (";" ile ikinci ifade enjeksiyonu kapanır)
      const stmt = { text: analyzed.sql, queryMode: 'extended' };
      // Okuma sınıfı (writable CTE, EXPLAIN ANALYZE, SELECT INTO) READ ONLY transaction ile korunur
      await client.query(analyzed.writeKind ? 'BEGIN' : 'BEGIN READ ONLY');
      try {
        await client.query(`SET LOCAL statement_timeout = ${Math.max(1000, Math.floor(STATEMENT_TIMEOUT_MS))}`);
        result = await client.query(stmt);
        if (analyzed.writeKind && mode === 'commit') {
          await client.query('COMMIT');
          appliedTx = 'COMMIT';
        } else {
          await client.query('ROLLBACK');
          appliedTx = analyzed.writeKind ? 'ROLLBACK' : null;
        }
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      }

      const rows = result.rows || [];
      const fields = (result.fields || []).map((f) => f.name);
      res.json({
        ok: true,
        verb: analyzed.verb,
        rowCount: result.rowCount,
        fields,
        rows: rows.slice(0, 1000),
        truncated: rows.length > 1000,
        ms: Date.now() - started,
        transaction: appliedTx,
        connection: { host: meta.host, database: meta.database },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(400).json({ hata: err.message, ms: Date.now() - started });
  }
});

router.get('/permissions', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ hata: 'Yetkisiz.' });
    const r = await primaryPool().query(`
      SELECT u.id AS user_id, u.user_code, u.username, u.first_name, u.last_name, u.role,
             COALESCE(p.can_select, FALSE) AS can_select,
             COALESCE(p.can_insert, FALSE) AS can_insert,
             COALESCE(p.can_update, FALSE) AS can_update,
             COALESCE(p.can_delete, FALSE) AS can_delete
      FROM users u
      LEFT JOIN user_sql_permissions p ON p.user_id = u.id
      WHERE u.is_active IS DISTINCT FROM FALSE
      ORDER BY u.user_code NULLS LAST, u.id
    `);
    res.json(r.rows);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(500).json({ hata: err.message });
  }
});

router.put('/permissions/:kisiId', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ hata: 'Yetkisiz.' });
    const kisiId = Number(req.params.kisiId);
    if (!kisiId) return res.status(400).json({ hata: 'kisiId gerekli.' });
    const b = req.body || {};
    await primaryPool().query(
      `INSERT INTO user_sql_permissions (user_id, can_select, can_insert, can_update, can_delete)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET
         can_select=EXCLUDED.can_select,
         can_insert=EXCLUDED.can_insert,
         can_update=EXCLUDED.can_update,
         can_delete=EXCLUDED.can_delete`,
      [
        kisiId,
        b.can_select !== false,
        Boolean(b.can_insert),
        Boolean(b.can_update),
        Boolean(b.can_delete),
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
module.exports.analyzeSql = analyzeSql;
