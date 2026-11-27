/**
 * HTTP güvenlik katmanı: CORS (ALLOWED_ORIGINS), helmet + CSP, auth rate limit, gövde limitleri.
 */
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { isProduction, allowedOrigins, envFlag } = require('../utils/securityConfig');

const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization, X-Kullanici-Kodu, X-Firma-Id';

/**
 * - ALLOWED_ORIGINS doluysa yalnız listedeki origin’ler (veya '*') yansıtılır.
 * - Boşken geliştirmede her origin yansıtılır (Cursor Ports / önizleme); canlıda yalnız aynı origin.
 * Origin başlığı olmayan (aynı origin / curl) istekler etkilenmez.
 */
function isOriginAllowed(origin, env = process.env) {
  if (!origin) return false;
  const list = allowedOrigins(env);
  if (list.includes('*')) return true;
  if (list.length) return list.includes(String(origin).replace(/\/+$/, ''));
  return !isProduction(env);
}

function corsMiddleware() {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin) {
      res.append('Vary', 'Origin');
      if (isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);
        res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
        res.setHeader('Access-Control-Max-Age', '600');
      } else if (req.method === 'OPTIONS') {
        return res.status(403).json({ hata: 'Origin izinli değil (ALLOWED_ORIGINS).', kod: 'ERR-CORS' });
      }
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
}

/**
 * SPA uyumlu CSP: index.html ve yazdırma pencerelerinde (document.write) satır içi
 * script/onclick bulunduğu için script-src 'unsafe-inline' tutulur; dış script, object,
 * base ve çerçeveleme engellenir. CSP_MODE=report-only|off ile gevşetilebilir.
 */
function cspDirectives(env = process.env) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    scriptSrcAttr: ["'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    upgradeInsecureRequests: envFlag('CSP_UPGRADE_INSECURE', false, env) ? [] : null,
  };
  return directives;
}

function helmetMiddleware(env = process.env) {
  const mode = String(env.CSP_MODE || 'enforce').trim().toLowerCase();
  const prod = isProduction(env);
  return helmet({
    contentSecurityPolicy: mode === 'off'
      ? false
      : { useDefaults: false, directives: cspDirectives(env), reportOnly: mode === 'report-only' },
    // HTTP üzerinden çalışan yerel/LAN kurulumlarda HSTS tarayıcıyı kilitlemesin
    strictTransportSecurity: prod && envFlag('HSTS', true, env)
      ? { maxAge: 15552000, includeSubDomains: false }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'same-origin' },
  });
}

function rateLimitHandler(req, res, next, options) {
  res.status(options.statusCode).json({
    hata: 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.',
    kod: 'ERR-RATE-LIMIT',
  });
}

function numEnv(env, name, def) {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? n : def;
}

/** /auth/login: başarısız denemeler sayılır (IP başına). /auth/refresh: tüm istekler. */
function authRateLimiters(env = process.env) {
  const disabled = envFlag('AUTH_RATE_LIMIT_DISABLED', false, env) && !isProduction(env);
  const common = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => disabled,
  };
  const login = rateLimit({
    ...common,
    windowMs: numEnv(env, 'AUTH_LOGIN_RATE_WINDOW_MS', 15 * 60 * 1000),
    limit: numEnv(env, 'AUTH_LOGIN_RATE_MAX', 10),
    skipSuccessfulRequests: true,
  });
  const refresh = rateLimit({
    ...common,
    windowMs: numEnv(env, 'AUTH_REFRESH_RATE_WINDOW_MS', 15 * 60 * 1000),
    limit: numEnv(env, 'AUTH_REFRESH_RATE_MAX', 60),
  });
  return { login, refresh };
}

/**
 * Global JSON limiti JSON_BODY_LIMIT (varsayılan 1mb). Profil resmi (base64) / yetki JSON’u
 * taşıyan kullanıcı uçları ve banka ekstresi CSV içe aktarımı LARGE_JSON_BODY_LIMIT (varsayılan 5mb).
 */
const LARGE_BODY_PATHS = ['/users', '/kullanicilar', '/banka-mutabakat'];

function bodyParsers(app, env = process.env) {
  const small = env.JSON_BODY_LIMIT || '1mb';
  const large = env.LARGE_JSON_BODY_LIMIT || '5mb';
  app.use(LARGE_BODY_PATHS, express.json({ limit: large }));
  app.use(LARGE_BODY_PATHS, express.urlencoded({ extended: true, limit: large }));
  app.use(express.json({ limit: small }));
  app.use(express.urlencoded({ extended: true, limit: small }));
}

/** TRUST_PROXY: sayı (hop), true/false veya Express ifadesi; canlıda varsayılan 1 (Render/Heroku). */
function trustProxySetting(env = process.env) {
  const raw = env.TRUST_PROXY;
  if (raw == null || String(raw).trim() === '') return isProduction(env) ? 1 : false;
  const v = String(raw).trim();
  if (/^\d+$/.test(v)) return Number(v);
  const flag = envFlag('TRUST_PROXY', null, env);
  if (flag !== null) return flag;
  return v;
}

module.exports = {
  corsMiddleware,
  isOriginAllowed,
  helmetMiddleware,
  cspDirectives,
  authRateLimiters,
  bodyParsers,
  trustProxySetting,
  LARGE_BODY_PATHS,
};
