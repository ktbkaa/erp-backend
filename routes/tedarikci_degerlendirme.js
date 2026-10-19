const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.cari_id) {
      params.push(Number(req.query.cari_id));
      where.push(`t.cari_id = $${params.length}`);
    }
    const r = await pool.query(
      `
      SELECT t.*, c.cari_kodu, c.cari_adi
      FROM tedarikci_degerlendirme t
      JOIN cariler c ON c.id = t.cari_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.id DESC
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
    const { cari_id, donem, kalite_puan, teslimat_puan, fiyat_puan, genel_puan, aciklama } = req.body || {};
    if (!cari_id || !donem) return res.status(400).json({ hata: 'cari_id ve donem zorunlu.' });
    const genel =
      genel_puan != null
        ? Number(genel_puan)
        : ((Number(kalite_puan) || 0) + (Number(teslimat_puan) || 0) + (Number(fiyat_puan) || 0)) / 3;
    const r = await pool.query(
      `
      INSERT INTO tedarikci_degerlendirme
        (cari_id, donem, kalite_puan, teslimat_puan, fiyat_puan, genel_puan, aciklama)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [cari_id, donem, kalite_puan, teslimat_puan, fiyat_puan, genel, aciklama || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
