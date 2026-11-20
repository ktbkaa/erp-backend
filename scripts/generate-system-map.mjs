/**
 * KTB ERP — MODULES envanteri → docs/system/screen-map.json
 * Proxy stub ile app.js sabitlerini/fonksiyonlarını güvenli eval eder.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appJs = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const start = appJs.indexOf('const MODULES = [');
if (start < 0) throw new Error('MODULES bulunamadı');

const fnStub = new Proxy(function stub() { return []; }, {
  apply() { return []; },
  construct() { return {}; },
  get(t, p) {
    if (p === 'prototype') return {};
    if (p === 'length' || p === 'name') return 0;
    return fnStub;
  },
});

const store = {
  console, Array, Object, String, Number, Boolean, Math, Date, JSON, Map, Set, RegExp,
  undefined, parseInt, parseFloat, isNaN, isFinite,
};
const sandbox = new Proxy(store, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === 'symbol') return undefined;
    const name = String(prop);
    if (/FIELDS|TABS|COLS|COLUMNS|FILTERS|OPTIONS|ACTIONS|DEFAULTS/i.test(name) || /^[A-Z][A-Z0-9_]*$/.test(name)) {
      target[prop] = [];
      return target[prop];
    }
    target[prop] = fnStub;
    return fnStub;
  },
  has() { return true; },
  set(t, p, v) { t[p] = v; return true; },
});
vm.createContext(sandbox);

const preamble = appJs.slice(0, start);
const fieldRe = /(?:^|\n)const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/g;
let m;
while ((m = fieldRe.exec(preamble)) !== null) {
  const name = m[1];
  let i = m.index + m[0].length;
  const open = preamble[i];
  if (open !== '[' && open !== '{') continue;
  let depth = 0;
  let end = -1;
  const close = open === '[' ? ']' : '}';
  for (let j = i; j < Math.min(preamble.length, i + 200000); j++) {
    if (preamble[j] === open) depth++;
    else if (preamble[j] === close) {
      depth--;
      if (depth === 0) { end = j + 1; break; }
    }
  }
  if (end < 0) continue;
  const body = preamble.slice(i, end);
  if (/\b[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(body)) continue;
  try { vm.runInContext(`var ${name} = ${body};`, sandbox); } catch (_) { /* ignore */ }
}

