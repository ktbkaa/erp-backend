/**
 * UBL-TR doğrulama:
 *  1) XSD — GİB UBL-TR 1.2.1 paketi (schemas/ubl-tr/xsdrt), libxml2 (xmllint-wasm) ile.
 *  2) Kurallar — GİB schematron'undaki (UBL-TR_Main/Common_Schematron.xml) ERP'nin ürettiği
 *     senaryoları kapsayan kontrollerin XPath 1.0 karşılığı (+ KTB-* tutar tutarlılığı).
 * Not: XAdES imza kuralları (XadesSignatureCheck vb.) imzayı atan entegratör/GİB tarafında koşar.
 */
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const xpath = require('xpath');
const codes = require('./codeLists');
const { round } = require('./amounts');

const XSD_ROOT = path.join(__dirname, '../../../schemas/ubl-tr/xsdrt');

const SELECT = xpath.useNamespaces({
  inv: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  desp: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  sh: 'http://www.unece.org/cefact/namespaces/StandardBusinessDocumentHeader',
  ef: 'http://www.efatura.gov.tr/package-namespace',
});

const MAIN_XSD = Object.freeze({
  INVOICE: 'xsdrt/maindoc/UBL-Invoice-2.1.xsd',
  DESPATCHADVICE: 'xsdrt/maindoc/UBL-DespatchAdvice-2.1.xsd',
  ENVELOPE: 'xsdrt/envelope/PackageProxy_1_2.xsd',
});

let schemaFiles = null;
function loadSchemaFiles() {
  if (schemaFiles) return schemaFiles;
  const out = [];
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.xsd')) {
        out.push({ fileName: `xsdrt/${path.relative(XSD_ROOT, p).split(path.sep).join('/')}`, contents: fs.readFileSync(p, 'utf8') });
      }
    }
  };
  walk(XSD_ROOT);
  // Package_1_2.xsd ana belge şemalarını kendi klasöründen import eder.
  for (const f of out.filter((x) => x.fileName.startsWith('xsdrt/maindoc/'))) {
    out.push({ fileName: f.fileName.replace('xsdrt/maindoc/', 'xsdrt/envelope/'), contents: f.contents });
  }
  schemaFiles = out;
  return out;
}

let xmllintModule = null;
async function xmllint() {
  if (!xmllintModule) xmllintModule = require('xmllint-wasm');
  return xmllintModule;
}

/** @returns {Promise<{valid:boolean, errors:{rule:string,message:string,line?:number}[]}>} */
async function validateXsd(xml, kind) {
  const main = MAIN_XSD[kind];
  if (!main) throw new Error(`Bilinmeyen XSD türü: ${kind}`);
  const files = loadSchemaFiles();
  const schema = files.find((f) => f.fileName === main);
  const { validateXML } = await xmllint();
  const r = await validateXML({
    xml: [{ fileName: 'belge.xml', contents: xml }],
    schema,
    preload: files.filter((f) => f !== schema),
  });
  return {
    valid: Boolean(r.valid),
    errors: (r.errors || []).map((e) => ({
      rule: 'XSD',
      message: e.message || e.rawMessage || String(e),
      line: e.loc && e.loc.lineNumber,
    })),
  };
}

function txt(node, expr) {
  const v = SELECT(`string(${expr})`, node);
  return String(v || '').trim();
}
function nodes(node, expr) {
  return SELECT(expr, node);
}
function num(node, expr) {
  const v = txt(node, expr);
  return v === '' ? null : Number(v);
}

const ID_RE = /^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$/;
const UUID_RE = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
const POSTAL_RE = /^((0[1-9])|([1-7][0-9])|(8[0-1]))[0-9]{3}$/;
const PLATE_RE = /^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$/;

