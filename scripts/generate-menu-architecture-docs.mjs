#!/usr/bin/env node
/**
 * Generate docs/ui/menu-architecture/* from _mapping.json + live MODULES parse.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'docs/ui/menu-architecture');
const mappingPath = path.join(outDir, '_mapping.json');
const appPath = path.join(root, 'public/app.js');

const require = createRequire(import.meta.url);

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

function mdEscape(s) {
  return String(s || '').replace(/\|/g, '\\|');
}

function writeCurrentAnalysis(mappingData, live) {
  const moved = mappingData.mapping.filter((r) => r.oldModuleId && r.oldModuleId !== r.newModuleId);
  const renamed = mappingData.mapping.filter((r) => r.oldTitle && r.newTitle && r.oldTitle !== r.newTitle);
  const body = `# Mevcut Menü Analizi

## Özet

| Metrik | Değer |
|--------|-------|
| Eski modül sayısı | 14 (Sabit Tanımlar dahil) |
| Yeni modül sayısı | ${live.length} |
| Toplam ekran (kod) | ${mappingData.oldPlacement?.length || mappingData.mapping.length + Object.keys(mappingData.orphans || {}).length} |
| Menüde görünen ekran | ${mappingData.mapping.length} |
| Menü dışı (orphan, kodda duruyor) | ${Object.keys(mappingData.orphans || {}).length} |
| Modül değişen ekran | ${moved.length} |
| Yeniden adlandırılan ekran | ${renamed.length} |

## Tespit edilen sorunlar

1. **Sabit Tanımlar** ortak ana veri (ülke, para birimi, ölçü) ile sistem mesaj tanımlarını aynı düz listede tutuyordu.
2. **Ana Veri** yalnızca organizasyon (firma / iş yeri / depo) içeriyordu; ortak kartlar dağınık kalıyordu.
3. **Cari** doğru şekilde ayrı modüldü; finansal işlemler "Finans" başlığı altında toplanmıştı — süreç diline göre yeniden gruplandı.
4. **stok-depo** (Depo Stok Bağ) Üretim altında duruyordu; stok/depo operasyonuna aitti.
5. **MRP** Stok içinde "Planlama" ile karışıktı; ayrı "MRP Planlama" grubu daha doğru.
6. **Satış** teklif+sipariş tek başlıktaydı; irsaliye/fatura "Belge Yönetimi" genel adındaydı.
7. **Satınalma** talepler sipariş grubundaydı; teklif istekleri gizli/deprecated orphan.
8. **Kalite** yalnızca Emirler / Tanımlar ayrımı yapıyordu; giriş/çıkış/uygunsuzluk süreçleri ayrılmamıştı.
9. **İK** tanımlamaları tek "Tanımlar / Parametreler" kovasında birikmişti.
10. **Onay** konfigürasyonu "Sabit Tanımlar" adıyla operasyonel menüye karışıyordu.
11. **vergi-kodlari** ile **finans-vergi-kodlari** mükerrer aday (aynı işlev ailesi); menüde yalnızca finans-vergi-kodlari tutuldu.
12. Excel envanteri ile kod arasında sapmalar vardı; kod kaynak kabul edildi.

## Mimari kararlar (özet)

- **Cari korunur** — ortak ana veri + cari işlemler; Satış/Satınalma'ya taşınmaz.
- **Sabit Tanımlar kaldırılır** — ortak tanımlar → Ana Veri; mesaj tanımları → Sistem.
- **MRP tek yerde** — Stok > MRP Planlama (çoğaltılmaz).
- **Üç seviye** — Modül → İşlem grubu → Ekran.
`;
  fs.writeFileSync(path.join(outDir, 'CURRENT_MENU_ANALYSIS.md'), body);
}

function writeTargetArchitecture(live, mappingData) {
  const lines = [
    '# Hedef Menü Mimarisi',
    '',
    'KTB ERP menüsü en fazla üç görünür seviye kullanır: **Ana modül → İşlem grubu → Ekran**.',
    '',
    '## Modül sırası',
    '',
  ];
  live.forEach((m, idx) => {
    lines.push(`${idx + 1}. **${m.title}** (\`${m.id}\`)`);
  });
  lines.push('', '## Hiyerarşi', '');
  for (const m of live) {
    lines.push(`### ${m.title}`, '');
    for (const sec of m.sections) {
      lines.push(`#### ${sec.title}`, '');
      for (const sid of sec.screenIds) {
        const sc = m.screens.find((s) => s.id === sid);
        const map = mappingData.mapping.find((r) => r.screenId === sid);
        const why = map && map.oldModuleId !== map.newModuleId
          ? ` _(taşındı: ${map.oldModule} → ${map.newModule})_`
          : '';
        lines.push(`- **${sc?.title || sid}** — \`${sid}\` / \`${sc?.techId || ''}\`${why}`);
      }
      lines.push('');
    }
    const orphans = m.screens.filter((s) => s.hidden || s.deprecated || !m.sections.some((sec) => sec.screenIds.includes(s.id)));
    if (orphans.length) {
      lines.push('Menü dışı (kodda saklanır):');
      orphans.forEach((s) => lines.push(`- ${s.title} (\`${s.id}\`) — hidden/deprecated`));
      lines.push('');
    }
  }
  lines.push(
    '## Neden bu yapı?',
    '',
    '- Ortak ana veriler tek çatıda (Ana Veri); sistem teknik ayarları ayrı (Sistem).',
    '- Cari, Satış ve Satınalma süreçleri ayrı yetki ve belge akışlarıyla kalır.',
    '- Stok operasyonu ile MRP planlama aynı modülde ama ayrı işlem gruplarında.',
    '- Finans muhasebe tanımları / belgeler / nakit / raporlar olarak ayrılır.',
    '- İK süreçleri (özlük, zaman, izin, bordro, işe alım) doğal iş dilinde gruplanır.',
    '',
  );
  fs.writeFileSync(path.join(outDir, 'TARGET_MENU_ARCHITECTURE.md'), lines.join('\n'));
}

function writeScreenMapping(mappingData) {
  const rows = mappingData.mapping;
  const lines = [
    '# Ekran Eşleştirme Envanteri',
    '',
    'Her satır bir ekranın eski/yeni konumunu ve teknik kimliğini gösterir. Teknik ID, endpoint ve ekran ID korunmuştur.',
    '',
    '| Eski ekran | Yeni ekran | Eski modül | Yeni modül | Eski başlık | Yeni başlık | Ekran ID | Teknik ID | Endpoint |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${mdEscape(r.oldTitle)} | ${mdEscape(r.newTitle)} | ${mdEscape(r.oldModule)} | ${mdEscape(r.newModule)} | ${mdEscape(r.oldSection)} | ${mdEscape(r.newSection)} | \`${r.screenId}\` | \`${r.techId}\` | \`${r.endpoint}\` |`,
    );
  }
  lines.push('');
  const rationale = [
    '',
    '## Konum gerekçeleri (özet)',
    '',
    '| Ekran ID | Neden bu modül / başlık? |',
    '|---|---|',
    '| cari-kartlari | Satış ve satınalmanın ortak kullandığı ana veri; ayrı Cari modülü |',
    '| tahsilat-odemeler, cari-ekstre, cari-mutabakat | Cari süreç işlemleri; genel muhasebe belgelerinden ayrı |',
    '| e-belge-kuyruk | Cari/ticari e-belge izleme |',
    '| ülke/para/ölçü/belge tipi… | Ortak ana veri → Ana Veri |',
    '| mesaj-tanimlari | Sistem konfigürasyonu → Sistem > Parametreler |',
    '| stok-depo | Depo-stok bağları → Stok > Depo İşlemleri |',
    '| mrp-* | Tek MRP grubu (Stok); çoğaltılmadı |',
    '| tedarikci-irsaliyeleri | Alış süreci belgesi → Satınalma > Mal Kabul |',
    '| irsaliye-yonetimi / fatura-yonetimi | Satış belgeleri (isim güncellendi, ID aynı) |',
    '| finans-vergi-kodlari | Finans tanımları; vergi-kodlari menü dışı orphan |',
    '| hr-* tanımları | İlgili İK süreç gruplarına dağıtıldı |',
    '| onay-* tanımları | Onay > Tanımlamalar (operasyondan ayrıldı) |',
  ];
  fs.writeFileSync(path.join(outDir, 'SCREEN_MAPPING.md'), lines.concat(rationale).join('\n'));
}

function writeMigrationReport(mappingData, live) {
  const moved = mappingData.mapping.filter((r) => r.oldModuleId !== r.newModuleId);
  const renamed = mappingData.mapping.filter((r) => r.oldTitle !== r.newTitle);
  const sectionChanged = mappingData.mapping.filter(
    (r) => r.oldModuleId === r.newModuleId && r.oldSection !== r.newSection,
  );
  const lines = [
    '# Menü Migrasyon Raporu',
    '',
    '## Yapılan değişiklikler',
    '',
    '1. `fixed-tanimlar` (Sabit Tanımlar) modülü kaldırıldı.',
    '2. Ortak tanımlar `ana-veri` altına işlem gruplarıyla taşındı.',
    '3. `mesaj-tanimlari` → `sistem` / Parametreler.',
    '4. `stok-depo` → `stok` / Depo İşlemleri.',
    '5. Modül içi işlem grupları süreç diline göre yenilendi (Satış, Satınalma, Kalite, İK, Finans, Onay, CRM, Proje).',
    '6. Görünen ekran adları tutarlı Türkçe iş terimlerine çekildi (teknik ID değişmedi).',
    '7. `modulYetkiliMi`: `fixed-tanimlar` yetkisi `ana-veri` ve `sistem` için geriye dönük geçerli.',
    '8. MODULE_TITLE_EN / SECTION_TITLE_EN / MOD_ICONS güncellendi.',
    '',
    '## Korunan teknik kimlikler',
    '',
    '- Ekran ID, techId, endpoint, route/component bağlantıları, CRUD alanları değiştirilmedi.',
    '- Orphan ekranlar (`satin-alma-teklif-istekleri`, `vergi-kodlari`) kodda bırakıldı; menüye alınmadı.',
    '',
    `## Taşınan ekranlar (${moved.length})`,
    '',
    '| Ekran ID | Eski | Yeni |',
    '|---|---|---|',
  ];
  moved.forEach((r) => {
    lines.push(`| \`${r.screenId}\` | ${r.oldModule} / ${r.oldSection || '—'} | ${r.newModule} / ${r.newSection} |`);
  });
  lines.push('', `## Yeniden adlandırılan ekranlar (${renamed.length})`, '', '| Ekran ID | Eski ad | Yeni ad |', '|---|---|---|');
  renamed.forEach((r) => {
    lines.push(`| \`${r.screenId}\` | ${r.oldTitle} | ${r.newTitle} |`);
  });
  lines.push('', `## Aynı modülde başlık değişenler (${sectionChanged.length})`, '');
  lines.push('| Ekran ID | Eski başlık | Yeni başlık |', '|---|---|---|');
  sectionChanged.forEach((r) => {
    lines.push(`| \`${r.screenId}\` | ${r.oldSection || '—'} | ${r.newSection} |`);
  });
  lines.push(
    '',
    '## Geriye dönük uyumluluk',
    '',
    '- Eski screenId ile `findScreen` / sekmeler / favoriler çalışmaya devam eder.',
    '- Route kırılmadı; ekran açılışı screenId üzerinden.',
    '- `fixed-tanimlar` modül yetkisi ana-veri/sistem görünürlüğüne map edilir.',
    '- hidden/deprecated orphan ekranlar silinmedi.',
    '',
    `## Yeni modül sırası: ${live.map((m) => m.title).join(' → ')}`,
    '',
  );
  fs.writeFileSync(path.join(outDir, 'MENU_MIGRATION_REPORT.md'), lines.join('\n'));
}

function writeMissingAndDuplicates(mappingData) {
  const body = `# Eksik ve Mükerrer Ekranlar

## Menüde olmayan (kodda duran) ekranlar

| Ekran ID | Modül (saklama) | Durum | Not |
|---|---|---|---|
| \`satin-alma-teklif-istekleri\` | satinalma | hidden + deprecated | Ayrı RFQ süreci tamamlanana kadar menüye alınmadı |
| \`vergi-kodlari\` | finans | menü dışı | \`finans-vergi-kodlari\` ile aynı işlev ailesi; menüde finans-vergi-kodlari kullanılır |

## Mükerrer / paylaşımlı endpoint adayları

| Konu | Ekranlar | Sonuç |
|---|---|---|
| Vergi kodları | vergi-kodlari, finans-vergi-kodlari | Menüde tek kayıt (finans-vergi-kodlari); diğeri orphan |
| MRP çalışma/sonuç | mrp-calisma, mrp-sonuclar, mrp-hesap | Farklı UX; hepsi Stok > MRP Planlama |
| Üretim girişleri | uretim-girisleri, hizli-uretim-girisi | Farklı giriş deneyimleri; ikisi de Üretim Gerçekleşme |
| İrsaliye/fatura | irsaliye-yonetimi, fatura-yonetimi, tedarikci-irsaliyeleri | Satış vs alış süreçleri; ortak altyapı olabilir, menüde ayrı |

## Excel'de olup kodda gizli olanlar

- Satınalma Teklif İstekleri → kodda var, menü dışı (deprecated).
- Vergi Kodları (Sabit Tanımlar altında Excel kaydı) → finans-vergi-kodlari ile karşılandı.

## Henüz geliştirilmemiş öneriler (menüye eklenmedi)

Bu liste yalnızca ürün yol haritası önerisidir; menüye sahte ekran eklenmedi.

- Satınalma: aktif Teklif İstekleri (RFQ) akışı
- Satış: Satış iade irsaliyesi / iade faturası ayrı ekranları
- Satınalma: Alış iade belgeleri
- Kalite: Üretim içi KK emirleri (proses kontrol)
- Finans: Cari yaşlandırma raporu (cari ekstre yanında)
- Stok: Seri/lot izlenebilirlik raporu
`;
  fs.writeFileSync(path.join(outDir, 'MISSING_AND_DUPLICATE_SCREENS.md'), body);
}

function writeTestReportSkeleton() {
  // Filled later by test runner; placeholder ensures file exists
  fs.writeFileSync(
    path.join(outDir, 'TEST_REPORT.md'),
    '# Test Raporu\n\n_(Otomatik test koşumu sonrası güncellenir.)_\n',
  );
}

function writeExcelAndCsv(live, mappingData) {
  const rows = [['Modül', 'Modül ID', 'İşlem Grubu', 'Grup ID', 'Ekran', 'Ekran ID', 'Teknik ID', 'Endpoint', 'Sıra']];
  let order = 0;
  for (const m of live) {
    for (const sec of m.sections) {
      for (const sid of sec.screenIds) {
        order += 1;
        const sc = m.screens.find((s) => s.id === sid);
        rows.push([
          m.title,
          m.id,
          sec.title,
          sec.id,
          sc?.title || sid,
          sid,
          sc?.techId || '',
          sc?.endpoint || '',
          String(order),
        ]);
      }
    }
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(outDir, 'TARGET_MENU_HIERARCHY.csv'), `\ufeff${csv}`);

  try {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Menü');
    const mapRows = [
      ['Eski Ekran', 'Yeni Ekran', 'Eski Modül', 'Yeni Modül', 'Eski Başlık', 'Yeni Başlık', 'Ekran ID', 'Teknik ID', 'Endpoint'],
      ...mappingData.mapping.map((r) => [
        r.oldTitle, r.newTitle, r.oldModule, r.newModule, r.oldSection, r.newSection, r.screenId, r.techId, r.endpoint,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(mapRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Eşleştirme');
    XLSX.writeFile(wb, path.join(outDir, 'TARGET_MENU_HIERARCHY.xlsx'));
    console.log('Wrote XLSX');
  } catch (err) {
    console.warn('XLSX unavailable, CSV only:', err.message);
  }
}

function main() {
  if (!fs.existsSync(mappingPath)) throw new Error('Run rebuild-menu-architecture.mjs first');
  const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  const src = fs.readFileSync(appPath, 'utf8');
  const live = parseLiveMenu(src);
  fs.mkdirSync(outDir, { recursive: true });
  writeCurrentAnalysis(mappingData, live);
  writeTargetArchitecture(live, mappingData);
  writeScreenMapping(mappingData);
  writeMigrationReport(mappingData, live);
  writeMissingAndDuplicates(mappingData);
  writeTestReportSkeleton();
  writeExcelAndCsv(live, mappingData);
  console.log('Docs written to', outDir);
}

main();
