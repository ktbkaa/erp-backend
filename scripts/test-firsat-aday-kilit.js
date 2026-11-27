/**
 * Fırsat / aday / satır kilidi / belge bağlantısı UI smoke
 *   node scripts/test-firsat-aday-kilit.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const c of cands) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Chrome/Chromium bulunamadı');
}

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(500);
  const need = await page.evaluate(() => {
    const v = document.querySelector('#viewLogin');
    return Boolean(v && !v.hidden) || document.body.classList.contains('is-login');
  });
  if (need) {
    await page.waitForSelector('#loginUser', { visible: true, timeout: 15000 });
    await page.click('#loginUser', { clickCount: 3 });
    await page.type('#loginUser', 'ADMIN', { delay: 5 });
    await page.click('#loginPass', { clickCount: 3 });
    await page.type('#loginPass', 'admin', { delay: 5 });
    await page.click('#loginSubmit');
    await sleep(1200);
  }
  // Firma TEKS
  await page.evaluate(() => {
    localStorage.setItem('ktb_firma_id', '13');
    localStorage.setItem('ktb_kullanici_kodu', 'ADMIN');
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(800);
}

async function openScreen(page, id) {
  await page.evaluate((sid) => {
    if (typeof openScreen === 'function') return openScreen(sid);
  }, id);
  await sleep(900);
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('shot', file);
  return file;
}

(async () => {
  const executablePath = await findChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(45000);
  const results = {};

  try {
    await login(page);

    // --- Fırsat yeni form: firma/işyeri üstte, müşteri adayı, aşama YENİ ---
    await openScreen(page, 'crm-firsatlar');
    await page.evaluate(() => openForm('yeni', { inPlace: true }));
    await sleep(1200);
    const firsatMeta = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('#viewForm label, #viewForm .field label')]
        .map((l) => (l.textContent || '').replace(/\*/g, '').trim())
        .filter(Boolean);
      const stage = document.querySelector('[data-master="stage_id"]');
      const stageText = stage?.selectedOptions?.[0]?.textContent || stage?.value || '';
      const lead = document.querySelector('[data-master="lead_id"]');
      const partner = document.querySelector('[data-master="partner_id"]');
      const company = document.querySelector('[data-master="company_id"]');
      const plant = document.querySelector('[data-master="plant_id"]');
      const custType = document.querySelector('[data-master="customer_type"]');
      return {
        labels: labels.slice(0, 20),
        hasMusteriAdayi: labels.some((l) => /müşteri adayı/i.test(l)),
        hasMusteriField: labels.some((l) => /^müşteri$/i.test(l) || /^müşteri tipi$/i.test(l)),
        stageText,
        stageVal: stage?.value || '',
        hasLead: Boolean(lead),
        hasPartner: Boolean(partner),
        hasCompany: Boolean(company),
        hasPlant: Boolean(plant),
        hasCustType: Boolean(custType),
        rec: {
          stage_id: state.formRecord?.stage_id,
          customer_type: state.formRecord?.customer_type,
          company_id: state.formRecord?.company_id,
          plant_id: state.formRecord?.plant_id,
        },
      };
    });
    results.firsatMeta = firsatMeta;
    await shot(page, 'firsat-yeni-form-master.png');

    // Kalem satırı: stok seç → birim/fiyat + ✓ kilit
    // Önce boş satır olduğundan emin ol
    await page.evaluate(() => {
      const screen = findScreen('crm-firsatlar');
      const key = screen.detailKey;
      if (!Array.isArray(state.formRecord[key]) || !state.formRecord[key].length) {
        const tab = resolveGridTab(screen, key);
        const blank = emptyRowFromFields(tab.fields);
        blank._satir_kayitli = false;
        blank._satir_duzenleniyor = true;
        state.formRecord[key] = [blank];
        state.gridSel = { key, idx: 0 };
        renderForm(screen);
      }
    });
    await sleep(400);

    // Stok lookup aç ve çoklu seç desteğini doğrula
    const multiOk = await page.evaluate(async () => {
      const sel = document.querySelector('tr[data-grid-row="satirlar"] select[data-detail="item_id"]');
      if (!sel) return { ok: false, reason: 'no-item-select' };
      await openLookupBrowserForSelect(sel);
      const st = _lookupBrowserState;
      return {
        ok: Boolean(st?.multi),
        title: document.querySelector('#lookupBrowserTitle')?.textContent || '',
        multiBar: !document.querySelector('#lookupBrowserMultiBar')?.hidden,
        rowCount: st?.allRows?.length || 0,
      };
    });
    results.multiOk = multiOk;
    await shot(page, 'firsat-stok-coklu-sec.png');

    // İlk 2 stoğu işaretle ve seç
    await page.evaluate(() => {
      const rows = _lookupBrowserState?.filteredRows || [];
      rows.slice(0, 2).forEach((r) => {
        if (r?.id != null) toggleLookupBrowserCheck(String(r.id), true);
      });
      applyLookupBrowserMultiSelect();
    });
    await sleep(700);

    const afterMulti = await page.evaluate(() => {
      const rows = state.formRecord?.satirlar || [];
      return rows.map((r) => ({
        item_id: r.item_id,
        uom: r.uom_code,
        price: r.unit_price,
        qty: r.quantity,
        toplu: r._satir_toplu,
        kayitli: r._satir_kayitli,
      }));
    });
    results.afterMulti = afterMulti;
    await shot(page, 'firsat-coklu-stok-satirlar.png');

    // Miktar doldur + satır ✓ → kilit / ✎
    await page.evaluate(() => {
      const screen = findScreen('crm-firsatlar');
      const rows = state.formRecord.satirlar || [];
      rows.forEach((r) => {
        if (r && (r.quantity == null || r.quantity === '')) r.quantity = 3;
      });
      state.formRecord.satirlar = rows;
      renderForm(screen);
    });
    await sleep(400);
    // İlk satırı kaydet
    await page.click('tr[data-grid-row="satirlar"][data-grid-idx="0"] [data-row-act="kaydet"]');
    await sleep(600);
    const afterLock = await page.evaluate(() => {
      const rows = state.formRecord?.satirlar || [];
      const acts = [...document.querySelectorAll('tr[data-grid-row="satirlar"] [data-row-act]')]
        .map((b) => b.getAttribute('data-row-act'));
      const editing = [...document.querySelectorAll('tr[data-grid-row="satirlar"]')]
        .map((tr) => ({
          idx: tr.getAttribute('data-grid-idx'),
          cls: tr.className,
          inputsDisabled: [...tr.querySelectorAll('input,select')].every((el) => el.disabled || el.readOnly),
        }));
      return {
        rows: rows.map((r) => ({
          item_id: r.item_id,
          qty: r.quantity,
          kayitli: r._satir_kayitli,
          duzen: r._satir_duzenleniyor,
          toplu: r._satir_toplu,
        })),
        acts,
        editing,
      };
    });
    results.afterLock = afterLock;
    await shot(page, 'firsat-satir-kilit.png');

    // --- Aday: cariye dönüştür butonu + belge bağlantısı ---
    await openScreen(page, 'crm-adaylar');
    await sleep(600);
    // Liste sağ tık menüsü — belge bağlantısı
    const firstId = await page.evaluate(() => {
      const tr = document.querySelector('#dataBody tr[data-id]');
      return tr?.getAttribute('data-id') || null;
    });
    if (firstId) {
      const box = await page.$('#dataBody tr[data-id]');
      const bb = await box.boundingBox();
      await page.mouse.click(bb.x + 40, bb.y + 10, { button: 'right' });
      await sleep(800);
      const menu = await page.evaluate(() => {
        const m = document.querySelector('#listCtxMenu');
        return {
          hidden: m?.hidden,
          text: m?.innerText || '',
        };
      });
      results.listCtx = menu;
      await shot(page, 'aday-liste-belge-baglantisi.png');
      await page.keyboard.press('Escape');
    }

    // Dönüşmüş adayı aç → Cariyi Aç
    await page.evaluate(async () => {
      const rows = await api('/crm-adaylar');
      const hit = (rows || []).find((r) => r.status === 'Donusturuldu' && r.partner_id)
        || (rows || []).find((r) => r.partner_id);
      if (!hit) return null;
      state.selectedId = hit.id;
      state.rows = [hit];
      state.filtered = [hit];
      await openForm('duzelt', { inPlace: true });
      return hit.id;
    });
    await sleep(1200);
    const convertBtn = await page.evaluate(() => {
      const b = document.querySelector('#btnFormConvert');
      return {
        hidden: b?.hidden,
        text: b?.textContent || '',
        kind: b?.dataset?.convertKind || '',
        status: state.formRecord?.status,
        partner_id: state.formRecord?.partner_id,
      };
    });
    results.convertBtn = convertBtn;
    await shot(page, 'aday-cariyi-ac-buton.png');

    // Form sağ tık belge bağlantısı
    await page.click('#viewForm', { button: 'right' });
    await sleep(900);
    results.formCtx = await page.evaluate(() => {
      const m = document.querySelector('#formCtxMenu');
      return { hidden: m?.hidden, text: m?.innerText || '' };
    });
    await shot(page, 'aday-form-belge-baglantisi.png');

    // Stok hareket — satır kilidi regress
    await openScreen(page, 'stok-hareketleri');
    await page.evaluate(() => openForm('yeni', { inPlace: true }));
    await sleep(1000);
    results.stokHareketLockUi = await page.evaluate(() => {
      const hasKaydet = Boolean(document.querySelector('[data-row-act="kaydet"]'));
      const sel = document.querySelector('tr[data-grid-row] select[data-detail="item_id"]');
      return { hasKaydet, hasItem: Boolean(sel) };
    });
    await shot(page, 'stok-hareket-yeni-kalem.png');

    console.log(JSON.stringify(results, null, 2));
    const ok = firsatMeta.hasMusteriAdayi
      && !firsatMeta.hasPartner
      && !firsatMeta.hasCustType
      && firsatMeta.hasCompany
      && firsatMeta.hasPlant
      && multiOk.ok
      && afterLock.acts.includes('duzelt')
      && convertBtn.text.includes('Cariyi Aç');
    if (!ok) {
      console.error('ASSERT_FAIL', {
        hasMusteriAdayi: firsatMeta.hasMusteriAdayi,
        hasPartner: firsatMeta.hasPartner,
        hasCustType: firsatMeta.hasCustType,
        multi: multiOk.ok,
        duzelt: afterLock.acts.includes('duzelt'),
        cariyiAc: convertBtn.text,
      });
      process.exitCode = 2;
    } else {
      console.log('UI_SMOKE_OK');
    }
  } catch (err) {
    console.error('FAIL', err);
    try { await shot(page, 'firsat-test-fail.png'); } catch (_) {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
