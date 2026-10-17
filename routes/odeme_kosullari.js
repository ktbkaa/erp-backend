const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'odeme_kosullari',
  codeCol: 'kosul_kodu',
  nameCol: 'kosul_adi',
  seriKodu: 'ODEME_KOSUL',
  extraCols: ['vade_gun', 'aciklama'],
  orderBy: 'kosul_kodu',
  notFound: 'Ödeme koşulu bulunamadı.',
});
