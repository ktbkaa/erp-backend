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
    assert.equal(stok.primaryTable, 'stoklar');
  });

  it('ekran detayında kolonlar gelir', async () => {
    const res = await request(app, 'GET', '/meta/ekranlar/stok-karti');
    assert.equal(res.status, 200);
    assert.ok(res.json.tables?.length);
    const master = res.json.tables.find((t) => t.name === 'stoklar');
    assert.ok(master);
    assert.ok(master.columns.some((c) => c.name === 'stok_kodu'));
  });

  it('alan çözümü (F1) tablo+kolon döner', async () => {
    const res = await request(app, 'GET', '/meta/alan?screen=satis-siparisleri&field=cari_id');
    assert.equal(res.status, 200);
    assert.equal(res.json.found, true);
    assert.equal(res.json.tableName, 'siparisler');
    assert.equal(res.json.columnName, 'cari_id');
  });

  it('audit-log tablo_adi queryParam kabul eder', async () => {
    const res = await request(app, 'GET', '/audit-log?tablo_adi=siparisler&limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.json));
  });
});
