const { createBelgeRouter } = require('./_belgeCrud');

module.exports = createBelgeRouter({
    table: 'satin_alma_teklifleri',
    lineTable: 'satin_alma_teklif_satirlari',
    fk: 'teklif_id',
    noField: 'teklif_no',
    seri: 'SATINALMA_TEKLIF',
    notFound: 'Teklif bulunamadı.',
    allowedDurum: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'Iptal', 'Kapali'],
    requireCari: true,
    linePrice: true,
    extraFields: ['istek_id', 'gecerlilik_tarihi', 'durum'],
});
