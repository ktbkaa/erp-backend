/**
 * PR #129 kısmi ekran düzeltmeleri: PRJ, 409 unique, form POST, stok-depo engeli.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createApp, request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { assertItemWarehouseAllowed, createStockMovement } = require('../src/services/stokHareketService');

describe('sim partial fix (PR #129)', () => {
  let app, pool, headers, companyId;

  before(async () => {
    ({ app, pool } = createApp());
    const c = await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
    companyId = c.rows[0]?.id;
    const u = await pool.query(`SELECT user_code FROM users WHERE is_active LIMIT 1`);
    headers = {
      'X-Firma-Id': String(companyId || ''),
      'X-Kullanici-Kodu': u.rows[0]?.user_code || 'owner',
    };
  });

  it('PRJ tip POST: line_no varsayılan atanır', async () => {
    const code = `T${Date.now().toString().slice(-6)}`;
    const res = await request(app, 'POST', '/prj-project-types', {
      headers,
      body: { type_code: code, type_name: `Test tip ${code}` },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.ok(res.json.line_no != null && Number(res.json.line_no) > 0, 'line_no bekleniyor');
  });

  it('PRJ work-item-type POST: hierarchy_level=task varsayılan', async () => {
    const code = `W${Date.now().toString().slice(-6)}`;
    const res = await request(app, 'POST', '/prj-work-item-types', {
      headers,
      body: { type_code: code, type_name: `WI tip ${code}` },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.equal(res.json.hierarchy_level, 'task');
  });

  it('prj-automations CRUD', async () => {
    const code = `A${Date.now().toString().slice(-6)}`;
    const created = await request(app, 'POST', '/prj-automations', {
      headers,
      body: {
        automation_code: code,
        automation_name: `Otomasyon ${code}`,
        trigger_code: 'ON_STATUS',
        priority: 50,
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const id = created.json.id;
    const upd = await request(app, 'PUT', `/prj-automations/${id}`, {
      headers,
      body: { automation_name: `Güncel ${code}`, is_enabled: false },
    });
    assert.equal(upd.status, 200, JSON.stringify(upd.json));
    assert.equal(upd.json.is_enabled, false);
    const del = await request(app, 'DELETE', `/prj-automations/${id}`, { headers });
    assert.ok([200, 204].includes(del.status), JSON.stringify(del.json));
  });

  it('dashboard/board/gantt/backlog project_id yokken 400 değil', async () => {
    const paths = [
      '/prj-dashboard/overview',
      '/prj-board',
      '/prj-planning/gantt',
      '/prj-planning/backlog',
    ];
    for (const p of paths) {
      const res = await request(app, 'GET', p, { headers });
      assert.notEqual(res.status, 400, `${p} → ${res.status} ${JSON.stringify(res.json)}`);
      assert.ok(res.status < 500, `${p} sunucu hatası: ${JSON.stringify(res.json)}`);
    }
  });

  it('23505 → 409 Türkçe «Bu kod zaten kayıtlı»', async () => {
    const code = `UQ${Date.now().toString().slice(-5)}`;
    const first = await request(app, 'POST', '/prj-project-types', {
      headers,
      body: { type_code: code, type_name: 'İlk' },
    });
    assert.equal(first.status, 201, JSON.stringify(first.json));
    const dup = await request(app, 'POST', '/prj-project-types', {
      headers,
      body: { type_code: code, type_name: 'İkinci' },
    });
    assert.equal(dup.status, 409, JSON.stringify(dup.json));
    assert.match(String(dup.json?.hata || ''), /zaten kayıtlı|zaten var/i);
  });

  it('finans-vergi POST: country_code TR varsayılan', async () => {
    const code = `V${Date.now().toString().slice(-6)}`;
    const res = await request(app, 'POST', '/finans-vergi-kodlari', {
      headers,
      body: {
        tax_code: code,
        tax_name: `Vergi ${code}`,
        oranlar: [{ rate: 20, valid_from: '2020-01-01' }],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    const row = res.json?.id
      ? (await request(app, 'GET', `/finans-vergi-kodlari/${res.json.id}`, { headers })).json
      : res.json;
    assert.equal(String(row.country_code || res.json.country_code).toUpperCase(), 'TR');
  });

  it('hr-bordro parametreler POST: TR + bugün varsayılan', async () => {
    const code = `P${Date.now().toString().slice(-6)}`;
    const res = await request(app, 'POST', '/hr-bordro/parametreler', {
      headers,
      body: { set_code: code, set_name: `Param ${code}` },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.equal(String(res.json.country_code).toUpperCase(), 'TR');
    assert.ok(res.json.effective_from, 'effective_from bekleniyor');
  });

  it('kk-stok-planlari POST: eksik alan → anlaşılır 400', async () => {
    const res = await request(app, 'POST', '/kk-stok-planlari', {
      headers,
      body: { direction: 'GKK' },
    });
    assert.equal(res.status, 400);
    assert.match(String(res.json?.hata || ''), /item_id|plan_id|zorunlu/i);
  });

  it('assertItemWarehouseAllowed: Türkçe stok+depo mesajı, otomatik oluşturmaz', async () => {
    await withTransaction(pool, async (client) => {
      const item = await client.query(
        `INSERT INTO items (item_code, item_name, item_type, uom_code, is_active)
         VALUES ('IW-MSG-' || floor(random()*1e6)::text, 'Depo mesaj test', 'Ticari', 'AD', TRUE)
         RETURNING id, item_code`
      );
      const wh = await client.query(`SELECT id, warehouse_code FROM warehouses ORDER BY id LIMIT 1`);
      if (!wh.rows[0]) return;
      let threw = null;
      try {
        await assertItemWarehouseAllowed(client, item.rows[0].id, wh.rows[0].id);
      } catch (e) {
        threw = e;
      }
      assert.ok(threw, 'bağ yokken engellenmeli');
      assert.match(threw.message, /Stok bu depoya tanımlı değil/);
      assert.match(threw.message, /stok-depo/i);
      assert.ok(threw.message.includes(item.rows[0].item_code));
      assert.ok(threw.message.includes(wh.rows[0].warehouse_code));
      const cnt = await client.query(
        `SELECT COUNT(*)::int AS n FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2`,
        [item.rows[0].id, wh.rows[0].id],
      );
      assert.equal(cnt.rows[0].n, 0, 'otomatik item_warehouses oluşturulmamalı');
    });
  });

  it('createStockMovement depoZorunluAtla=true olsa bile bağ zorunlu', async () => {
    await withTransaction(pool, async (client) => {
      const item = await client.query(
        `INSERT INTO items (item_code, item_name, item_type, uom_code, is_active)
         VALUES ('IW-MV-' || floor(random()*1e6)::text, 'Hareket engel test', 'Ticari', 'AD', TRUE)
         RETURNING id`
      );
      const wh = await client.query(`SELECT id FROM warehouses ORDER BY id LIMIT 1`);
      if (!wh.rows[0]) return;
      let threw = null;
      try {
        await createStockMovement(client, {
          hareketTipi: 'STOK_GIRIS',
          depoId: wh.rows[0].id,
          depoZorunluAtla: true,
          satirlar: [{ item_id: item.rows[0].id, quantity: 1, direction: 1 }],
        });
      } catch (e) {
        threw = e;
      }
      assert.ok(threw, 'depoZorunluAtla atlamamalı');
      assert.equal(threw.code, 'STOK_DEPO_YOK');
    });
  });

  it('UI: bom-level hideSave + finans-vergi country lookup + hr today default', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
    const bom = appJs.indexOf("id: 'bom-level-listesi'");
    assert.ok(bom >= 0);
    assert.ok(appJs.slice(bom, bom + 400).includes('hideSave: true'));
    const tax = appJs.indexOf("id: 'finans-vergi-kodlari'");
    assert.ok(tax >= 0);
    assert.ok(appJs.slice(tax, tax + 2500).includes("lookup: 'country-tanimi'"));
    const hr = appJs.indexOf("id: 'hr-bordro-parametreleri'");
    assert.ok(hr >= 0);
    assert.ok(appJs.slice(hr, hr + 4000).includes("effective_from: 'today'"));
  });
});
