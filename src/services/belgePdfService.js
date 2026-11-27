/**
 * Belge çıktıları:
 *  - documentHtml(): tarayıcı yazdırma önizlemesi (gerçek QR SVG ile).
 *  - renderInvoicePdf() / renderDespatchPdf(): gerçek PDF (pdfkit), gömülü UTF-8 Noto Sans fontu
 *    (Türkçe karakterler), GİB görüntü QR kodu; 'standart' (e-belge görüntüsü) veya 'matbu'
 *    (önceden basılı forma yalnız değer basma) şablonu.
 */
const path = require('path');
const PDFDocument = require('pdfkit');
const { qrSvg, qrMatrix, invoiceQrText, despatchQrText } = require('./ebelge/qr');
const { computeInvoice } = require('./ebelge/ublInvoice');
const { tutarYazi } = require('./ebelge/tutarYazi');

const FONT_DIR = path.join(__dirname, '../../assets/fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'NotoSans-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'NotoSans-Bold.ttf');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function documentHtml({ title: baslik, belgeNo, tarih, cari, satirlar = [], toplamlar = {}, ekstra = {} }) {
  const rows = satirlar
    .map(
      (s, i) => `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.item_code || s.item_id)}</td>
      <td>${escapeHtml(s.item_name || '')}</td>
      <td style="text-align:right">${escapeHtml(s.quantity)}</td>
      <td>${escapeHtml(s.uom_code || '')}</td>
      <td style="text-align:right">${escapeHtml(s.unit_price ?? '')}</td>
      <td style="text-align:right">${escapeHtml(s.total_amount ?? '')}</td>
    </tr>`
    )
    .join('');
  const qrText = ekstra.qr_text || ekstra.uuid_ettn || belgeNo || '';
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"/><title>${escapeHtml(baslik)} ${escapeHtml(belgeNo)}</title>
<style>
  body{font-family:"Noto Sans","DejaVu Sans",Arial,sans-serif;margin:24px;color:#1a1a1a}
  h1{font-size:1.4rem;margin:0 0 .25rem}
  .meta{display:flex;justify-content:space-between;gap:1rem;margin:1rem 0}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th,td{border:1px solid #ccc;padding:6px 8px;font-size:.9rem}
  th{background:#f3f3f3;text-align:left}
  .tot{margin-top:1rem;text-align:right}
  @media print{.no-print{display:none}}
</style></head><body>
  <div class="meta">
    <div>
      <h1>${escapeHtml(baslik)}</h1>
      <div>Belge No: <strong>${escapeHtml(belgeNo)}</strong></div>
      <div>Tarih: ${escapeHtml(tarih || '')}</div>
      <div>Cari: ${escapeHtml(cari?.partner_name || cari?.partner_code || '')}</div>
      ${ekstra.uuid_ettn ? `<div>ETTN: <code>${escapeHtml(ekstra.uuid_ettn)}</code></div>` : ''}
      ${ekstra.description ? `<div>${escapeHtml(ekstra.description)}</div>` : ''}
    </div>
    <div>${qrSvg(qrText, 110)}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Stok</th><th>Ad</th><th>Miktar</th><th>Birim</th><th>Fiyat</th><th>Tutar</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="7">Kalem yok</td></tr>'}</tbody>
  </table>
  <div class="tot">
    ${toplamlar.net_amount != null ? `<div>Mal/Hizmet: ${escapeHtml(toplamlar.net_amount)}</div>` : ''}
    ${toplamlar.tax_amount != null ? `<div>KDV: ${escapeHtml(toplamlar.tax_amount)}</div>` : ''}
    ${toplamlar.payable_amount != null ? `<div><strong>Ödenecek: ${escapeHtml(toplamlar.payable_amount)}</strong></div>` : ''}
    ${toplamlar.total_amount != null && toplamlar.payable_amount == null ? `<div><strong>Toplam: ${escapeHtml(toplamlar.total_amount)}</strong></div>` : ''}
  </div>
  <p class="no-print"><button onclick="window.print()">Yazdır</button>
  ${ekstra.pdf_url ? ` <a href="${escapeHtml(ekstra.pdf_url)}">PDF indir</a>` : ''}</p>
</body></html>`;
}

// ─── PDF yardımcıları ───────────────────────────────────────────────────────

const NUM = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const QTY = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
const money = (n) => NUM.format(Number(n || 0));
const qtyFmt = (n) => QTY.format(Number(n || 0));
const dmy = (s) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s || '');

const PROFILE_TITLES = Object.freeze({
  TEMELFATURA: 'e-FATURA',
  TICARIFATURA: 'e-FATURA',
  EARSIVFATURA: 'e-ARŞİV FATURA',
  TEMELIRSALIYE: 'e-İRSALİYE',
});

function newDoc(info) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true, info, pdfVersion: '1.7' });
  doc.registerFont('R', FONT_REGULAR);
  doc.registerFont('B', FONT_BOLD);
  doc.font('R');
  return doc;
}

function finish(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function drawQr(doc, text, x, y, size) {
  const m = qrMatrix(text, 'M');
  const quiet = 2;
  const cell = size / (m.size + quiet * 2);
  doc.save().rect(x, y, size, size).fill('#ffffff');
  doc.fillColor('#000000');
  for (let r = 0; r < m.size; r += 1) {
    for (let c = 0; c < m.size; c += 1) {
      if (m.isDark(r, c)) doc.rect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell + 0.05, cell + 0.05);
    }
  }
  doc.fill().restore();
}

function partyLines(p = {}) {
  const a = p.address || {};
  const lines = [];
  const addr = [a.street, a.buildingNo ? `No:${a.buildingNo}` : null].filter(Boolean).join(' ');
  if (addr) lines.push(addr);
  const city = [a.postalZone, a.district, a.city].filter(Boolean).join(' ');
  if (city || a.country) lines.push([city, a.country].filter(Boolean).join(' / '));
  const contact = [p.phone ? `Tel: ${p.phone}` : null, p.fax ? `Faks: ${p.fax}` : null].filter(Boolean).join('  ');
  if (contact) lines.push(contact);
  if (p.email) lines.push(`E-Posta: ${p.email}`);
  if (p.website) lines.push(`Web: ${p.website}`);
  const tax = [p.taxOffice ? `Vergi Dairesi: ${p.taxOffice}` : null, p.id ? `${p.idScheme || 'VKN'}: ${p.id}` : null].filter(Boolean).join('  ');
  if (tax) lines.push(tax);
  for (const x of p.extraIds || []) {
    if (x && x.id) lines.push(`${x.scheme === 'MERSISNO' ? 'Mersis No' : x.scheme === 'TICARETSICILNO' ? 'Ticaret Sicil No' : x.scheme}: ${x.id}`);
  }
  return lines;
}

function partyBlock(doc, p, x, y, w, { heading } = {}) {
  let cy = y;
  if (heading) {
    doc.font('B').fontSize(8).text(heading, x, cy, { width: w });
    cy = doc.y + 1;
  }
  const title = p.idScheme === 'TCKN' && p.firstName ? `${p.firstName} ${p.familyName || ''}`.trim() : p.name || '';
  doc.font('B').fontSize(9.5).text(title, x, cy, { width: w });
  doc.font('R').fontSize(8);
  for (const l of partyLines(p)) doc.text(l, x, doc.y + 0.5, { width: w });
  return doc.y;
}

function infoTable(doc, rows, x, y, w) {
  const labelW = w * 0.45;
  let cy = y;
  doc.fontSize(8);
  for (const [k, v] of rows) {
    if (v == null || v === '') continue;
    const h = Math.max(doc.heightOfString(String(v), { width: w - labelW - 6 }), 10) + 4;
    doc.rect(x, cy, w, h).lineWidth(0.5).stroke('#888888');
    doc.font('B').fillColor('#000').text(k, x + 3, cy + 2, { width: labelW - 4 });
    doc.font('R').text(String(v), x + labelW + 3, cy + 2, { width: w - labelW - 6 });
    cy += h;
  }
  return cy;
}

function watermark(doc, text) {
  if (!text) return;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.save();
    doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.font('B').fontSize(46).fillColor('#d0d0d0').opacity(0.45)
      .text(text, 0, doc.page.height / 2 - 30, { width: doc.page.width, align: 'center', lineBreak: false });
    doc.restore();
    doc.opacity(1).fillColor('#000');
  }
}

function footers(doc, leftText) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('R').fontSize(7).fillColor('#555')
      .text(leftText, 36, doc.page.height - 26, { width: doc.page.width - 150, lineBreak: false });
    doc.text(`Sayfa ${i - range.start + 1} / ${range.count}`, doc.page.width - 136, doc.page.height - 26, { width: 100, align: 'right', lineBreak: false });
    doc.page.margins.bottom = bottom;
    doc.fillColor('#000');
  }
}

function table(doc, { columns, rows, startY, onNewPage }) {
  const x0 = doc.page.margins.left;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 30;
  const header = (y) => {
    let x = x0;
    doc.font('B').fontSize(7.5);
    const h = Math.max(...columns.map((c) => doc.heightOfString(c.label, { width: c.w - 4 }))) + 7;
    doc.rect(x0, y, columns.reduce((s, c) => s + c.w, 0), h).fill('#e9ecef');
    doc.fillColor('#000');
    for (const c of columns) {
      doc.text(c.label, x + 2, y + 3.5, { width: c.w - 4, align: c.align || 'left' });
      x += c.w;
    }
    return y + h;
  };
  let y = header(startY);
  doc.font('R').fontSize(7.5);
  for (const r of rows) {
    const h = Math.max(...columns.map((c) => doc.heightOfString(String(r[c.key] ?? ''), { width: c.w - 4 }))) + 5;
    if (y + h > bottomLimit()) {
      doc.addPage();
      if (onNewPage) onNewPage();
      y = header(doc.page.margins.top);
      doc.font('R').fontSize(7.5);
    }
    let x = x0;
    for (const c of columns) {
      doc.text(String(r[c.key] ?? ''), x + 2, y + 2.5, { width: c.w - 4, align: c.align || 'left' });
      x += c.w;
    }
    doc.moveTo(x0, y + h).lineTo(x, y + h).lineWidth(0.3).stroke('#bbbbbb');
    y += h;
  }
  return y;
}

function ensureSpace(doc, y, need) {
  if (y + need > doc.page.height - doc.page.margins.bottom - 30) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
}

function statusText(opts) {
  if (opts.watermark) return opts.watermark;
  return null;
}

// ─── Standart (e-belge görüntüsü) fatura ────────────────────────────────────

function drawInvoiceStandard(doc, model, calc, opts) {
  const cur = model.currency || 'TRY';
  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const top = doc.page.margins.top;

  const supEnd = partyBlock(doc, model.supplier, L, top, 210);
  doc.font('B').fontSize(16).text(PROFILE_TITLES[model.profileId] || 'FATURA', L + 215, top + 18, { width: 160, align: 'center' });
  doc.font('R').fontSize(7).text('UBL-TR 1.2', L + 215, doc.y + 2, { width: 160, align: 'center' });
  drawQr(doc, opts.qrText, L + W - 100, top, 100);

  let y = Math.max(supEnd, top + 104) + 8;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.8).stroke('#333');
  y += 6;
  const custEnd = partyBlock(doc, model.customer, L, y, 280, { heading: 'SAYIN' });
  const infoEnd = infoTable(doc, [
    ['Özelleştirme No', 'TR1.2'],
    ['Senaryo', model.profileId],
    ['Fatura Tipi', model.invoiceTypeCode],
    ['Fatura No', model.id || '(GİB no atanmadı)'],
    ['Fatura Tarihi', dmy(model.issueDate)],
    ['Fatura Saati', model.issueTime],
    ['Sipariş No', model.orderReference && model.orderReference.id],
    ['İrsaliye No', (model.despatchReferences || []).map((d) => `${d.id} (${dmy(d.issueDate)})`).join(', ')],
    ['İade Edilen Fatura', (model.billingReferences || []).map((b) => `${b.id} (${dmy(b.issueDate)})`).join(', ')],
    ['Döviz Kuru', cur !== 'TRY' && model.exchangeRate ? `1 ${cur} = ${model.exchangeRate} TRY` : null],
  ], L + W - 220, y, 220);
  y = Math.max(custEnd, infoEnd) + 6;
  doc.font('B').fontSize(8).text(`ETTN: ${model.uuid || '-'}`, L, y, { width: W });
  y = doc.y + 6;

  const hasWht = calc.lines.some((l) => l.withholding);
  const columns = [
    { key: 'no', label: 'Sıra', w: 22, align: 'right' },
    { key: 'name', label: 'Mal / Hizmet', w: hasWht ? 130 : 160 },
    { key: 'qty', label: 'Miktar', w: 45, align: 'right' },
    { key: 'unit', label: 'Birim', w: 30 },
    { key: 'price', label: 'Birim Fiyat', w: 56, align: 'right' },
    { key: 'disc', label: 'İskonto', w: 50, align: 'right' },
    { key: 'vatp', label: 'KDV %', w: 30, align: 'right' },
    { key: 'vat', label: 'KDV Tutarı', w: 52, align: 'right' },
    ...(hasWht ? [{ key: 'wht', label: 'Tevkifat', w: 48, align: 'right' }] : []),
    { key: 'total', label: 'Mal Hizmet Tutarı', w: hasWht ? 60 : 78, align: 'right' },
  ];
  const rows = calc.lines.map((l) => ({
    no: l.id,
    name: [l.sellersItemId ? `[${l.sellersItemId}] ` : '', l.name, l.description ? `\n${l.description}` : ''].join(''),
    qty: qtyFmt(l.quantity),
    unit: l.unitCode,
    price: money(l.unitPrice),
    disc: l.allowance ? `${money(l.allowance)}\n%${qtyFmt(l.allowancePercent)}` : '',
    vatp: qtyFmt(l.vat.percent),
    vat: money(l.vat.amount),
    wht: l.withholding ? `${l.withholding.code} %${qtyFmt(l.withholding.percent)}\n${money(l.withholding.amount)}` : '',
    total: money(l.lineExtension),
  }));
  y = table(doc, { columns, rows, startY: y });

  const tot = calc.totals;
  const totalRows = [
    ['Mal Hizmet Toplam Tutarı', tot.grossTotal],
    ['Toplam İskonto', tot.allowanceTotal],
    ...calc.taxSubtotals.filter((t) => t.code === '0015').flatMap((t) => [
      [`KDV Matrahı (%${qtyFmt(t.percent)})`, t.base],
      [`Hesaplanan KDV (%${qtyFmt(t.percent)})`, t.amount],
    ]),
    ...calc.taxSubtotals.filter((t) => t.code !== '0015').map((t) => [`${t.name}${t.percent != null ? ` (%${qtyFmt(t.percent)})` : ''}`, t.amount]),
    ...calc.withholdingSubtotals.map((t) => [`KDV Tevkifatı ${t.code} (%${qtyFmt(t.percent)})`, t.amount]),
    ['Vergiler Dahil Toplam', tot.taxInclusive],
    ['Ödenecek Tutar', tot.payable],
  ];
  const rowH = 13;
  y = ensureSpace(doc, y + 6, totalRows.length * rowH + 60);
  const bx = L + W - 250;
  totalRows.forEach(([k, v], i) => {
    const last = i >= totalRows.length - 2;
    doc.rect(bx, y + i * rowH, 250, rowH).lineWidth(0.4).stroke('#888');
    doc.font(last ? 'B' : 'R').fontSize(8).fillColor('#000')
      .text(k, bx + 3, y + i * rowH + 2.5, { width: 160, lineBreak: false })
      .text(`${money(v)} ${cur}`, bx + 160, y + i * rowH + 2.5, { width: 86, align: 'right', lineBreak: false });
  });
  const notes = [
    `Yalnız: ${tutarYazi(tot.payable, cur)}`,
    ...(model.notes || []),
    ...[...new Set(calc.taxSubtotals.filter((t) => t.exemptionCode).map((t) => `KDV istisna/muafiyet ${t.exemptionCode}: ${t.exemptionReason || ''}`))],
    ...calc.withholdingSubtotals.map((t) => `${t.name} — kod ${t.code}, oran %${qtyFmt(t.percent)}`),
    model.paymentMeans && model.paymentMeans.iban ? `IBAN: ${model.paymentMeans.iban}${model.paymentMeans.bankName ? ` (${model.paymentMeans.bankName})` : ''}` : null,
    model.paymentMeans && model.paymentMeans.dueDate ? `Son ödeme tarihi: ${dmy(model.paymentMeans.dueDate)}` : null,
    opts.footerNote || null,
  ].filter(Boolean);
  doc.font('R').fontSize(8).fillColor('#000');
  let ny = y;
  for (const n of notes) {
    doc.text(n, L, ny, { width: W - 260 });
    ny = doc.y + 2;
  }
}

// ─── Matbu (önceden basılı form) fatura/irsaliye ───────────────────────────

const DEFAULT_MATBU_LAYOUT = Object.freeze({
  fontSize: 9,
  fields: {
    customerName: { x: 50, y: 150, w: 300 },
    customerAddress: { x: 50, y: 166, w: 300 },
    customerTax: { x: 50, y: 210, w: 300 },
    issueDate: { x: 440, y: 150, w: 110 },
    issueTime: { x: 440, y: 166, w: 110 },
    documentNo: { x: 440, y: 182, w: 110 },
    despatchRef: { x: 440, y: 198, w: 110 },
    ettn: { x: 50, y: 236, w: 500 },
  },
  lines: {
    startY: 280,
    rowHeight: 16,
    maxRows: 20,
    cols: {
      code: { x: 50, w: 70 },
      name: { x: 122, w: 200 },
      qty: { x: 325, w: 50, align: 'right' },
      unit: { x: 380, w: 30 },
      price: { x: 412, w: 60, align: 'right' },
      total: { x: 475, w: 80, align: 'right' },
    },
  },
  totals: {
    lineExtension: { x: 475, y: 630, w: 80, align: 'right' },
    tax: { x: 475, y: 646, w: 80, align: 'right' },
    withholding: { x: 475, y: 662, w: 80, align: 'right' },
    payable: { x: 475, y: 678, w: 80, align: 'right' },
    words: { x: 50, y: 700, w: 420 },
  },
});

function mergeLayout(custom) {
  if (!custom) return DEFAULT_MATBU_LAYOUT;
  const c = typeof custom === 'string' ? JSON.parse(custom) : custom;
  return {
    ...DEFAULT_MATBU_LAYOUT,
    ...c,
    fields: { ...DEFAULT_MATBU_LAYOUT.fields, ...(c.fields || {}) },
    lines: { ...DEFAULT_MATBU_LAYOUT.lines, ...(c.lines || {}), cols: { ...DEFAULT_MATBU_LAYOUT.lines.cols, ...((c.lines && c.lines.cols) || {}) } },
    totals: { ...DEFAULT_MATBU_LAYOUT.totals, ...(c.totals || {}) },
  };
}

function put(doc, box, text, size) {
  if (!box || text == null || text === '') return;
  doc.fontSize(size).text(String(text), box.x, box.y, { width: box.w || 200, align: box.align || 'left', lineBreak: false, ellipsis: true });
}

function drawMatbu(doc, model, rows, totals, layout, cur) {
  const L = mergeLayout(layout);
  const fs = L.fontSize || 9;
  const pages = Math.max(1, Math.ceil(rows.length / L.lines.maxRows));
  for (let p = 0; p < pages; p += 1) {
    if (p > 0) doc.addPage();
    doc.font('R').fillColor('#000');
    const cust = model.customer || {};
    const a = cust.address || {};
    put(doc, L.fields.customerName, cust.idScheme === 'TCKN' && cust.firstName ? `${cust.firstName} ${cust.familyName || ''}` : cust.name, fs);
    put(doc, L.fields.customerAddress, [a.street, a.district, a.city].filter(Boolean).join(' '), fs);
    put(doc, L.fields.customerTax, [cust.taxOffice, cust.id].filter(Boolean).join(' / '), fs);
    put(doc, L.fields.issueDate, dmy(model.issueDate), fs);
    put(doc, L.fields.issueTime, model.issueTime, fs);
    put(doc, L.fields.documentNo, model.id, fs);
    put(doc, L.fields.despatchRef, (model.despatchReferences || []).map((d) => d.id).join(', '), fs);
    put(doc, L.fields.ettn, model.uuid ? `ETTN: ${model.uuid}` : '', fs - 1);
    rows.slice(p * L.lines.maxRows, (p + 1) * L.lines.maxRows).forEach((r, i) => {
      const y = L.lines.startY + i * L.lines.rowHeight;
      for (const [k, box] of Object.entries(L.lines.cols)) put(doc, { ...box, y }, r[k], fs);
    });
    if (p === pages - 1 && totals) {
      put(doc, L.totals.lineExtension, totals.lineExtension != null ? money(totals.lineExtension) : null, fs);
      put(doc, L.totals.tax, totals.tax != null ? money(totals.tax) : null, fs);
      put(doc, L.totals.withholding, totals.withholding ? money(totals.withholding) : null, fs);
      put(doc, L.totals.payable, totals.payable != null ? `${money(totals.payable)} ${cur}` : null, fs);
      put(doc, L.totals.words, totals.payable != null ? `Yalnız: ${tutarYazi(totals.payable, cur)}` : null, fs);
    }
  }
}

/**
 * @param {object} model UBL-TR fatura modeli (mapper.buildInvoiceModel)
 * @param {{template?:'standart'|'matbu', watermark?:string, footerNote?:string, matbuLayout?:object|string}} opts
 * @returns {Promise<Buffer>}
 */
async function renderInvoicePdf(model, opts = {}) {
  const calc = computeInvoice(model);
  const doc = newDoc({ Title: `${PROFILE_TITLES[model.profileId] || 'Fatura'} ${model.id || ''}`.trim(), Author: model.supplier && model.supplier.name, Subject: model.uuid || '' });
  const qrText = invoiceQrText(model, calc);
  if (opts.template === 'matbu') {
    const rows = calc.lines.map((l) => ({ code: l.sellersItemId, name: l.name, qty: qtyFmt(l.quantity), unit: l.unitCode, price: money(l.unitPrice), total: money(l.lineExtension) }));
    drawMatbu(doc, model, rows, {
      lineExtension: calc.totals.lineExtension,
      tax: calc.totals.taxTotal,
      withholding: calc.totals.withholdingTotal,
      payable: calc.totals.payable,
    }, opts.matbuLayout, model.currency || 'TRY');
  } else {
    drawInvoiceStandard(doc, model, calc, { ...opts, qrText });
    watermark(doc, statusText(opts));
    footers(doc, opts.footerText || 'Bu belge KTB ERP tarafından GİB UBL-TR 1.2 standardında üretilmiştir.');
  }
  return finish(doc);
}

async function renderDespatchPdf(model, opts = {}) {
  const doc = newDoc({ Title: `e-İrsaliye ${model.id || ''}`.trim(), Author: model.supplier && model.supplier.name, Subject: model.uuid || '' });
  const rows = (model.lines || []).map((l) => ({
    no: l.id, code: l.sellersItemId || '', name: l.name, qty: qtyFmt(l.quantity), unit: l.unitCode, price: '', total: '',
  }));
  if (opts.template === 'matbu') {
    drawMatbu(doc, model, rows, null, opts.matbuLayout, model.currency || 'TRY');
    return finish(doc);
  }
  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const top = doc.page.margins.top;
  const s = model.shipment || {};
  const supEnd = partyBlock(doc, model.supplier, L, top, 210);
  doc.font('B').fontSize(16).text('e-İRSALİYE', L + 215, top + 18, { width: 160, align: 'center' });
  doc.font('R').fontSize(7).text('UBL-TR 1.2.1', L + 215, doc.y + 2, { width: 160, align: 'center' });
  drawQr(doc, despatchQrText(model), L + W - 100, top, 100);
  let y = Math.max(supEnd, top + 104) + 8;
  doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.8).stroke('#333');
  y += 6;
  const custEnd = partyBlock(doc, model.customer, L, y, 280, { heading: 'SAYIN' });
  const infoEnd = infoTable(doc, [
    ['Özelleştirme No', 'TR1.2.1'],
    ['Senaryo', model.profileId],
    ['İrsaliye Tipi', model.despatchTypeCode],
    ['İrsaliye No', model.id || '(GİB no atanmadı)'],
    ['Düzenleme Tarihi', dmy(model.issueDate)],
    ['Düzenleme Saati', model.issueTime],
    ['Fiili Sevk Tarihi', dmy(s.despatchDate)],
    ['Fiili Sevk Saati', s.despatchTime],
    ['Sipariş No', model.orderReference && model.orderReference.id],
  ], L + W - 220, y, 220);
  y = Math.max(custEnd, infoEnd) + 6;
  doc.font('B').fontSize(8).text(`ETTN: ${model.uuid || '-'}`, L, y, { width: W });
  const da = s.deliveryAddress || {};
  const shipInfo = [
    `Teslim Adresi: ${[da.street, da.postalZone, da.district, da.city, da.country].filter(Boolean).join(' ')}`,
    s.vehiclePlate ? `Araç Plaka: ${s.vehiclePlate}${s.trailerPlate ? `   Dorse: ${s.trailerPlate}` : ''}` : null,
    ...(s.drivers || []).map((d) => `Şoför: ${d.firstName || ''} ${d.familyName || ''}  TCKN: ${d.nationalId || ''}`),
    s.carrier ? `Taşıyıcı: ${s.carrier.name || ''}  ${s.carrier.idScheme}: ${s.carrier.id}` : null,
  ].filter(Boolean);
  doc.font('R').fontSize(8);
  for (const t of shipInfo) doc.text(t, L, doc.y + 2, { width: W });
  y = doc.y + 6;
  y = table(doc, {
    columns: [
      { key: 'no', label: 'Sıra', w: 30, align: 'right' },
      { key: 'code', label: 'Mal Kodu', w: 90 },
      { key: 'name', label: 'Mal Adı', w: 263 },
      { key: 'qty', label: 'Miktar', w: 80, align: 'right' },
      { key: 'unit', label: 'Birim', w: 60 },
    ],
    rows,
    startY: y,
  });
  doc.font('R').fontSize(8);
  for (const n of [...(model.notes || []), opts.footerNote].filter(Boolean)) doc.text(n, L, doc.y + 6, { width: W });
  watermark(doc, statusText(opts));
  footers(doc, opts.footerText || 'Bu belge KTB ERP tarafından GİB UBL-TR 1.2.1 standardında üretilmiştir.');
  return finish(doc);
}

module.exports = {
  documentHtml,
  escapeHtml,
  renderInvoicePdf,
  renderDespatchPdf,
  DEFAULT_MATBU_LAYOUT,
  FONT_REGULAR,
  FONT_BOLD,
};
