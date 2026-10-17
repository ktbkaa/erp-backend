const express = require('express');
const router = express.Router();
const pool = require('../db');
const { hashParola } = require('../src/utils/parola');

const PUBLIC_COLS = `
  id, ad, soyad, eposta, telefon, rol, kayit_tarihi,
  kullanici_kodu, kullanici_adi, aktif, grup_kodu, son_giris_at,
  (parola_hash IS NOT NULL) AS parola_var
`;

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

router.get('/', async (req, res) => {
  try {
    const sonuc = await pool.query(
      `SELECT ${PUBLIC_COLS} FROM kisiler ORDER BY id DESC`
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
    res.json(sanitizeRow(sonuc.rows[0]));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      ad, soyad, eposta, telefon, rol,
      kullanici_kodu, kullanici_adi, aktif, grup_kodu,
      sifre, parola, password,
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

    const sonuc = await pool.query(
      `
      INSERT INTO kisiler (
        ad, soyad, eposta, telefon, rol,
        kullanici_kodu, kullanici_adi, aktif, grup_kodu, parola_hash
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,TRUE),$9,$10)
      RETURNING ${PUBLIC_COLS}
      `,
      [
        ad,
        soyad,
        eposta || null,
        telefon || null,
        rol || 'Personel',
        kod,
        loginAdi || kod,
        aktif,
        grup_kodu || null,
        hash,
      ]
    );
    res.status(201).json(sanitizeRow(sonuc.rows[0]));
  } catch (err) {
    console.error('Kişi kayıt hatası:', err);
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu kullanıcı adı / kod zaten kayıtlı.', detay: err.detail });
    }
    res.status(500).json({ hata: 'Kişi eklenirken bir pürüz çıktı.', detay: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      ad, soyad, eposta, telefon, rol,
      kullanici_kodu, kullanici_adi, aktif, grup_kodu,
      sifre, parola, password,
    } = req.body;

    const loginAdi = kullanici_adi !== undefined ? cleanLoginName(kullanici_adi) : undefined;
    const kod = kullanici_kodu !== undefined ? cleanLoginName(kullanici_kodu) : undefined;
    const plain = sifre || parola || password;
    const hash = plain ? hashParola(plain) : null;

    const sonuc = await pool.query(
      `
      UPDATE kisiler SET
        ad = COALESCE($2, ad),
        soyad = COALESCE($3, soyad),
        eposta = COALESCE($4, eposta),
        telefon = COALESCE($5, telefon),
        rol = COALESCE($6, rol),
        kullanici_kodu = COALESCE($7, kullanici_kodu),
        kullanici_adi = COALESCE($8, kullanici_adi),
        aktif = COALESCE($9, aktif),
        grup_kodu = COALESCE($10, grup_kodu),
        parola_hash = COALESCE($11, parola_hash)
      WHERE id=$1
      RETURNING ${PUBLIC_COLS}
      `,
      [
        req.params.id,
        ad, soyad, eposta, telefon, rol,
        kod, loginAdi, aktif, grup_kodu, hash,
      ]
    );
    if (!sonuc.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    res.json(sanitizeRow(sonuc.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ hata: 'Bu kullanıcı adı / kod zaten kayıtlı.', detay: err.detail });
    }
    res.status(500).json({ hata: err.message });
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
