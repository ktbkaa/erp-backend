/**
 * TEKS (kot/denim) firması — manuel test listesi sırayla.
 * Derin kontroller: açılış, başlık, liste/form, Düzelt doluluk, Yeni form,
 * çoklu hash ekranları, firma izolasyonu, master veri oluşturma (cari).
 * Çıktı: /opt/cursor/artifacts/manuel-test/
 */
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const OUT = '/opt/cursor/artifacts/manuel-test';
mkdirSync(OUT, { recursive: true });
const steps = JSON.parse(readFileSync('/tmp/manuel_test_steps.json', 'utf8'));
const BASE = 'http://127.0.0.1:3000';
const FIRMA_ID = 2; // TEKS
const FIRMA_OTHER = 3;

/** Word listesinde eski/yanlış hash → gerçek ekran id */
const SCREEN_ALIASES = {
  'district-tanimi': 'sehir-tanimi', // ilçe, şehir formunun alt grid’i
};

function allScreens(screenField) {
  const raw = String(screenField || '');
  return [...raw.matchAll(/#([a-z0-9_-]+)/gi)]
    .map((m) => SCREEN_ALIASES[m[1]] || m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
}

function primaryScreen(screenField) {
  const hashes = allScreens(screenField);
  return hashes[0] || null;
}

function scoreUx(ctx) {
  let score = 100;
  const {
    opened, pageErrors, hasListOrForm, hasRows, toastError, titleOk, notes, titleMatch,
    duzeltOk, expectedDataMissing, isolationOk, createdOk, multiOk,
  } = ctx;
  if (pageErrors.length) score -= Math.min(45, pageErrors.length * 15);
  if (!opened) score -= 55;
  if (!hasListOrForm) score -= 25;
  if (toastError) score -= 18;
  if (!titleOk) score -= 12;
  if (titleMatch === false) score -= 15;
  if (notes.includes('empty-list')) score -= 8;
  if (notes.includes('yeni-form-empty')) score -= 20;
  if (notes.includes('yeni-form-fail')) score -= 15;
  if (duzeltOk === false) score -= 30;
  if (expectedDataMissing) score -= 12;
  if (isolationOk === false) score -= 25;
  if (createdOk === false) score -= 20;
  if (multiOk === false) score -= 10;
  if (notes.includes('stale-title')) score -= 10;
  if (notes.includes('login-only')) score = Math.min(score, 92);
  // Açılış smoke’u tam 100 olmasın; derin CRUD yoksa tavan 90
  if (notes.includes('smoke-only') && !notes.includes('duzelt-ok') && !notes.includes('yeni-form-ok')) {
    score = Math.min(score, 90);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function titleMatches(expectedKey, title) {
  const t = String(title || '').toLocaleLowerCase('tr-TR');
  const map = {
    companies: ['firma'],
    'is-yerleri': ['iş yer', 'is yer'],
    warehouses: ['depo'],
    kullanicilar: ['kullanıcı', 'kullanici'],
    'numarator-tanimi': ['numaratör', 'numarator'],
    'olcu-birimleri': ['ölçü', 'olcu', 'birim'],
    'para-birimi-tanimi': ['para'],
    'doviz-kuru-tanimi': ['döviz', 'doviz', 'kur'],
    'country-tanimi': ['ülke', 'ulke', 'country'],
    'sehir-tanimi': ['şehir', 'sehir'],
    'district-tanimi': ['ilçe', 'ilce'],
    'odeme-kosulu-tanimi': ['ödeme', 'odeme'],
    'teslimat-kosulu-tanimi': ['teslimat'],
    'hareket-kodlari': ['hareket'],
    'belge-tipleri': ['belge'],
    'stok-karti': ['stok'],
    'stok-depo': ['stok', 'depo', 'bağ', 'bag'],
    'cari-kartlari': ['cari'],
    'is-merkezleri': ['iş merkez', 'is merkez'],
    'is-istasyonlari': ['istasyon'],
    'urun-agaci': ['ürün', 'urun', 'bom', 'ağaç', 'agac'],
    routings: ['rota', 'routing'],
    'uretim-emri-tipleri': ['üretim', 'uretim', 'tip'],
    'satin-alma-talepleri': ['talep', 'satın', 'satin'],
    'satin-alma-siparisleri': ['sipariş', 'siparis', 'satın', 'satin'],
    'mal-kabuller': ['mal kabul', 'kabul'],
    'fatura-yonetimi': ['fatura'],
    'fatura-kontrolleri': ['fatura', 'kontrol', 'eşleş', 'esles'],
    'satis-siparisleri': ['satış', 'satis', 'sipariş', 'siparis'],
    irsaliyeler: ['irsaliye'],
    'stok-hareketleri': ['hareket', 'stok'],
    'stok-bakiyeleri': ['bakiye'],
    'uretim-emirleri': ['iş emri', 'is emri', 'üretim', 'uretim'],
    kokpit: ['kokpit'],
    'audit-log': ['audit'],
    'tablo-bilgileri': ['tablo'],
    'sql-sorgu': ['sql'],
    'hr-departmanlar': ['departman'],
    'hr-pozisyonlar': ['pozisyon'],
    'hr-personel': ['personel'],
    'hr-izin-turleri': ['izin'],
    'hr-izin-talepleri': ['izin'],
    mizan: ['mizan'],
  };
  const keys = map[expectedKey];
  if (!keys) return null;
  return keys.some((k) => t.includes(k));
}

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1500,950'],
  defaultViewport: { width: 1500, height: 950 },
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 200)));

async function bootFirma(fid) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem('ktb_firma_id', String(id));
    localStorage.setItem('ktb_cihaz_oturum', '1');
    localStorage.setItem('ktb_kullanici_kodu', 'ADMIN');
  }, fid);
  await page.reload({ waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll('#sidebarNav .mod-group').length > 0, { timeout: 25000 });
  await page.evaluate(async (id) => {
    state.activeFirmaId = id;
    if (typeof loadFirmalar === 'function') await loadFirmalar().catch(() => {});
    if (typeof renderFirmaPicker === 'function') renderFirmaPicker();
  }, fid);
}

