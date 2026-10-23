const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, request } = require('./helpers/app');
const { withTransaction } = require('../src/utils/withTransaction');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { siparisRezerveEt, kullanilabilirNet } = require('../src/services/rezervasyonService');

describe('stok rezervasyon', () => {
  let pool;
  before(() => {
    ({ pool } = createApp());
  });

  it('rezervasyon kullanılabilir bakiyeyi düşürür', async () => {
    // Minimal fixture: stok + depo + giriş + sipariş
    const fx = await withTransaction(pool, async (client) => {
      const firma = await client.query(`SELECT id FROM companies ORDER BY id LIMIT 1`);
      const isYeri = await client.query(`SELECT id FROM plants ORDER BY id LIMIT 1`);
      const depo = await client.query(`SELECT id FROM warehouses ORDER BY id LIMIT 1`);
      if (!firma.rows[0] || !depo.rows[0]) {
        const err = new Error('SKIP: seed firma/depo yok');
        err.skip = true;
        throw err;
      }
      const stok = await client.query(
        `INSERT INTO items (item_code, item_name, item_type, uom_code, is_active)
         VALUES ('RZ-TEST-' || floor(random()*1e6)::text, 'Rezerv Test', 'Ticari', 'AD', TRUE)
         RETURNING id, item_code`
      );
      // item_warehouses bağ (zorunlu olabilir)
      await client.query(
        `INSERT INTO item_warehouses (item_id, warehouse_id, is_active) VALUES ($1,$2,TRUE)
         ON CONFLICT DO NOTHING`,
        [stok.rows[0].id, depo.rows[0].id]
      ).catch(() => {});

      await stokHareketOlustur(client, {
        hareketTipi: 'STOK_GIRIS',
        depoId: depo.rows[0].id,
        depoZorunluAtla: true,
        satirlar: [{ item_id: stok.rows[0].id, quantity: 100, direction: 1, uom_code: 'AD' }],
      });

      const cari = await client.query(`SELECT id, partner_code, partner_name FROM partners ORDER BY id LIMIT 1`);
      if (!cari.rows[0]) {
        const err = new Error('SKIP: cari yok');
        err.skip = true;
        throw err;
      }
      const sip = await client.query(
        `INSERT INTO sales_orders (order_no, partner_id, partner_code, partner_name, order_type, total_amount, status)
         VALUES ('SP-RZ-' || floor(random()*1e6)::text, $1, $2, $3, 'SatisSiparis', 0, 'Onayli')
         RETURNING id`,
        [cari.rows[0].id, cari.rows[0].partner_code, cari.rows[0].partner_name]
      );
      await client.query(
        `INSERT INTO sales_order_lines (sales_order_id, item_id, item_code, item_name, stock_uom, quantity, unit_price, total_amount)
         VALUES ($1,$2,$3,$4,'AD',40,1,40)`,
        [sip.rows[0].id, stok.rows[0].id, stok.rows[0].item_code, 'Rezerv Test']
      );
      return { siparisId: sip.rows[0].id, stokId: stok.rows[0].id, depoId: depo.rows[0].id };
    }).catch((e) => {
      if (e.skip) return null;
      throw e;
    });

    if (!fx) {
      console.log('SKIP rezervasyon testi — seed eksik');
      return;
    }

    const once = await kullanilabilirNet(pool, fx.stokId, fx.depoId);
    assert.ok(once.kullanilabilir >= 40, `beklenen >=40, gelen ${once.kullanilabilir}`);

    await withTransaction(pool, (client) => siparisRezerveEt(client, fx.siparisId, { depoId: fx.depoId }));

    const sonra = await kullanilabilirNet(pool, fx.stokId, fx.depoId);
    assert.ok(sonra.rezerve >= 40, `rezerve >=40, gelen ${sonra.rezerve}`);
    assert.ok(
      sonra.kullanilabilir <= once.kullanilabilir - 39.9,
      `kullanılabilir düşmeli: önce=${once.kullanilabilir} sonra=${sonra.kullanilabilir}`
    );
  });
});
