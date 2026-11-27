/**
 * Operasyon altyapısı (DB gerektirmez): sağlık uçları, açılış denetimi,
 * yedek şifreleme, S3 URL'leri, manifest karşılaştırması, test kapısı ayrıştırıcısı.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');

async function get(app, url) {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${url}`);
    return { status: res.status, json: await res.json(), headers: res.headers };
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

describe('ops altyapısı', () => {
  it('/health DB\'ye gitmez, /ready DB + migration kontrol eder', async () => {
    const { createHealthRouter, state } = require('../src/infra/health');
    const files = fs.readdirSync(path.join(__dirname, '..', 'db', 'migrations')).filter((f) => f.endsWith('.sql'));
    let calls = 0;
    const pool = {
      totalCount: 1, idleCount: 1, waitingCount: 0,
      async query(sql) {
        calls += 1;
        if (/schema_migrations/.test(sql)) return { rows: files.slice(0, -1).map((filename) => ({ filename })) };
        return { rows: [{ '?column?': 1 }] };
      },
    };
    const app = express();
    app.use(createHealthRouter({ pool, logger: silentLogger }));

    const h = await get(app, '/health');
    assert.equal(h.status, 200);
    assert.equal(h.json.status, 'ok');
    assert.equal(calls, 0);

    const r = await get(app, '/ready');
    assert.equal(r.status, 503, 'bekleyen migration varken hazır değil');
    assert.equal(r.json.checks.migration.bekleyen, 1);
    assert.equal(r.json.checks.veritabani.durum, 'bagli');

    state.shuttingDown = true;
    try {
      assert.equal((await get(app, '/health')).status, 503);
    } finally {
      state.shuttingDown = false;
    }
  });

  it('/ready: SEED_DEMO_DATA yokken atlanan demo seed migration’ları bekleyen sayılmaz', async () => {
    const { createHealthRouter } = require('../src/infra/health');
    const { isDemoSeedMigration } = require('../src/bootstrap/demoSeedPolicy');
    const files = fs.readdirSync(path.join(__dirname, '..', 'db', 'migrations')).filter((f) => f.endsWith('.sql'));
    const pool = {
      totalCount: 1, idleCount: 1, waitingCount: 0,
      async query(sql) {
        if (/schema_migrations/.test(sql)) {
          return { rows: files.filter((f) => !isDemoSeedMigration(f)).map((filename) => ({ filename })) };
        }
        return { rows: [{ '?column?': 1 }] };
      },
    };
    const prev = process.env.SEED_DEMO_DATA;
    delete process.env.SEED_DEMO_DATA;
    try {
      const app = express();
      app.use(createHealthRouter({ pool, logger: silentLogger }));
      const r = await get(app, '/ready');
      assert.equal(r.status, 200);
      assert.equal(r.json.checks.migration.bekleyen, 0);
    } finally {
      if (prev !== undefined) process.env.SEED_DEMO_DATA = prev;
    }
  });

  it('/ready DB hatasında 503 döner', async () => {
    const { createHealthRouter } = require('../src/infra/health');
    const pool = { totalCount: 0, idleCount: 0, waitingCount: 0, query: async () => { throw new Error('ECONNREFUSED'); } };
    const app = express();
    app.use(createHealthRouter({ pool, logger: silentLogger }));
    const r = await get(app, '/ready');
    assert.equal(r.status, 503);
    assert.equal(r.json.checks.veritabani.durum, 'baglantisiz');
  });

  it('production açılış denetimi tehlikeli ayarları reddeder', () => {
    const { checkEnvironment } = require('../src/infra/lifecycle');
    const bad = checkEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', ERP_AUTH_SOFT: '1' });
    assert.ok(bad.errors.some((e) => e.includes('JWT_SECRET')));
    assert.ok(bad.errors.some((e) => e.includes('ERP_AUTH_SOFT')));
    const ok = checkEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x', JWT_SECRET: 'x'.repeat(40), AUTO_HEAL: '0' });
    assert.deepEqual(ok.errors, []);
    assert.deepEqual(ok.warnings, []);
  });

  it('httpLogger X-Request-Id üretir / geçerli olanı korur', async () => {
    const { httpLogger } = require('../src/infra/logger');
    const app = express();
    app.use(httpLogger(silentLogger));
    app.get('/x', (req, res) => res.json({ id: req.id }));
    const r = await get(app, '/x');
    assert.match(r.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
    assert.equal(r.json.id, r.headers.get('x-request-id'));
  });

  it('yedek şifreleme gidiş-dönüş + yanlış parola', async () => {
    const { encryptFile, decryptFile, isEncrypted } = require('../scripts/lib/backupCrypto');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ktb-enc-'));
    try {
      const src = path.join(dir, 'a.dump');
      fs.writeFileSync(src, Buffer.from('PGDMP'.repeat(10000)));
      await encryptFile(src, `${src}.enc`, 'dogru-parola-1234567890');
      assert.ok(isEncrypted(`${src}.enc`));
      await decryptFile(`${src}.enc`, path.join(dir, 'b.dump'), 'dogru-parola-1234567890');
      assert.ok(fs.readFileSync(path.join(dir, 'b.dump')).equals(fs.readFileSync(src)));
      await assert.rejects(decryptFile(`${src}.enc`, path.join(dir, 'c.dump'), 'yanlis-parola-1234567890'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('S3 URL: AWS virtual-hosted, özel endpoint path-style, anahtar kodlama', () => {
    const { _buildUrl } = require('../scripts/lib/s3Lite');
    const aws = _buildUrl({ bucket: 'b', region: 'eu-central-1', forcePathStyle: false }, 'prod/erp a.dump');
    assert.equal(aws.url.toString(), 'https://b.s3.eu-central-1.amazonaws.com/prod/erp%20a.dump');
    const r2 = _buildUrl({ bucket: 'b', region: 'auto', endpoint: 'https://acc.r2.cloudflarestorage.com', forcePathStyle: true }, null, { prefix: 'prod/', 'list-type': '2' });
    assert.equal(r2.canonicalUri, '/b/');
    assert.equal(r2.canonicalQuery, 'list-type=2&prefix=prod%2F');
  });

  it('manifest karşılaştırması satır farkını yakalar', () => {
    const { compareStats } = require('../scripts/lib/backupCore');
    const exp = { table_count: 2, row_count_mode: 'exact', row_counts: { a: 1, b: 2 }, migrations: { count: 3, last: '003.sql' } };
    assert.equal(compareStats(exp, { ...exp }).ok, true);
    const bad = compareStats(exp, { ...exp, row_counts: { a: 1, b: 5 } });
    assert.equal(bad.ok, false);
    assert.match(bad.problems[0], /b: beklenen 2/);
  });

  it('test kapısı yalnız yaprak hataları ve bilinen listeyi ayırır', () => {
    const { parseLeafFailures, isKnown } = require('../scripts/ci/run-tests');
    const tap = [
      '    not ok 1 - UI: bom-level hideSave + x',
      '      ---',
      "      location: '/r/tests/sim_partial_fix.test.js:1:1'",
      "      failureType: 'testCodeFailure'",
      '      ...',
      'not ok 1 - sim partial fix (PR \\#129)',
      '  ---',
      "  failureType: 'subtestsFailed'",
      '  ...',
      'not ok 2 - yeni',
      '  ---',
      "  location: '/r/tests/yeni.test.js:1:1'",
      "  failureType: 'testCodeFailure'",
      '  ...',
    ].join('\n');
    const f = parseLeafFailures(tap);
    assert.deepEqual(f.map((x) => x.name), ['UI: bom-level hideSave + x', 'yeni']);
    assert.ok(isKnown({ ...f[0], location: 'tests/sim_partial_fix.test.js' }));
    assert.equal(isKnown({ ...f[1], location: 'tests/yeni.test.js' }), undefined);
  });
});
