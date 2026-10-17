const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'diller',
  codeCol: 'dil_kodu',
  nameCol: 'dil_adi',
  seriKodu: 'DIL',
  extraCols: [],
  orderBy: 'dil_kodu',
  notFound: 'Dil bulunamadı.',
});