function checkParty(err, party, label, { requireAddress = true } = {}) {
  if (!party) {
    err('PartyCheck', `${label} bulunamadı.`);
    return;
  }
  const vkn = nodes(party, "cac:PartyIdentification/cbc:ID[@schemeID='VKN']");
  const tckn = nodes(party, "cac:PartyIdentification/cbc:ID[@schemeID='TCKN']");
  if (vkn.length + tckn.length !== 1) {
    err('PartyIdentificationPartyNamePersonCheck', `${label}: schemeID 'VKN' veya 'TCKN' olan tam bir cbc:ID bulunmalıdır.`);
  }
  for (const v of vkn) {
    const s = String(v.textContent || '').trim();
    if (!/^\d{10}$/.test(s)) err('PartyIdentificationTCKNVKNCheck', `${label}: VKN 10 haneli olmalıdır (${s || 'boş'}).`);
  }
  for (const v of tckn) {
    const s = String(v.textContent || '').trim();
    if (!/^\d{11}$/.test(s)) err('PartyIdentificationTCKNVKNCheck', `${label}: TCKN 11 haneli olmalıdır (${s || 'boş'}).`);
  }
  if (vkn.length && !txt(party, 'cac:PartyName/cbc:Name')) {
    err('PartyIdentificationPartyNamePersonCheck', `${label}: VKN için cac:PartyName/cbc:Name dolu olmalıdır.`);
  }
  if (tckn.length && (!txt(party, 'cac:Person/cbc:FirstName') || !txt(party, 'cac:Person/cbc:FamilyName'))) {
    err('PartyIdentificationPartyNamePersonCheck', `${label}: TCKN için cac:Person/cbc:FirstName ve cbc:FamilyName dolu olmalıdır.`);
  }
  if (requireAddress) {
    if (!txt(party, 'cac:PostalAddress/cbc:CitySubdivisionName')) err('AddressCheck', `${label}: adres ilçe (CitySubdivisionName) boş.`);
    if (!txt(party, 'cac:PostalAddress/cbc:CityName')) err('AddressCheck', `${label}: adres il (CityName) boş.`);
    if (!txt(party, 'cac:PostalAddress/cac:Country/cbc:Name')) err('AddressCheck', `${label}: adres ülke adı boş.`);
  }
}

function checkSignature(err, doc, rootPrefix) {
  const sigs = nodes(doc, `/${rootPrefix}/cac:Signature`);
  if (!sigs.length) {
    err('SignatureCountCheck', 'cac:Signature elemanı bulunmalıdır.');
    return;
  }
  for (const s of sigs) {
    if (txt(s, 'cbc:ID/@schemeID') !== 'VKN_TCKN') err('SignatureCheck', "cac:Signature/cbc:ID schemeID 'VKN_TCKN' olmalıdır.");
    const id = txt(s, 'cbc:ID');
    if (!(id.length === 10 || id.length === 11)) err('SignatureCheck', 'cac:Signature/cbc:ID 10 (VKN) veya 11 (TCKN) karakter olmalıdır.');
    const uri = txt(s, 'cac:DigitalSignatureAttachment/cac:ExternalReference/cbc:URI');
    if (!nodes(s, 'cac:DigitalSignatureAttachment/cac:ExternalReference').length) {
      err('SignatureCheck', 'cac:DigitalSignatureAttachment/cac:ExternalReference bulunmalıdır.');
    } else if (uri && uri[0] !== '#') err('SignatureCheck', 'cbc:URI # ile başlamalıdır.');
  }
}

function checkCommonCodes(err, doc) {
  for (const a of nodes(doc, '//@currencyID')) {
    if (!codes.has('CurrencyCodeList', a.value)) err('GeneralCurrencyIDCheck', `Geçersiz currencyID: ${a.value}`);
  }
  for (const a of nodes(doc, '//@unitCode')) {
    if (!codes.has('UnitCodeList', a.value)) err('GeneralUnitCodeCheck', `Geçersiz unitCode: ${a.value}`);
  }
  for (const n of nodes(doc, '//cbc:IssueDate')) {
    if (!DATE_RE.test(String(n.textContent).trim())) err('TimeCheck', `Geçersiz tarih: ${n.textContent}`);
  }
  for (const n of nodes(doc, '//cac:Country/cbc:IdentificationCode')) {
    if (!codes.has('CountryCodeList', String(n.textContent).trim())) err('CountryCodeCheck', `Geçersiz ülke kodu: ${n.textContent}`);
  }
}

