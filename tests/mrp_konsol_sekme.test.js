/**
 * MRP konsol: pasif form sekmeleri [hidden] ile gizlensin.
 * scrollable paneller display:block !important ile [hidden] ezmemeli.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('mrp konsol sekme görünürlüğü', () => {
  it('scrollable panel CSS [hidden] kuralını ezmez', () => {
    const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
    assert.match(
      css,
      /\.form-tab-panel--md\.form-tab-panel--scrollable:not\(\[hidden\]\)\s*\{[^}]*display:\s*block\s*!important/s
    );
    assert.match(
      css,
      /\.form-tab-panel--md\.form-tab-panel--scrollable\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s
    );
    // Regresyon: gizli paneli zorla gösteren eski kural
    assert.doesNotMatch(
      css,
      /\.form-tab-panel--md\.form-tab-panel--scrollable\s*\{[^}]*display:\s*block\s*!important/s
    );
  });

  it('mrp-calisma üç sekme + scrollable panel kullanır', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /id: 'mrp-calisma'/);
    assert.match(js, /kind: 'mrp-parametre'/);
    assert.match(js, /kind: 'mrp-kapsam'/);
    assert.match(js, /kind: 'mrp-sonuc'/);
    assert.match(js, /form-tab-panel--md form-tab-panel--scrollable/);
  });
});
