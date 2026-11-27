/**
 * Yerel (veya .env’deki) PostgreSQL yedeğini backups/ altına yazar.
 *
 *   npm run db:backup
 *
 * 1) pg_dump (PATH / PG_DUMP_PATH / yaygın Windows yolları)
 * 2) Yoksa Node+pg ile düz SQL yedek
 *
 * Çıktı: backups/erp-YYYYMMDD-HHmm.dump (+ .sql) veya erp-…-node.sql
 * backups/ gitignore’da — klasöründe kalır, GitHub’a gitmez.
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(root, 'backups');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d+Z$/, 'Z')
  .slice(0, 13);

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '5432';
const user = process.env.DB_USER || 'postgres';
const database = process.env.DB_NAME || 'postgres';
const password = process.env.DB_PASSWORD || '';

const base = path.join(outDir, `erp-${stamp}`);
const dumpFile = `${base}.dump`;
const sqlFile = `${base}.sql`;

function resolvePgDump() {
  const configured = process.env.PG_DUMP_PATH || '';
  if (configured && fs.existsSync(configured)) return configured;

  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const whichBin = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  const w = spawnSync(whichCmd, [whichBin], { encoding: 'utf8', windowsHide: true });
  if (w.status === 0) {
    const line = String(w.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (line && fs.existsSync(line)) return line;
  }

  if (process.platform === 'win32') {
    const roots = [
      'C:\\Program Files\\PostgreSQL',
      'C:\\Program Files (x86)\\PostgreSQL',
      'C:\\PostgreSQL',
    ];
    for (const rootDir of roots) {
      if (!fs.existsSync(rootDir)) continue;
      let vers = [];
      try { vers = fs.readdirSync(rootDir); } catch { continue; }
      for (const v of vers.sort().reverse()) {
        const candidate = path.join(rootDir, v, 'bin', 'pg_dump.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } else {
    for (const p of ['/usr/bin/pg_dump', '/usr/local/bin/pg_dump', '/opt/homebrew/bin/pg_dump']) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function runPgDump(pgDump, args, file) {
  const r = spawnSync(
    pgDump,
    ['-h', host, '-p', String(port), '-U', user, '-d', database, ...args, '--file', file],
    { env: { ...process.env, PGPASSWORD: password }, encoding: 'utf8', windowsHide: true }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error(`pg_dump başarısız (exit ${r.status})`);
  }
}

async function nodeSqlBackup(outSql) {
  // Panel ile aynı mantık (küçük kopya — panel bağımlılığı olmadan)
  const { Client } = require('pg');
  const client = new Client({
    host, port: Number(port), user, password, database,
    connectionTimeoutMillis: 15000,
  });
  const qIdent = (n) => `"${String(n).replace(/"/g, '""')}"`;
  const lit = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' && Number.isFinite(val)) return String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (val instanceof Date) return `'${val.toISOString().replace(/'/g, "''")}'`;
    if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`;
    if (typeof val === 'object') {
      return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
    }
    return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
  };

  const lines = [
    '-- ERP Node SQL yedek (pg_dump alternatifi)',
    `-- ${new Date().toISOString()}`,
    'SET client_encoding = \'UTF8\';',
    'SET session_replication_role = replica;',
    '',
  ];

  await client.connect();
  try {
    const tables = await client.query(`
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`);
    for (const { table_name: table } of tables.rows) {
      const colsRes = await client.query(
        `SELECT a.attname AS column_name
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname='public' AND c.relname=$1
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY a.attnum`,
        [table]
      );
      const cols = colsRes.rows.map((r) => r.column_name);
      if (!cols.length) continue;
      const colList = cols.map(qIdent).join(', ');
      lines.push(`-- TABLE public.${table}`);
      lines.push(`TRUNCATE TABLE ${qIdent(table)} CASCADE;`);
      const data = await client.query(`SELECT ${cols.map(qIdent).join(', ')} FROM ${qIdent(table)}`);
      for (const row of data.rows) {
        lines.push(
          `INSERT INTO ${qIdent(table)} (${colList}) VALUES (${cols.map((c) => lit(row[c])).join(', ')});`
        );
      }
      lines.push('');
    }
    const seqs = await client.query(`
      SELECT c.relname AS seq FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relkind='S' ORDER BY 1`);
    for (const { seq } of seqs.rows) {
      const last = await client.query(`SELECT last_value, is_called FROM ${qIdent(seq)}`);
      const row = last.rows[0];
      if (row) {
        lines.push(
          `SELECT setval('${seq.replace(/'/g, "''")}', ${Number(row.last_value)}, ${row.is_called ? 'true' : 'false'});`
        );
      }
    }
    lines.push('SET session_replication_role = DEFAULT;');
  } finally {
    await client.end().catch(() => {});
  }
  fs.writeFileSync(outSql, lines.join('\n'), 'utf8');
}

(async () => {
  console.log(`Yedek alınıyor → ${outDir}`);
  const pgDump = resolvePgDump();
  if (pgDump) {
    try {
      console.log('pg_dump:', pgDump);
      runPgDump(pgDump, ['--format=custom'], dumpFile);
      runPgDump(pgDump, ['--format=plain', '--no-owner', '--no-acl'], sqlFile);
      console.log('Tamam (pg_dump):');
      console.log(' ', dumpFile);
      console.log(' ', sqlFile);
      return;
    } catch (err) {
      console.warn('pg_dump başarısız, Node SQL yedeğe geçiliyor:', err.message);
    }
  } else {
    console.warn('pg_dump bulunamadı — Node SQL yedek kullanılıyor.');
  }

  const nodeSql = `${base}-node.sql`;
  await nodeSqlBackup(nodeSql);
  console.log('Tamam (Node SQL):');
  console.log(' ', nodeSql);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
