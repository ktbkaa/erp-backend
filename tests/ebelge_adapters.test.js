/**
 * Sağlayıcı adaptör sözleşme testleri: mock, yapılandırılabilir REST (yerel sahte entegratör sunucusu), GİB portal;
 * canlı/test/mock mod kararı. Gerçek GİB/entegratör çağrısı yapılmaz. DB gerektirmez.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const { AdapterError, assertAdapter, SEND_STATUSES, QUERY_STATUSES } = require('../src/services/ebelge/adapters/contract');
const mock = require('../src/services/ebelge/adapters/mockAdapter');
const { createRestAdapter } = require('../src/services/ebelge/adapters/restIntegratorAdapter');
const { createGibPortalAdapter } = require('../src/services/ebelge/adapters/gibPortalAdapter');
const { createAdapter } = require('../src/services/ebelge/adapters');
const { mapGibCode } = require('../src/services/ebelge/adapters/gibStatusCodes');
const { resolveConfig, publicSummary } = require('../src/services/ebelge/config');

const sendArgs = (over = {}) => ({
  documentType: 'INVOICE', profileId: 'TICARIFATURA', uuid: `3f2b8c1e-4d5a-4b6c-9e7f-${String(Date.now()).slice(-12).padStart(12, '0')}`,
  gibNumber: 'EFT2026000000001', xml: '<Invoice>Ğüşİöç</Invoice>', envelopeXml: '<sh:StandardBusinessDocument/>',
  senderAlias: 'urn:mail:defaultgb@a.com', receiverAlias: 'urn:mail:defaultpk@b.com',
  sender: { id: '1234567801', name: 'A' }, receiver: { id: '9876543210', name: 'B' }, ...over,
});

/** Sözleşmeyi her adaptör için aynı biçimde doğrular. */
async function contractSuite(adapter, { uuid }) {
  assertAdapter(adapter);
  const s = await adapter.send(sendArgs({ uuid }));
  assert.ok(SEND_STATUSES.includes(s.status), `send.status ${s.status}`);
  const q = await adapter.queryStatus({ documentType: 'INVOICE', uuid, providerRef: s.providerRef, profileId: 'TICARIFATURA' });
  assert.ok(QUERY_STATUSES.includes(q.status), `queryStatus.status ${q.status}`);
  assert.equal(typeof q.final, 'boolean');
  const u = await adapter.checkUser({ taxId: '9876543210', documentKind: 'EFATURA' });
  assert.ok(u.registered === null || typeof u.registered === 'boolean');
  assert.ok(Array.isArray(u.aliases));
  return { s, q, u };
}

describe('adaptör sözleşmesi: mock', () => {
  before(() => mock.reset());
  it('send → Gonderildi; TICARI: Tamamlandi → Kabul; mükerrer ETTN GIB_1163', async () => {
    const a = mock.createMockAdapter();
    const uuid = '11111111-2222-4333-8444-555555555555';
    const { s, q } = await contractSuite(a, { uuid });
    assert.equal(s.status, 'Gonderildi');
    assert.equal(q.status, 'Tamamlandi');
    assert.equal(q.final, false);
    const q2 = await a.queryStatus({ uuid });
    assert.equal(q2.status, 'Kabul');
    assert.equal(q2.final, true);
    await assert.rejects(a.send(sendArgs({ uuid })), (e) => e instanceof AdapterError && e.code === 'GIB_1163');
  });
  it('yapılandırılabilir hata: geçici (retryable) ve kalıcı; e-Fatura iptali desteklenmez, e-Arşiv iptal edilir', async () => {
    const a = mock.createMockAdapter();
    mock.configure({ failNext: [{ op: 'send', retryable: true, message: 'bakımda' }, { op: 'send', retryable: false }] });
    await assert.rejects(a.send(sendArgs()), (e) => e.retryable === true);
    await assert.rejects(a.send(sendArgs()), (e) => e.retryable === false);
    const uuid = '11111111-2222-4333-8444-555555555556';
    await a.send(sendArgs({ uuid, profileId: 'TICARIFATURA' }));
    await assert.rejects(a.cancel({ uuid }), (e) => e.code === 'EBELGE_IPTAL_DESTEK_YOK');
    const ea = '11111111-2222-4333-8444-555555555557';
    await a.send(sendArgs({ uuid: ea, profileId: 'EARSIVFATURA' }));
    assert.equal((await a.cancel({ uuid: ea, reason: 'hatalı' })).ok, true);
    mock.configure({ users: { 9876543210: ['urn:mail:defaultpk@b.com'] } });
    assert.deepEqual((await a.checkUser({ taxId: '9876543210' })).aliases, [{ alias: 'urn:mail:defaultpk@b.com' }]);
  });
});

