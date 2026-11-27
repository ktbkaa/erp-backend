#!/usr/bin/env node
/**
 * Geliştirici .env veritabanına dokunmadan izole test koşumu.
 *
 *   npm run test:isolated                 # TEST_DATABASE_URL (varsayılan: docker-compose.test.yml → 127.0.0.1:55432)
 *   npm run test:isolated -- --docker     # docker-compose.test.yml postgres-test konteynerini başlatır
 *   npm run test:isolated -- --fresh      # test DB'sini silip yeniden oluşturur
 *   npm run test:isolated -- --strict     # bilinen hatalar da kırar
 *
 * Ortam değişkenleri .env'den önce gelir; DATABASE_URL burada test DB'sine
 * zorlandığı için db.js .env'deki geliştirme veritabanını kullanmaz.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');
const { resolveTarget, withDatabase, pgClientConfig } = require('../lib/dbConn');

const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(`--${f}`);
const TEST_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:55432/erp_test';

function step(title, cmd, cmdArgs, env) {
  console.log(`\n▶ ${title}`);
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', env });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const err = new Error(`${title} başarısız (exit ${r.status})`);
    err.exitCode = r.status;
    throw err;
  }
}

async function ensureDatabase(target, fresh) {
  if (!/(^|[_-])(test|ci)\d*([_-]|$)/i.test(target.database)) {
    throw new Error(`TEST_DATABASE_URL veritabanı adı test/ci içermeli (şu an: ${target.database}).`);
  }
  const admin = new Client(pgClientConfig(withDatabase(target, 'postgres')));
  let lastErr;
  for (let i = 0; i < 30; i += 1) {
    try {
      await admin.connect();
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (lastErr) throw new Error(`Test Postgres'e bağlanılamadı (${target.host}:${target.port}): ${lastErr.message}`);
  try {
    const exists = (await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [target.database])).rowCount > 0;
    if (exists && fresh) {
      await admin.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
        [target.database]
      );
      await admin.query(`DROP DATABASE "${target.database.replace(/"/g, '""')}"`);
    }
    if (!exists || fresh) {
      await admin.query(`CREATE DATABASE "${target.database.replace(/"/g, '""')}" ENCODING 'UTF8' TEMPLATE template0`);
      console.log(`Test veritabanı oluşturuldu: ${target.database}`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  if (has('docker')) {
    step('docker compose postgres-test', 'docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d', '--wait'], process.env);
  }
  const target = resolveTarget(TEST_URL);
  await ensureDatabase(target, has('fresh'));

  const env = {
    ...process.env,
    DATABASE_URL: TEST_URL,
    NODE_ENV: 'test',
    ERP_AUTH_SOFT: process.env.ERP_AUTH_SOFT ?? '1',
    TCMB_SCHEDULER: 'off',
    LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
  };
  step('migrate', 'node', ['db/migrate.js'], env);
  step('seed (test fixture)', 'node', ['scripts/ci/seed-test-db.js'], env);
  step('test', 'node', ['scripts/ci/run-tests.js', ...(has('strict') ? ['--strict'] : [])], env);
}

main().catch((err) => {
  console.error(`test-isolated: ${err.message}`);
  process.exit(err.exitCode || 1);
});
