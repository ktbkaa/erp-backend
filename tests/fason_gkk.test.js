/**
 * Fason teslimat → GKK kapısı: emir oluşur, kabul öncesi üretim yansımaz,
 * require_qc_before_consume tüketimi engeller.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const fason = require('../src/services/fasonService');
const { approveQcOrder } = require('../src/services/kaliteService');
const { createStockMovement } = require('../src/services/stokHareketService');

async function seedBasics() {
  const company = (await pool.query(`SELECT id FROM companies ORDER BY id LIMIT 1`)).rows[0];
  assert.ok(company, 'firma yok');
  const plant = (await pool.query(
    `SELECT id FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`,
    [company.id],
  )).rows[0];
  const partner = (await pool.query(
    `SELECT id FROM partners WHERE partner_type IN ('Tedarikci','HerIkisi') AND is_active ORDER BY id LIMIT 1`,
  )).rows[0];
  assert.ok(partner, 'tedarikçi yok');
  await pool.query(`UPDATE partners SET is_subcontractor=TRUE WHERE id=$1`, [partner.id]);

  const item = (await pool.query(`SELECT id, uom_code FROM items WHERE is_active ORDER BY id LIMIT 1`)).rows[0];
  const wh = (await pool.query(
    `SELECT id FROM warehouses WHERE warehouse_role IS DISTINCT FROM 'FasonEmanet' ORDER BY id LIMIT 1`,
  )).rows[0];
  assert.ok(item && wh, 'stok/depo yok');

  // Stok-depo bağları (otomatik oluşturma yok; test önceden tanımlar)
  const allWh = (await pool.query(`SELECT id, plant_id FROM warehouses`)).rows;
  for (const w of allWh) {
    await pool.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
         SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
       )`,
      [item.id, w.id, w.plant_id || plant?.id || null],
    );
  }

  // Parametre: GKK açık + sıkı tüketim kilidi
  await pool.query(
    `
    INSERT INTO subcontract_parameters (
      company_id, qc_required, qc_on_receipt, block_production_until_qc,
      require_qc_before_consume, allow_partial_delivery, max_scrap_pct
    ) VALUES ($1, TRUE, TRUE, TRUE, TRUE, TRUE, 10)
    ON CONFLICT (company_id) DO UPDATE SET
      qc_required=TRUE, qc_on_receipt=TRUE, block_production_until_qc=TRUE,
      require_qc_before_consume=TRUE, updated_at=NOW()
    `,
    [company.id],
  );

  // Test stoku
  const hk = (await pool.query(
    `SELECT id FROM movement_codes WHERE affects_stock AND (direction ILIKE '%gir%' OR movement_code ILIKE '%GIR%') ORDER BY id LIMIT 1`,
  )).rows[0];
  if (hk) {
    await withTransaction(pool, async (client) => {
      await createStockMovement(client, {
        hareketTipi: 'STOK_GIRIS',
        depoId: wh.id,
        belgeTipi: 'Test',
        hareketKoduId: hk.id,
        firmaId: company.id,
        satirlar: [{ item_id: item.id, quantity: 200, direction: 1, stock_status: 'Kullanilabilir' }],
      });
    });
  }

  return { company, plant, partner, item, wh };
}

describe('fason GKK kapısı', () => {
  let ctx;
  before(async () => {
    ctx = await seedBasics();
  });

  it('teslimatta GKK emri açılır; kabul öncesi accepted=0', async () => {
    const { company, partner, item, wh, plant } = ctx;
    const order = await withTransaction(pool, async (client) => {
      const no = `FS-GKK-${Date.now().toString().slice(-8)}`;
      const o = await client.query(
        `
        INSERT INTO subcontract_orders
          (company_id, plant_id, order_no, partner_id, order_mode, status, currency_code)
        VALUES ($1,$2,$3,$4,'Komple','Acik','TRY') RETURNING *
        `,
        [company.id, plant?.id || null, no, partner.id],
      );
      const line = await client.query(
        `
        INSERT INTO subcontract_order_lines
          (order_id, line_no, item_id, operation_code, operation_name, ordered_qty, unit_price, uom_code)
        VALUES ($1,10,$2,'BOYA','Boyama',50,10,$3) RETURNING *
        `,
        [o.rows[0].id, item.id, item.uom_code || 'AD'],
      );
      return { ...o.rows[0], line: line.rows[0] };
    });

    // Emanet deposu + stok-depo bağı (otomatik item_warehouses yok)
    await withTransaction(pool, async (client) => {
      const emanet = await fason.ensureEmanetWarehouse(client, {
        companyId: company.id,
        plantId: plant?.id || null,
        partnerId: partner.id,
      });
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
         SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
         )`,
        [item.id, emanet.id, plant?.id || null],
      );
      await fason.shipMaterials(client, {
        orderId: order.id,
        fromWarehouseId: wh.id,
        lines: [{ item_id: item.id, quantity: 50, order_line_id: order.line.id }],
        companyId: company.id,
        userCode: 'owner',
      });
    });

    // Teslimat — GKK beklenir
    const recv = await withTransaction(pool, (client) => fason.receiveProduct(client, {
      orderId: order.id,
      toWarehouseId: wh.id,
      lines: [{
        item_id: item.id,
        order_line_id: order.line.id,
        received_qty: 50,
        unit_price: 10,
      }],
      companyId: company.id,
      userCode: 'owner',
    }));

    assert.equal(recv.wantQc, true);
    assert.ok(recv.qcOrderId, 'qc_order_id bekleniyor');
    assert.equal(recv.receipt.status, 'KaliteKontrolBekliyor');

    const line = (await pool.query(
      `SELECT received_qty, accepted_qty FROM subcontract_order_lines WHERE id=$1`,
      [order.line.id],
    )).rows[0];
    assert.equal(Number(line.received_qty), 50);
    assert.equal(Number(line.accepted_qty), 0);

    const qc = (await pool.query(`SELECT * FROM qc_orders WHERE id=$1`, [recv.qcOrderId])).rows[0];
    assert.equal(qc.direction, 'GKK');
    assert.equal(qc.source_type, 'FASON_TESLIMAT');
    assert.equal(Number(qc.source_id), recv.receipt.id);

    // Tüketim GKK beklerken engellenmeli
    let blocked = false;
    try {
      await withTransaction(pool, (client) => fason.reportConsumption(client, {
        orderId: order.id,
        lines: [{ item_id: item.id, order_line_id: order.line.id, consumed_qty: 10, scrap_qty: 0 }],
        companyId: company.id,
        userCode: 'owner',
      }));
    } catch (e) {
      blocked = e.code === 'FASON_GKK_BEKLIYOR' || /GKK|kalite/i.test(e.message);
    }
    assert.ok(blocked, 'tüketim GKK beklerken engellenmeli');

    // GKK onay → kabul
    await withTransaction(pool, (client) => approveQcOrder(client, recv.qcOrderId, {
      onay: true,
      uygunMiktar: 50,
      uygunsuzMiktar: 0,
      hedefDepoId: wh.id,
      kullanici: { user_code: 'owner' },
    }));

    const line2 = (await pool.query(
      `SELECT accepted_qty FROM subcontract_order_lines WHERE id=$1`,
      [order.line.id],
    )).rows[0];
    assert.equal(Number(line2.accepted_qty), 50);

    const receipt = (await pool.query(
      `SELECT status FROM subcontract_receipts WHERE id=$1`,
      [recv.receipt.id],
    )).rows[0];
    assert.equal(receipt.status, 'TeslimAlindi');
  });

  it('create_qc:false ile GKK atlanır', async () => {
    const { company, partner, item, wh, plant } = ctx;
    const order = await withTransaction(pool, async (client) => {
      const no = `FS-NOQC-${Date.now().toString().slice(-8)}`;
      const o = await client.query(
        `
        INSERT INTO subcontract_orders
          (company_id, plant_id, order_no, partner_id, order_mode, status)
        VALUES ($1,$2,$3,$4,'Komple','Acik') RETURNING *
        `,
        [company.id, plant?.id || null, no, partner.id],
      );
      const line = await client.query(
        `
        INSERT INTO subcontract_order_lines
          (order_id, line_no, item_id, ordered_qty, unit_price)
        VALUES ($1,10,$2,5,1) RETURNING *
        `,
        [o.rows[0].id, item.id],
      );
      return { ...o.rows[0], line: line.rows[0] };
    });

    await withTransaction(pool, (client) => fason.shipMaterials(client, {
      orderId: order.id,
      fromWarehouseId: wh.id,
      lines: [{ item_id: item.id, quantity: 5, order_line_id: order.line.id }],
      companyId: company.id,
      userCode: 'owner',
    }));

    const recv = await withTransaction(pool, (client) => fason.receiveProduct(client, {
      orderId: order.id,
      toWarehouseId: wh.id,
      createQc: false,
      lines: [{ item_id: item.id, order_line_id: order.line.id, received_qty: 5 }],
      companyId: company.id,
      userCode: 'owner',
    }));

    assert.equal(recv.wantQc, false);
    assert.equal(recv.qcOrderId, null);
    const line = (await pool.query(
      `SELECT accepted_qty FROM subcontract_order_lines WHERE id=$1`,
      [order.line.id],
    )).rows[0];
    assert.equal(Number(line.accepted_qty), 5);
  });
});
