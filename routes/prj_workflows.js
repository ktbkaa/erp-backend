const express = require('express');
const router = express.Router();
const pool = require('../db');
const { transitionWorkItem } = require('../src/services/prjWorkflowService');

router.get('/', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM prj_workflows WHERE COALESCE(is_active,TRUE)=TRUE ORDER BY is_default DESC, workflow_code`
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/transitions', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT t.*, fs.status_code AS from_code, ts.status_code AS to_code
      FROM prj_workflow_transitions t
      LEFT JOIN prj_work_item_statuses fs ON fs.id = t.from_status_id
      JOIN prj_work_item_statuses ts ON ts.id = t.to_status_id
      WHERE t.workflow_id=$1 AND t.is_active=TRUE
      ORDER BY t.line_no, t.id
      `,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/work-items/:id/available', async (req, res, next) => {
  try {
    const wi = await pool.query(`SELECT * FROM work_items WHERE id=$1`, [req.params.id]);
    if (!wi.rows[0]) return res.status(404).json({ hata: 'İş kaydı bulunamadı.' });
    const proj = await pool.query(`SELECT workflow_id FROM projects WHERE id=$1`, [wi.rows[0].project_id]);
    let wfId = proj.rows[0]?.workflow_id;
    if (!wfId) {
      const d = await pool.query(`SELECT id FROM prj_workflows WHERE is_default=TRUE LIMIT 1`);
      wfId = d.rows[0]?.id;
    }
    const r = await pool.query(
      `
      SELECT t.*, ts.status_code AS to_code, ts.status_name AS to_name
      FROM prj_workflow_transitions t
      JOIN prj_work_item_statuses ts ON ts.id = t.to_status_id
      WHERE t.workflow_id=$1 AND t.is_active=TRUE
        AND (t.from_status_id IS NULL OR t.from_status_id=$2)
      ORDER BY t.line_no
      `,
      [wfId, wi.rows[0].status_id]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/work-items/:id/transition', async (req, res, next) => {
  try {
    const { transition_code, to_status_id, note } = req.body;
    await transitionWorkItem(pool, {
      workItemId: req.params.id,
      transitionCode: transition_code,
      toStatusId: to_status_id,
      note,
      userId: req.user?.id,
    });
    const full = await pool.query(
      `
      SELECT w.*, s.status_code, s.status_name
      FROM work_items w
      LEFT JOIN prj_work_item_statuses s ON s.id=w.status_id
      WHERE w.id=$1
      `,
      [req.params.id]
    );
    res.json(full.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

module.exports = router;
