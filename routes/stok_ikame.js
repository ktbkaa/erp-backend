const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.stok_id) {
      params.push(Number(req.query.stok_id));
      where.push(`i.stok_id = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT i.*,
             s.stok_kodu, s.stok_adi,
             ik.stok_kodu AS ikame_stok_kodu, ik.stok_adi AS ikame_stok_adi
      FROM stok_ikame i
      JOIN stoklar s ON s.id = i.stok_id
      JOIN stoklar ik ON ik.id = i.ikame_stok_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY i.stok_id, i.oncelik, i.id
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
    const { stok_id, ikame_stok_id, oncelik, aciklama } = req.body || {};
    if (!stok_id || !ikame_stok_id) {
      return res.status(400).json({ hata: 'stok_id ve ikame_stok_id zorunlu.' });
    }
    if (Number(stok_id) === Number(ikame_stok_id)) {
      return res.status(400).json({ hata: 'Stok kendi ikamesi olamaz.' });
    }
    const r = await pool.query(
      `
      INSERT INTO stok_ikame (stok_id, ikame_stok_id, oncelik, aciklama)
      VALUES ($1,$2,COALESCE($3,1),$4)
      RETURNING *
      `,
      [stok_id, ikame_stok_id, oncelik, aciklama || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM stok_ikame WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