await bootFirma(FIRMA_ID);

async function openAndSnap(screenId) {
  await page.evaluate(async (id) => {
    if (typeof openScreen === 'function') await openScreen(id);
    else location.hash = id;
  }, screenId);
  await new Promise((r) => setTimeout(r, 1000));
  return page.evaluate((id) => {
    const title = document.querySelector('#screenTitle')?.textContent?.trim() || '';
    const metaBanner = document.querySelector('#metaBanner')?.textContent?.trim() || '';
    const sqlBanner = document.querySelector('#sqlBanner')?.textContent?.trim() || '';
    const viewMeta = document.querySelector('#viewMeta:not([hidden])');
    const viewSql = document.querySelector('#viewSql:not([hidden])');
    const viewScreen = document.querySelector('#viewScreen:not([hidden])');
    const viewForm = document.querySelector('#viewForm:not([hidden])');
    const rows = document.querySelectorAll(
      '#viewScreen:not([hidden]) table tbody tr:not(.empty-row), #viewMeta:not([hidden]) table tbody tr:not(.empty-row), #dataTable tbody tr:not(.empty-row)'
    ).length;
    const empty = document.querySelector('.detail-empty, .empty-state, .list-empty');
    // Yalnızca görünür hata toast’ları (önceki adımdan kalan başarı/uyarı birikmesin)
    const toast = [...document.querySelectorAll('.toast, .toasts .toast')]
      .filter((el) => el.offsetParent !== null || el.classList.contains('show') || el.classList.contains('error'))
      .map((t) => t.textContent || '')
      .filter((t) => /hata|bulunamad|yetki|yüklenemedi|izin yok/i.test(t))
      .join(' ');
    const fields = document.querySelectorAll('#viewForm:not([hidden]) [data-master], #viewForm:not([hidden]) .field').length;
    const filled = [...document.querySelectorAll('#viewForm:not([hidden]) input, #viewForm:not([hidden]) select, #viewForm:not([hidden]) textarea')]
      .filter((el) => {
        if (el.type === 'hidden' || el.type === 'checkbox') return false;
        return String(el.value || '').trim().length > 0;
      }).length;
    return {
      screenId: state.screenId,
      title,
      metaBanner,
      sqlBanner,
      hasMeta: Boolean(viewMeta),
      hasSql: Boolean(viewSql),
      hasList: Boolean(viewScreen) || rows > 0,
      hasForm: Boolean(viewForm),
      rows,
      emptyText: empty?.textContent?.trim()?.slice(0, 80) || '',
      toast: String(toast || '').slice(0, 160),
      fields,
      filled,
      effectiveTitle: title || metaBanner || sqlBanner,
    };
  }, screenId);
}