describe('adaptör sözleşmesi: REST özel entegratör (sahte sunucu)', () => {
  let server;
  let base;
  const seen = [];
  const docs = new Map();
  let mode = 'ok';
  before(async () => {
    server = http.createServer(async (req, res) => {
      let body = '';
      for await (const c of req) body += c;
      const json = body ? JSON.parse(body) : null;
      seen.push({ method: req.method, url: req.url, headers: req.headers, body: json });
      const reply = (status, obj) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (mode === '503') return reply(503, { message: 'bakım' });
      if (mode === '429') return reply(429, { message: 'yavaş' });
      if (mode === 'slow') return setTimeout(() => reply(200, {}), 400);
      if (req.url === '/api/oturum' && req.method === 'POST') {
        if (json.username !== 'test-user' || json.password !== 'test-pass') return reply(401, { message: 'kimlik' });
        return reply(200, { data: { jwt: 'tok-123', ttl: 3600 } });
      }
      if (req.headers.authorization !== 'Bearer tok-123') return reply(401, { message: 'yetkisiz' });
      if (req.url === '/api/belgeler' && req.method === 'POST') {
        if (json.documentNumber === 'BAD2026000000001') return reply(200, { sonuc: { kod: '1150', aciklama: 'şema hatası' } });
        if (json.documentNumber === 'DUP2026000000001') return reply(422, { sonuc: { aciklama: 'geçersiz' } });
        docs.set(json.uuid, json);
        return reply(200, { belgeId: `R-${docs.size}`, sonuc: { kod: '1000', aciklama: 'kuyruğa alındı' } });
      }
      const st = req.url.match(/^\/api\/belgeler\/([^/]+)\/durum$/);
      if (st) return reply(200, { sonuc: { kod: docs.has(decodeURIComponent(st[1])) ? 'ONAY' : '1300', aciklama: 'ok' } });
      if (req.url.startsWith('/api/mukellef/')) return reply(200, { kayitli: true, etiketler: [{ alias: 'urn:mail:defaultpk@b.com', title: 'B A.Ş.' }] });
      const cn = req.url.match(/^\/api\/belgeler\/([^/]+)\/iptal$/);
      if (cn) return reply(200, { sonuc: { kod: 'IPTAL', aciklama: 'iptal edildi' } });
      return reply(404, { message: 'yok' });
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((r) => server.close(r)));

  const endpoints = {
    token: '/api/oturum', send: '/api/belgeler', status: '/api/belgeler/{uuid}/durum', cancel: '/api/belgeler/{uuid}/iptal',
    checkUser: '/api/mukellef/{taxId}?tur={documentKind}',
    fields: { token: 'data.jwt', expiresIn: 'data.ttl', providerRef: 'belgeId', statusCode: 'sonuc.kod', statusMessage: 'sonuc.aciklama', registered: 'kayitli', aliases: 'etiketler' },
    statusMap: { ONAY: 'Kabul' },
  };
  const make = (over = {}) => createRestAdapter({ mode: 'test', baseUrl: base, auth: 'token', credentials: { username: 'test-user', password: 'test-pass' }, endpoints, timeoutMs: 2000, ...over });

  it('token alır, XML base64 + sha256 gönderir, alan eşlemesi ve statusMap uygular', async () => {
    mode = 'ok';
    const a = make();
    const uuid = '21111111-2222-4333-8444-555555555555';
    const { s, q, u } = await contractSuite(a, { uuid });
    assert.equal(s.status, 'Gonderildi');
    assert.equal(s.providerRef, 'R-1');
    assert.equal(s.statusCode, '1000');
    assert.equal(q.status, 'Kabul');
    assert.equal(q.final, true);
    assert.equal(u.registered, true);
    assert.equal(u.aliases[0].alias, 'urn:mail:defaultpk@b.com');
    const post = seen.find((x) => x.url === '/api/belgeler');
    assert.equal(Buffer.from(post.body.content, 'base64').toString('utf8'), '<Invoice>Ğüşİöç</Invoice>');
    assert.match(post.body.sha256, /^[a-f0-9]{64}$/);
    assert.ok(post.body.envelope);
    assert.equal(seen.filter((x) => x.url === '/api/oturum').length, 1, 'token önbelleğe alınır');
    assert.ok(!JSON.stringify(seen.filter((x) => x.url !== '/api/oturum')).includes('test-pass'), 'şifre yalnız token isteğinde');
  });

  it('GİB hata kodu (1150) kalıcı hata; 4xx kalıcı; 5xx/429/zaman aşımı geçici', async () => {
    mode = 'ok';
    const a = make();
    await assert.rejects(a.send(sendArgs({ gibNumber: 'BAD2026000000001' })), (e) => e.code === 'GIB_1150' && e.retryable === false);
    await assert.rejects(a.send(sendArgs({ gibNumber: 'DUP2026000000001' })), (e) => e.httpStatus === 422 && e.retryable === false);
    mode = '503';
    await assert.rejects(a.send(sendArgs()), (e) => e.httpStatus === 503 && e.retryable === true);
    mode = '429';
    await assert.rejects(a.send(sendArgs()), (e) => e.httpStatus === 429 && e.retryable === true);
    mode = 'slow';
    await assert.rejects(make({ timeoutMs: 100 }).send(sendArgs()), (e) => e.code === 'EBELGE_ZAMAN_ASIMI' && e.retryable === true);
    mode = 'ok';
    await assert.rejects(make({ credentials: { username: 'x', password: 'y' } }).send(sendArgs()), (e) => e.httpStatus === 401 && e.retryable === false);
    await assert.rejects(make({ baseUrl: 'http://127.0.0.1:9' }).send(sendArgs()), (e) => e.code === 'EBELGE_AG_HATASI' && e.retryable === true);
  });

  it('apikey ve basic kimlik doğrulama başlıkları', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push(init.headers);
      return new Response(JSON.stringify({ id: 'X', status: { code: '1000' } }), { status: 200 });
    };
    await createRestAdapter({ mode: 'test', baseUrl: 'https://e.example', auth: 'apikey', credentials: { apiKey: 'k1' }, fetchImpl }).send(sendArgs());
    await createRestAdapter({ mode: 'test', baseUrl: 'https://e.example', auth: 'basic', credentials: { username: 'u', password: 'p' }, fetchImpl }).send(sendArgs());
    assert.equal(calls[0]['X-API-Key'], 'k1');
    assert.equal(calls[1].Authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  });
});

describe('adaptör sözleşmesi: GİB portal (manuel)', () => {
  it('asla kendiliğinden Gonderildi yazmaz; iptal portalda', async () => {
    const a = createGibPortalAdapter({ mode: 'test' });
    const { s, q } = await contractSuite(a, { uuid: '31111111-2222-4333-8444-555555555555' });
    assert.equal(s.status, 'ManuelBekliyor');
    assert.equal(q.status, 'ManuelBekliyor');
    await assert.rejects(a.cancel({}), (e) => e.code === 'EBELGE_IPTAL_DESTEK_YOK');
  });
});

describe('GİB durum kodları', () => {
  it('1000-1300 eşlemesi', () => {
    assert.equal(mapGibCode('1300').status, 'Tamamlandi');
    assert.equal(mapGibCode('1150').status, 'Hata');
    assert.equal(mapGibCode('KABUL').status, 'Kabul');
    assert.equal(mapGibCode('RED').status, 'Red');
  });
});

describe('mod kararı (GIB_CANLI + kimlik bilgileri)', () => {
  /** system_parameters okumalarını taklit eden sahte istemci (DB'ye dokunmaz). */
  const fakeClient = (params) => ({
    async query(sql, args) {
      if (/system_parameters/.test(sql)) return { rows: params[args[0]] != null ? [{ value: params[args[0]] }] : [] };
      return { rows: [] };
    },
  });
  const liveEnv = { EBELGE_REST_BASE_URL: 'https://api.entegrator.example', EBELGE_REST_USERNAME: 'u', EBELGE_REST_PASSWORD: 'p' };

  it('GIB_CANLI=Hayir + MOCK → mock; REST + test kimlikleri → test', async () => {
    assert.equal((await resolveConfig(fakeClient({ GIB_CANLI: 'Hayir' }), { env: {} })).mode, 'mock');
    const t = await resolveConfig(fakeClient({ GIB_CANLI: 'Hayir', EBELGE_SAGLAYICI: 'REST' }), {
      env: { EBELGE_REST_TEST_BASE_URL: 'https://test.entegrator.example', EBELGE_REST_TEST_USERNAME: 'tu', EBELGE_REST_TEST_PASSWORD: 'tp' },
    });
    assert.equal(t.mode, 'test');
    assert.equal(t.rest.baseUrl, 'https://test.entegrator.example');
    const noTest = await resolveConfig(fakeClient({ GIB_CANLI: 'Hayir', EBELGE_SAGLAYICI: 'REST' }), { env: {} });
    assert.equal(noTest.mode, 'mock', 'test kimliği yoksa yerel mock');
  });

  it('GIB_CANLI=Evet + kimlik eksik → engelli (mock yok); createAdapter fırlatır', async () => {
    const c = await resolveConfig(fakeClient({ GIB_CANLI: 'Evet', EBELGE_SAGLAYICI: 'REST' }), { env: { EBELGE_REST_BASE_URL: 'https://api.entegrator.example' } });
    assert.equal(c.liveBlocked, true);
    assert.equal(c.mode, 'mock');
    assert.ok(c.missingLive.includes('EBELGE_REST_USERNAME') && c.missingLive.includes('EBELGE_REST_PASSWORD'));
    assert.throws(() => createAdapter(c), (e) => e.code === 'EBELGE_CANLI_KIMLIK_EKSIK');
    const m = await resolveConfig(fakeClient({ GIB_CANLI: 'Evet' }), { env: liveEnv });
    assert.equal(m.liveBlocked, true, 'MOCK sağlayıcı canlıda kullanılamaz');
    const insecure = await resolveConfig(fakeClient({ GIB_CANLI: 'Evet', EBELGE_SAGLAYICI: 'REST' }), { env: { ...liveEnv, EBELGE_REST_BASE_URL: 'http://api.entegrator.example' } });
    assert.equal(insecure.liveBlocked, true, 'canlıda https zorunlu');
  });

  it('GIB_CANLI=Evet + kimlik tamam → live REST adaptörü; özet sır içermez', async () => {
    const c = await resolveConfig(fakeClient({ GIB_CANLI: 'Evet', EBELGE_SAGLAYICI: 'REST' }), { env: liveEnv });
    assert.equal(c.mode, 'live');
    assert.equal(c.liveBlocked, false);
    const a = createAdapter(c);
    assert.equal(a.code, 'REST');
    assert.equal(a.mode, 'live');
    const s = JSON.stringify(publicSummary(c));
    assert.ok(!s.includes('"p"') && !s.includes(':"u"'), s);
  });
});
