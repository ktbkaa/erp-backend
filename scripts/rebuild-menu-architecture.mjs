#!/usr/bin/env node
/**
 * Rebuild MODULES sections/order/titles from declarative architecture.
 * Preserves each screen object body (id/techId/endpoint/logic) verbatim.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'public/app.js');

/** @type {Array<{id:string,title:string,sections:Array<{id:string,title:string,screenIds:string[]}>,titleOverrides?:Record<string,string>}>} */
const ARCHITECTURE = [
  {
    id: 'ana-veri',
    title: 'Ana Veri',
    titleOverrides: {
      'odeme-kosulu-tanimi': 'Ödeme Koşulları',
      'teslimat-kosulu-tanimi': 'Teslimat Koşulları',
      'banka-tanimi': 'Bankalar',
      'sehir-tanimi': 'Şehir / İl',
      'country-tanimi': 'Ülkeler',
      'para-birimi-tanimi': 'Para Birimleri',
      'dil-tanimi': 'Diller',
      'doviz-exchange_rate-tanimi': 'Döviz Kurları',
      'numarator-tanimi': 'Numaratörler',
    },
    sections: [
      { id: 'organizasyon', title: 'Organizasyon', screenIds: ['companies', 'is-yerleri', 'warehouses'] },
      { id: 'cografya', title: 'Coğrafya', screenIds: ['country-tanimi', 'sehir-tanimi'] },
      { id: 'olcu-dil', title: 'Ölçü ve Dil', screenIds: ['olcu-birimleri', 'dil-tanimi'] },
      { id: 'para-kur', title: 'Para ve Kur', screenIds: ['para-birimi-tanimi', 'doviz-exchange_rate-tanimi', 'banka-tanimi'] },
      {
        id: 'ticari-tanimlar',
        title: 'Ticari Tanımlamalar',
        screenIds: [
          'odeme-kosulu-tanimi',
          'teslimat-kosulu-tanimi',
          'belge-tipleri',
          'hareket-kodlari',
          'kategori-tip-tanimi',
          'kategori-tanimi',
        ],
      },
      { id: 'numarator', title: 'Numaratör', screenIds: ['numarator-tanimi'] },
    ],
  },
  {
    id: 'cari',
    title: 'Cari',
    titleOverrides: {
      'tahsilat-odemeler': 'Tahsilat ve Ödemeler',
      'e-belge-kuyruk': 'e-Belge Kuyruğu',
    },
    sections: [
      { id: 'kartlar', title: 'Cari Kartlar', screenIds: ['cari-kartlari'] },
      { id: 'islemler', title: 'Cari İşlemler', screenIds: ['tahsilat-odemeler', 'cari-ekstre', 'cari-mutabakat'] },
      { id: 'e-belge', title: 'e-Belge', screenIds: ['e-belge-kuyruk'] },
    ],
  },
  {
    id: 'stok',
    title: 'Stok',
    titleOverrides: {
      'stok-karti': 'Stok Kartları',
      'depo-bakiye': 'Depo Bakiyeleri',
      'stok-depo': 'Depo Stok Bağları',
      'mrp-parametre': 'MRP Parametreleri',
      'mrp-calisma': 'MRP Konsol',
      'mrp-hesap': 'MRP Anlık Hesap',
      'mrp-sonuclar': 'MRP Sonuçları',
    },
    sections: [
      { id: 'kartlar', title: 'Stok Kartları', screenIds: ['stok-karti'] },
      { id: 'hareketler', title: 'Stok Hareketleri', screenIds: ['stok-hareketleri', 'stok-hareket-raporu', 'depo-bakiye'] },
      { id: 'depo-islemleri', title: 'Depo İşlemleri', screenIds: ['transfer-emirleri', 'sayim-belgeleri', 'stok-depo'] },
      {
        id: 'parti-seri',
        title: 'Parti, Seri ve Rezervasyon',
        screenIds: ['stok-partileri', 'stok-serileri', 'stok-rezervasyonlari', 'stok-ikame'],
      },
      {
        id: 'mrp',
        title: 'MRP Planlama',
        screenIds: [
          'mrp-parametre',
          'mrp-bagimsiz-ihtiyac',
          'mrp-calisma',
          'mrp-hesap',
          'mrp-sonuclar',
          'mrp-hareket-raporu',
        ],
      },
    ],
  },
  {
    id: 'satinalma',
    title: 'Satınalma',
    titleOverrides: {
      'tedarikci-irsaliyeleri': 'Alış İrsaliyeleri',
      'giris-kontrolleri': 'Giriş Kontrolleri',
    },
    sections: [
      { id: 'talepler', title: 'Talepler', screenIds: ['satin-alma-talepleri'] },
      { id: 'teklif', title: 'Teklif ve Anlaşmalar', screenIds: ['satin-alma-teklifleri', 'satin-alma-anlasmalari'] },
      { id: 'siparis', title: 'Siparişler', screenIds: ['satin-alma-siparisleri'] },
      {
        id: 'mal-kabul',
        title: 'Mal Kabul',
        screenIds: ['mal-kabuller', 'tedarikci-irsaliyeleri', 'giris-kontrolleri'],
      },
    ],
  },
  {
    id: 'satis',
    title: 'Satış',
    titleOverrides: {
      'irsaliye-yonetimi': 'Satış İrsaliyeleri',
      'fatura-yonetimi': 'Satış Faturaları',
    },
    sections: [
      { id: 'teklif', title: 'Teklifler', screenIds: ['satis-teklifleri'] },
      { id: 'siparis', title: 'Siparişler', screenIds: ['satis-siparisleri'] },
      { id: 'sevkiyat', title: 'Sevkiyat', screenIds: ['sevk-emirleri'] },
      { id: 'belgeler', title: 'Satış Belgeleri', screenIds: ['irsaliye-yonetimi', 'fatura-yonetimi'] },
    ],
  },
  {
    id: 'uretim',
    title: 'Üretim',
    titleOverrides: {
      'bom-patlatma': 'Ürün Ağacı Patlatma',
      'bom-level-listesi': 'Ürün Ağacı Seviye Listesi',
      'bom-malzeme-degisikligi': 'Malzeme Değişikliği',
      'siparis-is-emri': 'Siparişten İş Emri',
      'uretim-girisleri': 'Operasyonel Üretim Girişi',
    },
    sections: [
      {
        id: 'urun-agaci',
        title: 'Ürün Ağacı',
        screenIds: ['urun-agaci', 'bom-patlatma', 'bom-level-listesi', 'bom-malzeme-degisikligi'],
      },
      { id: 'planlama', title: 'Üretim Planlama', screenIds: ['uretim-planlari'] },
      { id: 'is-emri', title: 'İş Emirleri', screenIds: ['uretim-emirleri', 'siparis-is-emri', 'toplu-is-emri'] },
      {
        id: 'gerceklesme',
        title: 'Üretim Gerçekleşme',
        screenIds: ['uretim-girisleri', 'hizli-uretim-girisi'],
      },
      { id: 'kapasite', title: 'Kapasite', screenIds: ['is-merkezi-yuku'] },
      {
        id: 'tanimlamalar',
        title: 'Tanımlamalar',
        screenIds: [
          'sinif-tanimi',
          'is-merkezleri',
          'is-istasyonlari',
          'routings',
          'uretim-emri-tipleri',
          'uretim-parametreleri',
          'uretim-parametre-dogrulama',
        ],
      },
    ],
  },
  {
    id: 'kalite',
    title: 'Kalite',
    titleOverrides: {
      'kk-emirleri-gkk': 'Giriş Kalite Emirleri',
      'kk-emirleri-ckk': 'Çıkış Kalite Emirleri',
      'kk-uygunsuzluklar': 'Uygunsuzluklar',
      'kk-capa': 'CAPA',
      'kk-kontrol-planlari': 'Kontrol Planları',
      'kk-stok-planlari': 'Stok Plan Bağları',
      'kk-ret-nedenleri': 'Ret Nedenleri',
    },
    sections: [
      { id: 'giris-kk', title: 'Giriş Kalite', screenIds: ['kk-emirleri-gkk'] },
      { id: 'cikis-kk', title: 'Çıkış Kalite', screenIds: ['kk-emirleri-ckk'] },
      { id: 'uygunsuzluk', title: 'Uygunsuzluk ve CAPA', screenIds: ['kk-uygunsuzluklar', 'kk-capa'] },
      {
        id: 'tanimlamalar',
        title: 'Tanımlamalar',
        screenIds: ['kk-kontrol-planlari', 'kk-stok-planlari', 'kk-ret-nedenleri'],
      },
    ],
  },
  {
    id: 'finans',
    title: 'Finans',
    titleOverrides: {
      'finans-vergi-kodlari': 'Vergi Kodları',
      'finans-bilanco': 'Bilanço',
      'fatura-kontrolleri': 'Fatura Kontrolleri',
    },
    sections: [
      {
        id: 'tanimlamalar',
        title: 'Muhasebe Tanımlamaları',
        screenIds: [
          'hesap-plani',
          'hesap-belirleme-kurallari',
          'finans-vergi-kodlari',
          'finans-ulke-paketleri',
          'mali-yillar',
          'muhasebe-donemleri',
          'fiyat-listeleri',
        ],
      },
      { id: 'belgeler', title: 'Muhasebe Belgeleri', screenIds: ['muhasebe-belgeleri', 'fatura-kontrolleri'] },
      {
        id: 'nakit',
        title: 'Banka ve Kasa',
        screenIds: ['finans-banka-hesaplari', 'finans-kasa-hesaplari', 'finans-nakit-hareketleri'],
      },
      {
        id: 'raporlar',
        title: 'Finansal Raporlar',
        screenIds: ['mizan', 'finans-yevmiye', 'finans-bilanco', 'finans-gelir-tablosu', 'kokpit'],
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    sections: [
      { id: 'musteri', title: 'Müşteri Yönetimi', screenIds: ['crm-adaylar', 'crm-kontaklar', 'crm-firsatlar'] },
      {
        id: 'faaliyet',
        title: 'Faaliyet ve Görevler',
        screenIds: ['crm-faaliyet-planlari', 'crm-faaliyetler', 'crm-gorevler', 'crm-ajanda'],
      },
      { id: 'tanimlamalar', title: 'Tanımlamalar', screenIds: ['crm-firsat-asamalari', 'crm-faaliyet-tipleri'] },
    ],
  },
  {
    id: 'proje',
    title: 'Proje Yönetimi',
    titleOverrides: {
      'prj-projeler': 'Projeler',
      'prj-isler': 'İşler',
      'prj-dashboard': 'Proje Özeti',
      'prj-portfolio': 'Portföy Özeti',
      'prj-board': 'Kanban',
      'prj-gantt': 'Gantt / Zaman Çizelgesi',
      'prj-workload': 'Kaynak İş Yükü',
      'prj-butce': 'Proje Bütçesi',
      'prj-sablonlar': 'Proje Şablonları',
      'prj-automations': 'Otomasyon Kuralları',
    },
    sections: [
      {
        id: 'projeler',
        title: 'Proje ve Portföy',
        screenIds: ['prj-projeler', 'prj-isler', 'prj-dashboard', 'prj-portfolio'],
      },
      {
        id: 'agile',
        title: 'Agile ve Planlama',
        screenIds: ['prj-board', 'prj-backlog', 'prj-sprintler', 'prj-gantt', 'prj-workload'],
      },
      { id: 'butce-risk', title: 'Bütçe ve Risk', screenIds: ['prj-butce', 'prj-riskler'] },
      { id: 'otomasyon', title: 'Şablon ve Otomasyon', screenIds: ['prj-sablonlar', 'prj-automations'] },
      {
        id: 'tanimlamalar',
        title: 'Tanımlamalar',
        screenIds: [
          'prj-project-types',
          'prj-project-categories',
          'prj-project-statuses',
          'prj-project-priorities',
          'prj-work-item-types',
          'prj-work-item-statuses',
          'prj-work-item-priorities',
          'prj-project-roles',
          'prj-relation-types',
        ],
      },
    ],
  },
  {
    id: 'insan-kaynaklari',
    title: 'İnsan Kaynakları',
    titleOverrides: {
      'hr-personel': 'Personel Kartları',
      'hr-onboarding': 'İşe Giriş Görevleri',
      'hr-cikis-nedenleri': 'Çıkış Nedenleri',
    },
    sections: [
      { id: 'ozluk', title: 'Özlük', screenIds: ['hr-personel'] },
      { id: 'organizasyon', title: 'Organizasyon', screenIds: ['hr-departmanlar', 'hr-pozisyonlar'] },
      {
        id: 'zaman',
        title: 'Zaman ve Devam',
        screenIds: [
          'hr-calisma-takvimleri',
          'hr-vardiyalar',
          'hr-vardiya-atamalari',
          'hr-puantaj',
          'hr-resmi-tatiller',
        ],
      },
      {
        id: 'izin',
        title: 'İzin Yönetimi',
        screenIds: ['hr-izin-turleri', 'hr-izin-talepleri', 'hr-izin-bakiyeleri'],
      },
      {
        id: 'bordro',
        title: 'Ücret ve Bordro',
        screenIds: [
          'hr-ucretler',
          'hr-avanslar',
          'hr-bordro-parametreleri',
          'hr-bordro-donemleri',
          'hr-bordro-calismalari',
        ],
      },
      {
        id: 'ise-alim',
        title: 'İşe Alım ve Çıkış',
        screenIds: [
          'hr-is-ilanlari',
          'hr-adaylar',
          'hr-onboarding',
          'hr-zimmetler',
          'hr-isten-cikis',
          'hr-cikis-nedenleri',
        ],
      },
    ],
  },
  {
    id: 'onay',
    title: 'Onay Yönetimi',
    titleOverrides: {
      'onay-role-tanim': 'Onay Rolleri',
      'onay-kural-tanim': 'Onay Kuralları',
      'onay-rota-tanim': 'Onay Rotaları',
      'onay-message-template': 'Onay Mesaj Şablonları',
      'onay-status-tanim': 'Onay Durumları',
    },
    sections: [
      { id: 'operasyon', title: 'Onay İşlemleri', screenIds: ['onaylarim', 'onay-izleme', 'onay-yetki-devri'] },
      {
        id: 'tanimlamalar',
        title: 'Tanımlamalar',
        screenIds: [
          'onay-role-tanim',
          'onay-kural-tanim',
          'onay-rota-tanim',
          'onay-message-template',
          'onay-status-tanim',
          'onay-modul-kullanimlari',
        ],
      },
    ],
  },
  {
    id: 'sistem',
    title: 'Sistem',
    titleOverrides: {
      'zorunlu-alan-tanimlari': 'Zorunlu Alanlar',
      'mesaj-tanimlari': 'Mesaj Tanımları',
      'sayfa-sorgulari': 'Sayfa Sorguları',
    },
    sections: [
      { id: 'kullanicilar', title: 'Kullanıcılar ve Yetkiler', screenIds: ['kullanicilar', 'kullanici-gruplari'] },
      {
        id: 'parametreler',
        title: 'Parametreler',
        screenIds: ['sistem-parametreleri', 'zorunlu-alan-tanimlari', 'mesaj-tanimlari'],
      },
      { id: 'iletisim', title: 'İletişim', screenIds: ['eposta-gonderimleri'] },
      { id: 'guncelleme', title: 'Güncelleme', screenIds: ['sistem-guncelleme'] },
      {
        id: 'gozlem',
        title: 'Teknik Gözlem',
        screenIds: ['audit-log', 'tablo-bilgileri', 'sql-sorgu', 'sayfa-sorgulari'],
      },
    ],
  },
];

/** Screens kept in code but intentionally out of menu (must be hidden/deprecated). */
const ORPHAN_KEEP = {
  'satin-alma-teklif-istekleri': 'satinalma',
  'vergi-kodlari': 'finans',
};

/** Ensure orphan screen objects stay out of moduleMenuSections leftovers. */
function ensureOrphanFlags(screenObj, screenId) {
  if (!ORPHAN_KEEP[screenId]) return screenObj;
  if (/hidden:\s*true/.test(screenObj) && /deprecated:\s*true/.test(screenObj)) return screenObj;
  if (/hidden:\s*true/.test(screenObj)) {
    return screenObj.replace(/hidden:\s*true,?/, 'hidden: true,\n        deprecated: true,');
  }
  return screenObj.replace(
    /title:\s*(?:'[^']*'|"[^"]*"),/,
    (m) => `${m}\n        hidden: true,\n        deprecated: true,`,
  );
}

function skipStrings(text, p) {
  const q = text[p];
  p += 1;
  while (p < text.length) {
    if (text[p] === '\\') {
      p += 2;
      continue;
    }
    if (text[p] === q) return p;
    p += 1;
  }
  return p;
}

function extractArraySlice(src, startKeyword) {
  const start = src.indexOf(startKeyword);
  if (start < 0) throw new Error(`Missing ${startKeyword}`);
  const i = src.indexOf('[', start);
  let depth = 0;
  for (let p = i; p < src.length; p += 1) {
    const c = src[p];
    if (c === '"' || c === "'" || c === '`') {
      p = skipStrings(src, p);
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return { start: i, end: p + 1, text: src.slice(i, p + 1) };
    }
  }
  throw new Error('Unclosed MODULES array');
}

function splitTopObjects(arrayText) {
  const out = [];
  let depth = 0;
  let objStart = -1;
  for (let p = 1; p < arrayText.length - 1; p += 1) {
    const c = arrayText[p];
    if (c === '"' || c === "'" || c === '`') {
      p = skipStrings(arrayText, p);
      continue;
    }
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

function extractScreensArray(moduleBlock) {
  const key = moduleBlock.indexOf('screens:');
  if (key < 0) return { start: -1, end: -1, objects: [] };
  const i = moduleBlock.indexOf('[', key);
  let depth = 0;
  let end = -1;
  for (let p = i; p < moduleBlock.length; p += 1) {
    const c = moduleBlock[p];
    if (c === '"' || c === "'" || c === '`') {
      p = skipStrings(moduleBlock, p);
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        end = p + 1;
        break;
      }
    }
  }
  const arr = moduleBlock.slice(i, end);
  return { start: i, end, objects: splitTopObjects(arr) };
}

function setScreenTitle(screenObj, newTitle) {
  const safe = newTitle.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return screenObj.replace(/title:\s*(?:'[^']*'|"[^"]*")/, `title: '${safe}'`);
}

function formatScreen(obj, indentLevel = 6) {
  const pad = ' '.repeat(indentLevel);
  const lines = obj.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let minIndent = Infinity;
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i].trim()) continue;
    const cur = (lines[i].match(/^\s*/) || [''])[0].length;
    if (cur < minIndent) minIndent = cur;
  }
  if (!Number.isFinite(minIndent)) minIndent = 0;
  return lines
    .map((line, i) => {
      if (i === 0) return pad + line.trimStart();
      if (!line.trim()) return '';
      return pad + line.slice(Math.min(minIndent, (line.match(/^\s*/) || [''])[0].length));
    })
    .join('\n');
}

function buildModuleSource(modArch, screenMap, orphansForModule) {
  const lines = [];
  lines.push('  {');
  lines.push(`    id: '${modArch.id}',`);
  lines.push(`    title: '${modArch.title}',`);
  lines.push('    sections: [');
  for (const sec of modArch.sections) {
    const ids = sec.screenIds.map((id) => `'${id}'`).join(', ');
    lines.push('      {');
    lines.push(`        id: '${sec.id}',`);
    lines.push(`        title: '${sec.title}',`);
    lines.push(`        screenIds: [${ids}],`);
    lines.push('      },');
  }
  lines.push('    ],');
  lines.push('    screens: [');

  const orderedIds = [];
  const seen = new Set();
  for (const sec of modArch.sections) {
    for (const id of sec.screenIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      orderedIds.push(id);
    }
  }
  for (const id of orphansForModule) {
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  }

  for (const id of orderedIds) {
    let obj = screenMap.get(id);
    if (!obj) throw new Error(`Screen object missing for ${id}`);
    obj = ensureOrphanFlags(obj, id);
    const override = modArch.titleOverrides?.[id];
    if (override) obj = setScreenTitle(obj, override);
    lines.push(`${formatScreen(obj, 6)},`);
  }
  lines.push('    ],');
  lines.push('  },');
  return lines.join('\n');
}

function main() {
  const src = fs.readFileSync(appPath, 'utf8');
  const { end, text: modulesText } = extractArraySlice(src, 'const MODULES =');
  const moduleBlocks = splitTopObjects(modulesText);

  const screenMap = new Map();
  const oldPlacement = [];
  for (const block of moduleBlocks) {
    const modId = getStr(block, 'id');
    const modTitle = getStr(block, 'title');
    const { objects } = extractScreensArray(block);
    const sectionMeta = [];
    const secMatch = block.match(/sections:\s*\[([\s\S]*?)\],\s*screens:/);
    const sectionScreenIds = [];
    if (secMatch) {
      for (const so of splitTopObjects(`[${secMatch[1]}]`)) {
        const sid = getStr(so, 'id');
        const st = getStr(so, 'title');
        const sm = so.match(/screenIds:\s*\[([^\]]*)\]/);
        const sids = sm ? [...sm[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
        sectionMeta.push({ id: sid, title: st, screenIds: sids });
        sectionScreenIds.push(...sids);
      }
    }
    for (const obj of objects) {
      const sid = getStr(obj, 'id');
      const stitle = getStr(obj, 'title');
      const techId = getStr(obj, 'techId');
      const endpoint = getStr(obj, 'endpoint');
      if (!sid) continue;
      if (screenMap.has(sid)) console.warn('Duplicate screen id while parsing:', sid);
      screenMap.set(sid, obj);
      const sec = sectionMeta.find((s) => s.screenIds.includes(sid));
      oldPlacement.push({
        screenId: sid,
        oldTitle: stitle,
        oldModuleId: modId,
        oldModule: modTitle,
        oldSectionId: sec?.id || '',
        oldSection: sec?.title || (modId === 'fixed-tanimlar' ? '(düz liste)' : ''),
        techId,
        endpoint,
        inMenu: sectionScreenIds.includes(sid) || modId === 'fixed-tanimlar',
      });
    }
  }

  const archIds = new Set();
  for (const m of ARCHITECTURE) {
    for (const s of m.sections) {
      for (const id of s.screenIds) {
        if (!screenMap.has(id)) throw new Error(`Architecture references unknown screen: ${id}`);
        if (archIds.has(id)) throw new Error(`Screen listed twice in architecture: ${id}`);
        archIds.add(id);
      }
    }
  }
  for (const id of Object.keys(ORPHAN_KEEP)) {
    if (!screenMap.has(id)) throw new Error(`Orphan keep missing: ${id}`);
  }
  for (const id of screenMap.keys()) {
    if (ORPHAN_KEEP[id]) continue;
    if (!archIds.has(id)) throw new Error(`Screen not placed in new architecture: ${id}`);
  }

  const orphansByModule = {};
  for (const [sid, mid] of Object.entries(ORPHAN_KEEP)) {
    if (!orphansByModule[mid]) orphansByModule[mid] = [];
    orphansByModule[mid].push(sid);
  }

  const rebuilt = [
    'const MODULES = [',
    ...ARCHITECTURE.map((m) => buildModuleSource(m, screenMap, orphansByModule[m.id] || [])),
    '];',
  ].join('\n');

  const before = src.slice(0, src.indexOf('const MODULES ='));
  let after = src.slice(end);
  // original ends with `];` — array slice stops at `]`, so after may start with `;`
  if (after.startsWith(';')) after = after.slice(1);
  fs.writeFileSync(appPath, before + rebuilt + after);

  const mapping = [];
  for (const m of ARCHITECTURE) {
    for (const sec of m.sections) {
      for (const sid of sec.screenIds) {
        const old = oldPlacement.find((x) => x.screenId === sid);
        const newTitle = m.titleOverrides?.[sid] || old?.oldTitle || sid;
        mapping.push({
          screenId: sid,
          techId: old?.techId || '',
          endpoint: old?.endpoint || '',
          oldTitle: old?.oldTitle || '',
          newTitle,
          oldModuleId: old?.oldModuleId || '',
          oldModule: old?.oldModule || '',
          newModuleId: m.id,
          newModule: m.title,
          oldSectionId: old?.oldSectionId || '',
          oldSection: old?.oldSection || '',
          newSectionId: sec.id,
          newSection: sec.title,
        });
      }
    }
  }

  const outDir = path.join(root, 'docs/ui/menu-architecture');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, '_mapping.json'),
    JSON.stringify({ mapping, orphans: ORPHAN_KEEP, architecture: ARCHITECTURE, oldPlacement }, null, 2),
  );
  console.log('Rebuilt MODULES. screens=', screenMap.size, 'mapped=', mapping.length);
}

main();
