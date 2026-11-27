/**
 * G-01 (parolasız giriş / parola-ayarla / logout / me) ve G-02 (backend rol/ekran
 * yetkilendirmesi) — zorunlu JWT modunda uçtan uca API testleri.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');
const { hashParola } = require('../src/utils/parola');
const { signAccess } = require('../src/utils/jwt');

const P = 'Parola-1234';
const KODLAR = ['YT_ADMIN', 'YT_TAM', 'YT_KISITLI', 'YT_PAROLASIZ', 'YT_PASIF'];

describe('G-01 / G-02 auth + yetki API', () => {
  let app;
  let pool;
  const ids = {};
  const token = {};
  let prevSoft;
  let prevReq;
  let paramId;

  async function upsertUser(kod, { group = null, role = 'Personel', parola = P, aktif = true } = {}) {
    await pool.query(`DELETE FROM users WHERE user_code=$1 OR username=$1`, [kod]);
    const r = await pool.query(
      `INSERT INTO users (first_name, last_name, user_code, username, group_code, role, is_active, password_hash)
       VALUES ('Yetki','Test',$1,$1,$2,$3,$4,$5) RETURNING id`,
      [kod, group, role, aktif, parola ? hashParola(parola) : null]
    );
    ids[kod] = r.rows[0].id;
  }

  async function login(kod, parola = P) {
    return request(app, 'POST', '/auth/login', { body: { username: kod, parola } });
  }

  const bearer = (kod) => ({ Authorization: `Bearer ${token[kod]}` });

  before(async () => {
    ({ app, pool } = createApp());
    prevSoft = process.env.ERP_AUTH_SOFT;
    prevReq = process.env.ERP_AUTH_REQUIRED;
    delete process.env.ERP_AUTH_SOFT;
    process.env.ERP_AUTH_REQUIRED = 'true';

    for (const [code, mods] of [['YT_TAM_GRP', '["*"]'], ['YT_KISITLI_GRP', '["satis"]']]) {
      await pool.query(
        `INSERT INTO user_groups (group_code, group_name, is_active, module_permissions, warehouse_permissions, can_approve_purchase)
         VALUES ($1,$1,TRUE,$2,'["*"]',FALSE)
         ON CONFLICT (group_code) DO UPDATE SET module_permissions=EXCLUDED.module_permissions, is_active=TRUE, can_approve_purchase=FALSE`,
        [code, mods]
      );
    }
    await upsertUser('YT_ADMIN', { group: 'ADMIN' });
    await upsertUser('YT_TAM', { group: 'YT_TAM_GRP' });
    await upsertUser('YT_KISITLI', { group: 'YT_KISITLI_GRP' });
    await upsertUser('YT_PAROLASIZ', { group: 'YT_TAM_GRP', parola: null });
    await upsertUser('YT_PASIF', { group: 'YT_TAM_GRP' });
    await pool.query(
      `INSERT INTO user_screen_permissions (user_id, screen_id, erisim, can_create, incele, duzelt, kopyala, sil)
       VALUES ($1,'satis-siparisleri',TRUE,FALSE,TRUE,FALSE,FALSE,FALSE)`,
      [ids.YT_KISITLI]
    );
    const pr = await pool.query(
      `INSERT INTO system_parameters (parameter_code, parameter_name, value, module, is_active)
       VALUES ('YT_SMTP_PASS','Test gizli','cok-gizli-deger','Sistem',TRUE)
       ON CONFLICT DO NOTHING RETURNING id`
    );
    paramId = pr.rows[0]?.id
      || (await pool.query(`SELECT id FROM system_parameters WHERE parameter_code='YT_SMTP_PASS'`)).rows[0].id;
    await pool.query(`UPDATE system_parameters SET value='cok-gizli-deger' WHERE id=$1`, [paramId]);

    for (const kod of ['YT_ADMIN', 'YT_TAM', 'YT_KISITLI', 'YT_PASIF']) {
      const r = await login(kod);
      assert.equal(r.status, 200, `${kod} login: ${JSON.stringify(r.json)}`);
      token[kod] = r.json.access_token;
    }
  });

  after(async () => {
    await pool.query(`DELETE FROM users WHERE user_code = ANY($1::text[])`, [KODLAR]);
    await pool.query(`DELETE FROM user_groups WHERE group_code IN ('YT_TAM_GRP','YT_KISITLI_GRP')`);
    await pool.query(`DELETE FROM system_parameters WHERE parameter_code='YT_SMTP_PASS'`);
    if (prevSoft == null) delete process.env.ERP_AUTH_SOFT; else process.env.ERP_AUTH_SOFT = prevSoft;
    if (prevReq == null) delete process.env.ERP_AUTH_REQUIRED; else process.env.ERP_AUTH_REQUIRED = prevReq;
  });

  describe('G-01', () => {
    it('parolasız kullanıcı herhangi bir parola ile giriş yapamaz', async () => {
      for (const parola of ['x', 'herhangi', undefined]) {
        const r = await login('YT_PAROLASIZ', parola);
        assert.equal(r.status, 401, `parola=${parola}`);
        assert.ok(!r.json.access_token);
      }
    });

    it('parola-ayarla oturumsuz 401, başkasına 403; yönetici atayabilir', async () => {
      const anon = await request(app, 'POST', '/auth/parola-ayarla', {
        body: { user_code: 'YT_PAROLASIZ', yeni_parola: 'Ele-gecir-123' },
      });
      assert.equal(anon.status, 401);
      const baskasi = await request(app, 'POST', '/auth/parola-ayarla', {
        headers: bearer('YT_TAM'),
        body: { user_code: 'YT_PAROLASIZ', yeni_parola: 'Ele-gecir-123' },
      });
      assert.equal(baskasi.status, 403);
      const kisa = await request(app, 'POST', '/auth/parola-ayarla', {
        headers: bearer('YT_ADMIN'),
        body: { user_code: 'YT_PAROLASIZ', yeni_parola: 'kisa' },
      });
      assert.equal(kisa.status, 400);
      const admin = await request(app, 'POST', '/auth/parola-ayarla', {
        headers: bearer('YT_ADMIN'),
        body: { user_code: 'YT_PAROLASIZ', yeni_parola: 'Yeni-Parola-9' },
      });
      assert.equal(admin.status, 200);
      assert.equal((await login('YT_PAROLASIZ', 'Yeni-Parola-9')).status, 200);
    });

    it('kendi parolası: mevcut parola doğrulanır', async () => {
      const yanlis = await request(app, 'POST', '/auth/parola-ayarla', {
        headers: bearer('YT_TAM'),
        body: { parola: 'yanlis', yeni_parola: 'Baska-Parola-1' },
      });
      assert.equal(yanlis.status, 403);
      const dogru = await request(app, 'POST', '/auth/parola-ayarla', {
        headers: bearer('YT_TAM'),
        body: { parola: P, yeni_parola: P },
      });
      assert.equal(dogru.status, 200);
    });

    it('logout gövdedeki user_code ile başkasının oturumunu düşürmez', async () => {
      const l = await login('YT_KISITLI');
      const out = await request(app, 'POST', '/auth/logout', { body: { user_code: 'YT_KISITLI' } });
      assert.equal(out.status, 200);
      const ref = await request(app, 'POST', '/auth/refresh', { body: { refresh_token: l.json.refresh_token } });
      assert.equal(ref.status, 200, 'refresh hâlâ geçerli olmalı');
      const kendi = await request(app, 'POST', '/auth/logout', { body: { refresh_token: l.json.refresh_token } });
      assert.equal(kendi.status, 200);
      const ref2 = await request(app, 'POST', '/auth/refresh', { body: { refresh_token: l.json.refresh_token } });
      assert.equal(ref2.status, 401);
    });

    it('/auth/me bozuk/süresi dolmuş token 401 (500 değil); zorunlu modda header kimliği yok', async () => {
      const bozuk = await request(app, 'GET', '/auth/me', { headers: { Authorization: 'Bearer bozuk.token.x' } });
      assert.equal(bozuk.status, 401);
      const expired = signAccess({ user_code: 'YT_TAM', id: ids.YT_TAM }, -1);
      const eski = await request(app, 'GET', '/auth/me', { headers: { Authorization: `Bearer ${expired}` } });
      assert.equal(eski.status, 401);
      const hdr = await request(app, 'GET', '/auth/me', { headers: { 'X-Kullanici-Kodu': 'YT_ADMIN' } });
      assert.equal(hdr.status, 401);
      const ok = await request(app, 'GET', '/auth/me', { headers: bearer('YT_TAM') });
      assert.equal(ok.status, 200);
      assert.equal(ok.json.user_code, 'YT_TAM');
    });

    it('pasifleştirilen kullanıcının mevcut token’ı geçersiz', async () => {
      await pool.query(`UPDATE users SET is_active=FALSE WHERE id=$1`, [ids.YT_PASIF]);
      const r = await request(app, 'GET', '/items', { headers: bearer('YT_PASIF') });
      assert.equal(r.status, 401);
      const me = await request(app, 'GET', '/auth/me', { headers: bearer('YT_PASIF') });
      assert.equal(me.status, 401);
    });
  });

  describe('G-02', () => {
    it('yönetici olmayan kullanıcı kendini ADMIN yapamaz; yönetici yapabilir', async () => {
      const r = await request(app, 'PUT', `/kullanicilar/${ids.YT_TAM}`, {
        headers: bearer('YT_TAM'),
        body: { group_code: 'ADMIN' },
      });
      assert.equal(r.status, 403);
      const g = await pool.query(`SELECT group_code FROM users WHERE id=$1`, [ids.YT_TAM]);
      assert.equal(g.rows[0].group_code, 'YT_TAM_GRP');
      const a = await request(app, 'PUT', `/kullanicilar/${ids.YT_TAM}`, {
        headers: bearer('YT_ADMIN'),
        body: { title: 'Uzman' },
      });
      assert.equal(a.status, 200);
      const yeni = await request(app, 'POST', '/kullanicilar', {
        headers: bearer('YT_KISITLI'),
        body: { first_name: 'X', last_name: 'Y', user_code: 'YT_SALDIRGAN', group_code: 'ADMIN' },
      });
      assert.equal(yeni.status, 403);
    });

    it('kullanıcı listesi lookup olarak açık; başkasının kartı ekran yetkisi ister', async () => {
      assert.equal((await request(app, 'GET', '/kullanicilar', { headers: bearer('YT_KISITLI') })).status, 200);
      assert.equal((await request(app, 'GET', `/kullanicilar/${ids.YT_KISITLI}`, { headers: bearer('YT_KISITLI') })).status, 200);
      assert.equal((await request(app, 'GET', `/kullanicilar/${ids.YT_ADMIN}`, { headers: bearer('YT_KISITLI') })).status, 403);
    });

    it('kullanıcı grupları: yazma yalnız yönetici; ADMIN grubu korunur', async () => {
      const grp = await pool.query(`SELECT id FROM user_groups WHERE group_code='YT_KISITLI_GRP'`);
      const r = await request(app, 'PUT', `/kullanici-gruplari/${grp.rows[0].id}`, {
        headers: bearer('YT_TAM'),
        body: { module_permissions: ['*'] },
      });
      assert.equal(r.status, 403);
      const admin = await pool.query(`SELECT id FROM user_groups WHERE group_code='ADMIN'`);
      const k = await request(app, 'PUT', `/kullanici-gruplari/${admin.rows[0].id}`, {
        headers: bearer('YT_ADMIN'),
        body: { is_active: false },
      });
      assert.equal(k.status, 409);
      const d = await request(app, 'DELETE', `/kullanici-gruplari/${admin.rows[0].id}`, { headers: bearer('YT_ADMIN') });
      assert.equal(d.status, 409);
    });

    it('sistem parametreleri: gizli değer maskeli, yazma yalnız yönetici, maske geri yazılmaz', async () => {
      const list = await request(app, 'GET', '/sistem-parametreleri', { headers: bearer('YT_ADMIN') });
      assert.equal(list.status, 200);
      const row = list.json.find((x) => x.parameter_code === 'YT_SMTP_PASS');
      assert.equal(row.value, '********');
      assert.equal(row.is_secret, true);
      assert.ok(!JSON.stringify(list.json).includes('cok-gizli-deger'));
      const one = await request(app, 'GET', `/sistem-parametreleri/${paramId}`, { headers: bearer('YT_TAM') });
      assert.equal(one.json.value, '********');

      const yasak = await request(app, 'PUT', `/sistem-parametreleri/${paramId}`, {
        headers: bearer('YT_TAM'),
        body: { value: 'degisti' },
      });
      assert.equal(yasak.status, 403);
      const mask = await request(app, 'PUT', `/sistem-parametreleri/${paramId}`, {
        headers: bearer('YT_ADMIN'),
        body: { value: '********', description: 'aciklama' },
      });
      assert.equal(mask.status, 200);
      const db = await pool.query(`SELECT value FROM system_parameters WHERE id=$1`, [paramId]);
      assert.equal(db.rows[0].value, 'cok-gizli-deger');
      assert.equal((await request(app, 'GET', '/sistem-parametreleri', { headers: bearer('YT_KISITLI') })).status, 403);
    });

    it('ekran bayrakları backend’de zorlanır (kısıtlı kullanıcı)', async () => {
      const h = bearer('YT_KISITLI');
      assert.equal((await request(app, 'GET', '/sales_orders', { headers: h })).status, 200);
      assert.equal((await request(app, 'GET', '/items', { headers: h })).status, 200, 'lookup kaynağı');
      const yeni = await request(app, 'POST', '/sales_orders', { headers: h, body: {} });
      assert.equal(yeni.status, 403);
      assert.equal(yeni.json.aksiyon, 'yeni');
      const sil = await request(app, 'DELETE', '/sales_orders/999999', { headers: h });
      assert.equal(sil.status, 403);
      assert.equal((await request(app, 'GET', '/finans-yaslandirma', { headers: h })).status, 403);
      assert.equal((await request(app, 'DELETE', '/partners/999999', { headers: h })).status, 403);
      const tam = await request(app, 'DELETE', '/sales_orders/999999', { headers: bearer('YT_TAM') });
      assert.notEqual(tam.status, 403, 'modül * kullanıcı ekran işlemlerinde tam yetkili kalır');
    });

    it('audit-log ve sistem-güncelleme yalnız yönetici', async () => {
      assert.equal((await request(app, 'GET', '/audit-log', { headers: bearer('YT_TAM') })).status, 403);
      assert.equal((await request(app, 'GET', '/audit-log?limit=1', { headers: bearer('YT_ADMIN') })).status, 200);
      assert.equal((await request(app, 'GET', '/sistem-guncelleme', { headers: bearer('YT_TAM') })).status, 403);
      assert.equal((await request(app, 'POST', '/sistem-guncelleme/uygula', { headers: bearer('YT_TAM'), body: {} })).status, 403);
    });

    it('numaratör: yapı yönetici, numara ayırma herkes', async () => {
      const yeni = await request(app, 'POST', '/kod-serileri', {
        headers: bearer('YT_TAM'),
        body: { series_code: 'YT_SERI', prefix: 'YT', description: 'test' },
      });
      assert.equal(yeni.status, 403);
      const ayir = await request(app, 'POST', '/kod-serileri/YT_OLMAYAN/ayir', { headers: bearer('YT_KISITLI'), body: {} });
      assert.notEqual(ayir.status, 403);
    });

    it('fatura force=1 ve manuel 3-way onayı yetki ister', async () => {
      const f = await request(app, 'POST', '/invoices/999999/muhasebelestir?force=1', { headers: bearer('YT_TAM'), body: {} });
      assert.equal(f.status, 403);
      const fa = await request(app, 'POST', '/invoices/999999/muhasebelestir?force=1', { headers: bearer('YT_ADMIN'), body: {} });
      assert.equal(fa.status, 404);
      const e = await request(app, 'POST', '/invoices/999999/eslestirme-onay', { headers: bearer('YT_TAM'), body: {} });
      assert.equal(e.status, 403);
    });
  });
});