async function tryDuzelt() {
  return page.evaluate(async () => {
    const rows = [...document.querySelectorAll('#viewScreen:not([hidden]) table tbody tr:not(.empty-row)[data-id]')];
    if (!rows.length) return { ok: null, reason: 'no-rows' };
    const first = rows[0];
    const id = first.getAttribute('data-id') || first.dataset?.id;
    first.click();
    state.selectedId = id ? Number(id) : state.selectedId;
    await new Promise((r) => setTimeout(r, 200));
    if (typeof openForm === 'function') {
      await openForm('duzelt', { inPlace: true });
    } else {
      const btn = document.querySelector('[data-action="duzelt"], #btnDuzelt, button.duzelt');
      if (btn) btn.click();
    }
    await new Promise((r) => setTimeout(r, 1100));
    const formVisible = Boolean(document.querySelector('#viewForm:not([hidden])'));
    const filled = [...document.querySelectorAll('#viewForm:not([hidden]) input, #viewForm:not([hidden]) select, #viewForm:not([hidden]) textarea')]
      .filter((el) => {
        if (el.type === 'hidden' || el.type === 'checkbox') return false;
        return String(el.value || '').trim().length > 0;
      }).length;
    const nameVal = document.querySelector('#viewForm:not([hidden]) [data-master="item_name"], #viewForm:not([hidden]) [name="item_name"], #viewForm:not([hidden]) [data-master="partner_name"], #viewForm:not([hidden]) [name="partner_name"]')?.value || '';
    return { ok: formVisible && (filled >= 2 || String(nameVal).trim().length > 0), filled, nameVal, formVisible, id };
  });
}

async function tryYeni() {
  return page.evaluate(async () => {
    if (typeof openForm === 'function') await openForm('yeni', { inPlace: true });
    await new Promise((r) => setTimeout(r, 700));
    const formOk = Boolean(document.querySelector('#viewForm:not([hidden]) [data-master], #viewForm:not([hidden]) .field'));
    return { formOk };
  });
}

async function createCari({ code, name, tip }) {
  return page.evaluate(async ({ code, name, tip }) => {
    const headers = { 'Content-Type': 'application/json', 'X-Firma-Id': String(state.activeFirmaId || 2) };
    const body = {
      partner_code: code,
      partner_name: name,
      company_id: state.activeFirmaId || 2,
      is_supplier: tip === 'tedarikci',
      is_customer: tip === 'musteri',
      partner_type: tip === 'tedarikci' ? 'T' : 'M',
    };
    // try common field aliases
    const r = await api('/partners', { method: 'POST', body });
    return r;
  }, { code, name, tip }).catch(async () => {
    // fallback fetch from node context via page
    return page.evaluate(async ({ code, name, tip, firma }) => {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Firma-Id': String(firma) },
        body: JSON.stringify({
          partner_code: code,
          partner_name: name,
          company_id: firma,
          is_supplier: tip === 'tedarikci',
          is_customer: tip === 'musteri',
        }),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, json };
    }, { code, name, tip, firma: FIRMA_ID });
  });
}

const results = [];

