const fs = require('fs');
const path = require('path');
const { getConfig } = require('../util/config');
const { run } = require('../util/run');
const { resolvePgDump } = require('../util/pgdump');
const { nodeSqlBackup } = require('../util/nodeBackup');
const logger = require('../util/logger');

function assertErpRoot(cfg) {
  if (!cfg.erpRoot) {
    throw new Error('ERP_ROOT / config.erpRoot tanımlı değil. Kurulum scriptini çalıştırın.');
  }
  if (!fs.existsSync(cfg.erpRoot)) {
    throw new Error(`ERP klasörü bulunamadı: ${cfg.erpRoot}`);
  }
  if (!fs.existsSync(path.join(cfg.erpRoot, 'package.json'))) {
    throw new Error(`Geçersiz ERP klasörü (package.json yok): ${cfg.erpRoot}`);
  }
}

function npmCmd() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function gitCmd() {
  return 'git';
}

async function stepGitPull(cfg) {
  const gitDir = path.join(cfg.erpRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    logger.append({ level: 'warn', message: 'Git deposu yok — git pull atlandı' });
    return { skipped: true, reason: 'not-a-git-repo' };
  }
  run(gitCmd(), ['fetch', 'origin'], { cwd: cfg.erpRoot, label: 'git fetch' });
  run(gitCmd(), ['pull', '--ff-only'], { cwd: cfg.erpRoot, label: 'git pull' });
  return { ok: true };
}

async function stepNpmInstall(cfg) {
  // --no-audit/--no-fund: Windows'ta senkronu yarıda kesen uyarı/exit gürültüsünü azaltır
  run(npmCmd(), ['install', '--no-audit', '--no-fund'], {
    cwd: cfg.erpRoot,
    label: 'npm install',
    shell: process.platform === 'win32',
  });
  return { ok: true };
}

async function stepMigrate(cfg) {
  const pkg = JSON.parse(fs.readFileSync(path.join(cfg.erpRoot, 'package.json'), 'utf8'));
  if (!pkg.scripts || !pkg.scripts.migrate) {
    throw new Error('ERP package.json içinde "migrate" script yok — yanlış klasör/branch olabilir.');
  }
  run(npmCmd(), ['run', 'migrate'], {
    cwd: cfg.erpRoot,
    label: 'npm run migrate',
    shell: process.platform === 'win32',
  });
  return { ok: true };
}

function stampNow() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z')
    .slice(0, 13);
}

async function stepBackupPgDump(cfg, pgDump) {
  fs.mkdirSync(cfg.backupDir, { recursive: true });
  const stamp = stampNow();
  const base = path.join(cfg.backupDir, `erp-${stamp}`);
  const dumpFile = `${base}.dump`;
  const sqlFile = `${base}.sql`;
  const env = { ...process.env, PGPASSWORD: cfg.db.password || '' };
  const common = [
    '-h', String(cfg.db.host),
    '-p', String(cfg.db.port),
    '-U', String(cfg.db.user),
    '-d', String(cfg.db.database),
  ];

  run(pgDump, [...common, '--format=custom', '--file', dumpFile], {
    label: 'pg_dump custom',
    env,
  });
  run(pgDump, [...common, '--format=plain', '--no-owner', '--no-acl', '--file', sqlFile], {
    label: 'pg_dump plain',
    env,
  });

  return { ok: true, method: 'pg_dump', dumpFile, sqlFile, pgDump };
}

async function stepBackupNode(cfg) {
  fs.mkdirSync(cfg.backupDir, { recursive: true });
  const stamp = stampNow();
  const sqlFile = path.join(cfg.backupDir, `erp-${stamp}-node.sql`);
  logger.append({
    level: 'warn',
    message: 'pg_dump yok — Node SQL yedek alternatifine geçiliyor',
  });
  const result = await nodeSqlBackup({
    db: cfg.db,
    sqlFile,
    erpRoot: cfg.erpRoot,
  });
  // küçük işaret dosyası: custom dump yok
  const note = path.join(cfg.backupDir, `erp-${stamp}-node.txt`);
  fs.writeFileSync(
    note,
    [
      'Bu yedek pg_dump olmadan Node ile alındı.',
      'Geri yükleme: psql -f dosya.sql  (veya pgAdmin Query Tool).',
      `SQL: ${sqlFile}`,
      `Boyut: ${result.bytes} bayt`,
    ].join('\n'),
    'utf8'
  );
  return { ...result, noteFile: note };
}

