/**
 * G-02 — yetki haritası (src/auth/permissionMap.js) ve yetki semantiği birim testleri.
 * Veritabanı gerektirmez.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { extractSpaModules } = require('./helpers/spaModules');
const {
  MODULE_SCREENS,
  SCREEN_ALIASES,
  SCREEN_MODULE,
  ROUTE_POLICIES,
  findRoutePolicy,
  resolvePolicy,
} = require('../src/auth/permissionMap');
const {
  canScreen,
  canModule,
  isFullAccess,
  authorizeRequest,
  requireAdmin,
} = require('../src/middleware/authorize');

const root = path.join(__dirname, '..');

function mountedPrefixes() {
  const src = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
  return [...src.matchAll(/app\.use\(\s*'(\/[^']+)'/g)].map((m) => m[1]);
}

function fakeReq(user, rows, { method = 'GET', path: p = '/' } = {}) {
  return {
    user,
    _screenRows: rows,
    method,
    path: p,
    originalUrl: p,
  };
}

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

function run(mw, req) {
  return new Promise((resolve, reject) => {
    const res = fakeRes();
    const origJson = res.json.bind(res);
    res.json = (b) => { origJson(b); resolve({ passed: false, res }); return res; };
    mw(req, res, (err) => (err ? reject(err) : resolve({ passed: true, res })));
  });
}

const row = (screen_id, flags = {}) => ({
  screen_id, erisim: true, yeni: false, incele: false, duzelt: false, kopyala: false, sil: false, ...flags,
});

const personel = (extra = {}) => ({
  id: 99, user_code: 'P1', group_code: 'SATIS', role: 'Personel', is_active: true, module_permissions: '["satis"]', ...extra,
});

describe('yetki haritası — kapsam', () => {
  it('index.js içindeki her mount prefix’i haritada tanımlı', () => {
    const eksik = mountedPrefixes().filter((p) => !findRoutePolicy(p));
    assert.deepEqual(eksik, [], `Haritada olmayan route: ${eksik.join(', ')}`);
  });

  it('haritadaki her ekran SPA MODULES ile aynı modülde', () => {
    const spa = extractSpaModules();
    const spaScreenModule = {};
    for (const m of spa) {
      for (const id of [...m.sectionScreenIds, ...m.screens.map((s) => s.id)]) spaScreenModule[id] = m.id;
    }
    const backend = Object.entries(SCREEN_MODULE);
    assert.ok(backend.length >= 180, `beklenen ≥180 ekran, gelen ${backend.length}`);
    const uyumsuz = backend.filter(([s, mod]) => spaScreenModule[s] !== mod).map(([s]) => s);
    assert.deepEqual(uyumsuz, [], `SPA ile uyumsuz ekran/modül: ${uyumsuz.join(', ')}`);
    // Menü varyantları (ör. satis-faturalari) yetkiyi SCREEN_ALIASES üzerinden kanonik ekrandan alır
    const eksik = Object.keys(spaScreenModule).filter((s) => !SCREEN_MODULE[SCREEN_ALIASES[s] || s]);
    assert.deepEqual(eksik, [], `Backend haritasında olmayan SPA ekranı: ${eksik.join(', ')}`);
  });

  it('her SPA ekranının kendi endpoint’i o ekrana bağlı (yazma)', () => {
    const hatali = [];
    for (const m of extractSpaModules()) {
      for (const s of m.screens) {
        if (!s.endpoint) continue;
        const pol = resolvePolicy('POST', s.endpoint);
        if (pol.level === 'admin' || pol.level === 'auth') continue;
        if (!pol.screens.includes(s.id)) hatali.push(`${s.id} → ${s.endpoint} (${pol.screens.join('|') || pol.level})`);
      }
    }
    assert.deepEqual(hatali, []);
  });

  it('harita ekranları geçerli ekran kimlikleri', () => {
    const bilinmeyen = ROUTE_POLICIES.flatMap((p) => (p.screens || []).filter((s) => !SCREEN_MODULE[s]));
    assert.deepEqual(bilinmeyen, []);
  });
});

describe('yetki haritası — politika çözümü', () => {
  it('kritik uçlar yönetici ister', () => {
    for (const [m, p] of [
      ['POST', '/kullanicilar'], ['PUT', '/kullanicilar/1'], ['DELETE', '/users/1'],
      ['POST', '/kullanici-gruplari'], ['PUT', '/kullanici-gruplari/1'],
      ['PUT', '/sistem-parametreleri/1'], ['POST', '/sistem-parametreleri'],
      ['POST', '/kod-serileri'], ['PUT', '/kod-serileri/SATIS'], ['DELETE', '/kod-serileri/SATIS'],
      ['GET', '/audit-log'], ['GET', '/sistem-guncelleme'], ['POST', '/sistem-guncelleme/uygula'],
      ['POST', '/lisanslar'],
    ]) {
      assert.equal(resolvePolicy(m, p).level, 'admin', `${m} ${p}`);
    }
  });

  it('belge numarası ayırma uçları oturumlu herkese açık', () => {
    for (const p of ['/kod-serileri/SATIS_SIPARIS/ayir', '/kod-serileri/stok-hareket/ayir', '/kod-serileri/stok-hareket/peek', '/kod-serileri/ayir-prefixed']) {
      assert.equal(resolvePolicy('POST', p).level, 'auth', p);
    }
  });

  it('aksiyon türetme: POST kök=yeni, PUT=duzelt, DELETE=sil, POST alt yol=islem', () => {
    assert.equal(resolvePolicy('POST', '/sales_orders').action, 'yeni');
    assert.equal(resolvePolicy('PUT', '/sales_orders/5').action, 'duzelt');
    assert.equal(resolvePolicy('DELETE', '/sales_orders/5').action, 'sil');
    assert.equal(resolvePolicy('POST', '/sales_orders/5/onayla').action, 'islem');
    assert.equal(resolvePolicy('GET', '/sales_orders').action, null);
  });

  it('en uzun prefix kazanır', () => {
    assert.deepEqual(resolvePolicy('POST', '/fason/siparisler/3/sevk').screens, ['fason-siparisleri', 'fason-operasyon-takip']);
    assert.deepEqual(resolvePolicy('PUT', '/hr-bordro/ucretler/2').screens, ['hr-ucretler']);
    assert.equal(resolvePolicy('GET', '/hr-bordro/ucretler').level, 'module');
  });

  it('haritada olmayan uç tam yetki ister', () => {
    assert.equal(resolvePolicy('GET', '/bilinmeyen-uc').level, 'full');
  });
});

describe('yetki semantiği (SPA screenPermission ile uyumlu)', () => {
  it('ADMIN / Yönetici / modül * tam yetkili', async () => {
    assert.ok(isFullAccess({ group_code: 'ADMIN' }));
    assert.ok(isFullAccess({ role: 'Yonetici', module_permissions: '[]' }));
    assert.ok(isFullAccess({ group_code: 'GENEL', module_permissions: '["*"]' }));
    assert.ok(isFullAccess({ group_code: null, module_permissions: null }), 'grup yok → varsayılan *');
    assert.ok(!isFullAccess(personel()));
    assert.ok(await canScreen(fakeReq({ group_code: 'GENEL', module_permissions: '["*"]' }, [row('x')]), ['hr-ucretler'], 'sil'));
  });

  it('ekran satırı yoksa grup modül listesi belirleyici', async () => {
    const req = fakeReq(personel(), []);
    assert.ok(await canScreen(req, ['satis-siparisleri'], 'sil'));
    assert.ok(!(await canScreen(req, ['hr-ucretler'])));
    assert.ok(await canModule(req, ['satis']));
    assert.ok(!(await canModule(req, ['finans'])));
    const eski = fakeReq(personel({ module_permissions: '["fixed-tanimlar"]' }), []);
    assert.ok(await canScreen(eski, ['para-birimi-tanimi'], 'yeni'), 'fixed-tanimlar → ana-veri');
  });

  it('ekran satırları varsa yalnız satır bayrakları geçerli', async () => {
    const req = fakeReq(personel(), [row('satis-siparisleri', { incele: true, duzelt: true }), row('sales_orders', { sil: false })]);
    assert.ok(await canScreen(req, ['satis-siparisleri']));
    assert.ok(await canScreen(req, ['satis-siparisleri'], 'duzelt'));
    assert.ok(await canScreen(req, ['satis-siparisleri'], 'islem'), 'islem = yeni|duzelt');
    assert.ok(!(await canScreen(req, ['satis-siparisleri'], 'yeni')));
    assert.ok(!(await canScreen(req, ['satis-siparisleri'], 'sil')));
    assert.ok(!(await canScreen(req, ['satis-teklifleri'])));
    assert.ok(await canModule(req, ['satis']));
    assert.ok(!(await canModule(req, ['stok'])));
  });

  it('eski ekran kimliği (alias) satırı tanınır, kopyala yeni sayılır', async () => {
    const req = fakeReq(personel(), [row('sales_orders', { kopyala: true })]);
    assert.ok(await canScreen(req, ['satis-siparisleri'], 'yeni'));
  });

  it('erisim=false satır erişim vermez', async () => {
    const req = fakeReq(personel(), [row('satis-siparisleri', { erisim: false, duzelt: true })]);
    assert.ok(!(await canScreen(req, ['satis-siparisleri'], 'duzelt')));
  });
});

describe('authorizeRequest / requireAdmin', () => {
  const kisitli = () => fakeReq(personel(), [row('satis-siparisleri', { incele: true })]);

  it('yetkisiz yazma 403 YETKI_YOK', async () => {
    const req = Object.assign(kisitli(), { method: 'DELETE', path: '/sales_orders/1', originalUrl: '/sales_orders/1' });
    const { passed, res } = await run(authorizeRequest, req);
    assert.equal(passed, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.kod, 'YETKI_YOK');
    assert.equal(res.body.aksiyon, 'sil');
  });

  it('lookup okuması ve izinli ekran geçer; başka modül reddedilir', async () => {
    const lookup = Object.assign(kisitli(), { method: 'GET', path: '/items', originalUrl: '/items' });
    assert.equal((await run(authorizeRequest, lookup)).passed, true);
    const kendi = Object.assign(kisitli(), { method: 'GET', path: '/sales_orders/3', originalUrl: '/sales_orders/3' });
    assert.equal((await run(authorizeRequest, kendi)).passed, true);
    const ik = Object.assign(kisitli(), { method: 'GET', path: '/hr-personel', originalUrl: '/hr-personel' });
    assert.equal((await run(authorizeRequest, ik)).res.statusCode, 403);
  });

  it('modül * kullanıcı yönetici sayılmaz (kullanıcı/parametre yönetimi)', async () => {
    const req = fakeReq({ id: 7, user_code: 'G', group_code: 'GENEL', module_permissions: '["*"]', is_active: true }, [], {
      method: 'PUT', path: '/kullanicilar/1',
    });
    const { passed, res } = await run(authorizeRequest, req);
    assert.equal(passed, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.gerekli, 'admin');
    const admin = fakeReq({ id: 1, user_code: 'A', group_code: 'ADMIN', is_active: true }, [], { method: 'PUT', path: '/kullanicilar/1' });
    assert.equal((await run(authorizeRequest, admin)).passed, true);
  });

  it('ERP_RBAC_MODE=audit ekran reddini loglayıp geçirir, yönetici kontrolünü geçirmez', async () => {
    const prev = process.env.ERP_RBAC_MODE;
    process.env.ERP_RBAC_MODE = 'audit';
    try {
      const req = Object.assign(kisitli(), { method: 'DELETE', path: '/sales_orders/1', originalUrl: '/sales_orders/1' });
      const r1 = await run(authorizeRequest, req);
      assert.equal(r1.passed, true);
      assert.equal(r1.res.headers['X-Yetki-Uyari'], 'audit-deny');
      const r2 = await run(requireAdmin, fakeReq(personel(), []));
      assert.equal(r2.passed, false);
      assert.equal(r2.res.statusCode, 403);
    } finally {
      if (prev == null) delete process.env.ERP_RBAC_MODE;
      else process.env.ERP_RBAC_MODE = prev;
    }
  });

  it('pasif kullanıcı reddedilir', async () => {
    const req = fakeReq(personel({ is_active: false }), [], { method: 'GET', path: '/items' });
    assert.equal((await run(authorizeRequest, req)).res.statusCode, 403);
  });
});
