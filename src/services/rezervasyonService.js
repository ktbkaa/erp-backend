const { nextDocumentNo } = require('../utils/belgeNo');
const { listWarehouseBalances } = require('./stokHareketService');

async function kullanilabilirNet(pool, stokId, depoId = null) {
  const bakiyeler = await listWarehouseBalances(pool, { stokId, stokStatu: 'Kullanilabilir', depoId });
  const bakiye = bakiyeler.reduce((s, b) => s + Number(b.bakiye), 0);
  const params = [stokId];
  let extra = '';
  if (depoId) {
    params.push(depoId);
    extra = ` AND warehouse_id = $${params.length}`;
  }
  const rez = await pool.query(
    `SELECT COALESCE(SUM(remaining_quantity),0)::numeric AS rezerve
     FROM item_reservations WHERE item_id=$1 AND status='Aktif' ${extra}`,
    params
  );
  const rezerve = Number(rez.rows[0].rezerve);
  return { bakiye, rezerve, kullanilabilir: bakiye - rezerve };
}

async function createReservationLine(client, {
  siparisId,
  siparisDetayId,
  itemId,
  depoId,
  quantity,
}) {
  const qty = Number(quantity);
  if (!itemId) throw Object.assign(new Error('item_id zorunlu.'), { status: 400 });
  if (!Number.isFinite(qty) || qty <= 0) {
    throw Object.assign(new Error('Rezerve miktar 0\'dan büyük olmalı.'), { status: 400 });
  }
  if (!depoId) {
    throw Object.assign(new Error('Depo seçimi zorunlu.'), { status: 400 });
  }
  const net = await kullanilabilirNet(client, itemId, depoId);
  if (net.kullanilabilir + 1e-9 < qty) {
    throw Object.assign(
      new Error(
        `Rezervasyon için yetersiz stok: item_id=${itemId} depo=${depoId} kullanılabilir=${net.kullanilabilir} ihtiyaç=${qty}`
      ),
      { status: 409, detay: net }
    );
  }
  const no = await nextDocumentNo(client, 'REZERVASYON');
  const r = await client.query(
    `INSERT INTO item_reservations
      (reservation_no, sales_order_id, sales_order_line_id, item_id, warehouse_id, quantity, remaining_quantity, status)
     VALUES ($1,$2,$3,$4,$5,$6,$6,'Aktif') RETURNING *`,
    [no, siparisId || null, siparisDetayId || null, itemId, depoId, qty]
  );
  if (siparisDetayId) {
    await client.query(
      `UPDATE sales_order_lines SET reserved_quantity = COALESCE(reserved_quantity,0) + $2 WHERE id=$1`,
      [siparisDetayId, qty]
    );
  }
  return r.rows[0];
}

/**
 * Seçili sipariş satırlarını (stok + depo + miktar) rezerve et.
 * satirlar: [{ sales_order_line_id?, item_id, warehouse_id, quantity }]
 */
async function satirlariRezerveEt(client, siparisId, {
  depoId = null,
  satirlar = null,
} = {}) {
  const sip = await client.query(`SELECT * FROM sales_orders WHERE id=$1 FOR UPDATE`, [siparisId]);
  if (!sip.rows[0]) throw Object.assign(new Error('Sipariş bulunamadı.'), { status: 404 });

  let kaynak = Array.isArray(satirlar) ? satirlar.filter(Boolean) : null;
  if (!kaynak || !kaynak.length) {
    // Tüm kalan satırlar (eski davranış)
    const tum = await client.query(
      `SELECT * FROM sales_order_lines WHERE sales_order_id=$1 ORDER BY id`,
      [siparisId]
    );
    kaynak = tum.rows.map((s) => ({
      sales_order_line_id: s.id,
      item_id: s.item_id,
      warehouse_id: depoId,
      quantity: Number(s.quantity) - Number(s.reserved_quantity || 0) - Number(s.shipped_quantity || 0),
    }));
  }

  const olusan = [];
  for (const raw of kaynak) {
    const lineId = raw.sales_order_line_id ? Number(raw.sales_order_line_id) : null;
    let itemId = raw.item_id ? Number(raw.item_id) : null;
    let maxKalan = null;
    if (lineId) {
      const lr = await client.query(
        `SELECT * FROM sales_order_lines WHERE id=$1 AND sales_order_id=$2 FOR UPDATE`,
        [lineId, siparisId]
      );
      const line = lr.rows[0];
      if (!line) {
        throw Object.assign(new Error(`Sipariş satırı bulunamadı: ${lineId}`), { status: 400 });
      }
      itemId = Number(line.item_id);
      maxKalan = Number(line.quantity) - Number(line.reserved_quantity || 0) - Number(line.shipped_quantity || 0);
    }
    let qty = raw.quantity != null && raw.quantity !== '' ? Number(raw.quantity) : maxKalan;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (maxKalan != null && qty > maxKalan + 1e-9) {
      throw Object.assign(
        new Error(`Satır ${lineId}: rezerve edilecek miktar kalanı aşıyor (kalan=${maxKalan}, istenen=${qty}).`),
        { status: 400 }
      );
    }
    const wh = raw.warehouse_id != null && raw.warehouse_id !== ''
      ? Number(raw.warehouse_id)
      : (depoId ? Number(depoId) : null);
    const row = await createReservationLine(client, {
      siparisId,
      siparisDetayId: lineId,
      itemId,
      depoId: wh,
      quantity: qty,
    });
    olusan.push(row);
  }
  if (!olusan.length) {
    throw Object.assign(new Error('Rezerve edilecek satır yok (miktar/stok seçin).'), { status: 400 });
  }
  return olusan;
}

