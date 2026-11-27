/**
 * G-04…G-08 canlı geçiş güvenliği — DB gerektirmeyen birim testleri.
 */
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const sec = require('../src/utils/securityConfig');
const { buildPoolConfig } = require('../src/utils/dbConfig');
const {
  corsMiddleware, helmetMiddleware, authRateLimiters, bodyParsers, trustProxySetting,
} = require('../src/middleware/security');
const { errorHandler } = require('../src/middleware/errorHandler');
const { sanitizeBody, failureAction, criticalTarget, fieldDiff } = require('../src/services/auditService');
const { schemas } = require('../src/utils/validate');

const root = path.join(__dirname, '..');

const ENV_KEYS = [
  'NODE_ENV', 'RENDER', 'ENABLE_SQL_CONSOLE', 'SQL_CONSOLE_READONLY', 'SQL_CONSOLE_ALLOW_EXTERNAL_DB',
  'ENABLE_SYSTEM_UPDATE_APPLY', 'SUPER_ADMIN_USERS', 'ALLOWED_ORIGINS', 'JWT_SECRET', 'JWT_SECRET_FALLBACK',
  'CSP_MODE',
];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

async function call(app, method, url, { headers = {}, body, raw } = {}) {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: raw != null ? raw : (body != null ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = text; }
    return { status: res.status, headers: res.headers, json };
  } finally {
    await new Promise((r) => server.close(r));
  }
}

