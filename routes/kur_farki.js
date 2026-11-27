const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { reqUserCode } = require('../src/utils/yetki');
const {
  degerlemeOnizleme, degerlemeKaydet, degerlemeTersle,
} = require('../src/services/kurFarkiService');

function kurlarFrom(src) {
  const k = src && typeof src === 'object' ? src : {};
  const out = {};
  for (const [cur, v] of Object.entries(k)) {
    if (Number(v) > 0) out[String(cur).toUpperCase()] = Number(v);
  }
  return out;
}

/** GET /kur-farki — kayıtlı kur farkları (gerçekleşen / gerçekleşmemiş) */
router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`e.company_id = $${params.length}`);
    }
    if (req.query.kind) {
      params.push(req.query.kind);
      where.push(`e.kind = $${params.length}`);
    }
    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      where.push(`e.partner_id = $${params.length}`);
    }
    const r = await pool.query(
      `SELECT e.*, p.partner_code, p.partner_name
       FROM exchange_difference_entries e JOIN partners p ON p.id = e.partner_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY e.rate_date DESC, e.id DESC LIMIT 500`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

/** GET /kur-farki/degerleme-onizleme?tarih=YYYY-MM-DD[&kur_USD=32.5] — yazmaz */
router.get('/degerleme-onizleme', async (req, res, next) => {
  try {
    const kurlar = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (/^kur_/i.test(k) && Number(v) > 0) kurlar[k.slice(4).toUpperCase()] = Number(v);
    }
    const satirlar = await degerlemeOnizleme(pool, {
      firmaId: companyIdFromReq(req), tarih: req.query.tarih, kurlar,
    });
    res.json({
      tarih: req.query.tarih,
      satirlar,
      toplam_fark_try: Math.round(satirlar.reduce((a, s) => a + s.fark_try, 0) * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /kur-farki/degerleme { tarih, kurlar?: {USD: 32.5} } */
router.post('/degerleme', async (req, res, next) => {
  try {
    const sonuc = await withTransaction(pool, (client) => degerlemeKaydet(client, {
      firmaId: companyIdFromReq(req),
      tarih: req.body?.tarih,
      kurlar: kurlarFrom(req.body?.kurlar),
      kullaniciKodu: reqUserCode(req),
    }));
    res.status(201).json(sonuc);
  } catch (err) {
    next(err);
  }
});

/** POST /kur-farki/degerleme/ters { tarih, ters_tarihi } */
router.post('/degerleme/ters', async (req, res, next) => {
  try {
    const sonuc = await withTransaction(pool, (client) => degerlemeTersle(client, {
      firmaId: companyIdFromReq(req),
      tarih: req.body?.tarih,
      tersTarihi: req.body?.ters_tarihi,
      kullaniciKodu: reqUserCode(req),
    }));
    res.status(201).json(sonuc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