function validateInvoiceRules(doc) {
  const errors = [];
  const err = (rule, message) => errors.push({ rule, message });
  const inv = nodes(doc, '/inv:Invoice')[0];
  if (!inv) return [{ rule: 'namespaceCheck', message: 'Kök eleman UBL Invoice-2 olmalıdır.' }];

  if (txt(inv, 'cbc:UBLVersionID') !== '2.1') err('UBLVersionIDCheck', 'cbc:UBLVersionID 2.1 olmalıdır.');
  if (!['TR1.2', 'TR1.2.1'].includes(txt(inv, 'cbc:CustomizationID'))) err('CustomizationIDCheck', 'cbc:CustomizationID TR1.2 veya TR1.2.1 olmalıdır.');
  const profile = txt(inv, 'cbc:ProfileID');
  if (!codes.has('ProfileIDType', profile) && !codes.has('ProfileIDTypeEarchive', profile)) {
    err('ProfileIDCheck', `Geçersiz cbc:ProfileID: ${profile}`);
  }
  const id = txt(inv, 'cbc:ID');
  if (!ID_RE.test(id)) err('InvoiceIDCheck', `cbc:ID 'ABC2009123456789' formatında olmalıdır (${id || 'boş'}).`);
  if (!UUID_RE.test(txt(inv, 'cbc:UUID'))) err('UUIDCheck', 'cbc:UUID UUID formatında olmalıdır.');
  if (!['true', 'false'].includes(txt(inv, 'cbc:CopyIndicator'))) err('CopyIndicatorCheck', 'cbc:CopyIndicator true/false olmalıdır.');

  const type = txt(inv, 'cbc:InvoiceTypeCode');
  if (!codes.has('InvoiceTypeCodeList', type)) err('InvoiceTypeCodeCheck', `Geçersiz cbc:InvoiceTypeCode: ${type}`);
  if (type === 'IADE' && !['TEMELFATURA', 'EARSIVFATURA', 'ILAC_TIBBICIHAZ', 'YATIRIMTESVIK', 'IDIS', 'KAMU'].includes(profile)) {
    err('InvoiceTypeCodeCheck', 'Fatura tipi IADE iken profil TEMELFATURA, EARSIVFATURA, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS veya KAMU olabilir.');
  }

  const cur = txt(inv, 'cbc:DocumentCurrencyCode');
  if (!codes.has('CurrencyCodeList', cur)) err('CurrencyCodeCheck', `Geçersiz cbc:DocumentCurrencyCode: ${cur}`);
  if (cur && cur !== 'TRY') {
    const rate = txt(inv, 'cac:PricingExchangeRate/cbc:CalculationRate');
    if (!rate) err('CurrencyCodeCheck', 'TRY dışı para biriminde cac:PricingExchangeRate/cbc:CalculationRate zorunludur.');
    else if (!/^\s*[0-9]{1,17}(\.[0-9]{1,6})?\s*$/.test(rate)) err('CurrencyCodeCheck', 'CalculationRate en fazla 6 ondalık hane olmalıdır.');
  }
  for (const a of nodes(inv, '//@currencyID')) {
    if (a.value !== cur) err('GeneralCurrencyIDCheck', `currencyID (${a.value}) belge para birimi (${cur}) ile aynı olmalıdır.`);
  }

  const lines = nodes(inv, 'cac:InvoiceLine');
  if (Number(txt(inv, 'cbc:LineCountNumeric')) !== lines.length) {
    err('LineCountCheck', 'cbc:LineCountNumeric fatura satır sayısına eşit olmalıdır.');
  }
  checkSignature(err, doc, 'inv:Invoice');
  checkParty(err, nodes(inv, 'cac:AccountingSupplierParty/cac:Party')[0], 'Satıcı (AccountingSupplierParty)');
  checkParty(err, nodes(inv, 'cac:AccountingCustomerParty/cac:Party')[0], 'Alıcı (AccountingCustomerParty)');
  if (profile === 'IHRACAT' && !txt(inv, 'cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name')) {
    err('PartyVDCheck', 'IHRACAT profilinde satıcı vergi dairesi zorunludur.');
  }

  for (const n of nodes(inv, '//cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode')) {
    if (!codes.has('TaxType', String(n.textContent).trim())) err('TaxTypeCheck', `Geçersiz vergi kodu: ${n.textContent}`);
  }

  const wht = nodes(inv, 'cac:WithholdingTaxTotal').length > 0 || nodes(inv, 'cac:InvoiceLine/cac:WithholdingTaxTotal').length > 0;
  if (wht && !['TEVKIFAT', 'YTBTEVKIFAT', 'IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE', 'SGK', 'SARJ', 'SARJANLIK'].includes(type)) {
    err('GeneralWithholdingTaxTotalCheck', 'cac:WithholdingTaxTotal varken fatura tipi TEVKIFAT, TEVKIFATIADE, IADE, SGK, SARJ veya SARJANLIK olmalıdır.');
  }
  if (['TEVKIFAT', 'TEVKIFATIADE'].includes(type) && !wht) {
    err('WithholdingTaxTotalCheck', `${type} tipinde cac:WithholdingTaxTotal bulunmalıdır.`);
  }
  for (const s of nodes(inv, '//cac:WithholdingTaxTotal/cac:TaxSubtotal')) {
    const c = txt(s, 'cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode');
    const p = txt(s, 'cbc:Percent');
    if (!c || !p) err('WithholdingTaxTotalCheck', 'Tevkifat alt toplamında TaxTypeCode ve Percent dolu olmalıdır.');
    else if (!codes.has('WithholdingTaxType', c)) err('WithholdingTaxTotalCheck', `Geçersiz tevkifat kodu: ${c}`);
    else if (!codes.has('WithholdingTaxTypeWithPercent', `${c}${Number(p)}`)) {
      err('WithholdingTaxTotalCheck', `Tevkifat kodu ${c} için oran %${p} olamaz (geçerli: ${codes.withholdingPercents(c).join(', ')}).`);
    }
  }

  const exemptAllowedForZero = ['IADE', 'YTBIADE', 'IHRACKAYITLI', 'OZELMATRAH', 'SGK', 'KONAKLAMAVERGISI'];
  for (const s of nodes(inv, 'cac:TaxTotal/cac:TaxSubtotal')) {
    const code = txt(s, 'cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode');
    if (code === '0015' && Number(txt(s, 'cbc:TaxAmount')) === 0 && !exemptAllowedForZero.includes(type)
      && !txt(s, 'cac:TaxCategory/cbc:TaxExemptionReason')) {
      err('TaxExemptionReasonCheck', '0 tutarlı KDV (0015) için cbc:TaxExemptionReason bulunmalıdır.');
    }
    const cat = nodes(s, 'cac:TaxCategory')[0];
    if (!cat) continue;
    const exCode = txt(cat, 'cbc:TaxExemptionReasonCode');
    const exReason = txt(cat, 'cbc:TaxExemptionReason');
    if (nodes(cat, 'cbc:TaxExemptionReason').length && !exReason) {
      err('TaxExemptionReasonCodeCheck', 'cbc:TaxExemptionReason boş olmamalıdır.');
    }
    if (exReason || exCode) {
      if (!codes.has('TaxExemptionReasonCodeType', exCode)
        && !(codes.has('YatirimTesvikTaxExemptionReasonCodeType', exCode) && profile === 'YATIRIMTESVIK')) {
        err('TaxExemptionReasonCodeCheck', `Geçersiz istisna/muafiyet kodu: ${exCode || 'boş'}`);
      }
      if (exCode !== '555' && codes.has('istisnaTaxExemptionReasonCodeType', exCode)
        && !['ISTISNA', 'IADE', 'IHRACKAYITLI', 'SGK', 'YTBISTISNA', 'YTBIADE'].includes(type)) {
        err('TaxExemptionReasonCodeCheck', `İstisna kodu ${exCode} için fatura tipi ISTISNA, IADE, IHRACKAYITLI, SGK, YTBIADE veya YTBISTISNA olabilir.`);
      }
      if (codes.has('ozelMatrahTaxExemptionReasonCodeType', exCode) && !['OZELMATRAH', 'IADE', 'SGK'].includes(type)) {
        err('TaxExemptionReasonCodeCheck', `Özel matrah kodu ${exCode} için fatura tipi OZELMATRAH, IADE veya SGK olabilir.`);
      }
      if (codes.has('ihracExemptionReasonCodeType', exCode) && !['IHRACKAYITLI', 'IADE', 'SGK'].includes(type)) {
        err('TaxExemptionReasonCodeCheck', `İhraç kayıtlı kodu ${exCode} için fatura tipi IHRACKAYITLI, IADE veya SGK olabilir.`);
      }
    }
  }

  if (['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'].includes(type)) {
    const refs = nodes(inv, 'cac:BillingReference/cac:InvoiceDocumentReference');
    const ok = refs.filter((r) => ['IADE', 'İADE'].includes(txt(r, 'cbc:DocumentTypeCode')) && txt(r, 'cbc:ID').length === 16);
    if (!refs.length || ok.length !== refs.length) {
      err('IADEInvioceCheck', 'İade faturasında DocumentTypeCode=IADE ve 16 haneli ID içeren BillingReference/InvoiceDocumentReference zorunludur.');
    }
  }

  for (const [i, l] of lines.entries()) {
    if (!txt(l, 'cac:Item/cbc:Name')) err('ItemNameCheck', `Satır ${i + 1}: cac:Item/cbc:Name boş.`);
    if (!txt(l, 'cbc:InvoicedQuantity')) err('InvoicedQuantityCheck', `Satır ${i + 1}: miktar boş.`);
    if (!txt(l, 'cac:Price/cbc:PriceAmount')) err('PriceAmountCheck', `Satır ${i + 1}: birim fiyat boş.`);
  }

  // KTB: tutar tutarlılığı (entegratörlerin reddettiği hesap hataları)
  const sumLines = round(lines.reduce((s, l) => s + Number(txt(l, 'cbc:LineExtensionAmount') || 0), 0), 2);
  const lmt = nodes(inv, 'cac:LegalMonetaryTotal')[0];
  if (lmt) {
    const lineExt = num(lmt, 'cbc:LineExtensionAmount');
    const taxExcl = num(lmt, 'cbc:TaxExclusiveAmount');
    const taxIncl = num(lmt, 'cbc:TaxInclusiveAmount');
    const payable = num(lmt, 'cbc:PayableAmount');
    const taxTotal = nodes(inv, 'cac:TaxTotal').reduce((s, t) => s + Number(txt(t, 'cbc:TaxAmount') || 0), 0);
    const whtTotal = nodes(inv, 'cac:WithholdingTaxTotal').reduce((s, t) => s + Number(txt(t, 'cbc:TaxAmount') || 0), 0);
    const near = (a, b) => Math.abs(round(a, 2) - round(b, 2)) <= 0.011;
    if (!near(lineExt, sumLines)) err('KTB-TOPLAM-01', `LineExtensionAmount (${lineExt}) satır toplamına (${sumLines}) eşit değil.`);
    if (!near(taxIncl, taxExcl + taxTotal)) err('KTB-TOPLAM-02', 'TaxInclusiveAmount = TaxExclusiveAmount + vergi toplamı olmalıdır.');
    if (!near(payable, taxIncl - whtTotal)) err('KTB-TOPLAM-03', 'PayableAmount = TaxInclusiveAmount - tevkifat toplamı olmalıdır.');
  }

  checkCommonCodes(err, doc);
  return errors;
}

