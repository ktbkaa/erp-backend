/**
 * Liste dışa aktarma ve PDF buton mantığı.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join(__dirname, '..', 'public/app.js'), 'utf8');

describe('list export / pdf actions', () => {
  it('normalizeScreen varsayılan listExportActions açar', () => {
    assert.match(js, /raw\.listExportActions == null/);
    assert.match(js, /s\.listExportActions = Boolean/);
  });

  it('PDF butonu listExport veya reportPdf ile görünür (override yok)', () => {
    assert.match(js, /showPdf = Boolean\(screen\.reportPdfAction \|\| screen\.listExportActions\)/);
    // Eski zararlı satır: yalnızca reportPdfAction
    assert.doesNotMatch(js, /pdfBtn\.hidden = !screen\.reportPdfAction\s*;/);
  });

  it('export yetkisi incele/duzelt/yeni ile tanınır', () => {
    assert.match(js, /action === 'export-excel'/);
    assert.match(js, /action === 'export-word'/);
    assert.match(js, /action === 'report-pdf'/);
  });
});
