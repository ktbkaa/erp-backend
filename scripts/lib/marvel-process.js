/**
 * Metal Marvel — MMARVEL-W1 / W2 / W3 süreç döngüleri
 */
const pool = require('../../db');
const { mrpCalistir } = require('../../src/services/mrpService');
const { startApproval, onaylaAdim } = require('../../src/services/onayService');
const {
  TAG, DATES, log, api, apiAsUser,
} = require('./marvel-common');

async function onaylaGkk(firmaId, mkId, targetWarehouseId, tag) {
  const gkRows = (await pool.query(
    `SELECT * FROM incoming_inspections
     WHERE goods_receipt_id=$1 AND status NOT IN ('Onayli','Red','Iptal')`,
    [mkId],
  )).rows;
  for (const g of gkRows) {
    try {
      await api('POST', `/giris-kontrolleri/${g.id}/onayla`, {
        description: `[${tag}] giriş kontrol onay`,
      }, firmaId);
    } catch (err) {
      log(`  Giriş kontrol atlandı: ${err.message}`);
    }
  }
  const inspIds = (await pool.query(
    `SELECT id FROM incoming_inspections WHERE goods_receipt_id=$1`,
    [mkId],
  )).rows.map((r) => r.id);
  const qc = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='GKK' AND status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND (
         (source_type='MAL_KABUL' AND source_id=$1)
         OR (source_type='GIRIS_KONTROL' AND source_id = ANY($2::int[]))
         OR source_id=$1
       )`,
    [mkId, inspIds.length ? inspIds : [0]],
  );
  for (const e of qc.rows.slice(0, 10)) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || e.accepted_quantity || 1,
        rejected_quantity: 0,
        target_warehouse_id: targetWarehouseId,
        description: `[${tag}] GKK onay`,
      }, firmaId);
    } catch (err) {
      log(`  GKK atlandı: ${err.message}`);
    }
  }
}

async function onaylaCkk(firmaId, ueId, tag, targetWh) {
  const r = await pool.query(
    `SELECT * FROM qc_orders
     WHERE direction='CKK' AND status NOT IN ('Onayli','Kapali','Red','Iptal')
       AND source_type='URETIM_EMRI' AND source_id=$1`,
    [ueId],
  );
  for (const e of r.rows.slice(0, 10)) {
    try {
      await api('POST', `/kk-emirleri/${e.id}/onayla`, {
        onay: true,
        accepted_quantity: e.quantity || 1,
        rejected_quantity: 0,
        target_warehouse_id: targetWh,
        description: `[${tag}] CKK onay`,
      }, firmaId);
    } catch (err) {
      log(`  CKK atlandı: ${err.message}`);
    }
  }
}

async function runPoApproval(firmaId, poId, tag) {
  try {
    const rec = await startApproval(pool, {
      screenId: 'satin-alma-siparisleri',
      documentId: poId,
      companyId: firmaId,
      description: `[${tag}] SA onay`,
    });
    if (rec?.id) {
      for (let i = 0; i < 5; i++) {
        try {
          await onaylaAdim(pool, { recordId: rec.id, userCode: 'owner', approve: true, note: tag });
        } catch { break; }
      }
    }
  } catch (err) {
    log(`  Onay akışı: ${err.message}`);
  }
}

async function runWeek1(ctx) {
  const tag = TAG.W1;
  const { firma, plant, wh, master, hr, out } = ctx;
  const userSales = 'marvel.satis';
  const userSa = 'marvel.sa';
  const ownerId = (await pool.query(`SELECT id FROM users WHERE user_code='owner' LIMIT 1`)).rows[0]?.id;

  log(`\n=== ${tag} — CRM → Satış → Satınalma → Mal Kabul ===`);
  const docs = {};

  const lead = await apiAsUser(userSales, 'POST', '/crm-adaylar', {
    company_id: firma.id,
    lead_name: 'Kaplan Koleksiyon — Iron Man ön sipariş',
    status: 'Nitelikli',
    owner_id: ownerId,
    priority: 'Yuksek',
    phone: '0262 555 0202',
    email: 'kaplan@koleksiyon.demo',
    province: 'İstanbul',
    industry_code: 'KOLEKSIYON',
    lead_source: 'Fuar',
    notes: `[${tag}]`,
  }, firma.id);
  docs.lead = lead;

  const opp = await apiAsUser(userSales, 'POST', '/crm-firsatlar', {
    company_id: firma.id,
    opportunity_name: 'Iron Man Limited Run',
    subject: '100 adet döküm figür',
    customer_type: 'Musteri',
    partner_id: master.partners.mus1.id,
    lead_id: lead.id,
    stage_id: 3,
    created_by_user_id: ownerId,
    followed_by_id: ownerId,
    expected_revenue: 420000,
    plant_id: plant.id,
    description: tag,
    satirlar: [{ item_id: master.fgCast.id, quantity: 100, unit_price: 4200, line_no: 10 }],
  }, firma.id);
  docs.opportunity = opp;

  const teklif = await apiAsUser(userSales, 'POST', '/satis-teklifleri', {
    partner_id: master.partners.mus1.id,
    plant_id: plant.id,
    company_id: firma.id,
    warehouse_id: wh.mam.id,
    quotation_date: DATES.w1Start,
    valid_date: DATES.w1Mid,
    currency_code: 'TRY',
    opportunity_id: opp.id,
    lead_id: lead.id,
    description: `[${tag}] Satış teklifi`,
    satirlar: [{ item_id: master.fgCast.id, quantity: 100, unit_price: 4200 }],
  }, firma.id);
  docs.quotation = teklif;

  const so = await apiAsUser(userSales, 'POST', '/sales_orders', {
    order_type: 'SatisSiparis',
    partner_id: master.partners.mus1.id,
    order_date: DATES.w1Mid,
    status: 'Onayli',
    company_id: firma.id,
    plant_id: plant.id,
    warehouse_id: wh.mam.id,
    project_code: tag,
    description: `[${tag}] Satış siparişi`,
    quotation_id: teklif.id,
    price_list_id: master.priceList?.id,
    kalemler: [{
      item_id: master.fgCast.id,
      quantity: 100,
      unit_price: 4200,
      stock_uom: 'AD',
      warehouse_id: wh.mam.id,
    }],
  }, firma.id);
  docs.salesOrder = so;

  const poPack = await apiAsUser(userSa, 'POST', '/satin-alma-siparisleri', {
    partner_id: master.partners.tedPack.id,
    plant_id: plant.id,
    company_id: firma.id,
    warehouse_id: wh.hmd.id,
    status: 'Taslak',
    order_date: DATES.w1Start,
    project_code: tag,
    description: `[${tag}] Direkt PO — paketleme`,
    currency_code: 'TRY',
    satirlar: [{
      item_id: master.items['MM-PAK-KUTU'].id,
      quantity: 500,
      unit_price: 85,
      uom_code: 'AD',
      line_no: 10,
    }],
  }, firma.id);
  await apiAsUser(userSa, 'POST', `/satin-alma-siparisleri/${poPack.id}/onayla`, {}, firma.id).catch(() => null);
  docs.poPack = poPack;

  const talep = await apiAsUser(userSa, 'POST', '/satin-alma-talepleri', {
    company_id: firma.id,
    plant_id: plant.id,
    warehouse_id: wh.hmd.id,
    description: `[${tag}] Alaşım talebi`,
    project_code: tag,
    satirlar: [{
      item_id: master.items['MM-ZN-AL'].id,
      quantity: 800,
      uom_code: 'KG',
    }],
  }, firma.id);
  await apiAsUser(userSa, 'POST', `/satin-alma-talepleri/${talep.id}/onayla`, {}, firma.id).catch(() => null);
  docs.requisition = talep;

  let rfq = null;
  try {
    rfq = await apiAsUser(userSa, 'POST', '/satin-alma-teklif-istekleri', {
      company_id: firma.id,
      plant_id: plant.id,
      requisition_id: talep.id,
      description: `[${tag}] RFQ alaşım`,
      satirlar: [{ item_id: master.items['MM-ZN-AL'].id, quantity: 800, uom_code: 'KG' }],
    }, firma.id);
  } catch (err) {
    log(`  RFQ: ${err.message}`);
  }
  docs.rfq = rfq;

  let pq = null;
  try {
    pq = await apiAsUser(userSa, 'POST', '/satin-alma-teklifleri', {
      partner_id: master.partners.tedAlloy.id,
      plant_id: plant.id,
      company_id: firma.id,
      requisition_id: talep.id,
      description: `[${tag}] Tedarikçi teklifi`,
      satirlar: [{
        item_id: master.items['MM-ZN-AL'].id,
        quantity: 800,
        unit_price: 175,
        uom_code: 'KG',
      }],
    }, firma.id);
  } catch (err) {
    log(`  SA teklif: ${err.message}`);
  }
  docs.purchaseQuotation = pq;

  const poAlloy = await apiAsUser(userSa, 'POST', '/satin-alma-siparisleri', {
    partner_id: master.partners.tedAlloy.id,
    plant_id: plant.id,
    company_id: firma.id,
    warehouse_id: wh.hmd.id,
    requisition_id: talep.id,
    status: 'Taslak',
    order_date: DATES.w1Mid,
    project_code: tag,
    description: `[${tag}] Alaşım PO`,
    satirlar: [{
      item_id: master.items['MM-ZN-AL'].id,
      quantity: 800,
      unit_price: 175,
      uom_code: 'KG',
    }],
  }, firma.id);
  await apiAsUser(userSa, 'POST', `/satin-alma-siparisleri/${poAlloy.id}/onayla`, {}, firma.id).catch(() => null);
  if (Number(poAlloy.grand_total || poAlloy.total_amount || 140000) >= 50000) {
    await runPoApproval(firma.id, poAlloy.id, tag);
  }
  docs.poAlloy = poAlloy;

  const mkWh = wh.giris || wh.hmd;
  const mk = await apiAsUser(userSa, 'POST', '/mal-kabuller', {
    purchase_order_id: poAlloy.id,
    warehouse_id: mkWh.id,
    company_id: firma.id,
    description: `[${tag}] Mal kabul alaşım`,
    incoming_qc_required: true,
  }, firma.id);
  await onaylaGkk(firma.id, mk.id, wh.hmd.id, tag);
  docs.goodsReceipt = mk;

  await apiAsUser('marvel.depo', 'POST', '/stok-hareketleri', {
    company_id: firma.id,
    plant_id: plant.id,
    movement_date: DATES.w1Mid,
    description: `[${tag}] Manuel düzeltme hareketi`,
    warehouse_id: wh.hmd.id,
    satirlar: [{
      item_id: master.items['MM-EPOXY'].id,
      quantity: 50,
      direction: 1,
      uom_code: 'KG',
    }],
  }, firma.id).catch((e) => log(`  stok hareket: ${e.message}`));

  out.week1 = docs;
  return docs;
}

async function runWeek2(ctx) {
  const tag = TAG.W2;
  const { firma, plant, wh, master, hr, out } = ctx;
  const w1 = out.week1 || {};
  const soId = w1.salesOrder?.id;

  log(`\n=== ${tag} — Üretim Döküm/CNC + Proje + Onay ===`);
  const docs = {};

  // Mamul + CKK depo bağlarını garanti et
  for (const it of [master.fgCast, master.fgCnc]) {
    for (const w of [wh.mam, wh.ckk, wh.svk].filter(Boolean)) {
      await pool.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
         SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2)`,
        [it.id, w.id, plant.id],
      ).catch(() => null);
    }
  }

  const ueDok = await apiAsUser('marvel.uretim.dokum', 'POST', '/uretim-emirleri', {
    item_id: master.fgCast.id,
    product_bom_id: master.bomCast.id,
    route_id: master.rotaCast.id,
    plant_id: plant.id,
    company_id: firma.id,
    component_warehouse_id: wh.hmd.id,
    fg_warehouse_id: wh.mam.id,
    wip_warehouse_id: wh.dok_wip.id,
    planned_quantity: 100,
    order_type_id: 3,
    sales_order_id: soId,
    planned_firm: 'Kesin',
    order_date: DATES.w2Start,
    description: `[${tag}] Döküm UE`,
  }, firma.id);
  await apiAsUser('marvel.uretim.dokum', 'POST', `/uretim-emirleri/${ueDok.id}/onayla`, {}, firma.id).catch(() => null);
  await apiAsUser('marvel.uretim.dokum', 'POST', `/uretim-emirleri/${ueDok.id}/baslat`, {}, firma.id).catch(() => null);
  for (let i = 0; i < 3; i++) {
    await apiAsUser('marvel.uretim.dokum', 'POST', `/uretim-emirleri/${ueDok.id}/operasyon-tamamla`, { quantity: 100 }, firma.id).catch(() => null);
  }
  await onaylaCkk(firma.id, ueDok.id, tag, wh.mam.id);
  docs.ueDokum = ueDok;

  const ueCnc = await apiAsUser('marvel.uretim.cnc', 'POST', '/uretim-emirleri', {
    item_id: master.fgCnc.id,
    product_bom_id: master.bomCnc.id,
    route_id: master.rotaCnc.id,
    plant_id: plant.id,
    company_id: firma.id,
    component_warehouse_id: wh.hmd.id,
    fg_warehouse_id: wh.mam.id,
    wip_warehouse_id: wh.cnc_wip.id,
    planned_quantity: 40,
    order_type_id: 3,
    planned_firm: 'Kesin',
    order_date: DATES.w2Mid,
    description: `[${tag}] CNC UE`,
  }, firma.id);
  await apiAsUser('marvel.uretim.cnc', 'POST', `/uretim-emirleri/${ueCnc.id}/onayla`, {}, firma.id).catch(() => null);
  await apiAsUser('marvel.uretim.cnc', 'POST', `/uretim-emirleri/${ueCnc.id}/baslat`, {}, firma.id).catch(() => null);
  await apiAsUser('marvel.uretim.cnc', 'POST', `/uretim-emirleri/${ueCnc.id}/operasyon-tamamla`, { quantity: 40 }, firma.id).catch(() => null);
  await onaylaCkk(firma.id, ueCnc.id, tag, wh.mam.id);
  docs.ueCnc = ueCnc;

  await apiAsUser('marvel.depo', 'POST', '/transfer-emirleri', {
    company_id: firma.id,
    plant_id: plant.id,
    source_warehouse_id: wh.ckk.id,
    target_warehouse_id: wh.mam.id,
    description: `[${tag}] CKK → Mamul transfer`,
    satirlar: [{
      item_id: master.fgCast.id,
      quantity: 80,
      uom_code: 'AD',
    }],
  }, firma.id).catch((e) => log(`  transfer: ${e.message}`));

  const proj = await apiAsUser('marvel.proje', 'POST', '/projects', {
    company_id: firma.id,
    project_name: 'Yeni Iron Man Kalıp Tooling',
    project_code: `MM-KALIP-${tag}`,
    description: `[${tag}] Ar-Ge + üretim iş paketleri`,
    plant_id: plant.id,
    partner_id: master.partners.mus1.id,
    plan_start_date: DATES.w2Start,
    plan_end_date: DATES.w3End,
  }, firma.id);
  docs.project = proj;

  const wiTypes = await pool.query(`SELECT id FROM prj_work_item_types ORDER BY id LIMIT 1`);
  const wiStatus = await pool.query(
    `SELECT id FROM prj_work_item_statuses
     WHERE UPPER(COALESCE(status_code,'')) IN ('TODO','OPEN','DRAFT','BACKLOG')
     ORDER BY id LIMIT 1`,
  );
  const assignees = ['marvel.arge', 'marvel.uretim.dokum', 'marvel.kalite', 'marvel.sa'];
  for (let i = 0; i < assignees.length; i++) {
    const u = (await pool.query(`SELECT id FROM users WHERE user_code=$1`, [assignees[i]])).rows[0];
    await apiAsUser('marvel.proje', 'POST', '/work-items', {
      company_id: firma.id,
      project_id: proj.id,
      title: `Kalıp iş paketi ${i + 1} [${tag}]`,
      work_item_type_id: wiTypes.rows[0]?.id,
      status_id: wiStatus.rows[0]?.id,
      assignee_user_id: u?.id,
      description: tag,
    }, firma.id).catch((e) => log(`  iş kalemi: ${e.message}`));
  }

  const poBig = await apiAsUser('marvel.sa', 'POST', '/satin-alma-siparisleri', {
    partner_id: master.partners.tedAlloy.id,
    plant_id: plant.id,
    company_id: firma.id,
    warehouse_id: wh.hmd.id,
    status: 'Taslak',
    order_date: DATES.w2Mid,
    project_code: tag,
    description: `[${tag}] Kalıp çeligi >50K`,
    satirlar: [{
      item_id: master.items['MM-AL-6061'].id,
      quantity: 2000,
      unit_price: 95,
      uom_code: 'KG',
    }],
  }, firma.id);
  await apiAsUser('marvel.sa', 'POST', `/satin-alma-siparisleri/${poBig.id}/onayla`, {}, firma.id).catch(() => null);
  await runPoApproval(firma.id, poBig.id, tag);
  docs.poApproval = poBig;

  out.week2 = docs;
  return docs;
}

