#!/usr/bin/env node
/**
 * Deploy ön adımı: (gerekirse) yedek → migration. Uygulama başlamadan önce
 * bir kez çalışır (Render preDeployCommand, docker compose "migrate" servisi, CI/CD).
 *
 *   node scripts/predeploy.js
 *
 * PREDEPLOY_BACKUP  pending (varsayılan) | always | never
 *   pending: bekleyen migration varsa önce db-backup.js (BACKUP_OFFSITE ayarına göre offsite dahil)
 * PREDEPLOY_BACKUP_REQUIRED  1 (varsayılan) | 0 — yedek başarısızsa migration'ı DURDUR
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');
const { resolveTarget } = require('./lib/dbConn');
const core = require('./lib/backupCore');

function run(script, extra = []) {
  const r = spawnSync(process.execPath, [path.join(core.ROOT, script), ...extra], { stdio: 'inherit', env: process.env });
  return r.status === 0;
}

async function pendingMigrations() {
  const files = core.migrationFiles();
  const client = await core.connect(resolveTarget(null));
  try {
    const exists = (await client.query("SELECT to_regclass('public.schema_migrations') AS t")).rows[0].t;
    if (!exists) return files;
    const applied = new Set((await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename));
    return files.filter((f) => !applied.has(f));
  } finally {
    await client.end();
  }
}

async function main() {
  const mode = String(process.env.PREDEPLOY_BACKUP || 'pending').toLowerCase();
  const required = process.env.PREDEPLOY_BACKUP_REQUIRED !== '0';
  const pending = await pendingMigrations();
  core.log(`predeploy: bekleyen migration ${pending.length}`, pending.length ? { ilk: pending[0], son: pending[pending.length - 1] } : undefined);

  const fresh = pending.length === core.migrationFiles().length;
  const wantBackup = mode === 'always' || (mode === 'pending' && pending.length > 0 && !fresh);
  if (wantBackup) {
    core.log('predeploy: migration öncesi yedek alınıyor');
    if (!run('scripts/db-backup.js')) {
      if (required) {
        core.log('predeploy: YEDEK BAŞARISIZ — migration ve deploy durduruldu (PREDEPLOY_BACKUP_REQUIRED=0 ile atlanabilir).');
        process.exit(1);
      }
      core.log('predeploy: yedek başarısız, PREDEPLOY_BACKUP_REQUIRED=0 olduğu için devam ediliyor.');
    }
  }
  if (!pending.length) {
    core.log('predeploy: şema güncel, migration yok.');
    return;
  }
  if (!run('db/migrate.js')) {
    core.log('predeploy: MIGRATION BAŞARISIZ — deploy durduruldu. Geri dönüş: docs/go-live/YEDEKLEME_GERI_DONUS_RUNBOOK.md');
    process.exit(1);
  }
  core.log('predeploy: tamam');
}

main().catch((err) => {
  core.log(`predeploy HATA: ${err.message}`);
  process.exit(1);
});
