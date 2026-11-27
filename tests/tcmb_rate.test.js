const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseTcmbXml, archiveUrlForDate } = require('../src/services/tcmbRateService');

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="11.11.2026" Date="11/11/2026" Bulten_No="2026/212">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit><Isim>ABD DOLARI</Isim>
    <ForexBuying>50.1379</ForexBuying><ForexSelling>50.2282</ForexSelling>
    <BanknoteBuying>50.1028</BanknoteBuying><BanknoteSelling>50.3036</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="9" Kod="JPY" CurrencyCode="JPY">
    <Unit>100</Unit><Isim>JAPON YENİ</Isim>
    <ForexBuying>32.50</ForexBuying><ForexSelling>32.70</ForexSelling>
    <BanknoteBuying></BanknoteBuying><BanknoteSelling></BanknoteSelling>
  </Currency>
  <Currency CrossOrder="20" Kod="XDR" CurrencyCode="XDR">
    <Unit>1</Unit><ForexBuying>68.1</ForexBuying><ForexSelling></ForexSelling>
  </Currency>
</Tarih_Date>`;

describe('tcmb rate service', () => {
  it('parses bulletin header and per-unit rates', () => {
    const r = parseTcmbXml(SAMPLE);
    assert.equal(r.bulletinDate, '2026-11-11');
    assert.equal(r.bulletinNo, '2026/212');
    assert.deepEqual(r.rates.map((x) => x.currency_code), ['USD', 'JPY']);
    const jpy = r.rates.find((x) => x.currency_code === 'JPY');
    assert.equal(jpy.unit, 100);
    assert.ok(Math.abs(jpy.buy_rate - 0.325) < 1e-9);
    assert.equal(jpy.effective_buy_rate, null);
  });

  it('rejects non-TCMB payloads', () => {
    assert.throws(() => parseTcmbXml('<html>hata</html>'), /beklenen formatta/);
  });

  it('builds archive URL for a date', () => {
    assert.equal(archiveUrlForDate('2026-11-06'), 'https://www.tcmb.gov.tr/kurlar/202611/06112026.xml');
  });
});