async function runWeek3(ctx, client) {
  const tag = TAG.W3;
  const { firma, plant, wh, master, hr, out } = ctx;
  const so = out.week1?.salesOrder;

  log(`\n=== ${tag} — Sevk, Fatura, İK, CAPA, MRP ===`);
  const docs = {};

  if (so?.id) {
    const sevk = await apiAsUser('marvel.satis', 'POST', `/sales_orders/${so.id}/sevk-emri-olustur`, {
      description: `[${tag}] sevk`,
      warehouse_id: wh.mam.id,
    }, firma.id).catch((e) => { log(`  sevk: ${e.message}`); return null; });
    docs.shipment = sevk;
    if (sevk?.id) {
      const irs = await apiAsUser('marvel.satis', 'POST', '/delivery_notes/sevk-emrinden', {
        ship_id: sevk.id,
        description: tag,
      }, firma.id).catch(() => null);
      docs.deliveryNote = irs;
      if (irs?.id) {
        await apiAsUser('marvel.satis', 'POST', `/delivery_notes/${irs.id}/onayla`, {}, firma.id).catch(() => null);
        const inv = await apiAsUser('marvel.finans', 'POST', `/delivery_notes/${irs.id}/fatura-olustur`, {
          description: `[${tag}] satış faturası`,
        }, firma.id).catch(() => null);
        docs.salesInvoice = inv;
        if (inv?.id) {
          await apiAsUser('marvel.finans', 'POST', `/invoices/${inv.id}/muhasebelestir`, {}, firma.id).catch(() => null);
        }
      }
    }
  }

  const poAlloy = out.week1?.poAlloy;
  if (poAlloy?.id) {
    const mk2 = await apiAsUser('marvel.sa', 'POST', '/mal-kabuller', {
      purchase_order_id: poAlloy.id,
      warehouse_id: wh.hmd.id,
      company_id: firma.id,
      description: `[${tag}] kapanış mal kabul`,
    }, firma.id).catch(() => null);
    if (mk2?.id) {
      const alisInv = await apiAsUser('marvel.finans', 'POST', `/mal-kabuller/${mk2.id}/fatura-olustur`, {
        description: `[${tag}] alış faturası`,
      }, firma.id).catch(() => null);
      docs.purchaseInvoice = alisInv;
    }
  }

  const ikUser = 'marvel.ik';
  const deptId = hr.depts.IK?.dept?.id;
  const posId = hr.depts.UretimDokum?.pos?.id;
  const job = await apiAsUser(ikUser, 'POST', '/hr-ise-alim/ilanlar', {
    company_id: firma.id,
    title: 'Döküm Operatörü',
    department_id: hr.depts.UretimDokum?.dept?.id,
    position_id: posId,
  }, firma.id).catch(() => null);
  docs.job = job;
  if (job?.id) {
    const cand = await apiAsUser(ikUser, 'POST', '/hr-ise-alim/adaylar', {
      company_id: firma.id,
      first_name: 'Serhat',
      last_name: 'Güler',
      email: `serhat.guler.${Date.now()}@aday.local`,
      requisition_id: job.id,
    }, firma.id).catch(() => null);
    if (cand?.id) {
      await apiAsUser(ikUser, 'POST', `/hr-ise-alim/adaylar/${cand.id}/ise-al`, {
        hire_date: DATES.w3Start,
      }, firma.id).catch(() => null);
      docs.hire = cand;
    }
  }

  const emp = hr.employees.Satis?.[0];
  if (emp?.id) {
    const types = await apiAsUser(ikUser, 'GET', '/hr-izin/turler', null, firma.id).catch(() => []);
    const yillik = Array.isArray(types) && types.find((t) => t.leave_code === 'YILLIK');
    if (yillik?.id) {
      await apiAsUser(ikUser, 'POST', '/hr-izin/bakiyeler/accrue', {
        company_id: firma.id,
        employee_id: emp.id,
        leave_type_id: yillik.id,
        year_no: 2026,
        accrued: 14,
      }, firma.id).catch(() => null);
      const leave = await apiAsUser(ikUser, 'POST', '/hr-izin/talepler', {
        company_id: firma.id,
        employee_id: emp.id,
        leave_type_id: yillik.id,
        start_date: DATES.w3Start,
        end_date: DATES.w3Mid || DATES.w3Start,
        quantity: 1,
      }, firma.id).catch(() => null);
      if (leave?.id) {
        await apiAsUser(ikUser, 'POST', `/hr-izin/talepler/${leave.id}/gonder`, {}, firma.id).catch(() => null);
        await apiAsUser(ikUser, 'POST', `/hr-izin/talepler/${leave.id}/onayla`, {}, firma.id).catch(() => null);
        docs.leave = leave;
      }
    }
    await apiAsUser(ikUser, 'POST', '/hr-puantaj/ham', {
      company_id: firma.id,
      employee_id: emp.id,
      event_time: `${DATES.w3Start}T08:00:00`,
      event_type: 'Giris',
      source_record_id: `MM-${emp.id}-in`,
    }, firma.id).catch(() => null);
    await apiAsUser(ikUser, 'POST', '/hr-puantaj/ham', {
      company_id: firma.id,
      employee_id: emp.id,
      event_time: `${DATES.w3Start}T17:00:00`,
      event_type: 'Cikis',
      source_record_id: `MM-${emp.id}-out`,
    }, firma.id).catch(() => null);
    await apiAsUser(ikUser, 'POST', '/hr-puantaj/isle', {
      company_id: firma.id,
      employee_id: emp.id,
      work_date: DATES.w3Start,
    }, firma.id).catch(() => null);

    const period = await apiAsUser(ikUser, 'POST', '/hr-bordro/donemler', {
      company_id: firma.id,
      year_no: 2026,
      month_no: 11,
    }, firma.id).catch(() => null);
    if (period?.id) {
      const run = await apiAsUser(ikUser, 'POST', '/hr-bordro/calismalar', {
        company_id: firma.id,
        period_id: period.id,
      }, firma.id).catch(() => null);
      if (run?.id) {
        await apiAsUser(ikUser, 'POST', `/hr-bordro/calismalar/${run.id}/hesapla`, {}, firma.id).catch(() => null);
        docs.payroll = run;
      }
    }
  }

  const qcOrder = (await pool.query(
    `SELECT id FROM qc_orders WHERE company_id=$1 ORDER BY id DESC LIMIT 1`,
    [firma.id],
  )).rows[0];
  let ncr = null;
  if (qcOrder?.id) {
    ncr = await apiAsUser('marvel.kalite', 'POST', '/kk-uygunsuzluklar', {
      order_id: qcOrder.id,
      quantity: 2,
      description: `[${tag}] Boya ton farkı — NCR`,
    }, firma.id).catch(() => null);
  }
  docs.ncr = ncr;
  if (ncr?.id) {
    const capa = await apiAsUser('marvel.kalite', 'POST', '/kk-capa', {
      company_id: firma.id,
      nonconformance_id: ncr.id,
      title: 'Boya proses CAPA',
      description: tag,
      status: 'Planlandi',
    }, firma.id).catch(() => null);
    docs.capa = capa;
  }

  await apiAsUser('marvel.kalibrasyon', 'POST', '/kk-kalite/kalibrasyonlar', {
    company_id: firma.id,
    instrument_id: ctx.calibration?.[0]?.id,
    calibration_date: DATES.w3Start,
    performed_by: 'MM Kalibrasyon Ekibi',
    result_status: 'Uygun',
    description: `[${tag}] periyodik kalibrasyon`,
  }, firma.id).catch((e) => log(`  kalibrasyon W3: ${e.message}`));

  if (client) {
    try {
      const mrp = await mrpCalistir(client, {
        companyId: firma.id,
        plantId: plant.id,
        description: `[${tag}] MRP çalıştırma`,
        horizonDays: 30,
      });
      docs.mrp = { run_id: mrp?.runId, message: mrp?.message };
    } catch (err) {
      log(`  MRP: ${err.message}`);
    }
  }

  out.week3 = docs;
  return docs;
}

module.exports = { runWeek1, runWeek2, runWeek3, onaylaGkk, onaylaCkk };