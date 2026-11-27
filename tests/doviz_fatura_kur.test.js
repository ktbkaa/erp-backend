/**
 * P0 #7 — Dövizli fatura: kur dönüşümü, GL (TRY + döviz), cari (döviz + TRY), kur farkı, iade, ters kayıt.
 * Gerçek DB gerekir (npm run migrate). Test verisi izole firma + test para birimleri ile kurulur ve temizlenir.
 */
require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { request } = require('./helpers/app');
const { faturadanMuhasebe, tryTutarlari } = require('../src/services/muhasebeEntegrasyonService');
const { fisTersKayit } = require('../src/services/muhasebeMotorService');
const { partnerBalance, addPartnerLedgerEntry } = require('../src/services/cariHareketService');
const { resolveDocumentRate, normalizeInvoiceCurrencyFields } = require('../src/services/kurService');
const {
  gerceklesenFark, degerlemeOnizleme, degerlemeKaydet, degerlemeTersle,
} = require('../src/services/kurFarkiService');

const BUGUN = new Date().toISOString().slice(0, 10);
const SUFFIX = `${Date.now()}`.slice(-8);
const PB = 'ZXA'; // test para birimi (kur tablosunda kayıt var)
const PB_YOK = 'ZXB'; // kur kaydı olmayan test para birimi

const ctx = { companyId: null, partnerId: null, itemId: null, createdInvoices: [], createdReceipts: [] };

async function yeniFatura({
  tur = 'Satis', pb = PB, kur = 30, net = 100, kdv = 20, extra = {},
} = {}) {
  const r = await pool.query(
    `INSERT INTO invoices
       (invoice_no, partner_id, invoice_type, total_amount, net_amount, tax_amount, payable_amount,
        status, company_id, currency_code, exchange_rate, invoice_date, is_return, source_document_type, source_document_id,
        rate_type)
     VALUES ($1,$2,$3,$4,$4,$5,$6,'Taslak',$7,$8,$9,$10,$11,$12,$13,'TCMB-SATIS') RETURNING id`,
    [`FXT-${SUFFIX}-${ctx.createdInvoices.length + 1}`, ctx.partnerId, tur, net, kdv, net + kdv,
      ctx.companyId, pb, kur, BUGUN, extra.is_return || false,
      extra.source_document_type || null, extra.source_document_id || null]
  );
  ctx.createdInvoices.push(r.rows[0].id);
  return r.rows[0].id;
}

function post(faturaId) {
  return withTransaction(pool, (c) => faturadanMuhasebe(c, faturaId, { kullaniciKodu: 'fx-test' }));
}

async function glSatirlari(fisId) {
  const r = await pool.query(
    `SELECT l.*, a.account_code FROM journal_entry_lines l JOIN gl_accounts a ON a.id=l.account_id
     WHERE l.document_id=$1 ORDER BY l.line_no, l.id`,
    [fisId]
  );
  return r.rows;
}

const n = (v) => Math.round(Number(v) * 100) / 100;

