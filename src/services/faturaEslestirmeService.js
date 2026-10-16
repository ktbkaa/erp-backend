/**
 * 3-yönlü kontrol: alış faturası ↔ sipariş fiyatı ↔ mal kabul miktarı
 */
async function faturaEslestir(client, faturaId) {
  const f = await client.query(`SELECT * FROM faturalar WHERE id=$1`, [faturaId]);
  if (!f.rows[0]) throw Object.assign(new Error('Fatura bulunamadı.'), { status: 404 });
  const fatura = f.rows[0];
  if (!String(fatura.fatura_turu || '').toLowerCase().includes('alis')) {
    throw Object.assign(new Error('3-way match yalnızca alış faturaları için.'), { status: 400 });
  }

  const kalemler = await client.query(
    `SELECT * FROM fatura_detaylari WHERE fatura_id=$1`,
    [faturaId]
  );

  let siparisId = fatura.siparis_id || null;
  let malKabulId = fatura.mal_kabul_id || null;
  let fiyatFark = 0;
  let miktarFark = 0;

  if (malKabulId) {
    const mk = await client.query(`SELECT * FROM mal_kabuller WHERE id=$1`, [malKabulId]);
    if (mk.rows[0]) siparisId = siparisId || mk.rows[0].siparis_id;
    const mkSat = await client.query(
      `SELECT stok_id, SUM(miktar)::numeric AS miktar FROM mal_kabul_satirlari WHERE kabul_id=$1 GROUP BY stok_id`,
      [malKabulId]
    );
    const mkMap = new Map(mkSat.rows.map((r) => [String(r.stok_id), Number(r.miktar)]));
    for (const k of kalemler.rows) {
      const mkM = mkMap.get(String(k.stok_id)) || 0;
      miktarFark += Math.abs(Number(k.miktar) - mkM);
    }
  }

  if (siparisId) {
    const ss = await client.query(
      `SELECT stok_id, birim_fiyat FROM satin_alma_siparis_satirlari WHERE siparis_id=$1`,
      [siparisId]
    );
    const fiyatMap = new Map(ss.rows.map((r) => [String(r.stok_id), Number(r.birim_fiyat)]));
    for (const k of kalemler.rows) {
      const sf = fiyatMap.get(String(k.stok_id));
      if (sf != null) fiyatFark += (Number(k.birim_fiyat) - sf) * Number(k.miktar);
    }
  }

  let sonuc = 'Uyumlu';
  if (Math.abs(fiyatFark) > 0.01 && miktarFark > 0.001) sonuc = 'Askida';
  else if (Math.abs(fiyatFark) > 0.01) sonuc = 'FiyatFark';
  else if (miktarFark > 0.001) sonuc = 'MiktarFark';
  if (!siparisId && !malKabulId) sonuc = 'Bekliyor';

  const row = await client.query(
    `INSERT INTO fatura_eslestirme
      (fatura_id, siparis_id, mal_kabul_id, fiyat_fark, miktar_fark, sonuc, aciklama)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      faturaId, siparisId, malKabulId, fiyatFark, miktarFark, sonuc,
      `3-way: fiyat_fark=${fiyatFark.toFixed(2)} miktar_fark=${miktarFark.toFixed(3)}`,
    ]
  );
  return row.rows[0];
}

module.exports = { faturaEslestir };
