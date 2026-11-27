#!/usr/bin/env node
/**
 * Loads a demo database dump (plain SQL, --inserts; .sql or .sql.gz) into a NEW
 * database and points .env at it. The current database is left untouched.
 *
 *   node scripts/db-restore-demo.js [dump.sql.gz] [--db=ktb_erp] [--force] [--no-env]
 *
 * Without a path it picks the newest ktb_erp_demo*.sql(.gz) in backups/, tools/demo-db
 * (shipped, users without password hashes), Downloads and Desktop.
 * --force drops the target database first when it already exists.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};
const targetDb = opt('db', 'ktb_erp');
if (!/^[a-z_][a-z0-9_]*$/.test(targetDb)) {
  console.error(`Gecersiz veritabani adi: ${targetDb}`);
  process.exit(1);
}

function findDump() {
  const explicit = args.find((a) => !a.startsWith('--'));
  if (explicit) return path.resolve(explicit);
  const home = os.homedir();
  const dirs = [
    path.join(ROOT, 'backups'),
    path.join(ROOT, 'backups', 'demo'),
    path.join(ROOT, 'tools', 'demo-db'),
    path.join(home, 'Downloads'),
    path.join(home, 'OneDrive', 'Downloads'),
    path.join(home, 'Desktop'),
    path.join(home, 'OneDrive', 'Masaüstü'),
    path.join(home, 'OneDrive', 'Desktop'),
  ];
  const hits = [];
  for (const d of dirs) {
    let names = [];
    try { names = fs.readdirSync(d); } catch (_) { continue; }
    for (const n of names) {
      if (/^ktb_erp_demo.*\.sql(\.gz)?$/i.test(n)) {
        const full = path.join(d, n);
        hits.push({ full, mtime: fs.statSync(full).mtimeMs });
      }
    }
  }
  hits.sort((a, b) => b.mtime - a.mtime);
  return hits[0]?.full || null;
}

function baseConfig(database) {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    u.pathname = `/${database}`;
    const isLocal = /localhost|127\.0\.0\.1/.test(u.hostname);
    return { connectionString: u.toString(), ssl: isLocal ? undefined : { rejectUnauthorized: false } };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
  };
}

function readSql(file) {
  let buf = fs.readFileSync(file);
  if (file.toLowerCase().endsWith('.gz')) buf = zlib.gunzipSync(buf);
  const text = buf.toString('utf8');
  if (/^COPY .* FROM stdin;$/m.test(text)) {
    throw new Error('Bu dosya COPY formatinda; --inserts ile alinmis dump gerekir (veya psql ile yukleyin).');
  }
  // psql meta-commands (\restrict, \connect …) are not SQL.
  return text.split(/\r?\n/).filter((l) => !l.startsWith('\\')).join('\n');
}

function updateEnv(dbName) {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('  .env yok — DB_NAME elle ayarlanmali.');
    return;
  }
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const backup = `${envPath}.yedek-${stamp}`;
  fs.copyFileSync(envPath, backup);
  let text = fs.readFileSync(envPath, 'utf8');
  if (/^DB_NAME=.*$/m.test(text)) text = text.replace(/^DB_NAME=.*$/m, `DB_NAME=${dbName}`);
  else text += `${text.endsWith('\n') ? '' : '\n'}DB_NAME=${dbName}\n`;
  fs.writeFileSync(envPath, text);
  console.log(`  .env guncellendi: DB_NAME=${dbName} (eski hali: ${path.basename(backup)})`);
  if (process.env.DATABASE_URL) {
    console.log('  Not: DATABASE_URL tanimli; o adresteki veritabani adini da degistirin.');
  }
}

async function main() {
  const file = findDump();
  if (!file || !fs.existsSync(file)) {
    console.error('Demo dump dosyasi bulunamadi. Dosyayi Indirilenler klasorune koyun veya yolunu verin.');
    process.exit(1);
  }
  console.log(`Dump: ${file}`);
  const sql = readSql(file);
  console.log(`  ${(sql.length / 1024 / 1024).toFixed(1)} MB SQL okundu.`);

  const currentDb = process.env.DB_NAME || 'postgres';
  if (currentDb === targetDb && !flag('force')) {
    console.error(`.env zaten ${targetDb} gosteriyor. Uzerine yazmak icin --force kullanin.`);
    process.exit(2);
  }

  const admin = new Client(baseConfig('postgres'));
  await admin.connect();
  const exists = (await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb])).rowCount > 0;
  if (exists) {
    if (!flag('force')) {
      await admin.end();
      console.error(`"${targetDb}" veritabani zaten var. Silip yeniden yuklemek icin --force kullanin.`);
      process.exit(2);
    }
    console.log(`  "${targetDb}" siliniyor (--force)…`);
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [targetDb]
    );
    await admin.query(`DROP DATABASE "${targetDb}"`);
  }
  await admin.query(`CREATE DATABASE "${targetDb}" ENCODING 'UTF8' TEMPLATE template0`);
  await admin.end();
  console.log(`  "${targetDb}" olusturuldu, yukleniyor…`);

  const db = new Client(baseConfig(targetDb));
  await db.connect();
  try {
    await db.query(sql);
    await db.query('SET search_path TO public');
    await db.query('UPDATE public.users SET refresh_token_hash = NULL');
    const firms = await db.query('SELECT company_code, company_name FROM public.companies ORDER BY id');
    console.log(`  Yukleme tamam. Firmalar (${firms.rowCount}):`);
    firms.rows.forEach((f) => console.log(`    ${f.company_code}  ${f.company_name}`));
  } finally {
    await db.end();
  }

  if (!flag('no-env')) updateEnv(targetDb);
  console.log('\nBitti. Sunucuyu yeniden baslatin (npm start) ve tarayicida Ctrl+F5 yapin.');
}

main().catch((err) => {
  console.error(`HATA: ${err.message}`);
  process.exit(1);
});
