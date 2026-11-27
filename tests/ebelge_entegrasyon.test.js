/**
 * e-Belge uçtan uca (DB + HTTP): hazırla → XML/zarf doğrula → kuyruk → gönder (mock sandbox) → durum → arşiv → PDF → iptal/iade;
 * yeniden deneme kuyruğu, canlı mod kilidi, numara serisi, arşiv/olay değişmezliği.
 * Gerçek GİB/entegratör çağrısı yoktur (mock adaptör); canlı mod yalnız işlem içinde denenip geri alınır.
 */
require('dotenv').config();
if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const pool = require('../db');
const { request } = require('./helpers/app');
const db = require('./helpers/ebelgeDb');
const svc = require('../src/services/eBelgeAdapterService');
const mock = require('../src/services/ebelge/adapters/mockAdapter');
const { validate, ID_RE } = require('../src/services/ebelge/validator');
const { nextGibNumber } = require('../src/services/ebelge/numbering');
const { withTransaction } = require('../src/utils/withTransaction');

function createApp() {
  const { authOptional, authRequired } = require('../src/middleware/authJwt');
  const app = express();
  app.use(express.json());
  app.use(authOptional);
  app.use(authRequired);
  app.use('/e-belge', require('../routes/e_belge'));
  app.use('/invoices', require('../routes/invoices'));
  app.use('/delivery_notes', require('../routes/delivery_notes'));
  const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

async function rawGet(app, url, headers = {}) {
  const http = require('http');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { headers });
    return { status: res.status, type: res.headers.get('content-type'), headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
  } finally {
    await new Promise((r) => server.close(r));
  }
}

const lastNumber = async (companyId, kind) => Number((await pool.query(
  `SELECT COALESCE(MAX(last_number),0) AS n FROM e_document_series WHERE company_id=$1 AND series_kind=$2`, [companyId, kind]
)).rows[0].n);

