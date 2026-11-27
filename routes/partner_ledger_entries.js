const express = require('express');
const router = express.Router();
const pool = require('../db');
const { cariEkstre, cariBakiye, cariHareketEkle } = require('../src/services/cariHareketService');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res, next) => {
  try {
    const cariId = req.query.partner_id ? Number(req.query.partner_id) : null;
    if (!cariId) {
      // UI liste: son hareketler
      const r = await pool.query(
        `SELECT h.*, c.partner_code, c.partner_name
         FROM partner_ledger_entries h
         JOIN partners c ON c.id = h.partner_id
         ORDER BY h.id DESC LIMIT 200`
      );
      return res.json(r.rows);
    }
    const data = await cariEkstre(pool, cariId, {
      baslangic: req.query.baslangic || null,
      bitis: req.query.bitis || null,
    });
    // UI liste uyumu: hareketler dizisi
    res.json(data.hareketler || data);
  } catch (err) {
    next(err);
  }
});

router.get('/bakiye/:cariId', async (req, res, next) => {
  try {
    res.json(await cariBakiye(pool, Number(req.params.cariId)));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const row = await withTransaction(pool, (client) =>
      cariHareketEkle(client, {
        cariId: body.partner_id,
        direction: body.direction,
        amount: body.amount,
        paraBirimi: body.currency_code,
        exchange_rate: body.exchange_rate,
        belgeTipi: body.document_type,
        belgeId: body.document_id,
        description: body.description,
        hareketTarihi: body.movement_date,
      })
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
