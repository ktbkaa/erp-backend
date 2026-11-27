const express = require('express');
const router = express.Router();
const pool = require('../db');
const { hashParola } = require('../src/utils/parola');

const PUBLIC_COLS = `
  id, first_name, last_name, eposta, telefon, role, title, created_at,
  user_code, username, is_active, group_code, son_giris_at,
  profile_image,
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
  if (!y || !y.screen_id) return null;
  const actions = {};
  YETKI_ACTIONS.forEach((a) => { actions[a] = Boolean(y[a]); });
  if (y.hepsi) YETKI_ACTIONS.forEach((a) => { actions[a] = true; });
  const erisim = y.erisim === false ? false : true;
  if (!erisim) return null;
  return {
    screen_id: String(y.screen_id),
    erisim: true,
    ...actions,
    hepsi: YETKI_ACTIONS.every((a) => actions[a]),
  };
}

async function loadYetkiler(client, kisiId) {
  const r = await client.query(
    `SELECT screen_id, erisim, can_create AS yeni, incele, duzelt, kopyala, sil
     FROM user_screen_permissions
     WHERE kisi_id=$1
     ORDER BY screen_id`,
    [kisiId]
  );
  return r.rows.map((row) => ({
    ...row,
    hepsi: YETKI_ACTIONS.every((a) => row[a]),
  }));
}

async function loadFirmaYetkileri(client, kisiId) {
  const r = await client.query(
    `SELECT f.id AS company_id, f.company_code, f.company_name
     FROM user_company_permissions k
     JOIN companies f ON f.id = k.company_id
     WHERE k.kisi_id=$1
     ORDER BY f.company_code`,
    [kisiId]
  );
  return r.rows;
}

async function saveYetkiler(client, kisiId, yetkiler) {
  await client.query(`DELETE FROM user_screen_permissions WHERE kisi_id=$1`, [kisiId]);
  if (!Array.isArray(yetkiler)) return;
  for (const raw of yetkiler) {
    const y = normYetkiRow(raw);
    if (!y) continue;
    await client.query(
      `INSERT INTO user_screen_permissions
        (kisi_id, screen_id, erisim, can_create, incele, duzelt, kopyala, sil)
       VALUES ($1,$2,TRUE,$3,$4,$5,$6,$7)
       ON CONFLICT (kisi_id, screen_id) DO UPDATE SET
         erisim=EXCLUDED.erisim,
         can_create=EXCLUDED.can_create, incele=EXCLUDED.incele,
         duzelt=EXCLUDED.duzelt, kopyala=EXCLUDED.kopyala, sil=EXCLUDED.sil`,
      [kisiId, y.screen_id, y.yeni, y.incele, y.duzelt, y.kopyala, y.sil]
    );
  }
}

async function saveFirmaYetkileri(client, kisiId, companies) {
  await client.query(`DELETE FROM user_company_permissions WHERE kisi_id=$1`, [kisiId]);
  if (!Array.isArray(companies)) return;
  const seen = new Set();
  for (const raw of companies) {
    const id = Number(raw?.company_id ?? raw?.id ?? raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    await client.query(
      `INSERT INTO user_company_permissions (kisi_id, company_id)
       VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [kisiId, id]
    );
  }
}

async function loadSqlPermissions(client, kisiId) {
  const r = await client.query(
    `SELECT can_select, can_insert, can_update, can_delete
     FROM user_sql_permissions WHERE kisi_id=$1`,
    [kisiId]
  ).catch(() => ({ rows: [] }));
  if (r.rows[0]) {
    return {
      can_select: Boolean(r.rows[0].can_select),
      can_insert: Boolean(r.rows[0].can_insert),
      can_update: Boolean(r.rows[0].can_update),
      can_delete: Boolean(r.rows[0].can_delete),
    };
  }
  return { can_select: true, can_insert: false, can_update: false, can_delete: false };
}

async function saveSqlPermissions(client, kisiId, sqlPerms) {
  if (!sqlPerms || typeof sqlPerms !== 'object') return;
  await client.query(
    `INSERT INTO user_sql_permissions (kisi_id, can_select, can_insert, can_update, can_delete)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (kisi_id) DO UPDATE SET
       can_select=EXCLUDED.can_select,
       can_insert=EXCLUDED.can_insert,
       can_update=EXCLUDED.can_update,
       can_delete=EXCLUDED.can_delete`,
    [
      kisiId,
      sqlPerms.can_select !== false,
      Boolean(sqlPerms.can_insert),
      Boolean(sqlPerms.can_update),
      Boolean(sqlPerms.can_delete),
    ]
  );
}

