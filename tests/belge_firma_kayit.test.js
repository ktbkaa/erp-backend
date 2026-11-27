/**
 * Belge kaydında company_id damgalanmalı; aksi halde firma listesinde kaybolur.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { resolveDocumentCompanyId } = require('../src/utils/firmaScope');
const { request } = require('./helpers/app');

describe('belge firma kaydı', () => {
  let app;
  let companyId;
  let partnerId;
  let itemId;
  let createdQuotationId;
  const headersBase = { 'X-Kullanici-Kodu': 'admin' };

  before(async () => {
    require('dotenv').config();
    if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';
    const { authOptional, authRequired } = require('../src/middleware/authJwt');
    app = express();
    app.use(express.json());
    app.use(authOptional);
    app.use(authRequired);
    app.use('/sales_quotations', require('../routes/sales_quotations'));

    const f = await pool.query('SELECT id FROM companies ORDER BY id LIMIT 1');
    companyId = f.rows[0].id;
    const p = await pool.query(
      `SELECT id FROM partners WHERE company_id = $1 AND partner_type IN ('Musteri','HerIkisi') ORDER BY id LIMIT 1`,
      [companyId]
    );
    partnerId = p.rows[0]?.id;
    const s = await pool.query(
      `SELECT id FROM items WHERE company_id = $1 OR company_id IS NULL ORDER BY id LIMIT 1`,
      [companyId]
    );
    itemId = s.rows[0]?.id;
    assert.ok(partnerId && itemId, 'test için cari ve stok gerekli');
  });

  after(async () => {
    if (createdQuotationId) {
      await pool.query('DELETE FROM sales_quotation_lines WHERE quotation_id = $1', [createdQuotationId]).catch(() => {});
      await pool.query('DELETE FROM sales_quotations WHERE id = $1', [createdQuotationId]).catch(() => {});
    }
  });

  it('resolveDocumentCompanyId — body yoksa header', () => {
    assert.equal(resolveDocumentCompanyId({ headers: { 'x-firma-id': '7' } }, {}), 7);
    assert.equal(resolveDocumentCompanyId({ headers: { 'x-firma-id': '7' } }, { company_id: 3 }), 3);
  });

  it('POST teklif X-Firma-Id ile company_id yazar ve listede görünür', async () => {
    const headers = { ...headersBase, 'X-Firma-Id': String(companyId) };
    const created = await request(app, 'POST', '/sales_quotations', {
      headers,
      body: {
        partner_id: partnerId,
        currency_code: 'TRY',
        status: 'Taslak',
        kalemler: [{ item_id: itemId, quantity: 1, unit_price: 10, vat_rate: 20 }],
      },
    });
    assert.equal(created.status, 201, created.text);
    createdQuotationId = created.json.id;
    assert.equal(Number(created.json.company_id), Number(companyId), 'company_id damgalanmalı');

    const list = await request(app, 'GET', '/sales_quotations', { headers });
    assert.equal(list.status, 200);
    assert.ok(
      list.json.some((r) => Number(r.id) === Number(createdQuotationId)),
      'yeni teklif firma listesinde olmalı'
    );
  });
});
