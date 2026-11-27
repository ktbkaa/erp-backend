require('dotenv').config();
const { Pool } = require('pg');
const { buildPoolConfig } = require('./src/utils/dbConfig');

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
    console.error('Beklenmeyen PostgreSQL havuz hatası:', err);
});

pool.query('SELECT 1')
    .then(() => console.log('Veritabanı bağlantı havuzu (Pool) hazır.'))
    .catch((err) => console.error('Veritabanı bağlantısında pürüz:', err.message));

module.exports = pool;
