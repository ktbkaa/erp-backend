const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
  try {
    const onlyAktif = req.query.is_active === 'true';
    const r = await pool.query(
      `SELECT * FROM approval_message_templates ${onlyAktif ? 'WHERE is_active = TRUE' : ''} ORDER BY template_code`,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM approval_message_templates WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let { template_code, template_name, olay, konu, govde, is_active } = req.body;
    if (!template_name) return res.status(400).json({ hata: 'template_name zorunlu.' });
    if (!template_code) {
      try { template_code = await sonrakiKod(pool, 'ONAY_SABLON'); }
      catch (_) { template_code = `OS${Date.now().toString().slice(-5)}`; }
    }
    const r = await pool.query(
      `
      INSERT INTO approval_message_templates (template_code, template_name, olay, konu, govde, is_active)
      VALUES ($1,$2,COALESCE($3,'Bekleme'),$4,$5,COALESCE($6,TRUE))
      RETURNING *
      `,
      [template_code, template_name, olay, konu || null, govde || null, is_active],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { template_name, olay, konu, govde, is_active } = req.body;
    const r = await pool.query(
      `
      UPDATE approval_message_templates SET
        template_name = COALESCE($2, template_name),
        olay = COALESCE($3, olay),
        konu = COALESCE($4, konu),
        govde = COALESCE($5, govde),
        is_active = COALESCE($6, is_active)
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, template_name || null, olay || null, konu, govde, is_active],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM approval_message_templates WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
