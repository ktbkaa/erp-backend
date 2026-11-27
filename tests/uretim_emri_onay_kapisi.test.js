/**
 * Üretim emri (URETIM_EMRI) genel onay kapısına bağlanabilir: kural yokken Kolay İş Emri
 * Onayı emri doğrudan açar (iz: DOGRUDAN_ONAY); kural varken emir OnayBekliyor olur,
 * onay kaydı kapanınca Acik + is_approved olur.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { request } = require('./helpers/app');

describe('üretim emri onay kapısı', () => {
  let app;
  const sfx = String(Date.now()).slice(-7);
  const adminCode = `tst-ue-adm-${sfx}`;
  let companyId;
  let adminId;
  let itemId;
  const orderIds = [];
  const ruleIds = [];
  const routeIds = [];

  const admin = () => ({ 'X-Kullanici-Kodu': adminCode, 'X-Firma-Id': String(companyId) });

  async function newOrder() {
    const r = await pool.query(
      `INSERT INTO production_orders (order_no, item_id, planned_quantity, status, company_id, is_approved, is_open)
       VALUES ($1, $2, 5, 'Taslak', $3, FALSE, 'Acik') RETURNING id`,
      [`TST-UE-${sfx}-${orderIds.length}`, itemId, companyId],
    );
    const id = r.rows[0].id;
    await pool.query(
      `INSERT INTO production_order_operations (order_id, line_no, operation_code, operation_name, planned_quantity)
       VALUES ($1, 10, 'OP10', 'Test operasyonu', 5)`,
      [id],
    );
    orderIds.push(id);
    return id;
  }

  async function order(id) {
    return (await pool.query('SELECT status, is_approved FROM production_orders WHERE id = $1', [id])).rows[0];
  }

  async function auditActions(id) {
    const r = await request(app, 'GET', `/onay-izi?document_type_code=URETIM_EMRI&document_id=${id}`, { headers: admin() });
    assert.equal(r.status, 200, r.text);
    return r.json.map((x) => x.action).reverse();
  }

  before(async () => {
    require('dotenv').config();
    if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';
    const { authOptional, authRequired } = require('../src/middleware/authJwt');
    app = express();
    app.use(express.json());
    app.use(authOptional);
    app.use(authRequired);
    app.use('/uretim-emirleri', require('../routes/production_orders'));
    app.use('/onay-kurallari', require('../routes/approval_rules'));
    app.use('/onay-bekleyenler', require('../routes/approval_inbox'));
    app.use('/onay-izi', require('../routes/approval_audit'));

    companyId = (await pool.query(
      `INSERT INTO companies (company_code, company_name) VALUES ($1, $2) RETURNING id`,
      [`TSTUE${sfx}`, `Üretim onay test ${sfx}`],
    )).rows[0].id;
    adminId = (await pool.query(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active)
       VALUES ('Test', 'Yonetici', $1, 'Yonetici', TRUE) RETURNING id`, [adminCode],
    )).rows[0].id;
    itemId = (await pool.query(
      `INSERT INTO items (item_code, item_name, item_type, uom_code, is_active)
       VALUES ($1, 'Üretim onay test mamul', 'Mamul', 'AD', TRUE) RETURNING id`,
      [`TST-UE-${sfx}`],
    )).rows[0].id;
  });

  after(async () => {
    const q = (sql, p) => pool.query(sql, p).catch(() => {});
    await q(`DELETE FROM approval_audit_log WHERE document_type_code = 'URETIM_EMRI' AND document_id = ANY($1)`, [orderIds]);
    await q('DELETE FROM approval_records WHERE company_id = $1', [companyId]);
    await q('DELETE FROM approval_routes WHERE id = ANY($1)', [routeIds]);
    await q('DELETE FROM approval_rules WHERE id = ANY($1)', [ruleIds]);
    await q('DELETE FROM production_order_operations WHERE order_id = ANY($1)', [orderIds]);
    await q('DELETE FROM production_orders WHERE id = ANY($1)', [orderIds]);
    await q('UPDATE items SET is_active = FALSE WHERE id = $1', [itemId]);
    await q('DELETE FROM users WHERE id = $1', [adminId]);
  });

  it('kural yokken emir doğrudan açılır ve onay izine DOGRUDAN_ONAY yazılır', async () => {
    const id = await newOrder();
    const r = await request(app, 'POST', `/uretim-emirleri/${id}/onayla`, { headers: admin() });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.status, 'Acik');
    assert.equal(r.json.is_approved, true);
    assert.equal(r.json.onay_bekliyor, undefined);
    assert.deepEqual(await auditActions(id), ['DOGRUDAN_ONAY']);

    const id2 = await newOrder();
    const toplu = await request(app, 'POST', '/uretim-emirleri/toplu-onay', { headers: admin(), body: { ids: [id2] } });
    assert.equal(toplu.status, 200, toplu.text);
    assert.equal(toplu.json.basarili_sayisi, 1);
    assert.equal(toplu.json.basarili[0].onay_bekliyor, false);
    assert.equal((await order(id2)).status, 'Acik');
  });

  it('kural varken emir onay bekler; onay kaydı kapanınca açılır', async () => {
    const rule = await request(app, 'POST', '/onay-kurallari', {
      headers: admin(),
      body: { rule_name: `TST üretim kapı ${sfx}`, company_id: companyId, document_type_code: 'URETIM_EMRI' },
    });
    assert.equal(rule.status, 201, rule.text);
    assert.equal(rule.json.screen_id, 'uretim-emirleri');
    ruleIds.push(rule.json.id);
    const route = await pool.query(
      `INSERT INTO approval_routes (route_code, route_name, screen_id, rule_id, company_id, is_active, version_no)
       VALUES ($1, 'TST rota', 'uretim-emirleri', $2, $3, TRUE, 1) RETURNING id`,
      [`TST-UE-RT-${sfx}`, rule.json.id, companyId],
    );
    routeIds.push(route.rows[0].id);
    await pool.query(
      `INSERT INTO approval_route_steps (route_id, line_no, step_name) VALUES ($1, 10, 'Üretim müdürü')`,
      [route.rows[0].id],
    );
    try {
      const id = await newOrder();
      const sub = await request(app, 'POST', '/uretim-emirleri/toplu-onay', { headers: admin(), body: { ids: [id] } });
      assert.equal(sub.status, 200, sub.text);
      assert.equal(sub.json.basarili[0].onay_bekliyor, true);
      assert.deepEqual(await order(id), { status: 'OnayBekliyor', is_approved: false });

      const tekrar = await request(app, 'POST', `/uretim-emirleri/${id}/onayla`, { headers: admin() });
      assert.equal(tekrar.status, 409, tekrar.text);
      assert.equal(tekrar.json.kod, 'ONAY_BEKLIYOR');

      const aday = await request(app, 'GET', `/uretim-emirleri/onay-adaylari?order_no=TST-UE-${sfx}`, { headers: admin() });
      assert.equal(aday.status, 200, aday.text);
      const satir = aday.json.find((x) => x.id === id);
      assert.equal(satir.ready, false);
      assert.ok(satir.onay_no);

      const manual = await request(app, 'PUT', `/uretim-emirleri/${id}`, { headers: admin(), body: { status: 'Acik' } });
      assert.equal(manual.status, 409, manual.text);

      const inbox = await request(app, 'GET', '/onay-bekleyenler?document_type_code=URETIM_EMRI', { headers: admin() });
      const kayit = inbox.json.find((x) => Number(x.document_id) === id);
      assert.ok(kayit, inbox.text);
      const ok = await request(app, 'POST', '/onay-bekleyenler/toplu-onayla', { headers: admin(), body: { ids: [kayit.id] } });
      assert.equal(ok.json.basarili_sayisi, 1, ok.text);
      assert.deepEqual(await order(id), { status: 'Acik', is_approved: true });
      assert.deepEqual(await auditActions(id), ['GONDERILDI', 'ADIM_ONAYLANDI', 'ONAYLANDI']);
    } finally {
      await pool.query('UPDATE approval_rules SET is_active = FALSE WHERE id = $1', [rule.json.id]);
    }
  });
});
