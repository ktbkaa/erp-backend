/**
 * Liveness (/health) ve readiness (/ready) uçları.
 *
 * /health — süreç ayakta mı? DB'ye gitmez; yük dengeleyici/Docker HEALTHCHECK için.
 * /ready  — trafik alabilir mi? DB SELECT 1 (zaman aşımlı) + bekleyen migration
 *           + kapanış durumu. Hazır değilse 503.
 *
 * READY_DB_TIMEOUT_MS        (varsayılan 2000)
 * READY_REQUIRE_MIGRATIONS   1 | 0 — bekleyen migration varsa 503 (varsayılan 1)
 * READY_CACHE_MS             migration kontrol önbelleği (varsayılan 10000)
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'db', 'migrations');
const startedAt = Date.now();
const version = (() => {
  try { return require('../../package.json').version; } catch (_) { return null; }
})();
const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || process.env.SOURCE_VERSION || null;

const state = { shuttingDown: false };

function migrationFiles() {
  try {
    return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  } catch (_) {
    return [];
  }
}

function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      t = setTimeout(() => reject(new Error(`${label} zaman aşımı (${ms} ms)`)), ms);
    }),
  ]).finally(() => clearTimeout(t));
}

function createHealthRouter({ pool, logger }) {
  const express = require('express');
  const router = express.Router();
  const files = migrationFiles();
  const dbTimeout = Number(process.env.READY_DB_TIMEOUT_MS || 2000);
  const cacheMs = Number(process.env.READY_CACHE_MS || 10000);
  const requireMigrations = process.env.READY_REQUIRE_MIGRATIONS !== '0';
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  let migCache = { at: 0, pending: null };

  async function pendingMigrations() {
    if (Date.now() - migCache.at < cacheMs && migCache.pending) return migCache.pending;
    const r = await withTimeout(pool.query('SELECT filename FROM schema_migrations'), dbTimeout, 'schema_migrations');
    const applied = new Set(r.rows.map((x) => x.filename));
    const pending = files.filter((f) => !applied.has(f));
    migCache = { at: Date.now(), pending };
    return pending;
  }

  router.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(state.shuttingDown ? 503 : 200).json({
      status: state.shuttingDown ? 'kapaniyor' : 'ok',
      zaman: new Date().toISOString(),
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
      version,
      commit,
    });
  });

  router.get('/ready', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const checks = {};
    let ok = !state.shuttingDown;
    if (state.shuttingDown) checks.process = 'kapaniyor';
    const t0 = Date.now();
    try {
      await withTimeout(pool.query('SELECT 1'), dbTimeout, 'DB');
      checks.veritabani = { durum: 'bagli', ms: Date.now() - t0 };
    } catch (err) {
      ok = false;
      checks.veritabani = { durum: 'baglantisiz', ...(isProd ? {} : { detay: err.message }) };
      logger.warn('ready: veritabanı kontrolü başarısız', { err });
    }
    if (checks.veritabani?.durum === 'bagli') {
      try {
        const pending = await pendingMigrations();
        checks.migration = { toplam: files.length, bekleyen: pending.length };
        if (pending.length) {
          checks.migration.ilk_bekleyen = pending[0];
          if (requireMigrations) ok = false;
        }
      } catch (err) {
        checks.migration = { durum: 'okunamadi', ...(isProd ? {} : { detay: err.message }) };
        if (requireMigrations) ok = false;
      }
    }
    checks.pool = { toplam: pool.totalCount, bosta: pool.idleCount, bekleyen: pool.waitingCount };
    res.status(ok ? 200 : 503).json({
      status: ok ? 'hazir' : 'hazir_degil',
      zaman: new Date().toISOString(),
      version,
      commit,
      checks,
    });
  });

  return router;
}

module.exports = { createHealthRouter, state };
