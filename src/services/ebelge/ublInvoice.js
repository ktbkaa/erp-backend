/**
 * UBL-TR 1.2 Invoice (e-Fatura / e-Arşiv) üretimi.
 * Girdi: mapper.js'nin ürettiği normalize model; hesaplama computeInvoice() ile tek yerden yapılır
 * (XML, PDF ve QR aynı rakamları kullanır).
 */
const { el, keep, toXml } = require('./xml');
const { round, amt, qty, price, pct } = require('./amounts');
const { TAX_TYPE_NAMES } = require('./codeLists');

const NS = Object.freeze({
  invoice: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  despatch: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  placeholder: 'urn:ktb:erp:ebelge:imza-yer-tutucu',
});

const RETURN_TYPES = new Set(['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE']);

/** Satır ve belge toplamlarını hesaplar; modeli değiştirmez. */
function computeInvoice(model) {
  const lines = (model.lines || []).map((l, idx) => {
    const quantity = Number(l.quantity || 0);
    const unitPrice = Number(l.unitPrice || 0);
    const gross = round(quantity * unitPrice, 2);
    const allowance = round(l.allowance || 0, 2);
    const lineExtension = l.lineExtension != null ? round(l.lineExtension, 2) : round(gross - allowance, 2);
    const otherTaxes = (l.otherTaxes || []).map((t) => ({
      code: String(t.code),
      name: t.name || TAX_TYPE_NAMES[t.code] || `VERGİ ${t.code}`,
      percent: t.percent != null ? Number(t.percent) : null,
      base: round(t.base != null ? t.base : lineExtension, 2),
      amount: round(t.amount != null ? t.amount : (lineExtension * Number(t.percent || 0)) / 100, 2),
    }));
    // ÖTV vb. KDV matrahına dahildir (KDV K. 24/c)
    const vatBase = round(lineExtension + otherTaxes.reduce((s, t) => s + t.amount, 0), 2);
    const vatPercent = Number(l.vatPercent || 0);
    const vatAmount = round((vatBase * vatPercent) / 100, 2);
    const vat = {
      code: '0015',
      name: 'KDV',
      percent: vatPercent,
      base: vatBase,
      amount: vatAmount,
      exemptionCode: vatAmount === 0 ? (l.exemptionCode || null) : null,
      exemptionReason: vatAmount === 0 ? (l.exemptionReason || null) : null,
    };
    let withholding = null;
    if (l.withholding && l.withholding.code) {
      const wp = Number(l.withholding.percent || 0);
      withholding = {
        code: String(l.withholding.code),
        name: l.withholding.name || 'KDV TEVKİFAT',
        percent: wp,
        base: vatAmount,
        amount: round((vatAmount * wp) / 100, 2),
      };
    }
    const taxes = [...otherTaxes, vat];
    const taxTotal = round(taxes.reduce((s, t) => s + t.amount, 0), 2);
    return {
      ...l,
      id: l.id != null ? l.id : idx + 1,
      quantity,
      unitPrice,
      gross,
      allowance,
      allowancePercent: gross ? round((allowance / gross) * 100, 2) : 0,
      lineExtension,
      taxes,
      vat,
      taxTotal,
      withholding,
    };
  });

  const groupTaxes = (items) => {
    const map = new Map();
    for (const t of items) {
      const k = `${t.code}|${t.percent}|${t.exemptionCode || ''}`;
      const cur = map.get(k) || { ...t, base: 0, amount: 0 };
      cur.base = round(cur.base + t.base, 2);
      cur.amount = round(cur.amount + t.amount, 2);
      map.set(k, cur);
    }
    return [...map.values()];
  };

  const taxSubtotals = groupTaxes(lines.flatMap((l) => l.taxes));
  const withholdingSubtotals = groupTaxes(lines.map((l) => l.withholding).filter(Boolean));
  const lineExtension = round(lines.reduce((s, l) => s + l.lineExtension, 0), 2);
  const allowanceTotal = round(lines.reduce((s, l) => s + l.allowance, 0), 2);
  const taxTotal = round(taxSubtotals.reduce((s, t) => s + t.amount, 0), 2);
  const withholdingTotal = round(withholdingSubtotals.reduce((s, t) => s + t.amount, 0), 2);
  const taxInclusive = round(lineExtension + taxTotal, 2);
  const payable = round(taxInclusive - withholdingTotal, 2);

  return {
    lines,
    taxSubtotals,
    withholdingSubtotals,
    totals: {
      lineExtension,
      taxExclusive: lineExtension,
      taxInclusive,
      allowanceTotal,
      taxTotal,
      withholdingTotal,
      payable,
      grossTotal: round(lines.reduce((s, l) => s + l.gross, 0), 2),
    },
  };
}

