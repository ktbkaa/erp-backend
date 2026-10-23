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

function buildPoolConfig() {
    // Managed Postgres (Neon / Render / Railway): DATABASE_URL tercih edilir
    if (process.env.DATABASE_URL) {
        const cfg = {
            connectionString: process.env.DATABASE_URL,
            max: Number(process.env.DB_POOL_MAX || 10),
            idleTimeoutMillis: 30_000,
        };
        // Yerel dışı SSL (Neon/Render zorunlu)
        const url = process.env.DATABASE_URL;
        const isLocal = /localhost|127\.0\.0\.1/.test(url);
        if (!isLocal || process.env.DB_SSL === '1') {
            cfg.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === '1' };
        }
        return cfg;
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: requiredEnv('DB_NAME'),
        user: requiredEnv('DB_USER'),
        password: requiredEnv('DB_PASSWORD'),
        max: Number(process.env.DB_POOL_MAX || 10),
    };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
    console.error('Beklenmeyen PostgreSQL havuz hatası:', err);
});

pool.query('SELECT 1')
    .then(() => console.log('Veritabanı bağlantı havuzu (Pool) hazır.'))
    .catch((err) => console.error('Veritabanı bağlantısında pürüz:', err.message));

module.exports = pool;
