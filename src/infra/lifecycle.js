/**
 * Süreç yaşam döngüsü: açılış ortam denetimi, SIGTERM/SIGINT ile zarif kapanış,
 * yakalanmamış hata kaydı.
 *
 * SHUTDOWN_TIMEOUT_MS  açık bağlantıların kapanması için süre (varsayılan 15000)
 * SHUTDOWN_DRAIN_MS    /ready 503 döndükten sonra LB'nin trafiği çekmesi için
 *                      bekleme (varsayılan: production 5000, diğer 0)
 */
const { state } = require('./health');

/** Canlıda tehlikeli/eksik ayarlarla açılmayı engeller. Hata listesi döner. */
function checkEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];
  const prod = String(env.NODE_ENV || '').toLowerCase() === 'production';
  if (!env.DATABASE_URL && !(env.DB_NAME && env.DB_USER && env.DB_PASSWORD)) {
    errors.push('DATABASE_URL veya DB_NAME/DB_USER/DB_PASSWORD tanımlı değil.');
  }
  if (prod) {
    if (!env.JWT_SECRET && !env.JWT_SECRET_FALLBACK) errors.push('JWT_SECRET production ortamında zorunlu.');
    else if (String(env.JWT_SECRET || env.JWT_SECRET_FALLBACK).length < 32) warnings.push('JWT_SECRET 32 karakterden kısa.');
    if (String(env.ERP_AUTH_SOFT || '').trim() === '1') {
      errors.push('ERP_AUTH_SOFT=1 production ortamında kullanılamaz (kimliksiz X-Kullanici-Kodu erişimi açar).');
    }
    if (env.AUTO_HEAL !== '0') {
      warnings.push('AUTO_HEAL=0 değil: açılışta demo firma/örnek veri onarımı çalışabilir (canlıda AUTO_HEAL=0 önerilir).');
    }
  }
  return { errors, warnings, prod };
}

function registerProcessHandlers(logger) {
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { err: reason instanceof Error ? reason : new Error(String(reason)) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaughtException — süreç sonlandırılıyor', { err });
    // Durum belirsiz: süreç yöneticisi (Docker/Render/systemd) yeniden başlatsın.
    setTimeout(() => process.exit(1), 100).unref();
  });
}

function enableGracefulShutdown({ server, pool, logger }) {
  const prod = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS || 15000);
  const drainMs = Number(process.env.SHUTDOWN_DRAIN_MS ?? (prod ? 5000 : 0));

  async function shutdown(signal) {
    if (state.shuttingDown) return;
    state.shuttingDown = true;
    logger.info('kapanış başladı', { signal, drain_ms: drainMs, timeout_ms: timeoutMs });
    const force = setTimeout(() => {
      logger.error('kapanış zaman aşımı — zorla çıkılıyor', { timeout_ms: timeoutMs });
      process.exit(1);
    }, drainMs + timeoutMs);
    force.unref();

    if (drainMs > 0) await new Promise((r) => setTimeout(r, drainMs));
    await new Promise((resolve) => {
      server.close(() => resolve());
      if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
    });
    try {
      await pool.end();
    } catch (err) {
      logger.warn('pool kapatılırken hata', { err });
    }
    logger.info('kapanış tamam');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { checkEnvironment, registerProcessHandlers, enableGracefulShutdown };
