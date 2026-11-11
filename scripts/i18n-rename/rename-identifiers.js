#!/usr/bin/env node
/**
 * Token-tabanlı JS identifier yeniden adlandırma.
 * Yalnızca kod token'larını (identifier/property) değiştirir; string, yorum ve
 * template metinlerine dokunmaz — Türkçe arayüz metinleri ve SQL korunur.
 *
 * Kullanım: node scripts/i18n-rename/rename-identifiers.js <map.json> [--dry] [--report]
 * Acorn gerekir: NODE_PATH ile ya da yerel node_modules'tan çözülür.
 */
const fs = require('fs');
const path = require('path');

let acorn;
try {
  acorn = require('acorn');
} catch {
  console.error('acorn bulunamadı. `npm i --no-save acorn` veya NODE_PATH ayarlayın.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '../..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'logs']);
const args = process.argv.slice(2);
const mapFile = args.find((a) => !a.startsWith('--'));
const DRY = args.includes('--dry');
const REPORT = args.includes('--report');
if (!mapFile) {
  console.error('map.json yolu gerekli');
  process.exit(1);
}
const MAP = JSON.parse(fs.readFileSync(path.resolve(mapFile), 'utf8'));

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(c|m)?js$/.test(ent.name)) out.push(p);
  }
  return out;
}

function tokenize(src, isModule) {
  const opts = {
    ecmaVersion: 'latest',
    sourceType: isModule ? 'module' : 'script',
    allowHashBang: true,
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
  };
  return [...acorn.tokenizer(src, opts)];
}

const stringHits = {};
const propHits = {};
let changedFiles = 0;
let changedTokens = 0;
const failures = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  let tokens;
  try {
    tokens = tokenize(src, rel.endsWith('.mjs') || /^\s*(import|export)\s/m.test(src));
  } catch (e1) {
    try {
      tokens = tokenize(src, true);
    } catch (e2) {
      failures.push(`${rel}: ${e2.message}`);
      continue;
    }
  }
  const edits = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.type.label === 'name' && Object.prototype.hasOwnProperty.call(MAP, t.value)) {
      edits.push({ start: t.start, end: t.end, to: MAP[t.value] });
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const isProp = (prev && prev.type.label === '.') || (next && next.type.label === ':' && prev && ['{', ','].includes(prev.type.label));
      if (isProp) (propHits[t.value] ||= []).push(rel);
    } else if (REPORT && (t.type.label === 'string' || t.type.label === 'template')) {
      for (const k of Object.keys(MAP)) {
        if (new RegExp(`\\b${k}\\b`).test(String(t.value))) (stringHits[k] ||= new Set()).add(rel);
      }
    }
  }
  if (!edits.length) continue;
  let out = '';
  let last = 0;
  for (const e of edits) {
    out += src.slice(last, e.start) + e.to;
    last = e.end;
  }
  out += src.slice(last);
  changedFiles += 1;
  changedTokens += edits.length;
  if (!DRY) fs.writeFileSync(file, out);
}

console.log(JSON.stringify({
  dry: DRY,
  changedFiles,
  changedTokens,
  failures,
  propertyPositions: Object.fromEntries(Object.entries(propHits).map(([k, v]) => [k, [...new Set(v)]])),
  stringMentions: Object.fromEntries(Object.entries(stringHits).map(([k, v]) => [k, [...v]])),
}, null, 2));
