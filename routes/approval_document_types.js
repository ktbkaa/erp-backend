const express = require('express');
const router = express.Router();
const pool = require('../db');
const { getUser, reqUserCode, isTamYetkili } = require('../src/utils/yetki');
const {
  getDocumentType,
  listDocumentTypes,
  validateValueMap,
  pendingStatus,
  approvedStatus,
  outcomeCodes,
} = require('../src/services/onayKapisiService');

function present(dt) {
  return {
    ...dt,
    pending_status: pendingStatus(dt),
    approved_status: approvedStatus(dt),
    outcome_codes: outcomeCodes(dt),
  };
}

router.get('/', async (req, res) => {
  try {
    const list = await listDocumentTypes(pool, { activeOnly: req.query.is_active === 'true' });
    res.json(list.map(present));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const dt = await getDocumentType(pool, req.params.code, { activeOnly: false });
    if (!dt) return res.status(404).json({ hata: 'Belge türü bulunamadı.' });
    res.json(present(dt));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Ad, aktiflik ve ret/iptal sonuç ayarları; tablo eşlemesi değiştirilemez. */
router.put('/:code', async (req, res) => {
  try {
    const user = req.user || (reqUserCode(req) ? await getUser(pool, reqUserCode(req)) : null);
    if (!isTamYetkili(user)) return res.status(403).json({ hata: 'Belge türü ayarını yalnız yönetici değiştirir.' });
    const dt = await getDocumentType(pool, req.params.code, { activeOnly: false });
    if (!dt) return res.status(404).json({ hata: 'Belge türü bulunamadı.' });
    const b = req.body || {};
    const outcomes = b.outcomes !== undefined ? b.outcomes : dt.outcomes;
    if (!outcomes || typeof outcomes !== 'object') {
      return res.status(400).json({ hata: 'outcomes nesne olmalı.' });
    }
    for (const [code, values] of Object.entries(outcomes)) {
      await validateValueMap(pool, dt.table_name, values, `sonuç ${code}`);
    }
    const rejectDefault = b.default_reject_outcome || dt.default_reject_outcome;
    const cancelDefault = b.default_cancel_outcome || dt.default_cancel_outcome;
    for (const c of [rejectDefault, cancelDefault]) {
      if (!outcomes[c]) return res.status(400).json({ hata: `Varsayılan sonuç "${c}" outcomes içinde yok.` });
    }
    await pool.query(
      `UPDATE approval_document_types SET
         document_type_name = COALESCE($2, document_type_name),
         is_active = COALESCE($3, is_active),
         outcomes = $4::jsonb,
         default_reject_outcome = $5,
         default_cancel_outcome = $6,
         description = COALESCE($7, description)
       WHERE document_type_code = $1`,
      [
        dt.document_type_code, b.document_type_name || null, b.is_active ?? null,
        JSON.stringify(outcomes), rejectDefault, cancelDefault, b.description ?? null,
      ],
    );
    res.json(present(await getDocumentType(pool, dt.document_type_code, { activeOnly: false })));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.code || undefined });
  }
});

module.exports = router;
