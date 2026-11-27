const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'banks',
  codeCol: 'bank_code',
  nameCol: 'bank_name',
  seriKodu: 'BANKA',
  extraCols: ['swift_code', 'country_code'],
  orderBy: 'bank_code',
  notFound: 'Banka bulunamadı.',
});
