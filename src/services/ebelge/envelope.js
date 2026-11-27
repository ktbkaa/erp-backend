/**
 * GİB zarfı (StandardBusinessDocument + ef:Package), PackageProxy_1_2.xsd.
 * Doğrudan GİB entegrasyonu ve zarf isteyen entegratörler için; e-Arşiv için zarf kullanılmaz.
 */
const crypto = require('crypto');
const { el, toXml } = require('./xml');

const SH = 'http://www.unece.org/cefact/namespaces/StandardBusinessDocumentHeader';
const EF = 'http://www.efatura.gov.tr/package-namespace';

function stripDeclaration(xml) {
  return String(xml).replace(/^\s*<\?xml[^>]*\?>\s*/, '');
}

function contactInfo(p) {
  return [
    el('sh:ContactInformation', [el('sh:Contact', p.name), el('sh:ContactTypeIdentifier', 'UNVAN')]),
    el('sh:ContactInformation', [el('sh:Contact', p.id), el('sh:ContactTypeIdentifier', 'VKN_TCKN')]),
  ];
}

function isoLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * @param {{elementType:'INVOICE'|'DESPATCHADVICE', documentXml:string, sender:{alias,name,id}, receiver:{alias,name,id},
 *          instanceId?:string, createdAt?:Date}} p
 */
function buildEnvelopeXml(p) {
  const instanceId = p.instanceId || crypto.randomUUID();
  const marker = `__KTB_ELEMENT_${instanceId}__`;
  const root = el('sh:StandardBusinessDocument', {
    'xmlns:sh': SH,
    'xmlns:ef': EF,
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation': `${SH} PackageProxy_1_2.xsd`,
  }, [
    el('sh:StandardBusinessDocumentHeader', [
      el('sh:HeaderVersion', '1.0'),
      el('sh:Sender', [el('sh:Identifier', p.sender.alias), ...contactInfo(p.sender)]),
      el('sh:Receiver', [el('sh:Identifier', p.receiver.alias), ...contactInfo(p.receiver)]),
      el('sh:DocumentIdentification', [
        { n: 'sh:Standard', a: null, c: '', keep: true },
        el('sh:TypeVersion', '1.2'),
        el('sh:InstanceIdentifier', instanceId),
        el('sh:Type', 'SENDERENVELOPE'),
        el('sh:CreationDateAndTime', isoLocal(p.createdAt || new Date())),
      ]),
    ]),
    el('ef:Package', [
      el('Elements', [
        el('ElementType', p.elementType),
        el('ElementCount', '1'),
        el('ElementList', marker),
      ]),
    ]),
  ]);
  const xml = toXml(root).replace(marker, `\n${stripDeclaration(p.documentXml).trim()}\n`);
  return { xml, instanceId };
}

module.exports = { buildEnvelopeXml };
