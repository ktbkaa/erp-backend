/**
 * UBL-TR kod listeleri. Kaynak: GİB e-Fatura paketi `schematron/UBL-TR_Codelist.xml`
 * (schemas/ubl-tr/schematron). Liste dosyadan okunur; GİB güncellediğinde dosyayı değiştirmek yeterli.
 */
const fs = require('fs');
const path = require('path');

const CODELIST_PATH = path.join(__dirname, '../../../schemas/ubl-tr/schematron/UBL-TR_Codelist.xml');

function parseCodelist(xml) {
  const out = {};
  const re = /<sch:let\s+name="([^"]+)"\s+value\s*=\s*"'([^']*)'"\s*\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    out[m[1]] = new Set(m[2].split(',').map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

let cache = null;
function lists() {
  if (!cache) cache = parseCodelist(fs.readFileSync(CODELIST_PATH, 'utf8'));
  return cache;
}

function has(listName, code) {
  const l = lists()[listName];
  return Boolean(l && l.has(String(code)));
}

const TAX_TYPE_NAMES = Object.freeze({
  '0015': 'KDV',
  '9015': 'KDV TEVKİFAT',
  '0003': 'GV STOPAJI',
  '0011': 'KV STOPAJI',
  '0021': 'BSMV',
  '0059': 'KONAKLAMA VERGİSİ',
  '0061': 'KKDF',
  '0071': 'ÖTV 1. LİSTE',
  '0073': 'ÖTV 3. LİSTE',
  '0074': 'ÖTV 4. LİSTE',
  '0075': 'ÖTV 3A LİSTE',
  '0076': 'ÖTV 3B LİSTE',
  '0077': 'ÖTV 3C LİSTE',
  '1047': 'DAMGA VERGİSİ',
  '4080': 'ÖZEL İLETİŞİM VERGİSİ',
});

const WITHHOLDING_NAMES = Object.freeze({
  601: 'Yapım işleri ile bu işlerle birlikte ifa edilen mühendislik-mimarlık ve etüt-proje hizmetleri',
  602: 'Etüt, plan-proje, danışmanlık, denetim ve benzeri hizmetler',
  603: 'Makine, teçhizat, demirbaş ve taşıtlara ait tadil, bakım ve onarım hizmetleri',
  604: 'Yemek servis hizmeti',
  605: 'Organizasyon hizmeti',
  606: 'İşgücü temin hizmetleri',
  607: 'Özel güvenlik hizmeti',
  608: 'Yapı denetim hizmetleri',
  609: 'Fason tekstil ve konfeksiyon, çanta ve ayakkabı dikim işleri',
  610: 'Turistik mağazalara verilen müşteri bulma/götürme hizmetleri',
  611: 'Spor kulüplerinin yayın, reklam ve isim hakkı gelirleri',
  612: 'Temizlik hizmeti',
  613: 'Çevre ve bahçe bakım hizmetleri',
  614: 'Servis taşımacılığı hizmeti',
  615: 'Her türlü baskı ve basım hizmetleri',
  616: 'Diğer hizmetler',
  617: 'Hurda metalden elde edilen külçe teslimleri',
  618: 'Hurda dışı bakır, çinko, alüminyum külçe teslimleri',
  619: 'Bakır, çinko, alüminyum ve kurşun ürünlerinin teslimi',
  620: 'İstisnadan vazgeçenlerin hurda ve atık teslimi',
  621: 'Hurda ve atıklardan elde edilen hammadde teslimi',
  622: 'Pamuk, tiftik, yün, yapağı, ham post ve deri teslimleri',
  623: 'Ağaç ve orman ürünleri teslimi',
  624: 'Yük taşımacılığı hizmeti',
  625: 'Ticari reklam hizmetleri',
  626: 'Diğer teslimler',
  627: 'Demir-çelik ürünlerinin teslimi',
});

const EXEMPTION_NAMES = Object.freeze({
  301: '11/1-a Mal ihracatı',
  302: '11/1-a Hizmet ihracatı',
  350: 'Diğerleri',
  351: 'KDV - İstisna Olmayan Diğer',
  701: '3065 s. KDV K. 11/1-c md. kapsamındaki ihraç kayıtlı satış',
  702: 'DİİB ve geçici kabul rejimi kapsamındaki satışlar',
  703: '4760 s. ÖTV K. 8/2 md. kapsamındaki ihraç kayıtlı satış',
});

/** ERP ölçü birimi → UN/ECE Rec.20 (GİB UnitCodeList). */
const UNIT_MAP = Object.freeze({
  AD: 'C62', ADET: 'C62', ADT: 'C62', PCS: 'C62', EA: 'C62', C62: 'C62',
  KG: 'KGM', KGM: 'KGM', KILO: 'KGM',
  GR: 'GRM', G: 'GRM', GRM: 'GRM',
  TON: 'TNE', TNE: 'TNE', T: 'TNE',
  LT: 'LTR', L: 'LTR', LITRE: 'LTR', LTR: 'LTR',
  ML: 'MLT', MLT: 'MLT',
  M: 'MTR', MT: 'MTR', METRE: 'MTR', MTR: 'MTR',
  CM: 'CMT', CMT: 'CMT', MM: 'MMT', MMT: 'MMT',
  M2: 'MTK', MTK: 'MTK', M3: 'MTQ', MTQ: 'MTQ',
  PK: 'PA', PAKET: 'PA', PA: 'PA',
  KUTU: 'BX', BX: 'BX', KOLI: 'CT', CT: 'CT',
  SET: 'SET', CIFT: 'PR', PR: 'PR', DUZINE: 'DZN', DZN: 'DZN',
  SAAT: 'HUR', SA: 'HUR', HUR: 'HUR', DK: 'D61', GUN: 'DAY', DAY: 'DAY',
  AY: 'MON', MON: 'MON', YIL: 'ANN', ANN: 'ANN',
  KWH: 'KWH', MWH: 'MWH',
});

function normalizeAscii(s) {
  return String(s || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/İ/g, 'I')
    .replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U')
    .replace(/[^A-Z0-9]/g, '');
}

function unitCode(uom) {
  const key = normalizeAscii(uom);
  if (!key) return 'C62';
  if (UNIT_MAP[key]) return UNIT_MAP[key];
  if (has('UnitCodeList', key)) return key;
  return null;
}

/** Tevkifat kodu için GİB listesindeki geçerli oranlar (WithholdingTaxTypeWithPercent). */
function withholdingPercents(code) {
  const c = String(code);
  const out = [];
  for (const v of lists().WithholdingTaxTypeWithPercent || []) {
    if (v.startsWith(c) && v.length > c.length) out.push(Number(v.slice(c.length)));
  }
  return out;
}

function defaultWithholdingPercent(code) {
  const p = withholdingPercents(code);
  return p.length ? p[p.length - 1] : null;
}

function exemptionReasonText(code, fallback) {
  if (fallback && String(fallback).trim()) return String(fallback).trim();
  return EXEMPTION_NAMES[code] || `İstisna/muafiyet kodu ${code}`;
}

module.exports = {
  CODELIST_PATH,
  lists,
  has,
  parseCodelist,
  unitCode,
  normalizeAscii,
  withholdingPercents,
  defaultWithholdingPercent,
  exemptionReasonText,
  TAX_TYPE_NAMES,
  WITHHOLDING_NAMES,
  EXEMPTION_NAMES,
};
