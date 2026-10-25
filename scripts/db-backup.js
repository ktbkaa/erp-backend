/**
 * Yerel (veya .env’deki) PostgreSQL yedeğini backups/ altına yazar.
 *
 *   npm run db:backup
 *
 * Çıktı: backups/erp-YYYYMMDD-HHmm.dump  (+ .sql)
 * backups/ gitignore’da — klasöründe kalır, GitHub’a gitmez.
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'backups');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d+Z$/, 'Z')
  .slice(0, 13); // YYYYMMDDTHH

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '5432';
const user = process.env.DB_USER || 'postgres';
const database = process.env.DB_NAME || 'postgres';
const password = process.env.DB_PASSWORD || '';

const base = path.join(outDir, `erp-${stamp}`);
const dumpFile = `${base}.dump`;
const sqlFile = `${base}.sql`;

function run(args, file) {
  const r = spawnSync(
    'pg_dump',
    ['-h', host, '-p', String(port), '-U', user, '-d', database, ...args, '--file', file],
    { env: { ...process.env, PGPASSWORD: password }, encoding: 'utf8' }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error(`pg_dump başarısız (exit ${r.status}). PostgreSQL PATH'te mi? pgAdmin ile aynı şifre .env'de mi?`);
  }
}

console.log(`Yedek alınıyor → ${outDir}`);
run(['--format=custom'], dumpFile);
run(['--format=plain', '--no-owner', '--no-acl'], sqlFile);
console.log('Tamam:');
console.log(' ', dumpFile);
console.log(' ', sqlFile);
