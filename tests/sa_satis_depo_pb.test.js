/**
 * Satış + satınalma siparişi: depo master’da (tek depo/sipariş); satırda yok.
 * Belge PB yalnız master’da.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

function screenSlice(id) {
  const i = js.indexOf(`id: '${id}'`);
  assert.ok(i >= 0, `screen ${id}`);
  const next = js.indexOf("\n      {\n        id: '", i + 10);
  return js.slice(i, next > 0 ? next : i + 8000);
}

function detailBlock(slice) {
  const j = slice.indexOf('detailFields:');
  const k = slice.indexOf('detailKey:', j);
  return slice.slice(j, k > 0 ? k : j + 3000);
}

function masterBlock(slice) {
  const j = slice.indexOf('masterFields:');
  const k = slice.indexOf('detailFields:', j);
  return slice.slice(j, k > 0 ? k : j + 3000);
}

describe('sipariş master depo + belge PB tek master', () => {
  it('satış + satınalma sipariş: depo master’da, satırda yok', () => {
    for (const id of ['satis-siparisleri', 'satin-alma-siparisleri']) {
      const s = screenSlice(id);
      assert.doesNotMatch(detailBlock(s), /key: 'warehouse_id'/);
      assert.match(masterBlock(s), /key: 'warehouse_id'/);
      assert.doesNotMatch(detailBlock(s), /key: 'currency_code'/);
      assert.match(masterBlock(s), /key: 'currency_code'/);
    }
  });

  it('satınalma talep: depo yok; PB yalnız master', () => {
    const s = screenSlice('satin-alma-talepleri');
    assert.doesNotMatch(detailBlock(s), /key: 'warehouse_id'/);
    assert.doesNotMatch(masterBlock(s), /key: 'warehouse_id'/);
    assert.doesNotMatch(detailBlock(s), /key: 'currency_code'/);
    assert.match(masterBlock(s), /key: 'currency_code'/);
  });

  it('satış + satınalma teklif/fatura/irsaliye: satırda PB yok', () => {
    for (const id of [
      'satin-alma-teklifleri',
      'satis-teklifleri',
      'satis-siparisleri',
      'irsaliye-yonetimi',
      'fatura-yonetimi',
    ]) {
      const s = screenSlice(id);
      assert.doesNotMatch(detailBlock(s), /key: 'currency_code'/);
      assert.match(masterBlock(s), /key: 'currency_code'/);
    }
  });

  it('mal kabulde giriş depo zorunlu; header depo satıra yayılır', () => {
    const mk = screenSlice('mal-kabuller');
    assert.match(masterBlock(mk), /Giriş depo/);
    assert.match(masterBlock(mk), /required: true/);
    assert.match(js, /applyHeaderWarehouseToLines/);
    assert.match(js, /applyHeaderCurrencyToLines/);
  });
});
