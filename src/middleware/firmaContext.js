const { companyIdFromReq } = require('../utils/firmaScope');
const { allowedCompanyIdsForReq, isCompanyAllowed } = require('../utils/firmaYetki');

function parseCompanyId(raw) {
  if (raw == null || raw === '' || raw === 'null' || raw === 'undefined') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function forbidden(res, companyId) {
  return res.status(403).json({
    hata: `Bu firmaya erişim yetkiniz yok (company_id=${companyId}).`,
    kod: 'FIRMA_YETKI_YOK',
  });
}

/**
 * req.firmaId = X-Firma-Id | ?company_id=
 *
 * Oturumlu ve kısıtlı (yönetici olmayan) kullanıcıda:
 * - X-Firma-Id / ?company_id / gövde company_id → user_company_permissions zorunlu (403)
 * - Firma seçilmemişse ve tek yetkili firma varsa bağlam o firmaya sabitlenir
 *
 * Sonrasında companyIdFromReq yalnız req.firmaId’yi okur (req._firmaBaglami).
 */
async function companyContext(req, res, next) {
  try {
    req.firmaId = companyIdFromReq(req);
    req._firmaBaglami = true;
    const p = req.path || '';
    if (p === '/health' || p.startsWith('/auth/')) return next();

    const allowed = await allowedCompanyIdsForReq(req);
    if (allowed == null) return next();

    // Başlık ve sorgu ayrı ayrı: bazı raporlar ?company_id’yi doğrudan okur
    const requested = [req.headers?.['x-firma-id'], req.query?.company_id];
    if (req.method !== 'GET' && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      requested.push(req.body.company_id);
    }
    for (const raw of requested) {
      const id = parseCompanyId(raw);
      if (id && !isCompanyAllowed(allowed, id)) return forbidden(res, id);
    }
    if (!req.firmaId && allowed.length === 1) {
      req.firmaId = allowed[0];
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { companyContext };
