#!/usr/bin/env node
const { runSync, stepBackup, stepMigrate, getStatus } = require('./jobs/sync');
const logger = require('./util/logger');

async function main() {
  const cmd = process.argv[2] || 'sync';
  try {
    if (cmd === 'status') {
      console.log(JSON.stringify(await getStatus(), null, 2));
      return;
    }
    if (cmd === 'backup') {
      const { getConfig } = require('./util/config');
      const cfg = getConfig();
      require('./jobs/sync').assertErpRoot(cfg);
      const r = await stepBackup(cfg);
      console.log(JSON.stringify(r, null, 2));
      return;
    }
    if (cmd === 'migrate') {
      const r = await runSync({ steps: { gitPull: false, npmInstall: false, migrate: true, backup: false } });
      console.log(JSON.stringify({ ok: true, steps: r.steps }, null, 2));
      return;
    }
    if (cmd === 'sync') {
      const r = await runSync();
      console.log(JSON.stringify({ ok: true, ms: r.ms, steps: Object.keys(r.steps) }, null, 2));
      return;
    }
    console.error(`Bilinmeyen komut: ${cmd}`);
    process.exit(1);
  } catch (err) {
    logger.append({ level: 'error', message: err.message || String(err) });
    console.error(err.message || String(err));
    process.exit(1);
  }
}

main();
