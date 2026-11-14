/**
 * Ayarlar / tema / görünüm regresyon kilidi.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('ui prefs theme lock', () => {
  it('index.html: ayarlar dişlisi + koyu görünüm + tema modal + view boot', () => {
    const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
    assert.match(html, /id="settingsWrap"/);
    assert.match(html, /id="btnSettings"/);
    assert.match(html, /data-set-appearance="dark"/);
    assert.match(html, /id="themeModal"/);
    assert.match(html, /ktb_ui_theme/);
    assert.match(html, /ktb_ui_appearance/);
    assert.match(html, /ktb_ui_view/);
    assert.match(html, /data-theme-tab="colors"/);
    assert.match(html, /data-theme-tab="view"/);
    assert.match(html, /id="viewModeGrid"/);
    assert.match(html, /styles-modern\.css/);
  });

  it('app.js: applyUiTheme / appearance / view / initUiPrefs', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(js, /function applyUiTheme\s*\(/);
    assert.match(js, /function applyUiAppearance\s*\(/);
    assert.match(js, /function applyUiView\s*\(/);
    assert.match(js, /function initUiPrefs\s*\(/);
    assert.match(js, /function bindUiPrefsEvents\s*\(/);
    assert.match(js, /UI_THEME_DEFS/);
    assert.match(js, /UI_VIEW_DEFS/);
    assert.match(js, /initUiPrefs\(\)/);
    assert.match(js, /bindUiPrefsEvents\(\)/);
    assert.match(js, /ktb_ui_view/);
  });

  it('styles.css: data-theme + data-appearance=dark paleti', () => {
    const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
    assert.match(css, /html\[data-appearance="dark"\]/);
    assert.match(css, /html\[data-theme="green"\]/);
    assert.match(css, /\.settings-wrap/);
    assert.match(css, /\.theme-modal/);
    assert.match(css, /UI prefs: themes \+ settings/);
  });

  it('styles-modern.css: yalnızca data-view=modern', () => {
    const css = fs.readFileSync(path.join(root, 'public/styles-modern.css'), 'utf8');
    assert.match(css, /html\[data-view="modern"\]/);
    assert.match(css, /--primary/);
    assert.match(css, /\.view-mode-grid/);
    assert.doesNotMatch(css, /html\[data-view="classic"\]\s*\{[^}]*display:\s*none/);
  });
});
