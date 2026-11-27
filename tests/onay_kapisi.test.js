/**
 * Genel onay kapısı: kural yoksa belge eskisi gibi akar; belge türüne bağlı kural
 * varsa belge onay bekler, Onay Bekleyenler'den (tekil/toplu) onaylanır, ret/iptal
 * sonucu kural bazında ayarlanır, her adım onay izine yazılır.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../db');
const { request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { createStockMovement } = require('../src/services/stokHareketService');

describe('genel onay kapısı', () => {
  let app;
  const sfx = String(Date.now()).slice(-7);
  const adminCode = `tst-onay-adm-${sfx}`;
  const approverCode = `tst-onay-usr-${sfx}`;
  const roleA = `TST Onay A ${sfx}`;
  const roleB = `TST Onay B ${sfx}`;
  let companyId;
  let adminId;
  let approverId;
  let itemId;
  let supplierId;
  let srcWh;
  let dstWh;
  const ruleIds = [];
  const routeIds = [];
  const transferIds = [];
  const poIds = [];

  const admin = () => ({ 'X-Kullanici-Kodu': adminCode, 'X-Firma-Id': String(companyId) });
  const approver = () => ({ 'X-Kullanici-Kodu': approverCode, 'X-Firma-Id': String(companyId) });

  async function newTransfer(qty = 2) {
    const r = await request(app, 'POST', '/transfer-emirleri', {
      headers: admin(),
      body: { source_warehouse_id: srcWh, target_warehouse_id: dstWh, satirlar: [{ item_id: itemId, quantity: qty }] },
    });
    assert.equal(r.status, 201, r.text);
    transferIds.push(r.json.id);
    return r.json;
  }

  async function newPurchaseOrder() {
    const r = await pool.query(
      `INSERT INTO purchase_orders (order_no, partner_id, company_id, status, total_amount, currency_code)
       VALUES ($1, $2, $3, 'Taslak', 1500, 'TRY') RETURNING id`,
      [`TST-PO-${sfx}-${poIds.length}`, supplierId, companyId],
    );
    poIds.push(r.rows[0].id);
    return r.rows[0].id;
  }

  async function createGateRule(body) {
    const r = await request(app, 'POST', '/onay-kurallari', {
      headers: admin(),
      body: { rule_name: `TST kapı ${sfx}`, company_id: companyId, ...body },
    });
    assert.equal(r.status, 201, r.text);
    ruleIds.push(r.json.id);
    const route = await pool.query(
      `INSERT INTO approval_routes (route_code, route_name, screen_id, rule_id, company_id, is_active, version_no)
       VALUES ($1, $2, $3, $4, $5, TRUE, 1) RETURNING id`,
      [`TST-RT-${sfx}-${ruleIds.length}`, 'TST rota', r.json.screen_id, r.json.id, companyId],
    );
    routeIds.push(route.rows[0].id);
    await pool.query(
      `INSERT INTO approval_route_steps (route_id, line_no, step_name, role_name)
       VALUES ($1, 10, 'Birinci onay', $2), ($1, 20, 'İkinci onay', $3)`,
      [route.rows[0].id, roleA, roleB],
    );
    return r.json;
  }

  async function setRuleActive(id, active) {
    await pool.query('UPDATE approval_rules SET is_active = $2 WHERE id = $1', [id, active]);
  }

  async function docStatus(table, id) {
    const r = await pool.query(`SELECT status FROM ${table} WHERE id = $1`, [id]);
    return r.rows[0]?.status;
  }

  async function auditActions(code, id) {
    const r = await request(app, 'GET', `/onay-izi?document_type_code=${code}&document_id=${id}`, { headers: admin() });
    assert.equal(r.status, 200, r.text);
    return r.json.map((x) => x.action).reverse();
  }

  before(async () => {
    require('dotenv').config();
    if (process.env.ERP_AUTH_SOFT == null) process.env.ERP_AUTH_SOFT = '1';
    const { authOptional, authRequired } = require('../src/middleware/authJwt');
    app = express();
    app.use(express.json());
    app.use(authOptional);
    app.use(authRequired);
    app.use('/transfer-emirleri', require('../routes/transfer_orders'));
    app.use('/satin-alma-siparisleri', require('../routes/purchase_orders'));
    app.use('/onay-kurallari', require('../routes/approval_rules'));
    app.use('/onay-kayitlari', require('../routes/approval_records'));
    app.use('/onay-bekleyenler', require('../routes/approval_inbox'));
    app.use('/onay-izi', require('../routes/approval_audit'));
    app.use('/onay-belge-turleri', require('../routes/approval_document_types'));

    const c = await pool.query(
      `INSERT INTO companies (company_code, company_name) VALUES ($1, $2) RETURNING id`,
      [`TSTONAY${sfx}`, `Onay test ${sfx}`],
    );
    companyId = c.rows[0].id;
    adminId = (await pool.query(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active)
       VALUES ('Test', 'Yonetici', $1, 'Yonetici', TRUE) RETURNING id`, [adminCode],
    )).rows[0].id;
    approverId = (await pool.query(
      `INSERT INTO users (first_name, last_name, user_code, role, is_active)
       VALUES ('Test', 'Onayci', $1, 'Personel', TRUE) RETURNING id`, [approverCode],
    )).rows[0].id;
    await pool.query(
      `INSERT INTO approval_roles (role_code, role_name, user_id, company_id, is_active)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [`TST-RA-${sfx}`, roleA, approverId, companyId],
    );

    const wh = await pool.query('SELECT id FROM warehouses ORDER BY id LIMIT 2');
    assert.equal(wh.rows.length, 2, 'test için iki depo gerekli');
    [srcWh, dstWh] = wh.rows.map((x) => x.id);
    supplierId = (await pool.query(
      `SELECT id FROM partners WHERE partner_type IN ('Tedarikci','HerIkisi') ORDER BY id LIMIT 1`,
    )).rows[0]?.id;
    assert.ok(supplierId, 'test için tedarikçi gerekli');
    itemId = await withTransaction(pool, async (client) => {
      const it = await client.query(
        `INSERT INTO items (item_code, item_name, item_type, uom_code, is_active)
         VALUES ($1, 'Onay test stok', 'Ticari', 'AD', TRUE) RETURNING id`,
        [`TST-ONAY-${sfx}`],
      );
      for (const wh of [srcWh, dstWh]) {
        await client.query(
          `INSERT INTO item_warehouses (item_id, warehouse_id, is_active) VALUES ($1, $2, TRUE)`,
          [it.rows[0].id, wh],
        );
      }
      await createStockMovement(client, {
        hareketTipi: 'STOK_GIRIS',
        depoId: srcWh,
        depoZorunluAtla: true,
        satirlar: [{ item_id: it.rows[0].id, quantity: 100, direction: 1, uom_code: 'AD' }],
      });
      return it.rows[0].id;
    });
  });

  after(async () => {
    const q = (sql, p) => pool.query(sql, p).catch(() => {});
    await q('DELETE FROM approval_audit_log WHERE company_id = $1', [companyId]);
    await q(`DELETE FROM approval_audit_log WHERE document_type_code = 'DEPO_TRANSFER' AND document_id = ANY($1)`, [transferIds]);
    await q('DELETE FROM approval_records WHERE company_id = $1', [companyId]);
    await q('DELETE FROM approval_routes WHERE id = ANY($1)', [routeIds]);
    await q('DELETE FROM approval_rules WHERE id = ANY($1)', [ruleIds]);
    await q('DELETE FROM approval_roles WHERE company_id = $1', [companyId]);
    await q('DELETE FROM purchase_orders WHERE id = ANY($1)', [poIds]);
    await q('DELETE FROM users WHERE id = ANY($1)', [[adminId, approverId]]);
  });

  it('belge türü kaydı var; seed hiçbir kuralı belge türüne bağlamaz', async () => {
    const r = await request(app, 'GET', '/onay-belge-turleri', { headers: admin() });
    assert.equal(r.status, 200, r.text);
    const codes = r.json.map((x) => x.document_type_code);
    assert.ok(codes.includes('DEPO_TRANSFER'));
    assert.ok(codes.includes('SATINALMA_SIPARIS'));
    const dt = r.json.find((x) => x.document_type_code === 'DEPO_TRANSFER');
    assert.equal(dt.pending_status, 'OnayBekliyor');
    assert.deepEqual(dt.outcome_codes.sort(), ['IPTAL', 'TASLAK']);
    const seeded = await pool.query(
      `SELECT rule_code FROM approval_rules
       WHERE document_type_code IS NOT NULL AND rule_code IN
         ('OM-SA-TALEP','OM-SA-SIPARIS','PRJ_PROJECT_CLOSE','PRJ_WI_APPROVAL','PRJ_BUDGET_OVERRUN')`,
    );
    assert.equal(seeded.rows.length, 0);
  });

  it('kural yokken transfer ve satınalma siparişi eskisi gibi akar', async () => {
    const t = await newTransfer();
    const ok = await request(app, 'POST', `/transfer-emirleri/${t.id}/onayla`, { headers: admin() });
    assert.equal(ok.status, 200, ok.text);
    assert.equal(ok.json.status, 'Tamamlandi');
    assert.ok(ok.json.source_movement_id);
    assert.equal(ok.json.onay_bekliyor, undefined);

    const poId = await newPurchaseOrder();
    const po = await request(app, 'POST', `/satin-alma-siparisleri/${poId}/onayla`, { headers: admin() });
    assert.equal(po.status, 200, po.text);
    assert.equal(po.json.status, 'Onayli');
    assert.equal(po.json.onay_bekliyor, false);

    const kayit = await pool.query(
      `SELECT 1 FROM approval_records WHERE document_type_code IS NOT NULL AND company_id = $1`, [companyId],
    );
    assert.equal(kayit.rows.length, 0);
  });

  it('kural açıkken transfer onaya gider, rol bazlı gelen kutusu ve toplu onayla ilerler', async () => {
    const rule = await createGateRule({ document_type_code: 'DEPO_TRANSFER' });
    assert.equal(rule.screen_id, 'transfer-emirleri');
    assert.equal(rule.document_type_name, 'Depo transfer emri');
    try {
      const t = await newTransfer(3);
      const sub = await request(app, 'POST', `/transfer-emirleri/${t.id}/onayla`, { headers: admin() });
      assert.equal(sub.status, 200, sub.text);
      assert.equal(sub.json.status, 'OnayBekliyor');
      assert.equal(sub.json.onay_bekliyor, true);
      assert.equal(sub.json.source_movement_id, null, 'onay beklerken stok hareketi olmamalı');
      const recId = sub.json.onay_kayit.id;

      const again = await request(app, 'POST', `/transfer-emirleri/${t.id}/onayla`, { headers: admin() });
      assert.equal(again.status, 409, again.text);
      assert.equal(again.json.kod, 'ONAY_BEKLIYOR');

      const inbox = await request(app, 'GET', '/onay-bekleyenler?document_type_code=DEPO_TRANSFER', { headers: approver() });
      assert.equal(inbox.status, 200, inbox.text);
      const row = inbox.json.find((x) => x.id === recId);
      assert.ok(row, 'onaycının gelen kutusunda kayıt olmalı');
      assert.equal(row.document_type_name, 'Depo transfer emri');
      assert.equal(row.active_role_name, roleA);

      const step1 = await request(app, 'POST', '/onay-bekleyenler/toplu-onayla', {
        headers: approver(), body: { ids: [recId] },
      });
      assert.equal(step1.status, 200, step1.text);
      assert.equal(step1.json.basarili_sayisi, 1, step1.text);
      assert.equal(await docStatus('transfer_orders', t.id), 'OnayBekliyor');

      const noRole = await request(app, 'POST', '/onay-bekleyenler/toplu-onayla', {
        headers: approver(), body: { ids: [recId] },
      });
      assert.equal(noRole.json.hata_sayisi, 1);
      assert.match(noRole.json.hatali[0].hata, /onay rolünüz yok/);

      const final = await request(app, 'POST', `/onay-kayitlari/${recId}/onayla`, { headers: admin() });
      assert.equal(final.status, 200, final.text);
      assert.equal(final.json.status_code, 'ONAYLANDI');
      assert.equal(await docStatus('transfer_orders', t.id), 'Onayli');

      const run = await request(app, 'POST', `/transfer-emirleri/${t.id}/onayla`, { headers: admin() });
      assert.equal(run.status, 200, run.text);
      assert.equal(run.json.status, 'Tamamlandi');
      assert.ok(run.json.source_movement_id);
      assert.ok(run.json.approved_by, 'onaylayan korunmalı');

      assert.deepEqual(
        await auditActions('DEPO_TRANSFER', t.id),
        ['GONDERILDI', 'ADIM_ONAYLANDI', 'ADIM_ONAYLANDI', 'ONAYLANDI'],
      );
    } finally {
      await setRuleActive(rule.id, false);
    }
  });

  it('ret ve iptal sonucu kural bazında ayarlanır (Taslak / İptal)', async () => {
    const bad = await request(app, 'POST', '/onay-kurallari', {
      headers: admin(),
      body: { rule_name: 'geçersiz', document_type_code: 'DEPO_TRANSFER', reject_outcome: 'XYZ' },
    });
    assert.equal(bad.status, 400, bad.text);

    const rule = await createGateRule({ document_type_code: 'DEPO_TRANSFER' });
    try {
      const t1 = await newTransfer();
      const s1 = await request(app, 'POST', `/transfer-emirleri/${t1.id}/onayla`, { headers: admin() });
      const r1 = await request(app, 'POST', `/onay-kayitlari/${s1.json.onay_kayit.id}/reddet`, {
        headers: admin(), body: { notes: 'eksik bilgi' },
      });
      assert.equal(r1.status, 200, r1.text);
      assert.equal(await docStatus('transfer_orders', t1.id), 'Taslak', 'varsayılan ret sonucu Taslak');

      const upd = await request(app, 'PUT', `/onay-kurallari/${rule.id}`, {
        headers: admin(), body: { reject_outcome: 'IPTAL' },
      });
      assert.equal(upd.status, 200, upd.text);
      assert.equal(upd.json.reject_outcome, 'IPTAL');

      const t2 = await newTransfer();
      const s2 = await request(app, 'POST', `/transfer-emirleri/${t2.id}/onayla`, { headers: admin() });
      const r2 = await request(app, 'POST', '/onay-bekleyenler/toplu-reddet', {
        headers: admin(), body: { ids: [s2.json.onay_kayit.id], notes: 'gereksiz' },
      });
      assert.equal(r2.json.basarili_sayisi, 1, r2.text);
      assert.equal(await docStatus('transfer_orders', t2.id), 'Iptal');
      assert.deepEqual(await auditActions('DEPO_TRANSFER', t2.id), ['GONDERILDI', 'REDDEDILDI']);

      const t3 = await newTransfer();
      const s3 = await request(app, 'POST', `/transfer-emirleri/${t3.id}/onayla`, { headers: admin() });
      const c3 = await request(app, 'POST', `/onay-kayitlari/${s3.json.onay_kayit.id}/iptal`, { headers: admin() });
      assert.equal(c3.status, 200, c3.text);
      assert.equal(await docStatus('transfer_orders', t3.id), 'Taslak', 'iptal sonucu varsayılanı Taslak');
    } finally {
      await setRuleActive(rule.id, false);
    }
  });

  it('satınalma siparişinde onay kapısı elle durum değişikliğiyle delinemez', async () => {
    const rule = await createGateRule({ document_type_code: 'SATINALMA_SIPARIS' });
    try {
      const poId = await newPurchaseOrder();
      const manual = await request(app, 'PUT', `/satin-alma-siparisleri/${poId}`, {
        headers: admin(), body: { status: 'Onayli' },
      });
      assert.equal(manual.status, 409, manual.text);

      const sub = await request(app, 'POST', `/satin-alma-siparisleri/${poId}/onayla`, { headers: admin() });
      assert.equal(sub.status, 200, sub.text);
      assert.equal(sub.json.status, 'OnayBekliyor');
      assert.equal(sub.json.onay_bekliyor, true);

      const bypass = await request(app, 'PUT', `/satin-alma-siparisleri/${poId}`, {
        headers: admin(), body: { status: 'Taslak' },
      });
      assert.equal(bypass.status, 409, bypass.text);

      const recId = sub.json.onay_kayit.id;
      await request(app, 'POST', `/onay-kayitlari/${recId}/onayla`, { headers: admin() });
      await request(app, 'POST', `/onay-kayitlari/${recId}/onayla`, { headers: admin() });
      const po = await pool.query('SELECT status, approved_at FROM purchase_orders WHERE id = $1', [poId]);
      assert.equal(po.rows[0].status, 'Onayli');
      assert.ok(po.rows[0].approved_at);

      await pool.query('UPDATE approval_rules SET auto_approve = TRUE WHERE id = $1', [rule.id]);
      const po2 = await newPurchaseOrder();
      const auto = await request(app, 'POST', `/satin-alma-siparisleri/${po2}/onayla`, { headers: admin() });
      assert.equal(auto.status, 200, auto.text);
      assert.equal(auto.json.status, 'Onayli', 'otomatik onay kuralında belge eskisi gibi onaylanır');
      assert.deepEqual(await auditActions('SATINALMA_SIPARIS', po2), ['OTOMATIK_ONAY']);
    } finally {
      await setRuleActive(rule.id, false);
    }
  });
});
