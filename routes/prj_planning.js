const express = require('express');
const router = express.Router();
const pool = require('../db');

/** Gantt / timeline veri seti */
router.get('/gantt', async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    if (!projectId) return res.status(400).json({ hata: 'project_id zorunlu.' });
    const tasks = await pool.query(
      `
      SELECT w.id, w.work_item_no AS code, w.title AS name, w.parent_id,
             w.plan_start_date AS start, w.plan_end_date AS "end",
             w.percent_complete AS progress, w.assignee_user_id,
             s.status_code, s.status_name, t.type_code
      FROM work_items w
      LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
      LEFT JOIN prj_work_item_types t ON t.id = w.type_id
      WHERE w.project_id=$1 AND w.is_active=TRUE
      ORDER BY w.parent_id NULLS FIRST, w.plan_start_date NULLS LAST, w.id
      `,
      [projectId]
    );
    const deps = await pool.query(
      `
      SELECT r.from_work_item_id AS "from", r.to_work_item_id AS "to",
             rt.relation_code AS type, rt.blocks_schedule
      FROM work_item_relations r
      JOIN prj_relation_types rt ON rt.id = r.relation_type_id
      JOIN work_items w ON w.id = r.from_work_item_id
      WHERE w.project_id=$1
      `,
      [projectId]
    );
    const milestones = await pool.query(
      `SELECT id, milestone_code AS code, milestone_name AS name, due_date AS start, due_date AS "end", status_code
       FROM project_milestones WHERE project_id=$1 AND is_active`,
      [projectId]
    );
    // Kritik yol (basit): DEPENDS_ON / BLOCKS zinciri üzerinde en uzun süre
    const blocking = deps.rows.filter((d) => d.blocks_schedule);
    res.json({
      project_id: Number(projectId),
      tasks: tasks.rows,
      dependencies: deps.rows,
      milestones: milestones.rows,
      critical_links: blocking,
    });
  } catch (err) {
    next(err);
  }
});

/** Takvim görünümü */
router.get('/calendar', async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    const from = req.query.from || '1900-01-01';
    const to = req.query.to || '2100-12-31';
    const params = [from, to];
    let where = `WHERE w.is_active=TRUE AND w.plan_end_date BETWEEN $1 AND $2`;
    if (projectId) {
      params.push(projectId);
      where += ` AND w.project_id=$${params.length}`;
    }
    const tasks = await pool.query(
      `
      SELECT w.id, w.work_item_no, w.title, w.plan_start_date, w.plan_end_date,
             w.project_id, p.project_code, 'task' AS event_type, s.status_code
      FROM work_items w
      JOIN projects p ON p.id = w.project_id
      LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
      ${where}
      ORDER BY w.plan_end_date
      LIMIT 500
      `,
      params
    );
    const msParams = [from, to];
    let msWhere = `WHERE m.is_active AND m.due_date BETWEEN $1 AND $2`;
    if (projectId) {
      msParams.push(projectId);
      msWhere += ` AND m.project_id=$${msParams.length}`;
    }
    const ms = await pool.query(
      `
      SELECT m.id, m.milestone_code AS work_item_no, m.milestone_name AS title,
             m.due_date AS plan_start_date, m.due_date AS plan_end_date,
             m.project_id, p.project_code, 'milestone' AS event_type, m.status_code
      FROM project_milestones m
      JOIN projects p ON p.id = m.project_id
      ${msWhere}
      `,
      msParams
    );
    res.json([...tasks.rows, ...ms.rows]);
  } catch (err) {
    next(err);
  }
});

/** Backlog (öncelik / rank) */
router.get('/backlog', async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    if (!projectId) return res.status(400).json({ hata: 'project_id zorunlu.' });
    const r = await pool.query(
      `
      SELECT w.*, s.status_code, s.status_name, pr.priority_code, pr.rank_no,
             t.type_code, t.type_name
      FROM work_items w
      LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
      LEFT JOIN prj_work_item_priorities pr ON pr.id = w.priority_id
      LEFT JOIN prj_work_item_types t ON t.id = w.type_id
      WHERE w.project_id=$1 AND w.is_active=TRUE
        AND w.sprint_id IS NULL
        AND COALESCE(s.is_done,FALSE)=FALSE
        AND COALESCE(s.is_cancelled,FALSE)=FALSE
      ORDER BY w.backlog_rank NULLS LAST, pr.rank_no NULLS LAST, w.id
      `,
      [projectId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/backlog/reorder', async (req, res, next) => {
  try {
    const { ordered_ids } = req.body;
    if (!Array.isArray(ordered_ids)) return res.status(400).json({ hata: 'ordered_ids dizi olmalı.' });
    for (let i = 0; i < ordered_ids.length; i++) {
      await pool.query(`UPDATE work_items SET backlog_rank=$2 WHERE id=$1`, [ordered_ids[i], (i + 1) * 10]);
    }
    res.json({ ok: true, count: ordered_ids.length });
  } catch (err) {
    next(err);
  }
});

/** Kaynak iş yükü */
router.get('/workload', async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    const params = [];
    let where = `WHERE w.is_active AND w.assignee_user_id IS NOT NULL
      AND COALESCE(s.is_done,FALSE)=FALSE AND COALESCE(s.is_cancelled,FALSE)=FALSE`;
    if (projectId) {
      params.push(projectId);
      where += ` AND w.project_id=$${params.length}`;
    }
    const r = await pool.query(
      `
      SELECT w.assignee_user_id AS user_id,
             u.user_code,
             TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name,
             COUNT(*)::int AS open_tasks,
             COALESCE(SUM(w.estimated_hours),0) AS estimated_hours,
             COALESCE(SUM(w.actual_hours),0) AS actual_hours
      FROM work_items w
      JOIN users u ON u.id = w.assignee_user_id
      LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
      ${where}
      GROUP BY w.assignee_user_id, u.user_code, u.first_name, u.last_name
      ORDER BY estimated_hours DESC
      `,
      params
    );
    res.json(r.rows.map((row) => ({
      ...row,
      overload_warning: Number(row.estimated_hours) > 160,
    })));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
