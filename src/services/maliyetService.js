/**
 * Basit ortalama maliyet güncellemesi (INV-011 MVP).
 * Giriş hareketlerinde (direction=+1) ağırlıklı ortalama.
 */
async function maliyetGuncelleGiris(client, { stokId, quantity, birimMaliyet, hareketId = null }) {
  if (!stokId || !quantity || birimMaliyet == null) return null;
  const st = await client.query(
    `SELECT id, son_cost, cost_yontem FROM items WHERE id=$1 FOR UPDATE`,
    [stokId]
  );
  if (!st.rows[0]) return null;

  const bak = await client.query(
    `
    SELECT COALESCE(SUM(s.quantity * s.direction),0)::numeric AS bakiye
    FROM stock_movement_lines s
    JOIN stock_movements h ON h.id = s.movement_id
    WHERE s.item_id=$1
    `,
    [stokId]
  );
  // Mevcut bakiye bu girişten önce yaklaşık; giriş zaten yazıldıysa düş
  let mevcutMiktar = Number(bak.rows[0].bakiye) - Number(quantity);
  if (mevcutMiktar < 0) mevcutMiktar = 0;
  const eskiMaliyet = Number(st.rows[0].son_cost || 0);
  const yeni =
    mevcutMiktar + Number(quantity) <= 0
      ? Number(birimMaliyet)
      : (eskiMaliyet * mevcutMiktar + Number(birimMaliyet) * Number(quantity)) /
        (mevcutMiktar + Number(quantity));

  await client.query(`UPDATE items SET son_cost=$2 WHERE id=$1`, [stokId, yeni]);
  await client.query(
    `
    INSERT INTO item_cost_movements (item_id, movement_id, quantity, uom_cost, direction)
    VALUES ($1,$2,$3,$4,1)
    `,
    [stokId, hareketId, quantity, birimMaliyet]
  ).catch(() => {});
  return { son_cost: yeni };
}

module.exports = { maliyetGuncelleGiris };
