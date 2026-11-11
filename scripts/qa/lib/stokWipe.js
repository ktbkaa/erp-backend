/**
 * Kullanılabilir bakiyeyi lot satırı bazında sıfırla.
 * Lot’lu giriş + lotsuz çıkış sapmasını önler.
 */
const {
  listWarehouseBalances,
  warehouseItemBalance,
  createStockMovement,
} = require('../../../src/services/stokHareketService');

async function wipeUsableStock(client, {
  firmaId,
  plantId,
  itemIds,
  warehouseIds = null,
  excludeRoles = ['Giris', 'GKK', 'CKK', 'Bloke'],
  description = 'QA stok sıfırlama',
  log = console.log,
} = {}) {
  const hedef = new Set((itemIds || []).map(Number).filter(Boolean));
  const whSet = warehouseIds ? new Set(warehouseIds.map(Number)) : null;
  const skipRoles = new Set(excludeRoles || []);
  const bakiyeler = (await listWarehouseBalances(client)).filter(
    (b) => (!hedef.size || hedef.has(Number(b.item_id)))
      && (!whSet || whSet.has(Number(b.warehouse_id)))
      && !skipRoles.has(String(b.warehouse_rolu || ''))
      && Number(b.bakiye) > 0
      && String(b.stock_status || 'Kullanilabilir') === 'Kullanilabilir'
  );

  // Lot’lu pozitif satır varken lotsuz pozitif gölge satırları atla (yanlış eksi bakiye üretir)
  const lotluKeys = new Set(
    bakiyeler.filter((b) => b.lot_id).map((b) => `${b.warehouse_id}:${b.item_id}`)
  );

  const results = [];
  for (const b of bakiyeler) {
    if (!b.lot_id && lotluKeys.has(`${b.warehouse_id}:${b.item_id}`)) {
      results.push({
        item_id: b.item_id,
        warehouse_id: b.warehouse_id,
        skipped: true,
        reason: 'lotsuz-golge',
      });
      continue;
    }
    const actual = await warehouseItemBalance(client, b.warehouse_id, b.item_id, {
      stokStatu: 'Kullanilabilir',
      partiId: b.lot_id || null,
      // partiId yoksa tüm lotlar toplamı — yine de quantity'yi min ile sınırla
    });
    // lot satırı için partiId ile doğrula; lotsuz satırda listed qty kullan
    let qty;
    if (b.lot_id) {
      const lotActual = await warehouseItemBalance(client, b.warehouse_id, b.item_id, {
        stokStatu: 'Kullanilabilir',
        partiId: b.lot_id,
      });
      qty = Math.min(Number(b.bakiye) || 0, Math.max(0, Number(lotActual) || 0));
    } else {
      // lotsuz bakiye çoğu zaman “karşı lot”tan kalan gölge; pozitif lotsuz nadir
      qty = Math.min(Number(b.bakiye) || 0, Math.max(0, Number(actual) || 0));
    }
    if (qty <= 1e-9) {
      results.push({
        item_id: b.item_id,
        warehouse_id: b.warehouse_id,
        lot_id: b.lot_id || null,
        skipped: true,
        listed: b.bakiye,
      });
      continue;
    }
    try {
      await createStockMovement(client, {
        hareketTipi: 'STOK_CIKIS',
        isYeriId: plantId,
        depoId: b.warehouse_id,
        belgeTipi: 'Sayim',
        description,
        firmaId,
        satirlar: [{
          item_id: b.item_id,
          quantity: qty,
          direction: -1,
          stock_status: 'Kullanilabilir',
          lot_id: b.lot_id || null,
        }],
      });
      results.push({
        item_id: b.item_id,
        warehouse_id: b.warehouse_id,
        lot_id: b.lot_id || null,
        wiped: qty,
      });
      log(`  stok sıfır OK item=${b.item_id} depo=${b.warehouse_id} lot=${b.lot_id || '-'} qty=${qty}`);
    } catch (err) {
      log(`  stok sıfır item=${b.item_id} depo=${b.warehouse_id} lot=${b.lot_id || '-'}: ${err.message}`);
      results.push({
        item_id: b.item_id,
        warehouse_id: b.warehouse_id,
        lot_id: b.lot_id || null,
        error: err.message,
      });
    }
  }
  return results;
}

/**
 * Net negatif kullanılabilir bakiyeyi sayım girişi ile 0’a çek (test/QA).
 */
async function repairNegativeStock(client, {
  firmaId,
  plantId,
  itemIds,
  description = 'QA negatif stok onarımı',
  log = console.log,
} = {}) {
  const hedef = new Set((itemIds || []).map(Number).filter(Boolean));
  const r = await client.query(
    `
    SELECT h.warehouse_id, s.item_id,
           COALESCE(SUM(s.quantity * s.direction), 0)::numeric AS bakiye
    FROM stock_movement_lines s
    JOIN stock_movements h ON h.id = s.movement_id
    WHERE COALESCE(s.stock_status,'Kullanilabilir') = 'Kullanilabilir'
      AND ($1::int[] IS NULL OR s.item_id = ANY($1::int[]))
    GROUP BY h.warehouse_id, s.item_id
    HAVING COALESCE(SUM(s.quantity * s.direction), 0) < -0.0001
    `,
    [hedef.size ? [...hedef] : null]
  );
  const fixed = [];
  for (const row of r.rows) {
    const need = Math.abs(Number(row.bakiye));
    if (need <= 1e-9) continue;
    await createStockMovement(client, {
      hareketTipi: 'STOK_GIRIS',
      isYeriId: plantId,
      depoId: row.warehouse_id,
      belgeTipi: 'Sayim',
      description,
      firmaId,
      satirlar: [{
        item_id: row.item_id,
        quantity: need,
        direction: 1,
        stock_status: 'Kullanilabilir',
      }],
    });
    log(`  negatif onarım depo=${row.warehouse_id} item=${row.item_id} +${need}`);
    fixed.push(row);
  }
  return fixed;
}

module.exports = { wipeUsableStock, repairNegativeStock };
