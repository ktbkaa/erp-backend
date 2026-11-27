/**
 * Satış teklifi: başlık/satır alanları (KDV durumu, ödeme, toplamlar) kayıtta kaybolmamalı;
 * boş satırlar elenmeli; siparişe dönüşümde toplamlar taşınmalı.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { request } = require('./helpers/app');

describe('satış teklifi alan kalıcılığı', () => {
  let app;
  let companyId;
  let partnerId;
  let itemId;
  let quotationId;
  let orderId;
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
    if (orderId) {
      await pool.query('DELETE FROM sales_order_lines WHERE sales_order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM sales_orders WHERE id = $1', [orderId]).catch(() => {});
    }
    if (quotationId) {
      await pool.query('DELETE FROM sales_quotation_lines WHERE quotation_id = $1', [quotationId]).catch(() => {});
      await pool.query('DELETE FROM sales_quotations WHERE id = $1', [quotationId]).catch(() => {});
    }
  });

  it('POST: KDV Dahil, iskonto 2, ödeme ve toplamlar saklanır; boş satır elenir', async () => {
    const headers = { ...headersBase, 'X-Firma-Id': String(companyId) };
    const created = await request(app, 'POST', '/sales_quotations', {
      headers,
      body: {
        partner_id: partnerId,
        payment_term_code: '30GUN',
        payment_method: 'Havale',
        delivery_term_code: 'EXW',
        public_note: 'müşteri notu',
        kalemler: [
          {
            item_id: itemId, quantity: 2, unit_price: 120, vat_rate: 20, vat_mode: 'Dahil',
            discount_rate: 10, discount_rate_2: 5, line_description: 'açıklama',
          },
          { item_id: null, quantity: 0 },
        ],
      },
    });
    assert.equal(created.status, 201, created.text);
    quotationId = created.json.id;
    assert.equal(created.json.satirlar.length, 1);
    assert.equal(created.json.satirlar[0].vat_mode, 'Dahil');
    assert.equal(Number(created.json.satirlar[0].discount_rate_2), 5);
    assert.equal(created.json.satirlar[0].line_description, 'açıklama');
    assert.equal(created.json.payment_method, 'Havale');
    assert.equal(created.json.payment_term_code, '30GUN');
    assert.equal(created.json.delivery_term_code, 'EXW');
    assert.equal(created.json.public_note, 'müşteri notu');
    assert.ok(Number(created.json.grand_total) > 0, 'grand_total yazılmalı');
    assert.equal(Number(created.json.grand_total), Number(created.json.total_amount));
  });

  it('PUT: başlık alanları ve satırlar güncellenir', async () => {
    const headers = { ...headersBase, 'X-Firma-Id': String(companyId) };
    const put = await request(app, 'PUT', `/sales_quotations/${quotationId}`, {
      headers,
      body: {
        payment_method: 'Nakit',
        kalemler: [{ item_id: itemId, quantity: 1, unit_price: 100, vat_rate: 10, vat_mode: 'Haric' }],
      },
    });
    assert.equal(put.status, 200, put.text);
    assert.equal(put.json.payment_method, 'Nakit');
    assert.equal(put.json.payment_term_code, '30GUN');
    assert.equal(put.json.satirlar[0].vat_mode, 'Haric');
    assert.equal(Number(put.json.grand_total), 110);
  });

  it('siparişe dönüşümde ara toplam / KDV / genel toplam ve ödeme şekli taşınır', async () => {
    const headers = { ...headersBase, 'X-Firma-Id': String(companyId) };
    const conv = await request(app, 'POST', `/sales_quotations/${quotationId}/siparise-donustur`, {
      headers,
      body: {},
    });
    assert.equal(conv.status, 201, conv.text);
    orderId = conv.json.sales_order_id;
    const o = await pool.query(
      'SELECT subtotal, tax_amount, grand_total, payment_method FROM sales_orders WHERE id = $1',
      [orderId]
    );
    assert.equal(Number(o.rows[0].subtotal), 100);
    assert.equal(Number(o.rows[0].tax_amount), 10);
    assert.equal(Number(o.rows[0].grand_total), 110);
    assert.equal(o.rows[0].payment_method, 'Nakit');
  });

  it('yalnız boş satır gelirse 400', async () => {
    const res = await request(app, 'POST', '/sales_quotations', {
      headers: { ...headersBase, 'X-Firma-Id': String(companyId) },
      body: { partner_id: partnerId, kalemler: [{ item_id: itemId, quantity: 0 }] },
    });
    assert.equal(res.status, 400, res.text);
  });
});
