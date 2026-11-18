/**
 * Sistem Güncelleme ekranı / API / migration kilidi.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('sistem guncelleme', () => {
  it('migration + route + mount var', () => {
    const mig = fs.readFileSync(path.join(root, 'db/migrations/089_sistem_guncelleme.sql'), 'utf8');
    assert.match(mig, /system_update_packages/);
    assert.match(mig, /system_update_apply_log/);
    const route = fs.readFileSync(path.join(root, 'routes/sistem_guncelleme.js'), 'utf8');
    assert.match(route, /\/uygula/);
    const index = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
    assert.match(index, /\/sistem-guncelleme/);
  });

  it('ekran tanımı + konsol bayrağı + UI iskeleti', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /id:\s*'sistem-guncelleme'/);
    assert.match(js, /systemUpdateConsole:\s*true/);
    assert.match(js, /function openSystemUpdateConsole/);
    assert.match(js, /function openSupReview/);
    assert.match(js, /setSupReviewTab/);
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    assert.match(html, /id="viewSysUpdate"/);
    assert.match(html, /id="supReviewDialog"/);
    assert.match(html, /id="supInfoDialog"/);
    assert.match(html, /data-sup-tab="preview"/);
    assert.match(html, /Tümünü seç/);
    const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
    assert.match(css, /\.sys-update-view/);
    assert.match(css, /\.sup-hl/);
  });
});
