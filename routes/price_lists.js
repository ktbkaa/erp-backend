const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { fiyatBul } = require('../src/services/fiyatListeService');

async function getir(id) {
  const l = await pool.query(`SELECT * FROM price_lists WHERE id=$1`, [id]);
  if (!l.rows[0]) return null;
  const satirlar = await pool.query(
    `
    SELECT s.*, st.item_code, st.item_name, c.partner_code
    FROM price_list_lines s
    JOIN items st ON st.id = s.item_id
    LEFT JOIN partners c ON c.id = s.partner_id
    WHERE s.list_id=$1
    ORDER BY s.id
    `,
    [id]
  );
  return { ...l.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

router.get('/fiyat', async (req, res, next) => {
  try {
    const stokId = Number(req.query.item_id);
    if (!stokId) return res.status(400).json({ hata: 'item_id zorunlu.' });
    const fiyat = await fiyatBul(pool, {
      stokId,
      cariId: req.query.partner_id ? Number(req.query.partner_id) : null,
      quantity: req.query.quantity != null ? Number(req.query.quantity) : 1,
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
    const liste = await pool.query(`SELECT id FROM price_lists ORDER BY id DESC`);
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
    const { list_name, currency_code, start_date, end_date, is_active } = req.body || {};
    const satirlar = req.body.satirlar || req.body.kalemler || [];
    if (!list_name) return res.status(400).json({ hata: 'list_name zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      const kod = req.body.list_code || (await sonrakiBelgeNo(client, 'FIYAT_LISTE'));
      const r = await client.query(
        `
        INSERT INTO price_lists (list_code, list_name, currency_code, start_date, end_date, is_active)
        VALUES ($1,$2,COALESCE($3,'TRY'),$4,$5,COALESCE($6,TRUE))
        RETURNING id
        `,
        [kod, list_name, currency_code, start_date || null, end_date || null, is_active]
      );
      const listeId = r.rows[0].id;
      for (const s of satirlar) {
        if (!s.item_id || s.unit_price == null) continue;
        await client.query(
          `
          INSERT INTO price_list_lines
            (list_id, item_id, partner_id, min_quantity, unit_price, discount_rate)
          VALUES ($1,$2,$3,COALESCE($4,0),$5,COALESCE($6,0))
          `,
          [listeId, s.item_id, s.partner_id || null, s.min_quantity, s.unit_price, s.discount_rate]
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
      const mevcut = await client.query(`SELECT id FROM price_lists WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!mevcut.rows[0]) throw Object.assign(new Error('Liste bulunamadı.'), { status: 404 });
      const sets = [];
      const params = [req.params.id];
      for (const k of ['list_name', 'currency_code', 'start_date', 'end_date', 'is_active']) {
        if (req.body[k] !== undefined) {
          params.push(req.body[k]);
          sets.push(`${k}=$${params.length}`);
        }
      }
      if (sets.length) {
        await client.query(`UPDATE price_lists SET ${sets.join(',')} WHERE id=$1`, params);
      }
      if (Array.isArray(satirlar)) {
        await client.query(`DELETE FROM price_list_lines WHERE list_id=$1`, [req.params.id]);
        for (const s of satirlar) {
          if (!s.item_id || s.unit_price == null) continue;
          await client.query(
            `
            INSERT INTO price_list_lines
              (list_id, item_id, partner_id, min_quantity, unit_price, discount_rate)
            VALUES ($1,$2,$3,COALESCE($4,0),$5,COALESCE($6,0))
            `,
            [req.params.id, s.item_id, s.partner_id || null, s.min_quantity, s.unit_price, s.discount_rate]
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
    const r = await pool.query(`DELETE FROM price_lists WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Liste bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
