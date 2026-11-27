/**
 * MARVEL — görünen + üretim için gerekli stok bakiyelerini 10.000 yap.
 *   node scripts/marvel-stok-10000.js
 */
require('dotenv').config();
const pool = require('../db');
const {
  createStockMovement,
  listWarehouseBalances,
  warehouseItemBalance,
} = require('../src/services/stokHareketService');

const TARGET = 10000;
const CODE = 'MARVEL';

async function ensureItemWarehouse(client, itemId, warehouseId, plantId) {
  const ex = await client.query(
    `SELECT id FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2`,
    [itemId, warehouseId],
  );
  if (!ex.rows[0]) {
    await client.query(
      `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
       VALUES ($1,$2,$3,true)`,
      [itemId, warehouseId, plantId || null],
    );
  }
}

async function topUp(client, {
  firmaId, plantId, itemId, warehouseId, lotId = null, lotNo = null, current,
}) {
  const need = TARGET - Number(current || 0);
  if (need <= 1e-9) return { skipped: true, current: Number(current || 0) };
  await ensureItemWarehouse(client, itemId, warehouseId, plantId);
  const satir = {
    item_id: itemId,
    quantity: need,
    direction: 1,
    stock_status: 'Kullanilabilir',
  };
  if (lotId) {
    satir.lot_id = lotId;
    satir.otomatik_parti = false;
  } else if (lotNo) {
    satir.lot_no = lotNo;
    satir.otomatik_parti = false;
  } else {
    satir.otomatik_parti = true;
  }
  await createStockMovement(client, {
    hareketTipi: 'STOK_GIRIS',
    isYeriId: plantId,
    depoId: warehouseId,
    belgeTipi: 'Sayim',
    description: `MARVEL test stok top-up → ${TARGET}`,
    firmaId,
    satirlar: [satir],
  });
  return { added: need, from: Number(current || 0), to: TARGET };
}

