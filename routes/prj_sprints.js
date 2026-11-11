const express = require('express');
const router = express.Router();
const pool = require('../db');
const { registerIdCrud } = require('../src/utils/registerIdCrud');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextSequenceCode } = require('../src/utils/kodUretici');
const { runAutomation } = require('../src/services/prjAutomationService');

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let where = 'WHERE s.is_active=TRUE';
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where += ` AND s.company_id=$${params.length}`;
    }
    if (req.query.project_id) {
      params.push(req.query.project_id);
      where += ` AND s.project_id=$${params.length}`;
    }
    const r = await pool.query(
      `
      SELECT s.*, p.project_code, p.project_name,
             (SELECT COUNT(*)::int FROM prj_sprint_work_items x WHERE x.sprint_id=s.id AND x.removed_at IS NULL) AS item_count
      FROM prj_sprints s
      JOIN projects p ON p.id = s.project_id
      ${where}
      ORDER BY s.start_date DESC NULLS LAST, s.id DESC
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const s = await pool.query(
      `SELECT s.*, p.project_code, p.project_name FROM prj_sprints s JOIN projects p ON p.id=s.project_id WHERE s.id=$1`,
      [req.params.id]
    );
    if (!s.rows[0]) return res.status(404).json({ hata: 'Sprint bulunamadı.' });
    const items = await pool.query(
      `
      SELECT w.*, st.status_code, st.status_name, sw.added_at
      FROM prj_sprint_work_items sw
      JOIN work_items w ON w.id = sw.work_item_id
      LEFT JOIN prj_work_item_statuses st ON st.id = w.status_id
      WHERE sw.sprint_id=$1 AND sw.removed_at IS NULL
      ORDER BY w.backlog_rank NULLS LAST, w.id
      `,
      [req.params.id]
    );
    const done = items.rows.filter((i) => i.status_code === 'DONE').length;
    const totalEst = items.rows.reduce((a, i) => a + Number(i.estimated_hours || 0), 0);
    const totalAct = items.rows.reduce((a, i) => a + Number(i.actual_hours || 0), 0);
    res.json({
      ...s.rows[0],
      items: items.rows,
      metrics: {
        total: items.rows.length,
        done,
        remaining: items.rows.length - done,
        estimated_hours: totalEst,
        actual_hours: totalAct,
        velocity_done: done,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { project_id, sprint_name, goal, start_date, end_date, capacity_hours } = req.body;
    if (!project_id || !sprint_name) {
      return res.status(400).json({ hata: 'project_id ve sprint_name zorunlu.' });
    }
    if (start_date && end_date && end_date < start_date) {
      return res.status(400).json({ hata: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    }
    const row = await withTransaction(pool, async (client) => {
      const p = await client.query(`SELECT company_id FROM projects WHERE id=$1`, [project_id]);
      if (!p.rows[0]) throw Object.assign(new Error('Proje bulunamadı.'), { status: 404 });
      const code = req.body.sprint_code || (await nextSequenceCode(client, 'PRJ_SPRINT'));
      const ins = await client.query(
        `
        INSERT INTO prj_sprints (company_id, project_id, sprint_code, sprint_name, goal, start_date, end_date, capacity_hours)
        VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::numeric,0)) RETURNING *
        `,
        [p.rows[0].company_id, project_id, code, sprint_name, goal || null, start_date || null, end_date || null, capacity_hours]
      );
      return ins.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

router.post('/:id/items', async (req, res, next) => {
  try {
    const { work_item_id } = req.body;
    if (!work_item_id) return res.status(400).json({ hata: 'work_item_id zorunlu.' });
    const s = await pool.query(`SELECT * FROM prj_sprints WHERE id=$1`, [req.params.id]);
    if (!s.rows[0]) return res.status(404).json({ hata: 'Sprint bulunamadı.' });
    const wi = await pool.query(`SELECT * FROM work_items WHERE id=$1`, [work_item_id]);
    if (!wi.rows[0] || Number(wi.rows[0].project_id) !== Number(s.rows[0].project_id)) {
      return res.status(400).json({ hata: 'İş aynı projede olmalı.' });
    }
    await pool.query(
      `
      INSERT INTO prj_sprint_work_items (sprint_id, work_item_id)
      VALUES ($1,$2)
      ON CONFLICT (sprint_id, work_item_id) DO UPDATE SET removed_at=NULL, added_at=CURRENT_TIMESTAMP
      `,
      [req.params.id, work_item_id]
    );
    await pool.query(`UPDATE work_items SET sprint_id=$2 WHERE id=$1`, [work_item_id, req.params.id]);
    if (s.rows[0].status_code === 'ACTIVE') {
      await pool.query(
        `UPDATE prj_sprints SET scope_change_log = COALESCE(scope_change_log,'') || $2 WHERE id=$1`,
        [req.params.id, `\n+ WI ${wi.rows[0].work_item_no} eklendi ${new Date().toISOString()}`]
      );
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE prj_sprints SET status_code='ACTIVE' WHERE id=$1 AND status_code='PLANNING' RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Sprint PLANNING durumunda değil.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const moveTo = req.body.move_remaining_to; // 'backlog' | sprint_id
    const s = await withTransaction(pool, async (client) => {
      const cur = await client.query(`SELECT * FROM prj_sprints WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!cur.rows[0]) throw Object.assign(new Error('Sprint bulunamadı.'), { status: 404 });
      const open = await client.query(
        `
        SELECT w.id, w.work_item_no FROM prj_sprint_work_items sw
        JOIN work_items w ON w.id = sw.work_item_id
        LEFT JOIN prj_work_item_statuses st ON st.id = w.status_id
        WHERE sw.sprint_id=$1 AND sw.removed_at IS NULL AND COALESCE(st.is_done,FALSE)=FALSE
        `,
        [req.params.id]
      );
      for (const wi of open.rows) {
        if (moveTo === 'backlog' || !moveTo) {
          await client.query(`UPDATE work_items SET sprint_id=NULL WHERE id=$1`, [wi.id]);
          await client.query(
            `UPDATE prj_sprint_work_items SET removed_at=CURRENT_TIMESTAMP WHERE sprint_id=$1 AND work_item_id=$2`,
            [req.params.id, wi.id]
          );
        } else {
          await client.query(
            `
            INSERT INTO prj_sprint_work_items (sprint_id, work_item_id)
            VALUES ($1,$2) ON CONFLICT (sprint_id, work_item_id)
            DO UPDATE SET removed_at=NULL, added_at=CURRENT_TIMESTAMP
            `,
            [moveTo, wi.id]
          );
          await client.query(`UPDATE work_items SET sprint_id=$2 WHERE id=$1`, [wi.id, moveTo]);
          await client.query(
            `UPDATE prj_sprint_work_items SET removed_at=CURRENT_TIMESTAMP WHERE sprint_id=$1 AND work_item_id=$2`,
            [req.params.id, wi.id]
          );
        }
      }
      const upd = await client.query(
        `UPDATE prj_sprints SET status_code='COMPLETED' WHERE id=$1 RETURNING *`,
        [req.params.id]
      );
      return { sprint: upd.rows[0], moved: open.rows.length };
    });
    await runAutomation(
      'SPRINT_CLOSED',
      { sprint_id: req.params.id, project_id: s.sprint.project_id },
      { eventKey: `sprint_closed:${req.params.id}` }
    );
    res.json(s);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE prj_sprints SET status_code='CANCELLED' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Sprint bulunamadı.' });
    await pool.query(`UPDATE work_items SET sprint_id=NULL WHERE sprint_id=$1`, [req.params.id]);
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

registerIdCrud(router, pool, {
  path: '',
  table: 'prj_sprints',
  notFound: 'Sprint bulunamadı.',
  skipGet: true,
  skipDelete: true,
  updatable: ['sprint_name', 'goal', 'start_date', 'end_date', 'capacity_hours', 'is_active'],
});

module.exports = router;
