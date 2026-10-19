const pool = require('../../db');
const { verifyToken } = require('../utils/jwt');
const { parametreAl, kullaniciGetir, reqKullaniciKodu } = require('../utils/yetki');

/**
 * JWT veya X-Kullanici-Kodu ile kimlik.
 * AUTH_ZORUNLU=Evet ise kimlik zorunlu (health/static hariç).
 */
async function authOptional(req, res, next) {
  try {
    const hdr = req.get('authorization') || '';
    const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null;
    if (bearer) {
      try {
        const payload = verifyToken(bearer);
        if (payload?.kullanici_kodu && payload.typ !== 'refresh') {
          req.user = await kullaniciGetir(pool, payload.kullanici_kodu);
          req.auth = { tip: 'jwt', payload };
        }
      } catch (_) {
        /* geçersiz token — zorunluluk aşağıda */
      }
    }
    const zorunlu = String(await parametreAl(pool, 'AUTH_ZORUNLU', 'Hayir')).toLowerCase() === 'evet';
    // AUTH_ZORUNLU iken yalnız JWT; header spoof kapalı
    if (!req.user && !zorunlu) {
      const kod = reqKullaniciKodu(req);
      if (kod) {
        req.user = await kullaniciGetir(pool, kod);
        req.auth = { tip: 'header', kullanici_kodu: kod };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

async function authRequired(req, res, next) {
  // health / auth login her zaman açık
  const p = req.path || '';
  if (p === '/health' || p.startsWith('/auth/')) return next();
  const zorunlu = String(await parametreAl(pool, 'AUTH_ZORUNLU', 'Hayir')).toLowerCase() === 'evet';
  if (!req.user && zorunlu) {
    return res.status(401).json({ hata: 'Kimlik doğrulama gerekli (Bearer JWT).' });
  }
  // Header-only spoof engeli (AUTH_ZORUNLU)
  if (zorunlu && req.auth?.tip === 'header') {
    return res.status(403).json({ hata: 'AUTH_ZORUNLU açıkken X-Kullanici-Kodu yeterli değil; JWT gerekli.' });
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

async function assertDepoYetki(req, depoId) {
  if (!req.user || !depoId) return true;
  const list = parseJsonArr(req.user.depo_yetkileri, ['*']);
  if (list.includes('*')) {
    // satır bazlı kullanıcı_depo varsa onu da kontrol et
    const r = await pool.query(
      `SELECT 1 FROM kullanici_depo WHERE kisi_id=$1 LIMIT 1`,
      [req.user.id]
    );
    if (!r.rows[0]) return true;
  }
  if (list.includes('*') === false) {
    // depo kodu veya id
    const d = await pool.query(`SELECT id, depo_kodu FROM depolar WHERE id=$1`, [depoId]);
    const kod = d.rows[0]?.depo_kodu;
    if (list.includes(String(depoId)) || (kod && list.includes(kod))) return true;
  }
  const row = await pool.query(
    `SELECT 1 FROM kullanici_depo WHERE kisi_id=$1 AND depo_id=$2`,
    [req.user.id, depoId]
  );
  if (row.rows[0]) return true;
  if (list.includes('*')) return true;
  const err = new Error(`Depo yetkisi yok (depo_id=${depoId}).`);
  err.status = 403;
  throw err;
}

function assertModulYetki(req, modulId) {
  if (!req.user) return true;
  const list = parseJsonArr(req.user.modul_yetkileri, ['*']);
  if (list.includes('*') || list.includes(modulId)) return true;
  const err = new Error(`Modül yetkisi yok: ${modulId}`);
  err.status = 403;
  throw err;
}

module.exports = {
  authOptional,
  authRequired,
  assertDepoYetki,
  assertModulYetki,
  parseJsonArr,
};
