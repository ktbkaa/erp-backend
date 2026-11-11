const { createDocumentRouter } = require('./_belgeCrud');

module.exports = createDocumentRouter({
    table: 'rfqs',
    lineTable: 'rfq_lines',
    fk: 'rfq_id',
    noField: 'rfq_no',
    seri: 'SATINALMA_TEKLIF_ISTEK',
    notFound: 'Teklif isteği bulunamadı.',
    allowedDurum: ['Acik', 'Onayli', 'TeklifeDonustu', 'Iptal', 'Kapali'],
    requireCari: false,
    linePrice: false,
    extraFields: ['plant_id', 'company_id', 'status'],
});
