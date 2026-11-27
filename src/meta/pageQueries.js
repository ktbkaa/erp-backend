'use strict';

const fs = require('fs');
const path = require('path');
const { getScreen, listScreens } = require('./screenTables');

const ROUTES_DIR = path.join(__dirname, '../../routes');
const INDEX_JS = path.join(__dirname, '../../index.js');

/** index.js app.use('/path', require('./routes/file')) eşlemeleri */
let _mountMap = null;
function loadMountMap() {
  if (_mountMap) return _mountMap;
  _mountMap = Object.create(null);
  try {
    const src = fs.readFileSync(INDEX_JS, 'utf8');
    const re = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*require\(\s*['"](\.\/routes\/[^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const mount = String(m[1] || '').replace(/\/$/, '');
      const file = `${m[2].replace('./routes/', '')}.js`;
      _mountMap[mount] = file;
      // /api/xxx gibi önekleri de düz path ile tut
      const bare = mount.replace(/^\/api/, '') || mount;
      if (bare && !_mountMap[bare]) _mountMap[bare] = file;
    }
  } catch (_) { /* ignore */ }
  return _mountMap;
}

/** Endpoint → routes dosya adı tahmini */
function routeFileCandidates(endpoint, primaryTable) {
  if (!endpoint && !primaryTable) return [];
  const out = [];
  if (endpoint) {
    const clean = String(endpoint).replace(/^\//, '').split('?')[0].replace(/\/$/, '');
    const slug = clean.replace(/\//g, '_');
    const alt = clean.replace(/-/g, '_');
    out.push(
      `${clean}.js`,
      `${slug}.js`,
      `${alt}.js`,
      `${clean.replace(/_/g, '-')}.js`,
    );
  }
  if (primaryTable) {
    const t = String(primaryTable).replace(/^\//, '');
    out.push(`${t}.js`, `${t.replace(/_/g, '-')}.js`, `${t.replace(/-/g, '_')}.js`);
  }
  return out;
}

function resolveRouteFile(endpoint, primaryTable) {
  // 1) index.js mount eşlemesi (en güvenilir)
  const mounts = loadMountMap();
  if (endpoint) {
    const cleanEp = `/${String(endpoint).replace(/^\//, '').split('?')[0].replace(/\/$/, '')}`;
    const mountFile = mounts[cleanEp] || mounts[cleanEp.replace(/\/$/, '')];
    if (mountFile) {
      const full = path.join(ROUTES_DIR, mountFile);
      if (fs.existsSync(full)) return full;
    }
  }

  const names = routeFileCandidates(endpoint, primaryTable);
  for (const name of names) {
    const full = path.join(ROUTES_DIR, name);
    if (fs.existsSync(full)) return full;
  }
  // kısmi eşleşme
  try {
    const files = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.js'));
    const needle = String(endpoint || '').replace(/^\//, '').split('/')[0];
    const hit = files.find((f) => f.replace(/\.js$/, '') === needle
      || f.replace(/\.js$/, '').replace(/_/g, '-') === needle
      || (primaryTable && f.replace(/\.js$/, '') === primaryTable));
    if (hit) return path.join(ROUTES_DIR, hit);
  } catch (_) { /* ignore */ }
  return null;
}

/** Kaynak dosyadan SQL parçalarını çıkar */
function extractSqlFromSource(src, filePath) {
  const out = [];
  if (!src) return out;
  const re = /(?:pool|client)\.query\s*\(\s*(?:(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*)?[`'"]([\s\S]*?)[`'"]/g;
  let m;
  let i = 0;
  while ((m = re.exec(src)) !== null) {
    const sql = String(m[1] || '').replace(/\\n/g, '\n').trim();
    if (sql.length < 8) continue;
    if (!/\b(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(sql)) continue;
    i += 1;
    const kind = (sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i) || [, 'SQL'])[1].toUpperCase();
    out.push({
      id: `${path.basename(filePath)}:${i}`,
      kind: kind === 'WITH' ? 'SELECT' : kind,
      sql: sql.length > 4000 ? `${sql.slice(0, 4000)}\n/* … */` : sql,
      source: path.basename(filePath),
    });
  }
  // template literal query`...` varyantı
  const re2 = /\.query\s*\(\s*`([\s\S]*?)`/g;
  while ((m = re2.exec(src)) !== null) {
    const sql = String(m[1] || '').trim();
    if (sql.length < 8 || !/\b(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(sql)) continue;
    const already = out.some((q) => q.sql === sql);
    if (already) continue;
    i += 1;
    const kind = (sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i) || [, 'SQL'])[1].toUpperCase();
    out.push({
      id: `${path.basename(filePath)}:L${i}`,
      kind: kind === 'WITH' ? 'SELECT' : kind,
      sql: sql.length > 4000 ? `${sql.slice(0, 4000)}\n/* … */` : sql,
      source: path.basename(filePath),
    });
  }
  return out;
}

function screenQueries(screenId) {
  const base = getScreen(screenId) || listScreens().find((s) => s.screenId === screenId);
  if (!base) return null;
  const endpoint = base.endpoint || null;
  const routeFile = resolveRouteFile(endpoint, base.primaryTable || null);
  let queries = [];
  if (routeFile) {
    try {
      const src = fs.readFileSync(routeFile, 'utf8');
      queries = extractSqlFromSource(src, routeFile);
    } catch (_) { /* ignore */ }
  }
  const tableHints = (base.tables || []).map((t) => ({
    id: `table:${t.name}`,
    kind: 'TABLE',
    label: t.name,
    sql: `-- Ana/ilgili tablo: ${t.name} (${t.role || 'related'})\nSELECT * FROM ${t.name} LIMIT 50;`,
    source: 'screenTableRegistry',
  }));
  return {
    screenId: base.screenId || screenId,
    title: base.title || screenId,
    techId: base.techId || null,
    endpoint,
    routeFile: routeFile ? path.basename(routeFile) : null,
    primaryTable: base.primaryTable || null,
    queries: [...queries, ...tableHints],
  };
}

module.exports = { screenQueries, resolveRouteFile, extractSqlFromSource };
