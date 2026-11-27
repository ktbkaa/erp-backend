const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'delivery_terms',
  codeCol: 'term_code',
  nameCol: 'term_name',
  seriKodu: 'TESLIMAT_KOSUL',
  extraCols: ['description'],
  orderBy: 'term_code',
  notFound: 'Teslimat koşulu bulunamadı.',
});
