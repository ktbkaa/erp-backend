const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { kullaniciGetir, reqKullaniciKodu, isTamYetkili } = require('../src/utils/yetki');
const {
  kayitGetir,
  baslatOnay,
  onaylaAdim,
  reddetAdim,
  iptalKayit,
  benimBekleyenler,
} = require('../src/services/onayService');

async function resolveUser(req) {
  if (req.user) return req.user;
  const kod = reqKullaniciKodu(req);
  if (!kod) return null;
  return kullaniciGetir(pool, kod);
}

router.get('/', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const benim = req.query.benim === 'true' || req.query.mod === 'onaylarim';
    const user = await resolveUser(req);

    if (benim) {
      if (!user) return res.status(401).json({ hata: 'Onaylarım için kullanıcı gerekli.' });
      if (isTamYetkili(user)) {
        // Admin: tüm bekleyenler
        const params = [];
        let sql = `
          SELECT id FROM onay_kayitlari
          WHERE durum_kodu = 'BEKLIYOR'
        `;
        if (firmaId) {
          params.push(firmaId);
          sql += ` AND (firma_id IS NULL OR firma_id = $${params.length})`;
        }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
        const out = [];
        for (const row of liste.rows) out.push(await kayitGetir(pool, row.id));
        return res.json(out);
      }
      const rows = await benimBekleyenler(pool, user.id, { firmaId });
      return res.json(rows);
    }

    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`(firma_id IS NULL OR firma_id = $${params.length})`);
    }
    if (req.query.durum_kodu) {
      params.push(req.query.durum_kodu);
      where.push(`durum_kodu = $${params.length}`);
    }
    if (req.query.modul_kodu) {
      params.push(req.query.modul_kodu);
      where.push(`modul_kodu = $${params.length}`);
    }
    if (req.query.ekran_id) {
      params.push(req.query.ekran_id);
      where.push(`ekran_id = $${params.length}`);
    }
    if (req.query.belge_no) {
      params.push(`%${req.query.belge_no}%`);
      where.push(`belge_no ILIKE $${params.length}`);
    }
    const sql = `
      SELECT id FROM onay_kayitlari
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT 500
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await kayitGetir(pool, row.id));
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await kayitGetir(pool, req.params.id);
    if (!row) return res.status(404).json({ hata: 'Onay kaydı bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Manuel / API ile süreç başlat */
router.post('/baslat', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const body = { ...req.body };
    if (!body.firma_id) body.firma_id = firmaIdFromReq(req);
    if (!body.baslatan_kisi_id && user) body.baslatan_kisi_id = user.id;
    const sonuc = await withTransaction(pool, async (client) => baslatOnay(client, body));
    res.status(201).json(sonuc);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const sonuc = await withTransaction(pool, async (client) =>
      onaylaAdim(client, req.params.id, user, { notlar: req.body?.notlar || req.body?.aciklama || null }),
    );
    res.json(sonuc);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/reddet', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const sonuc = await withTransaction(pool, async (client) =>
      reddetAdim(client, req.params.id, user, { notlar: req.body?.notlar || req.body?.aciklama || null }),
    );
    res.json(sonuc);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/iptal', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const sonuc = await withTransaction(pool, async (client) =>
      iptalKayit(client, req.params.id, user, { notlar: req.body?.notlar || req.body?.aciklama || null }),
    );
    res.json(sonuc);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

module.exports = router;
