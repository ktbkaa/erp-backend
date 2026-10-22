const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const onlyAktif = req.query.aktif === 'true';
    const r = await pool.query(
      `SELECT * FROM onay_durumlari ${onlyAktif ? 'WHERE aktif = TRUE' : ''} ORDER BY sira_no, durum_kodu`,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM onay_durumlari WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Durum bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { durum_kodu, durum_adi, sira_no, nihai, olumlu, aktif } = req.body;
    if (!durum_kodu || !durum_adi) {
      return res.status(400).json({ hata: 'durum_kodu ve durum_adi zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO onay_durumlari (durum_kodu, durum_adi, sira_no, nihai, olumlu, aktif)
      VALUES ($1,$2,COALESCE($3,10),COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,TRUE))
      RETURNING *
      `,
      [durum_kodu, durum_adi, sira_no, nihai, olumlu, aktif],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { durum_adi, sira_no, nihai, olumlu, aktif } = req.body;
    const r = await pool.query(
      `
      UPDATE onay_durumlari SET
        durum_adi = COALESCE($2, durum_adi),
        sira_no = COALESCE($3, sira_no),
        nihai = COALESCE($4, nihai),
        olumlu = COALESCE($5, olumlu),
        aktif = COALESCE($6, aktif)
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, durum_adi || null, sira_no ?? null, nihai, olumlu, aktif],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Durum bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_durumlari WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Durum bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
