/**
 * Bağımlılıksız yapılandırılabilir logger.
 *
 * LOG_FORMAT  json | pretty   (varsayılan: production'da json, diğerlerinde pretty)
 * LOG_LEVEL   debug | info | warn | error | silent   (varsayılan: info)
 * LOG_CONSOLE_BRIDGE  1 | 0   json formatında mevcut console.* çağrılarını da
 *                             JSON satırına çevirir (varsayılan: json iken 1)
 * LOG_HTTP    1 | 0           HTTP erişim logu (varsayılan: 1)
 * LOG_HTTP_SKIP_STATIC 1 | 0  statik dosya + /health,/ready loglarını atla (varsayılan: 1)
 */
const crypto = require('crypto');
const util = require('util');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const SERVICE = process.env.LOG_SERVICE_NAME || 'ktb-erp';

const rawOut = process.stdout.write.bind(process.stdout);
const rawErr = process.stderr.write.bind(process.stderr);

function envFormat() {
  const f = String(process.env.LOG_FORMAT || '').toLowerCase();
  if (f === 'json' || f === 'pretty') return f;
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production' ? 'json' : 'pretty';
}

function envLevel() {
  const l = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[l] != null ? l : 'info';
}

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  const out = { type: err.name, message: err.message };
  if (err.code) out.code = err.code;
  if (err.stack) out.stack = err.stack;
  return out;
}

function createLogger(bindings = {}) {
  const format = envFormat();
  const threshold = LEVELS[envLevel()];

  function emit(level, msg, fields) {
    if (LEVELS[level] < threshold) return;
    const stream = LEVELS[level] >= LEVELS.warn ? rawErr : rawOut;
    const extra = {};
    for (const [k, v] of Object.entries({ ...bindings, ...(fields || {}) })) {
      if (v === undefined) continue;
      extra[k] = v instanceof Error ? serializeError(v) : v;
    }
    if (format === 'json') {
      let line;
      try {
        line = JSON.stringify({
          time: new Date().toISOString(),
          level,
          service: SERVICE,
          msg: String(msg),
          ...extra,
        });
      } catch (_) {
        line = JSON.stringify({ time: new Date().toISOString(), level, service: SERVICE, msg: String(msg) });
      }
      stream(`${line}\n`);
      return;
    }
    const kv = Object.entries(extra)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');
    stream(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${msg}${kv ? ` ${kv}` : ''}\n`);
  }

  return {
    format,
    level: envLevel(),
    debug: (msg, f) => emit('debug', msg, f),
    info: (msg, f) => emit('info', msg, f),
    warn: (msg, f) => emit('warn', msg, f),
    error: (msg, f) => emit('error', msg, f),
    child: (more) => createLogger({ ...bindings, ...more }),
  };
}

let bridged = false;

/** Mevcut console.* çağrılarını logger üzerinden geçirir (JSON tek satır). */
function installConsoleBridge(logger) {
  if (bridged) return;
  bridged = true;
  const map = { log: 'info', info: 'info', debug: 'debug', warn: 'warn', error: 'error' };
  for (const [method, level] of Object.entries(map)) {
    // eslint-disable-next-line no-console
    console[method] = (...args) => {
      const errors = args.filter((a) => a instanceof Error);
      const msg = util.format(...args.map((a) => (a instanceof Error ? a.message : a)));
      logger[level](msg, errors.length ? { err: errors[0], source: 'console' } : { source: 'console' });
    };
  }
}

const STATIC_RE = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|html|json|txt)$/i;

function sanitizeRequestId(v) {
  const s = String(v || '').trim();
  return /^[A-Za-z0-9._:-]{8,128}$/.test(s) ? s : null;
}

/** Erişim logu + X-Request-Id (gelen geçerliyse korunur, yoksa üretilir). */
function httpLogger(logger) {
  const enabled = process.env.LOG_HTTP !== '0';
  const skipStatic = process.env.LOG_HTTP_SKIP_STATIC !== '0';
  return function accessLog(req, res, next) {
    const id = sanitizeRequestId(req.get('x-request-id')) || crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    if (!enabled) return next();
    const p = req.path || '';
    if (skipStatic && (p === '/health' || p === '/ready' || p === '/' || STATIC_RE.test(p))) return next();
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      logger[level]('http', {
        req_id: id,
        method: req.method,
        path: (req.originalUrl || p).split('?')[0],
        status,
        duration_ms: Math.round(ms * 10) / 10,
        ip: req.ip,
        user: req.user?.user_code || undefined,
        firma_id: req.firmaId || undefined,
        bytes: Number(res.getHeader('content-length')) || undefined,
      });
    });
    next();
  };
}

let rootLogger = null;

/** Süreç başında bir kez: logger'ı kurar, json ise console köprüsünü açar. */
function init() {
  if (rootLogger) return rootLogger;
  rootLogger = createLogger();
  const bridgeDefault = rootLogger.format === 'json' ? '1' : '0';
  if ((process.env.LOG_CONSOLE_BRIDGE ?? bridgeDefault) === '1') installConsoleBridge(rootLogger);
  return rootLogger;
}

module.exports = { init, createLogger, httpLogger, installConsoleBridge, serializeError };
