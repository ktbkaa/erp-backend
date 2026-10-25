/**
 * SQL Sorgu ekranı API.
 * - Bağlantı: varsayılan uygulama pool’u veya kullanıcı oturum override’ı
 * - Yetki: user_sql_permissions (select/insert/update/delete)
 * - DML: txMode=commit|rollback zorunlu (BEGIN…COMMIT/ROLLBACK sarmalayıcı)
 */
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const defaultPool = require('../db');

/** userKey → { pool, meta, createdAt } */
const sessionPools = new Map();
const SESSION_TTL_MS = 60 * 60 * 1000;

function userKey(req) {
  return String(req.user?.id || req.user?.user_code || req.get('x-kullanici-kodu') || 'anon');
}

function isAdmin(req) {
  const role = String(req.user?.role || '').toUpperCase();
  const code = String(req.user?.user_code || '').toUpperCase();
  const mods = req.user?.module_permissions;
  if (code === 'ADMIN' || role === 'YONETICI' || role === 'ADMIN' || role === 'YÖNETİCİ') return true;
  if (Array.isArray(mods) && mods.includes('*')) return true;
  return false;
}

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

function getActivePool(req) {
  const key = userKey(req);
  const entry = sessionPools.get(key);
  if (entry && Date.now() - entry.createdAt < SESSION_TTL_MS) {
    return { pool: entry.pool, meta: entry.meta, override: true };
  }
  if (entry) {
    entry.pool.end().catch(() => {});
    sessionPools.delete(key);
  }
  const primary = defaultPool._primary || defaultPool;
  return { pool: primary, meta: defaultMeta(), override: false };
}

async function loadSqlPerms(pool, kisiId) {
  if (!kisiId) {
    return { can_select: true, can_insert: false, can_update: false, can_delete: false };
  }
  const r = await pool.query(
    `SELECT can_select, can_insert, can_update, can_delete
     FROM user_sql_permissions WHERE kisi_id=$1`,
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

router.get('/meta', async (req, res) => {
  try {
    const { pool, meta, override } = getActivePool(req);
    const perms = await loadSqlPerms(defaultPool._primary || defaultPool, req.user?.id);
    if (isAdmin(req)) {
      perms.can_select = true;
      perms.can_insert = true;
      perms.can_update = true;
      perms.can_delete = true;
    }
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

    const profiles = await (defaultPool._primary || defaultPool).query(
      `SELECT id, profile_name, host, port, database_name, username, is_default
       FROM sql_connection_profiles ORDER BY is_default DESC, profile_name`
    ).catch(() => ({ rows: [] }));

    res.json({
      connection: { ...meta, override, password_set: false },
      permissions: perms,
      is_admin: isAdmin(req),
      tables: tables.rows,
      columns: cols.rows,
      profiles: profiles.rows,
      suggestions: [
        { label: 'SELECT * FROM items LIMIT 50', kind: 'select' },
        { label: 'SELECT * FROM partners LIMIT 50', kind: 'select' },
        { label: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'', kind: 'select' },
        { label: 'BEGIN  →  INSERT/UPDATE/DELETE  →  COMMIT veya ROLLBACK (ekran otomatik sarar)', kind: 'hint' },
      ],
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/connection/test', async (req, res) => {
  try {
    if (!isAdmin(req) && !req.user) {
      return res.status(403).json({ hata: 'Bağlantı testi için giriş gerekli.' });
    }
    const { host, port, database, user, password } = req.body || {};
    if (!host || !database || !user) {
      return res.status(400).json({ hata: 'host, database, user zorunlu.' });
    }
    const probe = new Pool({
      host: String(host),
      port: Number(port || 5432),
      database: String(database),
      user: String(user),
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

router.post('/connection/use', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ hata: 'Bağlantı değiştirmek için yönetici yetkisi gerekir.' });
    }
    const { host, port, database, user, password, label } = req.body || {};
    if (!host || !database || !user) {
      return res.status(400).json({ hata: 'host, database, user zorunlu.' });
    }
    const pool = new Pool({
      host: String(host),
      port: Number(port || 5432),
      database: String(database),
      user: String(user),
      password: password == null ? '' : String(password),
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    await pool.query('SELECT 1');
    const key = userKey(req);
    const prev = sessionPools.get(key);
    if (prev) prev.pool.end().catch(() => {});
    const meta = {
      source: 'session',
      host: String(host),
      port: Number(port || 5432),
      database: String(database),
      user: String(user),
      label: label || `${host}/${database}`,
    };
    sessionPools.set(key, { pool, meta, createdAt: Date.now() });
    res.json({ ok: true, connection: { ...meta, override: true } });
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.post('/connection/reset', async (req, res) => {
  const key = userKey(req);
  const prev = sessionPools.get(key);
  if (prev) {
    prev.pool.end().catch(() => {});
    sessionPools.delete(key);
  }
  res.json({ ok: true, connection: defaultMeta() });
});

router.post('/execute', async (req, res) => {
  const started = Date.now();
  try {
    const { sql, txMode } = req.body || {};
    const analyzed = analyzeSql(sql);
    if (analyzed.error) return res.status(400).json({ hata: analyzed.error });

    const perms = await loadSqlPerms(defaultPool._primary || defaultPool, req.user?.id);
    if (isAdmin(req)) {
      perms.can_select = perms.can_insert = perms.can_update = perms.can_delete = true;
    }

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

    if (analyzed.writeKind) {
      const mode = String(txMode || '').toLowerCase();
      if (mode !== 'commit' && mode !== 'rollback') {
        return res.status(400).json({
          hata: 'Yazma sorguları için txMode zorunlu: "commit" veya "rollback".',
          requires_transaction: true,
        });
      }
    }

    const { pool, meta } = getActivePool(req);
    const client = await pool.connect();
    try {
      let result;
      let appliedTx = null;
      if (analyzed.writeKind) {
        const mode = String(txMode).toLowerCase();
        await client.query('BEGIN');
        try {
          result = await client.query(analyzed.sql);
          if (mode === 'commit') {
            await client.query('COMMIT');
            appliedTx = 'COMMIT';
          } else {
            await client.query('ROLLBACK');
            appliedTx = 'ROLLBACK';
          }
        } catch (e) {
          await client.query('ROLLBACK').catch(() => {});
          throw e;
        }
      } else {
        result = await client.query(analyzed.sql);
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
    const pool = defaultPool._primary || defaultPool;
    const r = await pool.query(`
      SELECT u.id AS kisi_id, u.user_code, u.username, u.first_name, u.last_name, u.role,
             COALESCE(p.can_select, FALSE) AS can_select,
             COALESCE(p.can_insert, FALSE) AS can_insert,
             COALESCE(p.can_update, FALSE) AS can_update,
             COALESCE(p.can_delete, FALSE) AS can_delete
      FROM users u
      LEFT JOIN user_sql_permissions p ON p.kisi_id = u.id
      WHERE u.is_active IS DISTINCT FROM FALSE
      ORDER BY u.user_code NULLS LAST, u.id
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/permissions/:kisiId', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ hata: 'Yetkisiz.' });
    const kisiId = Number(req.params.kisiId);
    if (!kisiId) return res.status(400).json({ hata: 'kisiId gerekli.' });
    const b = req.body || {};
    const pool = defaultPool._primary || defaultPool;
    await pool.query(
      `INSERT INTO user_sql_permissions (kisi_id, can_select, can_insert, can_update, can_delete)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (kisi_id) DO UPDATE SET
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
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
