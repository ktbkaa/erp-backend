/**
 * Windows'ta sık karışan iki klasör:
 *   ...\Masaüstü\erp-backend          (eski / boş kopya)
 *   ...\Masaüstü\ERP PROJESİ\erp-backend  (asıl çalışan)
 * En güncel / doğru kökü seç.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function isErpRoot(dir) {
  if (!dir || !fs.existsSync(dir)) return false;
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return Boolean(pkg.scripts && pkg.scripts.migrate);
  } catch {
    return false;
  }
}

function gitHeadTs(dir) {
  try {
    const r = spawnSync('git', ['log', '-1', '--format=%ct'], {
      cwd: dir,
      encoding: 'utf8',
      windowsHide: true,
    });
    if (r.status !== 0) return 0;
    return Number(String(r.stdout || '').trim()) || 0;
  } catch {
    return 0;
  }
}

function gitBranch(dir) {
  try {
    const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      windowsHide: true,
    });
    if (r.status !== 0) return null;
    return String(r.stdout || '').trim() || null;
  } catch {
    return null;
  }
}

function scoreRoot(dir) {
  let score = 0;
  const norm = dir.replace(/\\/g, '/').toLowerCase();
  if (/erp\s*projes/i.test(dir) || /erp%20projes/i.test(norm)) score += 100;
  if (fs.existsSync(path.join(dir, 'scripts', 'local-heal.js'))) score += 40;
  if (fs.existsSync(path.join(dir, 'public', 'app.js'))) score += 10;
  if (fs.existsSync(path.join(dir, '.env'))) score += 5;
  score += Math.min(30, Math.floor(gitHeadTs(dir) / 1e8)); // newer tip slightly preferred
  // düz Masaüstü\erp-backend cezası (PROJE altı değilse)
  if (/[\\/](masaustu|masaüstü|desktop)[\\/]erp-backend$/i.test(dir) && !/projes/i.test(dir)) {
    score -= 50;
  }
  return score;
}

function candidateRoots(preferred) {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const list = [];
  if (preferred) list.push(preferred);
  const extras = [
    path.join(home, 'OneDrive', 'Masaüstü', 'ERP PROJESİ', 'erp-backend'),
    path.join(home, 'OneDrive', 'Masaustu', 'ERP PROJESI', 'erp-backend'),
    path.join(home, 'OneDrive', 'Masaüstü', 'erp-backend'),
    path.join(home, 'OneDrive', 'Masaustu', 'erp-backend'),
    path.join(home, 'Desktop', 'erp-backend'),
    path.join(home, 'OneDrive', 'Desktop', 'erp-backend'),
  ];
  for (const p of extras) list.push(p);

  // OneDrive altında erp-backend klasörlerini sığ ara
  try {
    const od = path.join(home, 'OneDrive');
    if (fs.existsSync(od)) {
      const walk = (dir, depth) => {
        if (depth < 0) return;
        let ents;
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of ents) {
          if (!e.isDirectory()) continue;
          if (e.name === 'node_modules' || e.name === '.git') continue;
          const full = path.join(dir, e.name);
          if (e.name === 'erp-backend') list.push(full);
          else if (depth > 0) walk(full, depth - 1);
        }
      };
      walk(od, 3);
    }
  } catch { /* ignore */ }

  return [...new Set(list.map((p) => path.normalize(p)))];
}

/**
 * @returns {{ root: string|null, switched: boolean, from: string|null, reason: string|null, branch: string|null }}
 */
function resolveErpRoot(current) {
  const cur = current ? path.normalize(String(current).trim()) : '';
  const cands = candidateRoots(cur).filter(isErpRoot);
  if (!cands.length) {
    return { root: cur || null, switched: false, from: null, reason: cur ? null : 'not-found', branch: null };
  }

  cands.sort((a, b) => scoreRoot(b) - scoreRoot(a));
  const best = cands[0];
  const curOk = cur && isErpRoot(cur);
  const curScore = curOk ? scoreRoot(cur) : -999;
  const bestScore = scoreRoot(best);

  // Mevcut kök zayıf / yanlış düz masaüstü kopyasıysa PROJE altına geç
  if (!curOk || (best !== cur && bestScore >= curScore + 40)) {
    return {
      root: best,
      switched: Boolean(cur && best !== cur),
      from: cur || null,
      reason: curOk ? 'better-candidate' : 'invalid-current',
      branch: gitBranch(best),
    };
  }
  return {
    root: cur,
    switched: false,
    from: null,
    reason: null,
    branch: gitBranch(cur),
  };
}

module.exports = {
  isErpRoot,
  resolveErpRoot,
  gitBranch,
  gitHeadTs,
  scoreRoot,
  candidateRoots,
};
