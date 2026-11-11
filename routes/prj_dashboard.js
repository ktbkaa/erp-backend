const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq, andCompany } = require('../src/utils/firmaScope');

router.get('/overview', async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    if (!projectId) return res.status(400).json({ hata: 'project_id zorunlu.' });
    const p = await pool.query(
      `
      SELECT p.*, s.status_name, s.status_code, t.type_name,
             pt.partner_name,
             TRIM(CONCAT(COALESCE(mu.first_name,''),' ',COALESCE(mu.last_name,''))) AS manager_name
      FROM projects p
      LEFT JOIN prj_project_statuses s ON s.id=p.status_id
      LEFT JOIN prj_project_types t ON t.id=p.type_id
      LEFT JOIN partners pt ON pt.id=p.partner_id
      LEFT JOIN users mu ON mu.id=p.manager_user_id
      WHERE p.id=$1
      `,
      [projectId]
    );
    if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });

    const [tasks, overdue, critical, milestones, risks, recent, members] = await Promise.all([
      pool.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(st.is_done,FALSE)=FALSE AND COALESCE(st.is_cancelled,FALSE)=FALSE)::int AS open_count,
          COUNT(*) FILTER (WHERE COALESCE(st.is_done,FALSE)=TRUE)::int AS done_count,
          COUNT(*) FILTER (WHERE st.status_code='IN_PROGRESS')::int AS in_progress,
          COUNT(*)::int AS total
        FROM work_items w
        LEFT JOIN prj_work_item_statuses st ON st.id=w.status_id
        WHERE w.project_id=$1 AND w.is_active
        `,
        [projectId]
      ),
      pool.query(
        `
        SELECT w.id, w.work_item_no, w.title, w.plan_end_date, w.assignee_user_id
        FROM work_items w
        LEFT JOIN prj_work_item_statuses st ON st.id=w.status_id
        WHERE w.project_id=$1 AND w.is_active AND w.plan_end_date < CURRENT_DATE
          AND COALESCE(st.is_done,FALSE)=FALSE AND COALESCE(st.is_cancelled,FALSE)=FALSE
        ORDER BY w.plan_end_date LIMIT 20
        `,
        [projectId]
      ),
      pool.query(
        `
        SELECT w.id, w.work_item_no, w.title, pr.priority_code
        FROM work_items w
        JOIN prj_work_item_priorities pr ON pr.id=w.priority_id
        LEFT JOIN prj_work_item_statuses st ON st.id=w.status_id
        WHERE w.project_id=$1 AND w.is_active AND pr.priority_code IN ('CRITICAL','HIGHEST')
          AND COALESCE(st.is_done,FALSE)=FALSE
        LIMIT 20
        `,
        [projectId]
      ),
      pool.query(
        `
        SELECT * FROM project_milestones
        WHERE project_id=$1 AND is_active AND due_date >= CURRENT_DATE
        ORDER BY due_date LIMIT 10
        `,
        [projectId]
      ),
      pool.query(
        `SELECT * FROM project_risks WHERE project_id=$1 AND is_active ORDER BY score DESC, id DESC LIMIT 10`,
        [projectId]
      ),
      pool.query(
        `
        SELECT h.*, w.work_item_no
        FROM work_item_history h
        JOIN work_items w ON w.id=h.work_item_id
        WHERE w.project_id=$1
        ORDER BY h.id DESC LIMIT 20
        `,
        [projectId]
      ),
      pool.query(
        `
        SELECT m.*, r.role_code, u.user_code,
               TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name
        FROM project_members m
        LEFT JOIN prj_project_roles r ON r.id=m.role_id
        LEFT JOIN users u ON u.id=m.user_id
        WHERE m.project_id=$1 AND m.is_active
        `,
        [projectId]
      ),
    ]);

    const planned = Number(p.rows[0].planned_budget || 0);
    const actual = Number(p.rows[0].actual_cost || 0);
    res.json({
      project: p.rows[0],
      progress: {
        percent_complete: Number(p.rows[0].percent_complete || 0),
        ...tasks.rows[0],
      },
      overdue: overdue.rows,
      critical: critical.rows,
      upcoming_milestones: milestones.rows,
      risks: risks.rows,
      budget: {
        planned,
        actual,
        variance: planned - actual,
        overrun: planned > 0 && actual > planned,
      },
      team: members.rows,
      recent_activity: recent.rows,
    });
  } catch (err) {
    next(err);
  }
});

/** Firma geneli proje özeti (PRJT30 benzeri) */
router.get('/portfolio', async (req, res, next) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    let where = 'WHERE p.is_archived=FALSE AND p.is_active=TRUE';
    where += andCompany('p.company_id', firmaId, params);
    const r = await pool.query(
      `
      SELECT p.id, p.project_code, p.project_name, p.percent_complete,
             p.planned_budget, p.actual_cost, p.plan_start_date, p.plan_end_date,
             s.status_name, s.status_code, t.type_name,
             (SELECT COUNT(*)::int FROM work_items w WHERE w.project_id=p.id AND w.is_active) AS work_count,
             (SELECT COUNT(*)::int FROM work_items w
               JOIN prj_work_item_statuses st ON st.id=w.status_id
              WHERE w.project_id=p.id AND w.is_active AND w.plan_end_date < CURRENT_DATE
                AND COALESCE(st.is_done,FALSE)=FALSE) AS overdue_count
      FROM projects p
      LEFT JOIN prj_project_statuses s ON s.id=p.status_id
      LEFT JOIN prj_project_types t ON t.id=p.type_id
      ${where}
      ORDER BY p.id DESC
      LIMIT 200
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