function money(name, value, currency) {
  return el(name, { currencyID: currency }, amt(value));
}

function addressNode(name, a = {}) {
  return keep(el(name, [
    el('cbc:ID', a.id),
    el('cbc:Room', a.room),
    el('cbc:StreetName', a.street),
    el('cbc:BuildingName', a.buildingName),
    el('cbc:BuildingNumber', a.buildingNo),
    keep(el('cbc:CitySubdivisionName', a.district || '')),
    keep(el('cbc:CityName', a.city || '')),
    el('cbc:PostalZone', a.postalZone),
    el('cbc:Region', a.region),
    keep(el('cac:Country', [
      el('cbc:IdentificationCode', a.countryCode),
      keep(el('cbc:Name', a.country || 'Türkiye')),
    ])),
  ]));
}

function partyNode(p = {}) {
  const ids = [el('cac:PartyIdentification', [el('cbc:ID', { schemeID: p.idScheme }, p.id)])];
  for (const x of p.extraIds || []) {
    if (x && x.id) ids.push(el('cac:PartyIdentification', [el('cbc:ID', { schemeID: x.scheme }, x.id)]));
  }
  const isPerson = p.idScheme === 'TCKN';
  return el('cac:Party', [
    el('cbc:WebsiteURI', p.website),
    ...ids,
    el('cac:PartyName', [el('cbc:Name', p.name)]),
    addressNode('cac:PostalAddress', p.address),
    p.taxOffice ? el('cac:PartyTaxScheme', [el('cac:TaxScheme', [el('cbc:Name', p.taxOffice)])]) : null,
    el('cac:Contact', [
      el('cbc:Telephone', p.phone),
      el('cbc:Telefax', p.fax),
      el('cbc:ElectronicMail', p.email),
    ]),
    isPerson ? el('cac:Person', [el('cbc:FirstName', p.firstName), el('cbc:FamilyName', p.familyName)]) : null,
  ]);
}

function signatureNode(supplier) {
  return el('cac:Signature', [
    el('cbc:ID', { schemeID: 'VKN_TCKN' }, supplier.id),
    el('cac:SignatoryParty', [
      el('cac:PartyIdentification', [el('cbc:ID', { schemeID: supplier.idScheme }, supplier.id)]),
      addressNode('cac:PostalAddress', supplier.address),
    ]),
    el('cac:DigitalSignatureAttachment', [el('cac:ExternalReference', [el('cbc:URI', '#Signature')])]),
  ]);
}

/**
 * İmza (XAdES) mali mühürle özel entegratör/GİB tarafında eklenir.
 * XSD ExtensionContent içinde tam bir eleman ister; imza yoksa yer tutucu yazılır.
 */
function extensionsNode(signatureXmlNode) {
  return el('ext:UBLExtensions', [
    el('ext:UBLExtension', [
      el('ext:ExtensionContent', [
        signatureXmlNode || keep(el('ktbsig:ImzaYerTutucu', { 'xmlns:ktbsig': NS.placeholder }, [])),
      ]),
    ]),
  ]);
}

