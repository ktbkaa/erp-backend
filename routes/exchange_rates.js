const express = require('express');
const router = express.Router();
const pool = require('../db');
const { trimOrNull } = require('../src/utils/tanimCrud');

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = ['1=1'];
    const params = [];
    if (req.query.tarih) {
      params.push(req.query.tarih);
      where.push(`rate_date = $${params.length}`);
    }
    if (req.query.source_currency) {
      params.push(req.query.source_currency);
      where.push(`source_currency = $${params.length}`);
    }
    if (req.query.target_currency) {
      params.push(req.query.target_currency);
      where.push(`target_currency = $${params.length}`);
    }
    if (req.query.son === 'true') {
      // her çift için en son tarih
      const r = await pool.query(
        `SELECT DISTINCT ON (source_currency, target_currency) *
         FROM exchange_rates
         ORDER BY source_currency, target_currency, rate_date DESC`
      );
      return res.json(r.rows);
    }
    const r = await pool.query(
      `SELECT * FROM exchange_rates WHERE ${where.join(' AND ')}
       ORDER BY rate_date DESC, source_currency LIMIT 500`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** GET /doviz-kurlari/cevir?quantity=&source_currency=&target_currency=&tarih=&type=satis|alis */
router.get('/cevir', async (req, res, next) => {
  try {
    const quantity = num(req.query.quantity);
    const source = trimOrNull(req.query.source_currency);
    const hedef = trimOrNull(req.query.target_currency);
    if (!quantity || !source || !hedef) {
      return res.status(400).json({ hata: 'quantity, source_currency, target_currency zorunlu.' });
    }
    if (source === hedef) {
      return res.json({ quantity, result: quantity, exchange_rate: 1, source_currency: source, target_currency: hedef });
    }
    const type = String(req.query.type || 'satis').toLowerCase() === 'alis' ? 'buy_rate' : 'sell_rate';
    const params = [source, hedef];
    let sql = `SELECT * FROM exchange_rates WHERE source_currency=$1 AND target_currency=$2`;
    if (req.query.tarih) {
      params.push(req.query.tarih);
      sql += ` AND rate_date <= $${params.length}`;
    }
    sql += ' ORDER BY rate_date DESC LIMIT 1';
    let r = await pool.query(sql, params);
    // ters exchange_rate dene
    if (!r.rows[0]) {
      const rev = await pool.query(
        `SELECT * FROM exchange_rates WHERE source_currency=$1 AND target_currency=$2
         ORDER BY rate_date DESC LIMIT 1`,
        [hedef, source]
      );
      if (rev.rows[0]) {
        const k = Number(rev.rows[0][type]);
        const result = quantity / k;
        return res.json({
          quantity, result, exchange_rate: 1 / k, ters: true,
          source_currency: source, target_currency: hedef, kur_kaydi: rev.rows[0],
        });
      }
      return res.status(404).json({ hata: 'Kur bulunamadı.' });
    }
    const exchange_rate = Number(r.rows[0][type]);
    res.json({
      quantity, result: quantity * exchange_rate, exchange_rate,
      source_currency: source, target_currency: hedef, kur_kaydi: r.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.id))) {
      return res.status(404).json({ hata: 'Kur bulunamadı.' });
    }
    const r = await pool.query('SELECT * FROM exchange_rates WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kur bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const source_currency = trimOrNull(req.body.source_currency);
    const target_currency = trimOrNull(req.body.target_currency);
    const alis = num(req.body.buy_rate);
    const satis = num(req.body.sell_rate);
    if (!source_currency || !target_currency || !alis || !satis) {
      return res.status(400).json({ hata: 'source_currency, target_currency, buy_rate, sell_rate zorunlu.' });
    }
    if (source_currency === target_currency) {
      return res.status(400).json({ hata: 'Kaynak ve hedef para birimi farklı olmalı.' });
    }
    const ins = await pool.query(
      `INSERT INTO exchange_rates
          (rate_date, source_currency, target_currency, buy_rate, sell_rate, effective_buy_rate, effective_sell_rate, source)
       VALUES (COALESCE($1::date, CURRENT_DATE),$2,$3,$4,$5,$6,$7,COALESCE($8,'Manuel'))
       ON CONFLICT (rate_date, source_currency, target_currency) DO UPDATE SET
         buy_rate = EXCLUDED.buy_rate,
         sell_rate = EXCLUDED.sell_rate,
         effective_buy_rate = EXCLUDED.effective_buy_rate,
         effective_sell_rate = EXCLUDED.effective_sell_rate,
         source = EXCLUDED.source
       RETURNING *`,
      [
        req.body.rate_date || null,
        source_currency, target_currency, alis, satis,
        num(req.body.effective_buy_rate), num(req.body.effective_sell_rate),
        trimOrNull(req.body.source),
      ]
    );
    res.status(201).json(ins.rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ hata: 'Geçersiz para birimi kodu.' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const alis = num(req.body.buy_rate);
    const satis = num(req.body.sell_rate);
    if (!alis || !satis) return res.status(400).json({ hata: 'buy_rate ve sell_rate zorunlu.' });
    const upd = await pool.query(
      `UPDATE exchange_rates SET
         buy_rate=$2, sell_rate=$3,
         effective_buy_rate=COALESCE($4, effective_buy_rate),
         effective_sell_rate=COALESCE($5, effective_sell_rate),
         source=COALESCE($6, source)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, alis, satis,
        num(req.body.effective_buy_rate), num(req.body.effective_sell_rate),
        trimOrNull(req.body.source),
      ]
    );
    if (!upd.rows[0]) return res.status(404).json({ hata: 'Kur bulunamadı.' });
    res.json(upd.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM exchange_rates WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kur bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
