async function fiyatBul(pool, { stokId, cariId = null, miktar = 1, tarih = null }) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const r = await pool.query(
    `
    SELECT s.birim_fiyat, s.iskonto_oran, l.liste_kodu, l.para_birimi
    FROM fiyat_liste_satirlari s
    JOIN fiyat_listeleri l ON l.id = s.liste_id AND l.aktif = TRUE
    WHERE s.stok_id = $1
      AND (s.cari_id IS NULL OR s.cari_id = $2)
      AND s.min_miktar <= $3
      AND (l.baslangic_tarihi IS NULL OR l.baslangic_tarihi <= $4::date)
      AND (l.bitis_tarihi IS NULL OR l.bitis_tarihi >= $4::date)
    ORDER BY
      CASE WHEN s.cari_id IS NOT NULL THEN 0 ELSE 1 END,
      s.min_miktar DESC
    LIMIT 1
    `,
    [stokId, cariId, miktar, t]
  );
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  const iskonto = Number(row.iskonto_oran || 0);
  const net = Number(row.birim_fiyat) * (1 - iskonto / 100);
  return { ...row, net_birim_fiyat: net };
}

module.exports = { fiyatBul };