function validateDespatchRules(doc) {
  const errors = [];
  const err = (rule, message) => errors.push({ rule, message });
  const d = nodes(doc, '/desp:DespatchAdvice')[0];
  if (!d) return [{ rule: 'namespaceCheck', message: 'Kök eleman UBL DespatchAdvice-2 olmalıdır.' }];

  if (txt(d, 'cbc:UBLVersionID') !== '2.1') err('UBLVersionIDCheck', 'cbc:UBLVersionID 2.1 olmalıdır.');
  if (!['TR1.2', 'TR1.2.1'].includes(txt(d, 'cbc:CustomizationID'))) err('CustomizationIDCheck', 'cbc:CustomizationID TR1.2 veya TR1.2.1 olmalıdır.');
  const profile = txt(d, 'cbc:ProfileID');
  if (!codes.has('ProfileIDTypeDespatchAdvice', profile)) err('ProfileIDTypeDespatchAdvice', `Geçersiz irsaliye profili: ${profile}`);
  const id = txt(d, 'cbc:ID');
  if (!ID_RE.test(id)) err('InvoiceIDCheck', `cbc:ID 'ABC2009123456789' formatında olmalıdır (${id || 'boş'}).`);
  if (!UUID_RE.test(txt(d, 'cbc:UUID'))) err('UUIDCheck', 'cbc:UUID UUID formatında olmalıdır.');
  const type = txt(d, 'cbc:DespatchAdviceTypeCode');
  if (!codes.has('DespatchAdviceTypeCodeList', type)) err('DespatchAdviceTypeCodeCheck', `Geçersiz irsaliye tipi: ${type}`);
  if (type === 'MATBUDAN' && !nodes(d, "cac:AdditionalDocumentReference[normalize-space(cbc:ID)!='' and normalize-space(cbc:IssueDate)!='']").length) {
    err('DespatchAdviceTypeCodeCheck', 'MATBUDAN tipinde matbu belge bilgisi (AdditionalDocumentReference ID+IssueDate) zorunludur.');
  }

  const despDate = txt(d, 'cac:Shipment/cac:Delivery/cac:Despatch/cbc:ActualDespatchDate');
  if (!despDate) err('DespatchDateCheck', 'cac:Shipment/cac:Delivery/cac:Despatch/cbc:ActualDespatchDate zorunludur.');
  else if (!DATE_RE.test(despDate)) err('DespatchDateCheck', 'ActualDespatchDate YYYY-MM-DD olmalıdır.');
  if (!txt(d, 'cac:Shipment/cac:Delivery/cac:Despatch/cbc:ActualDespatchTime')) err('DespatchTimeCheck', 'ActualDespatchTime zorunludur.');

  const addr = 'cac:Shipment/cac:Delivery/cac:DeliveryAddress';
  if (!txt(d, `${addr}/cbc:CitySubdivisionName`)) err('DespatchAddressCheck', 'Teslim adresi ilçe (CitySubdivisionName) zorunludur.');
  if (!txt(d, `${addr}/cbc:CityName`)) err('DespatchAddressCheck', 'Teslim adresi il (CityName) zorunludur.');
  if (!txt(d, `${addr}/cac:Country/cbc:Name`)) err('DespatchAddressCheck', 'Teslim adresi ülke adı zorunludur.');
  if (!POSTAL_RE.test(txt(d, `${addr}/cbc:PostalZone`))) err('DespatchAddressCheck', 'Teslim adresi posta kodu geçerli 5 haneli TR posta kodu olmalıdır.');

  const drivers = nodes(d, 'cac:Shipment/cac:ShipmentStage/cac:DriverPerson');
  const carriers = nodes(d, 'cac:Shipment/cac:Delivery/cac:CarrierParty');
  if (!drivers.length && !carriers.length) err('DespatchCarrierDriverCheck', 'Şoför (DriverPerson) veya taşıyıcı (CarrierParty) bilgisinden en az biri zorunludur.');
  for (const p of drivers) {
    if (!txt(p, 'cbc:FirstName')) err('DespatchCarrierDriverCheck', 'Şoför adı boş.');
    if (!txt(p, 'cbc:FamilyName')) err('DespatchCarrierDriverCheck', 'Şoför soyadı boş.');
    if (!txt(p, 'cbc:NationalityID')) err('DespatchCarrierDriverCheck', 'Şoför TCKN (NationalityID) boş.');
  }
  for (const c of carriers) checkParty(err, c, 'Taşıyıcı (CarrierParty)', { requireAddress: false });
  for (const p of nodes(d, 'cac:Shipment/cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID')) {
    const scheme = p.getAttribute('schemeID');
    const v = String(p.textContent || '').trim();
    if (!codes.has('LicensePlateIDSchemeIDType', scheme)) err('LicensePlateIDSchemeIDCheck', `Geçersiz plaka schemeID: ${scheme}`);
    else if (['PLAKA', 'DORSE', 'DORSEPLAKA'].includes(scheme) && !PLATE_RE.test(v)) {
      err('LicensePlateIDSchemeIDCheck', `Plaka '34ABC123' biçiminde (boşluksuz, büyük harf) olmalıdır: ${v}`);
    }
  }

  checkSignature(err, doc, 'desp:DespatchAdvice');
  checkParty(err, nodes(d, 'cac:DespatchSupplierParty/cac:Party')[0], 'Gönderici (DespatchSupplierParty)');
  checkParty(err, nodes(d, 'cac:DeliveryCustomerParty/cac:Party')[0], 'Alıcı (DeliveryCustomerParty)');

  const lines = nodes(d, 'cac:DespatchLine');
  if (!lines.length) err('DespatchLineCheck', 'En az bir cac:DespatchLine olmalıdır.');
  const lc = txt(d, 'cbc:LineCountNumeric');
  if (lc && Number(lc) !== lines.length) err('LineCountCheck', 'cbc:LineCountNumeric satır sayısına eşit olmalıdır.');
  for (const [i, l] of lines.entries()) {
    const lid = txt(l, 'cbc:ID');
    if (!lid || Number.isNaN(Number(lid))) err('DespatchLineIdCheck', `Satır ${i + 1}: cbc:ID sayı olmalıdır.`);
    if (!txt(l, 'cbc:DeliveredQuantity')) err('DeliveredQuantityCheck', `Satır ${i + 1}: DeliveredQuantity boş.`);
    if (!txt(l, 'cbc:DeliveredQuantity/@unitCode')) err('DeliveredQuantityCheck', `Satır ${i + 1}: unitCode boş.`);
    if (!txt(l, 'cac:Item/cbc:Name')) err('ItemNameCheck', `Satır ${i + 1}: cac:Item/cbc:Name boş.`);
  }

  checkCommonCodes(err, doc);
  return errors;
}

