const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { getUser, reqUserCode, isTamYetkili } = require('../src/utils/yetki');
const {
  getRecord,
  startApproval,
  onaylaAdim,
  reddetAdim,
  cancelRecord,
  benimBekleyenler,
} = require('../src/services/onayService');

async function resolveUser(req) {
  if (req.user) return req.user;
  const kod = reqUserCode(req);
  if (!kod) return null;
  return getUser(pool, kod);
}

router.get('/', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req);
    const benim = req.query.benim === 'true' || req.query.mod === 'onaylarim';
    const user = await resolveUser(req);

    if (benim) {
      if (!user) return res.status(401).json({ hata: 'Onaylarım için kullanıcı gerekli.' });
      if (isTamYetkili(user)) {
        // Admin: tüm bekleyenler
        const params = [];
        let sql = `
          SELECT id FROM approval_records
          WHERE status_code = 'BEKLIYOR'
        `;
        if (firmaId) {
          params.push(firmaId);
          sql += ` AND (company_id IS NULL OR company_id = $${params.length})`;
        }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
        const out = [];
        for (const row of liste.rows) out.push(await getRecord(pool, row.id));
        return res.json(out);
      }
      const rows = await benimBekleyenler(pool, user.id, { firmaId });
      return res.json(rows);
    }

    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`(company_id IS NULL OR company_id = $${params.length})`);
    }
    if (req.query.status_code) {
      params.push(req.query.status_code);
      where.push(`status_code = $${params.length}`);
    }
    if (req.query.module_code) {
      params.push(req.query.module_code);
      where.push(`module_code = $${params.length}`);
    }
    if (req.query.screen_id) {
      params.push(req.query.screen_id);
      where.push(`screen_id = $${params.length}`);
    }
    if (req.query.document_no) {
      params.push(`%${req.query.document_no}%`);
      where.push(`document_no ILIKE $${params.length}`);
    }
    const sql = `
      SELECT id FROM approval_records
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT 500
    `;
    const liste = await pool.query(sql, params);
    const out = [];
    for (const row of liste.rows) out.push(await getRecord(pool, row.id));
    res.json(out);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getRecord(pool, req.params.id);
    if (!row) return res.status(404).json({ hata: 'Onay kaydı bulunamadı.' });
    res.json(row);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(500).json({ hata: err.message });
  }
});

/** Manuel / API ile süreç başlat */
router.post('/baslat', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const body = { ...req.body };
    if (!body.company_id) body.company_id = companyIdFromReq(req);
    if (!body.initiator_user_id && user) body.initiator_user_id = user.id;
    const result = await withTransaction(pool, async (client) => startApproval(client, body));
    res.status(201).json(result);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/onayla', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const result = await withTransaction(pool, async (client) =>
      onaylaAdim(client, req.params.id, user, { notes: req.body?.notes || req.body?.description || null }),
    );
    res.json(result);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/reddet', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const result = await withTransaction(pool, async (client) =>
      reddetAdim(client, req.params.id, user, { notes: req.body?.notes || req.body?.description || null }),
    );
    res.json(result);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/:id/iptal', async (req, res) => {
  try {
    const user = await resolveUser(req);
    const result = await withTransaction(pool, async (client) =>
      cancelRecord(client, req.params.id, user, { notes: req.body?.notes || req.body?.description || null }),
    );
    res.json(result);
  } catch (err) {
    if (err.code === '23503') {
                return res.status(409).json({
                    hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                    kod: 'ERR-FK-23503',
                });
            }
    res.status(err.status || 500).json({ hata: err.message });
  }
});

module.exports = router;