function taxSubtotalNode(t, currency, { withExemption = true } = {}) {
  return el('cac:TaxSubtotal', [
    money('cbc:TaxableAmount', t.base, currency),
    money('cbc:TaxAmount', t.amount, currency),
    t.percent != null ? el('cbc:Percent', pct(t.percent)) : null,
    el('cac:TaxCategory', [
      withExemption ? el('cbc:TaxExemptionReasonCode', t.exemptionCode) : null,
      withExemption ? el('cbc:TaxExemptionReason', t.exemptionReason) : null,
      el('cac:TaxScheme', [el('cbc:Name', t.name), el('cbc:TaxTypeCode', t.code)]),
    ]),
  ]);
}

function taxTotalNode(subs, currency) {
  const total = round(subs.reduce((s, t) => s + t.amount, 0), 2);
  return el('cac:TaxTotal', [money('cbc:TaxAmount', total, currency), ...subs.map((t) => taxSubtotalNode(t, currency))]);
}

function withholdingTotalNode(subs, currency) {
  const total = round(subs.reduce((s, t) => s + t.amount, 0), 2);
  return el('cac:WithholdingTaxTotal', [
    money('cbc:TaxAmount', total, currency),
    ...subs.map((t) => taxSubtotalNode(t, currency, { withExemption: false })),
  ]);
}

function lineNode(l, currency) {
  return el('cac:InvoiceLine', [
    el('cbc:ID', String(l.id)),
    el('cbc:Note', l.note),
    el('cbc:InvoicedQuantity', { unitCode: l.unitCode }, qty(l.quantity)),
    money('cbc:LineExtensionAmount', l.lineExtension, currency),
    l.orderLineId ? el('cac:OrderLineReference', [el('cbc:LineID', String(l.orderLineId))]) : null,
    l.allowance > 0
      ? el('cac:AllowanceCharge', [
        el('cbc:ChargeIndicator', 'false'),
        el('cbc:MultiplierFactorNumeric', qty(l.allowancePercent / 100, 4)),
        money('cbc:Amount', l.allowance, currency),
        money('cbc:BaseAmount', l.gross, currency),
      ])
      : null,
    taxTotalNode(l.taxes, currency),
    l.withholding ? withholdingTotalNode([l.withholding], currency) : null,
    el('cac:Item', [
      el('cbc:Description', l.description),
      el('cbc:Name', l.name),
      el('cbc:BrandName', l.brand),
      l.sellersItemId ? el('cac:SellersItemIdentification', [el('cbc:ID', l.sellersItemId)]) : null,
      l.buyersItemId ? el('cac:BuyersItemIdentification', [el('cbc:ID', l.buyersItemId)]) : null,
    ]),
    el('cac:Price', [money('cbc:PriceAmount', l.unitPrice, currency)]),
  ]);
}

