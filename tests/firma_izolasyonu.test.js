/**
 * G-03 çoklu firma izolasyonu (IDOR) + P0 #5 demo seed sızıntısı.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();
if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';

const pool = require('../db');
const { request } = require('./helpers/app');
const { SPECS } = require('../src/middleware/firmaKayitKapsami');
const {
  isDemoSeedEnabled,
  isDemoSeedMigration,
  DEMO_SEED_MIGRATIONS,
} = require('../src/bootstrap/demoSeedPolicy');
const { isFirmaAdmin } = require('../src/utils/firmaYetki');

function createIsolatedApp({ central = true } = {}) {
  const { authOptional, authRequired } = require('../src/middleware/authJwt');
  const { companyContext } = require('../src/middleware/firmaContext');
  const { firmaKayitKapsami } = require('../src/middleware/firmaKayitKapsami');
  const app = express();
  app.use(express.json());
  app.use(authOptional);
  app.use(authRequired);
  app.use(companyContext);
  if (central) app.use(firmaKayitKapsami());
  app.use('/companies', require('../routes/companies'));
  app.use('/invoices', require('../routes/invoices'));
  app.use('/satin-alma-teklif-istekleri', require('../routes/rfqs'));
  const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('demo seed politikası (SEED_DEMO_DATA)', () => {
  it('bayrak yoksa kapalı; yalnız SEED_DEMO_DATA=1 açar; AUTO_HEAL=0 her zaman kapatır', () => {
    assert.equal(isDemoSeedEnabled({}), false);
    assert.equal(isDemoSeedEnabled({ NODE_ENV: 'production' }), false);
    assert.equal(isDemoSeedEnabled({ SEED_DEMO_DATA: 'true' }), false);
    assert.equal(isDemoSeedEnabled({ SEED_DEMO_DATA: '1' }), true);
    assert.equal(isDemoSeedEnabled({ SEED_DEMO_DATA: '1', AUTO_HEAL: '0' }), false);
  });

  it('082/083 demo seed migration olarak işaretli ve dosyaları mevcut', () => {
    assert.ok(isDemoSeedMigration('082_ensure_demo_company_profiles.sql'));
    assert.ok(isDemoSeedMigration('083_gida_ornek_master_seed.sql'));
    assert.equal(isDemoSeedMigration('084_production_receipt_detail.sql'), false);
    for (const f of DEMO_SEED_MIGRATIONS) {
      assert.ok(fs.existsSync(path.join(__dirname, '..', 'db', 'migrations', f)), f);
    }
  });

  it('migrate.js demo seed migration’ı bayraksız atlar', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrate.js'), 'utf8');
    assert.match(src, /isDemoSeedMigration\(file\)\s*&&\s*!isDemoSeedEnabled\(\)/);
  });

  it('ensureDemoFirms / ensureDemoData bayraksız hiçbir şey yazmaz', async () => {
    const prev = process.env.SEED_DEMO_DATA;
    delete process.env.SEED_DEMO_DATA;
    try {
      const { ensureDemoFirms } = require('../src/bootstrap/ensureDemoFirms');
      const { ensureDemoData } = require('../src/bootstrap/ensureDemoData');
      const failPool = { connect() { throw new Error('DB’ye dokunmamalı'); }, query() { throw new Error('DB’ye dokunmamalı'); } };
      const a = await ensureDemoFirms(failPool);
      const b = await ensureDemoData(failPool);
      assert.equal(a.skipped, true);
      assert.equal(b.skipped, true);
    } finally {
      if (prev !== undefined) process.env.SEED_DEMO_DATA = prev;
    }
  });

  it('index.js ve companies.js heal çağrısı bayrağa bağlı', () => {
    const idx = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    assert.match(idx, /NODE_ENV !== 'test' && isDemoSeedEnabled\(\)/);
    const comp = fs.readFileSync(path.join(__dirname, '..', 'routes', 'companies.js'), 'utf8');
    assert.match(comp, /if \(!isDemoSeedEnabled\(\)\) return null;/);
  });
});

describe('firma kayıt kapsamı SPEC SQL’leri', () => {
  it('her SPEC sorgusu şemada geçerli', async () => {
    for (const [mount, spec] of Object.entries(SPECS)) {
      try {
        await pool.query(spec.sql, [-1]);
      } catch (err) {
        assert.fail(`${mount}: ${err.message}`);
      }
    }
  });

  it('isFirmaAdmin: ADMIN grubu / yönetici rolü / owner', () => {
    assert.equal(isFirmaAdmin({ group_code: 'ADMIN' }, {}), true);
    assert.equal(isFirmaAdmin({ role: 'Yonetici' }, {}), true);
    assert.equal(isFirmaAdmin({ user_code: 'owner' }, {}), true);
    assert.equal(isFirmaAdmin({ role: 'Personel' }, {}), false);
    assert.equal(isFirmaAdmin({ group_code: 'ADMIN' }, { FIRMA_ADMIN_TUM_FIRMALAR: '0' }), false);
  });
});

describe('çoklu firma izolasyonu (IDOR)', () => {
  const tag = `IZO${Date.now().toString(36).toUpperCase()}`;
  const ids = {};
  let app;
  let appNoCentral;
  const kisitli = () => ({ 'X-Kullanici-Kodu': `${tag}_U` });
  const yonetici = () => ({ 'X-Kullanici-Kodu': `${tag}_Y` });

  before(async () => {
    app = createIsolatedApp();
    appNoCentral = createIsolatedApp({ central: false });
    const q = async (sql, params) => (await pool.query(sql, params)).rows[0];
    ids.A = (await q(`INSERT INTO companies (company_code, company_name) VALUES ($1,$2) RETURNING id`, [`${tag}A`, 'İzolasyon A'])).id;
    ids.B = (await q(`INSERT INTO companies (company_code, company_name) VALUES ($1,$2) RETURNING id`, [`${tag}B`, 'İzolasyon B'])).id;
    ids.user = (await q(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active) VALUES ('Kısıtlı','Kullanıcı',$1,'Personel',TRUE) RETURNING id`,
      [`${tag}_U`]
    )).id;
    ids.admin = (await q(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active) VALUES ('Firma','Yönetici',$1,'yonetici',TRUE) RETURNING id`,
      [`${tag}_Y`]
    )).id;
    await pool.query(`INSERT INTO user_company_permissions (user_id, company_id) VALUES ($1,$2)`, [ids.user, ids.A]);
    ids.partnerB = (await q(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'B Cari',$2) RETURNING id`,
      [`${tag}PB`, ids.B]
    )).id;
    ids.partnerA = (await q(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'A Cari',$2) RETURNING id`,
      [`${tag}PA`, ids.A]
    )).id;
    ids.invB = (await q(
      `INSERT INTO invoices (invoice_no, partner_id, company_id, status) VALUES ($1,$2,$3,'Taslak') RETURNING id`,
      [`${tag}-FB`, ids.partnerB, ids.B]
    )).id;
    ids.invA = (await q(
      `INSERT INTO invoices (invoice_no, partner_id, company_id, status) VALUES ($1,$2,$3,'Taslak') RETURNING id`,
      [`${tag}-FA`, ids.partnerA, ids.A]
    )).id;
    ids.rfqB = (await q(`INSERT INTO rfqs (rfq_no, company_id) VALUES ($1,$2) RETURNING id`, [`${tag}-RB`, ids.B])).id;
    ids.rfqA = (await q(`INSERT INTO rfqs (rfq_no, company_id) VALUES ($1,$2) RETURNING id`, [`${tag}-RA`, ids.A])).id;
  });

  after(async () => {
    const del = (sql, p) => pool.query(sql, p).catch(() => {});
    await del(`DELETE FROM rfqs WHERE id = ANY($1::int[])`, [[ids.rfqA, ids.rfqB]]);
    await del(`DELETE FROM invoice_lines WHERE invoice_id = ANY($1::int[])`, [[ids.invA, ids.invB]]);
    await del(`DELETE FROM invoices WHERE id = ANY($1::int[])`, [[ids.invA, ids.invB]]);
    await del(`DELETE FROM partners WHERE id = ANY($1::int[])`, [[ids.partnerA, ids.partnerB]]);
    await del(`DELETE FROM users WHERE id = ANY($1::int[])`, [[ids.user, ids.admin]]);
    await del(`DELETE FROM companies WHERE id = ANY($1::int[])`, [[ids.A, ids.B]]);
  });

  it('X-Firma-Id yetkisiz firma → 403 FIRMA_YETKI_YOK; yetkili firma → 200', async () => {
    const r = await request(app, 'GET', '/invoices', { headers: { ...kisitli(), 'X-Firma-Id': String(ids.B) } });
    assert.equal(r.status, 403);
    assert.equal(r.json.kod, 'FIRMA_YETKI_YOK');
    const ok = await request(app, 'GET', '/invoices', { headers: { ...kisitli(), 'X-Firma-Id': String(ids.A) } });
    assert.equal(ok.status, 200);
    assert.ok(ok.json.every((f) => Number(f.company_id) === ids.A));
  });

  it('?company_id ve gövde company_id de yetkiye tabi', async () => {
    const q = await request(app, 'GET', `/invoices?company_id=${ids.B}`, { headers: kisitli() });
    assert.equal(q.status, 403);
    const mixed = await request(app, 'GET', `/invoices?company_id=${ids.B}`, {
      headers: { ...kisitli(), 'X-Firma-Id': String(ids.A) },
    });
    assert.equal(mixed.status, 403);
    const body = await request(app, 'POST', '/satin-alma-teklif-istekleri', {
      headers: kisitli(),
      body: { company_id: ids.B, satirlar: [{ item_id: 1, quantity: 1 }] },
    });
    assert.equal(body.status, 403);
  });

  it('başlıksız istekte tek yetkili firma bağlam olur (liste B’yi göstermez)', async () => {
    const r = await request(app, 'GET', '/invoices', { headers: kisitli() });
    assert.equal(r.status, 200);
    const idsSeen = r.json.map((f) => Number(f.id));
    assert.ok(idsSeen.includes(ids.invA));
    assert.ok(!idsSeen.includes(ids.invB));
  });

  it('GET /companies başlıksız: kısıtlı kullanıcı yalnız yetkili firmaları görür', async () => {
    const r = await request(app, 'GET', '/companies', { headers: { ...kisitli(), 'X-Firma-Id': '' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.map((c) => Number(c.id)), [ids.A]);
    const y = await request(app, 'GET', '/companies', { headers: { ...yonetici(), 'X-Firma-Id': '' } });
    const yIds = y.json.map((c) => Number(c.id));
    assert.ok(yIds.includes(ids.A) && yIds.includes(ids.B));
  });

  it('companies/:id başka firma → 404; yönetici seçili firmadan bağımsız erişir', async () => {
    const r = await request(app, 'GET', `/companies/${ids.B}`, { headers: kisitli() });
    assert.equal(r.status, 404);
    assert.equal(r.json.kod, 'FIRMA_KAPSAM');
    const own = await request(app, 'GET', `/companies/${ids.A}`, { headers: kisitli() });
    assert.equal(own.status, 200);
    const y = await request(app, 'GET', `/companies/${ids.B}`, { headers: { ...yonetici(), 'X-Firma-Id': String(ids.A) } });
    assert.equal(y.status, 200);
  });

  it('invoices /:id ve alt aksiyonlar başka firmada 404 FIRMA_KAPSAM; kayıt değişmez', async () => {
    const h = { ...kisitli(), 'X-Firma-Id': String(ids.A) };
    const calls = [
      ['GET', `/invoices/${ids.invB}`],
      ['PUT', `/invoices/${ids.invB}`, { description: 'hack' }],
      ['POST', `/invoices/${ids.invB}/eslestir`, {}],
      ['POST', `/invoices/${ids.invB}/eslestirme-onay`, {}],
      ['POST', `/invoices/${ids.invB}/muhasebelestir`, {}],
      ['GET', `/invoices/${ids.invB}/yazdir`],
      ['POST', `/invoices/${ids.invB}/iade`, {}],
      ['DELETE', `/invoices/${ids.invB}`],
    ];
    for (const [method, url, body] of calls) {
      const r = await request(app, method, url, { headers: h, body });
      assert.equal(r.status, 404, `${method} ${url} → ${r.status}`);
      assert.equal(r.json.kod, 'FIRMA_KAPSAM', `${method} ${url}`);
    }
    const still = await pool.query(`SELECT description FROM invoices WHERE id=$1`, [ids.invB]);
    assert.equal(still.rows.length, 1);
    assert.notEqual(still.rows[0].description, 'hack');
    const iade = await pool.query(`SELECT 1 FROM invoices WHERE source_document_id=$1`, [ids.invB]);
    assert.equal(iade.rows.length, 0);
  });

  it('invoices router.param merkezi middleware olmadan da korur', async () => {
    const r = await request(appNoCentral, 'GET', `/invoices/${ids.invB}`, { headers: kisitli() });
    assert.equal(r.status, 404);
    assert.equal(r.json.kod, 'FIRMA_KAPSAM');
    const own = await request(appNoCentral, 'GET', `/invoices/${ids.invA}`, { headers: kisitli() });
    assert.equal(own.status, 200);
  });

  it('_belgeCrud (teklif istekleri) GET/PUT/DELETE /:id başka firmada 404', async () => {
    for (const a of [app, appNoCentral]) {
      for (const [method, body] of [['GET'], ['PUT', { description: 'hack' }], ['DELETE']]) {
        const r = await request(a, method, `/satin-alma-teklif-istekleri/${ids.rfqB}`, { headers: kisitli(), body });
        assert.equal(r.status, 404, `${method} → ${r.status}`);
        assert.equal(r.json.kod, 'FIRMA_KAPSAM');
      }
    }
    const own = await request(app, 'GET', `/satin-alma-teklif-istekleri/${ids.rfqA}`, { headers: kisitli() });
    assert.equal(own.status, 200);
    const still = await pool.query(`SELECT 1 FROM rfqs WHERE id=$1`, [ids.rfqB]);
    assert.equal(still.rows.length, 1);
  });

  it('yönetici: seçili firma dışı belge 404, seçim yokken erişir', async () => {
    const sel = await request(app, 'GET', `/invoices/${ids.invB}`, { headers: { ...yonetici(), 'X-Firma-Id': String(ids.A) } });
    assert.equal(sel.status, 404);
    const all = await request(app, 'GET', `/invoices/${ids.invB}`, { headers: yonetici() });
    assert.equal(all.status, 200);
  });

  it('firma yetkisi hiç olmayan kısıtlı kullanıcı başka firmanın kaydına erişemez', async () => {
    await pool.query(`DELETE FROM user_company_permissions WHERE user_id=$1`, [ids.user]);
    try {
      const r = await request(app, 'GET', `/invoices/${ids.invA}`, { headers: kisitli() });
      assert.equal(r.status, 404);
      const c = await request(app, 'GET', '/companies', { headers: kisitli() });
      assert.deepEqual(c.json, []);
    } finally {
      await pool.query(`INSERT INTO user_company_permissions (user_id, company_id) VALUES ($1,$2)`, [ids.user, ids.A]);
    }
  });
});

describe('migration 120 — firma yetki geçişi', () => {
  it('mevcut yetkileri korur; boş kullanıcıya depo firmasını ekler; yöneticiye eklemez', async () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '120_firma_yetki_gecis.sql'), 'utf8');
    const tag = `M120${Date.now().toString(36).toUpperCase()}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const one = async (s, p) => (await client.query(s, p)).rows[0];
      const cA = (await one(`INSERT INTO companies (company_code, company_name) VALUES ($1,'M A') RETURNING id`, [`${tag}A`])).id;
      const cB = (await one(`INSERT INTO companies (company_code, company_name) VALUES ($1,'M B') RETURNING id`, [`${tag}B`])).id;
      const plant = (await one(`INSERT INTO plants (company_id, plant_code, plant_name) VALUES ($1,$2,'M P') RETURNING id`, [cB, `${tag}P`])).id;
      const wh = (await one(`INSERT INTO warehouses (plant_id, warehouse_code, warehouse_name) VALUES ($1,$2,'M W') RETURNING id`, [plant, `${tag}W`])).id;
      const mkUser = async (code, role) => (await one(
        `INSERT INTO users (first_name, last_name, user_code, role, is_active) VALUES ('M','U',$1,$2,TRUE) RETURNING id`,
        [code, role]
      )).id;
      const uMevcut = await mkUser(`${tag}_1`, 'Personel');
      const uDepo = await mkUser(`${tag}_2`, 'Personel');
      const uAdmin = await mkUser(`${tag}_3`, 'yonetici');
      await client.query(`INSERT INTO user_company_permissions (user_id, company_id) VALUES ($1,$2)`, [uMevcut, cA]);
      await client.query(`INSERT INTO user_warehouses (user_id, warehouse_id) VALUES ($1,$2), ($3,$2)`, [uDepo, wh, uAdmin]);

      await client.query(sql);

      const perms = async (u) => (await client.query(
        `SELECT company_id FROM user_company_permissions WHERE user_id=$1 ORDER BY company_id`, [u]
      )).rows.map((r) => Number(r.company_id));
      assert.deepEqual(await perms(uMevcut), [cA]);
      assert.deepEqual(await perms(uDepo), [cB]);
      assert.deepEqual(await perms(uAdmin), []);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
