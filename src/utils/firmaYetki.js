/**
 * Kullanıcı → firma yetkisi (user_company_permissions).
 *
 * allowed === null → kısıtsız (oturumsuz soft mod veya firma yöneticisi)
 * allowed === []   → hiçbir firmaya yetkisi yok
 */

function isFirmaAdmin(user, env = process.env) {
  if (!user) return false;
  if (String(env.FIRMA_ADMIN_TUM_FIRMALAR || '').trim() === '0') return false;
  const role = String(user.role || '').toLowerCase();
  return user.group_code === 'ADMIN'
    || role === 'admin' || role === 'yonetici' || role === 'administrator'
    || String(user.user_code || '').toLowerCase() === 'owner';
}

async function loadAllowedCompanyIds(clientOrPool, user) {
  if (!user || !user.id) return null;
  if (isFirmaAdmin(user)) return null;
  const r = await clientOrPool.query(
    `SELECT company_id FROM user_company_permissions WHERE user_id = $1 ORDER BY company_id`,
    [user.id]
  );
  return r.rows.map((x) => Number(x.company_id));
}

/** İstek başına bir kez yükler (req._firmaYetki). */
async function allowedCompanyIdsForReq(req, clientOrPool) {
  if (!req) return null;
  if (req._firmaYetki !== undefined) return req._firmaYetki;
  const pool = clientOrPool || require('../../db');
  req._firmaYetki = await loadAllowedCompanyIds(pool, req.user);
  return req._firmaYetki;
}

function isCompanyAllowed(allowed, companyId) {
  if (allowed == null) return true;
  return allowed.includes(Number(companyId));
}

module.exports = {
  isFirmaAdmin,
  loadAllowedCompanyIds,
  allowedCompanyIdsForReq,
  isCompanyAllowed,
};
