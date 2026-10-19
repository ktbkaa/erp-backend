const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function getir(id) {
  const r = await pool.query(
    `
    SELECT c.*, u.id AS uygunsuzluk_no, u.aciklama AS uygunsuzluk_aciklama,
           k.kullanici_kodu AS sorumlu_kodu
    FROM kk_capa c
    LEFT JOIN kk_uygunsuzluklar u ON u.id = c.uygunsuzluk_id
    LEFT JOIN kisiler k ON k.id = c.sorumlu_kisi_id
    WHERE c.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.durum) {
      params.push(req.query.durum);
      where.push(`c.durum = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT c.*, u.id AS uygunsuzluk_no
      FROM kk_capa c
      LEFT JOIN kk_uygunsuzluklar u ON u.id = c.uygunsuzluk_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY c.id DESC
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'CAPA bulunamadı.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { baslik, aciklama, uygunsuzluk_id, sorumlu_kisi_id, hedef_tarih, durum } = req.body || {};
    if (!baslik) return res.status(400).json({ hata: 'baslik zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      const no = await sonrakiBelgeNo(client, 'CAPA');
      const r = await client.query(
        `
        INSERT INTO kk_capa (capa_no, uygunsuzluk_id, baslik, aciklama, sorumlu_kisi_id, hedef_tarih, durum)
        VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'Acik'))
        RETURNING id
        `,
        [no, uygunsuzluk_id || null, baslik, aciklama || null, sorumlu_kisi_id || null, hedef_tarih || null, durum]
      );
      return r.rows[0].id;
    });
    res.status(201).json(await getir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const fields = ['baslik', 'aciklama', 'uygunsuzluk_id', 'sorumlu_kisi_id', 'hedef_tarih', 'durum'];
    const sets = [];
    const params = [req.params.id];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        params.push(req.body[f]);
        sets.push(`${f}=$${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ hata: 'Güncellenecek alan yok.' });
    const r = await pool.query(
      `UPDATE kk_capa SET ${sets.join(',')} WHERE id=$1 RETURNING id`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'CAPA bulunamadı.' });
    res.json(await getir(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
