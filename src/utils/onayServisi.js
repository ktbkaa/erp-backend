/**
 * Ortak onay yardımcısı — belge status geçişlerini tek yerden yönetir.
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
    const status = cur.rows[0].status;
    if (fromDurumlar.length && !fromDurumlar.includes(status)) {
      const err = new Error(`Onaylanamaz. Durum: ${status}`);
      err.status = 409;
      throw err;
    }
    const sets = [`status = $2`];
    const params = [id, toDurum];
    if (kullaniciId != null) {
      params.push(kullaniciId);
      sets.push(`approved_by_kisi_id = $${params.length}`);
      params.push(new Date());
      sets.push(`onay_date = $${params.length}`);
    }
    if (ekstraSet) sets.push(ekstraSet);
    await client.query(
      `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $1`,
      [...params, ...ekstraParams]
    );
    if (typeof after === 'function') await after(client, cur.rows[0]);
    return { id: Number(id), status: toDurum };
  });
}

module.exports = { belgeOnayla };