/**
 * Sipariş onayında / açıkça: satırları rezerve et.
 */
async function reserveOrder(client, siparisId, { depoId = null, satirlar = null } = {}) {
  return satirlariRezerveEt(client, siparisId, { depoId, satirlar });
}

async function cancelReservation(client, rezervasyonId) {
  const r = await client.query(
    `SELECT * FROM item_reservations WHERE id=$1 FOR UPDATE`,
    [rezervasyonId]
  );
  if (!r.rows[0]) throw Object.assign(new Error('Rezervasyon bulunamadı.'), { status: 404 });
  const row = r.rows[0];
  if (row.status !== 'Aktif') {
    throw Object.assign(new Error(`Yalnız Aktif rezervasyon iptal edilir (durum=${row.status}).`), { status: 409 });
  }
  await client.query(
    `UPDATE item_reservations SET status='Iptal', remaining_quantity=0, cancelled_date=NOW() WHERE id=$1`,
    [row.id]
  );
  if (row.sales_order_line_id) {
    await client.query(
      `UPDATE sales_order_lines SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) - $2) WHERE id=$1`,
      [row.sales_order_line_id, row.remaining_quantity]
    );
  }
  return { ...row, status: 'Iptal', remaining_quantity: 0 };
}

/** İrsaliye onayında rezervasyonu tüket */
async function rezervasyonTuket(client, { siparisDetayId, quantity }) {
  let kalan = Number(quantity);
  const rezler = await client.query(
    `SELECT * FROM item_reservations
     WHERE sales_order_line_id=$1 AND status='Aktif' ORDER BY id FOR UPDATE`,
    [siparisDetayId]
  );
  for (const r of rezler.rows) {
    if (kalan <= 1e-9) break;
    const tuket = Math.min(Number(r.remaining_quantity), kalan);
    const yeniKalan = Number(r.remaining_quantity) - tuket;
    await client.query(
      `UPDATE item_reservations SET remaining_quantity=$2, status=$3 WHERE id=$1`,
      [r.id, yeniKalan, yeniKalan <= 1e-9 ? 'Tuketildi' : 'Aktif']
    );
    await client.query(
      `UPDATE sales_order_lines SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) - $2) WHERE id=$1`,
      [siparisDetayId, tuket]
    );
    kalan -= tuket;
  }
}

async function cancelOrderReservations(client, siparisId) {
  const rezler = await client.query(
    `SELECT * FROM item_reservations WHERE sales_order_id=$1 AND status='Aktif' FOR UPDATE`,
    [siparisId]
  );
  for (const r of rezler.rows) {
    await client.query(
      `UPDATE item_reservations SET status='Iptal', remaining_quantity=0, cancelled_date=NOW() WHERE id=$1`,
      [r.id]
    );
    if (r.sales_order_line_id) {
      await client.query(
        `UPDATE sales_order_lines SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity,0) - $2) WHERE id=$1`,
        [r.sales_order_line_id, r.remaining_quantity]
      );
    }
  }
}

module.exports = {
  kullanilabilirNet,
  reserveOrder,
  satirlariRezerveEt,
  createReservationLine,
  rezervasyonTuket,
  cancelOrderReservations,
  cancelReservation,
};