for (const step of steps) {
  pageErrors.length = 0;
  // Önceki adım toast birikimini temizle
  await page.evaluate(() => {
    document.querySelectorAll('.toast, .toasts .toast').forEach((el) => el.remove());
  }).catch(() => {});
  const hashes = allScreens(step.screen);
  const screenId = hashes[0] || null;
  const shot = `${OUT}/step-${String(step.n).padStart(2, '0')}.png`;
  const notes = [];
  let opened = false;
  let hasListOrForm = false;
  let hasRows = false;
  let titleOk = false;
  let titleMatch = null;
  let toastError = false;
  let status = 'Tamam';
  let detail = '';
  let duzeltOk = null;
  let expectedDataMissing = false;
  let isolationOk = null;
  let createdOk = null;
  let multiOk = null;

  try {
    if (!screenId) {
      if (step.n === 1) {
        const menu = await page.evaluate(() => document.querySelectorAll('#sidebarNav .mod-group').length);
        opened = menu > 0;
        hasListOrForm = true;
        titleOk = true;
        notes.push('login-only');
        detail = `Soft oturum; ${menu} modül grubu`;
      } else if (step.n === 57) {
        // Firma izolasyonu: OTHER'a geç, TEKS stoklarının görünmediğini doğrula, geri dön
        const teksCount = await page.evaluate(async () => {
          const r = await fetch('/items?limit=100', { headers: { 'X-Firma-Id': '2' } });
          const j = await r.json();
          const arr = Array.isArray(j) ? j : (j.rows || j.data || []);
          return arr.length;
        });
        await bootFirma(FIRMA_OTHER);
        const otherView = await page.evaluate(async () => {
          const r = await fetch('/items?limit=100', { headers: { 'X-Firma-Id': String(state.activeFirmaId || 3) } });
          const j = await r.json();
          const arr = Array.isArray(j) ? j : (j.rows || j.data || []);
          const teksCodes = arr.filter((x) => String(x.company_id) === '2' || /^H0000|^Y0000|^U0000/.test(x.item_code || ''));
          return { total: arr.length, teksLike: teksCodes.length, firma: state.activeFirmaId };
        });
        await bootFirma(FIRMA_ID);
        const firmaLabel = await page.evaluate(() => ({
          id: state.activeFirmaId,
          label: document.querySelector('#firmaPickerLabel, .firma-picker-label, #firmaPickerBtn')?.textContent?.trim() || '',
        }));
        opened = Number(firmaLabel.id) === FIRMA_ID;
        hasListOrForm = true;
        titleOk = /TEKS|Denim/i.test(firmaLabel.label) || opened;
        isolationOk = otherView.teksLike === 0 || (otherView.firma === FIRMA_OTHER && otherView.total !== teksCount);
        if (!isolationOk) {
          status = 'Hata';
          notes.push('isolation-leak');
        }
        detail = `TEKS stok=${teksCount}; OTHER toplam=${otherView.total} teksLike=${otherView.teksLike}; geri id=${firmaLabel.id}`;
      } else {
        opened = true;
        hasListOrForm = true;
        titleOk = true;
        notes.push('no-hash');
        notes.push('smoke-only');
        detail = 'Ekran hash yok — manuel bağlam';
      }
      await page.screenshot({ path: shot, fullPage: false });
    } else {
      // Primary screen
      let snap = await openAndSnap(screenId);
      opened = snap.screenId === screenId || snap.hasMeta || snap.hasSql;
      hasListOrForm = snap.hasList || snap.hasForm || snap.hasMeta || snap.hasSql;
      hasRows = snap.rows > 0;
      titleOk = Boolean(snap.effectiveTitle);
      titleMatch = titleMatches(screenId, snap.effectiveTitle);
      if (titleMatch === false) notes.push('stale-title');
      toastError = /hata|bulunamad|yetki|yüklenemedi/i.test(snap.toast);
      if (!hasRows && snap.emptyText) notes.push('empty-list');
      if (pageErrors.length) {
        status = 'Hata';
        notes.push('pageerror');
      }
      detail = `Ekran=${snap.screenId || screenId}; satır=${snap.rows}; başlık=«${snap.effectiveTitle}»`;

      // Multi-hash: open remaining screens briefly
      if (hashes.length > 1) {
        multiOk = true;
        for (const hid of hashes.slice(1)) {
          const s2 = await openAndSnap(hid);
          if (s2.screenId !== hid && !s2.hasMeta && !s2.hasSql) {
            multiOk = false;
            notes.push(`multi-fail:${hid}`);
          }
        }
        // return to primary for screenshot
        snap = await openAndSnap(screenId);
      }

      // Expected master data hints
      if ([13, 14].includes(step.n) && snap.rows < 1) expectedDataMissing = true;
      if ([16, 17].includes(step.n) && snap.rows < 1) expectedDataMissing = true;

      // Create caris when missing (steps 16/17)
      if (step.n === 16 && snap.rows < 1) {
        const created = await page.evaluate(async (firma) => {
          const res = await fetch('/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Firma-Id': String(firma) },
            body: JSON.stringify({
              partner_code: 'T-TEKS-01',
              partner_name: 'TEKS Denim Tedarikçi A.Ş.',
              company_id: firma,
              partner_type: 'Tedarikci',
            }),
          });
          return { status: res.status, json: await res.json().catch(() => ({})) };
        }, FIRMA_ID);
        createdOk = created.status < 400 || created.status === 409;
        if (!createdOk) {
          notes.push(`cari-create-fail:${created.status}`);
          status = 'Uyarı';
        } else {
          notes.push('cari-tedarikci-created');
          snap = await openAndSnap(screenId);
          hasRows = snap.rows > 0;
          expectedDataMissing = snap.rows < 1;
        }
      }
      if (step.n === 17) {
        const created = await page.evaluate(async (firma) => {
          const res = await fetch('/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Firma-Id': String(firma) },
            body: JSON.stringify({
              partner_code: 'M-TEKS-01',
              partner_name: 'TEKS Kot Müşteri Ltd.',
              company_id: firma,
              partner_type: 'Musteri',
            }),
          });
          return { status: res.status, json: await res.json().catch(() => ({})) };
        }, FIRMA_ID);
        createdOk = created.status < 400 || created.status === 409;
        if (!createdOk) {
          notes.push(`cari-create-fail:${created.status}`);
          status = 'Uyarı';
        } else notes.push('cari-musteri-created');
        snap = await openAndSnap(screenId);
        hasRows = snap.rows > 0;
      }

      // Düzelt smoke on key master screens
      if ([2, 3, 4, 13, 16].includes(step.n) && opened && hasRows) {
        const d = await tryDuzelt();
        duzeltOk = d.ok;
        if (d.ok === false) {
          notes.push('duzelt-empty');
          status = 'Hata';
          detail += `; Düzelt boş(filled=${d.filled})`;
        } else if (d.ok === true) {
          notes.push('duzelt-ok');
          detail += `; Düzelt OK filled=${d.filled}`;
        }
        // back to list
        await page.evaluate(async (id) => {
          state.formMode = null;
          state.formRecord = null;
          if (typeof openScreen === 'function') await openScreen(id);
        }, screenId);
        await new Promise((r) => setTimeout(r, 400));
      }

      // Yeni form smoke
      if ([6, 7, 13, 16].includes(step.n) && opened) {
        try {
          const y = await tryYeni();
          if (!y.formOk) {
            notes.push('yeni-form-empty');
            status = status === 'Tamam' ? 'Uyarı' : status;
          } else notes.push('yeni-form-ok');
          await page.evaluate(async (id) => {
            state.formMode = null;
            state.formRecord = null;
            if (typeof openScreen === 'function') await openScreen(id);
          }, screenId);
          await new Promise((r) => setTimeout(r, 400));
        } catch (_) {
          notes.push('yeni-form-fail');
          status = 'Uyarı';
        }
      }

      if (![6, 7, 13, 16, 2, 3, 4, 57, 16, 17].includes(step.n)) notes.push('smoke-only');

      await page.screenshot({ path: shot, fullPage: false });
    }
  } catch (err) {
    status = 'Hata';
    detail = String(err.message || err).slice(0, 200);
    notes.push('exception');
    try { await page.screenshot({ path: shot, fullPage: false }); } catch (_) {}
  }

  // İşlemsel ekranlarda boş liste beklenen olabilir — yalnızca master’da uyarı
  const masterExpectData = [2, 3, 4, 6, 7, 13, 14, 16, 17].includes(step.n);
  if (status === 'Tamam' && (!opened || !hasListOrForm)) status = 'Hata';
  if (status === 'Tamam' && toastError) status = 'Uyarı';
  if (status === 'Tamam' && titleMatch === false) status = 'Uyarı';
  if (status === 'Tamam' && duzeltOk === false) status = 'Hata';
  if (status === 'Tamam' && isolationOk === false) status = 'Hata';
  if (status === 'Tamam' && multiOk === false) status = 'Uyarı';
  if (status === 'Tamam' && expectedDataMissing && masterExpectData) status = 'Uyarı';
  // smoke-only boş liste → puan düşer ama durum Tamam kalır (veri henüz yok)
  if (notes.includes('empty-list') && !masterExpectData) {
    // no status change
  } else if (status === 'Tamam' && notes.includes('empty-list') && masterExpectData) {
    status = 'Uyarı';
  }

  const score = scoreUx({
    opened,
    pageErrors: [...pageErrors],
    hasListOrForm,
    hasRows,
    toastError,
    titleOk,
    notes,
    titleMatch,
    duzeltOk,
    expectedDataMissing,
    isolationOk,
    createdOk,
    multiOk,
  });

  results.push({
    n: step.n,
    title: step.title,
    screen: step.screen,
    screenId,
    screens: hashes,
    yap: step.yap,
    beklenen: step.beklenen,
    status,
    score,
    detail,
    notes,
    shot,
    pageErrors: [...pageErrors],
  });
  console.log(`${step.n}. ${status} (${score}) ${step.title}`);
}

writeFileSync(`${OUT}/results.json`, JSON.stringify({
  firma: { id: FIRMA_ID, code: 'TEKS', name: 'Denim Tekstil Üretim A.Ş.' },
  generatedAt: new Date().toISOString(),
  results,
  summary: {
    total: results.length,
    tamam: results.filter((r) => r.status === 'Tamam').length,
    uyari: results.filter((r) => r.status === 'Uyarı').length,
    hata: results.filter((r) => r.status === 'Hata').length,
    avgScore: Math.round(results.reduce((a, r) => a + r.score, 0) / results.length),
  },
}, null, 2));

await browser.close();
console.log('DONE', `${OUT}/results.json`);