describe('securityConfig — ortam bayrakları', () => {
  afterEach(restoreEnv);

  it('isProduction: NODE_ENV veya NODE_ENV boşken PaaS', () => {
    assert.equal(sec.isProduction({ NODE_ENV: 'production' }), true);
    assert.equal(sec.isProduction({ RENDER: 'true' }), true);
    assert.equal(sec.isProduction({ NODE_ENV: 'development', RENDER: 'true' }), false);
    assert.equal(sec.isProduction({}), false);
  });

  it('SQL konsolu / paket uygulama canlıda varsayılan kapalı, geliştirmede açık', () => {
    const prod = { NODE_ENV: 'production' };
    assert.equal(sec.isSqlConsoleEnabled(prod), false);
    assert.equal(sec.isSystemUpdateApplyEnabled(prod), false);
    assert.equal(sec.isSqlConsoleEnabled({ ...prod, ENABLE_SQL_CONSOLE: '1' }), true);
    assert.equal(sec.isSqlConsoleReadOnly({ ...prod, SQL_CONSOLE_READONLY: '0' }), true, 'canlıda her zaman salt-okunur');
    assert.equal(sec.isSqlConsoleExternalDbAllowed({ ...prod, SQL_CONSOLE_ALLOW_EXTERNAL_DB: '1' }), false);
    assert.equal(sec.isSqlConsoleEnabled({}), true);
    assert.equal(sec.isSqlConsoleReadOnly({}), false);
    assert.equal(sec.isSqlConsoleEnabled({ ENABLE_SQL_CONSOLE: '0' }), false);
  });

  it("isSuperAdmin: module_permissions ['*'] tek başına yetki vermez", () => {
    const dev = {};
    const star = { user: { user_code: 'AYSE', group_code: 'GENEL', module_permissions: ['*'] }, auth: { type: 'jwt' } };
    assert.equal(sec.isSuperAdmin(star, dev), false);
    const yonetici = { user: { user_code: 'MEHMET', role: 'Yonetici', group_code: 'GENEL' }, auth: { type: 'jwt' } };
    assert.equal(sec.isSuperAdmin(yonetici, dev), false);
    const admin = { user: { user_code: 'ALI', group_code: 'ADMIN' }, auth: { type: 'jwt' } };
    assert.equal(sec.isSuperAdmin(admin, dev), true);
    assert.equal(sec.isSuperAdmin({ user: { user_code: 'owner' }, auth: { type: 'header' } }, dev), true);
  });

  it('isSuperAdmin: canlıda JWT şart, owner adı yetmez, SUPER_ADMIN_USERS listesi bağlayıcı', () => {
    const prod = { NODE_ENV: 'production' };
    const adminHeader = { user: { user_code: 'ALI', group_code: 'ADMIN' }, auth: { type: 'header' } };
    assert.equal(sec.isSuperAdmin(adminHeader, prod), false);
    assert.equal(sec.isSuperAdmin({ user: { user_code: 'owner' }, auth: { type: 'jwt' } }, prod), false);
    const adminJwt = { user: { user_code: 'ALI', group_code: 'ADMIN' }, auth: { type: 'jwt' } };
    assert.equal(sec.isSuperAdmin(adminJwt, prod), true);
    assert.equal(sec.isSuperAdmin(adminJwt, { ...prod, SUPER_ADMIN_USERS: 'VELI' }), false);
    assert.equal(sec.isSuperAdmin({ user: { user_code: 'veli' }, auth: { type: 'jwt' } }, { ...prod, SUPER_ADMIN_USERS: 'VELI, X' }), true);
    assert.equal(sec.isSuperAdmin({ user: { user_code: 'VELI', is_active: false }, auth: { type: 'jwt' } }, { ...prod, SUPER_ADMIN_USERS: 'VELI' }), false);
  });

  it('checkProductionConfig: JWT_SECRET eksik/varsayılan ölümcül, kısa uyarı', () => {
    const prod = { NODE_ENV: 'production' };
    assert.ok(sec.checkProductionConfig(prod).errors.some((e) => /JWT_SECRET/.test(e)));
    assert.ok(sec.checkProductionConfig({ ...prod, JWT_SECRET: sec.DEV_JWT_SECRET }).errors.length);
    assert.ok(sec.checkProductionConfig({ ...prod, JWT_SECRET: 'uzun-rastgele-bir-metin' }).errors.length);
    const short = sec.checkProductionConfig({ ...prod, JWT_SECRET: 'kisa-ama-ozel-1234' });
    assert.equal(short.errors.length, 0);
    assert.ok(short.warnings.some((w) => /32/.test(w)));
    const ok = sec.checkProductionConfig({ ...prod, JWT_SECRET: 'x'.repeat(48), ALLOWED_ORIGINS: 'https://erp.ornek.com' });
    assert.deepEqual(ok.errors, []);
    assert.equal(sec.checkProductionConfig({}).production, false);
  });

  it('jwtSecret: canlıda eksik/varsayılan sır reddedilir, yerelde dev fallback', () => {
    const { jwtSecret } = require('../src/utils/jwt');
    delete process.env.JWT_SECRET;
    delete process.env.JWT_SECRET_FALLBACK;
    process.env.NODE_ENV = 'production';
    assert.throws(() => jwtSecret(), /zorunlu/);
    process.env.JWT_SECRET = sec.DEV_JWT_SECRET;
    assert.throws(() => jwtSecret(), /varsayılan/);
    delete process.env.NODE_ENV;
    process.env.RENDER = 'true';
    delete process.env.JWT_SECRET;
    assert.throws(() => jwtSecret(), /zorunlu/, 'NODE_ENV boş + PaaS → canlı sayılır');
    delete process.env.RENDER;
    process.env.NODE_ENV = 'test';
    assert.equal(jwtSecret(), sec.DEV_JWT_SECRET);
  });

  it('gizli parametre maskesi', () => {
    assert.equal(sec.isSecretParameterCode('SMTP_PASS'), true);
    assert.equal(sec.isSecretParameterCode('LDAP_BIND_PASSWORD'), true);
    assert.equal(sec.isSecretParameterCode('SMTP_HOST'), false);
    const m = sec.maskSecretParameterRow({ parameter_code: 'SMTP_PASS', value: 'gizli' });
    assert.equal(m.value, sec.SECRET_MASK);
    assert.equal(m.value_set, true);
    assert.equal(sec.maskSecretParameterRow({ parameter_code: 'SMTP_HOST', value: 'smtp' }).value, 'smtp');
  });
});

describe('dbConfig — TLS doğrulaması', () => {
  const url = 'postgresql://u:p@db.neon.tech/app?sslmode=require';

  it('canlıda varsayılan rejectUnauthorized=true', () => {
    const cfg = buildPoolConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@db.neon.tech/app' });
    assert.equal(cfg.ssl.rejectUnauthorized, true);
  });

  it('yerelde (NODE_ENV boş) eski davranış: false', () => {
    const cfg = buildPoolConfig({ DATABASE_URL: 'postgresql://u:p@db.neon.tech/app' });
    assert.equal(cfg.ssl.rejectUnauthorized, false);
  });

  it('açık DB_SSL_REJECT_UNAUTHORIZED URL sslmode’undan önce gelir', () => {
    const cfg = buildPoolConfig({ NODE_ENV: 'production', DATABASE_URL: url, DB_SSL_REJECT_UNAUTHORIZED: '0' });
    assert.equal(cfg.ssl.rejectUnauthorized, false);
    assert.doesNotMatch(cfg.connectionString, /sslmode/);
  });

  it('DB_SSL_CA PEM içeriği ssl.ca’ya aktarılır', () => {
    const pem = '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----';
    const cfg = buildPoolConfig({ NODE_ENV: 'production', DATABASE_URL: url, DB_SSL_CA: pem });
    assert.match(cfg.ssl.ca, /BEGIN CERTIFICATE-----\nABC/);
  });

  it('localhost URL’de SSL zorlanmaz', () => {
    const cfg = buildPoolConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@localhost/app' });
    assert.equal(cfg.ssl, undefined);
  });
});

