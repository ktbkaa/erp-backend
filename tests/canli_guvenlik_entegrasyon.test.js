/**
 * G-04 / G-06 / G-07 / G-08 — DB’li entegrasyon: SQL konsolu kapıları, paket uygulama,
 * audit (başarısız giriş / yetki, alan farkı), gizli parametre maskesi, login rate limit.
 */
require('dotenv').config();
if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { request } = require('./helpers/app');
const pool = require('../db');
const { authOptional, authRequired } = require('../src/middleware/authJwt');
const { auditMiddleware } = require('../src/services/auditService');
const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
const { hashParola } = require('../src/utils/parola');
const { signAccess } = require('../src/utils/jwt');
const { SECRET_MASK } = require('../src/utils/securityConfig');

const ENV_KEYS = [
  'NODE_ENV', 'ENABLE_SQL_CONSOLE', 'SQL_CONSOLE_READONLY', 'SQL_CONSOLE_ALLOW_EXTERNAL_DB',
  'ENABLE_SYSTEM_UPDATE_APPLY', 'SUPER_ADMIN_USERS', 'JWT_SECRET', 'SECRETS_FROM_ENV_ONLY',
];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

const PLAIN_USER = 'SEC_TEST_PLAIN';
const ADMIN_USER = 'SEC_TEST_ADMIN';
const PLAIN_PASS = 'Plain-Pass-123!';
const PARAM_CODE = `SEC_TEST_PARAM_${process.pid}`;
const SECRET_CODE = `SEC_TEST_${process.pid}_PASS`;

const plainHdr = { 'X-Kullanici-Kodu': PLAIN_USER };
const adminHdr = { 'X-Kullanici-Kodu': ADMIN_USER };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(authOptional);
  app.use(auditMiddleware(pool));
  app.use(authRequired);
  app.use('/auth', require('../routes/auth'));
  app.use('/sql-console', require('../routes/sql_console'));
  app.use('/sistem-guncelleme', require('../routes/sistem_guncelleme'));
  app.use('/sistem-parametreleri', require('../routes/system_parameters'));
  app.use('/audit-log', require('../routes/audit_logs'));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

async function upsertUser(code, groupCode, passHash = null) {
  const r = await pool.query('SELECT id FROM users WHERE user_code=$1', [code]);
  if (r.rows[0]) {
    await pool.query(
      'UPDATE users SET group_code=$2, is_active=TRUE, role=$3, password_hash=$4 WHERE id=$1',
      [r.rows[0].id, groupCode, 'Personel', passHash],
    );
    return r.rows[0].id;
  }
  const ins = await pool.query(
    `INSERT INTO users (user_code, username, first_name, last_name, role, is_active, group_code, password_hash)
     VALUES ($1,$1,'Sec','Test','Personel',TRUE,$2,$3) RETURNING id`,
    [code, groupCode, passHash],
  );
  return ins.rows[0].id;
}

async function waitAudit(sql, params, tries = 30) {
  for (let i = 0; i < tries; i += 1) {
    const r = await pool.query(sql, params);
    if (r.rows[0]) return r.rows[0];
    await new Promise((res) => setTimeout(res, 50));
  }
  return null;
}

