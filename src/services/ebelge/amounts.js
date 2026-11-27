/** Tutar/miktar yuvarlama ve biçim yardımcıları (UBL-TR: tutarlar 2 hane). */

function round(n, digits = 2) {
  const v = Number(n || 0);
  const f = 10 ** digits;
  return Math.round((v + Math.sign(v) * Number.EPSILON) * f) / f;
}

function amt(n) {
  return round(n, 2).toFixed(2);
}

function qty(n, digits = 6) {
  const s = round(n, digits).toFixed(digits);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** Birim fiyat: 2-8 hane arası, gereksiz sıfırlar kırpılır ama en az 2 hane kalır. */
function price(n) {
  const s = round(n, 8).toFixed(8);
  const [i, d = ''] = s.split('.');
  const trimmed = d.replace(/0+$/, '');
  return `${i}.${trimmed.padEnd(2, '0')}`;
}

function pct(n) {
  return qty(n, 2);
}

module.exports = { round, amt, qty, price, pct };
