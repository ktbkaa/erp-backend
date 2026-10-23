const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'languages',
  codeCol: 'dil_code',
  nameCol: 'dil_name',
  seriKodu: 'DIL',
  extraCols: [],
  orderBy: 'dil_code',
  notFound: 'Dil bulunamadı.',
});
