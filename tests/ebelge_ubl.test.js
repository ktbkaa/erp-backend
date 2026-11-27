/**
 * UBL-TR 1.2 / 1.2.1 XML üretimi: GİB XSD (UBLTR_1.2.1_Paketi) + şematron kural portu ile doğrulama.
 * DB gerektirmez.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const xpath = require('xpath');

const { buildInvoiceXml, computeInvoice } = require('../src/services/ebelge/ublInvoice');
const { buildDespatchXml } = require('../src/services/ebelge/ublDespatch');
const { buildEnvelopeXml } = require('../src/services/ebelge/envelope');
const { validate, validateRules } = require('../src/services/ebelge/validator');
const codes = require('../src/services/ebelge/codeLists');
const mapper = require('../src/services/ebelge/mapper');
const { invoiceQrText, despatchQrText, qrMatrix } = require('../src/services/ebelge/qr');
const { tutarYazi } = require('../src/services/ebelge/tutarYazi');
const { formatGibNumber } = require('../src/services/ebelge/numbering');
const f = require('./helpers/ebelgeFixtures');

const FIX = path.join(__dirname, 'fixtures/ebelge');
const select = xpath.useNamespaces({
  inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  desp: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  sh: 'http://www.unece.org/cefact/namespaces/StandardBusinessDocumentHeader',
});
const dom = (xml) => new DOMParser().parseFromString(xml, 'text/xml');
const text = (doc, p) => select(`string(${p})`, doc);

async function assertValid(xml, kind) {
  const r = await validate(xml, kind);
  assert.equal(r.xsdValid, true, `XSD hataları: ${JSON.stringify(r.errors.slice(0, 5))}`);
  assert.deepEqual(r.errors, [], `Kural hataları: ${JSON.stringify(r.errors.slice(0, 5))}`);
  return r;
}

describe('e-Belge UBL-TR fatura XML', () => {
  it('TICARIFATURA / SATIS: XSD + kurallar geçer, toplamlar tutarlı', async () => {
    const model = f.baseInvoice();
    const xml = buildInvoiceXml(model);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    await assertValid(xml, 'INVOICE');
    const d = dom(xml);
    assert.equal(text(d, '/inv:Invoice/cbc:UBLVersionID'), '2.1');
    assert.equal(text(d, '/inv:Invoice/cbc:CustomizationID'), 'TR1.2');
    assert.equal(text(d, '/inv:Invoice/cbc:ProfileID'), 'TICARIFATURA');
    assert.equal(text(d, '/inv:Invoice/cbc:UUID'), model.uuid);
    assert.equal(text(d, '/inv:Invoice/cbc:ID'), 'EFT2026000000001');
    assert.equal(text(d, '/inv:Invoice/cbc:LineCountNumeric'), '3');
    assert.match(xml, /Sac Levha 2mm Ğüşİöç/);
    const calc = computeInvoice(model);
    // 10×125,50−25,50 + 2×750 + 3×33,333 = 1229,50 + 1500 + 100,00
    assert.equal(calc.totals.lineExtension, 2829.5);
    assert.equal(Number(text(d, '/inv:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount')), 2829.5);
    assert.equal(Number(text(d, '/inv:Invoice/cac:TaxTotal/cbc:TaxAmount')), calc.totals.taxTotal);
    assert.equal(calc.totals.payable, Math.round((2829.5 + calc.totals.taxTotal) * 100) / 100);
    assert.equal(select('/inv:Invoice/cac:TaxTotal/cac:TaxSubtotal', d).length, 2, 'KDV %20 ve %1 ayrı alt toplam');
    assert.equal(text(d, '/inv:Invoice/cac:DespatchDocumentReference/cbc:ID'), 'IRS2026000000007');
    assert.equal(text(d, '/inv:Invoice/cac:Signature/cac:SignatoryParty/cac:PartyIdentification/cbc:ID'), '1234567801');
  });

  it('TEVKIFAT: WithholdingTaxTotal kod/oran, ödenecek = vergi dahil − tevkifat', async () => {
    const model = f.baseInvoice({
      invoiceTypeCode: 'TEVKIFAT',
      lines: [{ id: 1, name: 'Yapım İşi', quantity: 1, unitCode: 'C62', unitPrice: 10000, vatPercent: 20, withholding: { code: '601', percent: 40 } }],
    });
    const xml = buildInvoiceXml(model);
    await assertValid(xml, 'INVOICE');
    const d = dom(xml);
    assert.equal(text(d, '//cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode'), '601');
    assert.equal(Number(text(d, '//cac:WithholdingTaxTotal/cbc:TaxAmount')), 800);
    assert.equal(Number(text(d, '/inv:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount')), 12000);
    assert.equal(Number(text(d, '/inv:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount')), 11200);
  });

  it('ISTISNA (KDV %0, 301) ve döviz (USD + kur) geçerli', async () => {
    const model = f.baseInvoice({
      invoiceTypeCode: 'ISTISNA',
      currency: 'USD',
      exchangeRate: 34.5678,
      lines: [{ id: 1, name: 'İhraç Ürünü', quantity: 5, unitCode: 'C62', unitPrice: 200, vatPercent: 0, exemptionCode: '301', exemptionReason: codes.exemptionReasonText('301') }],
    });
    const xml = buildInvoiceXml(model);
    await assertValid(xml, 'INVOICE');
    const d = dom(xml);
    assert.equal(text(d, '//cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReasonCode'), '301');
    assert.equal(text(d, '/inv:Invoice/cbc:DocumentCurrencyCode'), 'USD');
    assert.equal(text(d, '/inv:Invoice/cac:PricingExchangeRate/cbc:CalculationRate'), '34.5678');
  });

  it('IADE (TEMELFATURA): BillingReference DocumentTypeCode=IADE, 16 haneli ID', async () => {
    const model = f.baseInvoice({
      profileId: 'TEMELFATURA',
      invoiceTypeCode: 'IADE',
      billingReferences: [{ id: 'EFT2026000000123', issueDate: '2026-11-01' }],
      despatchReferences: [],
    });
    const xml = buildInvoiceXml(model);
    await assertValid(xml, 'INVOICE');
    const d = dom(xml);
    assert.equal(text(d, '//cac:BillingReference/cac:InvoiceDocumentReference/cbc:DocumentTypeCode'), 'IADE');
    assert.equal(text(d, '//cac:BillingReference/cac:InvoiceDocumentReference/cbc:ID'), 'EFT2026000000123');
  });

  it('EARSIVFATURA: TCKN alıcı (Person) ve e-Arşiv gönderim bilgisi', async () => {
    const model = f.baseInvoice({ profileId: 'EARSIVFATURA', id: 'EAR2026000000001', customer: f.customerPerson });
    const xml = buildInvoiceXml(model);
    await assertValid(xml, 'INVOICE');
    const d = dom(xml);
    assert.equal(text(d, '//cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID[@schemeID="TCKN"]'), '11111111111');
    assert.equal(text(d, '//cac:AccountingCustomerParty/cac:Party/cac:Person/cbc:FamilyName'), 'Gündoğdu');
  });

  it('negatif: kurallar geçersiz belge numarasını, IADE+TICARI ve eksik tevkifatı yakalar', async () => {
    const bad = buildInvoiceXml(f.baseInvoice({ id: 'EFT26-1' }));
    const r1 = await validate(bad, 'INVOICE');
    assert.equal(r1.valid, false);
    assert.ok(r1.errors.some((e) => e.rule === 'InvoiceIDCheck'), JSON.stringify(r1.errors));

    const iade = buildInvoiceXml(f.baseInvoice({ invoiceTypeCode: 'IADE', billingReferences: [{ id: 'EFT2026000000123', issueDate: '2026-11-01' }] }));
    assert.ok(validateRules(iade, 'INVOICE').some((e) => e.rule === 'InvoiceTypeCodeCheck'));

    const tev = buildInvoiceXml(f.baseInvoice({ invoiceTypeCode: 'TEVKIFAT' }));
    assert.ok(validateRules(tev, 'INVOICE').length > 0, 'TEVKIFAT tipinde tevkifat satırı zorunlu');

    const noUuid = buildInvoiceXml(f.baseInvoice({ uuid: 'abc' }));
    assert.equal((await validate(noUuid, 'INVOICE')).valid, false);
  });

  it('negatif: XSD bozuk XML ve zorunlu eleman eksikliğini yakalar', async () => {
    const xml = buildInvoiceXml(f.baseInvoice()).replace(/<cbc:IssueDate>[^<]+<\/cbc:IssueDate>/, '');
    const r = await validate(xml, 'INVOICE');
    assert.equal(r.xsdValid, false);
    const broken = await validate('<Invoice><a></Invoice>', 'INVOICE');
    assert.equal(broken.valid, false);
  });
});

describe('e-Belge UBL-TR irsaliye ve zarf XML', () => {
  it('TEMELIRSALIYE / SEVK: XSD (1.2.1) + kurallar geçer; plaka, şoför, teslim adresi', async () => {
    const xml = buildDespatchXml(f.baseDespatch());
    await assertValid(xml, 'DESPATCHADVICE');
    const d = dom(xml);
    assert.equal(text(d, '/desp:DespatchAdvice/cbc:CustomizationID'), 'TR1.2.1');
    assert.equal(text(d, '/desp:DespatchAdvice/cbc:DespatchAdviceTypeCode'), 'SEVK');
    assert.equal(text(d, '//cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID'), '34ABC123');
    assert.equal(text(d, '//cac:ShipmentStage/cac:DriverPerson/cbc:NationalityID'), '12345678950');
    assert.equal(text(d, '//cac:Delivery/cac:DeliveryAddress/cbc:PostalZone'), '06420');
    assert.equal(text(d, '/desp:DespatchAdvice/cbc:LineCountNumeric'), '2');
  });

  it('negatif: şoför/taşıyıcı ve posta kodu olmadan irsaliye reddedilir', async () => {
    const m = f.baseDespatch();
    m.shipment = { ...m.shipment, drivers: [], carrier: null, deliveryAddress: { ...m.shipment.deliveryAddress, postalZone: '1' } };
    const r = await validate(buildDespatchXml(m), 'DESPATCHADVICE');
    assert.equal(r.valid, false);
  });

  it('GİB zarfı (SENDERENVELOPE, PackageProxy_1_2.xsd) faturayı içerir', async () => {
    const xml = buildInvoiceXml(f.baseInvoice());
    const env = buildEnvelopeXml({
      elementType: 'INVOICE',
      documentXml: xml,
      sender: { alias: 'urn:mail:defaultgb@ktb.example.com.tr', name: 'KTB Metal', id: '1234567801' },
      receiver: { alias: 'urn:mail:defaultpk@ornekcelik.example.com.tr', name: 'Örnek Çelik', id: '9876543210' },
    });
    await assertValid(env.xml, 'ENVELOPE');
    const d = dom(env.xml);
    assert.equal(text(d, '//sh:DocumentIdentification/sh:Type'), 'SENDERENVELOPE');
    assert.equal(text(d, '//sh:DocumentIdentification/sh:InstanceIdentifier'), env.instanceId);
    assert.match(env.xml, /ElementType>INVOICE</);
    assert.ok(env.xml.includes('<cbc:UUID>3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f</cbc:UUID>'));
  });
});

describe('GİB resmi örnek dosyaları (UBL-TR paketi)', () => {
  const load = (n) => fs.readFileSync(path.join(FIX, n), 'utf8');
  it('tüm örnekler GİB XSD şemasından geçer', async () => {
    for (const [n, k] of [['TemelFaturaOrnegi.xml', 'INVOICE'], ['TEVKIFAT.xml', 'INVOICE'], ['ISTISNA-2.xml', 'INVOICE'],
      ['IadeFaturasiOrnegi.xml', 'INVOICE'], ['Irsaliye-Ornek1.xml', 'DESPATCHADVICE'], ['1_TEMEL_FATURA_ZARF.xml', 'ENVELOPE']]) {
      const r = await validate(load(n), k);
      assert.equal(r.xsdValid, true, `${n}: ${JSON.stringify(r.errors.slice(0, 3))}`);
    }
  });
  it('zarf örneği kurallardan da geçer; eski örneklerdeki güncel kural ihlalleri yakalanır', async () => {
    assert.equal((await validate(load('1_TEMEL_FATURA_ZARF.xml'), 'ENVELOPE')).valid, true);
    assert.ok(validateRules(load('TemelFaturaOrnegi.xml'), 'INVOICE').some((e) => e.rule === 'InvoiceIDCheck'));
    assert.ok(validateRules(load('IadeFaturasiOrnegi.xml'), 'INVOICE').some((e) => e.rule === 'IADEInvioceCheck'));
    assert.ok(validateRules(load('Irsaliye-Ornek1.xml'), 'DESPATCHADVICE').some((e) => e.rule === 'DespatchAddressCheck'));
  });
});

describe('e-Belge kod listeleri, eşleme ve yardımcılar', () => {
  it('GİB kod listesi yüklenir; birim/tevkifat/istisna kodları', () => {
    assert.ok(codes.has('InvoiceTypeCodeList', 'SATIS'));
    assert.ok(codes.has('WithholdingTaxType', '601'));
    assert.ok(codes.has('TaxExemptionReasonCodeType', '351'));
    assert.equal(codes.unitCode('ADET'), 'C62');
    assert.equal(codes.unitCode('KG'), 'KGM');
    assert.equal(codes.unitCode('SAAT'), 'HUR');
    assert.equal(codes.unitCode('TANIMSIZ-BIRIM'), null);
  });

  const src = (over = {}) => ({
    invoice: { id: 1, invoice_no: 'SF-1', invoice_type: 'Satis', invoice_date: '2026-11-27', currency_code: 'TL', mailbox_alias: 'urn:mail:defaultpk@x.com', company_id: 1, payable_amount: 0, ...over.invoice },
    lines: over.lines || [{ item_code: 'A', item_name: 'Ürün A', quantity: 2, unit_price: 50, vat_rate: 20, uom_code: 'ADET' }],
    partner: { partner_name: 'Alıcı A.Ş.', tax_id: '9876543210', tax_office: 'Çankaya', province: 'Ankara', district: 'Çankaya', postal_code: '06420', bill_address_1: 'Cad. 1', ...over.partner },
    company: { company_name: 'Satıcı A.Ş.', tax_id: '1234567801', tax_office: 'Büyük Mükellefler', ...over.company },
    settings: { invoice_prefix: 'EFT', archive_prefix: 'EAR', district: 'Başakşehir', city: 'İstanbul', postal_code: '34490', default_profile: 'TICARIFATURA', ...over.settings },
    sourceInvoice: over.sourceInvoice || null,
    registeredAliases: [],
  });
  const now = new Date('2026-11-27T09:00:00Z');

  it('mapper: etiketli alıcı → TICARIFATURA/SATIS, TL → TRY, İstanbul saati', async () => {
    const b = mapper.buildInvoiceModel(src(), { gibNumber: 'EFT2026000000009', uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f', now });
    assert.deepEqual(b.issues.filter((i) => i.level === 'error'), []);
    assert.equal(b.model.profileId, 'TICARIFATURA');
    assert.equal(b.model.invoiceTypeCode, 'SATIS');
    assert.equal(b.model.currency, 'TRY');
    assert.equal(b.model.issueTime, '12:00:00');
    assert.equal(b.meta.seriesKind, 'EFATURA');
    await assertValid(buildInvoiceXml(b.model), 'INVOICE');
  });

  it('mapper: etiketsiz alıcı → EARSIVFATURA; VKN yoksa nihai tüketici uyarısı', () => {
    const b = mapper.buildInvoiceModel(src({ invoice: { mailbox_alias: null }, partner: { tax_id: null, partner_name: 'Ali Veli' } }), { now });
    assert.equal(b.model.profileId, 'EARSIVFATURA');
    assert.equal(b.meta.seriesKind, 'EARSIV');
    assert.ok(b.issues.some((i) => i.code === 'ALICI_NIHAI_TUKETICI'));
  });

  it('mapper: tevkifat satırı → TEVKIFAT; %0 KDV → 351 istisna; iade → IADE + TEMELFATURA', async () => {
    const t = mapper.buildInvoiceModel(src({ lines: [{ item_name: 'Hizmet', quantity: 1, unit_price: 1000, vat_rate: 20, uom_code: 'ADET', withholding_code: '616', withholding_rate: '5/10' }] }), { gibNumber: 'EFT2026000000010', uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e51', now });
    assert.equal(t.model.invoiceTypeCode, 'TEVKIFAT');
    assert.equal(t.model.lines[0].withholding.percent, 50);
    await assertValid(buildInvoiceXml(t.model), 'INVOICE');

    const z = mapper.buildInvoiceModel(src({ lines: [{ item_name: 'Kitap', quantity: 1, unit_price: 100, vat_rate: 0, uom_code: 'ADET' }] }), { now });
    assert.equal(z.model.lines[0].exemptionCode, '351');

    const r = mapper.buildInvoiceModel(src({ invoice: { invoice_type: 'AlisIade' }, sourceInvoice: { gib_number: 'ABC2026000000077', invoice_date: '2026-11-01' } }), { gibNumber: 'EFT2026000000011', uuid: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e52', now });
    assert.equal(r.model.invoiceTypeCode, 'IADE');
    assert.equal(r.model.profileId, 'TEMELFATURA');
    assert.equal(r.model.billingReferences[0].id, 'ABC2026000000077');
    await assertValid(buildInvoiceXml(r.model), 'INVOICE');
  });

  it('mapper: gelen belge (Alis / SatisIade) ve eksik veriler engelleyici hata verir', () => {
    assert.ok(mapper.buildInvoiceModel(src({ invoice: { invoice_type: 'Alis' } }), { now }).issues.some((i) => i.code === 'GELEN_BELGE'));
    assert.ok(mapper.buildInvoiceModel(src({ invoice: { invoice_type: 'SatisIade' } }), { now }).issues.some((i) => i.code === 'GELEN_BELGE'));
    const e = mapper.buildInvoiceModel(src({ company: { tax_id: '' }, partner: { province: null }, invoice: { currency_code: 'USD', exchange_rate: null } }), { now });
    const errs = e.issues.filter((i) => i.level === 'error').map((i) => i.code);
    for (const c of ['SATICI_VKN', 'ALICI_ADRES', 'KUR']) assert.ok(errs.includes(c), `${c} bekleniyordu: ${errs}`);
    const iade = mapper.buildInvoiceModel(src({ invoice: { invoice_type: 'AlisIade' }, sourceInvoice: { invoice_no: 'AF-1' } }), { now });
    assert.ok(iade.issues.some((i) => i.code === 'IADE_REFERANS'));
  });

  it('GİB numara biçimi ve QR içeriği (GİB görüntü XSLT anahtarları)', () => {
    assert.equal(formatGibNumber('EFT', 2026, 42), 'EFT2026000000042');
    const m = f.baseInvoice();
    const qr = JSON.parse(invoiceQrText(m, computeInvoice(m)));
    assert.equal(qr.vkntckn || qr.VKNTCKN, '1234567801');
    assert.equal(qr.avkntckn, '9876543210');
    assert.equal(qr.no, 'EFT2026000000001');
    assert.equal(qr.ettn, undefined);
    assert.equal(qr.ETTN, m.uuid);
    assert.equal(qr.senaryo, 'TICARIFATURA');
    assert.ok(qr.odenecek);
    const dq = JSON.parse(despatchQrText(f.baseDespatch()));
    assert.equal(dq.plaka, '34ABC123');
    const mx = qrMatrix(invoiceQrText(m, computeInvoice(m)));
    assert.ok(mx.size >= 21 && typeof mx.isDark(0, 0) === 'boolean');
  });

  it('tutar yazıyla (Türkçe)', () => {
    assert.equal(tutarYazi(1234.5, 'TRY'), 'BinİkiYüzOtuzDörtTürkLirasıElliKuruş');
    assert.equal(tutarYazi(100, 'TRY'), 'YüzTürkLirası');
    assert.match(tutarYazi(12.05, 'USD'), /^OnİkiABDDoları|^Onİki/);
  });
});
