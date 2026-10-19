const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    const where = [];
    if (req.query.emir_id) {
      params.push(Number(req.query.emir_id));
      where.push(`u.emir_id = $${params.length}`);
    }
    if (req.query.durum) {
      params.push(req.query.durum);
      where.push(`u.durum = $${params.length}`);
    }
    const sql = `
      SELECT u.*, e.emir_no, e.yon, s.stok_kodu, s.stok_adi,
             r.neden_kodu AS ret_kodu, r.neden_adi AS ret_adi
      FROM kk_uygunsuzluklar u
      JOIN kk_emirleri e ON e.id = u.emir_id
      LEFT JOIN stoklar s ON s.id = e.stok_id
      LEFT JOIN kk_ret_nedenleri r ON r.id = u.ret_neden_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY u.id DESC
    `;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { emir_id, ret_neden_id, miktar, aciklama, duzeltici_faaliyet } = req.body || {};
    if (!emir_id) return res.status(400).json({ hata: 'emir_id zorunlu.' });
    const r = await pool.query(
      `INSERT INTO kk_uygunsuzluklar (emir_id, ret_neden_id, miktar, aciklama, duzeltici_faaliyet, durum)
       VALUES ($1,$2,$3,$4,$5,'Acik') RETURNING *`,
      [emir_id, ret_neden_id || null, miktar || null, aciklama || null, duzeltici_faaliyet || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { ret_neden_id, miktar, aciklama, duzeltici_faaliyet, durum } = req.body || {};
    const r = await pool.query(
      `UPDATE kk_uygunsuzluklar SET
         ret_neden_id = COALESCE($2, ret_neden_id),
         miktar = COALESCE($3, miktar),
         aciklama = COALESCE($4, aciklama),
         duzeltici_faaliyet = COALESCE($5, duzeltici_faaliyet),
         durum = COALESCE($6, durum)
       WHERE id=$1 RETURNING *`,
      [req.params.id, ret_neden_id, miktar, aciklama, duzeltici_faaliyet, durum]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Uygunsuzluk bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
