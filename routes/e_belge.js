const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq, assertCompanyRecord } = require('../src/utils/firmaScope');
const { parametreAl } = require('../src/utils/yetki');
const svc = require('../src/services/eBelgeAdapterService');

const SOURCE_TABLES = { Fatura: 'invoices', Irsaliye: 'delivery_notes' };

function userCode(req) {
  return req.user?.user_code || req.get?.('x-kullanici-kodu') || null;
}

function sendError(res, err) {
  const status = err.status || (['P0001', 'BK001'].includes(err.code) ? 409 : 500);
  res.status(status).json({ hata: err.message, kod: err.code || null, detay: err.detay || undefined });
}

async function scopedRow(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ hata: 'Geçersiz kuyruk id.' });
    return null;
  }
  const r = await pool.query(`SELECT * FROM e_document_queue WHERE id=$1`, [id]);
  const firmaId = companyIdFromReq(req);
  if (!r.rows[0] || (firmaId && !(await assertCompanyRecord(pool, 'e_document_queue', id, firmaId)))) {
    res.status(404).json({ hata: 'Kuyruk kaydı bulunamadı.' });
    return null;
  }
  return r.rows[0];
}

/** İşlem içinde çalıştırır; servis hata kaydını döndürdüyse de COMMIT edilir (olay/hata kaydı kalıcı). */
function txRoute(fn, { scoped = true, okStatus = 200 } = {}) {
  return async (req, res) => {
    if (scoped && !(await scopedRow(req, res).catch((e) => sendError(res, e)))) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client, req, res);
      await client.query('COMMIT');
      if (!res.headersSent) res.status(okStatus).json(out);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (!res.headersSent) sendError(res, err);
    } finally {
      client.release();
    }
  };
}

async function listHandler(req, res) {
  try {
    const rows = await svc.listQueue(pool, {
      companyId: companyIdFromReq(req) || req.query.company_id || null,
      status: req.query.status || null,
      documentType: req.query.document_type || null,
      documentId: req.query.document_id || null,
      limit: req.query.limit || 200,
    });
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
}

router.get('/', listHandler);
router.get('/kuyruk', listHandler);

/** Mod (mock/test/canlı/engelli), eksik yapılandırma anahtarları (değer değil), durum sayıları. */
router.get('/durum/ozet', async (req, res) => {
  try {
    res.json(await svc.statusSummary(pool, { companyId: companyIdFromReq(req) }));
  } catch (err) {
    sendError(res, err);
  }
});

async function assertSourceScope(req, documentType, documentId) {
  const type = svc.normalizeDocType(documentType);
  const firmaId = companyIdFromReq(req);
  if (firmaId && !(await assertCompanyRecord(pool, SOURCE_TABLES[type], documentId, firmaId))) {
    const err = new Error('Kaynak belge bulunamadı (firma kapsamı).');
    err.status = 404;
    throw err;
  }
  return type;
}

function docParams(b = {}) {
  return { documentType: b.document_type || b.belge_tipi, documentId: Number(b.document_id || b.belge_id) };
}

/** Numara tüketmeden UBL XML + doğrulama önizlemesi. ?format=xml → ham XML. */
router.post('/onizle', async (req, res) => {
  try {
    const { documentType, documentId } = docParams(req.body);
    if (!documentType || !documentId) return res.status(400).json({ hata: 'document_type ve document_id zorunlu.' });
    const type = await assertSourceScope(req, documentType, documentId);
    const out = await svc.preview(pool, { documentType: type, documentId });
    if (req.query.format === 'xml') return res.type('application/xml; charset=utf-8').send(out.xml);
    const { model, ...rest } = out;
    res.json(rest);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/hazirla', txRoute(async (client, req) => {
  const { documentType, documentId } = docParams(req.body);
  if (!documentType || !documentId) {
    const err = new Error('document_type ve document_id zorunlu.');
    err.status = 400;
    throw err;
  }
  const type = await assertSourceScope(req, documentType, documentId);
  return svc.prepare(client, { documentType: type, documentId, providerCode: req.body.provider_code || null, kullaniciKodu: userCode(req) });
}, { scoped: false, okStatus: 201 }));

/** Zamanı gelen kuyruk kayıtlarını gönderir, gönderilmişlerin durumunu sorgular. */
router.post('/kuyruk/isle', async (req, res) => {
  try {
    res.json(await svc.processDueQueue(pool, { limit: req.body?.limit || 20, companyId: companyIdFromReq(req) }));
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/mukellef-sorgula', txRoute(async (client, req) => svc.checkUser(client, {
  taxId: req.body?.vkn || req.body?.tax_id,
  documentKind: req.body?.tur || req.body?.document_kind || 'EFATURA',
  companyId: companyIdFromReq(req),
}), { scoped: false }));

/** Entegratör sorgusu yoksa (mock/portal) alıcı etiketini elle tanımlama. */
router.post('/mukellef', txRoute(async (client, req) => svc.registerUserManual(client, {
  taxId: req.body?.vkn || req.body?.tax_id,
  documentKind: req.body?.tur || req.body?.document_kind || 'EFATURA',
  alias: req.body?.etiket || req.body?.alias,
  title: req.body?.unvan || req.body?.title || null,
}), { scoped: false, okStatus: 201 }));

