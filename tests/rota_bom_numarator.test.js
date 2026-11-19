/**
 * Rota otodoldurma + iş istasyonu/merkezi numaratör kilidi.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join(__dirname, '..', 'public/app.js'), 'utf8');

function screenBlock(id) {
  const re = new RegExp(`id:\\s*'${id}'[\\s\\S]*?(?=\\n\\s*\\{\\s*\\n\\s*id:|$)`);
  const m = js.match(re);
  return m ? m[0].slice(0, 3500) : '';
}

describe('rota / bom / numarator', () => {
  it('iş istasyonu ve iş merkezi numaratör serileri bağlı', () => {
    const ws = screenBlock('is-istasyonlari');
    const wc = screenBlock('is-merkezleri');
    assert.match(ws, /numeratorSeri:\s*'IS_ISTASYONU'/);
    assert.match(wc, /numeratorSeri:\s*'IS_MERKEZI'/);
    assert.doesNotMatch(ws, /numeratorSeri:\s*null/);
    assert.doesNotMatch(wc, /numeratorSeri:\s*null/);
  });

  it('rota stok seçiminde ürün ağacı + ad otodoldurma kuralları var', () => {
    assert.match(js, /id:\s*'routings'/);
    assert.match(js, /pick:\s*'bomForItem'/);
    assert.match(js, /asRouteName:\s*true/);
    assert.match(js, /function autoFillRoutingFromBom/);
    assert.match(js, /function ensureDefaultBomForItem/);
    assert.match(js, /distributeBomMaterialsToOps/);
    assert.match(js, /await autoFillRoutingFromBom\(scr/);
  });
});
