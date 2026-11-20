/**
 * SQL Sorgu sonuç aktarımı (Excel / PDF) regresyon kilidi.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('sql result export', () => {
  it('index.html: Excel ve PDF butonları sonuç panelinde', () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    assert.match(html, /id="sqlResultActions"/);
    assert.match(html, /id="sqlBtnExportExcel"/);
    assert.match(html, /id="sqlBtnExportPdf"/);
  });

  it('app.js: exportSqlResultAsExcel / Pdf fonksiyonları', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /function exportSqlResultAsExcel\s*\(/);
    assert.match(js, /function exportSqlResultAsPdf\s*\(/);
    assert.match(js, /sqlBtnExportExcel/);
    assert.match(js, /sqlBtnExportPdf/);
    assert.match(js, /sqlResultExportable/);
  });
});
