/**
 * MRP hareket raporu — zorunlu çalışma no, filtreler, export aksiyonları.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('mrp hareket raporu', () => {
  it('API rotası ve index mount', () => {
    const route = fs.readFileSync(path.join(root, 'routes/mrp_hareket_raporu.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
    assert.match(route, /router\.get\('\/'/);
    assert.match(route, /islem_tipi/);
    assert.match(route, /forecast_rows/);
    assert.match(route, /mrp_independent_requirements/);
    assert.match(route, /stock_movement_lines/);
    assert.match(index, /\/mrp-hareket-raporu/);
  });

  it('Planlama menüsünde ekran + zorunlu run_id + export', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /id: 'mrp-hareket-raporu'/);
    assert.match(js, /endpoint: '\/mrp-hareket-raporu'/);
    assert.match(js, /mrp-hareket-raporu/);
    assert.match(js, /key: 'run_id'[\s\S]*?required: true/);
    assert.match(js, /listExportActions: true/);
    assert.match(js, /exportListAsExcel/);
    assert.match(js, /exportListAsWord/);
    assert.match(js, /exportListAsPdf/);
    assert.match(js, /'mrp-calismalar': '\/mrp\/calismalar'/);
  });

  it('HTML araç çubuğunda Excel/Word butonları', () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    assert.match(html, /data-action="export-excel"/);
    assert.match(html, /data-action="export-word"/);
  });

  it('meta registry kaydı', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(root, 'src/meta/screenTableRegistry.json'), 'utf8'));
    assert.ok(reg['mrp-hareket-raporu']);
    assert.equal(reg['mrp-hareket-raporu'].endpoint, '/mrp-hareket-raporu');
  });
});
