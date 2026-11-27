/**
 * Geri yükleme çekirdeği (db-restore.js ve db-restore-drill.js ortak).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('./backupCore');
const { withDatabase, libpqEnv } = require('./dbConn');
const { decryptFile, isEncrypted, passphraseFromEnv } = require('./backupCrypto');
const { fileSha256 } = require('./s3Lite');

/** 'local:latest', 's3:latest', 's3:<anahtar>' veya dosya yolu → yerel artefakt + manifest. */
async function fetchArtifact(source, { backupDir, workDir }) {
  if (!source || source === 'local:latest') {
    const latest = core.latestLocalBackup(backupDir);
    if (!latest) throw new Error(`${backupDir} içinde yedek yok.`);
    source = latest;
  }
  if (source.startsWith('s3:')) {
    return core.downloadFromS3(source.slice(3) || 'latest', workDir);
  }
  const artifact = path.resolve(source);
  if (!fs.existsSync(artifact)) throw new Error(`Yedek dosyası yok: ${artifact}`);
  const m = core.manifestPathFor(artifact);
  return { artifact, manifest: fs.existsSync(m) ? m : null };
}

/** SHA-256 doğrular, gerekirse şifre çözer; pg_restore'a verilecek düz dosyayı döner. */
async function prepareArtifact({ artifact, manifest }, workDir) {
  const man = manifest ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : null;
  if (man?.artifact_sha256) {
    const sha = await fileSha256(artifact);
    if (sha !== man.artifact_sha256) {
      throw new Error(`SHA-256 uyuşmuyor: ${path.basename(artifact)} bozuk veya değiştirilmiş.`);
    }
    core.log('sha256 doğrulandı', { artifact: path.basename(artifact) });
  } else {
    core.log('UYARI: manifest yok — bütünlük (sha256) ve satır sayısı doğrulaması yapılamayacak.');
  }
  let plain = artifact;
  let tempPlain = null;
  if (artifact.endsWith('.enc') || isEncrypted(artifact)) {
    const pass = passphraseFromEnv();
    if (!pass) throw new Error('Yedek şifreli: BACKUP_ENCRYPTION_PASSPHRASE gerekli.');
    fs.mkdirSync(workDir, { recursive: true });
    tempPlain = path.join(workDir, path.basename(artifact).replace(/\.enc$/, ''));
    await decryptFile(artifact, tempPlain, pass);
    if (man?.dump_sha256 && (await fileSha256(tempPlain)) !== man.dump_sha256) {
      throw new Error('Şifre çözülen dump SHA-256 manifest ile uyuşmuyor.');
    }
    plain = tempPlain;
    core.log('şifre çözüldü');
  }
  return { plain, tempPlain, manifest: man };
}

async function databaseExists(adminTarget, dbName) {
  const c = await core.connect(adminTarget);
  try {
    return (await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])).rowCount > 0;
  } finally {
    await c.end();
  }
}

async function createDatabase(adminTarget, dbName, { dropIfExists = false } = {}) {
  const c = await core.connect(adminTarget);
  try {
    const exists = (await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])).rowCount > 0;
    if (exists && !dropIfExists) throw new Error(`"${dbName}" zaten var (--drop-existing ile silinip yeniden oluşturulur).`);
    if (exists) {
      await c.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [dbName]);
      await c.query(`DROP DATABASE ${core.qIdent(dbName)}`);
    }
    await c.query(`CREATE DATABASE ${core.qIdent(dbName)} ENCODING 'UTF8' TEMPLATE template0`);
  } finally {
    await c.end();
  }
}

async function dropDatabase(adminTarget, dbName) {
  const c = await core.connect(adminTarget);
  try {
    await c.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [dbName]);
    await c.query(`DROP DATABASE IF EXISTS ${core.qIdent(dbName)}`);
  } finally {
    await c.end();
  }
}

/** Düz (şifresiz) dump/sql dosyasını hedef DB'ye yükler. */
async function restoreInto(plainFile, target, { clean = false, jobs = 1 } = {}) {
  const env = libpqEnv(target);
  if (/\.sql$/.test(plainFile)) {
    const psql = core.resolveTool('psql');
    if (!psql) throw new Error('psql bulunamadı (postgresql-client).');
    await core.runTool(psql, ['-v', 'ON_ERROR_STOP=1', '-q', '-f', plainFile], { env, quiet: true });
    return;
  }
  const pgRestore = core.resolveTool('pg_restore');
  if (!pgRestore) throw new Error('pg_restore bulunamadı (postgresql-client).');
  const args = ['--no-owner', '--no-acl', '--exit-on-error', `--dbname=${target.database}`];
  if (clean) args.push('--clean', '--if-exists');
  if (jobs > 1) args.push(`--jobs=${jobs}`);
  else args.push('--single-transaction');
  args.push(plainFile);
  await core.runTool(pgRestore, args, { env });
}

async function verifyRestored(target, manifest, { exact = true } = {}) {
  const c = await core.connect(target);
  try {
    const mode = manifest?.stats?.row_count_mode === 'estimate' ? 'off' : 'exact';
    const actual = await core.collectStats(c, mode);
    const extra = await core.postRestoreChecks(c);
    const cmp = manifest?.stats
      ? core.compareStats(manifest.stats, actual, { exact: exact && manifest.stats.row_count_mode === 'exact' })
      : { ok: true, problems: [], warnings: ['manifest yok — karşılaştırma atlandı'] };
    if (extra.invalid_indexes.length) cmp.problems.push(`geçersiz index: ${extra.invalid_indexes.join(', ')}`);
    if (extra.unvalidated_constraints.length) cmp.warnings.push(`doğrulanmamış kısıt: ${extra.unvalidated_constraints.join(', ')}`);
    cmp.ok = cmp.problems.length === 0;
    return { ...cmp, actual: { migrations: actual.migrations, table_count: actual.table_count, size_bytes: actual.database_size_bytes }, extra };
  } finally {
    await c.end();
  }
}

function tmpWorkDir(prefix = 'ktb-erp-restore-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

module.exports = {
  fetchArtifact,
  prepareArtifact,
  databaseExists,
  createDatabase,
  dropDatabase,
  restoreInto,
  verifyRestored,
  tmpWorkDir,
  withDatabase,
};
