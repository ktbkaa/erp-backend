const express = require('express');
const router = express.Router();
const pool = require('../db');
const { signAccess, signRefresh, verifyToken, hashToken } = require('../src/utils/jwt');
const { parametreAl, isAdminUser } = require('../src/utils/yetki');
const { parseJsonArr, isAuthRequired } = require('../src/middleware/authJwt');
const { hashParola, dogrulaParola } = require('../src/utils/parola');
const { authenticateLdap, ldapStatus } = require('../src/utils/ldapAuth');

async function loadScreenPermissions(kisiId) {
  if (!kisiId) return [];
  const r = await pool.query(
    `SELECT screen_id, erisim, can_create AS yeni, incele, duzelt, kopyala, sil
     FROM user_screen_permissions WHERE user_id=$1`,
    [kisiId]
  );
  return r.rows;
}

async function loadCompanyPermissions(kisiId) {
  if (!kisiId) return [];
  const r = await pool.query(
    `SELECT f.id AS company_id, f.company_code, f.company_name
     FROM user_company_permissions k
     JOIN companies f ON f.id = k.company_id
     WHERE k.user_id=$1
     ORDER BY f.company_code`,
    [kisiId]
  );
  return r.rows;
}

/** Admin/yönetici: tüm profil firmaları (picker’da ELEK/TEKS vb. kaybolmasın). */
async function loadCompanyPermissionsForUser(u) {
  if (isAdminUser(u)) {
    const r = await pool.query(
      `SELECT id AS company_id, company_code, company_name
       FROM companies
       WHERE COALESCE(is_profile, TRUE) = TRUE
       ORDER BY company_code`
    );
    return r.rows;
  }
  return loadCompanyPermissions(u.id);
}

async function userPayload(u) {
  const [yetkiler, firma_yetkileri] = await Promise.all([
    loadScreenPermissions(u.id),
    loadCompanyPermissionsForUser(u),
  ]);
  return {
    id: u.id,
    user_code: u.user_code,
    username: u.username || u.user_code,
    first_name: u.first_name,
    last_name: u.last_name,
    title: u.title || u.role || '',
    role: u.role,
    group_code: u.group_code,
    group_name: u.group_name,
    profile_image: u.profile_image || null,
    can_approve_purchase: u.can_approve_purchase,
    purchase_requisition_ref: u.purchase_requisition_ref,
    can_quality_control: u.can_quality_control,
    module_permissions: parseJsonArr(u.module_permissions, ['*']),
    warehouse_permissions: parseJsonArr(u.warehouse_permissions, ['*']),
    yetkiler,
    firma_yetkileri,
  };
}

async function loadUser(kod) {
  if (!kod) return null;
  const r = await pool.query(
    `SELECT k.*, g.can_approve_purchase, g.purchase_requisition_ref, g.can_quality_control,
            g.module_permissions, g.warehouse_permissions, g.group_name
     FROM users k
     LEFT JOIN user_groups g ON g.group_code = k.group_code AND g.is_active = TRUE
     WHERE k.user_code = $1 OR k.username = $1`,
    [kod]
  );
  return r.rows[0] || null;
}

/** GET /auth/ldap-status — giriş ekranı LDAP anahtarı */
router.get('/ldap-status', async (req, res, next) => {
  try {
    res.json(await ldapStatus(pool));
  } catch (err) {
    next(err);
  }
});

/** POST /auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const body = req.body || {};
    const user_code = body.user_code || body.username || body.username;
    const parola = body.parola || body.sifre || body.password;
    const useLdap = Boolean(body.ldap || body.use_ldap || body.ldapMode);
    if (!user_code) {
      return res.status(400).json({ hata: 'username (veya user_code) zorunlu.' });
    }
    const u = await loadUser(user_code);
    if (!u || u.is_active === false) {
      return res.status(401).json({
        hata: useLdap
          ? 'LDAP doğrulaması için önce ERP’de aynı kullanıcı adı ile kullanıcı kartı olmalı.'
          : 'Kullanıcı bulunamadı veya pasif.',
      });
    }

    if (useLdap) {
      const ldap = await authenticateLdap(pool, user_code, parola);
      if (!ldap.ok) {
        return res.status(401).json({ hata: ldap.hata || 'LDAP giriş başarısız.' });
      }
    } else if (u.password_hash) {
      if (!parola || !dogrulaParola(parola, u.password_hash)) {
        return res.status(401).json({ hata: 'Parola hatalı.' });
      }
    } else if (await isAuthRequired()) {
      // Parolasız kullanıcı, zorunlu kimlikte (production / AUTH_ZORUNLU) hangi parola gelirse gelsin giremez
      return res.status(401).json({
        hata: 'Parola tanımlı değil; yönetici parola atamalı.',
        kod: 'PAROLA_TANIMSIZ',
      });
    }

    const ttl = Number(await parametreAl(pool, 'JWT_TTL_DK', '480')) || 480;
    const access_token = signAccess({ user_code: u.user_code, id: u.id }, ttl);
    const refresh_token = signRefresh({ user_code: u.user_code, id: u.id });
    await pool.query(
      `UPDATE users SET last_login_at = NOW(), refresh_token_hash = $2 WHERE id = $1`,
      [u.id, hashToken(refresh_token)]
    );

    res.json({
      ...(await userPayload(u)),
      access_token,
      refresh_token,
      token_tipi: 'Bearer',
      expires_in_dk: ttl,
      auth_method: useLdap ? 'ldap' : 'local',
      not: 'Authorization: Bearer <access_token> veya X-Kullanici-Kodu',
    });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/refresh { refresh_token } */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ hata: 'refresh_token zorunlu.' });
    let payload;
    try {
      payload = verifyToken(refresh_token);
    } catch {
      return res.status(401).json({ hata: 'Refresh token geçersiz.' });
    }
    if (payload.typ !== 'refresh') return res.status(401).json({ hata: 'Token tipi hatalı.' });
    const u = await loadUser(payload.user_code);
    if (!u || u.is_active === false || u.refresh_token_hash !== hashToken(refresh_token)) {
      return res.status(401).json({ hata: 'Refresh token eşleşmedi.' });
    }
    const ttl = Number(await parametreAl(pool, 'JWT_TTL_DK', '480')) || 480;
    const access_token = signAccess({ user_code: u.user_code, id: u.id }, ttl);
    res.json({ access_token, token_tipi: 'Bearer', expires_in_dk: ttl });
  } catch (err) {
    next(err);
  }
});

