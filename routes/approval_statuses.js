const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const onlyAktif = req.query.is_active === 'true';
    const r = await pool.query(
      `SELECT * FROM approval_statuses ${onlyAktif ? 'WHERE is_active = TRUE' : ''} ORDER BY line_no, status_code`,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM approval_statuses WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Durum bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { status_code, status_name, line_no, nihai, olumlu, is_active } = req.body;
    if (!status_code || !status_name) {
      return res.status(400).json({ hata: 'status_code ve status_name zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO approval_statuses (status_code, status_name, line_no, nihai, olumlu, is_active)
      VALUES ($1,$2,COALESCE($3,10),COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,TRUE))
      RETURNING *
      `,
      [status_code, status_name, line_no, nihai, olumlu, is_active],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status_name, line_no, nihai, olumlu, is_active } = req.body;
    const r = await pool.query(
      `
      UPDATE approval_statuses SET
        status_name = COALESCE($2, status_name),
        line_no = COALESCE($3, line_no),
        nihai = COALESCE($4, nihai),
        olumlu = COALESCE($5, olumlu),
        is_active = COALESCE($6, is_active)
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, status_name || null, line_no ?? null, nihai, olumlu, is_active],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Durum bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_statuses WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Durum bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
