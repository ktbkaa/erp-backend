const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');
const { signAccess, signRefresh, verifyToken, hashToken } = require('../src/utils/jwt');
const { parametreAl } = require('../src/utils/yetki');
const { parseJsonArr } = require('../src/middleware/authJwt');

function hashParola(parola, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(parola), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function dogrulaParola(parola, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(String(parola), salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch {
    return false;
  }
}

function kullaniciPayload(u) {
  return {
    kullanici_kodu: u.kullanici_kodu,
    ad: u.ad,
    soyad: u.soyad,
    grup_kodu: u.grup_kodu,
    grup_adi: u.grup_adi,
    satinalma_onay: u.satinalma_onay,
    satinalma_talep: u.satinalma_talep,
    kalite_kontrol: u.kalite_kontrol,
    modul_yetkileri: parseJsonArr(u.modul_yetkileri, ['*']),
    depo_yetkileri: parseJsonArr(u.depo_yetkileri, ['*']),
  };
}

async function kullaniciYukle(kod) {
  const r = await pool.query(
    `SELECT k.*, g.satinalma_onay, g.satinalma_talep, g.kalite_kontrol,
            g.modul_yetkileri, g.depo_yetkileri, g.grup_adi
     FROM kisiler k
     LEFT JOIN kullanici_gruplari g ON g.grup_kodu = k.grup_kodu AND g.aktif = TRUE
     WHERE k.kullanici_kodu = $1`,
    [kod]
  );
  return r.rows[0] || null;
}

/** POST /auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const { kullanici_kodu, parola } = req.body || {};
    if (!kullanici_kodu) return res.status(400).json({ hata: 'kullanici_kodu zorunlu.' });
    const u = await kullaniciYukle(kullanici_kodu);
    if (!u || u.aktif === false) return res.status(401).json({ hata: 'Kullanıcı bulunamadı veya pasif.' });

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
    const access_token = signAccess({ kullanici_kodu: u.kullanici_kodu, id: u.id }, ttl);
    const refresh_token = signRefresh({ kullanici_kodu: u.kullanici_kodu, id: u.id });
    await pool.query(
      `UPDATE kisiler SET son_giris_at = NOW(), refresh_token_hash = $2 WHERE id = $1`,
      [u.id, hashToken(refresh_token)]
    );

    res.json({
      ...kullaniciPayload(u),
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
    const u = await kullaniciYukle(payload.kullanici_kodu);
    if (!u || u.refresh_token_hash !== hashToken(refresh_token)) {
      return res.status(401).json({ hata: 'Refresh token eşleşmedi.' });
    }
    const ttl = Number(await parametreAl(pool, 'JWT_TTL_DK', '480')) || 480;
    const access_token = signAccess({ kullanici_kodu: u.kullanici_kodu, id: u.id }, ttl);
    res.json({ access_token, token_tipi: 'Bearer', expires_in_dk: ttl });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/logout — refresh hash temizle */
router.post('/logout', async (req, res, next) => {
  try {
    const { refresh_token, kullanici_kodu } = req.body || {};
    let kod = kullanici_kodu;
    if (refresh_token) {
      try {
        kod = verifyToken(refresh_token).kullanici_kodu;
      } catch (_) { /* ignore */ }
    }
    if (!kod) {
      const hdr = req.get('authorization') || '';
      if (hdr.startsWith('Bearer ')) {
        try { kod = verifyToken(hdr.slice(7)).kullanici_kodu; } catch (_) { /* ignore */ }
      }
    }
    if (kod) {
      await pool.query(`UPDATE kisiler SET refresh_token_hash = NULL WHERE kullanici_kodu=$1`, [kod]);
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
      ? verifyToken(bearer).kullanici_kodu
      : (req.get('x-kullanici-kodu') || null);
    if (!kod) return res.status(401).json({ hata: 'Kimlik yok.' });
    const u = await kullaniciYukle(kod);
    if (!u) return res.status(401).json({ hata: 'Kullanıcı yok.' });
    res.json(kullaniciPayload(u));
  } catch (err) {
    next(err);
  }
});

router.post('/parola-ayarla', async (req, res, next) => {
  try {
    const { kullanici_kodu, parola, yeni_parola } = req.body || {};
    if (!kullanici_kodu || !yeni_parola) {
      return res.status(400).json({ hata: 'kullanici_kodu ve yeni_parola zorunlu.' });
    }
    const r = await pool.query(`SELECT * FROM kisiler WHERE kullanici_kodu=$1`, [kullanici_kodu]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kullanıcı yok.' });
    if (r.rows[0].parola_hash && !dogrulaParola(parola || '', r.rows[0].parola_hash)) {
      return res.status(403).json({ hata: 'Mevcut parola hatalı.' });
    }
    await pool.query(`UPDATE kisiler SET parola_hash=$1 WHERE id=$2`, [hashParola(yeni_parola), r.rows[0].id]);
    res.json({ ok: true, kullanici_kodu });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.hashParola = hashParola;
