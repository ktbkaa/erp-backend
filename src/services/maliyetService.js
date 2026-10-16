/**
 * Basit ortalama maliyet güncellemesi (INV-011 MVP).
 * Giriş hareketlerinde (yon=+1) ağırlıklı ortalama.
 */
async function maliyetGuncelleGiris(client, { stokId, miktar, birimMaliyet, hareketId = null }) {
  if (!stokId || !miktar || birimMaliyet == null) return null;
  const st = await client.query(
    `SELECT id, son_maliyet, maliyet_yontem FROM stoklar WHERE id=$1 FOR UPDATE`,
    [stokId]
  );
  if (!st.rows[0]) return null;

  const bak = await client.query(
    `
    SELECT COALESCE(SUM(s.miktar * s.yon),0)::numeric AS bakiye
    FROM stok_hareket_satirlari s
    JOIN stok_hareketleri h ON h.id = s.hareket_id
    WHERE s.stok_id=$1
    `,
    [stokId]
  );
  // Mevcut bakiye bu girişten önce yaklaşık; giriş zaten yazıldıysa düş
  let mevcutMiktar = Number(bak.rows[0].bakiye) - Number(miktar);
  if (mevcutMiktar < 0) mevcutMiktar = 0;
  const eskiMaliyet = Number(st.rows[0].son_maliyet || 0);
  const yeni =
    mevcutMiktar + Number(miktar) <= 0
      ? Number(birimMaliyet)
      : (eskiMaliyet * mevcutMiktar + Number(birimMaliyet) * Number(miktar)) /
        (mevcutMiktar + Number(miktar));

  await client.query(`UPDATE stoklar SET son_maliyet=$2 WHERE id=$1`, [stokId, yeni]);
  await client.query(
    `
    INSERT INTO stok_maliyet_hareket (stok_id, hareket_id, miktar, birim_maliyet, yon)
    VALUES ($1,$2,$3,$4,1)
    `,
    [stokId, hareketId, miktar, birimMaliyet]
  ).catch(() => {});
  return { son_maliyet: yeni };
}

module.exports = { maliyetGuncelleGiris };
