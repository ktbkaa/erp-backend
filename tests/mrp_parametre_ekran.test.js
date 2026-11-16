/**
 * MRP Parametreleri: Planlama menüsünde ayrı ekran + form erişimi.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

describe('mrp parametre ekranı', () => {
  it('Planlama menüsünde mrp-parametre vardır', () => {
    assert.match(appJs, /id: 'planlama'[\s\S]*?mrp-parametre/);
    assert.match(appJs, /id: 'mrp-parametre'/);
    assert.match(appJs, /title: 'MRP Parametreleri'/);
    assert.match(appJs, /openFormOnEnter: 'yeni'/);
    assert.match(appJs, /mrpParametreScreen: true/);
  });

  it('MRP Konsol İncele/çift tık sonuç form sekmesine gider (ayrı sonuç ekranına kaçmaz)', () => {
    assert.doesNotMatch(
      appJs,
      /act === 'incele' && state\.screenId === 'mrp-calisma'[\s\S]{0,200}openScreen\('mrp-sonuclar'\)/
    );
    assert.match(appJs, /formActiveTab: tab/);
    assert.match(appJs, /screenId === 'mrp-parametre' \|\| state\.screenId === 'mrp-calisma'/);
  });

  it('gölge runAndSaveMrp parametresiz sonuç ekranına atmaz', () => {
    // Yerel gölgeleme kaldırıldı; tek (global) runAndSaveMrp parametre formunu kullanır
    const localShadows = (appJs.match(/async function runAndSaveMrp\(\)/g) || []).length;
    assert.equal(localShadows, 1);
    assert.match(appJs, /screenId === 'mrp-parametre'/);
  });
});
