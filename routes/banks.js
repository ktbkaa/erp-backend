const { createDefinitionRouter } = require('../src/utils/tanimCrud');

module.exports = createDefinitionRouter({
  table: 'banks',
  codeCol: 'bank_code',
  nameCol: 'bank_name',
  seriKodu: 'BANKA',
  extraCols: ['swift_code', 'country_code'],
  orderBy: 'bank_code',
  notFound: 'Banka bulunamadı.',
});
