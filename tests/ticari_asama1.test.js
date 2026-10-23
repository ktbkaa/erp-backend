/**
 * Aşama 1: ödeme/teslimat/dil/banka/exchange_rate + transfer emri + sayım belgesi
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('ticari asama1', () => {
  let app;
  let pool;

  before(() => {
    ({ app, pool } = createApp());
  });

  it('ödeme koşulları seed + soft-delete', async () => {
    const list = await request(app, 'GET', '/odeme-kosullari?is_active=true');
    assert.equal(list.status, 200);
    assert.ok(list.json.length >= 3);
    const post = await request(app, 'POST', '/odeme-kosullari', {
      body: { term_name: 'Test Koşul 7 gün', due_days: 7 },
    });
    assert.equal(post.status, 201);
    const id = post.json.id;
    const del = await request(app, 'DELETE', `/odeme-kosullari/${id}`);
    assert.equal(del.status, 200);
    assert.equal(del.json.soft, true);
    const again = await request(app, 'GET', `/odeme-kosullari/${id}`);
    assert.equal(again.status, 200);
    assert.equal(again.json.is_active, false);
  });

  it('döviz kuru çeviri', async () => {
    const r = await request(app, 'GET', '/doviz-kurlari/cevir?quantity=10&source_pb=USD&target_pb=TRY&type=satis');
    assert.equal(r.status, 200);
    assert.ok(Number(r.json.result) > 10);
  });

  it('transfer emri taslak oluştur', async () => {
    const warehouses = await request(app, 'GET', '/warehouses');
    assert.ok(warehouses.json.length >= 2, 'en az 2 depo');
    const items = await request(app, 'GET', '/items');
    const stok = (items.json || []).find((s) => s.item_code && s.item_code.startsWith('H'));
    assert.ok(stok, 'hammadde stok');
    const emir = await request(app, 'POST', '/transfer-emirleri', {
      body: {
        source_warehouse_id: warehouses.json[0].id,
        target_warehouse_id: warehouses.json[1].id,
        satirlar: [{ item_id: stok.id, quantity: 1 }],
        description: 'test transfer',
      },
    });
    assert.equal(emir.status, 201, emir.text);
    assert.equal(emir.json.status, 'Taslak');
    assert.ok(emir.json.order_no);
    // iptal et (stok hareketi oluşturmadan)
    const iptal = await request(app, 'POST', `/transfer-emirleri/${emir.json.id}/iptal`);
    assert.equal(iptal.status, 200);
    assert.equal(iptal.json.status, 'Iptal');
  });

  it('sayım belgesi taslak + sistem quantity', async () => {
    const warehouses = await request(app, 'GET', '/warehouses');
    const items = await request(app, 'GET', '/items');
    const stok = (items.json || []).find((s) => s.item_code === 'H00001') || items.json[0];
    const belge = await request(app, 'POST', '/sayim-belgeleri', {
      body: {
        warehouse_id: warehouses.json[0].id,
        satirlar: [{ item_id: stok.id, sayilan_quantity: 0 }],
        description: 'test sayim',
      },
    });
    assert.equal(belge.status, 201, belge.text);
    assert.equal(belge.json.status, 'Taslak');
    assert.ok(belge.json.satirlar[0]);
    const iptal = await request(app, 'POST', `/sayim-belgeleri/${belge.json.id}/iptal`);
    assert.equal(iptal.status, 200);
  });
});
