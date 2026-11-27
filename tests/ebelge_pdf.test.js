/** Gerçek PDF çıktısı: gömülü UTF-8 font (Noto Sans), GİB QR, standart/matbu şablon. DB gerektirmez. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');

const { renderInvoicePdf, renderDespatchPdf, documentHtml } = require('../src/services/belgePdfService');
const f = require('./helpers/ebelgeFixtures');

const latin = (buf) => buf.toString('latin1');
const pageCount = (buf) => (latin(buf).match(/\/Type \/Page\b/g) || []).length;

/** ToUnicode CMap akışlarını açıp kullanılan karakterleri döndürür (metin gerçekten Unicode gömülü mü?). */
function unicodeChars(buf) {
  const s = latin(buf);
  const out = new Set();
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    let data;
    try {
      data = zlib.inflateSync(buf.subarray(start, end)).toString('latin1');
    } catch (_) {
      continue;
    }
    if (!data.includes('beginbfchar') && !data.includes('beginbfrange')) continue;
    for (const hex of data.match(/<([0-9a-fA-F]{4,})>/g) || []) {
      const h = hex.slice(1, -1);
      for (let i = 0; i + 4 <= h.length; i += 4) out.add(String.fromCharCode(parseInt(h.slice(i, i + 4), 16)));
    }
  }
  return out;
}

describe('belge PDF', () => {
  it('fatura (standart): geçerli PDF, Noto Sans gömülü, Türkçe karakterler Unicode eşlemeli', async () => {
    const buf = await renderInvoicePdf(f.baseInvoice());
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(latin(buf).trimEnd().endsWith('%%EOF'));
    assert.match(latin(buf), /\/BaseFont \/[A-Z]{6}\+NotoSans-Regular/);
    assert.match(latin(buf), /\/BaseFont \/[A-Z]{6}\+NotoSans-Bold/);
    assert.match(latin(buf), /\/FontFile2/);
    const chars = unicodeChars(buf);
    for (const ch of 'ĞüşİöçÖÇÜŞı') assert.ok(chars.has(ch), `PDF'de '${ch}' Unicode eşlemesi yok`);
    assert.equal(pageCount(buf), 1);
  });

  it('çok satırlı fatura sayfalara bölünür; tevkifat + filigran', async () => {
    const lines = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: `Ürün ${i + 1}`, quantity: 1, unitCode: 'C62', unitPrice: 10, vatPercent: 20, withholding: i === 0 ? { code: '616', percent: 50 } : null }));
    const buf = await renderInvoicePdf(f.baseInvoice({ invoiceTypeCode: 'TEVKIFAT', lines }), { watermark: 'TASLAK' });
    assert.ok(pageCount(buf) >= 2, `sayfa: ${pageCount(buf)}`);
  });

  it('matbu şablon: varsayılan ve özel yerleşim JSON', async () => {
    const def = await renderInvoicePdf(f.baseInvoice(), { template: 'matbu' });
    assert.equal(def.subarray(0, 5).toString(), '%PDF-');
    const custom = await renderInvoicePdf(f.baseInvoice(), { template: 'matbu', matbuLayout: { fontSize: 11, fields: { documentNo: { x: 300, y: 100, w: 200 } }, lines: { maxRows: 2 } } });
    assert.equal(pageCount(custom), 2, 'maxRows=2 → 3 satır 2 sayfa');
  });

  it('irsaliye PDF (standart ve matbu)', async () => {
    const a = await renderDespatchPdf(f.baseDespatch());
    const b = await renderDespatchPdf(f.baseDespatch(), { template: 'matbu' });
    for (const buf of [a, b]) assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(unicodeChars(a).has('İ'));
  });

  it('yazdırma HTML gerçek QR SVG içerir (yer tutucu değil)', () => {
    const html = documentHtml({ title: 'Satış Faturası', belgeNo: 'SF-1', ekstra: { qr_text: '{"no":"EFT2026000000001"}' } });
    assert.match(html, /<svg[^>]*viewBox/);
    assert.ok((html.match(/<rect|<path/g) || []).length > 0);
    assert.doesNotMatch(html, /placeholder/i);
  });
});
