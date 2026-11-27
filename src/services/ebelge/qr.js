/**
 * GİB görüntü QR içeriği (UBL-TR paketi general.xslt / irsaliye.xslt ile aynı alanlar) ve QR matrisi.
 */
const QRCode = require('qrcode');
const { amt } = require('./amounts');

function asciiTitle(s) {
  return String(s || '')
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/İ/g, 'I').replace(/Ö/g, 'O')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ı/g, 'i').replace(/ö/g, 'o');
}

function partyTitle(p = {}) {
  if (p.idScheme === 'TCKN' && p.firstName) return `${p.firstName} ${p.familyName || ''}`.trim();
  return p.name || '';
}

/** e-Fatura / e-Arşiv QR metni. `calc` = computeInvoice(model). */
function invoiceQrText(model, calc) {
  const o = {
    tur: model.profileId === 'EARSIVFATURA' ? 'E-Arsiv' : 'E-Fatura',
    VKNTCKN: model.supplier.id,
    avkntckn: model.customer.id,
    unvan: asciiTitle(partyTitle(model.supplier)),
    senaryo: model.profileId,
    tip: model.invoiceTypeCode,
    tarih: model.issueDate,
    no: model.id || '',
    ETTN: model.uuid || '',
    parabirimi: model.currency || 'TRY',
  };
  for (const t of calc.taxSubtotals.filter((x) => x.code === '0015')) {
    o[`malHizmetKDV(${t.percent})`] = Number(amt(t.base));
    o[`hesaplananKDV(${t.percent})`] = Number(amt(t.amount));
  }
  if (calc.totals.withholdingTotal > 0) o.tevkifatKDV = Number(amt(calc.totals.withholdingTotal));
  o.malHizmet = Number(amt(calc.totals.lineExtension));
  o.vergidahil = amt(calc.totals.taxInclusive);
  o.odenecek = amt(calc.totals.payable);
  return JSON.stringify(o);
}

function despatchQrText(model) {
  const s = model.shipment || {};
  return JSON.stringify({
    vkntckn: model.supplier.id,
    avkntckn: model.customer.id,
    senaryo: model.profileId,
    tip: model.despatchTypeCode,
    tarih: model.issueDate,
    no: model.id || '',
    ettn: model.uuid || '',
    sevktarihi: s.despatchDate || '',
    sevkzamani: s.despatchTime || '',
    tasiyicivkn: (s.carrier && s.carrier.id) || '',
    plaka: s.vehiclePlate || '',
  });
}

function qrMatrix(text, errorCorrectionLevel = 'M') {
  const q = QRCode.create(String(text || '-'), { errorCorrectionLevel });
  const { size } = q.modules;
  return { size, isDark: (r, c) => Boolean(q.modules.get(r, c)) };
}

function qrSvg(text, px = 120, ecl = 'M') {
  const m = qrMatrix(text, ecl);
  const quiet = 2;
  const n = m.size + quiet * 2;
  let d = '';
  for (let r = 0; r < m.size; r += 1) {
    for (let c = 0; c < m.size; c += 1) {
      if (m.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

module.exports = { invoiceQrText, despatchQrText, qrMatrix, qrSvg, asciiTitle };
