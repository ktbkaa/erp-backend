const express = require('express');
const router = express.Router();
const pool = require('../db');
const { runAutomation } = require('../src/services/prjAutomationService');

router.get('/', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM prj_automations ORDER BY priority, automation_code`);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/logs', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT l.*, a.automation_code, a.automation_name
      FROM prj_automation_logs l
      LEFT JOIN prj_automations a ON a.id = l.automation_id
      ORDER BY l.id DESC LIMIT 100
      `
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:code/run', async (req, res, next) => {
  try {
    const a = await pool.query(`SELECT * FROM prj_automations WHERE automation_code=$1`, [req.params.code]);
    if (!a.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    const results = await runAutomation(a.rows[0].trigger_code, req.body || {}, {
      eventKey: req.body.event_key || `manual:${req.params.code}:${Date.now()}`,
    });
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/toggle', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE prj_automations SET is_enabled = NOT is_enabled WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Otomasyon bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
