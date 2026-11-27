#!/usr/bin/env node
/**
 * Örnek e-belge çıktıları üretir ve GİB XSD + kural doğrulamasından geçirir:
 *   docs/go-live/ebelge-ornekler/*.xml, *.pdf
 * Sentetik veri (tests/helpers/ebelgeFixtures) kullanır; DB gerekmez.
 *   node scripts/ebelge-ornek-uret.js [hedefKlasör]
 */
const fs = require('fs');
const path = require('path');
const { buildInvoiceXml } = require('../src/services/ebelge/ublInvoice');
const { buildDespatchXml } = require('../src/services/ebelge/ublDespatch');
const { buildEnvelopeXml } = require('../src/services/ebelge/envelope');
const { validate } = require('../src/services/ebelge/validator');
const codes = require('../src/services/ebelge/codeLists');
const { renderInvoicePdf, renderDespatchPdf } = require('../src/services/belgePdfService');
const f = require('../tests/helpers/ebelgeFixtures');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '../docs/go-live/ebelge-ornekler'));

const invoices = {
  'efatura-ticari-satis': f.baseInvoice(),
  'efatura-tevkifat': f.baseInvoice({
    id: 'EFT2026000000002',
    uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e60',
    invoiceTypeCode: 'TEVKIFAT',
    lines: [{ id: 1, name: 'Yapım İşi (601 — 4/10 KDV tevkifatı)', quantity: 1, unitCode: 'C62', unitPrice: 10000, vatPercent: 20, withholding: { code: '601', percent: 40, name: 'KDV TEVKİFAT (YAPIM İŞLERİ)' } }],
  }),
  'efatura-istisna-doviz': f.baseInvoice({
    id: 'EFT2026000000003',
    uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e61',
    invoiceTypeCode: 'ISTISNA',
    currency: 'USD',
    exchangeRate: 34.5678,
    lines: [{ id: 1, name: 'İhraç Kayıtlı Olmayan İstisna Ürünü', quantity: 5, unitCode: 'C62', unitPrice: 200, vatPercent: 0, exemptionCode: '301', exemptionReason: codes.exemptionReasonText('301') }],
  }),
  'efatura-iade': f.baseInvoice({
    id: 'EFT2026000000004',
    uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e62',
    profileId: 'TEMELFATURA',
    invoiceTypeCode: 'IADE',
    despatchReferences: [],
    billingReferences: [{ id: 'ABC2026000000077', issueDate: '2026-11-01' }],
  }),
  'earsiv-satis': f.baseInvoice({ id: 'EAR2026000000001', uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e63', profileId: 'EARSIVFATURA', customer: f.customerPerson }),
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = [];
  const write = async (name, xml, kind) => {
    const r = await validate(xml, kind);
    if (!r.valid) throw new Error(`${name}: ${JSON.stringify(r.errors.slice(0, 5))}`);
    fs.writeFileSync(path.join(OUT, name), xml);
    report.push(`${name}  ${kind}  XSD+kural: GEÇERLİ`);
  };
  for (const [name, model] of Object.entries(invoices)) await write(`${name}.xml`, buildInvoiceXml(model), 'INVOICE');
  const desp = f.baseDespatch();
  await write('eirsaliye-sevk.xml', buildDespatchXml(desp), 'DESPATCHADVICE');
  const env = buildEnvelopeXml({
    elementType: 'INVOICE',
    documentXml: buildInvoiceXml(invoices['efatura-ticari-satis']),
    instanceId: '9c0a5e1d-7b2f-4c3a-8d4e-5f6a7b8c9d0e',
    createdAt: new Date('2026-11-27T10:15:00'),
    sender: { alias: 'urn:mail:defaultgb@ktb.example.com.tr', name: f.supplier.name, id: f.supplier.id },
    receiver: { alias: 'urn:mail:defaultpk@ornekcelik.example.com.tr', name: f.customerCompany.name, id: f.customerCompany.id },
  });
  await write('efatura-ticari-satis-zarf.xml', env.xml, 'ENVELOPE');

  fs.writeFileSync(path.join(OUT, 'efatura-ticari-satis.pdf'), await renderInvoicePdf(invoices['efatura-ticari-satis'], { watermark: 'ÖRNEK' }));
  fs.writeFileSync(path.join(OUT, 'efatura-tevkifat.pdf'), await renderInvoicePdf(invoices['efatura-tevkifat'], { watermark: 'ÖRNEK' }));
  fs.writeFileSync(path.join(OUT, 'efatura-matbu.pdf'), await renderInvoicePdf(invoices['efatura-ticari-satis'], { template: 'matbu' }));
  fs.writeFileSync(path.join(OUT, 'eirsaliye-sevk.pdf'), await renderDespatchPdf(desp, { watermark: 'ÖRNEK' }));
  report.push('efatura-ticari-satis.pdf, efatura-tevkifat.pdf, efatura-matbu.pdf, eirsaliye-sevk.pdf');
  console.log(`${OUT}\n  ${report.join('\n  ')}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
