const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { which } = require('./run');

const WIN_CANDIDATES = [
  'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\18\\bin\\pg_dump.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'C:\\PostgreSQL\\18\\bin\\pg_dump.exe',
  'C:\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\PostgreSQL\\16\\bin\\pg_dump.exe',
];

function envCandidates() {
  const out = [];
  for (const key of ['PG_DUMP_PATH', 'PGBIN', 'POSTGRES_HOME', 'PostgreSQL_ROOT', 'PGHOME']) {
    const v = process.env[key];
    if (!v) continue;
    if (/pg_dump(\.exe)?$/i.test(v)) out.push(v);
    else {
      out.push(path.join(v, 'pg_dump.exe'));
      out.push(path.join(v, 'bin', 'pg_dump.exe'));
      out.push(path.join(v, 'pg_dump'));
      out.push(path.join(v, 'bin', 'pg_dump'));
    }
  }
  return out;
}

function scanDirForPgDump(root, maxDepth = 3) {
  if (!root || !fs.existsSync(root)) return null;
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isFile() && /^pg_dump(\.exe)?$/i.test(ent.name)) return full;
      if (ent.isDirectory() && depth < maxDepth && !/node_modules|\.git/i.test(ent.name)) {
        queue.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return null;
}

function registryPgBin() {
  if (process.platform !== 'win32') return null;
  // EDB / EnterpriseDB kurulumları kayıt defterinde Base Directory tutar
  const keys = [
    'HKLM\\SOFTWARE\\PostgreSQL\\Installations',
    'HKLM\\SOFTWARE\\WOW6432Node\\PostgreSQL\\Installations',
  ];
  for (const key of keys) {
    const list = spawnSync('reg', ['query', key], { encoding: 'utf8', windowsHide: true });
    if (list.status !== 0) continue;
    const subkeys = String(list.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('HKEY_'));
    for (const sub of subkeys) {
      const q = spawnSync('reg', ['query', sub, '/v', 'Base Directory'], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (q.status !== 0) continue;
      const m = String(q.stdout || '').match(/Base Directory\s+REG_\w+\s+(.+)$/im);
      if (!m) continue;
      const base = m[1].trim().replace(/^"|"$/g, '');
      const candidate = path.join(base, 'bin', 'pg_dump.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function deepWhereSearch() {
  if (process.platform !== 'win32') return null;
  // where /R yavaş olabilir — sadece Program Files altında, timeout ile
  const roots = [
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL',
    'C:\\Program Files\\pgAdmin 4',
    path.join(process.env.LOCALAPPDATA || '', 'Programs'),
    path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'postgresql'),
  ].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const found = scanDirForPgDump(root, 4);
    if (found) return found;
  }
  return null;
}

/**
 * pg_dump yürütülebilir dosyasını bul.
 * @param {string} [configured]
 * @returns {string|null}
 */
function resolvePgDump(configured = '') {
  if (configured && fs.existsSync(configured)) return configured;

  for (const p of envCandidates()) {
    if (p && fs.existsSync(p)) return p;
  }

  const fromPath = which(process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump')
    || which('pg_dump');
  if (fromPath && fs.existsSync(fromPath)) return fromPath;

  if (process.platform === 'win32') {
    for (const p of WIN_CANDIDATES) {
      if (fs.existsSync(p)) return p;
    }
    const fromReg = registryPgBin();
    if (fromReg) return fromReg;

    const homeBins = [
      path.join(process.env.LOCALAPPDATA || '', 'PostgreSQL'),
      path.join(process.env.USERPROFILE || '', 'PostgreSQL'),
      'C:\\tools\\postgresql',
      'C:\\ProgramData\\chocolatey\\lib\\postgresql',
    ];
    for (const root of homeBins) {
      const found = scanDirForPgDump(root, 4);
      if (found) return found;
    }

    const deep = deepWhereSearch();
    if (deep) return deep;
  } else {
    for (const p of [
      '/usr/bin/pg_dump',
      '/usr/local/bin/pg_dump',
      '/opt/homebrew/bin/pg_dump',
      '/usr/lib/postgresql/16/bin/pg_dump',
      '/usr/lib/postgresql/15/bin/pg_dump',
    ]) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

module.exports = { resolvePgDump };
