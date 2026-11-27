const { sonrakiBelgeNo } = require('../utils/belgeNo');
const { depoBakiyeListesi } = require('./stokHareketService');

async function kullanilabilirNet(pool, stokId, depoId = null) {
  const bakiyeler = await depoBakiyeListesi(pool, { stokId, stokStatu: 'Kullanilabilir', depoId });
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

/**
 * Sipariş onayında / açıkça: satırları rezerve et.
 */
async function siparisRezerveEt(client, siparisId, { depoId = null } = {}) {
  const sip = await client.query(`SELECT * FROM sales_orders WHERE id=$1 FOR UPDATE`, [siparisId]);
  if (!sip.rows[0]) throw Object.assign(new Error('Sipariş bulunamadı.'), { status: 404 });
  const satirlar = await client.query(
    `SELECT * FROM sales_order_lines WHERE sales_order_id=$1 ORDER BY id`,
    [siparisId]
  );
  const olusan = [];
  for (const s of satirlar.rows) {
    const hedef = Number(s.quantity) - Number(s.rezerve_quantity || 0) - Number(s.shipped_quantity || 0);
    if (hedef <= 1e-9) continue;
    const net = await kullanilabilirNet(client, s.item_id, depoId);
    if (net.kullanilabilir + 1e-9 < hedef) {
      throw Object.assign(
        new Error(`Rezervasyon için yetersiz stok: item_id=${s.item_id} kullanılabilir=${net.kullanilabilir} ihtiyaç=${hedef}`),
        { status: 409, detay: net }
      );
    }
    const no = await sonrakiBelgeNo(client, 'REZERVASYON');
    const r = await client.query(
      `INSERT INTO item_reservations
        (rezervasyon_no, sales_order_id, sales_order_line_id, item_id, warehouse_id, quantity, remaining_quantity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$6,'Aktif') RETURNING *`,
      [no, siparisId, s.id, s.item_id, depoId, hedef]
    );
    await client.query(
      `UPDATE sales_order_lines SET rezerve_quantity = COALESCE(rezerve_quantity,0) + $2 WHERE id=$1`,
      [s.id, hedef]
    );
    olusan.push(r.rows[0]);
  }
  return olusan;
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
      `UPDATE sales_order_lines SET rezerve_quantity = GREATEST(0, COALESCE(rezerve_quantity,0) - $2) WHERE id=$1`,
      [siparisDetayId, tuket]
    );
    kalan -= tuket;
  }
}

async function rezervasyonIptalSiparis(client, siparisId) {
  const rezler = await client.query(
    `SELECT * FROM item_reservations WHERE sales_order_id=$1 AND status='Aktif' FOR UPDATE`,
    [siparisId]
  );
  for (const r of rezler.rows) {
    await client.query(
      `UPDATE item_reservations SET status='Iptal', remaining_quantity=0, iptal_date=NOW() WHERE id=$1`,
      [r.id]
    );
    if (r.sales_order_line_id) {
      await client.query(
        `UPDATE sales_order_lines SET rezerve_quantity = GREATEST(0, COALESCE(rezerve_quantity,0) - $2) WHERE id=$1`,
        [r.sales_order_line_id, r.remaining_quantity]
      );
    }
  }
}

module.exports = {
  kullanilabilirNet,
  siparisRezerveEt,
  rezervasyonTuket,
  rezervasyonIptalSiparis,
};