describe('HTTP katmanı — CORS / helmet / rate limit / gövde limiti', () => {
  afterEach(restoreEnv);

  function corsApp() {
    const app = express();
    app.use(corsMiddleware());
    app.get('/x', (req, res) => res.json({ ok: true }));
    return app;
  }

  it('geliştirmede ALLOWED_ORIGINS boşken origin yansıtılır (Cursor Ports)', async () => {
    delete process.env.NODE_ENV;
    delete process.env.ALLOWED_ORIGINS;
    const r = await call(corsApp(), 'GET', '/x', { headers: { Origin: 'https://abc.cursor.sh' } });
    assert.equal(r.headers.get('access-control-allow-origin'), 'https://abc.cursor.sh');
    assert.notEqual(r.headers.get('access-control-allow-origin'), '*');
  });

  it('ALLOWED_ORIGINS listesi dışı origin’e CORS başlığı yok, preflight 403', async () => {
    process.env.ALLOWED_ORIGINS = 'https://erp.ornek.com, https://panel.ornek.com/';
    const ok = await call(corsApp(), 'GET', '/x', { headers: { Origin: 'https://panel.ornek.com' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://panel.ornek.com');
    const bad = await call(corsApp(), 'GET', '/x', { headers: { Origin: 'https://kotu.site' } });
    assert.equal(bad.headers.get('access-control-allow-origin'), null);
    const pre = await call(corsApp(), 'OPTIONS', '/x', { headers: { Origin: 'https://kotu.site' } });
    assert.equal(pre.status, 403);
    const preOk = await call(corsApp(), 'OPTIONS', '/x', { headers: { Origin: 'https://erp.ornek.com' } });
    assert.equal(preOk.status, 204);
  });

  it('canlıda ALLOWED_ORIGINS boşsa yalnız aynı origin', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOWED_ORIGINS;
    const r = await call(corsApp(), 'GET', '/x', { headers: { Origin: 'https://kotu.site' } });
    assert.equal(r.headers.get('access-control-allow-origin'), null);
    const same = await call(corsApp(), 'GET', '/x');
    assert.equal(same.status, 200);
  });

  it('helmet: SPA uyumlu CSP + güvenlik başlıkları', async () => {
    const app = express();
    app.use(helmetMiddleware({}));
    app.get('/', (req, res) => res.send('<html></html>'));
    const r = await call(app, 'GET', '/');
    const csp = r.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'self'/);
    assert.match(csp, /https:\/\/fonts\.googleapis\.com/);
    assert.match(csp, /img-src 'self' data: blob:/);
    assert.doesNotMatch(csp, /upgrade-insecure-requests/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.equal(r.headers.get('strict-transport-security'), null, 'yerelde HSTS yok');

    const prodApp = express();
    prodApp.use(helmetMiddleware({ NODE_ENV: 'production', CSP_MODE: 'report-only' }));
    prodApp.get('/', (req, res) => res.send('ok'));
    const p = await call(prodApp, 'GET', '/');
    assert.ok(p.headers.get('strict-transport-security'));
    assert.ok(p.headers.get('content-security-policy-report-only'));
  });

  it('login rate limit: başarısız denemeler sayılır, başarılı sayılmaz', async () => {
    const { login } = authRateLimiters({ AUTH_LOGIN_RATE_MAX: '3' });
    const app = express();
    app.use(express.json());
    app.post('/auth/login', login, (req, res) => {
      if (req.body.ok) return res.json({ ok: true });
      return res.status(401).json({ hata: 'Parola hatalı.' });
    });
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await call(app, 'POST', '/auth/login', { body: { ok: true } })).status, 200);
    }
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await call(app, 'POST', '/auth/login', { body: {} })).status, 401);
    }
    const blocked = await call(app, 'POST', '/auth/login', { body: { ok: true } });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.kod, 'ERR-RATE-LIMIT');
  });

  it('refresh rate limit tüm istekleri sayar', async () => {
    const { refresh } = authRateLimiters({ AUTH_REFRESH_RATE_MAX: '2' });
    const app = express();
    app.post('/auth/refresh', refresh, (req, res) => res.json({ ok: true }));
    assert.equal((await call(app, 'POST', '/auth/refresh')).status, 200);
    assert.equal((await call(app, 'POST', '/auth/refresh')).status, 200);
    assert.equal((await call(app, 'POST', '/auth/refresh')).status, 429);
  });

  it('JSON gövde limiti: global küçük, kullanıcı (profil resmi) ucu büyük', async () => {
    const app = express();
    bodyParsers(app, { JSON_BODY_LIMIT: '1kb', LARGE_JSON_BODY_LIMIT: '20kb' });
    app.post('/items', (req, res) => res.json({ n: JSON.stringify(req.body).length }));
    app.put('/users/1', (req, res) => res.json({ n: JSON.stringify(req.body).length }));
    app.use(errorHandler);
    const big = { profile_image: 'x'.repeat(5000) };
    const r1 = await call(app, 'POST', '/items', { body: big });
    assert.equal(r1.status, 413);
    assert.equal(r1.json.kod, 'ERR-API-413');
    const r2 = await call(app, 'PUT', '/users/1', { body: big });
    assert.equal(r2.status, 200);
    const r3 = await call(app, 'POST', '/items', { raw: '{bozuk' });
    assert.equal(r3.status, 400);
  });

  it('trust proxy: canlıda 1 hop, yerelde kapalı, env ile ayarlanır', () => {
    assert.equal(trustProxySetting({ NODE_ENV: 'production' }), 1);
    assert.equal(trustProxySetting({}), false);
    assert.equal(trustProxySetting({ TRUST_PROXY: '2' }), 2);
    assert.equal(trustProxySetting({ TRUST_PROXY: 'false', NODE_ENV: 'production' }), false);
  });
});

