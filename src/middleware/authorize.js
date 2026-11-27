'use strict';

const { isAdminUser } = require('../utils/yetki');
const {
  MODULE_SCREENS,
  MODULE_ALIASES,
  SCREEN_ALIASES,
  SCREEN_MODULE,
  resolvePolicy,
  modulesOfScreens,
  aliasCandidates,
} = require('../auth/permissionMap');

/**
 * ERP_RBAC_MODE=audit → ekran/modül reddi loglanır ama istek geçer (kademeli geçiş).
 * Yönetici (requireAdmin) kontrolleri her modda zorunludur.
 */
function rbacMode() {
  return String(process.env.ERP_RBAC_MODE || '').trim().toLowerCase() === 'audit' ? 'audit' : 'enforce';
}

// db/authJwt geç yüklenir: harita ve semantik birim testleri veritabanı olmadan çalışsın
function db() {
  return require('../../db');
}

function isAuthRequired() {
  return require('./authJwt').isAuthRequired();
}

function moduleList(user) {
  const v = user?.module_permissions;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) { /* varsayılan */ }
  }
  return ['*'];
}

/** SPA isSessionTamYetkili ile aynı: yönetici veya modül listesinde '*'. */
function isFullAccess(user) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return moduleList(user).includes('*');
}

async function loadScreenRows(req) {
  if (req._screenRows) return req._screenRows;
  if (!req.user?.id) {
    req._screenRows = [];
    return req._screenRows;
  }
  const r = await db().query(
    `SELECT screen_id, erisim, can_create AS yeni, incele, duzelt, kopyala, sil
     FROM user_screen_permissions WHERE user_id=$1`,
    [req.user.id]
  );
  req._screenRows = r.rows;
  return req._screenRows;
}

function rowAllows(row, action) {
  if (!row || row.erisim === false) return false;
  if (!action) return true;
  if (action === 'yeni') return Boolean(row.yeni || row.kopyala);
  if (action === 'islem') return Boolean(row.yeni || row.duzelt);
  return Boolean(row[action]);
}

function expandModules(mods) {
  const out = new Set();
  for (const m of mods) {
    out.add(m);
    for (const extra of MODULE_ALIASES[m] || []) out.add(extra);
  }
  return out;
}

/** Ekran satırı yokken modül listesi (grup module_permissions) belirleyicidir. */
function moduleListAllows(user, modules) {
  const mods = moduleList(user);
  if (!mods.length || mods.includes('*')) return true;
  const allowed = expandModules(mods);
  return modules.some((m) => allowed.has(m));
}

/**
 * Kullanıcı verilen ekranlardan en az birinde `action` yapabilir mi?
 * Semantik SPA screenPermission ile aynıdır (geri uyum): tam yetkili → evet;
 * ekran satırı yoksa grup modül listesi; satır varsa yalnız satırlar.
 */
async function canScreen(req, screens, action = null) {
  const user = req.user;
  if (!user) return true;
  if (isFullAccess(user)) return true;
  const list = Array.isArray(screens) ? screens : [screens];
  const rows = await loadScreenRows(req);
  if (!rows.length) return moduleListAllows(user, modulesOfScreens(list));
  for (const sid of list) {
    const candidates = aliasCandidates(sid);
    const row = rows.find((y) => candidates.includes(y.screen_id) && y.erisim !== false);
    if (rowAllows(row, action)) return true;
  }
  return false;
}

/** Modüllerden birinde en az bir ekrana erişim. */
async function canModule(req, modules) {
  const user = req.user;
  if (!user) return true;
  if (isFullAccess(user)) return true;
  const list = (Array.isArray(modules) ? modules : [modules]).filter(Boolean);
  const rows = await loadScreenRows(req);
  if (!rows.length) return moduleListAllows(user, list);
  const wanted = new Set(list);
  return rows.some((y) => {
    if (y.erisim === false) return false;
    const canonical = SCREEN_ALIASES[y.screen_id] || y.screen_id;
    return wanted.has(SCREEN_MODULE[canonical]);
  });
}

function yetkiHatasi(message, extra = {}) {
  const err = new Error(message);
  err.status = 403;
  err.kod = 'YETKI_YOK';
  Object.assign(err, extra);
  return err;
}

