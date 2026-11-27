const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('prj core', () => {
  let app, pool, companyId, userId, headers;

  before(async () => {
    ({ app, pool } = createApp());
    const c = await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
    assert.ok(c.rows[0], 'en az bir firma gerekli');
    companyId = c.rows[0].id;
    const u = await pool.query(`SELECT id, user_code FROM users WHERE is_active LIMIT 1`);
    assert.ok(u.rows[0], 'en az bir kullanıcı gerekli');
    userId = u.rows[0].id;
    headers = {
      'X-Firma-Id': String(companyId),
      'X-Kullanici-Kodu': u.rows[0].user_code,
    };
  });

  it('proje türleri seed listelenir', async () => {
    const res = await request(app, 'GET', '/prj-project-types?is_active=true', { headers });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
    assert.ok(res.json.some((r) => r.type_code === 'MUSTERI'));
  });

  it('TEST_ proje + iş + worklog oluşturur', async () => {
    const p = await request(app, 'POST', '/prj-projeler', {
      headers,
      body: {
        project_name: 'TEST_ Uretim Hatti Kurulum',
        project_code: `TEST_PRJ_${Date.now().toString().slice(-8)}`,
        manager_user_id: userId,
        plan_start_date: '2026-01-01',
        plan_end_date: '2026-06-30',
        planned_budget: 100000,
        approach: 'classic',
      },
    });
    assert.equal(p.status, 201, JSON.stringify(p.json));
    assert.ok(p.json.id);
    assert.ok(String(p.json.project_code).startsWith('TEST_') || p.json.project_code);

    const wi = await request(app, 'POST', '/prj-isler', {
      headers,
      body: {
        project_id: p.json.id,
        title: 'TEST_ Keşif ve teknik değerlendirme',
        estimated_hours: 16,
        assignee_user_id: userId,
      },
    });
    assert.equal(wi.status, 201, JSON.stringify(wi.json));
    assert.ok(wi.json.work_item_no);

    const child = await request(app, 'POST', '/prj-isler', {
      headers,
      body: {
        project_id: p.json.id,
        parent_id: wi.json.id,
        title: 'TEST_ Saha keşfi',
        estimated_hours: 8,
      },
    });
    assert.equal(child.status, 201, JSON.stringify(child.json));

    const free = await pool.query(
      `SELECT d::date::text AS day
         FROM generate_series('2026-01-01'::date, '2026-12-31'::date, '1 day') d
        WHERE NOT EXISTS (SELECT 1 FROM work_logs w WHERE w.user_id = $1 AND w.work_date = d::date)
        ORDER BY random() LIMIT 1`,
      [userId]
    );
    const day = free.rows[0].day;
    const log = await request(app, 'POST', `/prj-isler/${wi.json.id}/work-logs`, {
      headers,
      body: {
        user_id: userId,
        work_date: day,
        hours_spent: 3.5,
        description: 'TEST_ keşif notu',
        start_time: '09:00',
        end_time: '12:30',
      },
    });
    assert.equal(log.status, 201, JSON.stringify(log.json));

    const clash = await request(app, 'POST', `/prj-isler/${wi.json.id}/work-logs`, {
      headers,
      body: {
        user_id: userId,
        work_date: day,
        hours_spent: 1,
        start_time: '11:00',
        end_time: '12:00',
      },
    });
    assert.equal(clash.status, 400);

    const badDate = await request(app, 'POST', '/prj-projeler', {
      headers,
      body: {
        project_name: 'TEST_ bad dates',
        plan_start_date: '2026-06-01',
        plan_end_date: '2026-01-01',
      },
    });
    assert.equal(badDate.status, 400);

    const list = await request(app, 'GET', '/prj-projeler', { headers });
    assert.equal(list.status, 200);
    assert.ok(list.json.some((x) => x.id === p.json.id));
  });

  it('döngüsel parent engellenir', async () => {
    const p = await request(app, 'POST', '/prj-projeler', {
      headers,
      body: { project_name: 'TEST_ cycle parent', project_code: `TEST_CYC_${Date.now().toString().slice(-6)}` },
    });
    assert.equal(p.status, 201);
    const a = await request(app, 'POST', '/prj-isler', {
      headers,
      body: { project_id: p.json.id, title: 'TEST_ A' },
    });
    const b = await request(app, 'POST', '/prj-isler', {
      headers,
      body: { project_id: p.json.id, title: 'TEST_ B', parent_id: a.json.id },
    });
    assert.equal(b.status, 201);
    const cycle = await request(app, 'PUT', `/prj-isler/${a.json.id}`, {
      headers,
      body: { parent_id: b.json.id },
    });
    assert.equal(cycle.status, 400);
  });
});
