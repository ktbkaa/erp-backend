/**
 * Stok birim dönüşümü — stok_birim_tanimlari katsayıları.
 * Baz birim = stoklar.birim (katsayı 1 varsayılır).
 */
async function birimKatsayi(clientOrPool, stokId, birim) {
  if (!stokId || !birim) return 1;
  const stok = await clientOrPool.query(
    `SELECT birim FROM stoklar WHERE id = $1`,
    [stokId]
  );
  const baz = stok.rows[0]?.birim;
  if (!baz) return 1;
  if (String(birim).toLowerCase() === String(baz).toLowerCase()) return 1;

  const r = await clientOrPool.query(
    `
    SELECT katsayi FROM stok_birim_tanimlari
    WHERE stok_id = $1 AND LOWER(birim) = LOWER($2)
    LIMIT 1
    `,
    [stokId, birim]
  );
  if (r.rows[0]?.katsayi != null) return Number(r.rows[0].katsayi);

  // Ters: kayıtlı birim baz ise 1/katsayi
  const r2 = await clientOrPool.query(
    `
    SELECT katsayi, birim FROM stok_birim_tanimlari
    WHERE stok_id = $1
    `,
    [stokId]
  );
  for (const row of r2.rows) {
    if (String(row.birim).toLowerCase() === String(birim).toLowerCase()) {
      return Number(row.katsayi) || 1;
    }
  }
  const err = new Error(`Stok ${stokId} için birim dönüşümü bulunamadı: ${birim} (baz=${baz})`);
  err.status = 400;
  throw err;
}

/**
 * miktar'ı fromBirim → toBirim'e çevir (to varsayılan: stok baz birimi).
 */
async function birimCevir(clientOrPool, stokId, miktar, fromBirim, toBirim = null) {
  const qty = Number(miktar);
  if (!Number.isFinite(qty)) return 0;
  const fromK = await birimKatsayi(clientOrPool, stokId, fromBirim);
  let toK = 1;
  if (toBirim) toK = await birimKatsayi(clientOrPool, stokId, toBirim);
  // katsayi: 1 alternatif birim = katsayi × baz birim
  const bazMiktar = qty * fromK;
  return bazMiktar / toK;
}

module.exports = { birimKatsayi, birimCevir };
