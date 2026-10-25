/**
 * Çok firmalı çalışma bağlamı.
 * İstek başlığı: X-Firma-Id (veya ?company_id=)
 */

function firmaIdFromReq(req) {
  if (!req) return null;
  const raw = req.headers?.['x-firma-id'] ?? req.query?.company_id ?? req.firmaId;
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Liste sorgularına firma filtresi ekler.
 * @param {string} expr SQL ifadesi, örn. "sp.company_id" veya "iy.company_id"
 * @param {number|null} firmaId
 * @param {any[]} params mevcut parametre dizisi (mutate edilir)
 * @returns {string} " AND expr = $n" veya ""
 */
function andFirma(expr, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  return ` AND ${expr} = $${params.length}`;
}

/** plants üzerinden firma (warehouses, iş merkezleri vb.) */
function andFirmaViaIsYeri(isYeriExpr, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  return ` AND ${isYeriExpr} IN (SELECT id FROM plants WHERE company_id = $${params.length})`;
}

/** Stok: doğrudan company_id veya item_plants → plants */
function andStokFirma(stokAlias, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  const p = `$${params.length}`;
  return ` AND (
    ${stokAlias}.company_id = ${p}
    OR EXISTS (
      SELECT 1 FROM item_plants siy
      JOIN plants iy ON iy.id = siy.plant_id
      WHERE siy.item_id = ${stokAlias}.id AND iy.company_id = ${p}
    )
  )`;
}

/** Cari: company_id veya is_yeri bağından */
function andCariFirma(cariAlias, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  const p = `$${params.length}`;
  return ` AND (
    ${cariAlias}.company_id = ${p}
    OR ${cariAlias}.plant_id IN (SELECT id FROM plants WHERE company_id = ${p})
  )`;
}

async function assertFirmaKayit(clientOrPool, table, id, firmaId, { firmaCol = 'company_id', isYeriCol = null } = {}) {
  if (!firmaId || !id) return true;
  let sql = `SELECT 1 FROM ${table} WHERE id = $1`;
  const params = [id];
  if (firmaCol) {
    params.push(firmaId);
    sql += ` AND ${firmaCol} = $2`;
  } else if (isYeriCol) {
    params.push(firmaId);
    sql += ` AND ${isYeriCol} IN (SELECT id FROM plants WHERE company_id = $2)`;
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
