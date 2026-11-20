const pool = require('../../db');
const { verifyToken } = require('../utils/jwt');
const { parametreAl, getUser, reqUserCode } = require('../utils/yetki');

/**
 * AUTH zorunluluğu:
 * - ERP_AUTH_SOFT=1 → her zaman soft (lokal/CI)
 * - NODE_ENV=production veya ERP_AUTH_REQUIRED=true → zorunlu (parametreye bakmadan)
 * - Aksi halde system_parameters.AUTH_ZORUNLU (varsayılan Evet)
 */
async function isAuthRequired() {
  if (String(process.env.ERP_AUTH_SOFT || '').trim() === '1') return false;
  if (
    String(process.env.ERP_AUTH_REQUIRED || '').toLowerCase() === 'true'
    || String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  ) {
    return true;
  }
  const v = String(await parametreAl(pool, 'AUTH_ZORUNLU', 'Evet')).toLowerCase();
  return v === 'evet';
}

/**
 * JWT veya (soft modda) X-Kullanici-Kodu ile kimlik.
 */
async function authOptional(req, res, next) {
  try {
    const hdr = req.get('authorization') || '';
    const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null;
    if (bearer) {
      try {
        const payload = verifyToken(bearer);
        if (payload?.user_code && payload.typ !== 'refresh') {
          req.user = await getUser(pool, payload.user_code);
          req.auth = { type: 'jwt', payload };
        }
      } catch (_) {
        /* geçersiz token — zorunluluk aşağıda */
      }
    }
    const zorunlu = await isAuthRequired();
    // Soft modda header kimlik; zorunlu iken yalnız JWT
    if (!req.user && !zorunlu) {
      const kod = reqUserCode(req);
      if (kod) {
        req.user = await getUser(pool, kod);
        req.auth = { type: 'header', user_code: kod };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function authRequired(req, res, next) {
  const p = req.path || '';
  if (p === '/health' || p.startsWith('/auth/')) return next();
  const zorunlu = await isAuthRequired();
  if (!req.user && zorunlu) {
    return res.status(401).json({ hata: 'Kimlik doğrulama gerekli (Bearer JWT).' });
  }
  if (zorunlu && req.auth?.type === 'header') {
    return res.status(403).json({
      hata: 'AUTH_ZORUNLU açıkken X-Kullanici-Kodu yeterli değil; JWT gerekli.',
    });
  }
  next();
}

function parseJsonArr(v, fallback = ['*']) {
  try {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return JSON.parse(v);
  } catch (_) { /* ignore */ }
  return fallback;
}

async function assertWarehousePermission(req, depoId) {
  if (!req.user || !depoId) return true;
  const list = parseJsonArr(req.user.warehouse_permissions, ['*']);
  if (list.includes('*')) {
    const r = await pool.query(
      `SELECT 1 FROM user_warehouses WHERE user_id=$1 LIMIT 1`,
      [req.user.id]
    );
    if (!r.rows[0]) return true;
  }
  if (list.includes('*') === false) {
    const d = await pool.query(`SELECT id, warehouse_code FROM warehouses WHERE id=$1`, [depoId]);
    const kod = d.rows[0]?.warehouse_code;
    if (list.includes(String(depoId)) || (kod && list.includes(kod))) return true;
  }
  const row = await pool.query(
    `SELECT 1 FROM user_warehouses WHERE user_id=$1 AND warehouse_id=$2`,
    [req.user.id, depoId]
  );
  if (row.rows[0]) return true;
  if (list.includes('*')) return true;
  const err = new Error(`Depo yetkisi yok (warehouse_id=${depoId}).`);
  err.status = 403;
  throw err;
}

function assertModulePermission(req, modulId) {
  if (!req.user) return true;
  const list = parseJsonArr(req.user.module_permissions, ['*']);
  if (list.includes('*') || list.includes(modulId)) return true;
  const err = new Error(`Modül yetkisi yok: ${modulId}`);
  err.status = 403;
  throw err;
}

module.exports = {
  authOptional,
  authRequired,
  assertWarehousePermission,
  assertModulePermission,
  parseJsonArr,
  isAuthRequired,
};
