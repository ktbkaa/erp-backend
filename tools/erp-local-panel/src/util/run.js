const { spawnSync } = require('child_process');
const logger = require('./logger');

function run(cmd, args, opts = {}) {
  const label = opts.label || `${cmd} ${args.join(' ')}`;
  logger.append({ level: 'info', message: `▶ ${label}`, cmd, args });
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: 'utf8',
    shell: opts.shell === true,
    windowsHide: true,
    timeout: opts.timeout || 15 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = (r.stdout || '').trim();
  const stderr = (r.stderr || '').trim();
  if (stdout) logger.append({ level: 'info', message: stdout.slice(0, 4000) });
  if (stderr) logger.append({ level: 'warn', message: stderr.slice(0, 4000) });
  if (r.error) {
    const err = new Error(`${label} başlatılamadı: ${r.error.message}`);
    err.cause = r.error;
    throw err;
  }
  if (r.status !== 0 && r.status != null) {
    const err = new Error(`${label} başarısız (exit ${r.status})`);
    err.status = r.status;
    err.stderr = stderr;
    throw err;
  }
  if (r.status == null && r.signal) {
    throw new Error(`${label} sinyal ile bitti: ${r.signal}`);
  }
  return { stdout, stderr, status: r.status };
}

function which(bin) {
  const isWin = process.platform === 'win32';
  const r = spawnSync(isWin ? 'where' : 'which', [bin], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) return null;
  const line = String(r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line || null;
}

module.exports = { run, which };
