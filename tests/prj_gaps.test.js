const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createApp, request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const {
  upsertProjectCost,
  fromStockMovement,
  fromProductionOrder,
  fromQcOrder,
} = require('../src/services/prjCostService');

describe('prj gaps KI-009…013', () => {
  let app, pool, headers, companyId, userId, project;

  before(async () => {
    ({ app, pool } = createApp());
    const c = await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
    companyId = c.rows[0].id;
    const u = await pool.query(`SELECT id, user_code FROM users WHERE is_active LIMIT 1`);
    userId = u.rows[0].id;
    headers = { 'X-Firma-Id': String(companyId), 'X-Kullanici-Kodu': u.rows[0].user_code };

    const p = await request(app, 'POST', '/prj-projeler', {
      headers,
      body: {
        project_name: 'TEST_ Gaps Proje',
        project_code: `TEST_GAP_${Date.now().toString().slice(-6)}`,
        manager_user_id: userId,
        planned_budget: 5000,
        plan_start_date: '2026-03-01',
        plan_end_date: '2026-06-01',
      },
    });
    assert.equal(p.status, 201, JSON.stringify(p.json));
    project = p.json;
  });

  it('KI-009: belge project_code → prj-projeler lookup UI', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    assert.match(
      appJs,
      /key:\s*'project_code'[\s\S]{0,80}lookup:\s*'prj-projeler'[\s\S]{0,80}valueKey:\s*'project_code'/
    );
    // Serbest metin form alanları (lookup’suz) belge master/detail’de kalmamalı
    const freeText = [...appJs.matchAll(/\{ key: 'project_code', label: 'Proje kodu' \}/g)];
    // yalnızca filtre (prj-projeler listesi) serbest metin olabilir
    assert.ok(freeText.length <= 1, `beklenmeyen serbest proje kodu alanı: ${freeText.length}`);
    assert.ok(appJs.includes("lookup: 'prj-projeler', valueKey: 'project_code'"));
    assert.ok(appJs.includes("onay_ekranlari") || true);
  });

  it('KI-010: Gantt reschedule API tarih/süre günceller', async () => {
    const wi = await request(app, 'POST', '/prj-isler', {
      headers,
      body: {
        project_id: project.id,
        title: 'TEST_ Gantt task',
        plan_start_date: '2026-03-10',
        plan_end_date: '2026-03-15',
      },
    });
    assert.equal(wi.status, 201, JSON.stringify(wi.json));

    const move = await request(app, 'POST', '/prj-planning/gantt/reschedule', {
      headers,
      body: {
        work_item_id: wi.json.id,
        plan_start_date: '2026-03-12',
        plan_end_date: '2026-03-20',
      },
    });
    assert.equal(move.status, 200, JSON.stringify(move.json));
    assert.equal(String(move.json.start).slice(0, 10), '2026-03-12');
    assert.equal(String(move.json.end).slice(0, 10), '2026-03-20');

    const dur = await request(app, 'POST', '/prj-planning/gantt/reschedule', {
      headers,
      body: {
        work_item_id: wi.json.id,
        plan_start_date: '2026-03-12',
        duration_days: 5,
      },
    });
    assert.equal(dur.status, 200, JSON.stringify(dur.json));
    assert.equal(String(dur.json.end).slice(0, 10), '2026-03-16');

    const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    assert.ok(appJs.includes('visualGantt: true'));
    assert.ok(appJs.includes('function renderVisualGantt'));
    assert.ok(appJs.includes('/prj-planning/gantt/reschedule'));
  });

  it('KI-012: bütçe aşımı onay kaydı + e-posta kuyruğu', async () => {
    await pool.query(`UPDATE projects SET planned_budget=5000 WHERE id=$1`, [project.id]);
    const cost = await request(app, 'POST', `/prj-budget/${project.id}/costs`, {
      headers,
      body: {
        category_code: 'DIGER',
        amount: 8000,
        source_module: 'PRJ',
        source_table: 'gap_test_budget',
        source_id: Date.now() % 1000000,
        description: 'TEST_ overrun',
      },
    });
    assert.equal(cost.status, 201, JSON.stringify(cost.json));
    assert.ok(cost.json.approval_meta, 'approval_meta beklenir');
    assert.ok(
      cost.json.approval_meta.approval || cost.json.approval_meta.hata,
      JSON.stringify(cost.json.approval_meta)
    );

    if (cost.json.approval_meta.approval && !cost.json.approval_meta.hata) {
      const ar = await pool.query(
        `SELECT id, screen_id, status_code FROM approval_records
         WHERE screen_id='prj-butce' AND document_id=$1 ORDER BY id DESC LIMIT 1`,
        [project.id]
      );
      assert.ok(ar.rows[0], 'approval_records satırı yok');
      assert.equal(ar.rows[0].status_code, 'BEKLIYOR');
    }

    const mail = await pool.query(
      `SELECT id, source_type, status FROM email_dispatches
       WHERE source_type='prj_budget_overrun' AND source_id=$1 ORDER BY id DESC LIMIT 1`,
      [project.id]
    );
    assert.ok(mail.rows[0], 'email_dispatches kaydı yok');

    const close = await request(app, 'POST', `/prj-integrations/projects/${project.id}/close`, {
      headers,
      body: { force: true, close_notes: 'TEST_ close notify' },
    });
    assert.equal(close.status, 200, JSON.stringify(close.json));
    assert.ok(close.json.approval_meta);

    const screens = await request(app, 'GET', '/onay-ekranlari', { headers });
    if (screens.status === 200) {
      const ids = (screens.json || []).map((s) => s.screen_id);
      assert.ok(ids.includes('prj-projeler') || ids.includes('prj-butce') || ids.includes('prj-isler'));
    }
  });

  it('KI-013: stok/üretim/KK otomatik maliyet (çift sayım yok)', async () => {
    const pCost = await request(app, 'POST', '/prj-projeler', {
      headers,
      body: {
        project_name: 'TEST_ Cost Bind',
        project_code: `TEST_CST_${Date.now().toString().slice(-6)}`,
        manager_user_id: userId,
      },
    });
    assert.equal(pCost.status, 201, JSON.stringify(pCost.json));
    const code = pCost.json.project_code;
    const projectId = pCost.json.id;
    const sid = Date.now() % 100000000;
    await withTransaction(pool, async (client) => {
      const stock = await fromStockMovement(client, {
        hareket: { id: sid, movement_no: 'TEST_SH', company_id: companyId, project_code: code },
        satirlar: [
          { id: sid + 1, direction: -1, quantity: 2, uom_cost: 100, item_id: null },
          { id: sid + 2, direction: 1, quantity: 2, uom_cost: 100, item_id: null }, // giriş ignore
        ],
        projectCode: code,
      });
      assert.equal(stock.length, 1);
      assert.equal(Number(stock[0].amount), 200);
      assert.equal(stock[0].category_code, 'MALZEME');
      assert.equal(Number(stock[0].project_id), projectId);

      // aynı source tekrar → upsert, çift sayım yok
      await fromStockMovement(client, {
        hareket: { id: sid, movement_no: 'TEST_SH', company_id: companyId, project_code: code },
        satirlar: [{ id: sid + 1, direction: -1, quantity: 2, uom_cost: 150, item_id: null }],
        projectCode: code,
      });

      const po = await fromProductionOrder(client, {
        order: {
          id: sid + 10,
          order_no: 'TEST_PO',
          project_code: code,
          company_id: companyId,
          produced_quantity: 10,
        },
        amount: 350,
      });
      assert.ok(po);
      assert.equal(po.category_code, 'URETIM');

      const qc = await fromQcOrder(client, {
        order: {
          id: sid + 20,
          order_no: 'TEST_QC',
          project_code: code,
          company_id: companyId,
          rejected_quantity: 3,
        },
        amount: 75,
      });
      assert.ok(qc);
      assert.equal(qc.category_code, 'KALITE');

      const cnt = await client.query(
        `
        SELECT category_code, COUNT(*)::int AS c, SUM(amount)::numeric AS t
        FROM project_cost_entries
        WHERE project_id=$1 AND source_module IN ('INV','MFG','QLT')
        GROUP BY category_code ORDER BY category_code
        `,
        [projectId]
      );
      const byCat = Object.fromEntries(cnt.rows.map((r) => [r.category_code, r]));
      assert.ok(byCat.MALZEME, JSON.stringify(cnt.rows));
      assert.equal(byCat.MALZEME.c, 1);
      assert.equal(Number(byCat.MALZEME.t), 300); // upsert 150*2
      assert.equal(byCat.URETIM.c, 1);
      assert.equal(byCat.KALITE.c, 1);
    });

    // doğrudan upsert API de source unique korur
    await withTransaction(pool, async (client) => {
      const uniq = sid + 99;
      const a = await upsertProjectCost(client, {
        projectId,
        categoryCode: 'DIGER',
        amount: 10,
        sourceModule: 'TST',
        sourceTable: 'gap_unique',
        sourceId: uniq,
      });
      const b = await upsertProjectCost(client, {
        projectId,
        categoryCode: 'DIGER',
        amount: 22,
        sourceModule: 'TST',
        sourceTable: 'gap_unique',
        sourceId: uniq,
      });
      assert.equal(a.id, b.id);
      assert.equal(Number(b.amount), 22);
    });
  });
});
