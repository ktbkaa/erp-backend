const { createDefinitionRouter } = require('../src/utils/tanimCrud');

module.exports = createDefinitionRouter({
  table: 'languages',
  codeCol: 'language_code',
  nameCol: 'language_name',
  seriKodu: 'DIL',
  extraCols: [],
  orderBy: 'language_code',
  notFound: 'Dil bulunamadı.',
});
