const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { listAudit } = require('../src/services/onayKapisiService');

router.get('/', async (req, res) => {
  try {
    const rows = await listAudit(pool, {
      documentTypeCode: req.query.document_type_code || null,
      documentId: req.query.document_id || null,
      recordId: req.query.record_id || null,
      companyId: companyIdFromReq(req),
      limit: req.query.limit,
    });
    const q = req.query;
    let out = rows;
    if (q.action) out = out.filter((r) => r.action === q.action);
    if (q.document_no) {
      const needle = String(q.document_no).toLowerCase();
      out = out.filter((r) => String(r.document_no || '').toLowerCase().includes(needle));
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
