const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { faturaEslestir } = require('../src/services/faturaEslestirmeService');

describe('fatura 3-way match', () => {
  let app, pool;
  before(() => {
    ({ app, pool } = createApp());
  });

  it('eşleştirme kaydı üretir (alış)', async () => {
    const faturaId = await withTransaction(pool, async (client) => {
      const cari = await client.query(`SELECT id FROM partners ORDER BY id LIMIT 1`);
      const stok = await client.query(`SELECT id FROM items ORDER BY id LIMIT 1`);
      if (!cari.rows[0] || !stok.rows[0]) return null;
      const no = `AF-3W-${Date.now()}`;
      const f = await client.query(
        `INSERT INTO invoices (invoice_no, partner_id, invoice_type, total_amount, status)
         VALUES ($1,$2,'Alis',100,'Taslak') RETURNING id`,
        [no, cari.rows[0].id]
      );
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, item_id, quantity, unit_price, total_amount)
         VALUES ($1,$2,10,10,100)`,
        [f.rows[0].id, stok.rows[0].id]
      );
      return f.rows[0].id;
    });

    if (!faturaId) {
      console.log('SKIP 3way — seed eksik');
      return;
    }

    const row = await withTransaction(pool, (client) => faturaEslestir(client, faturaId));
    assert.ok(row.id);
    assert.ok(['Bekliyor', 'Uyumlu', 'FiyatFark', 'MiktarFark', 'Askida'].includes(row.result));

    const api = await request(app, 'GET', `/fatura-kontrolleri?invoice_id=${faturaId}`);
    assert.equal(api.status, 200);
    assert.ok(Array.isArray(api.json));
    assert.ok(api.json.some((r) => Number(r.invoice_id) === Number(faturaId)));
  });

  it('satış faturasında 3-way reddeder', async () => {
    const faturaId = await withTransaction(pool, async (client) => {
      const cari = await client.query(`SELECT id FROM partners ORDER BY id LIMIT 1`);
      const stok = await client.query(`SELECT id FROM items ORDER BY id LIMIT 1`);
      if (!cari.rows[0] || !stok.rows[0]) return null;
      const f = await client.query(
        `INSERT INTO invoices (invoice_no, partner_id, invoice_type, total_amount)
         VALUES ($1,$2,'Satis',50) RETURNING id`,
        [`SF-3W-${Date.now()}`, cari.rows[0].id]
      );
      await client.query(
        `INSERT INTO invoice_lines (invoice_id, item_id, quantity, unit_price, total_amount)
         VALUES ($1,$2,1,50,50)`,
        [f.rows[0].id, stok.rows[0].id]
      );
      return f.rows[0].id;
    });
    if (!faturaId) return;

    let status = 200;
    try {
      await withTransaction(pool, (client) => faturaEslestir(client, faturaId));
    } catch (e) {
      status = e.status || 500;
    }
    assert.equal(status, 400);
  });
});