describe('canlı güvenlik — entegrasyon', () => {
  let app;
  let startAuditId = 0;

  before(async () => {
    app = buildApp();
    await upsertUser(PLAIN_USER, 'GENEL', hashParola(PLAIN_PASS));
    await upsertUser(ADMIN_USER, 'ADMIN');
    const g = await pool.query(`SELECT module_permissions FROM user_groups WHERE group_code='GENEL'`);
    assert.ok(g.rows[0], 'GENEL grubu (varsayılan module_permissions) gerekli');
    const m = await pool.query('SELECT COALESCE(MAX(id),0) AS id FROM audit_logs');
    startAuditId = Number(m.rows[0].id);
  });

  afterEach(restoreEnv);

  after(async () => {
    await pool.query('DELETE FROM system_parameters WHERE parameter_code IN ($1,$2)', [PARAM_CODE, SECRET_CODE]);
    await pool.query('DELETE FROM user_sql_permissions WHERE user_id IN (SELECT id FROM users WHERE user_code IN ($1,$2))', [PLAIN_USER, ADMIN_USER]).catch(() => {});
    await pool.query('DELETE FROM users WHERE user_code IN ($1,$2)', [PLAIN_USER, ADMIN_USER]).catch(() => {});
  });

  it('ENABLE_SQL_CONSOLE=0 → 404 ERR-SQL-DISABLED', async () => {
    process.env.ENABLE_SQL_CONSOLE = '0';
    const r = await request(app, 'GET', '/sql-console/meta', { headers: adminHdr });
    assert.equal(r.status, 404);
    assert.equal(r.json.kod, 'ERR-SQL-DISABLED');
  });

  it("module_permissions ['*'] olan sıradan kullanıcı süper admin sayılmaz", async () => {
    const meta = await request(app, 'GET', '/sql-console/meta', { headers: plainHdr });
    assert.equal(meta.status, 200);
    assert.equal(meta.json.is_admin, false);
    assert.equal(meta.json.permissions.can_update, false);
    assert.equal(meta.json.external_connections, false);
    const upd = await request(app, 'POST', '/sql-console/execute', {
      headers: plainHdr,
      body: { sql: 'UPDATE users SET title = title WHERE id = -1', txMode: 'rollback' },
    });
    assert.equal(upd.status, 403);
    const perms = await request(app, 'GET', '/sql-console/permissions', { headers: plainHdr });
    assert.equal(perms.status, 403);
  });

  it('süper admin (group ADMIN) geliştirmede DML rollback çalıştırabilir', async () => {
    const r = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'UPDATE users SET title = title WHERE id = -1', txMode: 'rollback' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.transaction, 'ROLLBACK');
  });

  it('salt-okunur mod: DML 403, writable CTE / EXPLAIN ANALYZE READ ONLY ile reddedilir', async () => {
    process.env.SQL_CONSOLE_READONLY = '1';
    const meta = await request(app, 'GET', '/sql-console/meta', { headers: adminHdr });
    assert.equal(meta.json.read_only, true);
    assert.equal(meta.json.permissions.can_delete, false);
    const del = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'DELETE FROM users WHERE id = -1', txMode: 'commit' },
    });
    assert.equal(del.status, 403);
    assert.equal(del.json.kod, 'ERR-SQL-READONLY');
    const cte = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'WITH d AS (DELETE FROM users WHERE id = -1 RETURNING id) SELECT * FROM d' },
    });
    assert.equal(cte.status, 400);
    assert.match(cte.json.hata, /read-only/i);
    const sel = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'SELECT 1 AS n' },
    });
    assert.equal(sel.status, 200);
    assert.equal(sel.json.rows[0].n, 1);
  });

  it("yorumla gizlenmiş ikinci ifade (SELECT '--'; …) extended protocol ile reddedilir", async () => {
    const r = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: "SELECT '--'; UPDATE users SET title = title WHERE id = -1" },
    });
    assert.equal(r.status, 400);
  });

  it('/connection/test|use: SQL_CONSOLE_ALLOW_EXTERNAL_DB=0 veya sıradan kullanıcıda 403', async () => {
    const body = { host: '10.0.0.1', port: 5432, database: 'x', user: 'y', password: 'z' };
    const plain = await request(app, 'POST', '/sql-console/connection/test', { headers: plainHdr, body });
    assert.equal(plain.status, 403);
    process.env.SQL_CONSOLE_ALLOW_EXTERNAL_DB = '0';
    const t = await request(app, 'POST', '/sql-console/connection/test', { headers: adminHdr, body });
    assert.equal(t.status, 403);
    assert.equal(t.json.kod, 'ERR-SQL-EXTERNAL-DISABLED');
    const u = await request(app, 'POST', '/sql-console/connection/use', { headers: adminHdr, body });
    assert.equal(u.status, 403);
  });

  it('canlı modu: konsol açıksa yalnız JWT’li süper admin, salt-okunur, harici bağlantı kapalı', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret-'.padEnd(48, 'x');
    process.env.ENABLE_SQL_CONSOLE = '1';
    process.env.SQL_CONSOLE_ALLOW_EXTERNAL_DB = '1';
    process.env.SUPER_ADMIN_USERS = ADMIN_USER;
    const adminTok = { Authorization: `Bearer ${signAccess({ user_code: ADMIN_USER }, 5)}` };
    const plainTok = { Authorization: `Bearer ${signAccess({ user_code: PLAIN_USER }, 5)}` };

    const hdrOnly = await request(app, 'GET', '/sql-console/meta', { headers: adminHdr });
    assert.equal(hdrOnly.status, 403, 'canlıda X-Kullanici-Kodu ile süper admin olunmaz');
    const plain = await request(app, 'GET', '/sql-console/meta', { headers: plainTok });
    assert.equal(plain.status, 403);
    const meta = await request(app, 'GET', '/sql-console/meta', { headers: adminTok });
    assert.equal(meta.status, 200);
    assert.equal(meta.json.read_only, true);
    assert.equal(meta.json.external_connections, false);
    const upd = await request(app, 'POST', '/sql-console/execute', {
      headers: adminTok,
      body: { sql: 'UPDATE users SET title = title WHERE id = -1', txMode: 'commit' },
    });
    assert.equal(upd.status, 403);
    const conn = await request(app, 'POST', '/sql-console/connection/test', {
      headers: adminTok,
      body: { host: '169.254.169.254', database: 'x', user: 'y' },
    });
    assert.equal(conn.status, 403);

    delete process.env.ENABLE_SQL_CONSOLE;
    const off = await request(app, 'GET', '/sql-console/meta', { headers: adminTok });
    assert.equal(off.status, 404, 'canlıda bayraksız konsol kapalı');
  });

  it('/sistem-guncelleme/uygula: kapalıysa 403, açıkken yalnız süper admin', async () => {
    process.env.ENABLE_SYSTEM_UPDATE_APPLY = '0';
    const off = await request(app, 'POST', '/sistem-guncelleme/uygula', { headers: adminHdr, body: { ids: [1] } });
    assert.equal(off.status, 403);
    assert.equal(off.json.kod, 'ERR-SUP-DISABLED');

    process.env.ENABLE_SYSTEM_UPDATE_APPLY = '1';
    const plain = await request(app, 'POST', '/sistem-guncelleme/uygula', { headers: plainHdr, body: { ids: [1] } });
    assert.equal(plain.status, 403);
    assert.equal(plain.json.kod, 'ERR-SUP-FORBIDDEN');
    const anon = await request(app, 'POST', '/sistem-guncelleme/uygula', { body: { ids: [1] } });
    assert.equal(anon.status, 401);
    const empty = await request(app, 'POST', '/sistem-guncelleme/uygula', { headers: adminHdr, body: { ids: [] } });
    assert.equal(empty.status, 400);
    assert.equal(empty.json.kod, 'ERR-SUP-EMPTY');
    const bad = await request(app, 'POST', '/sistem-guncelleme/uygula', { headers: adminHdr, body: { ids: ['x'] } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.kod, 'ERR-VALIDATION');

    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret-'.padEnd(48, 'x');
    delete process.env.ENABLE_SYSTEM_UPDATE_APPLY;
    const tok = { Authorization: `Bearer ${signAccess({ user_code: ADMIN_USER }, 5)}` };
    const prodOff = await request(app, 'POST', '/sistem-guncelleme/uygula', { headers: tok, body: { ids: [1] } });
    assert.equal(prodOff.status, 403, 'canlıda varsayılan kapalı');
  });

  it('yetkisiz deneme audit_logs’a FORBIDDEN + status_code ile yazılır', async () => {
    const row = await waitAudit(
      `SELECT * FROM audit_logs WHERE id > $1 AND action = 'FORBIDDEN' AND user_code = $2
         AND request_path LIKE 'POST /sistem-guncelleme/uygula%' ORDER BY id DESC LIMIT 1`,
      [startAuditId, PLAIN_USER],
    );
    assert.ok(row, 'FORBIDDEN audit satırı olmalı');
    assert.equal(row.status_code, 403);
    assert.ok(row.ip_address);
  });

  it('başarısız login LOGIN_FAILED olarak (denenen kullanıcı adıyla) loglanır, parola yazılmaz', async () => {
    const r = await request(app, 'POST', '/auth/login', { body: { username: PLAIN_USER, password: 'yanlis-parola' } });
    assert.equal(r.status, 401);
    const row = await waitAudit(
      `SELECT * FROM audit_logs WHERE id > $1 AND action = 'LOGIN_FAILED' AND user_code = $2 ORDER BY id DESC LIMIT 1`,
      [startAuditId, PLAIN_USER],
    );
    assert.ok(row, 'LOGIN_FAILED audit satırı olmalı');
    assert.equal(row.status_code, 401);
    assert.doesNotMatch(JSON.stringify(row.new_value), /yanlis-parola/);

    const ok = await request(app, 'POST', '/auth/login', { body: { username: PLAIN_USER, password: PLAIN_PASS } });
    assert.equal(ok.status, 200);
    const okRow = await waitAudit(
      `SELECT * FROM audit_logs WHERE id > $1 AND action = 'LOGIN' AND user_code = $2 ORDER BY id DESC LIMIT 1`,
      [startAuditId, PLAIN_USER],
    );
    assert.ok(okRow, 'LOGIN audit satırı olmalı');
    assert.doesNotMatch(JSON.stringify(okRow.new_value), new RegExp(PLAIN_PASS.replace(/[!]/g, '\\!')));
  });

  it('kritik tabloda PUT: DB’deki gerçek eski → yeni alan farkı yazılır', async () => {
    const c = await request(app, 'POST', '/sistem-parametreleri', {
      headers: adminHdr,
      body: { parameter_code: PARAM_CODE, parameter_name: 'Güvenlik testi', value: 'eski' },
    });
    assert.equal(c.status, 201);
    const id = c.json.id;
    const u = await request(app, 'PUT', `/sistem-parametreleri/${id}`, { headers: adminHdr, body: { value: 'yeni' } });
    assert.equal(u.status, 200);
    const row = await waitAudit(
      `SELECT * FROM audit_logs WHERE id > $1 AND action = 'PUT' AND table_name = 'system_parameters'
         AND record_id = $2 ORDER BY id DESC LIMIT 1`,
      [startAuditId, id],
    );
    assert.ok(row, 'PUT audit satırı olmalı');
    assert.equal(row.old_value.value, 'eski');
    assert.deepEqual(row.new_value.field_changes.value, { old: 'eski', new: 'yeni' });
    assert.equal(row.new_value.field_changes.parameter_name, undefined, 'değişmeyen alan farkta yok');

    const d = await request(app, 'DELETE', `/sistem-parametreleri/${id}`, { headers: adminHdr });
    assert.equal(d.status, 200);
    const del = await waitAudit(
      `SELECT * FROM audit_logs WHERE id > $1 AND action = 'DELETE' AND table_name = 'system_parameters'
         AND record_id = $2 ORDER BY id DESC LIMIT 1`,
      [startAuditId, id],
    );
    assert.ok(del, 'DELETE audit satırı olmalı');
    assert.equal(del.old_value.parameter_code, PARAM_CODE, 'silinen satırın tamamı old_value’da');
  });

  it('gizli parametre: GET maskeli, maske geri gönderilince değer korunur, audit’te redacted', async () => {
    const c = await request(app, 'POST', '/sistem-parametreleri', {
      headers: adminHdr,
      body: { parameter_code: SECRET_CODE, parameter_name: 'Test sır', value: 'cok-gizli' },
    });
    assert.equal(c.status, 201);
    assert.equal(c.json.value, SECRET_MASK);
    const list = await request(app, 'GET', '/sistem-parametreleri', { headers: adminHdr });
    const item = list.json.find((x) => x.parameter_code === SECRET_CODE);
    assert.equal(item.value, SECRET_MASK);
    assert.equal(item.is_secret, true);
    const put = await request(app, 'PUT', `/sistem-parametreleri/${c.json.id}`, {
      headers: adminHdr,
      body: { value: SECRET_MASK, description: 'güncel' },
    });
    assert.equal(put.status, 200);
    const db = await pool.query('SELECT value FROM system_parameters WHERE id=$1', [c.json.id]);
    assert.equal(db.rows[0].value, 'cok-gizli');
    const auditRows = await pool.query(
      `SELECT old_value, new_value FROM audit_logs WHERE id > $1 AND table_name = 'system_parameters' AND record_id = $2`,
      [startAuditId, c.json.id],
    );
    assert.doesNotMatch(JSON.stringify(auditRows.rows), /cok-gizli/);

    process.env.SECRETS_FROM_ENV_ONLY = '1';
    const rej = await request(app, 'PUT', `/sistem-parametreleri/${c.json.id}`, {
      headers: adminHdr,
      body: { value: 'yeni-sir' },
    });
    assert.equal(rej.status, 400);
    assert.equal(rej.json.kod, 'ERR-SECRET-ENV-ONLY');
  });

  it('getSecretSetting: env önce, DB geri uyumlu, SECRETS_FROM_ENV_ONLY=1 iken DB okunmaz', async () => {
    const { getSecretSetting } = require('../src/utils/secretSettings');
    assert.equal(await getSecretSetting(pool, SECRET_CODE, ''), 'cok-gizli');
    assert.equal(await getSecretSetting(pool, SECRET_CODE, '', { [SECRET_CODE]: 'env-deger' }), 'env-deger');
    assert.equal(await getSecretSetting(pool, SECRET_CODE, 'yok', { SECRETS_FROM_ENV_ONLY: '1' }), 'yok');
  });

  it('GET /audit-log?ekran=… request_path üzerinden arar; LIMIT parametreli ve doğrulanır', async () => {
    const r = await request(app, 'GET', '/audit-log?ekran=sistem-guncelleme&limit=5', { headers: adminHdr });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json));
    assert.ok(r.json.length <= 5);
    assert.ok(r.json.some((x) => /sistem-guncelleme/.test(x.request_path || '')));
    const bad = await request(app, 'GET', '/audit-log?limit=abc', { headers: adminHdr });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.kod, 'ERR-VALIDATION');
    const inj = await request(app, 'GET', `/audit-log?limit=${encodeURIComponent('1; DROP TABLE users')}`, { headers: adminHdr });
    assert.equal(inj.status, 400);
  });

  it('login rate limit: art arda başarısız denemeler 429 + RATE_LIMITED audit', async () => {
    let last;
    for (let i = 0; i < 12; i += 1) {
      last = await request(app, 'POST', '/auth/login', { body: { username: PLAIN_USER, password: `yanlis-${i}` } });
      if (last.status === 429) break;
    }
    assert.equal(last.status, 429);
    assert.equal(last.json.kod, 'ERR-RATE-LIMIT');
    const row = await waitAudit(
      `SELECT * FROM audit_logs WHERE id > $1 AND action = 'RATE_LIMITED' ORDER BY id DESC LIMIT 1`,
      [startAuditId],
    );
    assert.ok(row, 'RATE_LIMITED audit satırı olmalı');
    assert.equal(row.status_code, 429);
  });
});