async function stepBackup(cfg) {
  fs.mkdirSync(cfg.backupDir, { recursive: true });
  const pgDump = resolvePgDump(cfg.pgDumpPath);

  if (pgDump) {
    try {
      return await stepBackupPgDump(cfg, pgDump);
    } catch (err) {
      logger.append({
        level: 'warn',
        message: `pg_dump başarısız, Node yedeğe düşülüyor: ${err.message}`,
      });
    }
  }

  // ERP npm run db:backup (gelişmiş script varsa)
  const backupJs = path.join(cfg.erpRoot, 'scripts', 'db-backup.js');
  if (fs.existsSync(backupJs)) {
    try {
      run(process.execPath, [backupJs], {
        cwd: cfg.erpRoot,
        label: 'node scripts/db-backup.js',
        env: {
          ...process.env,
          DB_HOST: String(cfg.db.host),
          DB_PORT: String(cfg.db.port),
          DB_USER: String(cfg.db.user),
          DB_NAME: String(cfg.db.database),
          DB_PASSWORD: String(cfg.db.password || ''),
          PG_DUMP_PATH: cfg.pgDumpPath || '',
          BACKUP_DIR: cfg.backupDir,
        },
      });
      return { ok: true, method: 'erp-db-backup-script', backupDir: cfg.backupDir };
    } catch (err) {
      logger.append({
        level: 'warn',
        message: `ERP db-backup script başarısız: ${err.message}`,
      });
    }
  }

  return stepBackupNode(cfg);
}

async function runSync(opts = {}) {
  const cfg = getConfig();
  assertErpRoot(cfg);
  const steps = { ...cfg.steps, ...(opts.steps || {}) };
  const started = Date.now();
  logger.append({ level: 'info', message: 'Senkron başladı', erpRoot: cfg.erpRoot });

  const result = { ok: true, steps: {}, erpRoot: cfg.erpRoot, startedAt: new Date().toISOString() };

  try {
    if (steps.gitPull !== false) {
      result.steps.gitPull = await stepGitPull(cfg);
      logger.append({ level: 'info', message: 'Adım tamam: git' });
    }
    if (steps.npmInstall !== false) {
      result.steps.npmInstall = await stepNpmInstall(cfg);
      logger.append({ level: 'info', message: 'Adım tamam: npm install' });
    }
    if (steps.migrate !== false) {
      result.steps.migrate = await stepMigrate(cfg);
      logger.append({ level: 'info', message: 'Adım tamam: migrate' });
    }
    if (steps.backup !== false) {
      result.steps.backup = await stepBackup(cfg);
      const method = result.steps.backup?.method || 'yedek';
      logger.append({ level: 'info', message: `Adım tamam: yedek (${method})` });
    }
    result.ms = Date.now() - started;
    logger.append({ level: 'info', message: `Senkron tamam (${result.ms} ms)` });
    return result;
  } catch (err) {
    result.ok = false;
    result.error = err.message || String(err);
    result.ms = Date.now() - started;
    logger.append({ level: 'error', message: result.error });
    throw err;
  }
}

async function getStatus() {
  const cfg = getConfig();
  const pgDump = resolvePgDump(cfg.pgDumpPath);
  const erpOk = Boolean(cfg.erpRoot && fs.existsSync(cfg.erpRoot));
  const gitOk = Boolean(erpOk && fs.existsSync(path.join(cfg.erpRoot, '.git')));
  let migrateScript = false;
  let backupScript = false;
  let pgModule = false;
  if (erpOk) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(cfg.erpRoot, 'package.json'), 'utf8'));
      migrateScript = Boolean(pkg.scripts?.migrate);
      backupScript = Boolean(pkg.scripts?.['db:backup']);
    } catch { /* ignore */ }
    pgModule = fs.existsSync(path.join(cfg.erpRoot, 'node_modules', 'pg'));
  }
  try {
    require.resolve('pg');
    pgModule = true;
  } catch { /* ignore */ }

  return {
    erpRoot: cfg.erpRoot || null,
    erpOk,
    gitOk,
    migrateScript,
    backupScript,
    pgDump,
    pgDumpOk: Boolean(pgDump),
    nodeBackupOk: pgModule,
    backupDir: cfg.backupDir,
    schedule: cfg.schedule,
    db: {
      host: cfg.db.host,
      port: cfg.db.port,
      user: cfg.db.user,
      database: cfg.db.database,
      passwordSet: Boolean(cfg.db.password),
    },
    port: cfg.port,
  };
}

module.exports = {
  runSync,
  stepBackup,
  stepMigrate,
  stepGitPull,
  stepNpmInstall,
  getStatus,
  assertErpRoot,
};
