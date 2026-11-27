/**
 * Küçük, bağımlılıksız XML yazıcı. Düğüm: { n, a, c } (ad, nitelik, çocuklar|metin).
 * null/undefined/'' değerli düğümler (opsiyonel alanlar) çıktıya yazılmaz.
 */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // XML 1.0'da geçersiz kontrol karakterleri
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function isEmpty(v) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** el('cbc:ID', 'X'), el('cbc:ID', { schemeID: 'VKN' }, 'X'), el('cac:Party', [..]) */
function el(n, a, c) {
  if (c === undefined && (typeof a !== 'object' || a === null || Array.isArray(a))) {
    c = a;
    a = null;
  }
  return { n, a: a || null, c };
}

function attrs(a) {
  if (!a) return '';
  return Object.entries(a)
    .filter(([, v]) => !isEmpty(v))
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
}

function prune(node) {
  if (node === null || node === undefined || node === false) return null;
  if (Array.isArray(node.c)) {
    const kids = node.c.flat(Infinity).map(prune).filter(Boolean);
    if (!kids.length && !node.keep) return null;
    return { ...node, c: kids };
  }
  if (isEmpty(node.c) && !node.keep) return null;
  return node;
}

function render(node, depth, indent) {
  const pad = indent ? indent.repeat(depth) : '';
  const nl = indent ? '\n' : '';
  if (Array.isArray(node.c)) {
    if (!node.c.length) return `${pad}<${node.n}${attrs(node.a)}/>${nl}`;
    return `${pad}<${node.n}${attrs(node.a)}>${nl}${node.c.map((k) => render(k, depth + 1, indent)).join('')}${pad}</${node.n}>${nl}`;
  }
  if (isEmpty(node.c)) return `${pad}<${node.n}${attrs(node.a)}/>${nl}`;
  return `${pad}<${node.n}${attrs(node.a)}>${esc(node.c)}</${node.n}>${nl}`;
}

function toXml(root, { declaration = true, indent = '  ' } = {}) {
  const pruned = prune(root);
  if (!pruned) throw new Error('Boş XML kökü');
  return `${declaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : ''}${render(pruned, 0, indent)}`;
}

/** Boş olsa bile yazılması gereken düğüm (ör. XSD zorunlu kapsayıcı). */
function keep(node) {
  return { ...node, keep: true };
}

module.exports = { el, keep, esc, toXml, isEmpty };
