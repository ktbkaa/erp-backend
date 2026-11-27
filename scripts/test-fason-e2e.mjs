#!/usr/bin/env node
/**
 * Fason uçtan uca smoke: cari→op→sipariş→sevk→tüketim→teslim→emanet.
 */
import 'dotenv/config';
import pg from 'pg';

const BASE = process.env.ERP_BASE || 'http://127.0.0.1:3000';
const headers = {
  'Content-Type': 'application/json',
  'X-Kullanici-Kodu': 'owner',
  'X-Firma-Id': '1',
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  // Health
  const health = await api('/health');
  check('API health', health.ok, String(health.status));

  // Seed-ish: mark a supplier as fasoncu
  const cari = await pool.query(
    `SELECT id, partner_code FROM partners WHERE partner_type IN ('Tedarikci','HerIkisi') AND is_active ORDER BY id LIMIT 1`,
  );
  if (!cari.rows[0]) {
    check('Fasoncu cari', false, 'tedarikçi yok');
    await pool.end();
    process.exit(1);
  }
  const partnerId = cari.rows[0].id;
  await pool.query(`UPDATE partners SET is_subcontractor=TRUE WHERE id=$1`, [partnerId]);
  check('Fasoncu işaretlendi', true, cari.rows[0].partner_code);

  const listF = await api('/partners?is_subcontractor=true&is_active=true');
  check('partners-fasoncu filtre', listF.ok && Array.isArray(listF.body) && listF.body.some((p) => p.id === partnerId));

  // Operasyon tanımı
  const opCode = `BOYAMA-${Date.now().toString().slice(-6)}`;
  const op = await api('/fason-operasyonlari', {
    method: 'POST',
    body: JSON.stringify({
      operation_code: opCode,
      operation_name: 'Fason Boyama',
      pricing_method: 'Adet',
      qc_required: true,
    }),
  });
  check('Fason operasyon tanımı', op.status === 201, op.body?.operation_code || op.body?.hata);

  // Fiyat
  const price = await api('/fason-fiyatlari', {
    method: 'POST',
    body: JSON.stringify({
      partner_id: partnerId,
      operation_def_id: op.body?.id,
      unit_price: 12.5,
      currency_code: 'TRY',
      pricing_method: 'Adet',
    }),
  });
  check('Fason fiyat', price.status === 201, price.body?.unit_price || price.body?.hata);

  // Parametre
  const company = await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
  const companyId = company.rows[0]?.id;
  const par = await api('/fason-parametreleri', {
    method: 'POST',
    body: JSON.stringify({
      company_id: companyId,
      max_scrap_pct: 5,
      qc_required: false,
      allow_partial_delivery: true,
    }),
  });
  check('Fason parametre', par.status === 201 || par.ok, par.body?.hata || '');

  // Item + warehouse for ship/receive
  const item = await pool.query(`SELECT id, item_code FROM items WHERE is_active ORDER BY id LIMIT 1`);
  const wh = await pool.query(`SELECT id FROM warehouses WHERE warehouse_role <> 'FasonEmanet' ORDER BY id LIMIT 1`);
  const itemId = item.rows[0]?.id;
  const whId = wh.rows[0]?.id;
  check('Stok/depo hazır', Boolean(itemId && whId), `item=${item.rows[0]?.item_code} wh=${whId}`);

  // Ensure some stock in warehouse via direct movement if needed
  const bal = await pool.query(
    `
    SELECT COALESCE(SUM(s.quantity*s.direction),0)::numeric b
    FROM stock_movement_lines s
    JOIN stock_movements h ON h.id=s.movement_id
    WHERE h.warehouse_id=$1 AND s.item_id=$2
    `,
    [whId, itemId],
  );
  if (Number(bal.rows[0].b) < 100) {
    // inject stock with a bilgi/giriş movement using service via SQL simple insert is hard; use API if exists
    const hk = await pool.query(`SELECT id FROM movement_codes WHERE direction='Giris' AND affects_stock LIMIT 1`);
    if (hk.rows[0]) {
      const { createStockMovement } = await import('../src/services/stokHareketService.js');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await createStockMovement(client, {
          hareketTipi: 'FasonTestGiris',
          depoId: whId,
          belgeTipi: 'Test',
          hareketKoduId: hk.rows[0].id,
          firmaId: companyId,
          depoZorunluAtla: true,
          satirlar: [{ item_id: itemId, quantity: 500, direction: 1, stock_status: 'Kullanilabilir' }],
        });
        await client.query('COMMIT');
        check('Test stok girişi', true, '500');
      } catch (e) {
        await client.query('ROLLBACK');
        check('Test stok girişi', false, e.message);
      } finally {
        client.release();
      }
    }
  } else {
    check('Mevcut stok yeterli', true, String(bal.rows[0].b));
  }

  // Create subcontract order
  const order = await api('/fason-siparisleri', {
    method: 'POST',
    body: JSON.stringify({
      partner_id: partnerId,
      company_id: companyId,
      order_mode: 'Komple',
      description: 'E2E fason test',
      satirlar: [{
        item_id: itemId,
        operation_code: opCode,
        operation_name: 'Fason Boyama',
        ordered_qty: 100,
        unit_price: 12.5,
      }],
    }),
  });
  check('Fason sipariş oluştur', order.status === 201, order.body?.order_no || order.body?.hata);
  const orderId = order.body?.id;

  // Ship
  const sevk = await api(`/fason-siparisleri/${orderId}/sevk`, {
    method: 'POST',
    body: JSON.stringify({
      from_warehouse_id: whId,
      satirlar: [{
        item_id: itemId,
        quantity: 100,
        order_line_id: order.body?.satirlar?.[0]?.id,
      }],
    }),
  });
  check('Malzeme sevki (≠ tüketim)', sevk.status === 201, sevk.body?.shipment?.shipment_no || sevk.body?.hata);

  // Emanet balance
  const emanet = await api(`/fason-emanet-stok?partner_id=${partnerId}`);
  const emBal = Array.isArray(emanet.body)
    ? emanet.body.find((r) => r.item_id === itemId)
    : null;
  check('Emanet stok arttı', emanet.ok && emBal && Number(emBal.bakiye) >= 100, emBal ? String(emBal.bakiye) : 'yok');

  // Consume 90 + scrap 5
  const tuk = await api(`/fason-siparisleri/${orderId}/tuketim`, {
    method: 'POST',
    body: JSON.stringify({
      satirlar: [{
        item_id: itemId,
        order_line_id: order.body?.satirlar?.[0]?.id,
        consumed_qty: 90,
        scrap_qty: 5,
        scrap_reason: 'Boyama fire',
      }],
    }),
  });
  check('Tüketim bildirimi (sevkten ayrı)', tuk.status === 201, tuk.body?.consumption?.consumption_no || tuk.body?.hata);

  // Receive 100 (product) — may be same item for smoke
  const tes = await api(`/fason-siparisleri/${orderId}/teslimat`, {
    method: 'POST',
    body: JSON.stringify({
      to_warehouse_id: whId,
      create_qc: false,
      satirlar: [{
        item_id: itemId,
        order_line_id: order.body?.satirlar?.[0]?.id,
        received_qty: 40,
        unit_price: 12.5,
      }],
    }),
  });
  check('Kısmi teslimat 40', tes.status === 201, tes.body?.receipt?.receipt_no || tes.body?.hata);

  const tes2 = await api(`/fason-siparisleri/${orderId}/teslimat`, {
    method: 'POST',
    body: JSON.stringify({
      to_warehouse_id: whId,
      create_qc: false,
      satirlar: [{
        item_id: itemId,
        order_line_id: order.body?.satirlar?.[0]?.id,
        received_qty: 60,
        unit_price: 12.5,
      }],
    }),
  });
  check('İkinci teslimat 60', tes2.status === 201, tes2.body?.receipt?.receipt_no || tes2.body?.hata);

  // Over receipt should fail
  const over = await api(`/fason-siparisleri/${orderId}/teslimat`, {
    method: 'POST',
    body: JSON.stringify({
      to_warehouse_id: whId,
      create_qc: false,
      satirlar: [{
        item_id: itemId,
        order_line_id: order.body?.satirlar?.[0]?.id,
        received_qty: 10,
        unit_price: 12.5,
      }],
    }),
  });
  check('Fazla teslimat engeli', over.status === 409 || (over.body?.kod === 'FAZLA_TESLIMAT'), over.body?.hata || String(over.status));

  const final = await api(`/fason-siparisleri/${orderId}`);
  const line = final.body?.satirlar?.[0];
  check('Sipariş miktar tutarlılığı', final.ok && line
    && Number(line.ordered_qty) === 100
    && Number(line.received_qty) === 100
    && Number(line.accepted_qty) === 100, JSON.stringify({
    ordered: line?.ordered_qty, sent: line?.sent_qty, consumed: line?.consumed_qty,
    scrap: line?.scrap_qty, received: line?.received_qty, accepted: line?.accepted_qty,
  }));

  check('Tahmini ≠ boş maliyet kaydı', Array.isArray(final.body?.maliyetler) && final.body.maliyetler.length > 0,
    `adet=${final.body?.maliyetler?.length}`);

  // Duplicate sevk idempotency not required; cancel test
  const iptalOrder = await api('/fason-siparisleri', {
    method: 'POST',
    body: JSON.stringify({
      partner_id: partnerId,
      company_id: companyId,
      order_mode: 'Operasyon',
      satirlar: [{ item_id: itemId, ordered_qty: 10, unit_price: 1, operation_name: 'Test' }],
    }),
  });
  const ipt = await api(`/fason-siparisleri/${iptalOrder.body?.id}/iptal`, { method: 'POST', body: '{}' });
  check('Sipariş iptal', ipt.ok && ipt.body?.status === 'Iptal', ipt.body?.status || ipt.body?.hata);

  await pool.end();

  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Fason Test Raporu',
    '',
    `Tarih (UTC): ${new Date().toISOString()}`,
    '',
    `Sonuç: **${failed.length ? 'KISMI/BAŞARISIZ' : 'BAŞARILI'}** — ${results.length - failed.length}/${results.length}`,
    '',
    '| Test | Sonuç | Detay |',
    '|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail || ''} |`),
    '',
    failed.length ? `## Başarısız\n\n${failed.map((f) => `- ${f.name}: ${f.detail}`).join('\n')}\n` : '## Giderilemeyen sorun yok\n',
  ].join('\n');

  const fs = await import('fs');
  fs.mkdirSync('docs/subcontracting', { recursive: true });
  fs.writeFileSync('docs/subcontracting/TEST_REPORT.md', report);
  console.log(failed.length ? `\n${failed.length} failed` : '\nAll passed');
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
