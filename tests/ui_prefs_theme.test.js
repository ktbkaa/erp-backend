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
    assert.match(html, /styles-steel\.css/);
    assert.match(html, /styles-cards\.css/);
    assert.match(html, /steel:\s*1/);
    assert.match(html, /cards:\s*1/);
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
    assert.match(js, /id:\s*'steel'/);
    assert.match(js, /id:\s*'cards'/);
    assert.match(js, /UI_VIEW_IDS/);
    assert.match(js, /listExportActions/);
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
    assert.match(css, /#listCtxMenu/);
    assert.match(css, /z-index:\s*1300/);
  });

  it('styles-modern.css: yalnızca data-view=modern', () => {
    const css = fs.readFileSync(path.join(root, 'public/styles-modern.css'), 'utf8');
    assert.match(css, /html\[data-view="modern"\]/);
    assert.match(css, /--primary/);
    assert.match(css, /\.view-mode-grid/);
    assert.doesNotMatch(css, /html\[data-view="classic"\]\s*\{[^}]*display:\s*none/);
  });

  it('styles-steel.css / styles-cards.css: scoped data-view skins', () => {
    const steel = fs.readFileSync(path.join(root, 'public/styles-steel.css'), 'utf8');
    const cards = fs.readFileSync(path.join(root, 'public/styles-cards.css'), 'utf8');
    assert.match(steel, /html\[data-view="steel"\]/);
    assert.match(steel, /--steel-face/);
    assert.doesNotMatch(steel, /html\[data-view="modern"\]/);
    assert.match(cards, /html\[data-view="cards"\]/);
    assert.match(cards, /border-radius:\s*999px/);
    assert.doesNotMatch(cards, /html\[data-view="steel"\]/);
  });
});
