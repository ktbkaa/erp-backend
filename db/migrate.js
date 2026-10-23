/**
 * Basit migration çalıştırıcı.
 * Kullanım: npm run migrate
 *
 * Ne yapar?
 * - db/migrations klasöründeki .sql dosyalarını isim sırasıyla okur
 * - Daha önce uygulanmamış olanları veritabanına işler
 * - Hangilerinin uygulandığını schema_migrations tablosunda tutar
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
// DATABASE_URL (Neon/Render) veya yerel DB_* — db.js ile aynı bağlantı
const pool = require('../db');

async function main() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const already = await client.query(
                'SELECT 1 FROM schema_migrations WHERE filename = $1',
                [file]
            );
            if (already.rowCount > 0) {
                console.log(`Atlandı (zaten uygulanmış): ${file}`);
                continue;
            }

            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            console.log(`Uygulanıyor: ${file}`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`Tamam: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        console.log('Migration işlemi bitti.');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Migration hatası:', err.message);
    process.exit(1);
});