function validateEnvelopeRules(doc) {
  const errors = [];
  const err = (rule, message) => errors.push({ rule, message });
  const sbd = nodes(doc, '/sh:StandardBusinessDocument')[0];
  if (!sbd) return [{ rule: 'namespaceCheck', message: 'Kök eleman sh:StandardBusinessDocument olmalıdır.' }];
  const h = 'sh:StandardBusinessDocumentHeader';
  if (txt(sbd, `${h}/sh:HeaderVersion`) !== '1.0') err('HeaderCheck', 'HeaderVersion 1.0 olmalıdır.');
  for (const side of ['Sender', 'Receiver']) {
    const ident = txt(sbd, `${h}/sh:${side}/sh:Identifier`);
    if (!/^urn:mail:[^@\s]+@[^@\s]+$/.test(ident)) err(`Document${side}Check`, `${side} Identifier 'urn:mail:etiket@alan' biçiminde olmalıdır.`);
    for (const ci of nodes(sbd, `${h}/sh:${side}/sh:ContactInformation`)) {
      if (!codes.has('ContactTypeIdentifierType', txt(ci, 'sh:ContactTypeIdentifier'))) {
        err('ContactInformationCheck', `${side} ContactTypeIdentifier UNVAN veya VKN_TCKN olmalıdır.`);
      }
    }
  }
  const di = `${h}/sh:DocumentIdentification`;
  if (!UUID_RE.test(txt(sbd, `${di}/sh:InstanceIdentifier`))) err('UUIDCheck', 'Zarf InstanceIdentifier UUID olmalıdır.');
  const envType = txt(sbd, `${di}/sh:Type`);
  if (!codes.has('EnvelopeType', envType)) err('EnvelopeTypeCheck', `Geçersiz zarf tipi: ${envType}`);
  for (const e of nodes(sbd, 'ef:Package/Elements')) {
    const et = txt(e, 'ElementType');
    if (!codes.has('ElementType', et)) err('ElementTypeCheck', `Geçersiz ElementType: ${et}`);
    const count = Number(txt(e, 'ElementCount'));
    const actual = nodes(e, 'ElementList/*').length;
    if (count !== actual) err('ElementCountCheck', `ElementCount (${count}) ile ElementList (${actual}) uyuşmuyor.`);
  }
  return errors;
}

