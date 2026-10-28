const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { reqKullaniciKodu } = require('../src/utils/yetki');
const { donemKapat, donemYenidenAc } = require('../src/services/muhasebeMotorService');

router.get('/mali-yillar', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `
      SELECT * FROM fiscal_years
      WHERE company_id IS NULL OR company_id=$1
      ORDER BY year DESC
      `,
      [firmaId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/mali-yillar/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM fiscal_years WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Mali yıl bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/mali-yillar', async (req, res, next) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.year) {
      return res.status(400).json({ hata: 'company_id ve year zorunlu.' });
    }
    const year = Number(b.year);
    const start = b.start_date || `${year}-01-01`;
    const end = b.end_date || `${year}-12-31`;
    const r = await pool.query(
      `INSERT INTO fiscal_years (company_id, year, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,COALESCE($5,'Acik'))
       RETURNING *`,
      [firmaId, year, start, end, b.status],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/mali-yillar/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE fiscal_years SET
         start_date = COALESCE($2, start_date),
         end_date = COALESCE($3, end_date),
         status = COALESCE($4, status)
       WHERE id=$1 RETURNING *`,
      [req.params.id, b.start_date, b.end_date, b.status],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Mali yıl bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `
      SELECT d.*, y.year AS mali_yil
      FROM accounting_periods d
      JOIN fiscal_years y ON y.id = d.fiscal_year_id
      WHERE d.company_id IS NULL OR d.company_id=$1
      ORDER BY d.start_date DESC
      `,
      [firmaId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT d.*, y.year AS mali_yil FROM accounting_periods d
       JOIN fiscal_years y ON y.id=d.fiscal_year_id WHERE d.id=$1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Dönem bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/kapat', async (req, res, next) => {
  try {
    const row = await withTransaction(pool, (client) =>
      donemKapat(client, Number(req.params.id), { kullaniciKodu: reqKullaniciKodu(req) })
    );
    res.json({
      ...row,
      message: 'Dönem kapatıldı. Bu tarih aralığına yeni kesin fiş yazılamaz.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

router.post('/:id/yeniden-ac', async (req, res, next) => {
  try {
    const row = await withTransaction(pool, (client) =>
      donemYenidenAc(client, Number(req.params.id), { kullaniciKodu: reqKullaniciKodu(req) })
    );
    res.json({
      ...row,
      message: 'Dönem yeniden açıldı (YenidenAcik). İşlemler audit ile izlenir.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.kod });
  }
});

module.exports = router;
