/**
 * Responsive layout: sticky çakışması ve kısa viewport kuralları.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public/styles.css'), 'utf8');

describe('responsive layout', () => {
  it('liste banner/aksiyon sticky top:0 çakışması yok', () => {
    // Eski zararlı kalıp: screen-banner + action-bar ikisi de sticky top:0
    assert.doesNotMatch(
      css,
      /\.screen-banner,\s*\.action-bar\s*\{[^}]*position:\s*sticky/s
    );
    assert.match(
      css,
      /\.screen-banner,\s*\.action-bar\s*\{[^}]*position:\s*relative/s
    );
  });

  it('kısa yükseklik ve dar genişlik breakpoint’leri var', () => {
    assert.match(css, /@media \(max-height:\s*720px\)/);
    assert.match(css, /@media \(max-height:\s*560px\)/);
    assert.match(css, /@media \(max-width:\s*640px\)/);
    assert.match(css, /100dvh/);
    assert.match(css, /filter-pane[\s\S]{0,80}max-height:\s*min\(38vh/);
  });
});