describe('dövizli fatura kur dönüşümü', () => {
  before(async () => {
    const t = await pool.query(`SELECT to_regclass('public.exchange_difference_entries') AS t`);
    assert.ok(t.rows[0].t, 'exchange_difference_entries yok — npm run migrate');
    const firma = await pool.query(
      `INSERT INTO companies (company_code, company_name) VALUES ($1,$2) RETURNING id`,
      [`FXT${SUFFIX}`, 'Döviz Test Firma']
    );
    ctx.companyId = firma.rows[0].id;
    const p = await pool.query(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'FX Test Cari',$2) RETURNING id`,
      [`FXC${SUFFIX}`, ctx.companyId]
    );
    ctx.partnerId = p.rows[0].id;
    const it = await pool.query(`SELECT id FROM items ORDER BY id LIMIT 1`);
    ctx.itemId = it.rows[0]?.id || null;
    await pool.query(
      `INSERT INTO currencies (currency_code, currency_name, symbol) VALUES ($1,'Test A','A'),($2,'Test B','B')
       ON CONFLICT (currency_code) DO NOTHING`,
      [PB, PB_YOK]
    );
    await pool.query(
      `INSERT INTO exchange_rates (rate_date, source_currency, target_currency, buy_rate, sell_rate, source)
       VALUES ($1,$2,'TRY',29,31,'Test')
       ON CONFLICT (rate_date, source_currency, target_currency) DO UPDATE SET buy_rate=29, sell_rate=31`,
      [BUGUN, PB]
    );
  });

  after(async () => {
    const tmz = await pool.connect();
    try {
      await tmz.query(`SELECT set_config('erp.belge_kilit_bypass', 'on', false)`);
      await tmz.query(`DELETE FROM exchange_difference_entries WHERE company_id=$1 OR partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [ctx.companyId]);
      await tmz.query(`DELETE FROM partner_ledger_entries WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [ctx.companyId]);
      const fis = await tmz.query(`SELECT id FROM journal_entries WHERE company_id=$1`, [ctx.companyId]);
      const ids = fis.rows.map((x) => x.id);
      if (ids.length) {
        await tmz.query(`UPDATE journal_entries SET reversal_document_id=NULL, original_document_id=NULL WHERE id = ANY($1)`, [ids]);
        await tmz.query(`UPDATE invoices SET gl_document_id=NULL WHERE company_id=$1`, [ctx.companyId]);
        await tmz.query(`DELETE FROM journal_entry_lines WHERE document_id = ANY($1)`, [ids]);
        await tmz.query(`DELETE FROM journal_entries WHERE id = ANY($1)`, [ids]);
      }
      await tmz.query(`DELETE FROM receipts_payments WHERE partner_id IN (SELECT id FROM partners WHERE company_id=$1)`, [ctx.companyId]);
      await tmz.query(`DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE company_id=$1)`, [ctx.companyId]);
      await tmz.query(`DELETE FROM invoices WHERE company_id=$1`, [ctx.companyId]);
      await tmz.query(`DELETE FROM partners WHERE company_id=$1`, [ctx.companyId]);
      await tmz.query(`DELETE FROM companies WHERE id=$1`, [ctx.companyId]);
      await tmz.query(`DELETE FROM exchange_rates WHERE source_currency = ANY($1)`, [[PB, PB_YOK]]);
      await tmz.query(`DELETE FROM currencies WHERE currency_code = ANY($1)`, [[PB, PB_YOK]]);
    } catch (err) {
      console.warn('fx test temizlik uyarısı:', err.message);
    } finally {
      tmz.release(true);
    }
    await pool.end();
  });

  it('1) saf hesap: TRY dönüşümü yuvarlama farkı KDV satırına gider ve toplam korunur', () => {
    const t = tryTutarlari({ mal: 33.33, kdv: 6.67, odenecek: 40, rate: 30.123456 });
    assert.equal(n(t.malTry + t.kdvTry), t.odenecekTry);
    assert.equal(t.odenecekTry, n(40 * 30.123456));
    const k = tryTutarlari({ mal: 100, kdv: 20, odenecek: 120, rate: 1 });
    assert.deepEqual(k, { malTry: 100, kdvTry: 20, odenecekTry: 120 });
    assert.equal(gerceklesenFark({ fcTutar: 100, faturaKuru: 30, odemeKuru: 32, faturaTuru: 'Satis' }), 200);
    assert.equal(gerceklesenFark({ fcTutar: 100, faturaKuru: 30, odemeKuru: 32, faturaTuru: 'Alis' }), -200);
  });

  it('2) kur çözümleme: TRY=1, girilen kur önceliklidir, tablo (satış=sell/alış=buy), kur yoksa KUR_YOK', async () => {
    assert.equal((await resolveDocumentRate(pool, { currency: 'TRY', date: BUGUN })).rate, 1);
    const girilen = await resolveDocumentRate(pool, { currency: PB, entered: 33.5, date: BUGUN });
    assert.equal(girilen.rate, 33.5);
    assert.equal(girilen.source, 'Girilen');
    assert.equal((await resolveDocumentRate(pool, { currency: PB, entered: 1, date: BUGUN, rateType: 'TCMB-SATIS' })).rate, 31);
    assert.equal((await resolveDocumentRate(pool, { currency: PB, date: BUGUN, rateType: 'TCMB-ALIS' })).rate, 29);
    await assert.rejects(
      () => resolveDocumentRate(pool, { currency: PB_YOK, date: BUGUN }),
      (e) => e.kod === 'KUR_YOK' && e.status === 400
    );
  });

  it('3) satış faturası USD: fiş TRY + döviz, cari döviz + TRY', async () => {
    const id = await yeniFatura({ tur: 'Satis', kur: 30, net: 100, kdv: 20 });
    const sonuc = await post(id);
    assert.equal(sonuc.amount_try, 3600);
    assert.equal(sonuc.exchange_rate, 30);
    const satirlar = await glSatirlari(sonuc.gl_document_id);
    assert.equal(satirlar.length, 3);
    const alici = satirlar.find((s) => s.account_code.startsWith('120'));
    const gelir = satirlar.find((s) => s.account_code.startsWith('600'));
    const kdv = satirlar.find((s) => s.account_code.startsWith('391'));
    assert.equal(n(alici.debit), 3600);
    assert.equal(n(alici.debit_fc), 120);
    assert.equal(n(gelir.credit), 3000);
    assert.equal(n(gelir.credit_fc), 100);
    assert.equal(n(kdv.credit), 600);
    assert.equal(n(kdv.credit_fc), 20);
    assert.equal(alici.currency_code, PB);
    assert.equal(n(alici.exchange_rate), 30);
    const borc = satirlar.reduce((a, s) => a + Number(s.debit), 0);
    const alacak = satirlar.reduce((a, s) => a + Number(s.credit), 0);
    assert.equal(n(borc), n(alacak));

    const cari = await pool.query(
      `SELECT * FROM partner_ledger_entries WHERE document_type='SATIS_FATURA' AND document_id=$1`, [id]
    );
    assert.equal(cari.rows.length, 1);
    assert.equal(cari.rows[0].direction, 'Borc');
    assert.equal(n(cari.rows[0].amount), 120);
    assert.equal(cari.rows[0].currency_code, PB);
    assert.equal(n(cari.rows[0].amount_try), 3600);

    const fat = (await pool.query(`SELECT * FROM invoices WHERE id=$1`, [id])).rows[0];
    assert.equal(n(fat.payable_amount_try), 3600);
    assert.equal(n(fat.net_amount_try), 3000);
    assert.equal(fat.is_posted, true);

    const bak = await partnerBalance(pool, ctx.partnerId);
    assert.equal(bak.bakiye, 3600);
    assert.equal(bak.doviz.length, 1);
    assert.equal(bak.doviz[0].currency_code, PB);
    assert.equal(bak.doviz[0].bakiye, 120);
    assert.equal(bak.doviz[0].bakiye_try, 3600);
  });

  it('4) kur girilmemiş dövizli fatura: tablo kuru (TCMB-ALIS=29) ile alış faturası; kur faturaya yazılır', async () => {
    const id = await yeniFatura({ tur: 'Alis', kur: 1, net: 200, kdv: 0 });
    await pool.query(`UPDATE invoices SET rate_type='TCMB-ALIS' WHERE id=$1`, [id]);
    const sonuc = await post(id);
    assert.equal(sonuc.exchange_rate, 29);
    assert.equal(sonuc.amount_try, 5800);
    const fat = (await pool.query(`SELECT exchange_rate, exchange_rate_date FROM invoices WHERE id=$1`, [id])).rows[0];
    assert.equal(n(fat.exchange_rate), 29);
    assert.ok(fat.exchange_rate_date);
    const cari = (await pool.query(
      `SELECT * FROM partner_ledger_entries WHERE document_type='ALIS_FATURA' AND document_id=$1`, [id]
    )).rows[0];
    assert.equal(cari.direction, 'Alacak');
    assert.equal(n(cari.amount_try), 5800);
  });

  it('5) kur bulunamazsa muhasebeleştirme 400 KUR_YOK ile reddedilir ve fiş/cari yazılmaz', async () => {
    const id = await yeniFatura({ pb: PB_YOK, kur: 1 });
    await assert.rejects(() => post(id), (e) => e.kod === 'KUR_YOK' && e.status === 400);
    const f = await pool.query(`SELECT 1 FROM partner_ledger_entries WHERE document_type='SATIS_FATURA' AND document_id=$1`, [id]);
    assert.equal(f.rows.length, 0);
    const inv = (await pool.query(`SELECT is_posted FROM invoices WHERE id=$1`, [id])).rows[0];
    assert.equal(inv.is_posted, false);
  });

  it('6) TRY faturanın davranışı değişmez: fc alanları NULL, kur 1, cari amount_try=amount', async () => {
    const id = await yeniFatura({ pb: 'TRY', kur: 1, net: 1000, kdv: 200 });
    const sonuc = await post(id);
    assert.equal(sonuc.amount, 1200);
    assert.equal(sonuc.amount_try, 1200);
    const satirlar = await glSatirlari(sonuc.gl_document_id);
    for (const s of satirlar) {
      assert.equal(s.debit_fc, null);
      assert.equal(s.credit_fc, null);
    }
    assert.equal(n(satirlar.find((s) => s.account_code.startsWith('120')).debit), 1200);
    const cari = (await pool.query(
      `SELECT * FROM partner_ledger_entries WHERE document_type='SATIS_FATURA' AND document_id=$1`, [id]
    )).rows[0];
    assert.equal(cari.currency_code, 'TRY');
    assert.equal(n(cari.amount), 1200);
    assert.equal(n(cari.amount_try), 1200);
    assert.equal(n(cari.exchange_rate), 1);
  });

  it('7) iade (SatisIade) kaynak fatura kuru ile ters yönde fişlenir; döviz ve TRY bakiye kapanır', async () => {
    const yeniPartner = (await pool.query(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'FX Iade Cari',$2) RETURNING id`,
      [`FXI${SUFFIX}`, ctx.companyId]
    )).rows[0].id;
    const onceki = ctx.partnerId;
    ctx.partnerId = yeniPartner;
    try {
      const kaynak = await yeniFatura({ tur: 'Satis', kur: 30, net: 100, kdv: 20 });
      await post(kaynak);
      // iade faturası: tutarlar negatif, kur tablo/1 → kaynak kuru kullanılmalı
      const iade = await yeniFatura({
        tur: 'SatisIade', kur: 1, net: -100, kdv: -20,
        extra: { is_return: true, source_document_type: 'SATIS_IADE', source_document_id: kaynak },
      });
      const s = await post(iade);
      assert.equal(s.is_iade, true);
      assert.equal(s.exchange_rate, 30);
      assert.equal(s.exchange_rate_source, 'IadeKaynakFatura');
      const satirlar = await glSatirlari(s.gl_document_id);
      const alici = satirlar.find((x) => x.account_code.startsWith('120'));
      const gelir = satirlar.find((x) => x.account_code.startsWith('600'));
      assert.equal(n(alici.credit), 3600);
      assert.equal(n(alici.credit_fc), 120);
      assert.equal(n(gelir.debit), 3000);
      const bak = await partnerBalance(pool, yeniPartner);
      assert.equal(bak.bakiye, 0);
      assert.equal(bak.doviz[0].bakiye, 0);
      const fat = (await pool.query(`SELECT payable_amount_try FROM invoices WHERE id=$1`, [iade])).rows[0];
      assert.equal(n(fat.payable_amount_try), -3600);
    } finally {
      ctx.partnerId = onceki;
    }
  });

  it('8) fişe ters kayıt: döviz/TRY tutarları kopyalanır, cari tersi atılır, fatura yeniden muhasebeleşebilir', async () => {
    const p2 = (await pool.query(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'FX Ters Cari',$2) RETURNING id`,
      [`FXT2${SUFFIX}`, ctx.companyId]
    )).rows[0].id;
    const onceki = ctx.partnerId;
    ctx.partnerId = p2;
    try {
      const id = await yeniFatura({ tur: 'Alis', kur: 32, net: 50, kdv: 10 });
      const s = await post(id);
      const ters = await withTransaction(pool, (c) => fisTersKayit(c, s.gl_document_id, { kullaniciKodu: 'fx-test' }));
      const orj = await glSatirlari(s.gl_document_id);
      const tr = await glSatirlari(ters.id);
      assert.equal(tr.length, orj.length);
      const stokOrj = orj.find((x) => x.account_code.startsWith('150'));
      const stokTers = tr.find((x) => x.account_code.startsWith('150'));
      assert.equal(n(stokOrj.debit), 1600);
      assert.equal(n(stokTers.credit), 1600);
      assert.equal(n(stokTers.credit_fc), 50);
      assert.equal(n(stokTers.credit_yb), 1600);
      const bak = await partnerBalance(pool, p2);
      assert.equal(bak.bakiye, 0);
      assert.equal(bak.doviz[0].bakiye, 0);
      const fat = (await pool.query(`SELECT is_posted, gl_document_id FROM invoices WHERE id=$1`, [id])).rows[0];
      assert.equal(fat.is_posted, false);
      assert.equal(fat.gl_document_id, null);
      // ikinci ters kayıt cari tersini ikiye katlamaz
      const cariAdet = await pool.query(
        `SELECT COUNT(*)::int AS n FROM partner_ledger_entries WHERE document_type='ALIS_FATURA_IPTAL' AND document_id=$1`, [id]
      );
      assert.equal(cariAdet.rows[0].n, 1);
    } finally {
      ctx.partnerId = onceki;
    }
  });

  it('9) gerçekleşen kur farkı: USD 100 @30 fatura, @32 tahsilat → 200 TRY kur farkı geliri, cari kapanır', async () => {
    const p3 = (await pool.query(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'FX Realized Cari',$2) RETURNING id`,
      [`FXR${SUFFIX}`, ctx.companyId]
    )).rows[0].id;
    const onceki = ctx.partnerId;
    ctx.partnerId = p3;
    try {
      const id = await yeniFatura({ tur: 'Satis', kur: 30, net: 100, kdv: 0 });
      await post(id);
      const app = express();
      app.use(express.json());
      app.use('/tahsilat-odemeler', require('../routes/receipts_payments'));
      app.use((err, req, res, next) => res.status(err.status || 500).json({ hata: err.message, kod: err.kod }));
      const res = await request(app, 'POST', '/tahsilat-odemeler', {
        body: {
          type: 'Tahsilat', partner_id: p3, amount: 100, currency_code: PB, exchange_rate: 32,
          invoice_id: id, document_date: BUGUN,
        },
        headers: { 'X-Firma-Id': String(ctx.companyId) },
      });
      assert.equal(res.status, 201, JSON.stringify(res.json));
      assert.equal(n(res.json.exchange_rate), 32);
      const fark = await pool.query(`SELECT * FROM exchange_difference_entries WHERE partner_id=$1`, [p3]);
      assert.equal(fark.rows.length, 1);
      assert.equal(fark.rows[0].kind, 'Gerceklesen');
      assert.equal(n(fark.rows[0].difference_try), 200);
      const satirlar = await glSatirlari(fark.rows[0].gl_document_id);
      assert.equal(n(satirlar.find((s) => s.account_code.startsWith('646')).credit), 200);
      assert.equal(n(satirlar.find((s) => s.account_code.startsWith('120')).debit), 200);
      const bak = await partnerBalance(pool, p3);
      assert.equal(bak.doviz[0].bakiye, 0);
      assert.equal(bak.bakiye, 0);

      // tahsilat onayında ikinci kez kur farkı üretilmez
      const mevcut = await pool.query(`SELECT COUNT(*)::int AS n FROM exchange_difference_entries WHERE partner_id=$1`, [p3]);
      assert.equal(mevcut.rows[0].n, 1);
    } finally {
      ctx.partnerId = onceki;
    }
  });

  it('10) gerçekleşmemiş kur farkı: değerleme önizleme/kayıt/idempotent/ters', async () => {
    const p4 = (await pool.query(
      `INSERT INTO partners (partner_code, partner_name, company_id) VALUES ($1,'FX Reval Cari',$2) RETURNING id`,
      [`FXV${SUFFIX}`, ctx.companyId]
    )).rows[0].id;
    const onceki = ctx.partnerId;
    ctx.partnerId = p4;
    try {
      const id = await yeniFatura({ tur: 'Satis', kur: 30, net: 100, kdv: 0 });
      await post(id);
      const onizleme = await degerlemeOnizleme(pool, { firmaId: ctx.companyId, tarih: BUGUN, kurlar: { [PB]: 31.5 } });
      const satir = onizleme.find((s) => s.partner_id === p4);
      assert.ok(satir);
      assert.equal(satir.fark_try, 150);
      assert.equal(satir.degerli_try, 3150);

      const kayit = await withTransaction(pool, (c) => degerlemeKaydet(c, {
        firmaId: ctx.companyId, tarih: BUGUN, kurlar: { [PB]: 31.5 }, kullaniciKodu: 'fx-test',
      }));
      assert.ok(kayit.kayit_sayisi >= 1);
      assert.ok(kayit.satirlar.some((x) => x.partner_id === p4));
      const bak = await partnerBalance(pool, p4);
      assert.equal(bak.bakiye, 3150);
      assert.equal(bak.doviz[0].bakiye, 100);
      const satirlar = await glSatirlari(kayit.gl_document_id);
      assert.equal(n(satirlar.find((s) => s.partner_id === p4).debit), 150);
      assert.ok(satirlar.some((s) => s.account_code.startsWith('646')));

      const tekrar = await withTransaction(pool, (c) => degerlemeKaydet(c, {
        firmaId: ctx.companyId, tarih: BUGUN, kurlar: { [PB]: 31.5 }, kullaniciKodu: 'fx-test',
      }));
      assert.equal(tekrar.kayit_sayisi, 0);

      const ters = await withTransaction(pool, (c) => degerlemeTersle(c, {
        firmaId: ctx.companyId, tarih: BUGUN, tersTarihi: BUGUN, kullaniciKodu: 'fx-test',
      }));
      assert.ok(ters.kayit_sayisi >= 1);
      const bak2 = await partnerBalance(pool, p4);
      assert.equal(bak2.bakiye, 3000);
      const e = (await pool.query(`SELECT reversed_gl_document_id FROM exchange_difference_entries WHERE partner_id=$1`, [p4])).rows[0];
      assert.ok(e.reversed_gl_document_id);
    } finally {
      ctx.partnerId = onceki;
    }
  });

  it('11) cari hareket: kur girilmemiş dövizli hareket tablo kuruyla TRY karşılığını alır; kur yoksa KUR_YOK', async () => {
    const h = await withTransaction(pool, (c) => addPartnerLedgerEntry(c, {
      cariId: ctx.partnerId, direction: 'Borc', amount: 10, paraBirimi: PB, hareketTarihi: BUGUN,
    }));
    assert.equal(n(h.exchange_rate), 31);
    assert.equal(n(h.amount_try), 310);
    await assert.rejects(
      () => withTransaction(pool, (c) => addPartnerLedgerEntry(c, {
        cariId: ctx.partnerId, direction: 'Borc', amount: 10, paraBirimi: PB_YOK, hareketTarihi: BUGUN,
      })),
      (e) => e.kod === 'KUR_YOK'
    );
  });

  it('12) fatura yazımında para birimi/kur doğrulaması (servis ve API)', async () => {
    const t = await normalizeInvoiceCurrencyFields(pool, { currency_code: 'try', exchange_rate: 5 });
    assert.equal(t.currency_code, 'TRY');
    assert.equal(t.exchange_rate, 1);
    await assert.rejects(
      () => normalizeInvoiceCurrencyFields(pool, { currency_code: PB, exchange_rate: -2 }),
      (e) => e.kod === 'KUR_GECERSIZ'
    );
    await assert.rejects(
      () => normalizeInvoiceCurrencyFields(pool, { currency_code: 'QQQ' }),
      (e) => e.kod === 'PB_GECERSIZ'
    );
    if (!ctx.itemId) return;
    const { createApp } = require('./helpers/app');
    const { app } = createApp();
    const kalem = [{ item_id: ctx.itemId, quantity: 1, unit_price: 10 }];
    const kotu = await request(app, 'POST', '/invoices', {
      body: { partner_id: ctx.partnerId, invoice_type: 'Satis', currency_code: 'QQQ', kalemler: kalem },
      headers: { 'X-Firma-Id': String(ctx.companyId) },
    });
    assert.equal(kotu.status, 400);
    const iyi = await request(app, 'POST', '/invoices', {
      body: { partner_id: ctx.partnerId, invoice_type: 'Satis', currency_code: PB, exchange_rate: 30, kalemler: kalem },
      headers: { 'X-Firma-Id': String(ctx.companyId) },
    });
    assert.equal(iyi.status, 201, JSON.stringify(iyi.json));
    assert.equal(iyi.json.currency_code, PB);
    assert.equal(n(iyi.json.exchange_rate), 30);
    ctx.createdInvoices.push(iyi.json.id);

    // iade: para birimi ve kur kaynak faturadan taşınır
    const iade = await request(app, 'POST', `/invoices/${iyi.json.id}/iade`, {
      body: {}, headers: { 'X-Firma-Id': String(ctx.companyId) },
    });
    assert.equal(iade.status, 201, JSON.stringify(iade.json));
    assert.equal(iade.json.currency_code, PB);
    assert.equal(n(iade.json.exchange_rate), 30);
    assert.equal(iade.json.is_return, true);
    ctx.createdInvoices.push(iade.json.id);

    // muhasebeleşmiş faturada kur/para birimi değişmez
    const muh = await request(app, 'POST', `/invoices/${iyi.json.id}/muhasebelestir`, {
      body: {}, headers: { 'X-Firma-Id': String(ctx.companyId) },
    });
    assert.equal(muh.status, 201, JSON.stringify(muh.json));
    assert.equal(muh.json.amount_try, 360);
    const degis = await request(app, 'PUT', `/invoices/${iyi.json.id}`, {
      body: { exchange_rate: 99 }, headers: { 'X-Firma-Id': String(ctx.companyId) },
    });
    assert.equal(degis.status, 409);
    assert.ok(['KUR_KILIT', 'BELGE_MUHASEBELESMIS'].includes(degis.json.kod), degis.json.kod);
  });
});
