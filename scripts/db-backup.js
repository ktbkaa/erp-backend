#!/usr/bin/env node
/**
 * PostgreSQL yedeği (yerel + opsiyonel offsite).
 *
 *   npm run db:backup                         # .env (DATABASE_URL veya DB_*) → backups/
 *   npm run db:backup -- --plain              # ek olarak düz .sql
 *   npm run db:backup -- --no-offsite         # BACKUP_OFFSITE tanımlı olsa da yükleme
 *   node scripts/db-backup.js --url postgresql://...   # başka DB
 *
 * Bağlantı önceliği: --url → BACKUP_DATABASE_URL → DATABASE_URL → DB_*.
 *
 * Akış:
 * 1) REPEATABLE READ işlemde pg_export_snapshot + tablo satır sayıları (manifest)
 * 2) pg_dump --format=custom --snapshot=<aynı an> → erp-<db>-<UTC>.dump
 * 3) pg_restore --list ile arşiv bütünlüğü kontrolü, SHA-256
 * 4) BACKUP_ENCRYPTION_PASSPHRASE varsa AES-256-GCM → .dump.enc
 * 5) BACKUP_OFFSITE=s3|rsync|command ise yükleme; saklama (retention) temizliği
 * 6) Hata/başarı: tek satır JSON özet (stdout) + opsiyonel webhook
 *
 * pg_dump yoksa (yalnız yerel geliştirme): Node ile veri-only SQL yedeğine düşer.
 * Production / offsite / BACKUP_REQUIRE_PG_DUMP=1 iken pg_dump zorunludur.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { resolveTarget, libpqEnv } = require('./lib/dbConn');
const core = require('./lib/backupCore');
const { passphraseFromEnv, encryptFile } = require('./lib/backupCrypto');
const { fileSha256 } = require('./lib/s3Lite');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const i = args.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (i < 0) return null;
  return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1];
};

const outDir = path.resolve(opt('out') || process.env.BACKUP_DIR || path.join(core.ROOT, 'backups'));

async function nodeSqlBackup(target, outSql) {
  const client = await core.connect(target);
  const qIdent = core.qIdent;
  const lit = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number' && Number.isFinite(val)) return String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (val instanceof Date) return `'${val.toISOString().replace(/'/g, "''")}'`;
    if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };
  const out = fs.createWriteStream(outSql, 'utf8');
  const w = (s) => out.write(`${s}\n`);
  w('-- ERP Node SQL yedek (pg_dump alternatifi; YALNIZ VERİ — şema migration ile kurulmalı)');
  w(`-- ${new Date().toISOString()}`);
  w("SET client_encoding = 'UTF8';");
  w('SET session_replication_role = replica;');
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables = await client.query(`
      SELECT c.relname AS table_name FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname`);
    for (const { table_name: table } of tables.rows) {
      const cols = (await client.query(
        `SELECT a.attname AS c FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname='public' AND c.relname=$1 AND a.attnum > 0 AND NOT a.attisdropped
           AND a.attgenerated = '' ORDER BY a.attnum`,
        [table]
      )).rows.map((r) => r.c);
      if (!cols.length) continue;
      const colList = cols.map(qIdent).join(', ');
      w(`-- TABLE public.${table}`);
      w(`TRUNCATE TABLE ${qIdent(table)} CASCADE;`);
      const data = await client.query(`SELECT ${colList} FROM ${qIdent(table)}`);
      for (const row of data.rows) {
        w(`INSERT INTO ${qIdent(table)} (${colList}) VALUES (${cols.map((c) => lit(row[c])).join(', ')});`);
      }
    }
    const seqs = await client.query(`
      SELECT c.relname AS seq FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relkind='S' ORDER BY 1`);
    for (const { seq } of seqs.rows) {
      const row = (await client.query(`SELECT last_value, is_called FROM ${qIdent(seq)}`)).rows[0];
      if (row) w(`SELECT setval('${seq.replace(/'/g, "''")}', ${Number(row.last_value)}, ${row.is_called ? 'true' : 'false'});`);
    }
    w('SET session_replication_role = DEFAULT;');
    await client.query('COMMIT');
  } finally {
    await client.end().catch(() => {});
    await new Promise((r) => out.end(r));
  }
}

async function main() {
  const started = Date.now();
  const target = resolveTarget(opt('url') || process.env.BACKUP_DATABASE_URL || null);
  const prod = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const offsite = flag('no-offsite') ? 'none' : core.validateOffsiteConfig();
  const passphrase = passphraseFromEnv();
  const requirePgDump = prod || offsite !== 'none' || process.env.BACKUP_REQUIRE_PG_DUMP === '1';
  const rowMode = process.env.BACKUP_ROW_COUNTS || 'exact';

  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const stamp = core.stampNow();
  const safeDb = target.database.replace(/[^A-Za-z0-9_-]/g, '_');
  const base = path.join(outDir, `erp-${safeDb}-${stamp}`);
  core.log(`yedek başlıyor → ${outDir}`, { host: target.host, db: target.database, offsite, encrypted: Boolean(passphrase) });

  const pgDump = core.resolveTool('pg_dump');
  if (!pgDump) {
    if (requirePgDump) {
      throw new Error('pg_dump bulunamadı. postgresql-client kurun veya PG_DUMP_PATH / PG_BIN_DIR verin (Docker imajında hazır).');
    }
    const nodeSql = `${base}-node.sql`;
    core.log('pg_dump yok — Node ile veri-only SQL yedeği alınıyor (yalnız yerel geliştirme).');
    await nodeSqlBackup(target, nodeSql);
    return { ok: true, mode: 'node-sql', files: [nodeSql], database: target.database, duration_ms: Date.now() - started };
  }

  const pgRestore = core.resolveTool('pg_restore');
  const env = libpqEnv(target);
  const client = await core.connect(target);
  let snapshot = null;
  let stats;
  const dumpFile = `${base}.dump`;
  try {
    const dumpMajor = core.toolMajor(pgDump);
    const serverMajor = Number(String((await client.query('SHOW server_version')).rows[0].server_version).split('.')[0]);
    if (dumpMajor && serverMajor && dumpMajor < serverMajor) {
      throw new Error(`pg_dump ${dumpMajor} < sunucu ${serverMajor}: aynı veya daha yeni pg_dump gerekir (PG_DUMP_PATH).`);
    }
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      snapshot = (await client.query('SELECT pg_export_snapshot() AS s')).rows[0].s;
    } catch (err) {
      core.log(`pg_export_snapshot kullanılamadı (pooler/standby?): ${err.message} — satır sayıları yaklaşık olacak`);
      await client.query('ROLLBACK');
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    }
    stats = await core.collectStats(client, rowMode);
    stats.consistent_snapshot = Boolean(snapshot);
    if (!snapshot && stats.row_count_mode === 'exact') stats.row_count_mode = 'approximate';

    const dumpArgs = ['--format=custom', '--no-owner', '--no-acl', `--file=${dumpFile}`];
    if (snapshot) dumpArgs.push(`--snapshot=${snapshot}`);
    if (process.env.BACKUP_PG_DUMP_EXTRA) dumpArgs.push(...process.env.BACKUP_PG_DUMP_EXTRA.split(/\s+/).filter(Boolean));
    core.log(`pg_dump: ${pgDump}`);
    await core.runTool(pgDump, dumpArgs, { env });
    if (flag('plain')) {
      const plainArgs = ['--format=plain', '--no-owner', '--no-acl', `--file=${base}.sql`];
      if (snapshot) plainArgs.push(`--snapshot=${snapshot}`);
      await core.runTool(pgDump, plainArgs, { env });
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    fs.rmSync(dumpFile, { force: true });
    throw err;
  } finally {
    await client.end().catch(() => {});
  }

  if (pgRestore) {
    await core.runTool(pgRestore, ['--list', dumpFile], { env: process.env, quiet: true })
      .catch((err) => { throw new Error(`Arşiv doğrulaması (pg_restore --list) başarısız: ${err.message}`); });
  }
  const dumpSha = await fileSha256(dumpFile);
  const dumpSize = fs.statSync(dumpFile).size;

  let artifact = dumpFile;
  let artifactSha = dumpSha;
  if (passphrase) {
    artifact = `${dumpFile}.enc`;
    await encryptFile(dumpFile, artifact, passphrase);
    fs.rmSync(dumpFile);
    artifactSha = await fileSha256(artifact);
  }
  fs.chmodSync(artifact, 0o600);

  const manifest = {
    format: 'ktb-erp-backup/1',
    created_at: new Date().toISOString(),
    artifact: path.basename(artifact),
    artifact_sha256: artifactSha,
    artifact_size_bytes: fs.statSync(artifact).size,
    dump_sha256: dumpSha,
    dump_size_bytes: dumpSize,
    dump_format: 'custom',
    encrypted: Boolean(passphrase),
    encryption: passphrase ? 'aes-256-gcm/scrypt (KTBENC1)' : null,
    pg_dump_major: core.toolMajor(pgDump),
    source: { host: target.host, port: target.port, database: target.database },
    code_migrations: core.migrationFiles().length,
    git_commit: process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || process.env.GIT_COMMIT || null,
    stats,
  };
  const manifestFile = core.manifestPathFor(artifact);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

  const files = [artifact, manifestFile];
  if (flag('plain') && fs.existsSync(`${base}.sql`)) files.push(`${base}.sql`);

  let offsiteResult = { mode: 'none' };
  if (offsite !== 'none') {
    offsiteResult = await core.uploadOffsite([artifact, manifestFile]);
    if (offsite === 's3') {
      await core.pruneS3(Number(process.env.BACKUP_S3_RETENTION_DAYS || 0));
    }
  }
  core.pruneLocal(outDir, Number(process.env.BACKUP_RETENTION_DAYS ?? 14));

  return {
    ok: true,
    mode: 'pg_dump',
    database: target.database,
    files,
    size_bytes: manifest.artifact_size_bytes,
    sha256: artifactSha,
    encrypted: manifest.encrypted,
    consistent_snapshot: stats.consistent_snapshot,
    tables: stats.table_count,
    migrations: stats.migrations,
    offsite: offsiteResult,
    duration_ms: Date.now() - started,
  };
}

main()
  .then(async (summary) => {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    await core.notify('yedek', summary);
  })
  .catch(async (err) => {
    const summary = { ok: false, error: err.message };
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    core.log(`HATA: ${err.message}`);
    await core.notify('yedek', summary);
    process.exit(1);
  });
