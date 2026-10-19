/**
 * Çok firmalı çalışma bağlamı.
 * İstek başlığı: X-Firma-Id (veya ?firma_id=)
 */

function firmaIdFromReq(req) {
  if (!req) return null;
  const raw = req.headers?.['x-firma-id'] ?? req.query?.firma_id ?? req.firmaId;
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Liste sorgularına firma filtresi ekler.
 * @param {string} expr SQL ifadesi, örn. "sp.firma_id" veya "iy.firma_id"
 * @param {number|null} firmaId
 * @param {any[]} params mevcut parametre dizisi (mutate edilir)
 * @returns {string} " AND expr = $n" veya ""
 */
function andFirma(expr, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  return ` AND ${expr} = $${params.length}`;
}

/** is_yerleri üzerinden firma (depolar, iş merkezleri vb.) */
function andFirmaViaIsYeri(isYeriExpr, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  return ` AND ${isYeriExpr} IN (SELECT id FROM is_yerleri WHERE firma_id = $${params.length})`;
}

/** Stok: doğrudan firma_id veya stok_is_yeri → is_yerleri */
function andStokFirma(stokAlias, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  const p = `$${params.length}`;
  return ` AND (
    ${stokAlias}.firma_id = ${p}
    OR EXISTS (
      SELECT 1 FROM stok_is_yeri siy
      JOIN is_yerleri iy ON iy.id = siy.is_yeri_id
      WHERE siy.stok_id = ${stokAlias}.id AND iy.firma_id = ${p}
    )
  )`;
}

/** Cari: firma_id veya is_yeri bağından */
function andCariFirma(cariAlias, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  const p = `$${params.length}`;
  return ` AND (
    ${cariAlias}.firma_id = ${p}
    OR ${cariAlias}.is_yeri_id IN (SELECT id FROM is_yerleri WHERE firma_id = ${p})
  )`;
}

async function assertFirmaKayit(clientOrPool, table, id, firmaId, { firmaCol = 'firma_id', isYeriCol = null } = {}) {
  if (!firmaId || !id) return true;
  let sql = `SELECT 1 FROM ${table} WHERE id = $1`;
  const params = [id];
  if (firmaCol) {
    params.push(firmaId);
    sql += ` AND ${firmaCol} = $2`;
  } else if (isYeriCol) {
    params.push(firmaId);
    sql += ` AND ${isYeriCol} IN (SELECT id FROM is_yerleri WHERE firma_id = $2)`;
  }
  const r = await clientOrPool.query(sql, params);
  return r.rows.length > 0;
}

module.exports = {
  firmaIdFromReq,
  andFirma,
  andFirmaViaIsYeri,
  andStokFirma,
  andCariFirma,
  assertFirmaKayit,
};
