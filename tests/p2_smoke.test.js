const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('p2 smoke', () => {
  let app, pool;
  before(() => {
    ({ app, pool } = createApp());
  });

  it('sabit kıymet oluştur + amortisman', async () => {
    const firm = await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
    const firmaId = firm.rows[0]?.id || null;
    const create = await request(app, 'POST', '/sabit-kiymetler', {
      body: {
        company_id: firmaId,
        asset_name: 'P2 Test Makine',
        acquisition_cost: 12000,
        useful_life_months: 12,
      },
    });
    assert.ok(create.status === 201 || create.status === 200, `create ${create.status} ${JSON.stringify(create.json)}`);
    const id = create.json.id;
    const dep = await request(app, 'POST', `/sabit-kiymetler/${id}/amortisman`, { body: {} });
    assert.ok(dep.status === 201 || dep.status === 200, `amort ${dep.status}`);
    assert.ok(Number(dep.json.amount) > 0);
  });

  it('banka CSV import', async () => {
    const bank = await pool.query(`SELECT id FROM fin_bank_accounts ORDER BY id LIMIT 1`);
    const csv = 'tarih;tutar;yon;aciklama\n2026-11-01;1000;1;Test giris\n2026-11-02;250;-1;Test cikis\n';
    const res = await request(app, 'POST', '/banka-mutabakat/import-csv', {
      body: {
        csv,
        bank_account_id: bank.rows[0]?.id || null,
        reference_no: 'P2CSV',
      },
    });
    assert.ok(res.status === 201 || res.status === 200, `csv ${res.status} ${JSON.stringify(res.json)}`);
    assert.ok((res.json.imported || res.json.satirlar?.length) >= 2);
  });

  it('bakım emri oluştur', async () => {
    const res = await request(app, 'POST', '/bakim-emirleri', {
      body: { order_type: 'Ariza', equipment_code: 'EQ-P2', equipment_name: 'Pres', description: 'P2 test' },
    });
    assert.ok(res.status === 201 || res.status === 200, `mnt ${res.status} ${JSON.stringify(res.json)}`);
  });

  it('iş merkezi yükü 200', async () => {
    const res = await request(app, 'GET', '/is-merkezi-yuku?horizon_days=7');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });
});
