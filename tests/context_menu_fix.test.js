/**
 * Sağ tık menü: pointerdown kapanışı list/form menü öğelerini yutmasın.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('context menu pointerdown fix', () => {
  it('pointerdown close handler excludes listCtxMenu and formCtxMenu', () => {
    const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
    assert.match(
      js,
      /closest\('#tabCtxMenu,\s*#listCtxMenu,\s*#formCtxMenu'\)/
    );
    // Regresyon: yalnız tabCtxMenu hariç tutulmamalı
    assert.doesNotMatch(
      js,
      /if \(e\.target\.closest\('#tabCtxMenu'\)\) return;\s*hideTabContextMenu\(\)/
    );
  });
});
