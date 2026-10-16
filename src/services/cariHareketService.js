const { sonrakiBelgeNo } = require('../utils/belgeNo');

async function cariHareketEkle(client, {
  cariId, yon, tutar, paraBirimi = 'TRY', kur = 1,
  belgeTipi = null, belgeId = null, aciklama = null, hareketTarihi = null,
}) {
  if (!cariId || !yon || tutar == null) {
    throw Object.assign(new Error('cariId, yon, tutar zorunlu.'), { status: 400 });
  }
  const no = await sonrakiBelgeNo(client, 'CARI_HAREKET');
  const r = await client.query(
    `INSERT INTO cari_hareketleri
      (hareket_no, cari_id, yon, tutar, para_birimi, kur, belge_tipi, belge_id, aciklama, hareket_tarihi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,CURRENT_DATE)) RETURNING *`,
    [no, cariId, yon, Number(tutar), paraBirimi, kur, belgeTipi, belgeId, aciklama, hareketTarihi]
  );
  return r.rows[0];
}

async function cariBakiye(pool, cariId) {
  const r = await pool.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN yon='Borc' THEN tutar ELSE 0 END),0)::numeric AS borc,
      COALESCE(SUM(CASE WHEN yon='Alacak' THEN tutar ELSE 0 END),0)::numeric AS alacak
    FROM cari_hareketleri WHERE cari_id=$1
    `,
    [cariId]
  );
  const borc = Number(r.rows[0].borc);
  const alacak = Number(r.rows[0].alacak);
  return { borc, alacak, bakiye: borc - alacak };
}

async function cariEkstre(pool, cariId, { baslangic = null, bitis = null } = {}) {
  const params = [cariId];
  const where = ['cari_id=$1'];
  if (baslangic) {
    params.push(baslangic);
    where.push(`hareket_tarihi >= $${params.length}`);
  }
  if (bitis) {
    params.push(bitis);
    where.push(`hareket_tarihi <= $${params.length}`);
  }
  const hareketler = await pool.query(
    `SELECT * FROM cari_hareketleri WHERE ${where.join(' AND ')} ORDER BY hareket_tarihi, id`,
    params
  );
  const ozet = await cariBakiye(pool, cariId);
  return { ...ozet, hareketler: hareketler.rows };
}

module.exports = { cariHareketEkle, cariBakiye, cariEkstre };
