/**
 * Ortak onay yardımcısı — belge durum geçişlerini tek yerden yönetir.
 * Genel WF motoru değil; mevcut onay uçlarını standartlaştırır (REQ-PLT-019).
 */
const { withTransaction } = require('./withTransaction');

async function belgeOnayla(pool, {
  table,
  id,
  fromDurumlar = ['Taslak', 'Acik', 'OnayBekliyor'],
  toDurum = 'Onayli',
  kullaniciId = null,
  ekstraSet = '',
  ekstraParams = [],
  after = null,
}) {
  return withTransaction(pool, async (client) => {
    const cur = await client.query(
      `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!cur.rows[0]) {
      const err = new Error('Belge bulunamadı.');
      err.status = 404;
      throw err;
    }
    const durum = cur.rows[0].durum;
    if (fromDurumlar.length && !fromDurumlar.includes(durum)) {
      const err = new Error(`Onaylanamaz. Durum: ${durum}`);
      err.status = 409;
      throw err;
    }
    const sets = [`durum = $2`];
    const params = [id, toDurum];
    if (kullaniciId != null) {
      params.push(kullaniciId);
      sets.push(`onaylayan_kisi_id = $${params.length}`);
      params.push(new Date());
      sets.push(`onay_tarihi = $${params.length}`);
    }
    if (ekstraSet) sets.push(ekstraSet);
    await client.query(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1`,
      [...params, ...ekstraParams]
    );
    if (typeof after === 'function') await after(client, cur.rows[0]);
    return { id: Number(id), durum: toDurum };
  });
}

module.exports = { belgeOnayla };
