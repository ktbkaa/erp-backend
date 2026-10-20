const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function rolGetir(id) {
  const r = await pool.query('SELECT * FROM onay_rolleri WHERE id=$1', [id]);
  if (!r.rows[0]) return null;
  const uyeler = await pool.query(
    `
    SELECT u.*,
           k.kullanici_kodu, k.kullanici_adi,
           CONCAT(COALESCE(k.ad,''), ' ', COALESCE(k.soyad,'')) AS kisi_adi,
           g.grup_adi
    FROM onay_rol_uyeleri u
    LEFT JOIN kisiler k ON k.id = u.kisi_id
    LEFT JOIN kullanici_gruplari g ON g.grup_kodu = u.grup_kodu
    WHERE u.rol_id = $1
    ORDER BY u.id
    `,
    [id],
  );
  return { ...r.rows[0], uyeler: uyeler.rows };
}

router.get('/', async (_req, res) => {
  try {
    const liste = await pool.query('SELECT id FROM onay_rolleri ORDER BY rol_kodu');
    const out = [];
    for (const row of liste.rows) out.push(await rolGetir(row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await rolGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Rol bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

async function kaydetUyeler(client, rolId, uyeler) {
  await client.query('DELETE FROM onay_rol_uyeleri WHERE rol_id=$1', [rolId]);
  if (!Array.isArray(uyeler)) return;
  for (const u of uyeler) {
    if (!u || (!u.kisi_id && !u.grup_kodu)) continue;
    await client.query(
      `
      INSERT INTO onay_rol_uyeleri (rol_id, kisi_id, grup_kodu, aktif)
      VALUES ($1,$2,$3,COALESCE($4,TRUE))
      `,
      [rolId, u.kisi_id || null, u.grup_kodu || null, u.aktif],
    );
  }
}

router.post('/', async (req, res) => {
  try {
    const { rol_kodu, rol_adi, aciklama, aktif, uyeler } = req.body;
    if (!rol_adi) return res.status(400).json({ hata: 'rol_adi zorunlu.' });
    const row = await withTransaction(pool, async (client) => {
      let kod = rol_kodu;
      if (!kod) {
        try { kod = await sonrakiKod(client, 'ONAY_ROL'); }
        catch (_) { kod = `OY${Date.now().toString().slice(-5)}`; }
      }
      const ins = await client.query(
        `
        INSERT INTO onay_rolleri (rol_kodu, rol_adi, aciklama, aktif)
        VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING id
        `,
        [kod, rol_adi, aciklama || null, aktif],
      );
      await kaydetUyeler(client, ins.rows[0].id, uyeler);
      return ins.rows[0].id;
    });
    res.status(201).json(await rolGetir(row));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { rol_adi, aciklama, aktif, uyeler } = req.body;
    await withTransaction(pool, async (client) => {
      const r = await client.query(
        `
        UPDATE onay_rolleri SET
          rol_adi = COALESCE($2, rol_adi),
          aciklama = COALESCE($3, aciklama),
          aktif = COALESCE($4, aktif)
        WHERE id=$1 RETURNING id
        `,
        [req.params.id, rol_adi || null, aciklama, aktif],
      );
      if (!r.rows[0]) {
        const err = new Error('Rol bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (uyeler !== undefined) await kaydetUyeler(client, req.params.id, uyeler);
    });
    res.json(await rolGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_rolleri WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Rol bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
