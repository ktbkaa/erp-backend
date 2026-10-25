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

function poolConfigFromUrl(url) {
    const cfg = {
        connectionString: url,
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: 30_000,
    };
    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    if (!isLocal || process.env.DB_SSL === '1') {
        cfg.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === '1' };
    }
    return cfg;
}

function buildPoolConfig() {
    // Managed Postgres (Neon / Render / Railway) veya tünel URL
    if (process.env.DATABASE_URL) {
        return poolConfigFromUrl(process.env.DATABASE_URL);
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

function isWriteSql(text) {
    if (!text || typeof text !== 'string') return false;
    const head = text.replace(/^\s*\/\*[\s\S]*?\*\//, '').trimStart();
    return /^(INSERT|UPDATE|DELETE|UPSERT|MERGE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|COMMENT|REINDEX|VACUUM|CLUSTER|COPY\s+\S+\s+FROM)\b/i.test(head);
}

const primary = new Pool(buildPoolConfig());

/**
 * İkinci hedef: kullanıcının bilgisayarındaki PostgreSQL (tünel / public URL).
 * DB_MIRROR_URL veya LOCAL_DATABASE_URL ile verilir.
 * Cloud Agent laptop localhost’una doğrudan bağlanamaz — erişilebilir bir host gerekir.
 */
const mirrorUrl = process.env.DB_MIRROR_URL || process.env.LOCAL_DATABASE_URL || '';
const mirror = mirrorUrl ? new Pool(poolConfigFromUrl(mirrorUrl)) : null;

primary.on('error', (err) => {
    console.error('Beklenmeyen PostgreSQL havuz hatası:', err);
});
if (mirror) {
    mirror.on('error', (err) => {
        console.error('[db-mirror] havuz hatası:', err.message);
    });
}

function mirrorWrite(text, params) {
    if (!mirror || !isWriteSql(text)) return;
    mirror.query(text, params).catch((err) => {
        console.warn('[db-mirror] yazma başarısız (birincil yine de tamam):', err.message);
    });
}

/**
 * Uygulama kodu `require('./db')` ile Pool gibi kullanır.
 * query() yazıları aynaya da gönderir; connect()/transaction istemcileri için
 * tam ayna garantisi yoktur — şema senkronu `npm run db:mirror-sync` ile yapılır.
 */
const pool = {
    query(text, params) {
        const p = primary.query(text, params);
        p.then(() => mirrorWrite(text, params)).catch(() => {});
        return p;
    },
    connect() {
        return primary.connect();
    },
    end() {
        const jobs = [primary.end()];
        if (mirror) jobs.push(mirror.end());
        return Promise.all(jobs);
    },
    on(...args) {
        return primary.on(...args);
    },
    get totalCount() {
        return primary.totalCount;
    },
    get idleCount() {
        return primary.idleCount;
    },
    get waitingCount() {
        return primary.waitingCount;
    },
    /** Test / teşhis */
    _primary: primary,
    _mirror: mirror,
};

primary.query('SELECT 1')
    .then(() => {
        console.log('Veritabanı bağlantı havuzu (Pool) hazır.');
        if (mirror) {
            return mirror.query('SELECT current_database() AS db, inet_server_addr() AS addr').then((r) => {
                const row = r.rows[0] || {};
                console.log(`[db-mirror] ayna hazır → db=${row.db || '?'} addr=${row.addr || 'remote'}`);
            });
        }
        console.log('[db-mirror] kapalı — DB_MIRROR_URL / LOCAL_DATABASE_URL yok (yalnızca cloud/local birincil).');
        return undefined;
    })
    .catch((err) => console.error('Veritabanı bağlantısında pürüz:', err.message));

module.exports = pool;
