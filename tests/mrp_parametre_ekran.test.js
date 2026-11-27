/**
 * MRP Parametreleri kaydedilebilir + Konsol tepeden seçim akışı.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const mrpRoutes = fs.readFileSync(path.join(root, 'routes/mrp.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'db/migrations/088_mrp_parameter_sets.sql'), 'utf8');

describe('mrp parametre kaydet + konsol seçim', () => {
  it('parametre seti tablosu ve API vardır', () => {
    assert.match(migration, /CREATE TABLE IF NOT EXISTS mrp_parameter_sets/);
    assert.match(mrpRoutes, /router\.get\('\/parametreler'/);
    assert.match(mrpRoutes, /router\.post\('\/parametreler'/);
    assert.match(mrpRoutes, /router\.put\('\/parametreler\/:id'/);
    assert.match(mrpRoutes, /parameter_set_id/);
  });

  it('MRP Parametreleri ayrı endpoint ile kaydedilir', () => {
    assert.match(appJs, /id: 'mrp-parametre'/);
    assert.match(appJs, /endpoint: '\/mrp\/parametreler'/);
    assert.match(appJs, /mrpParametreScreen: true/);
    assert.match(appJs, /screen\.mrpParametreScreen[\s\S]*?collectMrpParametreFromDom/);
  });

  it('Konsol Yeni düzeni yok; tepeden parametre seçimi var', () => {
    assert.match(appJs, /mrpKonsolWorkspace: true/);
    assert.match(appJs, /openFormOnEnter: 'workspace'/);
    assert.match(appJs, /kind: 'mrp-workspace'/);
    assert.match(appJs, /renderMrpWorkspacePane/);
    assert.match(appJs, /mrpWorkspaceParamSelect/);
    assert.match(appJs, /applyMrpParametreSetToWorkspace/);
    // mrp-calisma listActions içinde yeni yok
    const calismaBlock = appJs.slice(appJs.indexOf("id: 'mrp-calisma'"), appJs.indexOf("id: 'mrp-hesap'"));
    assert.match(calismaBlock, /listActions:\s*\['incele'\]/);
    assert.doesNotMatch(calismaBlock, /listActions:\s*\[[^\]]*yeni/);
  });
});
