#!/usr/bin/env node
/**
 * DB kolon adlarını koddaki tüm başvurularla birlikte değiştirir.
 *
 * - Alt çizgili adlar (ör. rezerve_quantity): tam kelime eşleşmesiyle her yerde.
 * - Tek kelimelik adlar (ör. telefon, zorunlu): yalnızca
 *     · property erişimi / nesne anahtarı (shorthand dahil),
 *     · tam eşleşen string ('telefon'),
 *     · SQL içeren string/template'ler,
 *   böylece Türkçe arayüz metinleri bozulmaz.
 * db/migrations geçmişi değiştirilmez.
 *
 * Kullanım: node scripts/i18n-rename/rename-columns.js <column-map.json> [--dry]
 */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '../..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'logs', 'migrations', 'rollbacks', 'i18n-rename']);
const args = process.argv.slice(2);
const MAP = JSON.parse(fs.readFileSync(path.resolve(args.find((a) => !a.startsWith('--'))), 'utf8'));
const DRY = args.includes('--dry');

const multi = Object.entries(MAP).filter(([k]) => k.includes('_') || /\d/.test(k));
const single = Object.fromEntries(Object.entries(MAP).filter(([k]) => !k.includes('_') && !/\d/.test(k)));
const multiRe = new RegExp(`(?<![A-Za-z0-9_$])(${multi.map(([k]) => k).sort((a, b) => b.length - a.length).join('|')})(?![A-Za-z0-9_$])`, 'g');
const multiMap = Object.fromEntries(multi);
const singleRe = new RegExp(`(?<![A-Za-z0-9_$])(${Object.keys(single).join('|')})(?![A-Za-z0-9_$])`, 'g');
const SQL_RE = /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|WHERE|JOIN|ORDER\s+BY|GROUP\s+BY|RETURNING|ON\s+CONFLICT|ALTER\s+TABLE|COALESCE)\b/i;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(c|m)?js$|\.html$/.test(ent.name) && !ent.name.endsWith('.min.js')) out.push(p);
  }
  return out;
}

function tokens(src, mod) {
  return [...acorn.tokenizer(src, {
    ecmaVersion: 'latest', sourceType: mod ? 'module' : 'script', allowHashBang: true,
    allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowImportExportEverywhere: true,
  })];
}

function renameSingleInJs(src, rel) {
  let toks;
  try { toks = tokens(src, false); } catch { toks = tokens(src, true); }
  const edits = [];
  const has = (k) => Object.prototype.hasOwnProperty.call(single, k);
  // Parantez yığını: nesne anahtarı/shorthand yalnızca `{` içinde geçerli
  const stack = [];
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    const lab = t.type.label;
    const prev = toks[i - 1]?.type.label;
    const next = toks[i + 1]?.type.label;
    if (lab === '{' || lab === '[' || lab === '(' || lab === '${') { stack.push(lab); continue; }
    if (lab === '}' || lab === ']' || lab === ')') { stack.pop(); continue; }
    const inBrace = stack[stack.length - 1] === '{';
    if (lab === 'name' && has(t.value)) {
      const nw = single[t.value];
      if (prev === '.' || prev === '?.') edits.push([t.start, t.end, nw]);
      else if (inBrace && (prev === '{' || prev === ',') && next === ':') edits.push([t.start, t.end, nw]);
      else if (inBrace && (prev === '{' || prev === ',') && (next === ',' || next === '}' || next === '=')) edits.push([t.start, t.end, `${nw}: ${t.value}`]);
    } else if (lab === 'string') {
      if (has(t.value)) {
        const q = src[t.start];
        edits.push([t.start, t.end, `${q}${single[t.value]}${q}`]);
      } else if (SQL_RE.test(t.value)) {
        const raw = src.slice(t.start, t.end);
        const rep = raw.replace(singleRe, (w) => single[w]);
        if (rep !== raw) edits.push([t.start, t.end, rep]);
      }
    } else if (lab === 'template' && SQL_RE.test(t.value)) {
      const raw = src.slice(t.start, t.end);
      const rep = raw.replace(singleRe, (w) => single[w]);
      if (rep !== raw) edits.push([t.start, t.end, rep]);
    }
  }
  edits.sort((a, b) => a[0] - b[0]);
  let out = '';
  let last = 0;
  for (const [s, e, r] of edits) { out += src.slice(last, s) + r; last = e; }
  return { out: out + src.slice(last), n: edits.length };
}

const stats = { files: 0, multi: 0, single: 0, failures: [] };
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  let n1 = 0;
  let out = src.replace(multiRe, (w) => { n1 += 1; return multiMap[w]; });
  let n2 = 0;
  if (!rel.endsWith('.html')) {
    try {
      const r = renameSingleInJs(out, rel);
      out = r.out;
      n2 = r.n;
    } catch (e) {
      stats.failures.push(`${rel}: ${e.message}`);
    }
  } else {
    out = out.replace(/(data-[a-z-]+=")([a-z]+)(")/g, (m0, a, w, b) => (Object.prototype.hasOwnProperty.call(single, w) ? `${a}${single[w]}${b}` : m0));
  }
  if (out !== src) {
    stats.files += 1;
    stats.multi += n1;
    stats.single += n2;
    if (!DRY) fs.writeFileSync(file, out);
  }
}
console.log(JSON.stringify(stats, null, 2));
