'use strict';

/**
 * public/app.js içindeki `const MODULES = [...]` literalini izole bir vm bağlamında
 * değerlendirir. Literal içindeki bilinmeyen sabit/fonksiyon referansları boş
 * yer tutuculara çözülür; yalnız modül/ekran kimlikleri ve endpoint’ler kullanılır.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function sliceModulesLiteral(src) {
  const start = src.indexOf('const MODULES = [');
  if (start < 0) throw new Error('public/app.js: const MODULES bulunamadı');
  const open = src.indexOf('[', start);
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error('MODULES literal sonu bulunamadı');
}

function placeholder() {
  const fn = function () {};
  return new Proxy(fn, {
    get(_t, key) {
      if (key === Symbol.toPrimitive) return () => '';
      if (key === Symbol.iterator) return function* empty() {};
      return undefined;
    },
    apply() { return undefined; },
  });
}

function extractSpaModules(appJsPath = path.join(__dirname, '..', '..', 'public', 'app.js')) {
  const src = fs.readFileSync(appJsPath, 'utf8');
  const literal = sliceModulesLiteral(src);
  const scope = new Proxy({}, {
    has: () => true,
    get(_t, key) {
      if (key === Symbol.unscopables) return undefined;
      if (key in globalThis) return globalThis[key];
      return placeholder();
    },
  });
  const modules = vm.runInNewContext(`with (__scope) { (${literal}) }`, { __scope: scope });
  return modules.map((m) => ({
    id: m.id,
    sectionScreenIds: (m.sections || []).flatMap((s) => s.screenIds || []),
    screens: (m.screens || [])
      .filter((s) => s && s.id)
      .map((s) => ({ id: s.id, endpoint: typeof s.endpoint === 'string' ? s.endpoint : null })),
  }));
}

module.exports = { extractSpaModules };
