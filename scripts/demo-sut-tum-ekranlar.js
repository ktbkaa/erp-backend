/**
 * GIDA (Anadolu Süt ve Süt Ürünleri) — tüm ekranları kullanan tamamlayıcı senaryo
 *
 * Önkoşul: npm run demo:gida-dongu (TEST-SUT ana döngü) ve
 *          npm run qa:ornek-gida (zengin örnek veri) çalışmış olmalı.
 *
 * Ana döngünün dokunmadığı ekranları süt işletmesi bağlamında doldurur:
 *   CRM / İK / Proje / Finans (genişletilmiş modüller), stok seri / ikame,
 *   ürün ağacı malzeme değişikliği, üretim planı → iş emri, MRP (öneri → talep / iş emri),
 *   teklif isteği → satınalma teklifi → anlaşma → sipariş → tedarikçi irsaliyesi,
 *   KK uygunsuzluk → CAPA, KK stok plan bağları, bekleyen onay + yetki devri,
 *   vardiya / tatil / vardiya atama / avans / zimmet / çıkış nedenleri / işten çıkış.
 *
 * Kullanım: node scripts/demo-sut-tum-ekranlar.js [--only=adim1,adim2]
 * Özet: docs/sut-tam-dongu/senaryo-ozet.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { seedExtendedModules } = require('./lib/demo-extended-modules');
const { startApproval } = require('../src/services/onayService');

const BASE_URL = process.env.ERP_BASE || `http://127.0.0.1:${process.env.PORT || 3000}`;
const TAG = 'SUT-EKRAN-2026';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'sut-tam-dongu');

const ONLY = ((process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '')
  .split(',').filter(Boolean);
const out = { tag: TAG, steps: {}, errors: [] };

function log(msg) { console.log(msg); }

async function api(method, urlPath, body, firmaId) {
  const headers = { 'Content-Type': 'application/json', 'X-Kullanici-Kodu': 'owner' };
  if (firmaId) headers['X-Firma-Id'] = String(firmaId);
  const r = await fetch(BASE_URL + urlPath, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`${method} ${urlPath} → ${r.status}: ${data?.hata || data?.detay || text}`);
  return data;
}

async function step(name, fn) {
  if (ONLY.length && !ONLY.includes(name)) return;
  try {
    out.steps[name] = await fn();
    log(`  ✓ ${name}: ${JSON.stringify(out.steps[name])}`);
  } catch (err) {
    out.errors.push({ step: name, hata: err.message });
    log(`  ✗ ${name}: ${err.message}`);
  }
}

const one = async (sql, params = []) => (await pool.query(sql, params)).rows[0] || null;
const all = async (sql, params = []) => (await pool.query(sql, params)).rows;
const isoDay = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function loadContext() {
  const firma = await one(`SELECT * FROM companies WHERE company_code='GIDA'`);
  if (!firma) throw new Error('GIDA firması yok.');
  const plant = await one(`SELECT * FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`, [firma.id]);
  const whRows = await all(`SELECT * FROM warehouses WHERE plant_id=$1`, [plant.id]);
  const wh = Object.fromEntries(whRows.map((w) => [w.warehouse_code.replace('GIDA-', '').toLowerCase(), w]));
  const itemRows = await all(`SELECT * FROM items WHERE item_code LIKE 'TEST-SUT-%' OR item_code LIKE 'OG-%'`);
  const item = Object.fromEntries(itemRows.map((i) => [i.item_code, i]));
  const ozetPath = path.join(__dirname, '..', 'docs', 'erp-full-cycle-test/evidence/gida-tam-dongu-ozet.json');
  const ozet = fs.existsSync(ozetPath) ? JSON.parse(fs.readFileSync(ozetPath, 'utf8')) : null;
  const byCode = async (code) => (code ? one(`SELECT * FROM partners WHERE partner_code=$1`, [code]) : null);
  const p = ozet?.base?.partners || {};
  const partners = {
    ted1: await byCode(p.ted1) || await one(`SELECT * FROM partners WHERE partner_code='OG-T01'`),
    ted2: await byCode(p.ted2) || await one(`SELECT * FROM partners WHERE partner_code='OG-T02'`),
    mus1: await byCode(p.mus1) || await one(`SELECT * FROM partners WHERE partner_code='OG-M01'`),
    mus2: await byCode(p.mus2) || await one(`SELECT * FROM partners WHERE partner_code='OG-M02'`),
  };
  const docNo = async (table, col, no) => (no ? one(`SELECT * FROM ${table} WHERE ${col}=$1`, [no]) : null);
  const links = {
    manSalesOrderId: (await docNo('sales_orders', 'order_no', ozet?.man?.sales_order))?.id,
    manQuotationId: (await docNo('sales_quotations', 'quotation_no', ozet?.man?.sales_quotation))?.id,
    manSalesInvoiceId: (await docNo('invoices', 'invoice_no', ozet?.man?.sales_invoice))?.id,
    manPurchaseInvoiceId: (await docNo('invoices', 'invoice_no', ozet?.man?.purchase_invoice))?.id,
    manPurchaseOrderId: (await docNo('purchase_orders', 'order_no', ozet?.man?.purchase_order))?.id,
    mrpSalesOrderId: (await docNo('sales_orders', 'order_no', ozet?.mrp?.sales_order))?.id,
  };
  const users = {
    owner: await one(`SELECT * FROM users WHERE user_code='owner'`),
    admin: await one(`SELECT * FROM users WHERE user_code='ADMIN'`),
  };
  return { firma, plant, wh, item, partners, links, users, ozet };
}

async function main() {
  log(`GIDA tüm ekranlar senaryosu → ${BASE_URL}`);
  const ctx = await loadContext();
  const { firma, plant, wh, item, partners, users } = ctx;
  const F = firma.id;
  const fg = item['TEST-SUT-M01'];
  const yogurt = item['TEST-SUT-M02'];
  const cigSut = item['TEST-SUT-H01'];
  const sise = item['TEST-SUT-A01'];
  const kapak = item['TEST-SUT-A02'];
  const kapakAlt = item['OG-A02'];
  out.firma = { id: F, code: firma.company_code, name: firma.company_name };

  log('\n=== 1. CRM / İK / Proje / Finans ===');
  await step('genisletilmis_moduller', async () => seedExtendedModules({
    firma,
    plant,
    partners,
    items: { fg },
    tagPrefix: 'GIDA',
    links: ctx.links,
    projectName: 'Yoğurt Hattı Kapasite Artırım Projesi',
    industryCode: 'GIDA',
    leadName: 'GIDA Aday — Ege Otel Zinciri (kahvaltılık süt ürünleri)',
  }));

  await step('proje_plani', async () => {
    const prj = await one(
      `SELECT * FROM projects WHERE company_id=$1 AND project_code LIKE 'GIDA-PRJ-%' ORDER BY id DESC LIMIT 1`, [F]
    );
    const isler = await all(`SELECT * FROM work_items WHERE project_id=$1 ORDER BY id`, [prj.id]);
    let start = Date.parse(isoDay(-20));
    let n = 0;
    for (const w of isler) {
      const days = 6 + (n % 3) * 4;
      const s = new Date(start).toISOString().slice(0, 10);
      const e = new Date(start + days * 86400000).toISOString().slice(0, 10);
      const pct = Math.max(0, 100 - n * 15);
      await api('PUT', `/prj-isler/${w.id}`, {
        plan_start_date: s,
        plan_end_date: e,
        percent_complete: Math.min(100, pct),
        estimated_hours: days * 6,
        assignee_user_id: users.owner.id,
      }, F);
      start += (days - 2) * 86400000;
      n += 1;
    }
    return { proje: prj.project_code, planlanan_is: n };
  });

  log('\n=== 2. Stok seri / ikame / ağaç malzeme değişikliği ===');
  await step('stok_serileri', async () => {
    const lot = await one(`SELECT id FROM item_lots WHERE item_id=$1 ORDER BY id DESC LIMIT 1`, [fg.id]);
    const nos = [];
    for (let i = 1; i <= 3; i += 1) {
      const s = await api('POST', '/stok-serileri', {
        item_id: fg.id,
        serial_no: `SUT-PAL-${Date.now().toString().slice(-6)}-${i}`,
        lot_id: lot?.id || null,
        warehouse_id: wh.mam.id,
        status: 'Depoda',
      }, F);
      nos.push(s.serial_no);
    }
    return nos;
  });
  await step('stok_ikame', async () => {
    const s = await api('POST', '/stok-ikame', {
      item_id: kapak.id,
      substitute_item_id: kapakAlt.id,
      priority: 1,
      description: `[${TAG}] Kapak tedarik sıkıntısında OG-A02 kullanılır`,
    }, F);
    return { id: s.id, item: kapak.item_code, ikame: kapakAlt.item_code };
  });
  await step('bom_malzeme_degisikligi', async () => {
    const bom = await one(`SELECT id, bom_code FROM boms WHERE bom_code=$1`, [ctx.ozet?.base?.bom]);
    const ileri = await api('POST', '/bom/malzeme-degisikligi', {
      eski_stok_id: kapak.id,
      yeni_stok_id: kapakAlt.id,
      agac_id: bom?.id,
      description: `[${TAG}] Kapak tedarikçisi değişikliği — deneme partisi`,
    }, F);
    const geri = await api('POST', '/bom/malzeme-degisikligi', {
      eski_stok_id: kapakAlt.id,
      yeni_stok_id: kapak.id,
      agac_id: bom?.id,
      description: `[${TAG}] Deneme sonrası standart kapağa dönüş`,
    }, F);
    return { bom: bom?.bom_code, ileri: ileri.islem_kodu, geri: geri.islem_kodu };
  });

  log('\n=== 3. Üretim planı → iş emri ===');
  await step('uretim_planlari', async () => {
    const p1 = await api('POST', '/uretim-planlari', {
      company_id: F,
      item_id: fg.id,
      quantity: 400,
      uom_code: fg.uom_code,
      planned_start: isoDay(2),
      delivery_date: isoDay(5),
      status: 'Acik',
      material: true,
      description: `[${TAG}] Haftalık süt dolum planı`,
    }, F);
    const cevrim = await api('POST', `/uretim-planlari/${p1.id}/cevir`, {
      plant_id: plant.id,
      component_warehouse_id: wh.hmd.id,
      fg_warehouse_id: wh.mam.id,
    }, F);
    const p2 = await api('POST', '/uretim-planlari', {
      company_id: F,
      item_id: yogurt.id,
      quantity: 250,
      uom_code: yogurt.uom_code,
      planned_start: isoDay(7),
      delivery_date: isoDay(9),
      status: 'Acik',
      description: `[${TAG}] Yoğurt kampanya planı (açık)`,
    }, F);
    return {
      plan_cevrilen: p1.plan_no,
      is_emri: cevrim?.production_order?.order_no || cevrim?.order_no || cevrim?.production_order_no || null,
      plan_acik: p2.plan_no,
    };
  });

  log('\n=== 4. MRP: bağımsız ihtiyaç → çalıştır → talep / iş emri ===');
  await step('mrp', async () => {
    const bi = await api('POST', '/mrp/bagimsiz-ihtiyaclar', {
      item_id: fg.id,
      quantity: 6000,
      uom_code: fg.uom_code,
      requirement_date: isoDay(21),
      source: 'Tahmin',
      company_id: F,
      plant_id: plant.id,
      description: `[${TAG}] Ramazan kampanyası süt talep tahmini`,
    }, F);
    const run = await api('POST', '/mrp/calistir', {
      company_id: F,
      plant_id: plant.id,
      description: `[${TAG}] Kampanya MRP çalışması`,
      start_date: isoDay(0),
      end_date: isoDay(60),
    }, F);
    const runId = run?.calisma?.id;
    const talep = await api('POST', '/mrp/talep-olustur', { run_id: runId, plant_id: plant.id }, F)
      .catch((e) => ({ hata: e.message }));
    const ue = await api('POST', '/mrp/uretim-emri-olustur', { run_id: runId, plant_id: plant.id, stok_idler: [fg.id] }, F)
      .catch((e) => ({ hata: e.message }));
    const oneriler = await all(
      `SELECT i.item_code, r.suggestion, r.net_requirement FROM mrp_results r
       JOIN items i ON i.id=r.item_id WHERE r.run_id=$1 AND r.net_requirement > 0 ORDER BY i.item_code`,
      [runId]
    );
    return {
      bagimsiz_ihtiyac: bi.requirement_no,
      mrp_run: run?.calisma?.run_no,
      oneriler,
      talep: talep?.hata || talep?.requisition_no || talep?.talepler || talep,
      is_emri: ue?.hata || ue?.order_no || ue?.emirler || ue,
    };
  });

  log('\n=== 5. Teklif isteği → satınalma teklifi → anlaşma → sipariş → tedarikçi irsaliyesi ===');
  let po = null;
  await step('satinalma_zinciri', async () => {
    const rfq = await api('POST', '/satin-alma-teklif-istekleri', {
      description: `[${TAG}] Yıllık çiğ süt ve şişe teklif isteği`,
      company_id: F,
      plant_id: plant.id,
      status: 'Acik',
      satirlar: [
        { item_id: cigSut.id, quantity: 20000, uom_code: cigSut.uom_code },
        { item_id: sise.id, quantity: 15000, uom_code: sise.uom_code },
      ],
    }, F);
    const teklifler = [];
    for (const [ted, f1, f2] of [[partners.ted1, 17.4, 1.38], [partners.ted2, 18.1, 1.29]]) {
      teklifler.push(await api('POST', '/satin-alma-teklifleri', {
        partner_id: ted.id,
        rfq_id: rfq.id,
        description: `[${TAG}] ${ted.partner_name} teklifi`,
        valid_date: isoDay(30),
        status: 'Taslak',
        company_id: F,
        plant_id: plant.id,
        currency_code: 'TRY',
        satirlar: [
          { item_id: cigSut.id, quantity: 20000, unit_price: f1, uom_code: cigSut.uom_code },
          { item_id: sise.id, quantity: 15000, unit_price: f2, uom_code: sise.uom_code },
        ],
      }, F));
    }
    const kazanan = teklifler[0];
    await api('POST', `/satin-alma-teklifleri/${kazanan.id}/onayla`, {}, F);
    const anlasma = await api('POST', '/satin-alma-anlasmalari', {
      partner_id: partners.ted1.id,
      quotation_id: kazanan.id,
      start_date: isoDay(0),
      end_date: isoDay(365),
      status: 'Onayli',
      company_id: F,
      plant_id: plant.id,
      currency_code: 'TRY',
      description: `[${TAG}] 12 aylık çiğ süt çerçeve anlaşması`,
      satirlar: [{ item_id: cigSut.id, quantity: 240000, unit_price: 17.4, uom_code: cigSut.uom_code }],
    }, F);
    const sip = await api('POST', `/satin-alma-teklifleri/${kazanan.id}/siparise-donustur`, {}, F);
    const poId = sip?.id || sip?.purchase_order_id || sip?.siparis_id;
    po = await one(`SELECT * FROM purchase_orders WHERE id=$1`, [poId]);
    const poLines = await all(`SELECT * FROM purchase_order_lines WHERE purchase_order_id=$1 ORDER BY id`, [poId]);
    const vdn = await api('POST', '/tedarikci-irsaliyeleri', {
      partner_id: partners.ted1.id,
      purchase_order_id: poId,
      delivery_note_no: `TI-${Date.now().toString().slice(-6)}`,
      delivery_date: isoDay(1),
      plant_id: plant.id,
      description: `[${TAG}] Kooperatif ilk sevkiyat irsaliyesi`,
      satirlar: poLines.map((l) => ({
        order_line_id: l.id,
        item_id: l.item_id,
        quantity: Math.round(Number(l.quantity) / 4),
        uom_code: l.uom_code,
        unit_price: l.unit_price,
      })),
    }, F);
    return {
      teklif_istegi: rfq.rfq_no,
      teklifler: teklifler.map((t) => t.quotation_no),
      anlasma: anlasma.agreement_no,
      siparis: po?.order_no,
      tedarikci_irsaliyesi: vdn.delivery_note_no,
    };
  });

  log('\n=== 6. Onay: bekleyen kayıt + yetki devri ===');
  await step('onay', async () => {
    const exists = await one(
      `SELECT id FROM approval_roles WHERE role_code='SA_MUDUR-GIDA-ADMIN'`
    );
    if (!exists) {
      await pool.query(
        `INSERT INTO approval_roles (role_code, role_name, description, user_id, company_id, is_active)
         VALUES ('SA_MUDUR-GIDA-ADMIN','Satınalma Müdürü',$1,$2,$3,TRUE)`,
        [`[${TAG}] ADMIN vekil satınalma müdürü`, users.admin.id, F]
      );
    }
    let kayit = null;
    if (po) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        kayit = await startApproval(client, {
          company_id: F,
          screen_id: 'satin-alma-siparisleri',
          module_code: 'SATINALMA',
          document_id: po.id,
          document_no: po.order_no,
          document_summary: `[${TAG}] Çiğ süt çerçeve siparişi`,
          amount: Number(po.total_amount) || 0,
          currency_code: po.currency_code || 'TRY',
          initiator_user_id: users.owner.id,
          description: `[${TAG}] Onay bekliyor — Onaylarım ekranında görünür`,
        });
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
    const devir = await api('POST', '/onay-yetki-devirleri', {
      delegator_user_id: users.owner.id,
      delegate_user_id: users.admin.id,
      start_date: isoDay(0),
      end_date: isoDay(14),
      is_active: true,
      description: `[${TAG}] Yıllık izin süresince onay yetkisi devri`,
    }, F);
    return { bekleyen_onay: kayit?.approval_no || kayit?.id || null, devir: devir.delegation_code };
  });

  log('\n=== 7. Kalite: uygunsuzluk → CAPA, stok plan bağları ===');
  await step('kalite', async () => {
    const gkk = await one(
      `SELECT * FROM qc_orders WHERE company_id=$1 AND direction='GKK' ORDER BY id LIMIT 1`, [F]
    );
    const neden = await one(`SELECT id FROM qc_rejection_reasons WHERE reason_code='HASAR'`);
    const uyg = await api('POST', '/kk-uygunsuzluklar', {
      order_id: gkk.id,
      rejection_reason_id: neden?.id,
      quantity: 120,
      description: `[${TAG}] Tanker sıcaklığı 8 °C üzeri — 120 LT süt red`,
      corrective_action: 'Tedarikçiye soğuk zincir uyarısı, tanker kabul sıcaklık kontrolü',
    }, F);
    const capa = await api('POST', '/kk-capa', {
      title: 'Çiğ süt kabul sıcaklık sapması',
      description: `[${TAG}] Kök neden: tanker soğutma arızası. Önleyici: kabulde dijital termometre zorunlu.`,
      nonconformance_id: uyg.id,
      owner_user_id: users.owner.id,
      target_date: isoDay(20),
      status: 'Acik',
    }, F);
    const plan = async (code) => (await one(`SELECT id FROM qc_control_plans WHERE plan_code=$1`, [code]))?.id;
    const ogPlan = await plan('OG-KKP01');
    const bag = [];
    for (const [it, pl, dir] of [
      [cigSut, ogPlan || await plan('STD-GKK'), 'GKK'],
      [item['TEST-SUT-H02'], await plan('STD-GKK'), 'GKK'],
      [fg, await plan('STD-CKK'), 'CKK'],
      [yogurt, await plan('STD-CKK'), 'CKK'],
    ]) {
      const r = await api('POST', '/kk-stok-planlari', { item_id: it.id, plan_id: pl, direction: dir, is_active: true }, F);
      bag.push(`${it.item_code}/${dir}`);
      void r;
    }
    return { uygunsuzluk: uyg.id, kk_emri: gkk.order_no, capa: capa.capa_no, plan_baglari: bag };
  });

  log('\n=== 8. İK: vardiya / tatil / atama / avans / zimmet / çıkış ===');
  await step('ik_tamamlayici', async () => {
    const vardiyalar = [];
    for (const [name, s, e, cross] of [
      ['Sabah (Sağım & Kabul)', '06:00', '14:00', false],
      ['Akşam (Dolum)', '14:00', '22:00', false],
      ['Gece (CIP Temizlik)', '22:00', '06:00', true],
    ]) {
      vardiyalar.push(await api('POST', '/hr-takvim/vardiyalar', {
        company_id: F, shift_name: name, start_time: s, end_time: e,
        break_minutes: 30, crosses_midnight: cross, net_hours: 7.5,
        description: `[${TAG}] 3 vardiya süt tesisi`,
      }, F));
    }
    const tatiller = [
      ['2026-01-01', 'Yılbaşı', false],
      ['2026-03-19', 'Ramazan Bayramı Arifesi', true],
      ['2026-03-20', 'Ramazan Bayramı 1. Gün', false],
      ['2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı', false],
      ['2026-05-01', 'Emek ve Dayanışma Günü', false],
      ['2026-05-19', 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', false],
      ['2026-05-27', 'Kurban Bayramı 1. Gün', false],
      ['2026-07-15', 'Demokrasi ve Millî Birlik Günü', false],
      ['2026-08-30', 'Zafer Bayramı', false],
      ['2026-10-29', 'Cumhuriyet Bayramı', false],
    ];
    for (const [d, n, half] of tatiller) {
      await api('POST', '/hr-takvim/tatiller', { company_id: F, holiday_date: d, holiday_name: n, is_half_day: half }, F);
    }
    const emps = await all(
      `SELECT * FROM hr_employees WHERE company_id=$1 AND is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 6`, [F]
    );
    if (emps.length < 3) throw new Error('GIDA personeli yetersiz (en az 3).');
    for (let i = 0; i < emps.length; i += 1) {
      await api('POST', '/hr-takvim/vardiya-atamalari', {
        company_id: F, employee_id: emps[i].id, shift_id: vardiyalar[i % 3].id, start_date: isoDay(-30),
      }, F);
    }
    const nedenler = [];
    for (const [code, name, sev, notice] of [
      ['Istifa', 'İstifa', false, true],
      ['IsverenFeshi', 'İşveren feshi (4857/17)', true, true],
      ['Anlasmali', 'İkale (anlaşmalı ayrılış)', true, false],
      ['Emeklilik', 'Emeklilik', true, false],
      ['DenemeSuresi', 'Deneme süresinde fesih', false, false],
    ]) {
      const r = await api('POST', '/hr-ise-alim/cikis-nedenleri', {
        company_id: F, reason_code: code, reason_name: name,
        severance_default: sev, notice_default: notice, requires_document: true,
        description: `[${TAG}]`,
      }, F).catch((e) => {
        if (/duplicate key/.test(e.message)) return { reason_code: code };
        throw e;
      });
      nedenler.push(r.reason_code);
    }
    const avans = await api('POST', '/hr-bordro/avanslar', {
      company_id: F, employee_id: emps[0].id, amount: 7500, request_date: isoDay(-3),
      description: `[${TAG}] Bayram öncesi maaş avansı`,
    }, F);
    await api('POST', `/hr-bordro/avanslar/${avans.id}/onayla`, {}, F);
    await api('POST', `/hr-bordro/avanslar/${avans.id}/ode`, { paid_amount: 7500 }, F);
    const avans2 = await api('POST', '/hr-bordro/avanslar', {
      company_id: F, employee_id: emps[1].id, amount: 4000,
      description: `[${TAG}] Avans talebi (onay bekliyor)`,
    }, F);
    const zimmetler = [];
    for (const [i, code, name] of [
      [0, 'ZM-TBLT-01', 'El terminali (sağım kabul)'],
      [1, 'ZM-KYF-02', 'Hijyen kıyafeti seti (3 adet)'],
      [2, 'ZM-LAB-03', 'Laboratuvar pH metre'],
    ]) {
      zimmetler.push((await api('POST', '/hr-ise-alim/zimmetler', {
        company_id: F, employee_id: emps[i].id, asset_code: `${code}-${Date.now().toString().slice(-4)}`,
        asset_name: name, description: `[${TAG}]`,
      }, F)).asset_code);
    }
    const cikan = emps[emps.length - 1];
    const cikis = await api('POST', '/hr-ise-alim/cikislar', {
      company_id: F, employee_id: cikan.id, termination_date: isoDay(10), reason_code: 'Istifa',
      unused_leave_days: 4, description: `[${TAG}] Şehir değişikliği nedeniyle istifa`,
    }, F);
    return {
      vardiyalar: vardiyalar.map((v) => v.shift_code),
      tatil: tatiller.length,
      atama: emps.length,
      cikis_nedenleri: nedenler,
      avanslar: [avans.advance_no, avans2.advance_no],
      zimmetler,
      isten_cikis: cikis.termination_no || cikis.id,
    };
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ozetFile = path.join(OUT_DIR, 'senaryo-ozet.json');
  if (ONLY.length && fs.existsSync(ozetFile)) {
    const prev = JSON.parse(fs.readFileSync(ozetFile, 'utf8'));
    out.steps = { ...prev.steps, ...out.steps };
    out.errors = [...(prev.errors || []).filter((e) => !ONLY.includes(e.step)), ...out.errors];
  }
  fs.writeFileSync(ozetFile, JSON.stringify(out, null, 2), 'utf8');
  log(`\nÖzet: ${ozetFile} — hata: ${out.errors.length}`);
  await pool.end();
  if (out.errors.length) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
