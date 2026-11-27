/**
 * Ekran envanteri: public/app.js MODULES → docs/qa/01-screen-inventory.md + JSON
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appJs = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

// MODULES dizisini güvenli çıkar
const start = appJs.indexOf('const MODULES = [');
if (start < 0) throw new Error('MODULES bulunamadı');
let i = start + 'const MODULES = '.length;
let depth = 0;
let end = -1;
for (; i < appJs.length; i++) {
  const ch = appJs[i];
  if (ch === '[') depth++;
  else if (ch === ']') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end < 0) throw new Error('MODULES kapanışı bulunamadı');
const modulesLiteral = appJs.slice(start + 'const MODULES = '.length, end);

const sandbox = { MODULES: null, result: null };
vm.createContext(sandbox);
vm.runInContext(`result = ${modulesLiteral}`, sandbox);
const MODULES = sandbox.result;

const screens = [];
for (const mod of MODULES) {
  const sectionMap = new Map();
  for (const sec of mod.sections || []) {
    for (const sid of sec.screenIds || []) sectionMap.set(sid, sec.title || sec.id);
  }
  for (const s of mod.screens || []) {
    const flags = [];
    if (s.crud) flags.push('CRUD');
    if (s.readOnly) flags.push('RO');
    if (s.hidden) flags.push('HIDDEN');
    if (s.deprecated) flags.push('DEPRECATED');
    if (s.mrpKonsol) flags.push('MRP_KONSOL');
    if (s.approveAction) flags.push('APPROVE');
    if (s.convertAction) flags.push('CONVERT');
    if (s.mrpCalistirAction) flags.push('MRP_RUN');
    if (s.mrpTalepAction) flags.push('MRP_TALEP');
    if (s.mrpUretimAction) flags.push('MRP_UE');
    if (s.mrpSonucMode) flags.push('MRP_SONUC');
    if (s.metaExplorer) flags.push('META');
    if (s.sqlConsole) flags.push('SQL');
    if (s.tcmbCekAction) flags.push('TCMB');
    if (s.kullaniciYetkiPaneli) flags.push('YETKI_PANEL');
    if (s.formTabs?.length) flags.push(`TABS:${s.formTabs.length}`);
    if (s.detailKey) flags.push(`DETAIL:${s.detailKey}`);

    screens.push({
      moduleId: mod.id,
      moduleTitle: mod.title,
      section: sectionMap.get(s.id) || '—',
      id: s.id,
      techId: s.techId || '',
      title: s.title,
      endpoint: s.endpoint || '',
      crud: !!s.crud,
      readOnly: !!s.readOnly,
      hidden: !!s.hidden,
      flags: flags.join(', '),
      formTabKinds: (s.formTabs || []).map((t) => t.kind || 'fields').join('|') || '—',
      masterFieldCount: (s.masterFields || []).length,
      detailFieldCount: (s.detailFields || []).length,
      filterCount: (s.filters || []).length,
      columnCount: (s.columns || []).length,
      testStatus: 'pending',
      maturity: 'untested',
    });
  }
}

const byMod = {};
for (const s of screens) {
  byMod[s.moduleId] = byMod[s.moduleId] || { title: s.moduleTitle, count: 0, screens: [] };
  byMod[s.moduleId].count += 1;
  byMod[s.moduleId].screens.push(s);
}

const outDir = path.join(root, 'docs/qa');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'screen-inventory.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  total: screens.length,
  modules: Object.keys(byMod).length,
  screens,
}, null, 2));

let md = `# KTB ERP — Ekran Envanteri\n\n`;
md += `Oluşturulma: ${new Date().toISOString()} (Europe/Istanbul: ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })})\n\n`;
md += `**Toplam ekran:** ${screens.length} · **Modül:** ${Object.keys(byMod).length}\n\n`;
md += `> Test durumu başlangıçta \`pending\`. Otomatik smoke ve manuel E2E sonrası güncellenir.\n\n`;
md += `## Özet\n\n| Modül | Ekran |\n|---|---:|\n`;
for (const [id, m] of Object.entries(byMod)) {
  md += `| ${m.title} (\`${id}\`) | ${m.count} |\n`;
}
md += `| **TOPLAM** | **${screens.length}** |\n\n`;

for (const [id, m] of Object.entries(byMod)) {
  md += `## ${m.title}\n\n`;
  md += `| Bölüm | Ekran ID | Tech ID | Başlık | Endpoint | Flags | Alanlar (M/D/F/C) | Test |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (const s of m.screens) {
    md += `| ${s.section} | \`${s.id}\` | ${s.techId || '—'} | ${s.title} | \`${s.endpoint}\` | ${s.flags || '—'} | ${s.masterFieldCount}/${s.detailFieldCount}/${s.filterCount}/${s.columnCount} | ${s.testStatus} |\n`;
  }
  md += `\n`;
}

md += `## Olgunluk sınıfları (hedef)\n\n`;
md += `- \`undeveloped\` — menüde yok / stub\n`;
md += `- \`nonfunctional\` — açılır ama işlem yapamaz\n`;
md += `- \`partial\` — kısmen çalışır\n`;
md += `- \`working_gaps\` — çalışır, eksikleri var\n`;
md += `- \`fully_tested\` — test edildi ve geçti\n`;

fs.writeFileSync(path.join(outDir, '01-screen-inventory.md'), md);
console.log(`Wrote ${screens.length} screens → docs/qa/01-screen-inventory.md`);
