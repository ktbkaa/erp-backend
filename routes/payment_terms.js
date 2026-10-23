const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'payment_terms',
  codeCol: 'term_code',
  nameCol: 'term_name',
  seriKodu: 'ODEME_KOSUL',
  extraCols: ['due_days', 'description'],
  orderBy: 'term_code',
  notFound: 'Ödeme koşulu bulunamadı.',
});
