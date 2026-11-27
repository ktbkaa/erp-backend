/**
 * Satış onay kapısı: onay modülü tanımlıysa teklif→sipariş dönüşümü OnayBekliyor açar,
 * onay tamamlanana kadar sevk emri ve elle durum değişikliği engellenir.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { request } = require('./helpers/app');

describe('satış onay kapısı', () => {
  let app;
  let companyId;
  let partnerId;
  let itemId;
  let routeId;
  let usageId;
  const quotationIds = [];
  const orderIds = [];
  const suffix = String(Date.now()).slice(-6);
  let userId;
  const userCode = `tst-onay-${suffix}`;
  const headersBase = { 'X-Kullanici-Kodu': userCode };

  async function teklifOlustur(headers) {
    const created = await request(app, 'POST', '/sales_quotations', {
      headers,
      body: {
        partner_id: partnerId,
        currency_code: 'TRY',
        status: 'Onayli',
        kalemler: [{ item_id: itemId, quantity: 1, unit_price: 10, vat_rate: 20 }],
      },
    });
    assert.equal(created.status, 201, created.text);
    quotationIds.push(created.json.id);
    return created.json.id;
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
    app.use('/approval_records', require('../routes/approval_records'));

    const u = await pool.query(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active)
       VALUES ('Test', 'Onay', $1, 'Yonetici', TRUE) RETURNING id`,
      [userCode]
    );
    userId = u.rows[0].id;
    const p = await pool.query(
      `SELECT id, company_id FROM partners
       WHERE company_id IS NOT NULL AND partner_type IN ('Musteri','HerIkisi') ORDER BY id LIMIT 1`
    );
    partnerId = p.rows[0]?.id;
    companyId = p.rows[0]?.company_id;
    const s = await pool.query(
      `SELECT id FROM items WHERE company_id = $1 OR company_id IS NULL ORDER BY id LIMIT 1`,
      [companyId]
    );
    itemId = s.rows[0]?.id;
    assert.ok(partnerId && itemId, 'test için cari ve stok gerekli');
  });

  after(async () => {
    for (const id of orderIds) {
      await pool.query(
        `DELETE FROM approval_record_steps WHERE record_id IN
           (SELECT id FROM approval_records WHERE screen_id='satis-siparisleri' AND document_id=$1)`,
        [id]
      ).catch(() => {});
      await pool.query(
        `DELETE FROM approval_records WHERE screen_id='satis-siparisleri' AND document_id=$1`, [id]
      ).catch(() => {});
      await pool.query('DELETE FROM sales_order_lines WHERE sales_order_id=$1', [id]).catch(() => {});
      await pool.query('DELETE FROM sales_orders WHERE id=$1', [id]).catch(() => {});
    }
    for (const id of quotationIds) {
      await pool.query('DELETE FROM sales_quotation_lines WHERE quotation_id=$1', [id]).catch(() => {});
      await pool.query('DELETE FROM sales_quotations WHERE id=$1', [id]).catch(() => {});
    }
    if (userId) {
      await pool.query('UPDATE approval_record_steps SET approved_by_user_id=NULL WHERE approved_by_user_id=$1', [userId]).catch(() => {});
      await pool.query('UPDATE approval_records SET initiator_user_id=NULL WHERE initiator_user_id=$1', [userId]).catch(() => {});
      await pool.query('DELETE FROM users WHERE id=$1', [userId]).catch(() => {});
    }
    if (usageId) await pool.query('DELETE FROM approval_module_usages WHERE id=$1', [usageId]).catch(() => {});
    if (routeId) {
      await pool.query('DELETE FROM approval_route_steps WHERE route_id=$1', [routeId]).catch(() => {});
      await pool.query('DELETE FROM approval_routes WHERE id=$1', [routeId]).catch(() => {});
    }
  });

  it('onay modülü yoksa sipariş doğrudan Onayli açılır', async () => {
    const headers = { ...headersBase, 'X-Firma-Id': String(companyId) };
    const aktif = await pool.query(
      `SELECT 1 FROM approval_module_usages
       WHERE is_active = TRUE AND screen_id = 'satis-siparisleri'
         AND (company_id IS NULL OR company_id = $1) LIMIT 1`,
      [companyId]
    );
    if (aktif.rows[0]) return;
    const qid = await teklifOlustur(headers);
    const conv = await request(app, 'POST', `/sales_quotations/${qid}/siparise-donustur`, { headers });
    assert.equal(conv.status, 201, conv.text);
    orderIds.push(conv.json.sales_order_id);
    assert.equal(conv.json.status, 'Onayli');
    assert.equal(conv.json.onay_kayit, null);
  });

  it('onay modülü tanımlıysa OnayBekliyor açılır, sevk engellenir, onayla → Onayli', async () => {
    const headers = { ...headersBase, 'X-Firma-Id': String(companyId) };
    const route = await pool.query(
      `INSERT INTO approval_routes (route_code, route_name, company_id, screen_id, is_active)
       VALUES ($1, 'Test satış onayı', $2, 'satis-siparisleri', TRUE) RETURNING id`,
      [`TST-SO-${suffix}`, companyId]
    );
    routeId = route.rows[0].id;
    await pool.query(
      `INSERT INTO approval_route_steps (route_id, line_no, step_name, role_name)
       VALUES ($1, 10, 'Satış müdürü', 'Satış Müdürü')`,
      [routeId]
    );
    const usage = await pool.query(
      `INSERT INTO approval_module_usages (usage_code, usage_name, module_code, screen_id, route_id, company_id, is_active)
       VALUES ($1, 'Test satış onayı', 'SATIS', 'satis-siparisleri', $2, $3, TRUE) RETURNING id`,
      [`OM-TST-${suffix}`, routeId, companyId]
    );
    usageId = usage.rows[0].id;

    const qid = await teklifOlustur(headers);
    const conv = await request(app, 'POST', `/sales_quotations/${qid}/siparise-donustur`, { headers });
    assert.equal(conv.status, 201, conv.text);
    const sid = conv.json.sales_order_id;
    orderIds.push(sid);
    assert.equal(conv.json.status, 'OnayBekliyor');
    assert.ok(conv.json.onay_kayit?.id, 'onay kaydı başlamalı');
    assert.equal(conv.json.onay_kayit.status_code, 'BEKLIYOR');

    const sevk = await request(app, 'POST', `/sales_orders/${sid}/sevk-emri-olustur`, {
      headers,
      body: { warehouse_id: 1 },
    });
    assert.equal(sevk.status, 400, sevk.text);
    assert.equal(sevk.json.kod, 'SIPARIS_ONAY_BEKLIYOR');

    const elle = await request(app, 'PUT', `/sales_orders/${sid}`, {
      headers,
      body: { status: 'Onayli' },
    });
    assert.equal(elle.status, 409, elle.text);
    const hala = await pool.query('SELECT status FROM sales_orders WHERE id=$1', [sid]);
    assert.equal(hala.rows[0].status, 'OnayBekliyor');

    const onay = await request(app, 'POST', `/approval_records/${conv.json.onay_kayit.id}/onayla`, {
      headers,
      body: {},
    });
    assert.equal(onay.status, 200, onay.text);
    const sonra = await pool.query('SELECT status FROM sales_orders WHERE id=$1', [sid]);
    assert.equal(sonra.rows[0].status, 'Onayli');
  });
});
