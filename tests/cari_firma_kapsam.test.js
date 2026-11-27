/**
 * Cari firma kapsamı: liste filtresi ile GET assert aynı olmalı;
 * partner_company_params üzerinden de görünürlük sağlanmalı.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const {
  andPartnerCompany,
  assertPartnerCompanyRecord,
} = require('../src/utils/firmaScope');
const { request } = require('./helpers/app');

describe('cari firma kapsamı (lookup)', () => {
  let app;
  let companyId;
  let otherCompanyId;
  let plantId;
  let partnerId;
  const headers = { 'X-Kullanici-Kodu': 'admin' };

  before(async () => {
    require('dotenv').config();
    if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';
    const { authOptional, authRequired } = require('../src/middleware/authJwt');
    app = express();
    app.use(express.json());
    app.use(authOptional);
    app.use(authRequired);
    app.use('/partners', require('../routes/partners'));

    const firms = await pool.query(
      `SELECT id FROM companies ORDER BY id LIMIT 5`
    );
    assert.ok(firms.rows.length >= 2, 'en az 2 firma gerekli');
    companyId = firms.rows[0].id;
    otherCompanyId = firms.rows[1].id;
    const iy = await pool.query(
      `SELECT id FROM plants WHERE company_id = $1 ORDER BY id LIMIT 1`,
      [companyId]
    );
    plantId = iy.rows[0]?.id || null;
  });

  after(async () => {
    if (partnerId) {
      await pool.query('DELETE FROM partner_company_params WHERE partner_id = $1', [partnerId]).catch(() => {});
      await pool.query('DELETE FROM partners WHERE id = $1', [partnerId]).catch(() => {});
    }
  });

  it('andPartnerCompany — partner_company_params EXISTS içerir', () => {
    const params = [];
    const sql = andPartnerCompany('partners', 42, params);
    assert.ok(sql.includes('partner_company_params'), sql);
    assert.ok(sql.includes('company_id = $1'), sql);
    assert.deepEqual(params, [42]);
  });

  it('yalnızca partner_company_params ile bağlı cari listede ve GET’te görünür', async () => {
    const kod = `T-CFP-${Date.now().toString(36).toUpperCase()}`;
    const ins = await pool.query(
      `
      INSERT INTO partners (partner_code, partner_name, partner_type, is_active, currency_code)
      VALUES ($1, 'Firma kapsam test cari', 'Musteri', TRUE, 'TRY')
      RETURNING id
      `,
      [kod]
    );
    partnerId = ins.rows[0].id;
    await pool.query(
      `
      INSERT INTO partner_company_params (partner_id, company_id, plant_id, is_active)
      VALUES ($1, $2, $3, TRUE)
      `,
      [partnerId, companyId, plantId]
    );

    assert.equal(await assertPartnerCompanyRecord(pool, partnerId, companyId), true);
    assert.equal(await assertPartnerCompanyRecord(pool, partnerId, otherCompanyId), false);

    const listOk = await request(app, 'GET', '/partners?tur=Musteri&is_active=true', {
      headers: { ...headers, 'X-Firma-Id': String(companyId) },
    });
    assert.equal(listOk.status, 200);
    assert.ok(
      Array.isArray(listOk.json) && listOk.json.some((r) => Number(r.id) === Number(partnerId)),
      'liste firmada görünmeli'
    );

    const listNo = await request(app, 'GET', '/partners?tur=Musteri&is_active=true', {
      headers: { ...headers, 'X-Firma-Id': String(otherCompanyId) },
    });
    assert.equal(listNo.status, 200);
    assert.ok(
      Array.isArray(listNo.json) && !listNo.json.some((r) => Number(r.id) === Number(partnerId)),
      'diğer firmada görünmemeli'
    );

    const getOk = await request(app, 'GET', `/partners/${partnerId}`, {
      headers: { ...headers, 'X-Firma-Id': String(companyId) },
    });
    assert.equal(getOk.status, 200, getOk.text);

    const getNo = await request(app, 'GET', `/partners/${partnerId}`, {
      headers: { ...headers, 'X-Firma-Id': String(otherCompanyId) },
    });
    assert.equal(getNo.status, 404);
  });
});
