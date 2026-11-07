const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM prj_project_templates WHERE COALESCE(is_active,TRUE)=TRUE ORDER BY template_code`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const t = await pool.query(
      `SELECT * FROM prj_project_templates WHERE template_code=$1 OR id::text=$1`,
      [req.params.code]
    );
    if (!t.rows[0]) return res.status(404).json({ hata: 'Şablon bulunamadı.' });
    const items = await pool.query(
      `SELECT * FROM prj_project_template_items WHERE template_id=$1 ORDER BY line_no`,
      [t.rows[0].id]
    );
    res.json({ ...t.rows[0], items: items.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
