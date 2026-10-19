const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'teslimat_kosullari',
  codeCol: 'kosul_kodu',
  nameCol: 'kosul_adi',
  seriKodu: 'TESLIMAT_KOSUL',
  extraCols: ['aciklama'],
  orderBy: 'kosul_kodu',
  notFound: 'Teslimat koşulu bulunamadı.',
});