function sendDenied(req, res, next, message, extra, { auditable = true } = {}) {
  const who = req.user?.user_code || '-';
  if (auditable && rbacMode() === 'audit') {
    console.warn(`[yetki] AUDIT-DENY user=${who} ${req.method} ${req.originalUrl} — ${message}`);
    res.setHeader('X-Yetki-Uyari', 'audit-deny');
    return next();
  }
  console.warn(`[yetki] DENY user=${who} ${req.method} ${req.originalUrl} — ${message}`);
  return res.status(403).json({ hata: message, kod: 'YETKI_YOK', ...extra });
}

async function anonymousGate(req, res, next) {
  if (await isAuthRequired()) {
    res.status(401).json({ hata: 'Kimlik doğrulama gerekli (Bearer JWT).' });
    return false;
  }
  next();
  return false;
}

/** Sadece yönetici (ADMIN grubu / Yönetici rolü). Audit modundan etkilenmez. */
function requireAdmin(req, res, next) {
  Promise.resolve().then(async () => {
    if (!req.user) return anonymousGate(req, res, next);
    if (req.user.is_active === false) return sendDenied(req, res, next, 'Kullanıcı pasif.', {}, { auditable: false });
    if (isAdminUser(req.user)) return next();
    return sendDenied(req, res, next, 'Bu işlem için yönetici (ADMIN) yetkisi gerekli.', { gerekli: 'admin' }, { auditable: false });
  }).catch(next);
}

function requireScreenPermission(screens, action = null) {
  const list = Array.isArray(screens) ? screens : [screens];
  return (req, res, next) => {
    Promise.resolve().then(async () => {
      if (!req.user) return anonymousGate(req, res, next);
      if (await canScreen(req, list, action)) return next();
      return sendDenied(
        req, res, next,
        `Ekran yetkisi yok (${list.join(', ')}${action ? ` · ${action}` : ''}).`,
        { ekran: list, aksiyon: action }
      );
    }).catch(next);
  };
}

function requireModulePermission(modules) {
  const list = Array.isArray(modules) ? modules : [modules];
  return (req, res, next) => {
    Promise.resolve().then(async () => {
      if (!req.user) return anonymousGate(req, res, next);
      if (await canModule(req, list)) return next();
      return sendDenied(req, res, next, `Modül yetkisi yok: ${list.join(', ')}`, { modul: list });
    }).catch(next);
  };
}

/** Global: permissionMap’e göre her API isteğini yetkilendirir. */
function authorizeRequest(req, res, next) {
  const pol = resolvePolicy(req.method, req.path);
  if (req.method === 'OPTIONS' || pol.level === 'public') return next();
  if (pol.level === 'admin') return requireAdmin(req, res, next);
  Promise.resolve().then(async () => {
    if (!req.user) return anonymousGate(req, res, next);
    if (req.user.is_active === false) return sendDenied(req, res, next, 'Kullanıcı pasif.', {}, { auditable: false });
    if (pol.level === 'auth') return next();
    if (pol.level === 'full') {
      if (isFullAccess(req.user)) return next();
      return sendDenied(req, res, next, 'Bu uç yetki haritasında tanımlı değil; tam yetki gerekli.', { gerekli: 'tam-yetki' });
    }
    if (pol.level === 'module') {
      const mods = modulesOfScreens(pol.screens);
      if (await canModule(req, mods)) return next();
      return sendDenied(req, res, next, `Modül yetkisi yok: ${mods.join(', ')}`, { modul: mods });
    }
    if (await canScreen(req, pol.screens, pol.action)) return next();
    return sendDenied(
      req, res, next,
      `Ekran yetkisi yok (${pol.screens.join(', ')}${pol.action ? ` · ${pol.action}` : ''}).`,
      { ekran: pol.screens, aksiyon: pol.action }
    );
  }).catch(next);
}

module.exports = {
  MODULE_SCREENS,
  rbacMode,
  isFullAccess,
  isAdminUser,
  canScreen,
  canModule,
  requireAdmin,
  requireScreenPermission,
  requireModulePermission,
  authorizeRequest,
  yetkiHatasi,
  _rowAllows: rowAllows,
};
