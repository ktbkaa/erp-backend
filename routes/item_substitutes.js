const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.item_id) {
      params.push(Number(req.query.item_id));
      where.push(`i.item_id = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT i.*,
             s.item_code, s.item_name,
             ik.item_code AS ikame_stok_kodu, ik.item_name AS ikame_stok_adi
      FROM item_substitutes i
      JOIN items s ON s.id = i.item_id
      JOIN items ik ON ik.id = i.ikame_item_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY i.item_id, i.priority, i.id
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
    const { item_id, ikame_item_id, priority, description } = req.body || {};
    if (!item_id || !ikame_item_id) {
      return res.status(400).json({ hata: 'item_id ve ikame_item_id zorunlu.' });
    }
    if (Number(item_id) === Number(ikame_item_id)) {
      return res.status(400).json({ hata: 'Stok kendi ikamesi olamaz.' });
    }
    const r = await pool.query(
      `
      INSERT INTO item_substitutes (item_id, ikame_item_id, priority, description)
      VALUES ($1,$2,COALESCE($3,1),$4)
      RETURNING *
      `,
      [item_id, ikame_item_id, priority, description || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM item_substitutes WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
