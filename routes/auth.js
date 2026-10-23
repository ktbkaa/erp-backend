const express = require('express');
const router = express.Router();
const pool = require('../db');
const { signAccess, signRefresh, verifyToken, hashToken } = require('../src/utils/jwt');
const { parametreAl } = require('../src/utils/yetki');
const { parseJsonArr } = require('../src/middleware/authJwt');
const { hashParola, dogrulaParola } = require('../src/utils/parola');

async function loadEkranYetkileri(kisiId) {
  if (!kisiId) return [];
  const r = await pool.query(
    `SELECT screen_id, erisim, can_create AS yeni, incele, duzelt, kopyala, sil
     FROM user_screen_permissions WHERE kisi_id=$1`,
    [kisiId]
  );
  return r.rows;
}

async function loadFirmaYetkileri(kisiId) {
  if (!kisiId) return [];
  const r = await pool.query(
    `SELECT f.id AS company_id, f.company_code, f.company_name
     FROM user_company_permissions k
     JOIN companies f ON f.id = k.company_id
     WHERE k.kisi_id=$1
     ORDER BY f.company_code`,
    [kisiId]
  );
  return r.rows;
}

async function kullaniciPayload(u) {
  const [yetkiler, firma_yetkileri] = await Promise.all([
    loadEkranYetkileri(u.id),
    loadFirmaYetkileri(u.id),
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
    satinalma_onay: u.satinalma_onay,
    purchase_requisition_ref: u.purchase_requisition_ref,
    kalite_control: u.kalite_control,
    module_permissions: parseJsonArr(u.module_permissions, ['*']),
    warehouse_yetkileri: parseJsonArr(u.warehouse_yetkileri, ['*']),
    yetkiler,
    firma_yetkileri,
  };
}

async function kullaniciYukle(kod) {
  if (!kod) return null;
  const r = await pool.query(
    `SELECT k.*, g.satinalma_onay, g.purchase_requisition_ref, g.kalite_control,
            g.module_permissions, g.warehouse_yetkileri, g.group_name
     FROM users k
     LEFT JOIN user_groups g ON g.group_code = k.group_code AND g.is_active = TRUE
     WHERE k.user_code = $1 OR k.username = $1`,
    [kod]
  );
  return r.rows[0] || null;
}

/** POST /auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const body = req.body || {};
    const user_code = body.user_code || body.username || body.username;
    const parola = body.parola || body.sifre || body.password;
    if (!user_code) {
      return res.status(400).json({ hata: 'username (veya user_code) zorunlu.' });
    }
    const u = await kullaniciYukle(user_code);
    if (!u || u.is_active === false) return res.status(401).json({ hata: 'Kullanıcı bulunamadı veya is_inactive.' });

    if (u.parola_hash) {
      if (!parola || !dogrulaParola(parola, u.parola_hash)) {
        return res.status(401).json({ hata: 'Parola hatalı.' });
      }
    } else {
      const zorunlu = String(await parametreAl(pool, 'AUTH_ZORUNLU', 'Hayir')).toLowerCase() === 'evet';
      if (zorunlu && !parola) {
        return res.status(401).json({ hata: 'Parola tanımlı değil; yönetici parola atamalı.' });
      }
    }

    const ttl = Number(await parametreAl(pool, 'JWT_TTL_DK', '480')) || 480;
    const access_token = signAccess({ user_code: u.user_code, id: u.id }, ttl);
    const refresh_token = signRefresh({ user_code: u.user_code, id: u.id });
    await pool.query(
      `UPDATE users SET son_giris_at = NOW(), refresh_token_hash = $2 WHERE id = $1`,
      [u.id, hashToken(refresh_token)]
    );

    res.json({
      ...(await kullaniciPayload(u)),
      access_token,
      refresh_token,
      token_tipi: 'Bearer',
      expires_in_dk: ttl,
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
    const u = await kullaniciYukle(payload.user_code);
    if (!u || u.refresh_token_hash !== hashToken(refresh_token)) {
      return res.status(401).json({ hata: 'Refresh token eşleşmedi.' });
    }
    const ttl = Number(await parametreAl(pool, 'JWT_TTL_DK', '480')) || 480;
    const access_token = signAccess({ user_code: u.user_code, id: u.id }, ttl);
    res.json({ access_token, token_tipi: 'Bearer', expires_in_dk: ttl });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/logout — refresh hash temizle */
router.post('/logout', async (req, res, next) => {
  try {
    const { refresh_token, user_code } = req.body || {};
    let kod = user_code;
    if (refresh_token) {
      try {
        kod = verifyToken(refresh_token).user_code;
      } catch (_) { /* ignore */ }
    }
    if (!kod) {
      const hdr = req.get('authorization') || '';
      if (hdr.startsWith('Bearer ')) {
        try { kod = verifyToken(hdr.slice(7)).user_code; } catch (_) { /* ignore */ }
      }
    }
    if (kod) {
      await pool.query(`UPDATE users SET refresh_token_hash = NULL WHERE user_code=$1`, [kod]);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** GET /auth/me */
router.get('/me', async (req, res, next) => {
  try {
    const hdr = req.get('authorization') || '';
    const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    const kod = bearer
      ? verifyToken(bearer).user_code
      : (req.get('x-kullanici-kodu') || null);
    if (!kod) return res.status(401).json({ hata: 'Kimlik yok.' });
    const u = await kullaniciYukle(kod);
    if (!u) return res.status(401).json({ hata: 'Kullanıcı yok.' });
    res.json(await kullaniciPayload(u));
  } catch (err) {
    next(err);
  }
});

router.post('/parola-ayarla', async (req, res, next) => {
  try {
    const { user_code, parola, yeni_parola } = req.body || {};
    if (!user_code || !yeni_parola) {
      return res.status(400).json({ hata: 'user_code ve yeni_parola zorunlu.' });
    }
    const r = await pool.query(`SELECT * FROM users WHERE user_code=$1`, [user_code]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kullanıcı yok.' });
    if (r.rows[0].parola_hash && !dogrulaParola(parola || '', r.rows[0].parola_hash)) {
      return res.status(403).json({ hata: 'Mevcut parola hatalı.' });
    }
    await pool.query(`UPDATE users SET parola_hash=$1 WHERE id=$2`, [hashParola(yeni_parola), r.rows[0].id]);
    res.json({ ok: true, user_code });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.hashParola = hashParola;