describe('SQL analiz / audit yardımcıları / şema doğrulama', () => {
  it('analyzeSql sunucu fonksiyonlarını ve çoklu ifadeyi engeller', () => {
    const { analyzeSql } = require('../routes/sql_console');
    assert.match(analyzeSql("SELECT pg_read_file('/etc/passwd')").error, /fonksiyon/);
    assert.match(analyzeSql('SELECT pg_sleep(100)').error, /fonksiyon/);
    assert.match(analyzeSql("SELECT dblink_connect('host=10.0.0.1')").error, /fonksiyon/);
    assert.match(analyzeSql('SELECT 1; DELETE FROM users').error, /yalnızca bir/);
    assert.match(analyzeSql('DROP TABLE users').error, /izin yok/);
    assert.equal(analyzeSql('SELECT 1').isSelect, true);
    assert.equal(analyzeSql('UPDATE users SET title = title WHERE id = -1').writeKind, 'update');
  });

  it('sanitizeBody: sırlar maskelenir, satır dizileri öğeleriyle saklanır', () => {
    const s = sanitizeBody({
      user_code: 'A',
      parola: 'x',
      access_token: 'y',
      lines: [{ item_id: 1, qty: 2 }, { item_id: 3, qty: 4 }],
      profile_image: 'data:image/png;base64,AAAA',
    });
    assert.equal(s.parola, '[redacted]');
    assert.equal(s.access_token, '[redacted]');
    assert.equal(s.lines._array_len, 2);
    assert.deepEqual(s.lines.items[1], { item_id: 3, qty: 4 });
    assert.match(s.profile_image, /karakter/);
    const p = sanitizeBody({ parameter_code: 'SMTP_PASS', value: 'gizli' });
    assert.equal(p.value, '[redacted]');
  });

  it('failureAction: başarısız login/yetki/rate-limit eylemleri', () => {
    const req = (method, url, headers = {}) => ({ method, originalUrl: url, get: (h) => headers[h.toLowerCase()] });
    assert.equal(failureAction(req('POST', '/auth/login'), 401), 'LOGIN_FAILED');
    assert.equal(failureAction(req('POST', '/auth/refresh'), 401), 'REFRESH_FAILED');
    assert.equal(failureAction(req('POST', '/auth/login'), 429), 'RATE_LIMITED');
    assert.equal(failureAction(req('GET', '/sql-console/meta'), 403), 'FORBIDDEN');
    assert.equal(failureAction(req('GET', '/items'), 401), null, 'kimlik göndermeyen GET 401 gürültü sayılır');
    assert.equal(failureAction(req('GET', '/items', { authorization: 'Bearer x' }), 401), 'AUTH_FAILED');
    assert.equal(failureAction(req('DELETE', '/invoices/5'), 500), 'DELETE_FAILED');
    assert.equal(failureAction(req('GET', '/items'), 404), null);
  });

  it('criticalTarget + fieldDiff: kritik tablolarda DB önce/sonra farkı', () => {
    assert.deepEqual(criticalTarget({ method: 'PUT', originalUrl: '/invoices/12?x=1' }), { table: 'invoices', id: 12 });
    assert.deepEqual(criticalTarget({ method: 'DELETE', originalUrl: '/kullanicilar/3' }), { table: 'users', id: 3 });
    assert.equal(criticalTarget({ method: 'POST', originalUrl: '/invoices/12' }), null);
    assert.equal(criticalTarget({ method: 'PUT', originalUrl: '/invoices/12/onayla' }), null);
    assert.equal(criticalTarget({ method: 'PUT', originalUrl: '/items/12' }), null);
    const d = fieldDiff({ a: 1, b: 'x', updated_at: 1, password_hash: 'h1' }, { a: 2, b: 'x', updated_at: 2, password_hash: 'h2' });
    assert.deepEqual(d, { a: { old: 1, new: 2 } });
  });

  it('zod şemaları: login / execute / audit sorgusu', () => {
    assert.equal(schemas.login.safeParse({}).success, false);
    assert.equal(schemas.login.safeParse({ username: 'a', password: 'b' }).success, true);
    assert.equal(schemas.sqlExecute.safeParse({ sql: '   ' }).success, false);
    assert.equal(schemas.sqlExecute.safeParse({ sql: 'SELECT 1', txMode: 'hack' }).success, false);
    assert.equal(schemas.auditLogQuery.safeParse({ limit: 'abc' }).success, false);
    assert.equal(schemas.auditLogQuery.safeParse({ limit: '50', record_id: '7' }).data.limit, 50);
    assert.equal(schemas.sqlConnection.safeParse({ host: 'h', database: 'd', user: 'u', port: '99999' }).success, false);
  });
});

