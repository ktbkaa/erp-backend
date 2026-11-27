/**
 * Stok hareket raporu — ekran, API rotası, kaynak ekran eşlemesi.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('stok hareket raporu', () => {
  it('route dosyası ve index mount mevcut', () => {
    const route = fs.readFileSync(path.join(root, 'routes/stok_hareket_raporu.js'), 'utf8');
    assert.match(route, /item_id/);
    assert.match(route, /warehouse_id/);
    assert.match(route, /company_id/);
    assert.match(route, /ORDER BY/);
    assert.match(route, /stock_movement_lines/);
    const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
    assert.match(index, /\/stok-hareket-raporu/);
  });

  it('app.js ekran tanımı ve sağ tık kaynak menüsü', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /id: 'stok-hareket-raporu'/);
    assert.match(js, /endpoint: '\/stok-hareket-raporu'/);
    assert.match(js, /id: 'kaynak-belge'/);
    assert.match(js, /STOK_HAREKET_KAYNAK_EKRAN/);
    assert.match(js, /openStokHareketKaynak/);
    assert.match(js, /stok-hareket-raporu/);
    assert.match(js, /screenIds: \[[^\]]*stok-hareket-raporu/);
  });

  it('screenTableRegistry kaydı var', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(root, 'src/meta/screenTableRegistry.json'), 'utf8')
    );
    assert.ok(reg['stok-hareket-raporu']);
    assert.equal(reg['stok-hareket-raporu'].endpoint, '/stok-hareket-raporu');
  });
});
