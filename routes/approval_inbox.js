/**
 * Genel "Onay Bekleyenler" gelen kutusu + toplu onay / ret.
 * Tüm belge türleri için aynı uçlar; belgeye etkisi onayKapisiService üzerinden uygulanır.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { getUser, reqUserCode, isTamYetkili } = require('../src/utils/yetki');
const {
  getRecord, onaylaAdim, reddetAdim, benimBekleyenler,
} = require('../src/services/onayService');

async function resolveUser(req) {
  if (req.user) return req.user;
  const kod = reqUserCode(req);
  if (!kod) return null;
  return getUser(pool, kod);
}

function parseIds(body) {
  return Array.isArray(body?.ids)
    ? [...new Set(body.ids.map(Number).filter((n) => Number.isFinite(n) && n > 0))]
    : [];
}

router.get('/', async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ hata: 'Onay bekleyenler için kullanıcı gerekli.' });
    const firmaId = companyIdFromReq(req);
    let rows;
    if (isTamYetkili(user)) {
      const params = [];
      let sql = `SELECT id FROM approval_records WHERE status_code = 'BEKLIYOR'`;
      if (firmaId) {
        params.push(firmaId);
        sql += ` AND (company_id IS NULL OR company_id = $${params.length})`;
      }
      sql += ' ORDER BY id DESC LIMIT 1000';
      const liste = await pool.query(sql, params);
      rows = [];
      for (const r of liste.rows) rows.push(await getRecord(pool, r.id));
    } else {
      rows = await benimBekleyenler(pool, user.id, { firmaId });
    }
    const q = req.query;
    if (q.document_type_code) rows = rows.filter((r) => r.document_type_code === q.document_type_code);
    if (q.screen_id) rows = rows.filter((r) => r.screen_id === q.screen_id);
    if (q.document_no) {
      const needle = String(q.document_no).toLowerCase();
      rows = rows.filter((r) => String(r.document_no || '').toLowerCase().includes(needle));
    }
    res.json(rows);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

async function bulk(req, res, action) {
  try {
    const ids = parseIds(req.body);
    if (!ids.length) return res.status(400).json({ hata: 'ids[] zorunlu.' });
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ hata: 'Toplu işlem için kullanıcı gerekli.' });
    const notes = req.body?.notes || req.body?.description || null;
    const basarili = [];
    const hatali = [];
    for (const id of ids) {
      try {
        const kayit = await withTransaction(pool, (client) => action(client, id, user, { notes }));
        basarili.push({
          id,
          approval_no: kayit.approval_no,
          document_no: kayit.document_no,
          status_code: kayit.status_code,
        });
      } catch (err) {
        hatali.push({ id, hata: err.message, kod: err.code || undefined });
      }
    }
    res.json({ basarili, hatali, basarili_sayisi: basarili.length, hata_sayisi: hatali.length });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
}

router.post('/toplu-onayla', (req, res) => bulk(req, res, onaylaAdim));
router.post('/toplu-reddet', (req, res) => bulk(req, res, reddetAdim));

module.exports = router;