let i = start + 'const MODULES = '.length;
let depth = 0;
let end = -1;
for (; i < appJs.length; i++) {
  if (appJs[i] === '[') depth++;
  else if (appJs[i] === ']') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
vm.runInContext(`var MODULES = ${appJs.slice(start + 'const MODULES = '.length, end)};`, sandbox);
const MODULES = sandbox.MODULES;

function normalizeAction(a) {
  if (!a) return {};
  if (typeof a === 'string') return { path: a, label: a };
  return { label: a.label || '', path: a.path || '', method: a.method || '' };
}

function symbolizeLogic(s, actions, lookups) {
  const parts = [];
  const flow = [];
  if (s.readOnly && !s.crud) { parts.push('◎'); flow.push('Liste/Rapor'); }
  else if (s.crud) { parts.push('○→◉'); flow.push('Liste', 'Form'); }
  else { parts.push('○'); flow.push('Liste'); }
  if (s.detailKey || (s.detailFields || []).length) {
    parts.push('◆');
    flow.push(`Detay(${s.detailKey || 'satır'})`);
  }
  if (s.formTabs?.length) {
    parts.push(`▤×${s.formTabs.length}`);
    flow.push(`Sekme×${s.formTabs.length}`);
  }
  if (s.numeratorSeri) {
    parts.push('№');
    flow.push(`Numaratör:${s.numeratorSeri}`);
  }
  for (const a of actions) {
    if (a.kind === 'APPROVE') { parts.push('★'); flow.push(`Onay:${a.label || ''}`); }
    else if (a.kind === 'CONVERT') { parts.push('▷'); flow.push(`Dönüştür:${a.label || ''}`); }
    else if (a.kind?.startsWith('MRP')) { parts.push('⚙'); flow.push(a.kind); }
    else { parts.push('▶'); flow.push(`${a.kind}:${a.label || ''}`); }
  }
  if (lookups.length) {
    const n = [...new Set(lookups.map((l) => l.lookup))].length;
    parts.push(`↗${n}`);
    flow.push(`Lookup×${n}`);
  }
  if (s.sqlConsole) { parts.push('Σ'); flow.push('SQL'); }
  if (s.metaExplorer) { parts.push('ℹ'); flow.push('Meta'); }

  let desc = s.crud && (s.detailKey || (s.detailFields || []).length)
    ? 'Master-detail CRUD: başlık + satırlar.'
    : s.crud ? 'Kart/CRUD: liste + form.'
      : s.readOnly ? 'Salt okunur liste/rapor.'
        : 'Özel ekran.';
  if (actions.some((a) => a.kind === 'APPROVE')) desc += ' Onay ile durum ilerler.';
  if (actions.some((a) => a.kind === 'CONVERT')) desc += ' Belge dönüşümü üretir.';
  if (s.mrpKonsol || actions.some((a) => String(a.kind).startsWith('MRP'))) {
    desc += ' MRP çalıştır / öneri aktarımı.';
  }
  if (s.numeratorSeri) desc += ` Belge no: ${s.numeratorSeri}.`;
  if (typeof s.hint === 'string' && s.hint) desc += ` ${s.hint}`;
  return { symbol: parts.join(' '), flow: flow.join(' → '), desc };
}

const screens = [];
const regions = [];
let skipped = 0;
for (const mod of MODULES) {
  const moduleTitle = mod.title || mod.id;
  const sectionMap = new Map();
  for (const sec of mod.sections || []) {
    for (const sid of sec.screenIds || []) {
      sectionMap.set(sid, { id: sec.id, title: sec.title || sec.id });
    }
    regions.push({
      moduleId: mod.id,
      moduleTitle,
      sectionId: sec.id || '',
      sectionTitle: sec.title || sec.id || '',
      screenIds: [...(sec.screenIds || [])],
    });
  }
  for (const s of mod.screens || []) {
    if (!s || !s.id) { skipped += 1; continue; }
    const sec = sectionMap.get(s.id);
    const lookups = [];
    for (const fields of [s.masterFields, s.detailFields, s.filters]) {
      for (const f of fields || []) {
        if (f && f.lookup) lookups.push({ field: f.key, lookup: f.lookup, label: f.label });
      }
    }
    const actions = [];
    for (const [kind, key] of [
      ['APPROVE', 'approveAction'],
      ['CONVERT', 'convertAction'],
      ['SECONDARY', 'secondaryAction'],
      ['MRP_RUN', 'mrpCalistirAction'],
      ['MRP_TALEP', 'mrpTalepAction'],
      ['MRP_UE', 'mrpUretimAction'],
      ['TCMB', 'tcmbCekAction'],
    ]) {
      if (s[key]) actions.push({ kind, ...normalizeAction(s[key]) });
    }
    const flags = [];
    if (s.crud) flags.push('CRUD');
    if (s.readOnly) flags.push('RO');
    if (s.hidden) flags.push('HIDDEN');
    if (s.mrpKonsol) flags.push('MRP');
    if (s.formTabs?.length) flags.push(`SEKME:${s.formTabs.length}`);
    if (s.detailKey) flags.push(`DETAY:${s.detailKey}`);
    if (s.sqlConsole) flags.push('SQL');
    if (s.metaExplorer) flags.push('META');
    if (s.kullaniciYetkiPaneli) flags.push('YETKI');
    if (s.numeratorSeri) flags.push(`NUM:${s.numeratorSeri}`);
    const logic = symbolizeLogic(s, actions, lookups);
    screens.push({
      moduleId: mod.id,
      moduleTitle,
      sectionId: sec?.id || '',
      sectionTitle: sec?.title || '—',
      id: s.id,
      techId: s.techId || '',
      businessNameEn: s.businessNameEn || '',
      title: s.title || s.id,
      endpoint: s.endpoint || '',
      crud: !!s.crud,
      readOnly: !!s.readOnly,
      hidden: !!s.hidden,
      flags: flags.join(' · '),
      numeratorSeri: s.numeratorSeri || '',
      formTabs: (s.formTabs || []).map((t) => t.title || t.id || t.kind || '').filter(Boolean).join(' | '),
      masterFields: (s.masterFields || []).length,
      detailFields: (s.detailFields || []).length,
      filters: (s.filters || []).length,
      columns: (s.columns || []).length,
      detailKey: s.detailKey || '',
      actions: actions.map((a) => `${a.kind}:${a.label || a.path || ''}`).join(' | '),
      actionPaths: actions
        .map((a) => `${a.method || 'POST'} ${a.path || ''}`.trim())
        .filter((x) => x && x !== 'POST')
        .join(' | '),
      lookups: [...new Set(lookups.map((l) => l.lookup))].join(', '),
      lookupDetail: lookups.map((l) => `${l.field}→${l.lookup}`).join('; '),
      logicSymbol: logic.symbol,
      logicFlow: logic.flow,
      logicDesc: logic.desc,
      hint: typeof s.hint === 'string' ? s.hint : '',
    });
  }
}

const byId = new Map(screens.map((s) => [s.id, s]));
const chains = [
  { region: 'Satınalma', name: 'SA zinciri', steps: ['satinalma-talepleri', 'satin-alma-siparisleri', 'mal-kabuller', 'kk-emirleri-gkk', 'alis-faturalari'], symbol: 'Talep → Sipariş → Mal kabul → GKK → Alış fatura' },
  { region: 'Satış', name: 'Satış zinciri', steps: ['satis-teklifleri', 'sales_orders', 'sevk-emirleri', 'delivery_notes', 'satis-faturalari'], symbol: 'Teklif → Sipariş → Sevk → İrsaliye → Fatura' },
  { region: 'Üretim', name: 'Üretim zinciri', steps: ['urun-agaci', 'rotalar', 'uretim-emirleri', 'uretim-girisi', 'kk-emirleri-ckk'], symbol: 'BOM → Rota → İş emri → Üretim girişi → CKK' },
  { region: 'MRP', name: 'MRP döngüsü', steps: ['mrp-bagimsiz-ihtiyac', 'mrp-calisma', 'mrp-sonuclar', 'satinalma-talepleri', 'uretim-emirleri'], symbol: 'İhtiyaç → MRP → Sonuç → Talep/İE' },
  { region: 'Fason', name: 'Fason operasyon', steps: ['fason-parametreleri', 'fason-operasyonlari', 'fason-siparisleri', 'fason-sevkiyatlar', 'fason-emanet-stok', 'fason-teslimatlar', 'kk-emirleri-gkk', 'fason-tuketimler'], symbol: 'Parametre → Op → Sipariş → Sevk → Emanet → Teslim+GKK → Tüketim' },
  { region: 'Stok', name: 'Stok hareket', steps: ['stok-karti', 'warehouses', 'stok-hareketleri', 'depo-bakiye', 'transfer-emirleri'], symbol: 'Kart → Depo → Hareket → Bakiye / Transfer' },
  { region: 'Kalite', name: 'GKK/CKK', steps: ['kk-kontrol-planlari', 'kk-emirleri-gkk', 'kk-emirleri-ckk', 'kk-ret-nedenleri'], symbol: 'Plan → GKK/CKK emir → Onay/Ret' },
  { region: 'Finans', name: 'Muhasebe', steps: ['muhasebe-hesaplari', 'alis-faturalari', 'satis-faturalari', 'finans-yevmiye', 'finans-mizan', 'banka-mutabakat', 'finans-yaslandirma'], symbol: 'Hesap → Fatura → Yevmiye/Mizan → Mutabakat/Yaşlandırma' },
  { region: 'CRM', name: 'CRM hunisi', steps: ['crm-adaylar', 'crm-firsatlar', 'satis-teklifleri', 'sales_orders'], symbol: 'Aday → Fırsat → Teklif → Sipariş' },
  { region: 'Onay', name: 'Onay omurgası', steps: ['onay-rotalari', 'onay-kurallari', 'onaylarim', 'onay-gecmisi'], symbol: 'Rota → Kural → Onaylarım → Geçmiş' },
  { region: 'HR', name: 'İK bordro', steps: ['hr-employees', 'hr-timesheets', 'hr-payroll-runs'], symbol: 'Personel → Puantaj → Bordro' },
  { region: 'PRJ', name: 'Proje', steps: ['prj-projects', 'prj-work-items', 'prj-time-entries'], symbol: 'Proje → İş kalemi → Zaman' },
];
for (const c of chains) {
  c.stepTitles = c.steps.map((id) => byId.get(id)?.title || id);
  c.missing = c.steps.filter((id) => !byId.has(id));
}

const features = [
  { alan: 'Platform', ozellik: 'JWT auth + AUTH_ZORUNLU', durum: 'Canlı', not: 'Prod zorunlu; ERP_AUTH_SOFT lokal' },
  { alan: 'Platform', ozellik: 'Çok firma izolasyonu', durum: 'Canlı', not: 'X-Firma-Id + requireCompanyRecord' },
  { alan: 'Platform', ozellik: 'Numaratör / belge no', durum: 'Canlı', not: 'kod-serileri' },
  { alan: 'Platform', ozellik: 'Lookup popup / liste', durum: 'Canlı', not: 'Ekranlar arası lookup' },
  { alan: 'Platform', ozellik: 'Onay motoru', durum: 'Canlı', not: 'Rota + kural + onaylarım' },
  { alan: 'Platform', ozellik: 'Audit log', durum: 'Canlı', not: 'İstek/alan farkı' },
  { alan: 'Stok', ozellik: 'Lot / seri / rezervasyon', durum: 'Canlı', not: 'BUG-008 lot çıkış koruması' },
  { alan: 'Stok', ozellik: 'Depo bakiye + transfer + sayım', durum: 'Canlı', not: '' },
  { alan: 'Kalite', ozellik: 'GKK / CKK emir + onay', durum: 'Canlı', not: 'Mal kabul / üretim / fason' },
  { alan: 'Üretim', ozellik: 'BOM + rota + iş emri + giriş', durum: 'Canlı', not: '' },
  { alan: 'Üretim', ozellik: 'MRP konsol', durum: 'Canlı', not: 'Öneri → talep / İE' },
  { alan: 'Fason', ozellik: 'Emanet + sevk + teslim + GKK kapısı', durum: 'Canlı', not: 'qc_on_receipt / block_production_until_qc' },
  { alan: 'Satınalma', ozellik: 'Talep→PO→mal kabul→3-way→fatura', durum: 'Canlı', not: 'ALIS_3WAY_ZORUNLU' },
  { alan: 'Satış', ozellik: 'Teklif→sipariş→irsaliye→fatura', durum: 'Canlı', not: '' },
  { alan: 'Finans', ozellik: 'Yevmiye / mizan / yaşlandırma', durum: 'Canlı', not: '' },
  { alan: 'Finans', ozellik: 'Banka mutabakat + CSV', durum: 'Canlı', not: 'P2' },
  { alan: 'Finans', ozellik: 'Sabit kıymet / GL bütçe', durum: 'İskelet', not: 'P2' },
  { alan: 'Finans', ozellik: 'Canlı GİB e-belge', durum: 'Dış kapsam', not: 'GIB_CANLI=Hayır' },
  { alan: 'CRM', ozellik: 'Aday / fırsat / aktivite', durum: 'Canlı', not: '' },
  { alan: 'HR', ozellik: 'Personel / puantaj / bordro kuralları', durum: 'Canlı', not: 'TR parametre' },
  { alan: 'PRJ', ozellik: 'Proje / iş kalemi / zaman', durum: 'Canlı', not: '' },
  { alan: 'Bakım', ozellik: 'Bakım emirleri (CMMS hafif)', durum: 'İskelet', not: 'P2' },
];

const outDir = path.join(root, 'docs/system');
fs.mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  timezone: 'Europe/Istanbul',
  totalScreens: screens.length,
  skipped,
  totalModules: MODULES.length,
  legend: {
    '○': 'Liste', '◉': 'Form', '◆': 'Detay satır', '▤': 'Sekme', '№': 'Numaratör',
    '★': 'Onay', '▷': 'Belge dönüşümü', '▶': 'Aksiyon', '⚙': 'MRP',
    '↗': 'Lookup bağlantısı', '◎': 'Rapor/RO', 'Σ': 'SQL', 'ℹ': 'Meta',
  },
  modules: MODULES.map((mod) => ({
    id: mod.id,
    title: mod.title || mod.id,
    sections: (mod.sections || []).map((s) => ({
      id: s.id, title: s.title, screenIds: s.screenIds || [],
    })),
    screenCount: (mod.screens || []).filter((x) => x && x.id).length,
  })),
  regions,
  chains,
  features,
  screens,
};
fs.writeFileSync(path.join(outDir, 'screen-map.json'), JSON.stringify(payload, null, 2), 'utf8');
console.log(JSON.stringify({
  totalScreens: screens.length,
  skipped,
  modules: MODULES.length,
  regions: regions.length,
}));
