const { spawn, spawnSync } = require('child_process');
const logger = require('./logger');

/**
 * Uzun işler için async spawn — event loop'u kilitlemez (panel yanıt vermeye devam eder).
 */
function runAsync(cmd, args, opts = {}) {
  const label = opts.label || `${cmd} ${args.join(' ')}`;
  logger.append({ level: 'info', message: `▶ ${label}`, cmd, args });
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env || {}) },
      shell: opts.shell === true,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const max = 20 * 1024 * 1024;
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      reject(new Error(`${label} zaman aşımı`));
    }, opts.timeout || 15 * 60 * 1000);

    child.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
      if (stdout.length > max) stdout = stdout.slice(-max);
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
      if (stderr.length > max) stderr = stderr.slice(-max);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`${label} başlatılamadı: ${err.message}`));
    });
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      const out = stdout.trim();
      const err = stderr.trim();
      if (out) logger.append({ level: 'info', message: out.slice(0, 4000) });
      if (err) logger.append({ level: 'warn', message: err.slice(0, 4000) });
      if (status !== 0 && status != null) {
        const e = new Error(`${label} başarısız (exit ${status})`);
        e.status = status;
        e.stderr = err;
        reject(e);
        return;
      }
      if (status == null && signal) {
        reject(new Error(`${label} sinyal ile bitti: ${signal}`));
        return;
      }
      resolve({ stdout: out, stderr: err, status });
    });
  });
}

/** Kısa işler / which için sync */
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

module.exports = { run, runAsync, which };
