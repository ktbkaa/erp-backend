const express = require('express');
const router = express.Router();
const pool = require('../db');
const { hashParola } = require('../src/utils/parola');

const PUBLIC_COLS = `
  id, ad, soyad, eposta, telefon, rol, unvan, kayit_tarihi,
  kullanici_kodu, kullanici_adi, aktif, grup_kodu, son_giris_at,
  profil_resmi,
  (parola_hash IS NOT NULL) AS parola_var
`;

const YETKI_ACTIONS = ['yeni', 'incele', 'duzelt', 'kopyala', 'sil'];

function cleanLoginName(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function sanitizeRow(row) {
  if (!row) return row;
  const out = { ...row };
  delete out.parola_hash;
  delete out.refresh_token_hash;
  if (out.parola_var === undefined && row.parola_hash !== undefined) {
    out.parola_var = Boolean(row.parola_hash);
  }
  return out;
}

function normYetkiRow(y) {
  if (!y || !y.ekran_id) return null;
  const actions = {};
  YETKI_ACTIONS.forEach((a) => { actions[a] = Boolean(y[a]); });
  if (y.hepsi) YETKI_ACTIONS.forEach((a) => { actions[a] = true; });
  const erisim = y.erisim === false ? false : true;
  if (!erisim) return null;
  return {
    ekran_id: String(y.ekran_id),
    erisim: true,
    ...actions,
    hepsi: YETKI_ACTIONS.every((a) => actions[a]),
  };
}

async function loadYetkiler(client, kisiId) {
  const r = await client.query(
    `SELECT ekran_id, erisim, yeni, incele, duzelt, kopyala, sil
     FROM kullanici_ekran_yetkileri
     WHERE kisi_id=$1
     ORDER BY ekran_id`,
    [kisiId]
  );
  return r.rows.map((row) => ({
    ...row,
    hepsi: YETKI_ACTIONS.every((a) => row[a]),
  }));
}

async function saveYetkiler(client, kisiId, yetkiler) {
  await client.query(`DELETE FROM kullanici_ekran_yetkileri WHERE kisi_id=$1`, [kisiId]);
  if (!Array.isArray(yetkiler)) return;
  for (const raw of yetkiler) {
    const y = normYetkiRow(raw);
    if (!y) continue;
    await client.query(
      `INSERT INTO kullanici_ekran_yetkileri
        (kisi_id, ekran_id, erisim, yeni, incele, duzelt, kopyala, sil)
       VALUES ($1,$2,TRUE,$3,$4,$5,$6,$7)
       ON CONFLICT (kisi_id, ekran_id) DO UPDATE SET
         erisim=EXCLUDED.erisim,
         yeni=EXCLUDED.yeni, incele=EXCLUDED.incele,
         duzelt=EXCLUDED.duzelt, kopyala=EXCLUDED.kopyala, sil=EXCLUDED.sil`,
      [kisiId, y.ekran_id, y.yeni, y.incele, y.duzelt, y.kopyala, y.sil]
    );
  }
}

async function hydrateUser(row) {
  if (!row) return null;
  const out = sanitizeRow(row);
  out.yetkiler = await loadYetkiler(pool, row.id);
  return out;
}

function clipProfilResmi(v) {
  if (v == null || v === '') return null;
  const s = String(v);
  // ~350KB base64 üstü reddet
  if (s.length > 500000) {
    const err = new Error('Profil resmi çok büyük (max ~350KB).');
    err.status = 400;
    throw err;
  }
  if (!s.startsWith('data:image/')) {
    const err = new Error('Profil resmi data:image/... formatında olmalı.');
    err.status = 400;
    throw err;
  }
  return s;
}

router.get('/', async (req, res) => {
  try {
    // Liste: profil_resmi gönderme (ağır); yetki sayısı yeterli
    const sonuc = await pool.query(
      `SELECT id, ad, soyad, eposta, telefon, rol, unvan, kayit_tarihi,
              kullanici_kodu, kullanici_adi, aktif, grup_kodu, son_giris_at,
              (parola_hash IS NOT NULL) AS parola_var,
              (profil_resmi IS NOT NULL AND profil_resmi <> '') AS profil_var
       FROM kisiler ORDER BY id DESC`
    );
    res.json(sonuc.rows.map(sanitizeRow));
  } catch (err) {
    console.error('Kişi listeleme hatası:', err);
    res.status(500).json({ hata: 'Kişiler çekilirken bir pürüz çıktı.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const sonuc = await pool.query(
      `SELECT ${PUBLIC_COLS} FROM kisiler WHERE id=$1`,
      [req.params.id]
    );
    if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    res.json(await hydrateUser(sonuc.rows[0]));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      ad, soyad, eposta, telefon, rol, unvan,
      kullanici_kodu, kullanici_adi, aktif, grup_kodu,
      sifre, parola, password, profil_resmi, yetkiler,
    } = req.body;
    if (!ad || !soyad) {
      return res.status(400).json({ hata: 'ad ve soyad zorunludur.' });
    }

    const loginAdi = cleanLoginName(kullanici_adi) || cleanLoginName(kullanici_kodu);
    const kod = cleanLoginName(kullanici_kodu) || loginAdi;
    if (!kod) {
      return res.status(400).json({ hata: 'kullanici_adi (veya kullanici_kodu) zorunludur.' });
    }

    const plain = sifre || parola || password || null;
    const hash = plain ? hashParola(plain) : null;
    const avatar = profil_resmi === undefined ? null : clipProfilResmi(profil_resmi);

    await client.query('BEGIN');
    const sonuc = await client.query(
      `
      INSERT INTO kisiler (
        ad, soyad, eposta, telefon, rol, unvan,
        kullanici_kodu, kullanici_adi, aktif, grup_kodu, parola_hash, profil_resmi
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,TRUE),$10,$11,$12)
      RETURNING ${PUBLIC_COLS}
      `,
      [
        ad, soyad, eposta || null, telefon || null,
        rol || 'Personel', unvan || null,
        kod, loginAdi || kod, aktif, grup_kodu || null, hash, avatar,
      ]
    );
    const row = sonuc.rows[0];
    await saveYetkiler(client, row.id, yetkiler);
    await client.query('COMMIT');
    const out = sanitizeRow(row);
    out.yetkiler = await loadYetkiler(pool, row.id);
    res.status(201).json(out);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Kişi kayıt hatası:', err);
    if (err.status) return res.status(err.status).json({ hata: err.message });
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu kullanıcı adı / kod zaten kayıtlı.', detay: err.detail });
    }
    res.status(500).json({ hata: 'Kişi eklenirken bir pürüz çıktı.', detay: err.message });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      ad, soyad, eposta, telefon, rol, unvan,
      kullanici_kodu, kullanici_adi, aktif, grup_kodu,
      sifre, parola, password, profil_resmi, yetkiler,
    } = req.body;

    const loginAdi = kullanici_adi !== undefined ? cleanLoginName(kullanici_adi) : undefined;
    const kod = kullanici_kodu !== undefined ? cleanLoginName(kullanici_kodu) : undefined;
    const plain = sifre || parola || password;
    const hash = plain ? hashParola(plain) : null;
    const touchAvatar = profil_resmi !== undefined;
    const avatarVal = !touchAvatar
      ? null
      : (profil_resmi === null || profil_resmi === '' ? null : clipProfilResmi(profil_resmi));

    await client.query('BEGIN');
    const sonuc = await client.query(
      `
      UPDATE kisiler SET
        ad = COALESCE($2, ad),
        soyad = COALESCE($3, soyad),
        eposta = COALESCE($4, eposta),
        telefon = COALESCE($5, telefon),
        rol = COALESCE($6, rol),
        unvan = COALESCE($7, unvan),
        kullanici_kodu = COALESCE($8, kullanici_kodu),
        kullanici_adi = COALESCE($9, kullanici_adi),
        aktif = COALESCE($10, aktif),
        grup_kodu = COALESCE($11, grup_kodu),
        parola_hash = CASE WHEN $12::text IS NOT NULL THEN $12 ELSE parola_hash END,
        profil_resmi = CASE WHEN $13::boolean THEN $14 ELSE profil_resmi END
      WHERE id=$1
      RETURNING ${PUBLIC_COLS}
      `,
      [
        req.params.id, ad, soyad, eposta, telefon, rol, unvan,
        kod, loginAdi, aktif, grup_kodu,
        hash, touchAvatar, avatarVal,
      ]
    );
    if (!sonuc.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    }
    if (yetkiler !== undefined) {
      await saveYetkiler(client, Number(req.params.id), yetkiler);
    }
    await client.query('COMMIT');
    const out = sanitizeRow(sonuc.rows[0]);
    out.yetkiler = await loadYetkiler(pool, Number(req.params.id));
    res.json(out);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.status) return res.status(err.status).json({ hata: err.message });
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu kullanıcı adı / kod zaten kayıtlı.', detay: err.detail });
    }
    res.status(500).json({ hata: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const sonuc = await pool.query('DELETE FROM kisiler WHERE id=$1 RETURNING id', [req.params.id]);
    if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
