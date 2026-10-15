const { createBelgeRouter } = require('./_belgeCrud');

module.exports = createBelgeRouter({
    table: 'satin_alma_anlasmalari',
    lineTable: 'satin_alma_anlasma_satirlari',
    fk: 'anlasma_id',
    noField: 'anlasma_no',
    seri: 'SATINALMA_ANLASMA',
    notFound: 'Anlaşma bulunamadı.',
    allowedDurum: ['Taslak', 'Onayli', 'Kapali', 'Iptal'],
    requireCari: true,
    linePrice: true,
    extraFields: ['teklif_id', 'baslangic_tarihi', 'bitis_tarihi', 'durum'],
});
