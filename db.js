const { Client } = require('pg');

const dbClient = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '82555442',
    port: 5432,
});

dbClient.connect()
    .then(() => console.log('Veritabanı bağlantısı db.js üzerinden canavar gibi çalışıyor!'))
    .catch(err => console.error('Bağlantıda pürüz:', err.stack));

// Bu bağlantıyı projenin diğer yerlerinde kullanabilmek için dışarı aktarıyoruz
module.exports = dbClient;