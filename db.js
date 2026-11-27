require('dotenv').config();
const { Pool } = require('pg');

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Eksik ortam değişkeni: ${name}. ` +
            `.env dosyasını kontrol et (.env.example dosyasını örnek al).`
        );
    }
    return value;
}

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: requiredEnv('DB_NAME'),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
});

pool.on('error', (err) => {
    console.error('Beklenmeyen PostgreSQL havuz hatası:', err);
});

pool.query('SELECT 1')
    .then(() => console.log('Veritabanı bağlantı havuzu (Pool) hazır.'))
    .catch((err) => console.error('Veritabanı bağlantısında pürüz:', err.message));

module.exports = pool;
