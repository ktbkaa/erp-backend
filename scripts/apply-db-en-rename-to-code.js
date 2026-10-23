/**
 * rename-map.json ile routes/src/public/tests/index kodunu İngilizce şemaya uyarlar.
 * Generator scriptlerine ve eski migration dosyalarına dokunmaz.
 *
 *   node scripts/generate-db-en-rename.js
 *   node scripts/apply-db-en-rename-to-code.js
 *
 * Güvenlik:
 * - Unicode harf sınırları (adım, rolü bozulmaz)
 * - Kısa / UI eylem anahtarları (yeni) kodda korunur; DB kolonu migration’da can_create
 * - routes/*.js tablo adına göre yeniden adlandırılır
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/db-naming/rename-map.json'), 'utf8'));
const flatCol = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/db-naming/column-flat-map.json'), 'utf8'));

/** Kodda bırakılan UI / yerel değişken anahtarları (DB kolonu ayrı ele alınır) */
const CODE_SKIP_COLS = new Set([
  'yeni', // formMode + yetki aksiyonu; SQL’de can_create AS yeni
]);

const TARGETS = ['routes', 'src', 'public', 'tests', 'index.js', 'db/index.js', 'db/migrate.js', 'db/pool.js'];

const tablePairs = Object.entries(map.tables).sort((a, b) => b[0].length - a[0].length);
const colPairs = Object.entries(flatCol)
  .filter(([from]) => !CODE_SKIP_COLS.has(from))
  .sort((a, b) => b[0].length - a[0].length);

/** JS identifier sınırı: Unicode harf/rakam/_ */
function replaceIdent(content, from, to) {
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'gu');
  return content.replace(re, to);
}

function listFiles() {
  const out = [];
  for (const t of TARGETS) {
    const p = path.join(ROOT, t);
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    if (st.isFile()) out.push(p);
    else walk(p, out);
  }
  return out;
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(js|json)$/.test(ent.name)) out.push(p);
  }
}

function transform(content) {
  let s = content;
  for (const [from, to] of tablePairs) {
    if (from === to) continue;
    s = replaceIdent(s, from, to);
  }
  for (const [from, to] of colPairs) {
    if (from === to) continue;
    s = replaceIdent(s, from, to);
  }
  return s;
}

/** routes/faturalar.js → routes/invoices.js (tablo adı eşlemesi) */
function renameRouteFiles() {
  const dir = path.join(ROOT, 'routes');
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  // uzun adlar önce
  const pairs = [...tablePairs];
  for (const file of files) {
    const base = file.replace(/\.js$/, '');
    for (const [from, to] of pairs) {
      if (base === from && from !== to) {
        const src = path.join(dir, file);
        const dest = path.join(dir, `${to}.js`);
        if (fs.existsSync(dest)) {
          console.warn('skip route rename, target exists:', path.relative(ROOT, dest));
          break;
        }
        fs.renameSync(src, dest);
        console.log('renamed', path.relative(ROOT, src), '→', path.relative(ROOT, dest));
        n++;
        break;
      }
    }
  }
  return n;
}

/**
 * Yetki kolonu: DB can_create, API/UI `yeni` kalsın.
 * SELECT/INSERT listelerinde `yeni` → `can_create AS yeni` / kolon adı can_create.
 */
function patchPermissionColumnSql() {
  const files = [
    path.join(ROOT, 'routes', 'users.js'),
    path.join(ROOT, 'routes', 'auth.js'),
    path.join(ROOT, 'routes', 'kullanicilar.js'),
  ].filter((f) => fs.existsSync(f));

  for (const f of files) {
    let s = fs.readFileSync(f, 'utf8');
    const before = s;
    // SELECT list: ..., yeni, incele → ..., can_create AS yeni, incele
    s = s.replace(
      /(SELECT\s+screen_id,\s*erisim,\s*)yeni(\s*,\s*incele)/g,
      '$1can_create AS yeni$2'
    );
    // INSERT column list
    s = s.replace(
      /(\(kisi_id,\s*screen_id,\s*erisim,\s*)yeni(\s*,\s*incele)/g,
      '$1can_create$2'
    );
    // ON CONFLICT / UPDATE SET yeni=EXCLUDED.yeni
    s = s.replace(/\byeni\s*=\s*EXCLUDED\.yeni\b/g, 'can_create=EXCLUDED.can_create');
    if (s !== before) {
      fs.writeFileSync(f, s);
      console.log('patched permission SQL', path.relative(ROOT, f));
    }
  }
}

const files = listFiles();
let changed = 0;
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(f, after);
    changed++;
    console.log('updated', path.relative(ROOT, f));
  }
}
/** Satınalma bağlamında siparis_id → purchase_order_id (flat map çoğunluk sales_order_id) */
function patchPurchaseOrderIdRefs() {
  const re = /(?<![\p{L}\p{N}_])sales_order_id(?![\p{L}\p{N}_])/gu;
  const hit = (rel) =>
    /purchase_order|goods_receipt|vendor_delivery|satin_alma_siparis|mal_kabul|tedarikci_irsaliye/.test(
      rel
    );
  let n = 0;
  for (const f of listFiles()) {
    const rel = path.relative(ROOT, f);
    if (!hit(rel)) continue;
    const before = fs.readFileSync(f, 'utf8');
    const after = before.replace(re, 'purchase_order_id');
    if (after !== before) {
      fs.writeFileSync(f, after);
      console.log('PO id patch', rel);
      n++;
    }
  }
  return n;
}

const renamed = renameRouteFiles();
patchPermissionColumnSql();
const poPatched = patchPurchaseOrderIdRefs();
console.log(
  'files changed',
  changed,
  '/',
  files.length,
  '; routes renamed',
  renamed,
  '; PO patches',
  poPatched
);
