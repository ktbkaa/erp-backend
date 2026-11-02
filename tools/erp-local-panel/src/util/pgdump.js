const fs = require('fs');
const path = require('path');
const { which } = require('./run');

const WIN_CANDIDATES = [
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
];

function resolvePgDump(configured = '') {
  if (configured && fs.existsSync(configured)) return configured;
  const fromPath = which(process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
  if (fromPath && fs.existsSync(fromPath)) return fromPath;
  if (process.platform === 'win32') {
    for (const p of WIN_CANDIDATES) {
      if (fs.existsSync(p)) return p;
    }
    // Sürüm klasörlerini tara
    const roots = ['C:\\Program Files\\PostgreSQL', 'C:\\Program Files (x86)\\PostgreSQL'];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      try {
        const vers = fs.readdirSync(root);
        for (const v of vers) {
          const candidate = path.join(root, v, 'bin', 'pg_dump.exe');
          if (fs.existsSync(candidate)) return candidate;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

module.exports = { resolvePgDump };
