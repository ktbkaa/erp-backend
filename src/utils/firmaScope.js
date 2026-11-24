/**
 * Çok firmalı çalışma bağlamı.
 * İstek başlığı: X-Firma-Id (veya ?company_id=)
 */

function companyIdFromReq(req) {
  if (!req) return null;
  const raw = req.headers?.['x-firma-id'] ?? req.query?.company_id ?? req.firmaId;
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Belge kaydı: body.company_id (geçerliyse) yoksa X-Firma-Id */
function resolveDocumentCompanyId(req, body = {}) {
  const raw = body?.company_id;
  if (raw != null && raw !== '' && raw !== 'null' && raw !== 'undefined') {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return companyIdFromReq(req);
}

/**
 * Liste sorgularına firma filtresi ekler.
 * @param {string} expr SQL ifadesi, örn. "sp.company_id" veya "iy.company_id"
 * @param {number|null} firmaId
 * @param {any[]} params mevcut parametre dizisi (mutate edilir)
 * @returns {string} " AND expr = $n" veya ""
 */
function andCompany(expr, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  return ` AND ${expr} = $${params.length}`;
}

/** plants üzerinden firma (warehouses, iş merkezleri vb.) */
function andCompanyViaPlant(isYeriExpr, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  return ` AND ${isYeriExpr} IN (SELECT id FROM plants WHERE company_id = $${params.length})`;
}

/** Stok: company_id VEYA item_plants→plants VEYA item_company_params (assert ile aynı) */
function andItemCompany(stokAlias, firmaId, params) {
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
    OR EXISTS (
      SELECT 1 FROM item_company_params fp
      WHERE fp.item_id = ${stokAlias}.id
        AND fp.company_id = ${p}
        AND fp.is_active IS DISTINCT FROM FALSE
    )
  )`;
}

/** Cari: company_id VEYA plant→plants VEYA partner_company_params (stok ile aynı model) */
function andPartnerCompany(cariAlias, firmaId, params) {
  if (!firmaId) return '';
  params.push(firmaId);
  const p = `$${params.length}`;
  return ` AND (
    ${cariAlias}.company_id = ${p}
    OR ${cariAlias}.plant_id IN (SELECT id FROM plants WHERE company_id = ${p})
    OR EXISTS (
      SELECT 1 FROM partner_company_params fp
      WHERE fp.partner_id = ${cariAlias}.id
        AND fp.company_id = ${p}
        AND fp.is_active IS DISTINCT FROM FALSE
    )
  )`;
}

async function assertCompanyRecord(clientOrPool, table, id, firmaId, { firmaCol = 'company_id', isYeriCol = null } = {}) {
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

/**
 * Stok GET/PUT: liste filtresi (andStokFirma) ile aynı kapsam.
 * items.company_id VEYA item_plants→plants VEYA item_company_params.
 */
async function assertItemCompanyRecord(clientOrPool, itemId, firmaId) {
  if (!firmaId || !itemId) return true;
  const r = await clientOrPool.query(
    `SELECT 1 FROM items s
     WHERE s.id = $1
       AND (
         s.company_id = $2
         OR EXISTS (
           SELECT 1 FROM item_plants siy
           JOIN plants iy ON iy.id = siy.plant_id
           WHERE siy.item_id = s.id AND iy.company_id = $2
         )
         OR EXISTS (
           SELECT 1 FROM item_company_params fp
           WHERE fp.item_id = s.id
             AND fp.company_id = $2
             AND fp.is_active IS DISTINCT FROM FALSE
         )
       )
     LIMIT 1`,
    [itemId, firmaId]
  );
  return r.rows.length > 0;
}

/** Cari GET/PUT: liste filtresi (andPartnerCompany) ile aynı kapsam. */
async function assertPartnerCompanyRecord(clientOrPool, partnerId, firmaId) {
  if (!firmaId || !partnerId) return true;
  const r = await clientOrPool.query(
    `SELECT 1 FROM partners c
     WHERE c.id = $1
       AND (
         c.company_id = $2
         OR c.plant_id IN (SELECT id FROM plants WHERE company_id = $2)
         OR EXISTS (
           SELECT 1 FROM partner_company_params fp
           WHERE fp.partner_id = c.id
             AND fp.company_id = $2
             AND fp.is_active IS DISTINCT FROM FALSE
         )
       )
     LIMIT 1`,
    [partnerId, firmaId]
  );
  return r.rows.length > 0;
}

/**
 * Express middleware: GET/PUT/DELETE /:id için firma kapsamı.
 * Kullanım: router.get('/:id', requireCompanyRecord('sales_orders'), handler)
 * veya requireCompanyRecord('warehouses', { isYeriCol: 'plant_id', firmaCol: null })
 *
 * Handler'dan önce çalışır; kayıt yoksa / yanlış firmadaysa 404.
 * Not: handler hâlâ kendi getById'sini çağırır — bu yalnızca IDOR engeli.
 */
function requireCompanyRecord(table, opts = {}) {
  const pool = require('../../db');
  return async function companyRecordGuard(req, res, next) {
    try {
      const firmaId = companyIdFromReq(req);
      if (!firmaId) return next();
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return next();
      const ok = await assertCompanyRecord(pool, table, id, firmaId, opts);
      if (!ok) {
        return res.status(404).json({ hata: 'Kayıt bulunamadı (firma kapsamı).', kod: 'FIRMA_KAPSAM' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Ürün ağacı / rota: belge company_id VEYA mamul stok company_id
 * (liste filtresi ile aynı — aksi halde listede görünen kayıt GET’te 404).
 */
async function assertDocOrItemCompany(clientOrPool, {
  table,
  id,
  firmaId,
  itemFk = 'finished_good_item_id',
  alias = 'd',
} = {}) {
  if (!firmaId || !id) return true;
  const r = await clientOrPool.query(
    `SELECT 1 FROM ${table} ${alias}
     JOIN items s ON s.id = ${alias}.${itemFk}
     WHERE ${alias}.id = $1
       AND (
         ${alias}.company_id = $2
         OR s.company_id = $2
         OR EXISTS (
           SELECT 1 FROM item_company_params fp
           WHERE fp.item_id = s.id
             AND fp.company_id = $2
             AND fp.is_active IS DISTINCT FROM FALSE
         )
       )
     LIMIT 1`,
    [id, firmaId]
  );
  return r.rows.length > 0;
}

module.exports = {
  companyIdFromReq,
  resolveDocumentCompanyId,
  andCompany,
  andCompanyViaPlant,
  andItemCompany,
  andPartnerCompany,
  assertCompanyRecord,
  assertItemCompanyRecord,
  assertPartnerCompanyRecord,
  assertDocOrItemCompany,
  requireCompanyRecord,
};
