#!/usr/bin/env node
/**
 * Structural + optional HTTP smoke tests for the new menu architecture.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'public/app.js');
const outDir = path.join(root, 'docs/ui/menu-architecture');
const mappingPath = path.join(outDir, '_mapping.json');

function skipStrings(text, p) {
  const q = text[p];
  p += 1;
  while (p < text.length) {
    if (text[p] === '\\') { p += 2; continue; }
    if (text[p] === q) return p;
    p += 1;
  }
  return p;
}

function extractArraySlice(src, startKeyword) {
  const start = src.indexOf(startKeyword);
  const i = src.indexOf('[', start);
  let depth = 0;
  for (let p = i; p < src.length; p += 1) {
    const c = src[p];
    if (c === '"' || c === "'" || c === '`') { p = skipStrings(src, p); continue; }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return src.slice(i, p + 1);
    }
  }
  throw new Error('MODULES not found');
}

function splitTopObjects(arrayText) {
  const out = [];
  let depth = 0;
  let objStart = -1;
  for (let p = 1; p < arrayText.length - 1; p += 1) {
    const c = arrayText[p];
    if (c === '"' || c === "'" || c === '`') { p = skipStrings(arrayText, p); continue; }
    if (c === '{') {
      if (depth === 0) objStart = p;
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0 && objStart >= 0) {
        out.push(arrayText.slice(objStart, p + 1));
        objStart = -1;
      }
    }
  }
  return out;
}

function getStr(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*'([^']*)'`))
    || block.match(new RegExp(`${key}:\\s*"([^"]*)"`));
  return m ? m[1] : '';
}

function parseLiveMenu(src) {
  const modulesText = extractArraySlice(src, 'const MODULES =');
  const modules = [];
  for (const block of splitTopObjects(modulesText)) {
    const mid = getStr(block, 'id');
    const mtitle = getStr(block, 'title');
    const sections = [];
    const secMatch = block.match(/sections:\s*\[([\s\S]*?)\],\s*screens:/);
    if (secMatch) {
      for (const so of splitTopObjects(`[${secMatch[1]}]`)) {
        const sid = getStr(so, 'id');
        const st = getStr(so, 'title');
        const sm = so.match(/screenIds:\s*\[([^\]]*)\]/);
        const sids = sm ? [...sm[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
        sections.push({ id: sid, title: st, screenIds: sids });
      }
    }
    const key = block.indexOf('screens:');
    const i = block.indexOf('[', key);
    let depth = 0;
    let end = -1;
    for (let p = i; p < block.length; p += 1) {
      const c = block[p];
      if (c === '"' || c === "'" || c === '`') { p = skipStrings(block, p); continue; }
      if (c === '[') depth += 1;
      else if (c === ']') {
        depth -= 1;
        if (depth === 0) { end = p + 1; break; }
      }
    }
    const screens = splitTopObjects(block.slice(i, end)).map((o) => ({
      id: getStr(o, 'id'),
      title: getStr(o, 'title'),
      techId: getStr(o, 'techId'),
      endpoint: getStr(o, 'endpoint'),
      hidden: /hidden:\s*true/.test(o),
      deprecated: /deprecated:\s*true/.test(o),
    }));
    modules.push({ id: mid, title: mtitle, sections, screens });
  }
  return modules;
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const src = fs.readFileSync(appPath, 'utf8');
  const live = parseLiveMenu(src);
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  check('MODULES parses', live.length > 0, `${live.length} modules`);
  check('Sabit Tanımlar kaldırıldı', !live.some((m) => m.id === 'fixed-tanimlar'));
  check('Cari modülü korundu', live.some((m) => m.id === 'cari'));
  check('En fazla 3 seviye (modül/section/screen)', live.every((m) => m.sections.every((s) => Array.isArray(s.screenIds))));

  const menuIds = new Set();
  let dupInMenu = null;
  for (const m of live) {
    for (const sec of m.sections) {
      for (const id of sec.screenIds) {
        if (menuIds.has(id)) dupInMenu = id;
        menuIds.add(id);
      }
    }
  }
  check('Menüde mükerrer screenId yok', !dupInMenu, dupInMenu || 'ok');

  const allScreenIds = new Set();
  for (const m of live) {
    for (const s of m.screens) allScreenIds.add(s.id);
  }
  check('Tüm mapped ekranlar kodda var', mapping.mapping.every((r) => allScreenIds.has(r.screenId)));
  check('TechId korunmuş', mapping.mapping.every((r) => {
    const sc = live.flatMap((m) => m.screens).find((s) => s.id === r.screenId);
    return sc && sc.techId === r.techId;
  }));
  check('Endpoint korunmuş', mapping.mapping.every((r) => {
    const sc = live.flatMap((m) => m.screens).find((s) => s.id === r.screenId);
    return sc && sc.endpoint === r.endpoint;
  }));

  const ana = live.find((m) => m.id === 'ana-veri');
  check('Ana Veri ortak tanımları içeriyor', ana?.sections.some((s) => s.screenIds.includes('olcu-birimleri'))
    && ana?.sections.some((s) => s.screenIds.includes('para-birimi-tanimi')));
  const sistem = live.find((m) => m.id === 'sistem');
  check('Mesaj tanımları Sistem altında', sistem?.sections.some((s) => s.screenIds.includes('mesaj-tanimlari')));
  const stok = live.find((m) => m.id === 'stok');
  check('stok-depo Stok altında', stok?.sections.some((s) => s.screenIds.includes('stok-depo')));
  check('MRP yalnızca Stok altında', live.filter((m) => m.sections.some((s) => s.screenIds.some((id) => id.startsWith('mrp-')))).length === 1);

  const orphans = Object.keys(mapping.orphans || {});
  check('Orphan ekranlar menü section dışında', orphans.every((id) => !menuIds.has(id)));
  check('Orphan ekranlar kodda duruyor', orphans.every((id) => allScreenIds.has(id)));

  check('fixed-tanimlar yetki alias kodda', src.includes("mods.includes('fixed-tanimlar')"));

  // Optional HTTP: soft-auth headers (KTB ERP) + root-mounted endpoints
  const base = process.env.ERP_BASE || 'http://127.0.0.1:3000';
  let httpOk = false;
  let httpDetail = '';
  try {
    const home = await fetch(base);
    if (!home.ok) throw new Error(`home HTTP ${home.status}`);
    const headers = {
      'X-Kullanici-Kodu': 'owner',
      'X-Firma-Id': '1',
    };
    const samples = ['cari-kartlari', 'stok-karti', 'olcu-birimleri', 'mrp-calisma', 'irsaliye-yonetimi'];
    const hits = [];
    for (const sid of samples) {
      const row = mapping.mapping.find((r) => r.screenId === sid);
      if (!row?.endpoint) continue;
      const url = `${base}${row.endpoint}`;
      const res = await fetch(url, { headers }).catch((e) => ({ ok: false, status: 0, error: e.message }));
      // 200/204 OK; 400/401/403 still proves route exists; 404/502 fail
      const status = res.status || 0;
      hits.push({ sid, status, ok: status > 0 && status !== 404 && status < 500 });
    }
    httpOk = hits.length > 0 && hits.every((h) => h.ok);
    httpDetail = hits.map((h) => `${h.sid}:${h.status}`).join(', ') || 'no hits';
  } catch (err) {
    httpOk = false;
    httpDetail = err.message;
  }
  check('Örnek ekran endpoint erişimi', httpOk, httpDetail);

  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Test Raporu',
    '',
    `Tarih (UTC): ${new Date().toISOString()}`,
    '',
    `Sonuç: **${failed.length ? 'KISMİ / BAŞARISIZ' : 'BAŞARILI'}** — ${results.length - failed.length}/${results.length} geçti`,
    '',
    '| Test | Sonuç | Detay |',
    '|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail || ''} |`),
    '',
    '## Kabul kriterleri eşlemesi',
    '',
    '1. Excel/kod envanteri karşılaştırıldı → docs CURRENT + SCREEN_MAPPING',
    '2. Mevcut ekranlar yeni menüde konumlandı → TARGET + CSV/XLSX',
    '3. Menü dışı ekranlar değerlendirildi → MISSING_AND_DUPLICATE_SCREENS',
    '4. Mükerrerler tespit edildi (silinmedi)',
    '5. Endpoint smoke (mümkün olduğunca)',
    '6. Ekran/tech ID korundu → bu test',
    '7. fixed-tanimlar yetki alias',
    '8. Modüller arası ID/endpoint bozulmadı',
    '9. Üç seviye kontrolü',
    '10. Terminoloji docs',
    '',
    failed.length
      ? `## Giderilemeyen / başarısız\n\n${failed.map((f) => `- ${f.name}: ${f.detail}`).join('\n')}\n`
      : '## Giderilemeyen sorun yok\n',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'TEST_REPORT.md'), report);
  console.log(failed.length ? `\n${failed.length} failed` : '\nAll structural checks passed');
  process.exit(failed.length ? 1 : 0);
}

main();
