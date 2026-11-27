/**
 * P0 #8 — onaylı / muhasebeleşmiş / sevk edilmiş / kapanmış belgelerde PUT/DELETE kilidi,
 * iptal / ters kayıt akışları, DB tetikleyicileri (150) ve audit izleri.
 */
require('dotenv').config();
if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { warehouseItemBalance } = require('../src/services/stokHareketService');
const { _test: kt, KURALLAR } = require('../src/services/belgeKilitService');

const TAG = `BK${Date.now().toString(36).toUpperCase()}`;

function buildApp() {
  const pool = require('../db');
  const { authOptional, authRequired } = require('../src/middleware/authJwt');
  const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use(authOptional);
  app.use(authRequired);
  app.use('/invoices', require('../routes/invoices'));
  app.use('/sales_orders', require('../routes/sales_orders'));
  app.use('/satin-alma-siparisleri', require('../routes/purchase_orders'));
  app.use('/satin-alma-teklifleri', require('../routes/purchase_quotations'));
  app.use('/uretim-emirleri', require('../routes/production_orders'));
  app.use('/stok-hareketleri', require('../routes/stock_movements'));
  app.use('/mal-kabuller', require('../routes/goods_receipts'));
  app.use('/muhasebe-belgeleri', require('../routes/journal_entries'));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, pool };
}

