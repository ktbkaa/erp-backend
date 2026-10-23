const { createBelgeRouter } = require('./_belgeCrud');

module.exports = createBelgeRouter({
    table: 'rfqs',
    lineTable: 'rfq_lines',
    fk: 'istek_id',
    noField: 'istek_no',
    seri: 'SATINALMA_TEKLIF_ISTEK',
    notFound: 'Teklif isteği bulunamadı.',
    allowedDurum: ['Acik', 'Onayli', 'TeklifeDonustu', 'Iptal', 'Kapali'],
    requireCari: false,
    linePrice: false,
    extraFields: ['plant_id', 'company_id', 'status'],
});
