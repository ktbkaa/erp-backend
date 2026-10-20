const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/', async (req, res) => {
  try {
    const onlyAktif = req.query.aktif === 'true';
    const r = await pool.query(
      `SELECT * FROM onay_mesaj_sablonlari ${onlyAktif ? 'WHERE aktif = TRUE' : ''} ORDER BY sablon_kodu`,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM onay_mesaj_sablonlari WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    let { sablon_kodu, sablon_adi, olay, konu, govde, aktif } = req.body;
    if (!sablon_adi) return res.status(400).json({ hata: 'sablon_adi zorunlu.' });
    if (!sablon_kodu) {
      try { sablon_kodu = await sonrakiKod(pool, 'ONAY_SABLON'); }
      catch (_) { sablon_kodu = `OS${Date.now().toString().slice(-5)}`; }
    }
    const r = await pool.query(
      `
      INSERT INTO onay_mesaj_sablonlari (sablon_kodu, sablon_adi, olay, konu, govde, aktif)
      VALUES ($1,$2,COALESCE($3,'Bekleme'),$4,$5,COALESCE($6,TRUE))
      RETURNING *
      `,
      [sablon_kodu, sablon_adi, olay, konu || null, govde || null, aktif],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { sablon_adi, olay, konu, govde, aktif } = req.body;
    const r = await pool.query(
      `
      UPDATE onay_mesaj_sablonlari SET
        sablon_adi = COALESCE($2, sablon_adi),
        olay = COALESCE($3, olay),
        konu = COALESCE($4, konu),
        govde = COALESCE($5, govde),
        aktif = COALESCE($6, aktif)
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, sablon_adi || null, olay || null, konu, govde, aktif],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM onay_mesaj_sablonlari WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