describe('e-Belge entegrasyon (DB + HTTP, mock sağlayıcı)', () => {
  let app;
  let ctx;
  let H;
  const ALIAS = 'urn:mail:defaultpk@ornekcelik.example.com.tr';
  const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(new Date()));

  before(async () => {
    app = createApp();
    ctx = await db.seed(pool);
    H = { 'X-Firma-Id': String(ctx.companyId) };
  });
  after(async () => {
    await db.cleanup(pool, ctx);
  });
  beforeEach(() => mock._state.failures.splice(0));

  it('e-Fatura (TICARI): önizleme numara tüketmez; hazırla → XML/zarf GİB şemasından geçer → gönder → Tamamlandi → Kabul', async () => {
    const inv = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
    const pv = await request(app, 'POST', '/e-belge/onizle', { body: { document_type: 'Fatura', document_id: inv }, headers: H });
    assert.equal(pv.status, 200, JSON.stringify(pv.json));
    assert.equal(pv.json.gecerli, true, JSON.stringify(pv.json.xml_hatalari));
    assert.equal(pv.json.profil, 'TICARIFATURA');
    assert.equal(await lastNumber(ctx.companyId, 'EFATURA'), 0, 'önizleme seri tüketmez');

    const prep = await request(app, 'POST', '/e-belge/hazirla', { body: { document_type: 'Fatura', document_id: inv }, headers: H });
    assert.equal(prep.status, 201, JSON.stringify(prep.json));
    const q = prep.json;
    assert.equal(q.status, 'Hazir');
    assert.equal(q.gib_number, `KTF${year}000000001`);
    assert.ok(ID_RE.test(q.gib_number));
    assert.equal(q.profile_id, 'TICARIFATURA');
    assert.equal(q.invoice_type_code, 'SATIS');
    assert.equal(q.receiver_alias, ALIAS);

    const xml = await rawGet(app, `/e-belge/${q.id}/xml`, H);
    assert.match(xml.type, /application\/xml/);
    const vx = await validate(xml.buf.toString('utf8'), 'INVOICE');
    assert.deepEqual(vx.errors, []);
    const zarf = await rawGet(app, `/e-belge/${q.id}/zarf`, H);
    assert.deepEqual((await validate(zarf.buf.toString('utf8'), 'ENVELOPE')).errors, []);

    const src = (await pool.query(`SELECT e_document_status, gib_number, uuid_ettn::text AS uuid FROM invoices WHERE id=$1`, [inv])).rows[0];
    assert.deepEqual([src.e_document_status, src.gib_number, src.uuid], ['Hazir', q.gib_number, q.uuid_ettn]);

    assert.equal((await request(app, 'POST', `/e-belge/${q.id}/kuyruga-al`, { headers: H })).json.status, 'Kuyrukta');
    const sent = await request(app, 'POST', `/e-belge/${q.id}/gonder`, { body: {}, headers: H });
    assert.equal(sent.status, 200, JSON.stringify(sent.json));
    assert.equal(sent.json.ok, true);
    assert.equal(sent.json.row.status, 'Gonderildi');
    assert.equal(sent.json.row.is_simulated, true);
    assert.equal(sent.json.row.send_mode, 'mock');
    assert.deepEqual(sent.json.arsiv.map((a) => a.content_kind).sort(), ['PDF', 'UBL_XML', 'YANIT', 'ZARF_XML']);

    const arsiv = (await request(app, 'GET', `/e-belge/${q.id}/arsiv`, { headers: H })).json;
    const ubl = arsiv.find((a) => a.content_kind === 'UBL_XML');
    assert.equal(ubl.sha256, sent.json.row.xml_sha256);
    const dl = await rawGet(app, `/e-belge/arsiv/${ubl.id}/indir`, H);
    assert.equal(dl.buf.toString('utf8'), xml.buf.toString('utf8'));
    assert.equal(dl.headers.get('x-content-sha256'), ubl.sha256);
    const other = await rawGet(app, `/e-belge/arsiv/${ubl.id}/indir`, { 'X-Firma-Id': String(ctx.companyId + 100000) });
    assert.equal(other.status, 404, 'firma kapsamı');

    assert.equal((await request(app, 'POST', `/e-belge/${q.id}/durum-sorgula`, { headers: H })).json.row.status, 'Tamamlandi');
    const fin = await request(app, 'POST', `/e-belge/${q.id}/durum-sorgula`, { headers: H });
    assert.equal(fin.json.row.status, 'Kabul');
    assert.equal(fin.json.final, true);
    assert.equal((await pool.query(`SELECT e_document_status FROM invoices WHERE id=$1`, [inv])).rows[0].e_document_status, 'Gonderildi');

    const ev = (await request(app, 'GET', `/e-belge/${q.id}/olaylar`, { headers: H })).json.map((e) => e.event_type);
    for (const t of ['HAZIRLA', 'KUYRUK', 'GONDER', 'DURUM']) assert.ok(ev.includes(t), `${t} olayı: ${ev}`);

    const pdf = await rawGet(app, `/invoices/${inv}/pdf`, H);
    assert.equal(pdf.status, 200);
    assert.match(pdf.type, /application\/pdf/);
    assert.equal(pdf.buf.subarray(0, 5).toString(), '%PDF-');
    const matbu = await rawGet(app, `/invoices/${inv}/pdf?sablon=matbu`, H);
    assert.equal(matbu.buf.subarray(0, 5).toString(), '%PDF-');
    const html = await rawGet(app, `/invoices/${inv}/yazdir`, H);
    assert.match(html.buf.toString('utf8'), /<svg[^>]*viewBox/);

    const again = await request(app, 'POST', '/e-belge/hazirla', { body: { document_type: 'Fatura', document_id: inv }, headers: H });
    assert.equal(again.status, 409);
    assert.equal(again.json.kod, 'EBELGE_ZATEN_GONDERILDI');

    const noRef = await request(app, 'POST', `/e-belge/${q.id}/iptal`, { body: { gerekce: 'Fiyat hatası' }, headers: H });
    assert.equal(noRef.status, 409);
    assert.equal(noRef.json.kod, 'EBELGE_IPTAL_YONTEM');
    const iade = await db.createInvoice(pool, ctx, { invoiceType: 'SatisIade', sourceId: inv });
    const cn = await request(app, 'POST', `/e-belge/${q.id}/iptal`, { body: { gerekce: 'Alıcı iade faturası düzenledi', iptal_yontemi: 'IADE_FATURASI', iade_fatura_id: iade }, headers: H });
    assert.equal(cn.status, 200, JSON.stringify(cn.json));
    assert.equal(cn.json.status, 'Iptal');
    assert.match(cn.json.cancel_ref, /^IADE_FATURASI:/);
    assert.equal((await pool.query(`SELECT e_document_status FROM invoices WHERE id=$1`, [inv])).rows[0].e_document_status, 'Iptal');

    const re = await request(app, 'POST', '/e-belge/hazirla', { body: { document_type: 'Fatura', document_id: inv }, headers: H });
    assert.equal(re.status, 201);
    assert.equal(re.json.gib_number, `KTF${year}000000002`, 'gönderilmiş numara yeniden kullanılmaz');
    assert.notEqual(re.json.uuid_ettn, q.uuid_ettn, 'gönderilmiş ETTN yeniden kullanılmaz');
  });

  it('e-Arşiv: etiketsiz TCKN alıcı → EARSIVFATURA, zarfsız; sağlayıcı iptali', async () => {
    const inv = await db.createInvoice(pool, ctx, { partnerId: ctx.personId });
    const row = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    assert.equal(row.profile_id, 'EARSIVFATURA');
    assert.ok(row.gib_number.startsWith(`KTA${year}`));
    assert.equal((await rawGet(app, `/e-belge/${row.id}/zarf`, H)).status, 404);
    const s = await withTransaction(pool, (c) => svc.send(c, row.id));
    assert.equal(s.ok, true);
    const cn = await request(app, 'POST', `/e-belge/${row.id}/iptal`, { body: { gerekce: 'Müşteri vazgeçti' }, headers: H });
    assert.equal(cn.status, 200, JSON.stringify(cn.json));
    assert.equal(cn.json.status, 'Iptal');
    assert.ok(cn.json.cancel_ref);

    const varsayilan = await db.createInvoice(pool, ctx, { partnerId: ctx.personId, scenario: 'TICARIFATURA' });
    const pv = await svc.preview(pool, { documentType: 'Fatura', documentId: varsayilan });
    assert.equal(pv.profil, 'EARSIVFATURA', 'varsayılan TICARIFATURA senaryosu etiketsiz alıcıda e-Arşiv’e döner');
    assert.ok(pv.uyarilar.some((u) => u.code === 'SENARYO_EARSIV'));
  });

  it('gönderim öncesi iptal + yeniden hazırlama aynı GİB no/ETTN’yi kullanır (seride boşluk yok)', async () => {
    const inv = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
    const a = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    const before = await lastNumber(ctx.companyId, 'EFATURA');
    const cn = await request(app, 'POST', `/e-belge/${a.id}/iptal`, { body: { gerekce: 'Satır düzeltilecek' }, headers: H });
    assert.equal(cn.json.status, 'Iptal');
    const b = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    assert.equal(b.gib_number, a.gib_number);
    assert.equal(b.uuid_ettn, a.uuid_ettn);
    assert.equal(await lastNumber(ctx.companyId, 'EFATURA'), before);
    // Hazir kayıt yeniden hazırlanınca yerinde güncellenir (aynı satır, aynı numara)
    const c2 = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    assert.equal(c2.id, b.id);
    assert.equal(c2.gib_number, a.gib_number);
  });

  it('hazırlandıktan sonra kaynak değişirse eski XML gönderilmez; yeniden hazırlanınca aynı numarayla gider', async () => {
    const inv = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
    const a = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    await pool.query(`UPDATE invoice_lines SET quantity = quantity + 1 WHERE invoice_id=$1`, [inv]);
    const s1 = await request(app, 'POST', `/e-belge/${a.id}/gonder`, { body: {}, headers: H });
    assert.equal(s1.status, 200);
    assert.equal(s1.json.ok, false);
    assert.equal(s1.json.kaynak_degisti, true);
    assert.equal(s1.json.row.status, 'Hata');
    assert.equal(s1.json.row.last_error_code, 'EBELGE_KAYNAK_DEGISTI');
    assert.equal(s1.json.row.sent_at, null);
    const b = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    assert.equal(b.id, a.id);
    assert.equal(b.gib_number, a.gib_number);
    const s2 = await request(app, 'POST', `/e-belge/${b.id}/gonder`, { body: {}, headers: H });
    assert.equal(s2.json.ok, true);
    assert.equal((await pool.query(`SELECT e_document_status FROM invoices WHERE id=$1`, [inv])).rows[0].e_document_status, 'Gonderildi');
  });

  it('geçici hata → geri çekilmeli yeniden deneme kuyruğu; kalıcı hata → manuel yeniden dene', async () => {
    const inv = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
    const row = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    await withTransaction(pool, (c) => svc.enqueue(c, row.id));
    mock.configure({ failNext: { op: 'send', retryable: true, message: 'Entegratör bakımda' } });
    const r1 = (await svc.processDueQueue(pool, { companyId: ctx.companyId })).gonderilen.find((x) => x.id === row.id);
    assert.equal(r1.durum, 'Hata');
    let q = (await pool.query(`SELECT * FROM e_document_queue WHERE id=$1`, [row.id])).rows[0];
    assert.equal(q.retryable, true);
    assert.equal(q.attempt_count, 1);
    const waitMin = (new Date(q.next_attempt_at) - new Date(q.last_attempt_at)) / 60000;
    assert.ok(waitMin > 0.9 && waitMin < 1.1, `ilk bekleme ~1 dk: ${waitMin}`);
    const r2 = (await svc.processDueQueue(pool, { companyId: ctx.companyId })).gonderilen.find((x) => x.id === row.id);
    assert.equal(r2, undefined, 'bekleme süresi dolmadan tekrar denenmez');
    await pool.query(`UPDATE e_document_queue SET next_attempt_at = CURRENT_TIMESTAMP - interval '1 second' WHERE id=$1`, [row.id]);
    const r3 = (await svc.processDueQueue(pool, { companyId: ctx.companyId })).gonderilen.find((x) => x.id === row.id);
    assert.equal(r3.durum, 'Gonderildi');
    q = (await pool.query(`SELECT * FROM e_document_queue WHERE id=$1`, [row.id])).rows[0];
    assert.equal(q.attempt_count, 2);
    const errs = (await svc.listEvents(pool, row.id)).filter((e) => !e.success);
    assert.equal(errs[0].error_code, 'EBELGE_GECICI_HATA');

    const inv2 = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
    const row2 = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv2 }));
    mock.configure({ failNext: { op: 'send', retryable: false, code: 'GIB_1150', message: 'Şema hatası' } });
    const f = await request(app, 'POST', `/e-belge/${row2.id}/gonder`, { body: {}, headers: H });
    assert.equal(f.json.ok, false);
    assert.equal(f.json.row.status, 'Hata');
    assert.equal(f.json.row.retryable, false);
    assert.equal(f.json.row.last_error_code, 'GIB_1150');
    assert.equal((await svc.processDueQueue(pool, { companyId: ctx.companyId })).gonderilen.some((x) => x.id === row2.id), false);
    assert.equal((await request(app, 'POST', `/e-belge/${row2.id}/yeniden-dene`, { headers: H })).json.status, 'Kuyrukta');
    assert.equal((await request(app, 'POST', `/e-belge/${row2.id}/gonder`, { body: {}, headers: H })).json.row.status, 'Gonderildi');
  });

  it('GİB reddi (gönderim sonrası 1150): yeniden gönderilmez, referanssız iptal, yeni numarayla yeniden hazırlanır', async () => {
    const { setAdapterOverride } = require('../src/services/ebelge/adapters');
    setAdapterOverride({
      code: 'MOCK', mode: 'mock',
      async send() { return { status: 'Gonderildi', providerRef: 'X-1', statusCode: '1000' }; },
      async queryStatus() { return { status: 'Hata', statusCode: '1150', statusMessage: 'Şema doğrulama hatası', final: true }; },
      async cancel() { throw new Error('çağrılmamalı'); },
      async checkUser() { return { registered: null, aliases: [] }; },
    });
    try {
      const inv = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
      const row = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
      await withTransaction(pool, (c) => svc.send(c, row.id));
      const st = await withTransaction(pool, (c) => svc.refreshStatus(c, row.id));
      assert.equal(st.row.status, 'Hata');
      assert.equal(st.row.last_error_code, 'GIB_1150');
      assert.equal((await pool.query(`SELECT e_document_status FROM invoices WHERE id=$1`, [inv])).rows[0].e_document_status, 'Hata');
      const resend = await request(app, 'POST', `/e-belge/${row.id}/gonder`, { body: {}, headers: H });
      assert.equal(resend.status, 409);
      assert.equal(resend.json.kod, 'EBELGE_GIB_RED');
      assert.equal((await request(app, 'POST', `/e-belge/${row.id}/yeniden-dene`, { headers: H })).status, 409);
      const cn = await request(app, 'POST', `/e-belge/${row.id}/iptal`, { body: { gerekce: 'GİB şema reddi' }, headers: H });
      assert.equal(cn.status, 200, JSON.stringify(cn.json));
      assert.equal(cn.json.cancel_ref, 'GIB_RED:GIB_1150');
      const re = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
      assert.notEqual(re.gib_number, row.gib_number);
      assert.notEqual(re.uuid_ettn, row.uuid_ettn);
    } finally {
      setAdapterOverride(null);
    }
  });

  it('GIB_CANLI=Evet + kimlik eksik → Hata (EBELGE_CANLI_KIMLIK_EKSIK), sahte Gonderildi yok (işlem geri alınır)', async () => {
    const inv = await db.createInvoice(pool, ctx, { mailboxAlias: ALIAS });
    const row = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: inv }));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query(`UPDATE system_parameters SET value='Evet' WHERE parameter_code='GIB_CANLI'`);
      if (!u.rowCount) {
        await client.query(`INSERT INTO system_parameters (parameter_code, parameter_name, value, module) VALUES ('GIB_CANLI','GİB canlı','Evet','e-Belge')`);
      }
      const r = await svc.send(client, row.id, { env: {} });
      assert.equal(r.ok, false);
      assert.equal(r.live_blocked, true);
      assert.equal(r.row.status, 'Hata');
      assert.equal(r.row.last_error_code, 'EBELGE_CANLI_KIMLIK_EKSIK');
      assert.equal(r.row.is_simulated, false);
      assert.equal(r.row.sent_at, null);
      assert.ok(r.eksikler.length > 0);
      const src = (await client.query(`SELECT e_document_status FROM invoices WHERE id=$1`, [inv])).rows[0];
      assert.notEqual(src.e_document_status, 'Gonderildi');
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
    const compat = await request(app, 'POST', `/e-belge/${row.id}/gonder`, { body: { simulate: false }, headers: H });
    assert.equal(compat.status, 409);
    assert.equal(compat.json.kod, 'GIB_CANLI_KAPALI');
  });

  it('eksik veri 422 döner, kuyruk kaydı/numara oluşmaz', async () => {
    const bad = (await pool.query(
      `INSERT INTO partners (partner_code, partner_name, tax_id, company_id) VALUES ($1,'Adressiz Ltd.','1111111111',$2) RETURNING id`,
      [`${ctx.tag}-BAD`, ctx.companyId]
    )).rows[0].id;
    try {
      const inv = await db.createInvoice(pool, ctx, { partnerId: bad, mailboxAlias: ALIAS });
      const before = await lastNumber(ctx.companyId, 'EFATURA');
      const r = await request(app, 'POST', '/e-belge/hazirla', { body: { document_type: 'Fatura', document_id: inv }, headers: H });
      assert.equal(r.status, 422);
      assert.equal(r.json.kod, 'EBELGE_VERI_EKSIK');
      assert.ok(r.json.detay.some((d) => d.code === 'ALICI_ADRES'));
      assert.equal(await lastNumber(ctx.companyId, 'EFATURA'), before);
      assert.equal((await pool.query(`SELECT COUNT(*)::int AS n FROM e_document_queue WHERE document_type='Fatura' AND document_id=$1`, [inv])).rows[0].n, 0);
      await pool.query(`DELETE FROM invoice_lines WHERE invoice_id=$1`, [inv]);
      await pool.query(`DELETE FROM invoices WHERE id=$1`, [inv]);
    } finally {
      await pool.query(`DELETE FROM partners WHERE id=$1`, [bad]).catch(() => {});
    }
  });

  it('iade (AlisIade) → IADE / TEMELFATURA, iade edilen fatura GİB no referansı', async () => {
    const alis = await db.createInvoice(pool, ctx, { invoiceType: 'Alis' });
    await pool.query(`UPDATE invoices SET gib_number='ABC2026000000077' WHERE id=$1`, [alis]);
    const iade = await db.createInvoice(pool, ctx, { invoiceType: 'AlisIade', sourceId: alis, mailboxAlias: ALIAS });
    const row = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Fatura', documentId: iade }));
    assert.equal(row.invoice_type_code, 'IADE');
    assert.equal(row.profile_id, 'TEMELFATURA');
    const xml = row.payload_json.xml;
    assert.match(xml, /<cbc:DocumentTypeCode>IADE<\/cbc:DocumentTypeCode>/);
    assert.match(xml, /ABC2026000000077/);
    const gelen = await request(app, 'POST', '/e-belge/hazirla', { body: { document_type: 'Fatura', document_id: alis }, headers: H });
    assert.equal(gelen.status, 422, 'alış faturası gelen belgedir');
  });

  it('mükellef etiketi (manuel) → etiketsiz faturada TICARIFATURA seçilir', async () => {
    const reg = await request(app, 'POST', '/e-belge/mukellef', { body: { vkn: '9876543210', etiket: ALIAS, unvan: 'Örnek Çelik' }, headers: H });
    assert.equal(reg.status, 201, JSON.stringify(reg.json));
    const inv = await db.createInvoice(pool, ctx);
    const pv = await svc.preview(pool, { documentType: 'Fatura', documentId: inv });
    assert.equal(pv.profil, 'TICARIFATURA');
    const bad = await request(app, 'POST', '/e-belge/mukellef', { body: { vkn: '123', etiket: 'x' }, headers: H });
    assert.equal(bad.status, 400);
    const q = await request(app, 'POST', '/e-belge/mukellef-sorgula', { body: { vkn: '9876543210' }, headers: H });
    assert.equal(q.status, 200);
    assert.equal(q.json.mod, 'mock');
    assert.ok(q.json.onbellek.some((x) => x.alias === ALIAS));
  });

  it('e-İrsaliye: hazırla → DESPATCHADVICE XSD/kural + zarf → gönder; irsaliye PDF', async () => {
    const dn = await db.createDeliveryNote(pool, ctx);
    const row = await withTransaction(pool, (c) => svc.prepare(c, { documentType: 'Irsaliye', documentId: dn }));
    assert.equal(row.profile_id, 'TEMELIRSALIYE');
    assert.ok(row.gib_number.startsWith(`KTI${year}`));
    assert.deepEqual((await validate(row.payload_json.xml, 'DESPATCHADVICE')).errors, []);
    assert.deepEqual((await validate(row.payload_json.envelope_xml, 'ENVELOPE')).errors, []);
    const s = await request(app, 'POST', `/e-belge/${row.id}/gonder`, { body: {}, headers: H });
    assert.equal(s.json.row.status, 'Gonderildi');
    assert.equal((await pool.query(`SELECT e_document_status FROM delivery_notes WHERE id=$1`, [dn])).rows[0].e_document_status, 'Gonderildi');
    const pdf = await rawGet(app, `/delivery_notes/${dn}/pdf`, H);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.buf.subarray(0, 5).toString(), '%PDF-');
    const none = await db.createDeliveryNote(pool, ctx, { mailboxAlias: null });
    const r = await request(app, 'POST', '/e-belge/hazirla', { body: { document_type: 'Irsaliye', document_id: none }, headers: H });
    assert.equal(r.status, 422);
    assert.ok(r.json.detay.some((d) => d.code === 'ALICI_ETIKET'));
    const draftPdf = await rawGet(app, `/delivery_notes/${none}/pdf`, H);
    assert.equal(draftPdf.buf.subarray(0, 5).toString(), '%PDF-', 'e-belge kaydı yokken taslak PDF');
  });

  it('arşiv ve olay kayıtları değiştirilemez; saklama süresi dolmadan silinemez', async () => {
    const a = (await pool.query(`SELECT id FROM e_document_archive WHERE company_id=$1 LIMIT 1`, [ctx.companyId])).rows[0];
    await assert.rejects(pool.query(`UPDATE e_document_archive SET file_name='x' WHERE id=$1`, [a.id]), /değiştirilemez/);
    const e = (await pool.query(`SELECT id FROM e_document_events WHERE company_id=$1 LIMIT 1`, [ctx.companyId])).rows[0];
    await assert.rejects(pool.query(`DELETE FROM e_document_events WHERE id=$1`, [e.id]), /değiştirilemez|silinemez/);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO e_document_archive (company_id, document_type, document_id, content_kind, mime_type, content, sha256, byte_size, retain_until)
         VALUES ($1,'Fatura',0,'UBL_XML','application/xml','\\x00', repeat('0',64), 1, CURRENT_DATE + 3650) RETURNING id`,
        [ctx.companyId]
      );
      await assert.rejects(client.query(`DELETE FROM e_document_archive WHERE id=$1`, [ins.rows[0].id]), /saklama süresi/);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('GİB numara serisi eşzamanlı işlemlerde boşluksuz ve tekil', async () => {
    const take = () => withTransaction(pool, (c) => nextGibNumber(c, { companyId: ctx.companyId, kind: 'EARSIV', prefix: 'KTZ', year }));
    const nums = await Promise.all([take(), take(), take(), take()]);
    const seqs = nums.map((n) => Number(n.slice(-9))).sort((x, y) => x - y);
    assert.deepEqual(seqs, [1, 2, 3, 4]);
    await assert.rejects(withTransaction(pool, (c) => nextGibNumber(c, { companyId: ctx.companyId, kind: 'EARSIV', prefix: 'K-1', year })), (err) => err.code === 'EBELGE_SERI_ONEK');
  });

  it('özet ve liste uçları (firma kapsamlı); /e-belge/kuyruk takma adı', async () => {
    const o = await request(app, 'GET', '/e-belge/durum/ozet', { headers: H });
    assert.equal(o.status, 200);
    assert.equal(o.json.yapilandirma.mod, 'mock');
    assert.ok(!JSON.stringify(o.json).match(/PASSWORD"\s*:\s*"[^"]+/));
    const l = await request(app, 'GET', '/e-belge/kuyruk', { headers: H });
    assert.equal(l.status, 200);
    assert.ok(l.json.length > 0 && l.json.every((r) => r.company_id === ctx.companyId));
    assert.equal(l.json[0].payload_json, undefined, 'liste XML taşımaz');
    const other = await request(app, 'GET', `/e-belge/${l.json[0].id}`, { headers: { 'X-Firma-Id': String(ctx.companyId + 100000) } });
    assert.equal(other.status, 404);
  });
});
