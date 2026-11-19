const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const {
  prepare,
  enqueue,
  sendOrSimulate,
  listQueue,
} = require('../src/services/eBelgeAdapterService');

router.get('/', async (req, res) => {
  try {
    const rows = await listQueue(pool, {
      companyId: companyIdFromReq(req) || req.query.company_id || null,
      status: req.query.status || null,
      limit: req.query.limit || 200,
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM e_document_queue WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kuyruk kaydı bulunamadı.' });
    const { assertCompanyRecord } = require('../src/utils/firmaScope');
    const firmaId = companyIdFromReq(req);
    if (firmaId && !(await assertCompanyRecord(pool, 'e_document_queue', r.rows[0].id, firmaId))) {
      return res.status(404).json({ hata: 'Kuyruk kaydı bulunamadı (firma kapsamı).' });
    }
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Belgeyi e-belge kuyruğuna hazırla */
router.post('/hazirla', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const b = req.body || {};
    const documentType = b.document_type || b.belge_tipi;
    const documentId = Number(b.document_id || b.belge_id);
    if (!documentType || !documentId) {
      return res.status(400).json({ hata: 'document_type ve document_id zorunlu.' });
    }
    const row = await prepare(client, {
      documentType,
      documentId,
      providerCode: b.provider_code || null,
      kullaniciKodu: req.user?.user_code || req.get?.('x-kullanici-kodu') || null,
    });
    await client.query('COMMIT');
    res.status(201).json(row);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.status || 400).json({ hata: err.message, kod: err.code });
  } finally {
    client.release();
  }
});

router.post('/:id/kuyruga-al', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await enqueue(client, Number(req.params.id));
    await client.query('COMMIT');
    res.json(row);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.status || 400).json({ hata: err.message, kod: err.code });
  } finally {
    client.release();
  }
});

/**
 * Gönderim: varsayılan simülasyon.
 * Canlı: body.simulate=false VE GIB_CANLI=Evet VE provider_code dolu.
 * Provider yokken canlı Gonderildi yazılmaz (Hata).
 */
router.post('/:id/gonder', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { parametreAl } = require('../src/utils/yetki');
    const gibCanli = String(await parametreAl(client, 'GIB_CANLI', 'Hayir')).toLowerCase() === 'evet';
    let simulate = req.body?.simulate !== false;
    if (!simulate && !gibCanli) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        hata: 'GIB_CANLI=Hayir. Canlı gönderim kapalı; simulate=true kullanın veya sağlayıcı entegrasyonu + GIB_CANLI=Evet.',
        kod: 'GIB_CANLI_KAPALI',
      });
    }
    const result = await sendOrSimulate(client, Number(req.params.id), { simulate });
    await client.query('COMMIT');
    res.json(result);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.status || 400).json({ hata: err.message, kod: err.code });
  } finally {
    client.release();
  }
});

module.exports = router;
