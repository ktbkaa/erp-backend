const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('SQL Sorgu konsolu', () => {
  let app;
  let pool;
  /** Yönetici kullanıcı (role=Yonetici) — SQL yazma yetkisi için */
  const adminHdr = { 'X-Kullanici-Kodu': 'owner' };

  before(() => {
    ({ app, pool } = createApp());
  });

  it('meta bağlantı + yetki + tablolar döner', async () => {
    const res = await request(app, 'GET', '/sql-console/meta', {
      headers: adminHdr,
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.connection?.host);
    assert.ok(res.json.connection?.database);
    assert.equal(typeof res.json.permissions?.can_select, 'boolean');
    assert.equal(res.json.is_admin, true);
    assert.ok(Array.isArray(res.json.tables));
    assert.ok(Array.isArray(res.json.profiles));
  });

  it('SELECT çalışır', async () => {
    const res = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'SELECT 1 AS n' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.equal(res.json.verb, 'SELECT');
    assert.deepEqual(res.json.fields, ['n']);
    assert.equal(res.json.rows[0].n, 1);
  });

  it('DML txMode olmadan reddedilir', async () => {
    const res = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'UPDATE users SET title = title WHERE id = -1' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.json.requires_transaction);
  });

  it('DML ROLLBACK ile çalışır ve kalıcı olmaz', async () => {
    const marker = `sql_console_test_${Date.now()}`;
    const before = await pool.query(`SELECT title FROM users WHERE user_code = 'owner'`);
    const prev = before.rows[0]?.title;
    const res = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: {
        sql: `UPDATE users SET title = '${marker}' WHERE user_code = 'owner'`,
        txMode: 'rollback',
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.transaction, 'ROLLBACK');
    const check = await pool.query(`SELECT title FROM users WHERE user_code = 'owner'`);
    assert.equal(check.rows[0]?.title, prev);
    assert.notEqual(check.rows[0]?.title, marker);
  });

  it('DROP engellenir', async () => {
    const res = await request(app, 'POST', '/sql-console/execute', {
      headers: adminHdr,
      body: { sql: 'DROP TABLE users' },
    });
    assert.equal(res.status, 400);
    assert.match(String(res.json.hata || ''), /izin yok/i);
  });

  it('kullanıcı kartında sql_permissions okunur/yazılır', async () => {
    const u = await pool.query(`SELECT id FROM users WHERE user_code = 'owner' LIMIT 1`);
    const id = u.rows[0].id;
    const get1 = await request(app, 'GET', `/users/${id}`, { headers: adminHdr });
    assert.equal(get1.status, 200);
    assert.equal(typeof get1.json.sql_permissions?.can_select, 'boolean');

    const put = await request(app, 'PUT', `/users/${id}`, {
      headers: adminHdr,
      body: {
        sql_permissions: {
          can_select: true,
          can_insert: true,
          can_update: false,
          can_delete: false,
        },
      },
    });
    assert.equal(put.status, 200);
    assert.equal(put.json.sql_permissions.can_insert, true);
    assert.equal(put.json.sql_permissions.can_delete, false);
  });
});
