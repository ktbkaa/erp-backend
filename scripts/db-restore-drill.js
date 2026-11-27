#!/usr/bin/env node
/**
 * Geri yükleme tatbikatı (restore drill): yedeğin gerçekten geri dönülebilir
 * olduğunu kanıtlar. Canlı DB'ye dokunmaz; geçici bir DB'ye yükler.
 *
 *   npm run db:drill                          # en yeni yerel yedek
 *   npm run db:drill -- --source s3:latest    # offsite'taki en yeni yedek
 *   npm run db:drill -- --fresh               # önce yeni yedek al (offsite'a yüklemeden)
 *   npm run db:drill -- --with-migrate        # yükleme sonrası db/migrate.js (bekleyen migration provası)
 *   npm run db:drill -- --keep                # geçici DB'yi silme (inceleme için)
 *
 * Tatbikat sunucusu: RESTORE_DRILL_ADMIN_URL (geçici DB burada oluşturulur;
 * varsayılan: uygulama DB'siyle aynı sunucu, 'postgres' bakım DB'si).
 * Canlı sunucuda CREATE DATABASE yetkisi yoksa ayrı bir tatbikat Postgres'i verin.
 *
 * Doğrulama: SHA-256 + şifre çözme, pg_restore (tek işlem, exit-on-error),
 * schema_migrations sayısı/sonu, tüm tabloların satır sayısı (manifest ile birebir),
 * geçersiz index / doğrulanmamış kısıt kontrolü. Rapor: backups/drill-reports/.
 * Çıkış kodu: 0 başarılı, 2 doğrulama hatası, 1 çalışma hatası.
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveTarget, withDatabase, sameDatabase } = require('./lib/dbConn');
const core = require('./lib/backupCore');
const rc = require('./lib/restoreCore');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const i = args.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (i < 0) return null;
  return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1];
};

function freshBackup(backupDir) {
  core.log('--fresh: yeni yedek alınıyor (offsite yok)');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'db-backup.js'), '--no-offsite', `--out=${backupDir}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, BACKUP_NOTIFY_WEBHOOK_URL: '' },
  });
  const last = String(r.stdout || '').trim().split('\n').pop();
  const summary = last ? JSON.parse(last) : null;
  if (r.status !== 0 || !summary?.ok) throw new Error(`yedek alınamadı: ${summary?.error || `exit ${r.status}`}`);
  return summary.files[0];
}

async function main() {
  const t = { start: Date.now() };
  const backupDir = path.resolve(opt('backup-dir') || process.env.BACKUP_DIR || path.join(core.ROOT, 'backups'));
  const reportDir = path.join(backupDir, 'drill-reports');
  const appTarget = resolveTarget(null);
  const adminTarget = process.env.RESTORE_DRILL_ADMIN_URL
    ? resolveTarget(process.env.RESTORE_DRILL_ADMIN_URL)
    : withDatabase(appTarget, 'postgres');
  const drillDb = `erp_restore_drill_${core.stampNow().toLowerCase().replace(/[^0-9a-z]/g, '')}`;
  const drillTarget = withDatabase(adminTarget, drillDb);
  if (sameDatabase(drillTarget, appTarget)) throw new Error('Tatbikat DB adı uygulama DB\'siyle çakışıyor.');

  let source = opt('source') || null;
  if (flag('fresh')) source = freshBackup(backupDir);
  if (!source) source = 'local:latest';

  const work = rc.tmpWorkDir('ktb-erp-drill-');
  const report = {
    ok: false,
    started_at: new Date(t.start).toISOString(),
    source,
    drill_server: { host: adminTarget.host, port: adminTarget.port },
    drill_database: drillDb,
    steps: {},
  };
  let created = false;
  try {
    let s = Date.now();
    const fetched = await rc.fetchArtifact(source, { backupDir, workDir: work });
    report.artifact = path.basename(fetched.artifact);
    report.steps.fetch_ms = Date.now() - s;

    s = Date.now();
    const prepared = await rc.prepareArtifact(fetched, work);
    report.backup_created_at = prepared.manifest?.created_at || null;
    report.backup_age_hours = prepared.manifest?.created_at
      ? Math.round((Date.now() - Date.parse(prepared.manifest.created_at)) / 36e5 * 10) / 10
      : null;
    report.steps.verify_artifact_ms = Date.now() - s;

    s = Date.now();
    await rc.createDatabase(adminTarget, drillDb, { dropIfExists: true });
    created = true;
    await rc.restoreInto(prepared.plain, drillTarget);
    report.steps.restore_ms = Date.now() - s;

    s = Date.now();
    const verify = await rc.verifyRestored(drillTarget, prepared.manifest);
    report.steps.verify_db_ms = Date.now() - s;
    report.verify = verify;

    if (flag('with-migrate')) {
      s = Date.now();
      const env = { ...process.env, DATABASE_URL: '', DB_HOST: drillTarget.host, DB_PORT: String(drillTarget.port),
        DB_USER: drillTarget.user, DB_PASSWORD: drillTarget.password, DB_NAME: drillDb };
      const m = spawnSync(process.execPath, [path.join(core.ROOT, 'db', 'migrate.js')], { encoding: 'utf8', env });
      const applied = (String(m.stdout).match(/^Tamam: /gm) || []).length;
      report.migrate = { ok: m.status === 0, applied_pending: applied, ms: Date.now() - s };
      if (m.status !== 0) verify.problems.push(`migrate.js başarısız: ${String(m.stderr || m.stdout).trim().split('\n').pop()}`);
    }
    if (prepared.tempPlain) fs.rmSync(prepared.tempPlain, { force: true });

    const maxAge = Number(process.env.RESTORE_DRILL_MAX_BACKUP_AGE_HOURS || 0);
    if (maxAge > 0 && report.backup_age_hours != null && report.backup_age_hours > maxAge) {
      verify.problems.push(`yedek ${report.backup_age_hours} saat eski (> ${maxAge} saat RPO hedefi)`);
    }
    report.ok = verify.problems.length === 0;
  } catch (err) {
    report.error = err.message;
  } finally {
    if (created && !flag('keep')) {
      await rc.dropDatabase(adminTarget, drillDb).catch((err) => core.log(`geçici DB silinemedi: ${err.message}`));
    } else if (created) {
      report.kept = true;
    }
    fs.rmSync(work, { recursive: true, force: true });
  }
  report.duration_ms = Date.now() - t.start;
  report.rto_estimate_s = Math.round(((report.steps.fetch_ms || 0) + (report.steps.verify_artifact_ms || 0) + (report.steps.restore_ms || 0)) / 1000);

  fs.mkdirSync(reportDir, { recursive: true });
  const file = path.join(reportDir, `drill-${core.stampNow()}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  report.report_file = file;
  return report;
}

main()
  .then(async (r) => {
    process.stdout.write(`${JSON.stringify({
      ok: r.ok,
      artifact: r.artifact,
      backup_created_at: r.backup_created_at,
      tables_checked: r.verify?.tables_checked,
      rows_expected: r.verify?.rows_expected,
      rows_actual: r.verify?.rows_actual,
      problems: r.verify?.problems,
      warnings: r.verify?.warnings,
      migrate: r.migrate,
      error: r.error,
      rto_estimate_s: r.rto_estimate_s,
      duration_ms: r.duration_ms,
      report_file: r.report_file,
    })}\n`);
    await core.notify('geri-yukleme-tatbikati', { ok: r.ok, error: r.error || (r.verify?.problems || []).join('; ') || undefined });
    if (r.error) process.exit(1);
    if (!r.ok) process.exit(2);
  })
  .catch(async (err) => {
    process.stdout.write(`${JSON.stringify({ ok: false, error: err.message })}\n`);
    await core.notify('geri-yukleme-tatbikati', { ok: false, error: err.message });
    process.exit(1);
  });
