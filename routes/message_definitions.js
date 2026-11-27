'use strict';

const { createTanimRouter } = require('../src/utils/tanimCrud');

module.exports = createTanimRouter({
  table: 'message_definitions',
  codeCol: 'message_code',
  nameCol: 'title',
  extraCols: ['message_type', 'body'],
  orderBy: 'message_code',
  notFound: 'Mesaj tanımı bulunamadı.',
});
