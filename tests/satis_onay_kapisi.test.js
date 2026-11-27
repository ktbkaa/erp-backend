/**
 * Satış siparişi genel onay kapısına bağlı (SATIS_SIPARIS): kural yoksa sipariş eskisi gibi
 * Onayli açılır; kural varsa OnayBekliyor açılır, sevk ve elle durum değişikliği engellenir,
 * onaylanınca Onayli, reddedilince kuralın ret sonucuna döner.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { request } = require('./helpers/app');

describe('satış onay kapısı', () => {
  let app;
  const sfx = String(Date.now()).slice(-7);
  const userCode = `tst-satis-onay-${sfx}`;
  let companyId;
  let partnerId;
  let itemId;
  let userId;
  let ruleId;
  let routeId;
  const quotationIds = [];
  const orderIds = [];
  const headers = () => ({ 'X-Kullanici-Kodu': userCode, 'X-Firma-Id': String(companyId) });

  async function teklifdenSiparis() {
    const created = await request(app, 'POST', '/sales_quotations', {
      headers: headers(),
      body: {
        partner_id: partnerId,
        currency_code: 'TRY',
        status: 'Onayli',
        kalemler: [{ item_id: itemId, quantity: 1, unit_price: 10, vat_rate: 20 }],
      },
    });
    assert.equal(created.status, 201, created.text);
    quotationIds.push(created.json.id);
    const conv = await request(app, 'POST', `/sales_quotations/${created.json.id}/siparise-donustur`, { headers: headers() });
    assert.equal(conv.status, 201, conv.text);
    orderIds.push(conv.json.sales_order_id);
    return conv.json;
  }

  async function siparisDurum(id) {
    const r = await pool.query('SELECT status, approved_by FROM sales_orders WHERE id = $1', [id]);
    return r.rows[0];
  }

  before(async () => {
    require('dotenv').config();
    if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';
    const { authOptional, authRequired } = require('../src/middleware/authJwt');
    app = express();
    app.use(express.json());
    app.use(authOptional);
    app.use(authRequired);
    app.use('/sales_quotations', require('../routes/sales_quotations'));
    app.use('/sales_orders', require('../routes/sales_orders'));
    app.use('/onay-kayitlari', require('../routes/approval_records'));
    app.use('/onay-kurallari', require('../routes/approval_rules'));

    companyId = (await pool.query(
      `INSERT INTO companies (company_code, company_name) VALUES ($1, $2) RETURNING id`,
      [`TSTSAT${sfx}`, `Satış onay test ${sfx}`],
    )).rows[0].id;
    userId = (await pool.query(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active)
       VALUES ('Test', 'Onay', $1, 'Yonetici', TRUE) RETURNING id`, [userCode],
    )).rows[0].id;
    partnerId = (await pool.query(
      `INSERT INTO partners (partner_code, partner_name, partner_type, company_id)
       VALUES ($1, 'Satış onay test müşteri', 'Musteri', $2) RETURNING id`,
      [`TSTM${sfx}`, companyId],
    )).rows[0].id;
    itemId = (await pool.query(
      `INSERT INTO items (item_code, item_name, item_type, uom_code, is_active)
       VALUES ($1, 'Satış onay test stok', 'Ticari', 'AD', TRUE) RETURNING id`,
      [`TST-SO-${sfx}`],
    )).rows[0].id;
  });

  after(async () => {
    const q = (sql, p) => pool.query(sql, p).catch(() => {});
    await q('DELETE FROM approval_audit_log WHERE company_id = $1', [companyId]);
    await q('DELETE FROM approval_records WHERE company_id = $1', [companyId]);
    if (routeId) await q('DELETE FROM approval_routes WHERE id = $1', [routeId]);
    if (ruleId) await q('DELETE FROM approval_rules WHERE id = $1', [ruleId]);
    for (const id of orderIds) {
      await q('DELETE FROM sales_order_lines WHERE sales_order_id = $1', [id]);
      await q('DELETE FROM sales_orders WHERE id = $1', [id]);
    }
    for (const id of quotationIds) {
      await q('DELETE FROM sales_quotation_lines WHERE quotation_id = $1', [id]);
      await q('DELETE FROM sales_quotations WHERE id = $1', [id]);
    }
    await q('UPDATE partners SET is_active = FALSE WHERE id = $1', [partnerId]);
    await q('DELETE FROM users WHERE id = $1', [userId]);
  });

  it('kural yoksa sipariş doğrudan Onayli açılır', async () => {
    const conv = await teklifdenSiparis();
    assert.equal(conv.status, 'Onayli');
    assert.equal(conv.onay_kayit, null);
    assert.equal(conv.onay_bekliyor, false);
  });

  it('kural varsa OnayBekliyor açılır, sevk ve elle durum engellenir, onayla → Onayli', async () => {
    const rule = await request(app, 'POST', '/onay-kurallari', {
      headers: headers(),
      body: { rule_name: `TST satış ${sfx}`, document_type_code: 'SATIS_SIPARIS', company_id: companyId },
    });
    assert.equal(rule.status, 201, rule.text);
    assert.equal(rule.json.screen_id, 'satis-siparisleri');
    ruleId = rule.json.id;
    routeId = (await pool.query(
      `INSERT INTO approval_routes (route_code, route_name, screen_id, rule_id, company_id, is_active, version_no)
       VALUES ($1, 'TST satış rota', 'satis-siparisleri', $2, $3, TRUE, 1) RETURNING id`,
      [`TST-SR-${sfx}`, ruleId, companyId],
    )).rows[0].id;
    await pool.query(
      `INSERT INTO approval_route_steps (route_id, line_no, step_name, role_name)
       VALUES ($1, 10, 'Satış müdürü', 'Satış Müdürü')`,
      [routeId],
    );

    const conv = await teklifdenSiparis();
    const sid = conv.sales_order_id;
    assert.equal(conv.status, 'OnayBekliyor');
    assert.equal(conv.onay_bekliyor, true);
    assert.equal(conv.onay_kayit.status_code, 'BEKLIYOR');
    assert.equal(conv.onay_kayit.document_type_code, 'SATIS_SIPARIS');

    const sevk = await request(app, 'POST', `/sales_orders/${sid}/sevk-emri-olustur`, {
      headers: headers(), body: { warehouse_id: 1 },
    });
    assert.equal(sevk.status, 409, sevk.text);
    assert.equal(sevk.json.kod, 'ONAY_BEKLIYOR');

    const elle = await request(app, 'PUT', `/sales_orders/${sid}`, { headers: headers(), body: { status: 'Kapali' } });
    assert.equal(elle.status, 409, elle.text);
    assert.equal((await siparisDurum(sid)).status, 'OnayBekliyor');

    const onay = await request(app, 'POST', `/onay-kayitlari/${conv.onay_kayit.id}/onayla`, { headers: headers() });
    assert.equal(onay.status, 200, onay.text);
    const sonra = await siparisDurum(sid);
    assert.equal(sonra.status, 'Onayli');
    assert.equal(sonra.approved_by, userCode);
  });

  it('Taslak sipariş elle Onayli yapılınca onaya gider; ret sonucu kuraldan (İptal)', async () => {
    assert.ok(ruleId, 'önceki test kuralı kurmalı');
    const upd = await request(app, 'PUT', `/onay-kurallari/${ruleId}`, { headers: headers(), body: { reject_outcome: 'IPTAL' } });
    assert.equal(upd.status, 200, upd.text);

    const created = await request(app, 'POST', '/sales_orders', {
      headers: headers(),
      body: {
        partner_id: partnerId,
        order_type: 'SatisSiparis',
        status: 'Taslak',
        kalemler: [{ item_id: itemId, quantity: 2, unit_price: 5 }],
      },
    });
    assert.equal(created.status, 201, created.text);
    orderIds.push(created.json.id);
    assert.equal(created.json.status, 'Taslak');

    const put = await request(app, 'PUT', `/sales_orders/${created.json.id}`, { headers: headers(), body: { status: 'Onayli' } });
    assert.equal(put.status, 200, put.text);
    assert.equal(put.json.status, 'OnayBekliyor');
    assert.equal(put.json.onay_bekliyor, true);

    const red = await request(app, 'POST', `/onay-kayitlari/${put.json.onay_kayit.id}/reddet`, {
      headers: headers(), body: { notes: 'fiyat hatalı' },
    });
    assert.equal(red.status, 200, red.text);
    assert.equal((await siparisDurum(created.json.id)).status, 'Iptal');

    const direkt = await request(app, 'POST', '/sales_orders', {
      headers: headers(),
      body: {
        partner_id: partnerId,
        order_type: 'SatisSiparis',
        status: 'OnayBekliyor',
        kalemler: [{ item_id: itemId, quantity: 1, unit_price: 5 }],
      },
    });
    assert.equal(direkt.status, 409, direkt.text);
  });
});
