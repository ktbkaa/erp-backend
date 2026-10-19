const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { fiyatBul } = require('../src/services/fiyatListeService');

async function getir(id) {
  const l = await pool.query(`SELECT * FROM fiyat_listeleri WHERE id=$1`, [id]);
  if (!l.rows[0]) return null;
  const satirlar = await pool.query(
    `
    SELECT s.*, st.stok_kodu, st.stok_adi, c.cari_kodu
    FROM fiyat_liste_satirlari s
    JOIN stoklar st ON st.id = s.stok_id
    LEFT JOIN cariler c ON c.id = s.cari_id
    WHERE s.liste_id=$1
    ORDER BY s.id
    `,
    [id]
  );
  return { ...l.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

router.get('/fiyat', async (req, res, next) => {
  try {
    const stokId = Number(req.query.stok_id);
    if (!stokId) return res.status(400).json({ hata: 'stok_id zorunlu.' });
    const fiyat = await fiyatBul(pool, {
      stokId,
      cariId: req.query.cari_id ? Number(req.query.cari_id) : null,
      miktar: req.query.miktar != null ? Number(req.query.miktar) : 1,
      tarih: req.query.tarih || null,
    });
    if (!fiyat) return res.status(404).json({ hata: 'Fiyat bulunamadı.' });
    res.json(fiyat);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const liste = await pool.query(`SELECT id FROM fiyat_listeleri ORDER BY id DESC`);
    const out = [];
    for (const r of liste.rows) out.push(await getir(r.id));
    res.json(out);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Liste bulunamadı.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { liste_adi, para_birimi, baslangic_tarihi, bitis_tarihi, aktif } = req.body || {};
    const satirlar = req.body.satirlar || req.body.kalemler || [];
    if (!liste_adi) return res.status(400).json({ hata: 'liste_adi zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      const kod = req.body.liste_kodu || (await sonrakiBelgeNo(client, 'FIYAT_LISTE'));
      const r = await client.query(
        `
        INSERT INTO fiyat_listeleri (liste_kodu, liste_adi, para_birimi, baslangic_tarihi, bitis_tarihi, aktif)
        VALUES ($1,$2,COALESCE($3,'TRY'),$4,$5,COALESCE($6,TRUE))
        RETURNING id
        `,
        [kod, liste_adi, para_birimi, baslangic_tarihi || null, bitis_tarihi || null, aktif]
      );
      const listeId = r.rows[0].id;
      for (const s of satirlar) {
        if (!s.stok_id || s.birim_fiyat == null) continue;
        await client.query(
          `
          INSERT INTO fiyat_liste_satirlari
            (liste_id, stok_id, cari_id, min_miktar, birim_fiyat, iskonto_oran)
          VALUES ($1,$2,$3,COALESCE($4,0),$5,COALESCE($6,0))
          `,
          [listeId, s.stok_id, s.cari_id || null, s.min_miktar, s.birim_fiyat, s.iskonto_oran]
        );
      }
      return listeId;
    });
    res.status(201).json(await getir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const satirlar = req.body.satirlar || req.body.kalemler;
    await withTransaction(pool, async (client) => {
      const mevcut = await client.query(`SELECT id FROM fiyat_listeleri WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!mevcut.rows[0]) throw Object.assign(new Error('Liste bulunamadı.'), { status: 404 });
      const sets = [];
      const params = [req.params.id];
      for (const k of ['liste_adi', 'para_birimi', 'baslangic_tarihi', 'bitis_tarihi', 'aktif']) {
        if (req.body[k] !== undefined) {
          params.push(req.body[k]);
          sets.push(`${k}=$${params.length}`);
        }
      }
      if (sets.length) {
        await client.query(`UPDATE fiyat_listeleri SET ${sets.join(',')} WHERE id=$1`, params);
      }
      if (Array.isArray(satirlar)) {
        await client.query(`DELETE FROM fiyat_liste_satirlari WHERE liste_id=$1`, [req.params.id]);
        for (const s of satirlar) {
          if (!s.stok_id || s.birim_fiyat == null) continue;
          await client.query(
            `
            INSERT INTO fiyat_liste_satirlari
              (liste_id, stok_id, cari_id, min_miktar, birim_fiyat, iskonto_oran)
            VALUES ($1,$2,$3,COALESCE($4,0),$5,COALESCE($6,0))
            `,
            [req.params.id, s.stok_id, s.cari_id || null, s.min_miktar, s.birim_fiyat, s.iskonto_oran]
          );
        }
      }
    });
    res.json(await getir(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM fiyat_listeleri WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Liste bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
