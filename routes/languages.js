const { createDefinitionRouter } = require('../src/utils/tanimCrud');

module.exports = createDefinitionRouter({
  table: 'languages',
  codeCol: 'dil_code',
  nameCol: 'dil_name',
  seriKodu: 'DIL',
  extraCols: [],
  orderBy: 'dil_code',
  notFound: 'Dil bulunamadı.',
});
