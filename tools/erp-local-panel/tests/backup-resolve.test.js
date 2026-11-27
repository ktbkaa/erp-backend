const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { resolvePgDump } = require('../src/util/pgdump');
const { nodeSqlBackup } = require('../src/util/nodeBackup');

describe('local panel backup', () => {
  it('resolvePgDump prefers existing configured path', () => {
    const real = resolvePgDump('');
    if (real && fs.existsSync(real)) {
      assert.equal(resolvePgDump(real), real);
    } else {
      assert.equal(resolvePgDump('/no/such/pg_dump'), null);
    }
  });

  it('resolvePgDump returns string or null', () => {
    const p = resolvePgDump('');
    assert.ok(p === null || typeof p === 'string');
  });

  it('nodeSqlBackup writes sql when DB available', async () => {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
    if (!process.env.DB_PASSWORD && !process.env.DB_HOST) {
      // CI without DB — skip soft
      return;
    }
    const out = path.join(__dirname, '..', 'logs', 'test-node-backup.sql');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const r = await nodeSqlBackup({
      db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        database: process.env.DB_NAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
      },
      sqlFile: out,
      erpRoot: path.join(__dirname, '../../..'),
    });
    assert.equal(r.ok, true);
    assert.ok(fs.existsSync(out));
    assert.ok(r.bytes > 100);
    fs.unlinkSync(out);
  });
});
