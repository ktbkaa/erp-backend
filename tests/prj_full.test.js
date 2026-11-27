const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('prj full stages 4-7', () => {
  let app, pool, headers, companyId, userId, project;

  before(async () => {
    ({ app, pool } = createApp());
    const c = await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
    companyId = c.rows[0].id;
    const u = await pool.query(`SELECT id, user_code FROM users WHERE is_active LIMIT 1`);
    userId = u.rows[0].id;
    headers = { 'X-Firma-Id': String(companyId), 'X-Kullanici-Kodu': u.rows[0].user_code };

    const p = await request(app, 'POST', '/prj-integrations/from-template/TPL_MAKINE', {
      headers,
      body: {
        project_name: 'TEST_ Makine Kurulum E2E',
        project_code: `TEST_E2E_${Date.now().toString().slice(-6)}`,
        manager_user_id: userId,
        plan_start_date: '2026-02-01',
        plan_end_date: '2026-08-01',
      },
    });
    assert.equal(p.status, 201, JSON.stringify(p.json));
    project = p.json;
  });

  it('şablondan işler oluşur', async () => {
    const items = await request(app, 'GET', `/prj-isler?project_id=${project.id}`, { headers });
    assert.equal(items.status, 200);
    assert.ok(items.json.length >= 5, `beklenen >=5 iş, gelen ${items.json.length}`);
  });

  it('board + WIP/transition', async () => {
    // Board ilk çağrıda oluşur; mevcut board OPEN sütunu yoksa yeniden oluştur
    await pool.query(`DELETE FROM prj_board_columns WHERE board_id IN (SELECT id FROM prj_boards WHERE project_id=$1)`, [project.id]);
    await pool.query(`DELETE FROM prj_boards WHERE project_id=$1`, [project.id]);
    const board = await request(app, 'GET', `/prj-board?project_id=${project.id}`, { headers });
    assert.equal(board.status, 200, JSON.stringify(board.json));
    assert.ok(board.json.columns?.length >= 3);
    const card = board.json.columns.flatMap((c) => c.cards || [])[0];
    assert.ok(card, 'en az bir kart');
    const todoCol = board.json.columns.find((c) => c.status_code === 'TODO' || c.status_code === 'IN_PROGRESS');
    if (todoCol) {
      const mv = await request(app, 'POST', '/prj-board/move', {
        headers,
        body: { work_item_id: card.id, to_status_id: todoCol.status_id },
      });
      assert.ok(mv.status === 200 || mv.status === 400, JSON.stringify(mv.json));
    }
  });

  it('sprint yaşam döngüsü', async () => {
    const sp = await request(app, 'POST', '/prj-sprintler', {
      headers,
      body: {
        project_id: project.id,
        sprint_name: 'TEST_ Sprint 1',
        start_date: '2026-02-01',
        end_date: '2026-02-14',
        capacity_hours: 80,
      },
    });
    assert.equal(sp.status, 201, JSON.stringify(sp.json));
    const items = await request(app, 'GET', `/prj-isler?project_id=${project.id}`, { headers });
    const wi = items.json[0];
    const add = await request(app, 'POST', `/prj-sprintler/${sp.json.id}/items`, {
      headers,
      body: { work_item_id: wi.id },
    });
    assert.equal(add.status, 201);
    const start = await request(app, 'POST', `/prj-sprintler/${sp.json.id}/start`, { headers });
    assert.equal(start.status, 200);
    const done = await request(app, 'POST', `/prj-sprintler/${sp.json.id}/complete`, {
      headers,
      body: { move_remaining_to: 'backlog' },
    });
    assert.equal(done.status, 200, JSON.stringify(done.json));
  });

  it('bütçe + maliyet + aşım otomasyonu', async () => {
    const line = await request(app, 'POST', `/prj-budget/${project.id}/lines`, {
      headers,
      body: {
        category_code: 'PERSONEL',
        category_name: 'Personel',
        planned_qty: 100,
        unit_price: 100,
        planned_amount: 10000,
      },
    });
    assert.equal(line.status, 201, JSON.stringify(line.json));
    const cost = await request(app, 'POST', `/prj-budget/${project.id}/costs`, {
      headers,
      body: {
        category_code: 'PERSONEL',
        amount: 15000,
        source_module: 'PRJ',
        source_table: 'manual_test',
        source_id: Date.now() % 1000000,
        description: 'TEST_ maliyet',
      },
    });
    assert.equal(cost.status, 201, JSON.stringify(cost.json));
    const sum = await request(app, 'GET', `/prj-budget/${project.id}/summary`, { headers });
    assert.equal(sum.status, 200);
    assert.ok(sum.json.overrun === true);
  });

  it('gantt + backlog + workload + dashboard', async () => {
    for (const url of [
      `/prj-planning/gantt?project_id=${project.id}`,
      `/prj-planning/backlog?project_id=${project.id}`,
      `/prj-planning/workload?project_id=${project.id}`,
      `/prj-dashboard/overview?project_id=${project.id}`,
      '/prj-dashboard/portfolio',
    ]) {
      const r = await request(app, 'GET', url, { headers });
      assert.equal(r.status, 200, `${url} -> ${r.status} ${JSON.stringify(r.json)}`);
    }
  });

  it('risk + kapanış checklist', async () => {
    const risk = await request(app, 'POST', '/prj-riskler', {
      headers,
      body: {
        project_id: project.id,
        title: 'TEST_ Tedarik gecikmesi',
        probability: 'High',
        impact: 'High',
        mitigation: 'Alternatif tedarikçi',
      },
    });
    assert.equal(risk.status, 201, JSON.stringify(risk.json));
    assert.ok(risk.json.score >= 6);

    const close = await request(app, 'POST', `/prj-integrations/projects/${project.id}/close`, {
      headers,
      body: { force: true, close_notes: 'TEST_ kapanış' },
    });
    assert.equal(close.status, 200, JSON.stringify(close.json));
    assert.ok(Array.isArray(close.json.checklist));
  });

  it('alt görev açıkken done engeli', async () => {
    const p2 = await request(app, 'POST', '/prj-projeler', {
      headers,
      body: { project_name: 'TEST_ WF guard', project_code: `TEST_WF_${Date.now().toString().slice(-5)}` },
    });
    const parent = await request(app, 'POST', '/prj-isler', {
      headers,
      body: { project_id: p2.json.id, title: 'TEST_ parent' },
    });
    await request(app, 'POST', '/prj-isler', {
      headers,
      body: { project_id: p2.json.id, parent_id: parent.json.id, title: 'TEST_ child open' },
    });
    const doneSt = await pool.query(`SELECT id FROM prj_work_item_statuses WHERE status_code='DONE'`);
    const tr = await request(app, 'POST', `/prj-workflows/work-items/${parent.json.id}/transition`, {
      headers,
      body: { to_status_id: doneSt.rows[0].id },
    });
    assert.equal(tr.status, 400);
  });
});
