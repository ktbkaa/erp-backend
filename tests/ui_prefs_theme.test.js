/**
 * Ayarlar / tema kaybı regresyon kilidi.
 * Paralel dallar index/app/styles birleştirirken dişli menüyü silmesin.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('ui prefs theme lock', () => {
  it('index.html: ayarlar dişlisi + koyu görünüm + tema modal', () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    assert.match(html, /id="settingsWrap"/);
    assert.match(html, /id="btnSettings"/);
    assert.match(html, /data-set-appearance="dark"/);
    assert.match(html, /id="themeModal"/);
    assert.match(html, /ktb_ui_theme/);
    assert.match(html, /ktb_ui_appearance/);
  });

  it('app.js: applyUiTheme / appearance / initUiPrefs', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /function applyUiTheme\s*\(/);
    assert.match(js, /function applyUiAppearance\s*\(/);
    assert.match(js, /function initUiPrefs\s*\(/);
    assert.match(js, /function bindUiPrefsEvents\s*\(/);
    assert.match(js, /UI_THEME_DEFS/);
    assert.match(js, /initUiPrefs\(\)/);
    assert.match(js, /bindUiPrefsEvents\(\)/);
  });

  it('styles.css: data-theme + data-appearance=dark paleti', () => {
    const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
    assert.match(css, /html\[data-appearance="dark"\]/);
    assert.match(css, /html\[data-theme="green"\]/);
    assert.match(css, /\.settings-wrap/);
    assert.match(css, /\.theme-modal/);
    assert.match(css, /UI prefs: themes \+ settings/);
  });
});
