const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'bankalar',
  codeCol: 'banka_kodu',
  nameCol: 'banka_adi',
  seriKodu: 'BANKA',
  extraCols: ['swift_kodu', 'ulke_kodu'],
  orderBy: 'banka_kodu',
  notFound: 'Banka bulunamadı.',
});
