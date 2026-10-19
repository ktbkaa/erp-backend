const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.stok_id) {
      params.push(Number(req.query.stok_id));
      where.push(`sr.stok_id = $${params.length}`);
    }
    if (req.query.durum) {
      params.push(req.query.durum);
      where.push(`sr.durum = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT sr.*, s.stok_kodu, s.stok_adi, d.depo_kodu, p.parti_no
      FROM stok_serileri sr
      JOIN stoklar s ON s.id = sr.stok_id
      LEFT JOIN depolar d ON d.id = sr.depo_id
      LEFT JOIN stok_partileri p ON p.id = sr.parti_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY sr.id DESC
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { stok_id, seri_no, parti_id, depo_id, durum } = req.body || {};
    if (!stok_id) return res.status(400).json({ hata: 'stok_id zorunlu.' });
    const no = seri_no || (await sonrakiBelgeNo(pool, 'SERI'));
    const r = await pool.query(
      `
      INSERT INTO stok_serileri (seri_no, stok_id, parti_id, depo_id, durum)
      VALUES ($1,$2,$3,$4,COALESCE($5,'Depoda'))
      RETURNING *
      `,
      [no, stok_id, parti_id || null, depo_id || null, durum]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { durum, depo_id, parti_id } = req.body || {};
    const r = await pool.query(
      `
      UPDATE stok_serileri SET
        durum = COALESCE($2, durum),
        depo_id = COALESCE($3, depo_id),
        parti_id = COALESCE($4, parti_id)
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, durum, depo_id, parti_id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Seri bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/toplu', async (req, res, next) => {
  try {
    const { stok_id, adet, depo_id, parti_id } = req.body || {};
    const n = Math.min(Number(adet) || 0, 200);
    if (!stok_id || n < 1) return res.status(400).json({ hata: 'stok_id ve adet zorunlu.' });
    const olusan = await withTransaction(pool, async (client) => {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const no = await sonrakiBelgeNo(client, 'SERI');
        const r = await client.query(
          `INSERT INTO stok_serileri (seri_no, stok_id, parti_id, depo_id, durum)
           VALUES ($1,$2,$3,$4,'Depoda') RETURNING *`,
          [no, stok_id, parti_id || null, depo_id || null]
        );
        rows.push(r.rows[0]);
      }
      return rows;
    });
    res.status(201).json(olusan);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
