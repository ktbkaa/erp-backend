const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM hesap_belirleme_kurallari ORDER BY id`);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { kural_kodu, belge_tipi, borc_hesap_kodu, alacak_hesap_kodu, aciklama, aktif } = req.body || {};
    if (!kural_kodu || !belge_tipi) {
      return res.status(400).json({ hata: 'kural_kodu ve belge_tipi zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO hesap_belirleme_kurallari
        (kural_kodu, belge_tipi, borc_hesap_kodu, alacak_hesap_kodu, aciklama, aktif)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
      RETURNING *
      `,
      [kural_kodu, belge_tipi, borc_hesap_kodu || null, alacak_hesap_kodu || null, aciklama || null, aktif]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const fields = ['kural_kodu', 'belge_tipi', 'borc_hesap_kodu', 'alacak_hesap_kodu', 'aciklama', 'aktif'];
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
      `UPDATE hesap_belirleme_kurallari SET ${sets.join(',')} WHERE id=$1 RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM hesap_belirleme_kurallari WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
