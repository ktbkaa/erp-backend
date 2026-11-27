/**
 * Liste aksiyon barı: CRUD / iş akışı / gizle bayrakları.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

describe('action bar listActions', () => {
  it('index.html aksiyon butonları mevcut', () => {
    for (const act of ['yeni', 'incele', 'duzelt', 'kopyala', 'sil']) {
      assert.match(indexHtml, new RegExp(`data-action="${act}"`));
    }
  });

  it('normalizeScreen listActions üretir', () => {
    assert.match(appJs, /s\.listActions/);
    assert.match(appJs, /function normalizeScreen/);
  });

  it('updateActionButtons listActions ile gösterir/gizler', () => {
    assert.match(appJs, /function updateActionButtons/);
    assert.match(appJs, /allowedSet\.has\(act\)/);
  });

  it('iş akışı ekranları crud:false + incele için açık', () => {
    for (const id of ['kk-emirleri-gkk', 'kk-emirleri-ckk', 'giris-kontrolleri', 'onaylarim']) {
      assert.match(appJs, new RegExp(`id:\\s*'${id}'[\\s\\S]{0,400}?crud:\\s*false`));
    }
  });

  it('tam CRUD ekranları crud:true', () => {
    for (const id of ['stok-karti', 'cari-kartlari', 'companies', 'uretim-emirleri', 'prj-projeler', 'hr-personel']) {
      assert.match(appJs, new RegExp(`id:\\s*'${id}'[\\s\\S]{0,200}?crud:\\s*true`));
    }
  });
});