async function hydrateUser(row) {
  if (!row) return null;
  const out = sanitizeRow(row);
  out.yetkiler = await loadYetkiler(pool, row.id);
  out.firma_yetkileri = await loadFirmaYetkileri(pool, row.id);
  out.sql_permissions = await loadSqlPermissions(pool, row.id);
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
    // Liste: profile_image gönderme (ağır); yetki sayısı yeterli
    const result = await pool.query(
      `SELECT id, first_name, last_name, eposta, telefon, role, title, created_at,
              user_code, username, is_active, group_code, son_giris_at,
              (parola_hash IS NOT NULL) AS parola_var,
              (profile_image IS NOT NULL AND profile_image <> '') AS profil_var
       FROM users ORDER BY id DESC`
    );
    res.json(result.rows.map(sanitizeRow));
  } catch (err) {
    console.error('Kişi listeleme hatası:', err);
    res.status(500).json({ hata: 'Kişiler çekilirken bir pürüz çıktı.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${PUBLIC_COLS} FROM users WHERE id=$1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    res.json(await hydrateUser(result.rows[0]));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      first_name, last_name, eposta, telefon, role, title,
      user_code, username, is_active, group_code,
      sifre, parola, password, profile_image, yetkiler, firma_yetkileri, companies,
      sql_permissions,
    } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ hata: 'first_name ve last_name zorunludur.' });
    }

    const loginAdi = cleanLoginName(username) || cleanLoginName(user_code);
    const kod = cleanLoginName(user_code) || loginAdi;
    if (!kod) {
      return res.status(400).json({ hata: 'username (veya user_code) zorunludur.' });
    }

    const plain = sifre || parola || password || null;
    const hash = plain ? hashParola(plain) : null;
    const avatar = profile_image === undefined ? null : clipProfilResmi(profile_image);
    const firmaList = firma_yetkileri !== undefined ? firma_yetkileri : companies;

    await client.query('BEGIN');
    const result = await client.query(
      `
      INSERT INTO users (
        first_name, last_name, eposta, telefon, role, title,
        user_code, username, is_active, group_code, parola_hash, profile_image
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,TRUE),$10,$11,$12)
      RETURNING ${PUBLIC_COLS}
      `,
      [
        first_name, last_name, eposta || null, telefon || null,
        role || 'Personel', title || null,
        kod, loginAdi || kod, is_active, group_code || null, hash, avatar,
      ]
    );
    const row = result.rows[0];
    await saveYetkiler(client, row.id, yetkiler);
    await saveFirmaYetkileri(client, row.id, firmaList);
    if (sql_permissions !== undefined) {
      await saveSqlPermissions(client, row.id, sql_permissions);
    }
    await client.query('COMMIT');
    res.status(201).json(await hydrateUser(row));
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
      first_name, last_name, eposta, telefon, role, title,
      user_code, username, is_active, group_code,
      sifre, parola, password, profile_image, yetkiler, firma_yetkileri, companies,
      sql_permissions,
    } = req.body;

    const loginAdi = username !== undefined ? cleanLoginName(username) : undefined;
    const kod = user_code !== undefined ? cleanLoginName(user_code) : undefined;
    const plain = sifre || parola || password;
    const hash = plain ? hashParola(plain) : null;
    const touchAvatar = profile_image !== undefined;
    const avatarVal = !touchAvatar
      ? null
      : (profile_image === null || profile_image === '' ? null : clipProfilResmi(profile_image));
    const firmaList = firma_yetkileri !== undefined ? firma_yetkileri : companies;

    await client.query('BEGIN');
    const result = await client.query(
      `
      UPDATE users SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        eposta = COALESCE($4, eposta),
        telefon = COALESCE($5, telefon),
        role = COALESCE($6, role),
        title = COALESCE($7, title),
        user_code = COALESCE($8, user_code),
        username = COALESCE($9, username),
        is_active = COALESCE($10, is_active),
        group_code = COALESCE($11, group_code),
        parola_hash = CASE WHEN $12::text IS NOT NULL THEN $12 ELSE parola_hash END,
        profile_image = CASE WHEN $13::boolean THEN $14 ELSE profile_image END
      WHERE id=$1
      RETURNING ${PUBLIC_COLS}
      `,
      [
        req.params.id, first_name, last_name, eposta, telefon, role, title,
        kod, loginAdi, is_active, group_code,
        hash, touchAvatar, avatarVal,
      ]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    }
    if (yetkiler !== undefined) {
      await saveYetkiler(client, Number(req.params.id), yetkiler);
    }
    if (firmaList !== undefined) {
      await saveFirmaYetkileri(client, Number(req.params.id), firmaList);
    }
    if (sql_permissions !== undefined) {
      await saveSqlPermissions(client, Number(req.params.id), sql_permissions);
    }
    await client.query('COMMIT');
    res.json(await hydrateUser(result.rows[0]));
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
    const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'Kullanıcı bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
