#!/usr/bin/env node
/**
 * Yedekten geri yükleme (db-backup.js çıktısı: .dump / .dump.enc / .sql).
 *
 *   node scripts/db-restore.js <kaynak> --target-url <postgresql://…/yeni_db> [--create] [--drop-existing]
 *
 * Kaynak: dosya yolu | local:latest | s3:latest | s3:<anahtar>
 * Hedef:  --target-url veya RESTORE_TARGET_URL. Uygulamanın DATABASE_URL'ine
 *         varsayılan olarak ASLA yazılmaz.
 *
 * Seçenekler:
 *   --create              hedef DB'yi oluştur (aynı sunucudaki 'postgres' DB'si üzerinden)
 *   --drop-existing       --create ile: varsa önce sil
 *   --clean               mevcut nesneleri silip yükle (pg_restore --clean --if-exists)
 *   --jobs=N              paralel pg_restore (tek işlem garantisi kalkar)
 *   --allow-source-overwrite --yes   hedef = uygulama DB'si ise zorunlu (yerinde geri dönüş)
 *   --no-verify           manifest karşılaştırmasını atla
 *
 * Tavsiye edilen geri dönüş: yeni DB'ye yükle → doğrula → DATABASE_URL'i çevir
 * (bkz. docs/go-live/YEDEKLEME_GERI_DONUS_RUNBOOK.md).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { resolveTarget, sameDatabase } = require('./lib/dbConn');
const core = require('./lib/backupCore');
const rc = require('./lib/restoreCore');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const i = args.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (i < 0) return null;
  return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1];
};
const valueFlags = new Set(['--target-url', '--jobs', '--backup-dir']);
const positional = args.filter((a, i) => !a.startsWith('--') && !valueFlags.has(args[i - 1]));

async function main() {
  const started = Date.now();
  const targetUrl = opt('target-url') || process.env.RESTORE_TARGET_URL;
  if (!targetUrl) throw new Error('Hedef gerekli: --target-url postgresql://…/db veya RESTORE_TARGET_URL.');
  const target = resolveTarget(targetUrl);

  let appDb = null;
  try { appDb = resolveTarget(null); } catch (_) { /* .env yok */ }
  if (appDb && sameDatabase(appDb, target)) {
    if (!(flag('allow-source-overwrite') && flag('yes'))) {
      throw new Error(
        `Hedef (${target.host}/${target.database}) uygulamanın kendi veritabanı. Yerinde geri yükleme için `
        + '--allow-source-overwrite --yes verin (önce mevcut durumun yedeğini alın!).'
      );
    }
    core.log('UYARI: uygulama veritabanının ÜZERİNE geri yükleniyor (--allow-source-overwrite).');
  }

  const backupDir = path.resolve(opt('backup-dir') || process.env.BACKUP_DIR || path.join(core.ROOT, 'backups'));
  const work = rc.tmpWorkDir();
  try {
    const fetched = await rc.fetchArtifact(positional[0] || 'local:latest', { backupDir, workDir: work });
    core.log(`kaynak: ${fetched.artifact}`);
    const prepared = await rc.prepareArtifact(fetched, work);

    if (flag('create')) {
      await rc.createDatabase(rc.withDatabase(target, process.env.RESTORE_ADMIN_DB || 'postgres'), target.database, {
        dropIfExists: flag('drop-existing'),
      });
      core.log(`hedef DB oluşturuldu: ${target.database}`);
    }
    const t0 = Date.now();
    await rc.restoreInto(prepared.plain, target, {
      clean: flag('clean') || flag('allow-source-overwrite'),
      jobs: Number(opt('jobs') || 1),
    });
    const restoreMs = Date.now() - t0;
    core.log(`geri yükleme tamam (${restoreMs} ms)`);

    let verify = null;
    if (!flag('no-verify')) {
      verify = await rc.verifyRestored(target, prepared.manifest);
      verify.warnings.forEach((w) => core.log(`uyarı: ${w}`));
      verify.problems.forEach((p) => core.log(`SORUN: ${p}`));
    }
    if (prepared.tempPlain) fs.rmSync(prepared.tempPlain, { force: true });
    return {
      ok: verify ? verify.ok : true,
      target: { host: target.host, database: target.database },
      artifact: path.basename(fetched.artifact),
      backup_created_at: prepared.manifest?.created_at || null,
      restore_ms: restoreMs,
      duration_ms: Date.now() - started,
      verify,
    };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

main()
  .then(async (summary) => {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    await core.notify('geri-yukleme', { ...summary, database: summary.target.database });
    if (!summary.ok) process.exit(2);
  })
  .catch(async (err) => {
    process.stdout.write(`${JSON.stringify({ ok: false, error: err.message })}\n`);
    core.log(`HATA: ${err.message}`);
    await core.notify('geri-yukleme', { ok: false, error: err.message });
    process.exit(1);
  });