function parse(xml) {
  const parseErrors = [];
  let doc = null;
  try {
    doc = new DOMParser({
      onError: (level, msg) => {
        if (level !== 'warning') parseErrors.push({ rule: 'XML', message: String(msg) });
      },
    }).parseFromString(xml, 'text/xml');
  } catch (e) {
    if (!parseErrors.length) parseErrors.push({ rule: 'XML', message: e.message });
  }
  return { doc, parseErrors };
}

function validateRules(xml, kind) {
  const { doc, parseErrors } = parse(xml);
  if (parseErrors.length) return parseErrors;
  if (kind === 'INVOICE') return validateInvoiceRules(doc);
  if (kind === 'DESPATCHADVICE') return validateDespatchRules(doc);
  if (kind === 'ENVELOPE') return validateEnvelopeRules(doc);
  throw new Error(`Bilinmeyen kural kümesi: ${kind}`);
}

/** XSD + kurallar. */
async function validate(xml, kind) {
  const xsd = await validateXsd(xml, kind);
  const rules = validateRules(xml, kind);
  const errors = [...xsd.errors, ...rules];
  return { valid: errors.length === 0, xsdValid: xsd.valid, errors };
}

module.exports = { validate, validateXsd, validateRules, MAIN_XSD, ID_RE, UUID_RE, POSTAL_RE };
