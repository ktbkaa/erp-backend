/**
 * UBL-TR 1.2.1 DespatchAdvice (e-İrsaliye) üretimi.
 */
const { el, keep, toXml } = require('./xml');
const { qty, amt } = require('./amounts');
const { NS, partyNode, addressNode, signatureNode, extensionsNode } = require('./ublInvoice');

function buildDespatchDocument(model) {
  const lines = model.lines || [];
  const s = model.shipment || {};
  const cur = model.currency || 'TRY';
  return el('DespatchAdvice', {
    xmlns: NS.despatch,
    'xmlns:cac': NS.cac,
    'xmlns:cbc': NS.cbc,
    'xmlns:ext': NS.ext,
    'xmlns:xsi': NS.xsi,
    'xsi:schemaLocation': `${NS.despatch} UBL-DespatchAdvice-2.1.xsd`,
  }, [
    extensionsNode(model.signatureXmlNode),
    el('cbc:UBLVersionID', '2.1'),
    el('cbc:CustomizationID', 'TR1.2.1'),
    el('cbc:ProfileID', model.profileId || 'TEMELIRSALIYE'),
    el('cbc:ID', model.id),
    el('cbc:CopyIndicator', 'false'),
    el('cbc:UUID', model.uuid),
    el('cbc:IssueDate', model.issueDate),
    el('cbc:IssueTime', model.issueTime),
    el('cbc:DespatchAdviceTypeCode', model.despatchTypeCode || 'SEVK'),
    ...(model.notes || []).filter(Boolean).map((n) => el('cbc:Note', n)),
    el('cbc:LineCountNumeric', String(lines.length)),
    model.orderReference && model.orderReference.id
      ? el('cac:OrderReference', [el('cbc:ID', model.orderReference.id), el('cbc:IssueDate', model.orderReference.issueDate)])
      : null,
    ...(model.additionalReferences || []).map((d) => el('cac:AdditionalDocumentReference', [
      el('cbc:ID', d.id),
      el('cbc:IssueDate', d.issueDate),
      el('cbc:DocumentTypeCode', d.typeCode),
      el('cbc:DocumentType', d.type),
    ])),
    signatureNode(model.supplier),
    el('cac:DespatchSupplierParty', [partyNode(model.supplier)]),
    el('cac:DeliveryCustomerParty', [partyNode(model.customer)]),
    keep(el('cac:Shipment', [
      keep(el('cbc:ID', s.id || '')),
      s.goodsValue != null
        ? el('cac:GoodsItem', [el('cbc:ValueAmount', { currencyID: cur }, amt(s.goodsValue))])
        : null,
      (s.vehiclePlate || (s.drivers && s.drivers.length))
        ? el('cac:ShipmentStage', [
          s.vehiclePlate
            ? el('cac:TransportMeans', [el('cac:RoadTransport', [el('cbc:LicensePlateID', { schemeID: s.vehiclePlateScheme || 'PLAKA' }, s.vehiclePlate)])])
            : null,
          ...(s.drivers || []).map((d) => el('cac:DriverPerson', [
            el('cbc:FirstName', d.firstName),
            el('cbc:FamilyName', d.familyName),
            el('cbc:Title', d.title || 'Şoför'),
            el('cbc:NationalityID', d.nationalId),
          ])),
        ])
        : null,
      keep(el('cac:Delivery', [
        addressNode('cac:DeliveryAddress', s.deliveryAddress),
        s.carrier ? el('cac:CarrierParty', [
          el('cac:PartyIdentification', [el('cbc:ID', { schemeID: s.carrier.idScheme }, s.carrier.id)]),
          el('cac:PartyName', [el('cbc:Name', s.carrier.name)]),
          addressNode('cac:PostalAddress', s.carrier.address || s.deliveryAddress),
        ]) : null,
        keep(el('cac:Despatch', [
          el('cbc:ActualDespatchDate', s.despatchDate),
          el('cbc:ActualDespatchTime', s.despatchTime),
        ])),
      ])),
      s.trailerPlate
        ? el('cac:TransportHandlingUnit', [el('cac:TransportEquipment', [el('cbc:ID', { schemeID: 'DORSEPLAKA' }, s.trailerPlate)])])
        : null,
    ])),
    ...lines.map((l, i) => el('cac:DespatchLine', [
      el('cbc:ID', String(l.id != null ? l.id : i + 1)),
      el('cbc:Note', l.note),
      el('cbc:DeliveredQuantity', { unitCode: l.unitCode }, qty(l.quantity)),
      el('cac:OrderLineReference', [el('cbc:LineID', String(l.orderLineId || l.id || i + 1))]),
      el('cac:Item', [
        el('cbc:Description', l.description),
        el('cbc:Name', l.name),
        l.sellersItemId ? el('cac:SellersItemIdentification', [el('cbc:ID', l.sellersItemId)]) : null,
      ]),
    ])),
  ]);
}

function buildDespatchXml(model, opts = {}) {
  return toXml(buildDespatchDocument(model), opts);
}

module.exports = { buildDespatchXml, buildDespatchDocument };
