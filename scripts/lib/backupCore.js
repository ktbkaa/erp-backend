/**
 * Yedek / geri yükleme / tatbikat script'lerinin ortak çekirdeği.
 */
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { pgClientConfig, libpqEnv } = require('./dbConn');
const s3 = require('./s3Lite');
const { isDemoSeedEnabled, isDemoSeedMigration } = require('../../src/bootstrap/demoSeedPolicy');

const ROOT = path.join(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'db', 'migrations');

function log(msg, fields) {
  const line = fields ? `${msg} ${JSON.stringify(fields)}` : msg;
  process.stderr.write(`[${new Date().toISOString()}] ${line}\n`);
}

function stampNow(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

/** pg_dump / pg_restore / psql yolunu bulur (PG_*_PATH, PG_BIN_DIR, PATH, yaygın dizinler). */
function resolveTool(name) {
  const envKey = { pg_dump: 'PG_DUMP_PATH', pg_restore: 'PG_RESTORE_PATH', psql: 'PSQL_PATH' }[name];
  const configured = envKey ? process.env[envKey] : null;
  if (configured && fs.existsSync(configured)) return configured;
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  if (process.env.PG_BIN_DIR) {
    const p = path.join(process.env.PG_BIN_DIR, exe);
    if (fs.existsSync(p)) return p;
  }
  const w = spawnSync(process.platform === 'win32' ? 'where' : 'which', [exe], { encoding: 'utf8', windowsHide: true });
  if (w.status === 0) {
    const line = String(w.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (line && fs.existsSync(line)) return line;
  }
  const roots = process.platform === 'win32'
    ? ['C:\\Program Files\\PostgreSQL', 'C:\\Program Files (x86)\\PostgreSQL', 'C:\\PostgreSQL']
    : ['/usr/lib/postgresql'];
  for (const rootDir of roots) {
    let vers = [];
    try { vers = fs.readdirSync(rootDir); } catch { continue; }
    for (const v of vers.sort((a, b) => Number(b) - Number(a) || b.localeCompare(a))) {
      const candidate = path.join(rootDir, v, 'bin', exe);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  for (const p of [`/usr/bin/${exe}`, `/usr/local/bin/${exe}`, `/opt/homebrew/bin/${exe}`]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function toolMajor(bin) {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8', windowsHide: true });
  const m = String(r.stdout || '').match(/(\d+)(?:\.(\d+))?/);
  return m ? Number(m[1]) : null;
}

/** Komutu çalıştırır; stdout/stderr'i süreç stderr'ine aktarır. */
function runTool(bin, args, { env, input, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stdout.on('data', (d) => { if (!quiet) process.stderr.write(d); });
    child.stderr.on('data', (d) => {
      stderr += d;
      process.stderr.write(d);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(bin)} başarısız (exit ${code}): ${stderr.trim().split('\n').slice(-3).join(' | ')}`));
    });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

function migrationFiles() {
  try {
    // db/migrate.js bayraksız ortamda demo seed migration'larını bilinçli atlar; bekleyen sayılmaz
    return fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .filter((f) => !(isDemoSeedMigration(f) && !isDemoSeedEnabled()))
      .sort();
  } catch (_) {
    return [];
  }
}

async function connect(target) {
  const client = new Client(pgClientConfig(target));
  await client.connect();
  return client;
}

const qIdent = (n) => `"${String(n).replace(/"/g, '""')}"`;

/**
 * Tablo satır sayıları + migration durumu. mode: exact | estimate | off
 * (exact: COUNT(*) — tatbikatta birebir karşılaştırma için).
 */
async function collectStats(client, mode = 'exact') {
  const server = (await client.query('SHOW server_version')).rows[0].server_version;
  const sizeRow = (await client.query('SELECT pg_database_size(current_database())::bigint AS b')).rows[0];
  const tables = (await client.query(`
    SELECT n.nspname AS schema, c.relname AS name, c.reltuples::bigint AS estimate
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
      AND n.nspname NOT LIKE 'pg_toast%' AND NOT c.relispartition
    ORDER BY 1, 2`)).rows;
  const counts = {};
  if (mode !== 'off') {
    for (const t of tables) {
      const key = t.schema === 'public' ? t.name : `${t.schema}.${t.name}`;
      if (mode === 'estimate') counts[key] = Number(t.estimate);
      else {
        const r = await client.query(`SELECT COUNT(*)::bigint AS n FROM ${qIdent(t.schema)}.${qIdent(t.name)}`);
        counts[key] = Number(r.rows[0].n);
      }
    }
  }
  let migrations = { count: 0, last: null };
  try {
    const m = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    migrations = { count: m.rowCount, last: m.rows.length ? m.rows[m.rows.length - 1].filename : null };
  } catch (_) { /* schema_migrations yok */ }
  return {
    server_version: server,
    server_major: Number(String(server).split('.')[0]),
    database_size_bytes: Number(sizeRow.b),
    table_count: tables.length,
    row_count_mode: mode,
    row_counts: counts,
    migrations,
  };
}

/** Manifest'teki istatistiklerle geri yüklenen DB'yi karşılaştırır. */
function compareStats(expected, actual, { exact = true } = {}) {
  const problems = [];
  const warnings = [];
  if (expected.migrations && actual.migrations) {
    if (expected.migrations.count !== actual.migrations.count) {
      problems.push(`schema_migrations sayısı farklı: beklenen ${expected.migrations.count}, gelen ${actual.migrations.count}`);
    }
    if (expected.migrations.last !== actual.migrations.last) {
      problems.push(`son migration farklı: beklenen ${expected.migrations.last}, gelen ${actual.migrations.last}`);
    }
  }
  const exp = expected.row_counts || {};
  const act = actual.row_counts || {};
  const expKeys = Object.keys(exp);
  if (expected.table_count != null && actual.table_count !== expected.table_count) {
    problems.push(`tablo sayısı farklı: beklenen ${expected.table_count}, gelen ${actual.table_count}`);
  }
  let mismatched = 0;
  for (const k of expKeys) {
    if (!(k in act)) {
      problems.push(`tablo eksik: ${k}`);
      continue;
    }
    if (expected.row_count_mode === 'exact' && exp[k] !== act[k]) {
      mismatched += 1;
      const msg = `${k}: beklenen ${exp[k]} satır, gelen ${act[k]}`;
      if (exact) problems.push(msg);
      else warnings.push(msg);
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    warnings,
    tables_checked: expKeys.length,
    rows_expected: expKeys.reduce((s, k) => s + (exp[k] || 0), 0),
    rows_actual: Object.keys(act).reduce((s, k) => s + (act[k] || 0), 0),
    mismatched_tables: mismatched,
  };
}

/** Geri yüklenen DB üzerinde ek sağlık sorguları. */
async function postRestoreChecks(client) {
  const checks = {};
  const notValid = await client.query(
    `SELECT conrelid::regclass::text AS tbl, conname FROM pg_constraint WHERE NOT convalidated`
  );
  checks.unvalidated_constraints = notValid.rows.map((r) => `${r.tbl}.${r.conname}`);
  const invalidIdx = await client.query(
    `SELECT indexrelid::regclass::text AS idx FROM pg_index WHERE NOT indisvalid`
  );
  checks.invalid_indexes = invalidIdx.rows.map((r) => r.idx);
  for (const [k, sql] of Object.entries({
    companies: 'SELECT COUNT(*)::int AS n FROM companies',
    users: 'SELECT COUNT(*)::int AS n FROM users',
  })) {
    try { checks[k] = (await client.query(sql)).rows[0].n; } catch (_) { checks[k] = null; }
  }
  return checks;
}

function manifestPathFor(artifact) {
  return `${artifact.replace(/\.(dump|sql)(\.enc)?$/, '')}.manifest.json`;
}

/* ---------------- offsite ---------------- */

function offsiteMode(env = process.env) {
  const m = String(env.BACKUP_OFFSITE || 'none').toLowerCase();
  if (!['none', 's3', 'rsync', 'command'].includes(m)) {
    throw new Error(`BACKUP_OFFSITE geçersiz: ${m} (none | s3 | rsync | command)`);
  }
  return m;
}

function rsyncSshArgs(env = process.env) {
  const parts = ['ssh', '-o', 'BatchMode=yes', '-o', `StrictHostKeyChecking=${env.BACKUP_RSYNC_STRICT_HOST_KEY || 'accept-new'}`];
  if (env.BACKUP_RSYNC_SSH_KEY) parts.push('-i', env.BACKUP_RSYNC_SSH_KEY);
  if (env.BACKUP_RSYNC_SSH_PORT) parts.push('-p', String(env.BACKUP_RSYNC_SSH_PORT));
  return parts.join(' ');
}

/** Yedek almadan önce offsite ayarlarını doğrular (boşuna pg_dump yapılmasın). */
function validateOffsiteConfig(env = process.env) {
  const mode = offsiteMode(env);
  if (mode === 's3') s3.s3ConfigFromEnv(env);
  if (mode === 'rsync' && !env.BACKUP_RSYNC_TARGET) throw new Error('BACKUP_RSYNC_TARGET tanımlı değil.');
  if (mode === 'command' && !env.BACKUP_OFFSITE_COMMAND) throw new Error('BACKUP_OFFSITE_COMMAND tanımlı değil.');
  return mode;
}

async function uploadOffsite(files, env = process.env) {
  const mode = offsiteMode(env);
  if (mode === 'none') return { mode, uploaded: [] };
  if (mode === 's3') {
    const cfg = s3.s3ConfigFromEnv(env);
    const uploaded = [];
    for (const f of files) {
      const key = `${cfg.prefix}${path.basename(f)}`;
      const ct = f.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      const r = await s3.putFile(cfg, key, f, { contentType: ct });
      uploaded.push({ key: r.key, size: r.size });
      log(`offsite s3 yüklendi: s3://${cfg.bucket}/${r.key}`, { size: r.size });
    }
    return { mode, bucket: cfg.bucket, uploaded };
  }
  if (mode === 'rsync') {
    const target = env.BACKUP_RSYNC_TARGET;
    if (!target) throw new Error('BACKUP_RSYNC_TARGET tanımlı değil (ör. backup@yedek.example.com:/srv/erp-backups/).');
    const bin = resolveTool('rsync') || 'rsync';
    const args = ['-a', '--partial', '--chmod=F600'];
    if (/^[^/]*:/.test(target) && !/^rsync:\/\//.test(target)) args.push('-e', rsyncSshArgs(env));
    if (env.BACKUP_RSYNC_OPTS) args.push(...env.BACKUP_RSYNC_OPTS.split(/\s+/).filter(Boolean));
    args.push(...files, target);
    await runTool(bin, args, { env });
    log(`offsite rsync tamam → ${target}`);
    return { mode, target, uploaded: files.map((f) => path.basename(f)) };
  }
  const cmd = env.BACKUP_OFFSITE_COMMAND;
  if (!cmd) throw new Error('BACKUP_OFFSITE_COMMAND tanımlı değil (ör. rclone copy "$BACKUP_FILE" remote:erp-backups/).');
  for (const f of files) {
    await runTool('/bin/sh', ['-c', cmd], { env: { ...env, BACKUP_FILE: f } });
  }
  log('offsite komut tamam');
  return { mode, uploaded: files.map((f) => path.basename(f)) };
}

/** S3'teki en yeni yedeği (manifest ile birlikte) indirir. key: 'latest' veya tam anahtar. */
async function downloadFromS3(keyOrLatest, destDir, env = process.env) {
  const cfg = s3.s3ConfigFromEnv(env);
  let artifactKey = keyOrLatest;
  if (!keyOrLatest || keyOrLatest === 'latest') {
    const objs = await s3.list(cfg, cfg.prefix);
    const artifacts = objs
      .map((o) => o.key)
      .filter((k) => /\/?erp-[^/]+\.(dump|sql)(\.enc)?$/.test(k))
      .sort();
    if (!artifacts.length) throw new Error(`s3://${cfg.bucket}/${cfg.prefix} altında yedek bulunamadı.`);
    artifactKey = artifacts[artifacts.length - 1];
  }
  fs.mkdirSync(destDir, { recursive: true });
  const local = path.join(destDir, path.basename(artifactKey));
  log(`s3 indiriliyor: s3://${cfg.bucket}/${artifactKey}`);
  await s3.getToFile(cfg, artifactKey, local);
  const mKey = manifestPathFor(artifactKey);
  const mLocal = manifestPathFor(local);
  try {
    await s3.getToFile(cfg, mKey, mLocal);
  } catch (err) {
    log(`manifest indirilemedi (${mKey}): ${err.message}`);
  }
  return { artifact: local, manifest: fs.existsSync(mLocal) ? mLocal : null, key: artifactKey };
}

async function pruneS3(retentionDays, env = process.env) {
  if (!retentionDays || retentionDays <= 0) return { deleted: [] };
  const cfg = s3.s3ConfigFromEnv(env);
  const cutoff = Date.now() - retentionDays * 86400000;
  const minKeep = Math.max(1, Number(env.BACKUP_S3_MIN_KEEP || 3));
  const objs = await s3.list(cfg, cfg.prefix);
  const artifacts = objs.map((o) => o.key).filter((k) => /\/?erp-[^/]+\.(dump|sql)(\.enc)?$/.test(k)).sort();
  const protectedKeys = new Set();
  for (const k of artifacts.slice(-minKeep)) {
    protectedKeys.add(k);
    protectedKeys.add(manifestPathFor(k));
  }
  const deleted = [];
  for (const o of objs) {
    if (protectedKeys.has(o.key)) continue;
    if (!/\/?erp-[^/]+\.(dump|sql|dump\.enc|sql\.enc|manifest\.json)$/.test(o.key)) continue;
    if (o.lastModified && new Date(o.lastModified).getTime() < cutoff) {
      await s3.remove(cfg, o.key);
      deleted.push(o.key);
    }
  }
  if (deleted.length) log(`s3 saklama: ${deleted.length} eski nesne silindi (> ${retentionDays} gün)`);
  return { deleted };
}

function pruneLocal(dir, retentionDays) {
  if (!retentionDays || retentionDays <= 0 || !fs.existsSync(dir)) return { deleted: [] };
  const cutoff = Date.now() - retentionDays * 86400000;
  const deleted = [];
  for (const name of fs.readdirSync(dir)) {
    if (!/^erp-.*\.(dump|sql|enc|json)$/.test(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isFile() && st.mtimeMs < cutoff) {
      fs.rmSync(full);
      deleted.push(name);
    }
  }
  if (deleted.length) log(`yerel saklama: ${deleted.length} eski dosya silindi (> ${retentionDays} gün)`);
  return { deleted };
}

function latestLocalBackup(dir) {
  if (!fs.existsSync(dir)) return null;
  const names = fs.readdirSync(dir).filter((n) => /^erp-.*\.(dump|sql)(\.enc)?$/.test(n) && !/-node\.sql$/.test(n)).sort();
  return names.length ? path.join(dir, names[names.length - 1]) : null;
}

/** Slack/Teams/genel webhook bildirimi (opsiyonel). */
async function notify(event, payload, env = process.env) {
  const url = env.BACKUP_NOTIFY_WEBHOOK_URL;
  if (!url) return;
  if (payload.ok && env.BACKUP_NOTIFY_ON_SUCCESS !== '1') return;
  const text = `${payload.ok ? '✅' : '❌'} KTB ERP ${event} ${payload.ok ? 'başarılı' : 'BAŞARISIZ'}`
    + `${payload.database ? ` · db=${payload.database}` : ''}${payload.error ? ` · ${payload.error}` : ''}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, event, ...payload }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    log(`bildirim gönderilemedi: ${err.message}`);
  }
}

module.exports = {
  ROOT,
  log,
  stampNow,
  resolveTool,
  toolMajor,
  runTool,
  migrationFiles,
  connect,
  collectStats,
  compareStats,
  postRestoreChecks,
  manifestPathFor,
  offsiteMode,
  validateOffsiteConfig,
  uploadOffsite,
  downloadFromS3,
  pruneS3,
  pruneLocal,
  latestLocalBackup,
  notify,
  libpqEnv,
  qIdent,
};
