const { sonrakiBelgeNo } = require('../utils/belgeNo');

async function cariHareketEkle(client, {
  cariId, direction, amount, paraBirimi = 'TRY', exchange_rate = 1,
  belgeTipi = null, belgeId = null, description = null, hareketTarihi = null,
}) {
  if (!cariId || !direction || amount == null) {
    throw Object.assign(new Error('cariId, direction, amount zorunlu.'), { status: 400 });
  }
  const no = await sonrakiBelgeNo(client, 'CARI_HAREKET');
  const r = await client.query(
    `INSERT INTO partner_ledger_entries
      (movement_no, partner_id, direction, amount, currency_code, exchange_rate, document_type, document_id, description, movement_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,CURRENT_DATE)) RETURNING *`,
    [no, cariId, direction, Number(amount), paraBirimi, exchange_rate, belgeTipi, belgeId, description, hareketTarihi]
  );
  return r.rows[0];
}

async function cariBakiye(pool, cariId) {
  const r = await pool.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN direction='Borc' THEN amount ELSE 0 END),0)::numeric AS debit,
      COALESCE(SUM(CASE WHEN direction='Alacak' THEN amount ELSE 0 END),0)::numeric AS credit
    FROM partner_ledger_entries WHERE partner_id=$1
    `,
    [cariId]
  );
  const debit = Number(r.rows[0].debit);
  const credit = Number(r.rows[0].credit);
  return { debit, credit, bakiye: debit - credit };
}

async function cariEkstre(pool, cariId, { baslangic = null, bitis = null } = {}) {
  const params = [cariId];
  const where = ['partner_id=$1'];
  if (baslangic) {
    params.push(baslangic);
    where.push(`movement_date >= $${params.length}`);
  }
  if (bitis) {
    params.push(bitis);
    where.push(`movement_date <= $${params.length}`);
  }
  const hareketler = await pool.query(
    `SELECT * FROM partner_ledger_entries WHERE ${where.join(' AND ')} ORDER BY movement_date, id`,
    params
  );
  const ozet = await cariBakiye(pool, cariId);
  return { ...ozet, hareketler: hareketler.rows };
}

module.exports = { cariHareketEkle, cariBakiye, cariEkstre };
