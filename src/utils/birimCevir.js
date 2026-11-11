/**
 * Stok uom_code dönüşümü — item_uom_conversions katsayıları.
 * Baz uom_code = items.uom_code (katsayı 1 varsayılır).
 * Kayıt modeli: source_katsayi × uom_code = katsayi × cevrilecek_uom
 *   → 1 × uom_code = (katsayi / source_katsayi) × cevrilecek_uom
 */
function lineRate(row) {
  const sag = Number(row.katsayi);
  const sol = Number(row.source_katsayi);
  const source = Number.isFinite(sol) && sol > 0 ? sol : 1;
  if (!Number.isFinite(sag) || sag <= 0) return null;
  return sag / source;
}

async function itemBaseUom(clientOrPool, stokId) {
  const stok = await clientOrPool.query(
    `SELECT uom_code, stock_takip_uom FROM items WHERE id = $1`,
    [stokId]
  );
  return stok.rows[0]?.uom_code || stok.rows[0]?.stock_takip_uom || null;
}

async function uomDefinitions(clientOrPool, stokId) {
  const r = await clientOrPool.query(
    `
    SELECT uom_code, source_katsayi, katsayi, cevrilecek_uom, takip_uom_mi
    FROM item_uom_conversions
    WHERE item_id = $1
    ORDER BY line_no NULLS LAST, id
    `,
    [stokId]
  );
  return r.rows;
}

/** uom_code → baz uom_code cinsinden katsayı (1 alternatif = k × baz) */
async function uomFactor(clientOrPool, stokId, uom_code) {
  if (!stokId || !uom_code) return 1;
  const baz = await itemBaseUom(clientOrPool, stokId);
  if (!baz) return 1;
  if (String(uom_code).toLowerCase() === String(baz).toLowerCase()) return 1;

  const rows = await uomDefinitions(clientOrPool, stokId);
  const target = String(uom_code).toLowerCase();
  const bazL = String(baz).toLowerCase();

  for (const row of rows) {
    const kod = String(row.uom_code || '').toLowerCase();
    const hedef = String(row.cevrilecek_uom || baz).toLowerCase();
    const k = lineRate(row);
    if (k == null) continue;

    // 1 kod = k × hedef; hedef baz ise doğrudan
    if (kod === target && hedef === bazL) return k;
    // 1 kod = k × hedef; kod baz ise ters
    if (hedef === target && kod === bazL) return 1 / k;
    // zincir: 1 kod = k × hedef, hedef≠baz ama hedef tanımı var
    if (kod === target && hedef !== bazL) {
      try {
        const hedefK = await uomFactor(clientOrPool, stokId, row.cevrilecek_uom || baz);
        return k * hedefK;
      } catch (_) { /* devam */ }
    }
  }

  const err = new Error(
    `Stok ${stokId} için uom_code dönüşümü bulunamadı: ${uom_code} (baz=${baz}). `
    + 'Birim Dönüşümleri sekmesinde katsayı,uom_code = katsayı,uom_code tanımlayın.'
  );
  err.status = 400;
  throw err;
}

/**
 * quantity'ı fromBirim → toBirim'e çevir (to varsayılan: stok baz birimi).
 */
async function convertUom(clientOrPool, stokId, quantity, fromBirim, toBirim = null) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty)) return 0;
  if (!fromBirim) return qty;
  const to = toBirim || (await itemBaseUom(clientOrPool, stokId));
  if (!to || String(fromBirim).toLowerCase() === String(to).toLowerCase()) return qty;
  const fromK = await uomFactor(clientOrPool, stokId, fromBirim);
  const toK = await uomFactor(clientOrPool, stokId, to);
  return (qty * fromK) / toK;
}

/** Fiziksel tutarlılık: aynı boyut sınıfı veya ürün bazlı tanımlı dönüşüm */
function uomClass(kod) {
  const k = String(kod || '').toUpperCase();
  if (['AD', 'ADET', 'PCS', 'EA', 'KOLİ', 'KOLI', 'PKT', 'PAKET'].includes(k)) return 'adet';
  if (['KG', 'GR', 'G', 'TON', 'MG', 'LB'].includes(k)) return 'agirlik';
  if (['MT', 'M', 'CM', 'MM', 'KM', 'IN'].includes(k)) return 'uzunluk';
  if (['LT', 'L', 'ML', 'M3', 'CL'].includes(k)) return 'hacim';
  return 'ozel';
}

function donusumGecerliMi(source, hedef, { urunBazli = true } = {}) {
  if (!source || !hedef) return false;
  if (String(source).toLowerCase() === String(hedef).toLowerCase()) return true;
  const a = uomClass(source);
  const b = uomClass(hedef);
  if (a === b && a !== 'ozel') return true;
  // farklı sınıflar yalnızca ürün bazlı (koli↔kg vb.) tanımlıysa
  return urunBazli;
}

module.exports = {
  uomFactor,
  convertUom,
  uomDefinitions,
  itemBaseUom,
  uomClass,
  donusumGecerliMi,
};
