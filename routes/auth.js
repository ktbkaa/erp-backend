const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');

function hashParola(parola, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(parola), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function dogrulaParola(parola, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(String(parola), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

/** POST /auth/login { kullanici_kodu, parola } */
router.post('/login', async (req, res, next) => {
  try {
    const { kullanici_kodu, parola } = req.body || {};
    if (!kullanici_kodu) return res.status(400).json({ hata: 'kullanici_kodu zorunlu.' });
    const r = await pool.query(
      `SELECT k.*, g.satinalma_onay, g.satinalma_talep, g.kalite_kontrol,
              g.modul_yetkileri, g.depo_yetkileri, g.grup_adi
       FROM kisiler k
       LEFT JOIN kullanici_gruplari g ON g.grup_kodu = k.grup_kodu AND g.aktif = TRUE
       WHERE k.kullanici_kodu = $1`,
      [kullanici_kodu]
    );
    const u = r.rows[0];
    if (!u || u.aktif === false) return res.status(401).json({ hata: 'Kullanıcı bulunamadı veya pasif.' });

    if (u.parola_hash) {
      if (!parola || !dogrulaParola(parola, u.parola_hash)) {
        return res.status(401).json({ hata: 'Parola hatalı.' });
      }
    }
    // parola_hash yoksa (geçiş dönemi) yalnızca kod ile giriş — AUTH_ZORUNLU=Evet ise engelle
    if (!u.parola_hash) {
      const p = await pool.query(
        `SELECT deger FROM sistem_parametreleri WHERE parametre_kodu='AUTH_ZORUNLU' LIMIT 1`
      );
      if (String(p.rows[0]?.deger || '').toLowerCase() === 'evet' && !parola) {
        return res.status(401).json({ hata: 'Parola tanımlı değil; yönetici parola atamalı.' });
      }
    }

    await pool.query(`UPDATE kisiler SET son_giris_at = NOW() WHERE id = $1`, [u.id]);
    res.json({
      kullanici_kodu: u.kullanici_kodu,
      ad: u.ad,
      soyad: u.soyad,
      grup_kodu: u.grup_kodu,
      grup_adi: u.grup_adi,
      satinalma_onay: u.satinalma_onay,
      satinalma_talep: u.satinalma_talep,
      kalite_kontrol: u.kalite_kontrol,
      modul_yetkileri: safeJson(u.modul_yetkileri, ['*']),
      depo_yetkileri: safeJson(u.depo_yetkileri, ['*']),
      token_tipi: 'header',
      not: 'İsteklerde X-Kullanici-Kodu gönderin (JWT sonraki faz).',
    });
  } catch (err) {
    next(err);
  }
});

/** POST /auth/parola-ayarla { kullanici_kodu, parola, yeni_parola? } — admin veya kendi */
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
    const hash = hashParola(yeni_parola);
    await pool.query(`UPDATE kisiler SET parola_hash=$1 WHERE id=$2`, [hash, r.rows[0].id]);
    res.json({ ok: true, kullanici_kodu });
  } catch (err) {
    next(err);
  }
});

function safeJson(v, fallback) {
  try {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return JSON.parse(v);
  } catch (_) { /* ignore */ }
  return fallback;
}

module.exports = router;
module.exports.hashParola = hashParola;
