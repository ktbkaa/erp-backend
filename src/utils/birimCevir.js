/**
 * Stok birim dönüşümü — stok_birim_tanimlari katsayıları.
 * Baz birim = stoklar.birim (katsayı 1 varsayılır).
 * Kayıt modeli: birim_kodu, cevrilecek_birim, katsayi
 *   → 1 × birim_kodu = katsayi × cevrilecek_birim (yoksa baz birim)
 */
async function stokBazBirim(clientOrPool, stokId) {
  const stok = await clientOrPool.query(
    `SELECT birim, stok_takip_birimi FROM stoklar WHERE id = $1`,
    [stokId]
  );
  return stok.rows[0]?.birim || stok.rows[0]?.stok_takip_birimi || null;
}

async function birimTanimlari(clientOrPool, stokId) {
  const r = await clientOrPool.query(
    `
    SELECT birim_kodu, katsayi, cevrilecek_birim, takip_birimi_mi
    FROM stok_birim_tanimlari
    WHERE stok_id = $1
    ORDER BY sira_no NULLS LAST, id
    `,
    [stokId]
  );
  return r.rows;
}

/** birim → baz birim cinsinden katsayı (1 alternatif = k × baz) */
async function birimKatsayi(clientOrPool, stokId, birim) {
  if (!stokId || !birim) return 1;
  const baz = await stokBazBirim(clientOrPool, stokId);
  if (!baz) return 1;
  if (String(birim).toLowerCase() === String(baz).toLowerCase()) return 1;

  const rows = await birimTanimlari(clientOrPool, stokId);
  const target = String(birim).toLowerCase();
  const bazL = String(baz).toLowerCase();

  for (const row of rows) {
    const kod = String(row.birim_kodu || '').toLowerCase();
    const hedef = String(row.cevrilecek_birim || baz).toLowerCase();
    const k = Number(row.katsayi);
    if (!Number.isFinite(k) || k <= 0) continue;

    // 1 kod = k × hedef; hedef baz ise doğrudan
    if (kod === target && hedef === bazL) return k;
    // 1 kod = k × hedef; kod baz ise ters
    if (hedef === target && kod === bazL) return 1 / k;
    // zincir: 1 kod = k × hedef, hedef≠baz ama hedef tanımı var
    if (kod === target && hedef !== bazL) {
      try {
        const hedefK = await birimKatsayi(clientOrPool, stokId, row.cevrilecek_birim || baz);
        return k * hedefK;
      } catch (_) { /* devam */ }
    }
  }

  const err = new Error(
    `Stok ${stokId} için birim dönüşümü bulunamadı: ${birim} (baz=${baz}). `
    + 'Birim Dönüşümleri sekmesinde kaynak→hedef katsayı tanımlayın.'
  );
  err.status = 400;
  throw err;
}

/**
 * miktar'ı fromBirim → toBirim'e çevir (to varsayılan: stok baz birimi).
 */
async function birimCevir(clientOrPool, stokId, miktar, fromBirim, toBirim = null) {
  const qty = Number(miktar);
  if (!Number.isFinite(qty)) return 0;
  if (!fromBirim) return qty;
  const to = toBirim || (await stokBazBirim(clientOrPool, stokId));
  if (!to || String(fromBirim).toLowerCase() === String(to).toLowerCase()) return qty;
  const fromK = await birimKatsayi(clientOrPool, stokId, fromBirim);
  const toK = await birimKatsayi(clientOrPool, stokId, to);
  return (qty * fromK) / toK;
}

/** Fiziksel tutarlılık: aynı boyut sınıfı veya ürün bazlı tanımlı dönüşüm */
function birimSinif(kod) {
  const k = String(kod || '').toUpperCase();
  if (['AD', 'ADET', 'PCS', 'EA', 'KOLİ', 'KOLI', 'PKT', 'PAKET'].includes(k)) return 'adet';
  if (['KG', 'GR', 'G', 'TON', 'MG', 'LB'].includes(k)) return 'agirlik';
  if (['MT', 'M', 'CM', 'MM', 'KM', 'IN'].includes(k)) return 'uzunluk';
  if (['LT', 'L', 'ML', 'M3', 'CL'].includes(k)) return 'hacim';
  return 'ozel';
}

function donusumGecerliMi(kaynak, hedef, { urunBazli = true } = {}) {
  if (!kaynak || !hedef) return false;
  if (String(kaynak).toLowerCase() === String(hedef).toLowerCase()) return true;
  const a = birimSinif(kaynak);
  const b = birimSinif(hedef);
  if (a === b && a !== 'ozel') return true;
  // farklı sınıflar yalnızca ürün bazlı (koli↔kg vb.) tanımlıysa
  return urunBazli;
}

module.exports = {
  birimKatsayi,
  birimCevir,
  birimTanimlari,
  stokBazBirim,
  birimSinif,
  donusumGecerliMi,
};
