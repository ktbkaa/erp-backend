/**
 * Aşama 1: ödeme/teslimat/dil/banka/kur + transfer emri + sayım belgesi
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
    const list = await request(app, 'GET', '/odeme-kosullari?aktif=true');
    assert.equal(list.status, 200);
    assert.ok(list.json.length >= 3);
    const post = await request(app, 'POST', '/odeme-kosullari', {
      body: { kosul_adi: 'Test Koşul 7 gün', vade_gun: 7 },
    });
    assert.equal(post.status, 201);
    const id = post.json.id;
    const del = await request(app, 'DELETE', `/odeme-kosullari/${id}`);
    assert.equal(del.status, 200);
    assert.equal(del.json.soft, true);
    const again = await request(app, 'GET', `/odeme-kosullari/${id}`);
    assert.equal(again.status, 200);
    assert.equal(again.json.aktif, false);
  });

  it('döviz kuru çeviri', async () => {
    const r = await request(app, 'GET', '/doviz-kurlari/cevir?miktar=10&kaynak_pb=USD&hedef_pb=TRY&tip=satis');
    assert.equal(r.status, 200);
    assert.ok(Number(r.json.sonuc) > 10);
  });

  it('transfer emri taslak oluştur', async () => {
    const depolar = await request(app, 'GET', '/depolar');
    assert.ok(depolar.json.length >= 2, 'en az 2 depo');
    const stoklar = await request(app, 'GET', '/stoklar');
    const stok = (stoklar.json || []).find((s) => s.stok_kodu && s.stok_kodu.startsWith('H'));
    assert.ok(stok, 'hammadde stok');
    const emir = await request(app, 'POST', '/transfer-emirleri', {
      body: {
        kaynak_depo_id: depolar.json[0].id,
        hedef_depo_id: depolar.json[1].id,
        satirlar: [{ stok_id: stok.id, miktar: 1 }],
        aciklama: 'test transfer',
      },
    });
    assert.equal(emir.status, 201, emir.text);
    assert.equal(emir.json.durum, 'Taslak');
    assert.ok(emir.json.emir_no);
    // iptal et (stok hareketi oluşturmadan)
    const iptal = await request(app, 'POST', `/transfer-emirleri/${emir.json.id}/iptal`);
    assert.equal(iptal.status, 200);
    assert.equal(iptal.json.durum, 'Iptal');
  });

  it('sayım belgesi taslak + sistem miktar', async () => {
    const depolar = await request(app, 'GET', '/depolar');
    const stoklar = await request(app, 'GET', '/stoklar');
    const stok = (stoklar.json || []).find((s) => s.stok_kodu === 'H00001') || stoklar.json[0];
    const belge = await request(app, 'POST', '/sayim-belgeleri', {
      body: {
        depo_id: depolar.json[0].id,
        satirlar: [{ stok_id: stok.id, sayilan_miktar: 0 }],
        aciklama: 'test sayim',
      },
    });
    assert.equal(belge.status, 201, belge.text);
    assert.equal(belge.json.durum, 'Taslak');
    assert.ok(belge.json.satirlar[0]);
    const iptal = await request(app, 'POST', `/sayim-belgeleri/${belge.json.id}/iptal`);
    assert.equal(iptal.status, 200);
  });
});
