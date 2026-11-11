const { createDocumentRouter } = require('./_belgeCrud');

module.exports = createDocumentRouter({
    table: 'purchase_agreements',
    lineTable: 'purchase_agreement_lines',
    fk: 'agreement_id',
    noField: 'agreement_no',
    seri: 'SATINALMA_ANLASMA',
    notFound: 'Anlaşma bulunamadı.',
    allowedDurum: ['Taslak', 'Onayli', 'Kapali', 'Iptal'],
    requireCari: true,
    linePrice: true,
    extraFields: ['quotation_id', 'start_date', 'end_date', 'status', 'company_id', 'plant_id', 'currency_code', 'exchange_rate'],
});
