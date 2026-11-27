const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { createStockMovement } = require('../src/services/stokHareketService');
const { createQcOrdersFromMovementCode } = require('../src/services/kaliteService');

describe('stok giriş → GKK emri', () => {
  let pool;
  before(() => {
    ({ pool } = createApp());
  });

  it('createQcOrdersFromMovementCode export edilir', () => {
    assert.equal(typeof createQcOrdersFromMovementCode, 'function');
  });

  it('GKK tiki açık hareket koduyla stok girişinde kalite emri oluşur', async () => {
    await withTransaction(pool, async (client) => {
      const pair = await client.query(`
        SELECT s.id AS item_id, s.item_code, w.id AS warehouse_id, w.plant_id,
               g.id AS gkk_id
        FROM item_warehouses iw
        JOIN items s ON s.id = iw.item_id
        JOIN warehouses w ON w.id = iw.warehouse_id AND w.warehouse_role='Giris' AND w.is_active
        JOIN warehouses g ON g.plant_id = w.plant_id AND g.warehouse_role='GKK' AND g.is_active
        WHERE iw.is_active IS DISTINCT FROM FALSE
        ORDER BY s.id
        LIMIT 1
      `);
      if (!pair.rows[0]) {
        const err = new Error('SKIP: Giriş+GKK depo ve stok bağı yok');
        err.skip = true;
        throw err;
      }
      const p = pair.rows[0];

      let hk = await client.query(
        `SELECT * FROM movement_codes WHERE create_incoming_qc_order=TRUE AND is_active ORDER BY id LIMIT 1`
      );
      if (!hk.rows[0]) {
        hk = await client.query(
          `INSERT INTO movement_codes
             (movement_code, movement_name, document_type, direction, affects_stock, is_active, create_incoming_qc_order)
           VALUES ('STG-TEST-GKK-' || floor(random()*1e6)::text, 'Test GKK Giriş', 'StokGiris', 'Giris', TRUE, TRUE, TRUE)
           RETURNING *`
        );
      }

      const hareket = await createStockMovement(client, {
        hareketTipi: 'STOK_GIRIS',
        depoId: p.warehouse_id,
        isYeriId: p.plant_id,
        belgeTipi: 'STOK_GIRIS',
        description: 'test stok giriş → GKK',
        hareketKoduId: hk.rows[0].id,
        satirlar: [{ item_id: p.item_id, quantity: 1, direction: 1 }],
      });

      const emirler = await createQcOrdersFromMovementCode(client, {
        hareketKodu: hk.rows[0],
        hareket: hareket.hareket,
        satirlar: hareket.satirlar || [],
        plantId: p.plant_id,
      });

      assert.ok(emirler.length >= 1, 'en az bir GKK emri beklenir');
      assert.equal(emirler[0].direction, 'GKK');
      assert.equal(emirler[0].status, 'Acik');
      assert.equal(Number(emirler[0].source_id), Number(hareket.hareket.id));
      assert.equal(emirler[0].source_type, 'STOK_HAREKET');
      assert.equal(Number(emirler[0].warehouse_id), Number(p.gkk_id));

      // rollback — test verisi kalmasın
      throw Object.assign(new Error('ROLLBACK_OK'), { rollback: true });
    }).catch((err) => {
      if (err.rollback) return;
      if (err.skip) {
        console.log(err.message);
        return;
      }
      throw err;
    });
  });
});
