const express = require('express');
const router = express.Router();
const pool = require('../db');
const { trimOrNull } = require('../src/utils/tanimCrud');
const {
  syncTcmbRates,
  resolveFetchUrl,
  fetchXml,
  parseTcmbXml,
  DEFAULT_TODAY_URL,
  readParam,
} = require('../src/services/tcmbRateService');

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** GET /doviz-kurlari/tcmb-durum — source URL, auto-sync flag, last TCMB days */
router.get('/tcmb-durum', async (req, res, next) => {
  try {
    const url = await resolveFetchUrl(pool, {});
    const auto = await readParam(pool, 'TCMB_KUR_AUTO', 'true');
    const last = await pool.query(
      `SELECT rate_date, COUNT(*)::int AS n, MAX(created_at) AS last_at
       FROM exchange_rates WHERE source = 'TCMB'
       GROUP BY rate_date ORDER BY rate_date DESC LIMIT 5`
    );
    res.json({
      url,
      default_url: DEFAULT_TODAY_URL,
      auto: /^(1|true|evet|yes|on)$/i.test(String(auto || '')),
      last_tcmb_days: last.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /doviz-kurlari/tcmb-cek  body: { rate_date?, url?, target_currency? }
 * Fetches TCMB rates for every defined currency and stores them.
 */
router.post('/tcmb-cek', async (req, res, next) => {
  try {
    const result = await syncTcmbRates(pool, {
      rateDate: trimOrNull(req.body?.rate_date) || trimOrNull(req.query.rate_date),
      url: trimOrNull(req.body?.url) || trimOrNull(req.query.url),
      targetCurrency: trimOrNull(req.body?.target_currency) || trimOrNull(req.query.target_currency) || 'TRY',
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

/**
 * GET /doviz-kurlari/tcmb-onizleme?source_currency=USD&target_currency=TRY&rate_date=
 * TCMB rate for one pair, without writing to the database.
 */
router.get('/tcmb-onizleme', async (req, res, next) => {
  try {
    const source = String(trimOrNull(req.query.source_currency) || '').toUpperCase();
    const target = String(trimOrNull(req.query.target_currency) || 'TRY').toUpperCase();
    if (!source) return res.status(400).json({ hata: 'source_currency zorunlu.' });
    if (source === target) {
      return res.json({ source_currency: source, target_currency: target, buy_rate: 1, sell_rate: 1 });
    }
    const url = await resolveFetchUrl(pool, {
      rateDate: trimOrNull(req.query.rate_date),
      url: trimOrNull(req.query.url),
    });
    const parsed = parseTcmbXml(await fetchXml(url));
    const hit = parsed.rates.find((r) => r.currency_code === source);
    if (!hit || hit.buy_rate == null || hit.sell_rate == null) {
      return res.status(404).json({
        hata: `${source} TCMB günlük bülteninde yok. Kur kaynağını Manuel yapıp alış/satışı elle girin.`,
        not_in_tcmb: true,
        source_currency: source,
      });
    }
    res.json({
      url,
      rate_date: parsed.bulletinDate,
      bulletin_no: parsed.bulletinNo,
      source_currency: source,
      target_currency: target,
      buy_rate: hit.buy_rate,
      sell_rate: hit.sell_rate,
      effective_buy_rate: hit.effective_buy_rate,
      effective_sell_rate: hit.effective_sell_rate,
      source: 'TCMB',
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

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
    if (req.query.source) {
      params.push(req.query.source);
      where.push(`source = $${params.length}`);
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
