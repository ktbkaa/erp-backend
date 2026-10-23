/**
 * 3-yönlü kontrol: alış faturası ↔ sipariş fiyatı ↔ mal kabul miktarı
 */
async function faturaEslestir(client, faturaId) {
  const f = await client.query(`SELECT * FROM invoices WHERE id=$1`, [faturaId]);
  if (!f.rows[0]) throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
  const fatura = f.rows[0];
  if (!String(fatura.invoice_type || '').toLowerCase().includes('alis')) {
    throw Object.assign(new Error('3-way match yalnızca alış faturaları için.'), { status: 400 });
  }

  const kalemler = await client.query(
    `SELECT * FROM invoice_lines WHERE invoice_id=$1`,
    [faturaId]
  );

  let siparisId = fatura.sales_order_id || null;
  let malKabulId = fatura.goods_receipt_id || null;
  let fiyatFark = 0;
  let miktarFark = 0;

  if (malKabulId) {
    const mk = await client.query(`SELECT * FROM goods_receipts WHERE id=$1`, [malKabulId]);
    if (mk.rows[0]) siparisId = siparisId || mk.rows[0].sales_order_id;
    const mkSat = await client.query(
      `SELECT item_id, SUM(quantity)::numeric AS quantity FROM goods_receipt_lines WHERE receipt_id=$1 GROUP BY item_id`,
      [malKabulId]
    );
    const mkMap = new Map(mkSat.rows.map((r) => [String(r.item_id), Number(r.quantity)]));
    for (const k of kalemler.rows) {
      const mkM = mkMap.get(String(k.item_id)) || 0;
      miktarFark += Math.abs(Number(k.quantity) - mkM);
    }
  }

  if (siparisId) {
    const ss = await client.query(
      `SELECT item_id, unit_price FROM purchase_order_lines WHERE sales_order_id=$1`,
      [siparisId]
    );
    const fiyatMap = new Map(ss.rows.map((r) => [String(r.item_id), Number(r.unit_price)]));
    for (const k of kalemler.rows) {
      const sf = fiyatMap.get(String(k.item_id));
      if (sf != null) fiyatFark += (Number(k.unit_price) - sf) * Number(k.quantity);
    }
  }

  let result = 'Uyumlu';
  if (Math.abs(fiyatFark) > 0.01 && miktarFark > 0.001) result = 'Askida';
  else if (Math.abs(fiyatFark) > 0.01) result = 'FiyatFark';
  else if (miktarFark > 0.001) result = 'MiktarFark';
  if (!siparisId && !malKabulId) result = 'Bekliyor';

  const row = await client.query(
    `INSERT INTO invoice_matches
      (invoice_id, sales_order_id, goods_receipt_id, fiyat_fark, quantity_fark, result, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      faturaId, siparisId, malKabulId, fiyatFark, miktarFark, result,
      `3-way: fiyat_fark=${fiyatFark.toFixed(2)} quantity_fark=${miktarFark.toFixed(3)}`,
    ]
  );
  return row.rows[0];
}

module.exports = { faturaEslestir };