router.get('/arsiv/:arsivId/indir', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM e_document_archive WHERE id=$1`, [Number(req.params.arsivId)]);
    const a = r.rows[0];
    const firmaId = companyIdFromReq(req);
    if (!a || (firmaId && a.company_id && Number(a.company_id) !== firmaId)) return res.status(404).json({ hata: 'Arşiv kaydı bulunamadı.' });
    res.set('Content-Type', a.mime_type);
    res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(a.file_name || `arsiv-${a.id}`)}"`);
    res.set('X-Content-SHA256', a.sha256);
    res.send(a.content);
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await scopedRow(req, res);
    if (!row) return;
    const { payload_json: payload, ...rest } = row;
    res.json({
      ...rest,
      payload_json: payload ? { prepared_at: payload.prepared_at, prepared_by: payload.prepared_by, has_xml: Boolean(payload.xml), has_envelope: Boolean(payload.envelope_xml) } : null,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:id/olaylar', async (req, res) => {
  try {
    const row = await scopedRow(req, res);
    if (row) res.json(await svc.listEvents(pool, row.id));
  } catch (err) {
    sendError(res, err);
  }
});

router.get('/:id/arsiv', async (req, res) => {
  try {
    const row = await scopedRow(req, res);
    if (row) res.json(await svc.listArchive(pool, row.id));
  } catch (err) {
    sendError(res, err);
  }
});

function xmlHandler(key, suffix) {
  return async (req, res) => {
    try {
      const row = await scopedRow(req, res);
      if (!row) return;
      const xml = row.payload_json && row.payload_json[key];
      if (!xml) return res.status(404).json({ hata: key === 'envelope_xml' ? 'Bu kayıt için zarf yok (e-Arşiv zarfsız gönderilir).' : 'Kayıtta XML yok.' });
      res.type('application/xml; charset=utf-8');
      if (req.query.indir) res.set('Content-Disposition', `attachment; filename="${row.gib_number || row.id}${suffix}.xml"`);
      res.send(xml);
    } catch (err) {
      sendError(res, err);
    }
  };
}
router.get('/:id/xml', xmlHandler('xml', ''));
router.get('/:id/zarf', xmlHandler('envelope_xml', '-zarf'));

router.get('/:id/pdf', async (req, res) => {
  try {
    const row = await scopedRow(req, res);
    if (!row) return;
    const buf = await svc.renderQueuePdf(pool, row, { template: req.query.sablon || null });
    res.type('application/pdf');
    res.set('Content-Disposition', `${req.query.indir ? 'attachment' : 'inline'}; filename="${row.gib_number || row.id}.pdf"`);
    res.send(buf);
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/:id/kuyruga-al', txRoute((client, req) => svc.enqueue(client, Number(req.params.id), { kullaniciKodu: userCode(req) })));

/**
 * Gönderim. Mod resolveConfig() ile belirlenir:
 *   GIB_CANLI=Hayir → mock veya entegratör test ortamı (is_simulated=true)
 *   GIB_CANLI=Evet + kimlik tamam → canlı; eksik → Hata (EBELGE_CANLI_KIMLIK_EKSIK), sahte Gonderildi yazılmaz.
 * Geriye uyumluluk: simulate=false iken GIB_CANLI=Hayir → 409; GIB_CANLI=Evet iken simulate=true → 409.
 */
router.post('/:id/gonder', txRoute(async (client, req, res) => {
  const gibCanli = String(await parametreAl(client, 'GIB_CANLI', 'Hayir')).toLowerCase() === 'evet';
  const simulate = req.body?.simulate;
  if (simulate === false && !gibCanli) {
    res.status(409).json({
      hata: 'GIB_CANLI=Hayir. Canlı gönderim kapalı; sandbox (mock/test) gönderimi için simulate parametresini kaldırın veya GIB_CANLI=Evet + entegratör kimlik bilgilerini tanımlayın.',
      kod: 'GIB_CANLI_KAPALI',
    });
    return null;
  }
  if (simulate === true && gibCanli) {
    res.status(409).json({ hata: 'GIB_CANLI=Evet iken simülasyon gönderimi yapılamaz.', kod: 'EBELGE_SIMULASYON_CANLI' });
    return null;
  }
  return svc.send(client, Number(req.params.id), { kullaniciKodu: userCode(req) });
}));

router.post('/:id/durum-sorgula', txRoute((client, req) => svc.refreshStatus(client, Number(req.params.id), { kullaniciKodu: userCode(req) })));

router.post('/:id/yeniden-dene', txRoute((client, req) => svc.retry(client, Number(req.params.id), { kullaniciKodu: userCode(req) })));

router.post('/:id/iptal', txRoute((client, req) => svc.cancel(client, Number(req.params.id), {
  reason: req.body?.gerekce || req.body?.reason,
  method: req.body?.iptal_yontemi || req.body?.method || null,
  ref: req.body?.iptal_referans || req.body?.ref || null,
  iadeInvoiceId: req.body?.iade_fatura_id ? Number(req.body.iade_fatura_id) : null,
  kullaniciKodu: userCode(req),
})));

router.post('/:id/manuel-durum', txRoute((client, req) => svc.manualStatus(client, Number(req.params.id), {
  status: req.body?.durum || req.body?.status,
  ref: req.body?.referans || req.body?.ref || null,
  message: req.body?.mesaj || req.body?.message || null,
  kullaniciKodu: userCode(req),
})));

module.exports = router;
