const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('meta ekran tablolari', () => {
  let app;

  before(() => {
    ({ app } = createApp());
  });

  it('ekran listesi modül gruplu döner', async () => {
    const res = await request(app, 'GET', '/meta/ekranlar');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json.modules));
    assert.ok(Array.isArray(res.json.screens));
    assert.ok(res.json.screens.length >= 90);
    const stok = res.json.screens.find((s) => s.screenId === 'stok-karti');
    assert.ok(stok);
    assert.equal(stok.primaryTable, 'items');
  });

  it('ekran detayında kolonlar gelir', async () => {
    const res = await request(app, 'GET', '/meta/ekranlar/stok-karti');
    assert.equal(res.status, 200);
    assert.ok(res.json.tables?.length);
    const master = res.json.tables.find((t) => t.name === 'items');
    assert.ok(master);
    assert.ok(master.columns.some((c) => c.name === 'item_code'));
  });

  it('alan çözümü (F1) tablo+kolon döner', async () => {
    const res = await request(app, 'GET', '/meta/alan?screen=satis-siparisleri&field=partner_id');
    assert.equal(res.status, 200);
    assert.equal(res.json.found, true);
    assert.equal(res.json.tableName, 'sales_orders');
    assert.equal(res.json.columnName, 'partner_id');
  });

  it('audit-log table_name queryParam kabul eder', async () => {
    const res = await request(app, 'GET', '/audit-log?table_name=sales_orders&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });
});