function verifiedUserCode(token, { refresh = false } = {}) {
  if (!token) return null;
  try {
    const p = verifyToken(token);
    if (refresh ? p.typ !== 'refresh' : p.typ === 'refresh') return null;
    return p.user_code || null;
  } catch (_) {
    return null;
  }
}

function bearerToken(req) {
  const hdr = req.get('authorization') || '';
  return hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null;
}

/**
 * POST /auth/logout — yalnız doğrulanmış token sahibinin refresh hash’i temizlenir.
 * Gövdedeki user_code kimlik sayılmaz (başkasının oturumunu düşürmeyi engeller).
 */
router.post('/logout', async (req, res, next) => {
  try {
    const { refresh_token } = req.body || {};
    let kod = null;
    if (refresh_token) {
      kod = verifiedUserCode(refresh_token, { refresh: true });
      if (kod) {
        await pool.query(
          `UPDATE users SET refresh_token_hash = NULL WHERE user_code=$1 AND refresh_token_hash=$2`,
          [kod, hashToken(refresh_token)]
        );
      }
    }
    if (!kod) {
      kod = verifiedUserCode(bearerToken(req));
      if (kod) {
        await pool.query(`UPDATE users SET refresh_token_hash = NULL WHERE user_code=$1`, [kod]);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** GET /auth/me — JWT (zorunlu modda tek yol) veya soft modda X-Kullanici-Kodu. */
router.get('/me', async (req, res, next) => {
  try {
    const bearer = bearerToken(req);
    let kod = null;
    if (bearer) {
      kod = verifiedUserCode(bearer);
      if (!kod) return res.status(401).json({ hata: 'Token geçersiz veya süresi dolmuş.' });
    } else if (!(await isAuthRequired())) {
      kod = req.get('x-kullanici-kodu') || null;
    }
    if (!kod) return res.status(401).json({ hata: 'Kimlik yok.' });
    const u = await loadUser(kod);
    if (!u || u.is_active === false) return res.status(401).json({ hata: 'Kullanıcı yok veya pasif.' });
    res.json(await userPayload(u));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/parola-ayarla { user_code?, parola, yeni_parola }
 * - Oturum zorunlu (JWT; soft modda X-Kullanici-Kodu).
 * - Kullanıcı yalnız kendi parolasını değiştirir; parolası varsa mevcut parola doğrulanır.
 * - Yönetici başka kullanıcının parolasını mevcut parola sormadan atayabilir.
 */
router.post('/parola-ayarla', async (req, res, next) => {
  try {
    const actor = req.user;
    if (!actor) return res.status(401).json({ hata: 'Parola değiştirmek için oturum açın.' });
    const { parola, yeni_parola } = req.body || {};
    const hedefKod = String(req.body?.user_code || actor.user_code || '').trim();
    if (!yeni_parola) return res.status(400).json({ hata: 'yeni_parola zorunlu.' });
    const minLen = Number(await parametreAl(pool, 'PAROLA_MIN_UZUNLUK', '8')) || 8;
    if (String(yeni_parola).length < minLen) {
      return res.status(400).json({ hata: `Parola en az ${minLen} karakter olmalı.`, kod: 'PAROLA_KISA' });
    }
    const r = await pool.query(`SELECT * FROM users WHERE user_code=$1`, [hedefKod]);
    const hedef = r.rows[0];
    const kendisi = hedef && hedef.id === actor.id;
    const admin = isAdminUser(actor);
    if (!kendisi && !admin) {
      return res.status(403).json({ hata: 'Yalnız kendi parolanızı değiştirebilirsiniz.', kod: 'YETKI_YOK' });
    }
    if (!hedef) return res.status(404).json({ hata: 'Kullanıcı yok.' });
    if (kendisi && hedef.password_hash && !dogrulaParola(parola || '', hedef.password_hash)) {
      return res.status(403).json({ hata: 'Mevcut parola hatalı.' });
    }
    await pool.query(
      `UPDATE users SET password_hash=$1, refresh_token_hash=NULL WHERE id=$2`,
      [hashParola(yeni_parola), hedef.id]
    );
    res.json({ ok: true, user_code: hedef.user_code });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.hashParola = hashParola;