describe('SPA — token anahtarı ve XSS kaçışları', () => {
  const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

  it("rapor pencereleri ktb_access_token kullanır, 'owner' fallback yok", () => {
    assert.doesNotMatch(js, /erp_access_token/);
    assert.doesNotMatch(js, /'X-Kullanici-Kodu':[^\n]*\|\|\s*'owner'/);
    assert.match(js, /function reportUserHeader\(\)/);
  });

  it('escAttr tam HTML kaçışı yapar (yalnız " değil)', () => {
    const start = js.indexOf('function escapeHtml(str)');
    const escapeSrc = js.slice(start, js.indexOf('\n}\n', start) + 3);
    const attrStart = js.indexOf('function escapeAttr(str)');
    const attrSrc = js.slice(attrStart, js.indexOf('\n}\n', attrStart) + 3);
    const escStart = js.indexOf('function escAttr(v)');
    const escSrc = js.slice(escStart, js.indexOf('\n}\n', escStart) + 3);
    // eslint-disable-next-line no-new-func
    const escAttr = new Function(`${escapeSrc}\n${attrSrc}\n${escSrc}\nreturn escAttr;`)();
    assert.equal(escAttr('<img src=x onerror=alert(1)>"\''), '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;');
  });

  it('firma seçici ve irsaliye diyaloğu kullanıcı verisini kaçışlar', () => {
    assert.match(js, /firma-adi">\$\{escapeHtml\(f\.company_name/);
    assert.match(js, /value="\$\{escAttr\(rec\.vehicle_plate/);
    assert.match(js, /value="\$\{escAttr\(rec\.driver_name/);
  });

  it('SQL konsolu sunucu bayraklarına göre harici bağlantı düğmelerini gizler', () => {
    assert.match(js, /function sqlApplyServerFlags\(meta\)/);
    assert.match(js, /external_connections/);
  });
});