async function main() {
  const firma = (await pool.query(
    `SELECT id, company_code FROM companies WHERE company_code=$1`,
    [CODE],
  )).rows[0];
  if (!firma) throw new Error('MARVEL yok');
  const plant = (await pool.query(
    `SELECT id, plant_code FROM plants WHERE company_id=$1 ORDER BY id LIMIT 1`,
    [firma.id],
  )).rows[0];
  if (!plant) throw new Error('MARVEL plant yok');

  const client = await pool.connect();
  const log = [];
  try {
    await client.query('BEGIN');

    // 1) Görünen (pozitif) Kullanilabilir bakiyeleri 10.000'e tamamla (lot korunur)
    const visible = (await listWarehouseBalances(client, {
      firmaId: firma.id,
      yalnizcaStokta: true,
    })).filter((b) => String(b.stock_status || 'Kullanilabilir') === 'Kullanilabilir'
      && Number(b.bakiye) > 0);

    console.log('Görünen pozitif satırlar:', visible.length);
    for (const b of visible) {
      const cur = await warehouseItemBalance(client, b.warehouse_id, b.item_id, {
        stokStatu: 'Kullanilabilir',
        partiId: b.lot_id || null,
        matchNullLot: !b.lot_id,
      });
      const r = await topUp(client, {
        firmaId: firma.id,
        plantId: plant.id,
        itemId: b.item_id,
        warehouseId: b.warehouse_id,
        lotId: b.lot_id || null,
        current: cur,
      });
      const line = {
        scope: 'gorunen',
        item: b.item_code,
        wh: b.warehouse_code,
        lot: b.lot_no || b.lot_id || null,
        ...r,
      };
      log.push(line);
      console.log(' ', JSON.stringify(line));
    }

    // 2) Tüm stoklar — varsayılan çıkış deposunda 10.000 (üretim tüketimi için)
    //    Hammadde ayrıca HMD'de garanti; YM kendi WIP; mamul MAM
    const items = (await client.query(
      `SELECT id, item_code, item_type, lot_policy,
              default_issue_warehouse_id, default_receipt_warehouse_id
       FROM items
       WHERE company_id=$1 AND COALESCE(is_deleted,false)=false
       ORDER BY item_code`,
      [firma.id],
    )).rows;

    const hmd = (await client.query(
      `SELECT w.id FROM warehouses w
       JOIN plants p ON p.id=w.plant_id
       WHERE p.company_id=$1 AND w.warehouse_code='MARVEL-HMD'`,
      [firma.id],
    )).rows[0];

    for (const it of items) {
      const targets = new Set();
      if (it.default_issue_warehouse_id) targets.add(Number(it.default_issue_warehouse_id));
      if (it.default_receipt_warehouse_id) targets.add(Number(it.default_receipt_warehouse_id));
      if (String(it.item_type) === 'Hammadde' && hmd?.id) targets.add(Number(hmd.id));

      // WO component warehouse'ları da doldur
      const woWh = await client.query(
        `SELECT DISTINCT component_warehouse_id AS id
         FROM production_orders
         WHERE company_id=$1 AND component_warehouse_id IS NOT NULL`,
        [firma.id],
      );
      if (String(it.item_type) === 'Hammadde') {
        for (const w of woWh.rows) targets.add(Number(w.id));
      }

      for (const whId of targets) {
        if (!whId) continue;
        // Lot'lu mevcut bakiye varsa onu tamamla; yoksa lotsuz/otomatik
        const rows = (await listWarehouseBalances(client, {
          firmaId: firma.id,
          depoId: whId,
          stokId: it.id,
          yalnizcaStokta: false,
        })).filter((b) => String(b.stock_status || 'Kullanilabilir') === 'Kullanilabilir');

        const lotRows = rows.filter((b) => b.lot_id && Number(b.bakiye) > 0);
        if (lotRows.length) {
          // En büyük lot'u 10k yap; diğerlerini bırak
          lotRows.sort((a, b) => Number(b.bakiye) - Number(a.bakiye));
          const primary = lotRows[0];
          const cur = await warehouseItemBalance(client, whId, it.id, {
            stokStatu: 'Kullanilabilir',
            partiId: primary.lot_id,
          });
          const r = await topUp(client, {
            firmaId: firma.id,
            plantId: plant.id,
            itemId: it.id,
            warehouseId: whId,
            lotId: primary.lot_id,
            current: cur,
          });
          if (!r.skipped) {
            const line = { scope: 'item-default', item: it.item_code, whId, lot: primary.lot_id, ...r };
            log.push(line);
            console.log(' ', JSON.stringify(line));
          }
        } else {
          const cur = await warehouseItemBalance(client, whId, it.id, {
            stokStatu: 'Kullanilabilir',
            matchNullLot: true,
          });
          // Toplam kullanılabilir (lot karışık) da kontrol
          const total = await warehouseItemBalance(client, whId, it.id, {
            stokStatu: 'Kullanilabilir',
          });
          const base = Math.max(Number(cur || 0), Number(total || 0));
          const r = await topUp(client, {
            firmaId: firma.id,
            plantId: plant.id,
            itemId: it.id,
            warehouseId: whId,
            current: base,
          });
          if (!r.skipped) {
            const line = { scope: 'item-default', item: it.item_code, whId, ...r };
            log.push(line);
            console.log(' ', JSON.stringify(line));
          }
        }
      }
    }

    await client.query('COMMIT');

    const after = await listWarehouseBalances(pool, {
      firmaId: firma.id,
      yalnizcaStokta: true,
    });
    console.log('\nSonuç (stokta görünen):');
    for (const b of after.filter((x) => String(x.stock_status || '') === 'Kullanilabilir')) {
      console.log(`  ${b.item_code.padEnd(18)} ${b.warehouse_code.padEnd(14)} ${b.bakiye}  lot=${b.lot_no || b.lot_id || '-'}`);
    }
    console.log(JSON.stringify({
      ok: true,
      updates: log.filter((x) => !x.skipped).length,
      skipped: log.filter((x) => x.skipped).length,
      visible: after.filter((x) => Number(x.bakiye) > 0).length,
    }, null, 2));
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
