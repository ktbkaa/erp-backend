const { createBelgeRouter } = require('./_belgeCrud');

module.exports = createBelgeRouter({
    table: 'satin_alma_teklif_istekleri',
    lineTable: 'satin_alma_teklif_istek_satirlari',
    fk: 'istek_id',
    noField: 'istek_no',
    seri: 'SATINALMA_TEKLIF_ISTEK',
    notFound: 'Teklif isteği bulunamadı.',
    allowedDurum: ['Acik', 'Onayli', 'TeklifeDonustu', 'Iptal', 'Kapali'],
    requireCari: false,
    linePrice: false,
    extraFields: ['is_yeri_id', 'durum'],
});
