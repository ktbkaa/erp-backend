/**
 * Birincil DB → ayna (kullanıcı PostgreSQL) tam senkron.
 *
 *   # Ayna URL zorunlu
 *   DB_MIRROR_URL=postgresql://user:pass@host:5432/postgres npm run db:mirror-sync
 *
 * Cloud Agent, laptop’taki 127.0.0.1’e bağlanamaz.
 * Cloudflare Tunnel / ngrok / port açma ile erişilebilir host gerekir.
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { URL } = require('url');

function parseTarget(label, urlOrParts) {
  if (urlOrParts.url) {
    const u = new URL(urlOrParts.url);
    return {
      label,
      host: u.hostname,
      port: u.port || '5432',
      user: decodeURIComponent(u.username || 'postgres'),
      password: decodeURIComponent(u.password || ''),
      database: (u.pathname || '/postgres').replace(/^\//, '') || 'postgres',
    };
  }
  return {
    label,
    host: urlOrParts.host || 'localhost',
    port: String(urlOrParts.port || 5432),
    user: urlOrParts.user,
    password: urlOrParts.password,
    database: urlOrParts.database,
  };
}

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { env: { ...process.env, ...env }, encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exit ${r.status}`);
  }
}

function main() {
  const mirrorUrl = process.env.DB_MIRROR_URL || process.env.LOCAL_DATABASE_URL;
  if (!mirrorUrl) {
    console.error(`
DB_MIRROR_URL (veya LOCAL_DATABASE_URL) yok.

Cloud Agent senin bilgisayarındaki PostgreSQL'e doğrudan yazamaz.
1) Cloudflare Tunnel / ngrok ile Postgres'i erişilebilir yap
2) Cursor secret: DB_MIRROR_URL=postgresql://USER:PASS@HOST:PORT/DBNAME
3) Tekrar: npm run db:mirror-sync
`);
    process.exit(2);
  }

  const src = process.env.DATABASE_URL
    ? parseTarget('primary', { url: process.env.DATABASE_URL })
    : parseTarget('primary', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
      });
  const dst = parseTarget('mirror', { url: mirrorUrl });

  if (/^(localhost|127\.0\.0\.1)$/i.test(dst.host)) {
    console.warn('[uyarı] Ayna host localhost — Cloud Agent’ta bu senin PC’n değil, agent VM’dir.');
  }

  const dumpFile = path.join(os.tmpdir(), `erp-mirror-${Date.now()}.dump`);
  console.log(`[1/3] Dump ${src.label} → ${dumpFile}`);
  run(
    'pg_dump',
    [
      '-h', src.host, '-p', src.port, '-U', src.user, '-d', src.database,
      '--format=custom', '--file', dumpFile,
    ],
    { PGPASSWORD: src.password }
  );

  console.log(`[2/3] Restore → ${dst.label} (${dst.host}:${dst.port}/${dst.database})`);
  run(
    'pg_restore',
    [
      '-h', dst.host, '-p', dst.port, '-U', dst.user, '-d', dst.database,
      '--clean', '--if-exists', '--no-owner', '--no-acl',
      dumpFile,
    ],
    { PGPASSWORD: dst.password }
  );

  fs.unlinkSync(dumpFile);
  console.log('[3/3] Ayna senkron tamam. pgAdmin’de aynı veritabanını yenile.');
}

main();
