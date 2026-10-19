const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');

describe('auth JWT', () => {
  let app, pool;
  before(() => {
    ({ app, pool } = createApp());
  });

  it('login access_token döner', async () => {
    // En az bir kullanıcı
    await pool.query(
      `INSERT INTO kisiler (ad, soyad, kullanici_kodu, aktif)
       VALUES ('Test','User','TEST_AUTH',TRUE)
       ON CONFLICT DO NOTHING`
    ).catch(async () => {
      await pool.query(
        `UPDATE kisiler SET aktif=TRUE WHERE kullanici_kodu='TEST_AUTH'`
      ).catch(() => {});
    });
    // kullanici_kodu unique olmayabilir — upsert manuel
    const u = await pool.query(`SELECT id FROM kisiler WHERE kullanici_kodu='TEST_AUTH'`);
    if (!u.rows[0]) {
      await pool.query(
        `INSERT INTO kisiler (ad, soyad, kullanici_kodu, aktif) VALUES ('Test','User','TEST_AUTH',TRUE)`
      );
    }

    const res = await request(app, 'POST', '/auth/login', {
      body: { kullanici_kodu: 'TEST_AUTH' },
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.access_token, 'access_token olmalı');
    assert.ok(res.json.refresh_token, 'refresh_token olmalı');
  });

  it('AUTH_ZORUNLU iken header spoof 401', async () => {
    await pool.query(
      `UPDATE sistem_parametreleri SET deger='Evet' WHERE parametre_kodu='AUTH_ZORUNLU'`
    );
    try {
      const res = await request(app, 'GET', '/kokpit/ozet', {
        headers: { 'X-Kullanici-Kodu': 'TEST_AUTH' },
      });
      assert.ok(res.status === 401 || res.status === 403, `beklenen 401/403, gelen ${res.status}`);
    } finally {
      await pool.query(
        `UPDATE sistem_parametreleri SET deger='Hayir' WHERE parametre_kodu='AUTH_ZORUNLU'`
      );
    }
  });

  it('JWT ile kokpit 200', async () => {
    const login = await request(app, 'POST', '/auth/login', {
      body: { kullanici_kodu: 'TEST_AUTH' },
    });
    const res = await request(app, 'GET', '/kokpit/ozet', {
      headers: { Authorization: `Bearer ${login.json.access_token}` },
    });
    assert.equal(res.status, 200);
    assert.equal(typeof res.json.acik_satis_siparis, 'number');
  });
});