function buildInvoiceDocument(model) {
  const calc = computeInvoice(model);
  const cur = model.currency || 'TRY';
  const t = calc.totals;
  const notes = (model.notes || []).filter(Boolean);
  const isReturn = RETURN_TYPES.has(model.invoiceTypeCode);

  return el('Invoice', {
    xmlns: NS.invoice,
    'xmlns:cac': NS.cac,
    'xmlns:cbc': NS.cbc,
    'xmlns:ext': NS.ext,
    'xmlns:xsi': NS.xsi,
    'xsi:schemaLocation': `${NS.invoice} UBL-Invoice-2.1.xsd`,
  }, [
    extensionsNode(model.signatureXmlNode),
    el('cbc:UBLVersionID', '2.1'),
    el('cbc:CustomizationID', 'TR1.2'),
    el('cbc:ProfileID', model.profileId),
    el('cbc:ID', model.id),
    el('cbc:CopyIndicator', model.copyIndicator ? 'true' : 'false'),
    el('cbc:UUID', model.uuid),
    el('cbc:IssueDate', model.issueDate),
    el('cbc:IssueTime', model.issueTime),
    el('cbc:InvoiceTypeCode', model.invoiceTypeCode),
    ...notes.map((n) => el('cbc:Note', n)),
    el('cbc:DocumentCurrencyCode', cur),
    cur !== 'TRY' ? el('cbc:PricingCurrencyCode', cur) : null,
    el('cbc:LineCountNumeric', String(calc.lines.length)),
    model.orderReference && model.orderReference.id
      ? el('cac:OrderReference', [el('cbc:ID', model.orderReference.id), el('cbc:IssueDate', model.orderReference.issueDate)])
      : null,
    ...(isReturn ? model.billingReferences || [] : []).map((b) => el('cac:BillingReference', [
      el('cac:InvoiceDocumentReference', [
        el('cbc:ID', b.id),
        el('cbc:IssueDate', b.issueDate),
        el('cbc:DocumentTypeCode', 'IADE'),
      ]),
    ])),
    ...(model.despatchReferences || []).filter((d) => d && d.id).map((d) => el('cac:DespatchDocumentReference', [
      el('cbc:ID', d.id),
      el('cbc:IssueDate', d.issueDate),
    ])),
    ...(model.additionalReferences || []).map((d) => el('cac:AdditionalDocumentReference', [
      el('cbc:ID', d.id),
      el('cbc:IssueDate', d.issueDate || model.issueDate),
      el('cbc:DocumentTypeCode', d.typeCode),
      el('cbc:DocumentType', d.type),
    ])),
    signatureNode(model.supplier),
    el('cac:AccountingSupplierParty', [partyNode(model.supplier)]),
    el('cac:AccountingCustomerParty', [partyNode(model.customer)]),
    model.paymentMeans
      ? el('cac:PaymentMeans', [
        el('cbc:PaymentMeansCode', model.paymentMeans.code || '1'),
        el('cbc:PaymentDueDate', model.paymentMeans.dueDate),
        model.paymentMeans.iban
          ? el('cac:PayeeFinancialAccount', [
            el('cbc:ID', model.paymentMeans.iban),
            el('cbc:CurrencyCode', cur),
            el('cbc:PaymentNote', model.paymentMeans.bankName),
          ])
          : null,
      ])
      : null,
    model.paymentTerms && (model.paymentTerms.note || model.paymentTerms.dueDate)
      ? el('cac:PaymentTerms', [
        el('cbc:Note', model.paymentTerms.note),
        el('cbc:PaymentDueDate', model.paymentTerms.dueDate),
      ])
      : null,
    cur !== 'TRY' && model.exchangeRate
      ? el('cac:PricingExchangeRate', [
        el('cbc:SourceCurrencyCode', cur),
        el('cbc:TargetCurrencyCode', 'TRY'),
        el('cbc:CalculationRate', qty(model.exchangeRate, 6)),
        el('cbc:Date', model.issueDate),
      ])
      : null,
    taxTotalNode(calc.taxSubtotals, cur),
    calc.withholdingSubtotals.length ? withholdingTotalNode(calc.withholdingSubtotals, cur) : null,
    el('cac:LegalMonetaryTotal', [
      money('cbc:LineExtensionAmount', t.lineExtension, cur),
      money('cbc:TaxExclusiveAmount', t.taxExclusive, cur),
      money('cbc:TaxInclusiveAmount', t.taxInclusive, cur),
      t.allowanceTotal > 0 ? money('cbc:AllowanceTotalAmount', t.allowanceTotal, cur) : null,
      money('cbc:PayableAmount', t.payable, cur),
    ]),
    ...calc.lines.map((l) => lineNode(l, cur)),
  ]);
}

function buildInvoiceXml(model, opts = {}) {
  return toXml(buildInvoiceDocument(model), opts);
}

module.exports = {
  NS,
  RETURN_TYPES,
  computeInvoice,
  buildInvoiceXml,
  buildInvoiceDocument,
  partyNode,
  addressNode,
  signatureNode,
  extensionsNode,
  money,
};