async function dbHata(pool, sql, params) {
  try {
    await withTransaction(pool, (c) => c.query(sql, params));
    return null;
  } catch (err) {
    return err;
  }
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

describe('belge kilidi — normalizasyon (birim)', () => {
  it('tarih: gg/aa/yyyy, ISO ve Date aynı güne normalize olur', () => {
    const d = new Date(2026, 10, 27);
    assert.equal(kt.tarihNorm(d), '2026-11-27');
    assert.equal(kt.tarihNorm('27/11/2026'), '2026-11-27');
    assert.equal(kt.tarihNorm('2026-11-27'), '2026-11-27');
    assert.equal(kt.tarihNorm(d.toISOString()), '2026-11-27');
  });

  it('sayı / boş / boolean karşılaştırması toleranslı', () => {
    assert.ok(kt.esit(kt.normalize('numeric', '100.0000'), kt.normalize('numeric', 100)));
    assert.ok(!kt.esit(kt.normalize('numeric', '100'), kt.normalize('numeric', 101)));
    assert.equal(kt.normalize('character varying', ''), null);
    assert.equal(kt.normalize('boolean', 'true'), true);
    assert.equal(kt.zamanDamgasiNorm('27/11/2026 08:30'), kt.zamanDamgasiNorm(new Date(2026, 10, 27, 8, 30)));
  });

  it('satır karşılaştırması sıra bağımsız', () => {
    const mevcut = [{ item_id: 1, quantity: '2.000', unit_price: '5' }, { item_id: 2, quantity: '1', unit_price: '3' }];
    assert.equal(kt.satirListesiDegisti(mevcut, [{ item_id: 2, quantity: 1 }, { item_id: 1, quantity: 2, unit_price: 5 }], ['item_id', 'quantity', 'unit_price']), false);
    assert.equal(kt.satirListesiDegisti(mevcut, [{ item_id: 2, quantity: 9 }, { item_id: 1, quantity: 2 }], ['item_id', 'quantity']), true);
    assert.equal(kt.satirListesiDegisti(mevcut, [{ item_id: 1, quantity: 2 }], ['item_id', 'quantity']), true);
  });

  it('kilit kuralları tek merkezde tanımlı', () => {
    for (const t of ['invoices', 'sales_orders', 'purchase_orders', 'production_orders', 'goods_receipts',
      'delivery_notes', 'journal_entries', 'stock_movements', 'purchase_quotations', 'purchase_agreements', 'rfqs']) {
      assert.equal(typeof KURALLAR[t].kilit, 'function', t);
      assert.equal(typeof KURALLAR[t].gecis, 'function', t);
    }
    assert.equal(KURALLAR.sales_orders.kilit({ status: 'Taslak' }), null);
    assert.equal(KURALLAR.sales_orders.kilit({ status: 'Kismi' }).kod, 'BELGE_KILITLI');
    assert.equal(KURALLAR.invoices.kilit({ status: 'Taslak', is_posted: true }).kod, 'BELGE_MUHASEBELESMIS');
    assert.equal(KURALLAR.invoices.kilit({ status: null, e_document_status: 'Gonderildi' }).kod, 'BELGE_EBELGE_GONDERILDI');
  });
});

describe('belge kilidi — API + DB', () => {
  let app;
  let pool;
  let partnerId;
  let itemId;
  let warehouseId;

  before(async () => {
    ({ app, pool } = buildApp());
    const p = await pool.query(
      `INSERT INTO partners (partner_code, partner_name) VALUES ($1, $2) RETURNING id`,
      [`${TAG}-C`, `${TAG} Test Cari`]
    );
    partnerId = p.rows[0].id;
    const i = await pool.query(
      `INSERT INTO items (item_code, item_name, uom_code) VALUES ($1, $2, 'ADET') RETURNING id`,
      [`${TAG}-S`, `${TAG} Test Stok`]
    );
    itemId = i.rows[0].id;
    const w = await pool.query(`SELECT id, plant_id FROM warehouses WHERE is_active IS DISTINCT FROM FALSE ORDER BY id LIMIT 1`);
    warehouseId = w.rows[0]?.id;
    if (warehouseId) {
      await pool.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active) VALUES ($1, $2, $3, TRUE)`,
        [itemId, warehouseId, w.rows[0].plant_id]
      );
    }
  });

  after(async () => {
    await bekle(100);
  });

  async function taslakFatura(extra = {}) {
    const r = await request(app, 'POST', '/invoices', {
      body: {
        partner_id: partnerId,
        invoice_type: 'Satis',
        status: 'Taslak',
        description: `${TAG} fatura`,
        kalemler: [{ item_id: itemId, quantity: 2, unit_price: 50, vat_rate: 20 }],
        ...extra,
      },
    });
    assert.equal(r.status, 201, r.text);
    return r.json;
  }

  it('taslak fatura düzenlenir ve silinir; silme audit\'e eski kayıtla yazılır', async () => {
    const f = await taslakFatura();
    const put = await request(app, 'PUT', `/invoices/${f.id}`, {
      body: { description: `${TAG} düzenlendi`, kalemler: [{ item_id: itemId, quantity: 3, unit_price: 50 }] },
    });
    assert.equal(put.status, 200, put.text);
    assert.equal(Number(put.json.kalemler[0].quantity), 3);

    const del = await request(app, 'DELETE', `/invoices/${f.id}`);
    assert.equal(del.status, 200, del.text);
    const a = await pool.query(
      `SELECT old_value FROM audit_logs WHERE table_name='invoices' AND record_id=$1 AND action='BELGE_SIL'`,
      [f.id]
    );
    assert.equal(a.rows.length, 1);
    assert.equal(a.rows[0].old_value.invoice_no, f.invoice_no);
  });

  it('muhasebeleşmiş fatura: PUT/DELETE 409, serbest alan ve aynı gövdeyle kaydet geçer, DB tetikleyicisi korur', async () => {
    const f = await taslakFatura();
    const muh = await request(app, 'POST', `/invoices/${f.id}/muhasebelestir`);
    let posted;
    if (muh.status === 201) {
      posted = muh.json.fatura;
    } else {
      // Hesap planı seed'i yoksa muhasebeleşmiş durumu doğrudan simüle et
      await pool.query(`UPDATE invoices SET is_posted=TRUE, status='Onayli' WHERE id=$1`, [f.id]);
      posted = (await request(app, 'GET', `/invoices/${f.id}`)).json;
    }
    assert.equal(posted.is_posted, true);

    const degis = await request(app, 'PUT', `/invoices/${f.id}`, {
      body: { ...posted, kalemler: [{ item_id: itemId, quantity: 99, unit_price: 50 }] },
    });
    assert.equal(degis.status, 409, degis.text);
    assert.equal(degis.json.kod, 'BELGE_MUHASEBELESMIS');
    assert.match(degis.json.hata, /muhasebeleşmiş/);
    assert.match(degis.json.alternatif, /iptal/);

    const tutar = await request(app, 'PUT', `/invoices/${f.id}`, { body: { payable_amount: 1 } });
    assert.equal(tutar.status, 409);

    const ayni = await request(app, 'PUT', `/invoices/${f.id}`, { body: posted });
    assert.equal(ayni.status, 200, ayni.text);

    const not = await request(app, 'PUT', `/invoices/${f.id}`, { body: { ...posted, internal_note: `${TAG} iç not` } });
    assert.equal(not.status, 200, not.text);
    assert.equal(not.json.internal_note, `${TAG} iç not`);

    const del = await request(app, 'DELETE', `/invoices/${f.id}`);
    assert.equal(del.status, 409);
    assert.equal(del.json.kod, 'BELGE_MUHASEBELESMIS');

    const sqlDel = await dbHata(pool, `DELETE FROM invoices WHERE id=$1`, [f.id]);
    assert.equal(sqlDel?.code, 'BK001');
    const sqlUpd = await dbHata(pool, `UPDATE invoices SET payable_amount = payable_amount + 1 WHERE id=$1`, [f.id]);
    assert.equal(sqlUpd?.code, 'BK001');
    const sqlLine = await dbHata(pool, `UPDATE invoice_lines SET quantity = 7 WHERE invoice_id=$1`, [f.id]);
    assert.equal(sqlLine?.code, 'BK001');
    const odeme = await dbHata(pool, `UPDATE invoices SET remaining_amount = 0 WHERE id=$1`, [f.id]);
    assert.equal(odeme, null, 'ödeme/kalan tutar güncellemesi engellenmemeli');

    // Bilinçli bakım kaçışı yalnız ilgili transaction'da çalışır
    await withTransaction(pool, async (c) => {
      await c.query(`SELECT set_config('erp.belge_kilit_bypass', 'on', true)`);
      await c.query(`UPDATE invoices SET payable_amount = payable_amount WHERE id=$1`, [f.id]);
    });

    await bekle(50);
    const red = await pool.query(
      `SELECT 1 FROM audit_logs WHERE table_name='invoices' AND record_id=$1 AND action='BELGE_KILIT_RED'`,
      [f.id]
    );
    assert.ok(red.rows.length >= 2, 'reddedilen girişimler audit\'e yazılmalı');
  });

  it('fatura iptali: ters fiş + ters cari hareket, tekrar iptal ve muhasebeleştirme engellenir', async () => {
    const f = await taslakFatura();
    const muh = await request(app, 'POST', `/invoices/${f.id}/muhasebelestir`);
    const iptal = await request(app, 'POST', `/invoices/${f.id}/iptal`, { body: { aciklama: 'yanlış cari' } });
    assert.equal(iptal.status, 200, iptal.text);
    assert.equal(iptal.json.fatura.status, 'Iptal');
    if (muh.status === 201 && muh.json.gl_document_id) {
      assert.ok(iptal.json.ters_fis_id, 'ters fiş oluşmalı');
      const fis = await pool.query(`SELECT reversal_document_id FROM journal_entries WHERE id=$1`, [muh.json.gl_document_id]);
      assert.equal(Number(fis.rows[0].reversal_document_id), Number(iptal.json.ters_fis_id));
      const cari = await pool.query(
        `SELECT direction, amount FROM partner_ledger_entries WHERE document_id=$1 AND document_type LIKE '%FATURA%' ORDER BY id`,
        [f.id]
      );
      assert.equal(cari.rows.length, 2);
      assert.notEqual(cari.rows[0].direction, cari.rows[1].direction);
      assert.equal(Number(cari.rows[0].amount), Number(cari.rows[1].amount));
    }
    const tekrar = await request(app, 'POST', `/invoices/${f.id}/iptal`);
    assert.equal(tekrar.status, 409);
    const yeniden = await request(app, 'POST', `/invoices/${f.id}/muhasebelestir`);
    assert.equal(yeniden.status, 409);
    const a = await pool.query(
      `SELECT 1 FROM audit_logs WHERE table_name='invoices' AND record_id=$1 AND action='BELGE_IPTAL'`,
      [f.id]
    );
    assert.equal(a.rows.length, 1);
  });

  it('e-belge gönderilmiş fatura iptal edilemez, iade akışı açık kalır', async () => {
    const f = await taslakFatura();
    await pool.query(`UPDATE invoices SET e_document_status='Gonderildi' WHERE id=$1`, [f.id]);
    const iptal = await request(app, 'POST', `/invoices/${f.id}/iptal`);
    assert.equal(iptal.status, 409);
    assert.match(iptal.json.hata, /iade/i);
    const iade = await request(app, 'POST', `/invoices/${f.id}/iade`);
    assert.equal(iade.status, 201, iade.text);
    assert.equal(iade.json.status, 'Taslak');
  });

  it('satış siparişi: taslak serbest; onaylı kilitli; iptal rezervasyonu çözer; DB silmeyi engeller', async () => {
    const yeni = await request(app, 'POST', '/sales_orders', {
      body: { partner_id: partnerId, order_type: 'Satis', kalemler: [{ item_id: itemId, quantity: 5, unit_price: 10 }] },
    });
    assert.equal(yeni.status, 201, yeni.text);
    const so = yeni.json;
    const taslakPut = await request(app, 'PUT', `/sales_orders/${so.id}`, {
      body: { kalemler: [{ item_id: itemId, quantity: 6, unit_price: 10 }] },
    });
    assert.equal(taslakPut.status, 200, taslakPut.text);

    const onay = await request(app, 'PUT', `/sales_orders/${so.id}`, { body: { status: 'Onayli' } });
    assert.equal(onay.status, 200, onay.text);
    assert.equal(onay.json.status, 'Onayli');

    const degis = await request(app, 'PUT', `/sales_orders/${so.id}`, {
      body: { kalemler: [{ item_id: itemId, quantity: 60, unit_price: 10 }] },
    });
    assert.equal(degis.status, 409, degis.text);
    assert.match(degis.json.hata, /onaylı; düzenlenemez/);

    const del = await request(app, 'DELETE', `/sales_orders/${so.id}`);
    assert.equal(del.status, 409);
    const sqlDel = await dbHata(pool, `DELETE FROM sales_orders WHERE id=$1`, [so.id]);
    assert.equal(sqlDel?.code, 'BK001');

    const geriAl = await request(app, 'PUT', `/sales_orders/${so.id}`, { body: { status: 'Taslak' } });
    assert.equal(geriAl.status, 200, geriAl.text);
    assert.equal(geriAl.json.status, 'Taslak');
    await request(app, 'PUT', `/sales_orders/${so.id}`, { body: { status: 'Onayli' } });

    const line = await pool.query(`SELECT id FROM sales_order_lines WHERE sales_order_id=$1 LIMIT 1`, [so.id]);
    await pool.query(
      `INSERT INTO item_reservations (sales_order_id, sales_order_line_id, item_id, warehouse_id, quantity, remaining_quantity, status)
       VALUES ($1,$2,$3,$4,1,1,'Aktif')`,
      [so.id, line.rows[0].id, itemId, warehouseId]
    ).catch(() => null);
    const iptal = await request(app, 'POST', `/sales_orders/${so.id}/iptal`);
    assert.equal(iptal.status, 200, iptal.text);
    assert.equal(iptal.json.status, 'Iptal');
    const aktif = await pool.query(`SELECT 1 FROM item_reservations WHERE sales_order_id=$1 AND status='Aktif'`, [so.id]);
    assert.equal(aktif.rows.length, 0);
    const sonra = await request(app, 'PUT', `/sales_orders/${so.id}`, { body: { status: 'Onayli' } });
    assert.equal(sonra.status, 409);

    const taslak = await request(app, 'POST', '/sales_orders', {
      body: { partner_id: partnerId, order_type: 'Satis', kalemler: [{ item_id: itemId, quantity: 1, unit_price: 10 }] },
    });
    const sil = await request(app, 'DELETE', `/sales_orders/${taslak.json.id}`);
    assert.equal(sil.status, 200, sil.text);
  });

  it('satınalma siparişi: onaylıda satır değişimi 409, mal kabul varken iptal yerine Kapali', async () => {
    const po = await pool.query(
      `INSERT INTO purchase_orders (order_no, partner_id, status) VALUES ($1,$2,'Onayli') RETURNING id`,
      [`${TAG}-PO`, partnerId]
    );
    const poId = po.rows[0].id;
    await pool.query(
      `INSERT INTO purchase_order_lines (purchase_order_id, item_id, quantity, unit_price) VALUES ($1,$2,10,5)`,
      [poId, itemId]
    );
    const degis = await request(app, 'PUT', `/satin-alma-siparisleri/${poId}`, {
      body: { satirlar: [{ item_id: itemId, quantity: 11, unit_price: 5 }] },
    });
    assert.equal(degis.status, 409, degis.text);
    const del = await request(app, 'DELETE', `/satin-alma-siparisleri/${poId}`);
    assert.equal(del.status, 409);

    await pool.query(
      `INSERT INTO goods_receipts (receipt_no, purchase_order_id, warehouse_id, status) VALUES ($1,$2,$3,'Onayli')`,
      [`${TAG}-MK`, poId, warehouseId]
    );
    const iptal = await request(app, 'POST', `/satin-alma-siparisleri/${poId}/iptal`);
    assert.equal(iptal.status, 409);
    assert.match(iptal.json.hata, /mal kabul/i);
    const kapat = await request(app, 'PUT', `/satin-alma-siparisleri/${poId}`, { body: { status: 'Kapali' } });
    assert.equal(kapat.status, 200, kapat.text);
    assert.equal(kapat.json.status, 'Kapali');

    const mk = await pool.query(`SELECT id FROM goods_receipts WHERE receipt_no=$1`, [`${TAG}-MK`]);
    const mkDel = await request(app, 'DELETE', `/mal-kabuller/${mk.rows[0].id}`);
    assert.equal(mkDel.status, 409);
    assert.match(mkDel.json.alternatif, /iade/);
    const mkPut = await request(app, 'PUT', `/mal-kabuller/${mk.rows[0].id}`, { body: {} });
    assert.equal(mkPut.status, 409);
  });

  it('üretim emri: başlamış emirde ürün/malzeme değişmez, plan alanı değişir; üretimi olan iptal edilemez', async () => {
    const e = await pool.query(
      `INSERT INTO production_orders (order_no, item_id, planned_quantity, status, is_started, is_approved, produced_quantity)
       VALUES ($1,$2,10,'Uretimde',TRUE,TRUE,4) RETURNING id`,
      [`${TAG}-UE`, itemId]
    );
    const id = e.rows[0].id;
    const urun = await request(app, 'PUT', `/uretim-emirleri/${id}`, { body: { planned_quantity: 50 } });
    assert.equal(urun.status, 409, urun.text);
    const plan = await request(app, 'PUT', `/uretim-emirleri/${id}`, { body: { description: `${TAG} plan notu` } });
    assert.equal(plan.status, 200, plan.text);
    assert.equal(plan.json.description, `${TAG} plan notu`);
    const del = await request(app, 'DELETE', `/uretim-emirleri/${id}`);
    assert.equal(del.status, 409);
    const iptal = await request(app, 'POST', `/uretim-emirleri/${id}/iptal`);
    assert.equal(iptal.status, 409);
    const kapat = await request(app, 'PUT', `/uretim-emirleri/${id}`, { body: { status: 'Kapali' } });
    assert.equal(kapat.status, 200, kapat.text);
    assert.equal(kapat.json.status, 'Kapali');
    assert.equal(kapat.json.is_open, 'Kapali');
    const sqlDel = await dbHata(pool, `DELETE FROM production_orders WHERE id=$1`, [id]);
    assert.equal(sqlDel?.code, 'BK001');

    const yeni = await pool.query(
      `INSERT INTO production_orders (order_no, item_id, planned_quantity, status) VALUES ($1,$2,5,'Acik') RETURNING id`,
      [`${TAG}-UE2`, itemId]
    );
    const sil = await request(app, 'DELETE', `/uretim-emirleri/${yeni.rows[0].id}`);
    assert.equal(sil.status, 200, sil.text);
  });

  it('manuel stok hareketi: PUT/DELETE yerine ters hareket; bakiye geri döner', async (t) => {
    if (!warehouseId) return t.skip('depo seed yok');
    const kod = await pool.query(`SELECT id FROM movement_codes WHERE document_type='StokGiris' AND is_active ORDER BY id LIMIT 1`);
    if (!kod.rows[0]) return t.skip('STG hareket kodu yok');
    const giris = await request(app, 'POST', '/stok-hareketleri', {
      body: {
        movement_code_id: kod.rows[0].id,
        warehouse_id: warehouseId,
        description: `${TAG} giriş`,
        satirlar: [{ item_id: itemId, quantity: 7, unit_price: 3 }],
      },
    });
    assert.equal(giris.status, 201, giris.text);
    const hid = giris.json.id;
    assert.equal(Number(await warehouseItemBalance(pool, warehouseId, itemId)), 7);

    const miktar = await request(app, 'PUT', `/stok-hareketleri/${hid}`, {
      body: { ...giris.json, satirlar: [{ item_id: itemId, quantity: 70 }] },
    });
    assert.equal(miktar.status, 409, miktar.text);
    assert.equal(miktar.json.kod, 'STOK_HAREKET_KILITLI');
    const aciklama = await request(app, 'PUT', `/stok-hareketleri/${hid}`, { body: { description: `${TAG} düzeltildi` } });
    assert.equal(aciklama.status, 200, aciklama.text);
    assert.equal(aciklama.json.description, `${TAG} düzeltildi`);
    const del = await request(app, 'DELETE', `/stok-hareketleri/${hid}`);
    assert.equal(del.status, 409);

    const iptal = await request(app, 'POST', `/stok-hareketleri/${hid}/iptal`);
    assert.equal(iptal.status, 201, iptal.text);
    assert.equal(iptal.json.orijinal.approval_status, 'Iptal');
    assert.equal(iptal.json.ters_hareketler.length, 1);
    assert.equal(iptal.json.ters_hareketler[0].document_type, 'STOK_IPTAL');
    assert.equal(Number(await warehouseItemBalance(pool, warehouseId, itemId)), 0);

    const tekrar = await request(app, 'POST', `/stok-hareketleri/${hid}/iptal`);
    assert.equal(tekrar.status, 409);
    const tersIptal = await request(app, 'POST', `/stok-hareketleri/${iptal.json.ters_hareketler[0].id}/iptal`);
    assert.equal(tersIptal.status, 409);
  });

  it('kesin muhasebe fişi: API 409 (KESIN_FIS_KILIT), DB satır/silme koruması', async () => {
    const hesap = await pool.query(`SELECT id FROM gl_accounts ORDER BY id LIMIT 2`);
    const fis = await pool.query(
      `INSERT INTO journal_entries (document_no, document_date, status, is_locked) VALUES ($1, CURRENT_DATE, 'Taslak', FALSE) RETURNING id`,
      [`${TAG}-MF`]
    );
    const fid = fis.rows[0].id;
    if (hesap.rows.length === 2) {
      await pool.query(
        `INSERT INTO journal_entry_lines (document_id, account_id, debit, credit, line_no) VALUES ($1,$2,10,0,1), ($1,$3,0,10,2)`,
        [fid, hesap.rows[0].id, hesap.rows[1].id]
      );
    }
    await pool.query(`UPDATE journal_entries SET status='Onayli', is_locked=TRUE WHERE id=$1`, [fid]);
    const put = await request(app, 'PUT', `/muhasebe-belgeleri/${fid}`, { body: { description: 'değişti' } });
    assert.equal(put.status, 409, put.text);
    assert.equal(put.json.kod, 'KESIN_FIS_KILIT');
    const del = await request(app, 'DELETE', `/muhasebe-belgeleri/${fid}`);
    assert.equal(del.status, 409);
    const sqlDel = await dbHata(pool, `DELETE FROM journal_entries WHERE id=$1`, [fid]);
    assert.equal(sqlDel?.code, 'BK001');
    if (hesap.rows.length === 2) {
      const sqlLine = await dbHata(pool, `UPDATE journal_entry_lines SET debit = 99 WHERE document_id=$1`, [fid]);
      assert.equal(sqlLine?.code, 'BK001');
    }
  });

  it('satınalma teklifi (_belgeCrud): onaylıda satır değişimi 409, taslağa geri alınca düzenlenir', async () => {
    const yeni = await request(app, 'POST', '/satin-alma-teklifleri', {
      body: { partner_id: partnerId, satirlar: [{ item_id: itemId, quantity: 3, unit_price: 4 }] },
    });
    assert.equal(yeni.status, 201, yeni.text);
    const id = yeni.json.id;
    const onay = await request(app, 'PUT', `/satin-alma-teklifleri/${id}`, { body: { status: 'Onayli' } });
    assert.equal(onay.status, 200, onay.text);
    const degis = await request(app, 'PUT', `/satin-alma-teklifleri/${id}`, {
      body: { satirlar: [{ item_id: itemId, quantity: 30, unit_price: 4 }] },
    });
    assert.equal(degis.status, 409);
    const del = await request(app, 'DELETE', `/satin-alma-teklifleri/${id}`);
    assert.equal(del.status, 409);
    const geri = await request(app, 'PUT', `/satin-alma-teklifleri/${id}`, { body: { status: 'Taslak' } });
    assert.equal(geri.status, 200, geri.text);
    const duzen = await request(app, 'PUT', `/satin-alma-teklifleri/${id}`, {
      body: { satirlar: [{ item_id: itemId, quantity: 30, unit_price: 4 }] },
    });
    assert.equal(duzen.status, 200, duzen.text);
    const sil = await request(app, 'DELETE', `/satin-alma-teklifleri/${id}`);
    assert.equal(sil.status, 200, sil.text);
  });
});
