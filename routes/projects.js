const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq, andFirma } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

async function projectDetail(id) {
  const r = await pool.query(
    `
    SELECT p.*,
           t.type_code, t.type_name,
           c.category_code, c.category_name,
           s.status_code, s.status_name,
           pr.priority_code, pr.priority_name,
           pt.partner_code, pt.partner_name,
           TRIM(CONCAT(COALESCE(mu.first_name,''),' ',COALESCE(mu.last_name,''))) AS manager_name,
           TRIM(CONCAT(COALESCE(su.first_name,''),' ',COALESCE(su.last_name,''))) AS sponsor_name
    FROM projects p
    LEFT JOIN prj_project_types t ON t.id = p.type_id
    LEFT JOIN prj_project_categories c ON c.id = p.category_id
    LEFT JOIN prj_project_statuses s ON s.id = p.status_id
    LEFT JOIN prj_project_priorities pr ON pr.id = p.priority_id
    LEFT JOIN partners pt ON pt.id = p.partner_id
    LEFT JOIN users mu ON mu.id = p.manager_user_id
    LEFT JOIN users su ON su.id = p.sponsor_user_id
    WHERE p.id = $1
    `,
    [id]
  );
  if (!r.rows[0]) return null;
  const [members, phases, milestones, workCount] = await Promise.all([
    pool.query(
      `
      SELECT m.*, r.role_code, r.role_name,
             TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name,
             u.user_code
      FROM project_members m
      LEFT JOIN prj_project_roles r ON r.id = m.role_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.project_id=$1 AND m.is_active=TRUE
      ORDER BY m.id
      `,
      [id]
    ),
    pool.query(
      `SELECT * FROM project_phases WHERE project_id=$1 AND is_active=TRUE ORDER BY line_no, id`,
      [id]
    ),
    pool.query(
      `SELECT * FROM project_milestones WHERE project_id=$1 AND is_active=TRUE ORDER BY due_date NULLS LAST, id`,
      [id]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM work_items WHERE project_id=$1 AND is_active=TRUE`,
      [id]
    ),
  ]);
  return {
    ...r.rows[0],
    members: members.rows,
    phases: phases.rows,
    milestones: milestones.rows,
    work_item_count: workCount.rows[0]?.cnt || 0,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let where = 'WHERE 1=1';
    where += andFirma('p.company_id', firmaId, params);
    if (req.query.is_active === 'true') where += ' AND p.is_active=TRUE';
    if (req.query.is_active === 'false') where += ' AND p.is_active=FALSE';
    if (req.query.is_archived === 'true') where += ' AND p.is_archived=TRUE';
    else if (req.query.is_archived !== 'all') where += ' AND p.is_archived=FALSE';
    if (req.query.status_code) {
      params.push(req.query.status_code);
      where += ` AND s.status_code=$${params.length}`;
    }
    if (req.query.project_code) {
      params.push(`%${req.query.project_code}%`);
      where += ` AND p.project_code ILIKE $${params.length}`;
    }
    if (req.query.project_name) {
      params.push(`%${req.query.project_name}%`);
      where += ` AND p.project_name ILIKE $${params.length}`;
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      where += ` AND (p.project_code ILIKE $${params.length} OR p.project_name ILIKE $${params.length})`;
    }
    const sql = `
      SELECT p.*,
             t.type_name, s.status_name, s.status_code, pr.priority_name,
             pt.partner_name,
             TRIM(CONCAT(COALESCE(mu.first_name,''),' ',COALESCE(mu.last_name,''))) AS manager_name
      FROM projects p
      LEFT JOIN prj_project_types t ON t.id = p.type_id
      LEFT JOIN prj_project_statuses s ON s.id = p.status_id
      LEFT JOIN prj_project_priorities pr ON pr.id = p.priority_id
      LEFT JOIN partners pt ON pt.id = p.partner_id
      LEFT JOIN users mu ON mu.id = p.manager_user_id
      ${where}
      ORDER BY p.id DESC
      LIMIT 500
    `;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await projectDetail(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const firmaId = firmaIdFromReq(req);
    if (firmaId && Number(row.company_id) !== Number(firmaId)) {
      return res.status(403).json({ hata: 'Bu firma için proje erişimi yok.' });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req) || Number(req.body.company_id);
    if (!firmaId) return res.status(400).json({ hata: 'company_id / X-Firma-Id zorunlu.' });
    const project_name = trimOrNull(req.body.project_name);
    if (!project_name) return res.status(400).json({ hata: 'project_name zorunlu.' });
    const plan_start = req.body.plan_start_date || null;
    const plan_end = req.body.plan_end_date || null;
    if (plan_start && plan_end && plan_end < plan_start) {
      return res.status(400).json({ hata: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    }

    const row = await withTransaction(pool, async (client) => {
      let statusId = req.body.status_id || null;
      if (!statusId) {
        const st = await client.query(
          `SELECT id FROM prj_project_statuses WHERE status_code='10' LIMIT 1`
        );
        statusId = st.rows[0]?.id || null;
      }
      let priorityId = req.body.priority_id || null;
      if (!priorityId) {
        const pr = await client.query(
          `SELECT id FROM prj_project_priorities WHERE priority_code='MEDIUM' LIMIT 1`
        );
        priorityId = pr.rows[0]?.id || null;
      }
      const code =
        trimOrNull(req.body.project_code) || (await sonrakiKod(client, 'PRJ_PROJECT'));
      const ins = await client.query(
        `
        INSERT INTO projects (
          company_id, project_code, project_name, description,
          type_id, category_id, status_id, priority_id,
          partner_id, manager_user_id, sponsor_user_id, department_code,
          plant_id, warehouse_id,
          plan_start_date, plan_end_date,
          currency_code, planned_budget, expected_revenue,
          approach, portfolio_code, crm_opportunity_id,
          sales_order_id, sales_order_line_id, cost_center_code,
          created_by
        ) VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,$8,
          $9,$10,$11,$12,
          $13,$14,
          $15,$16,
          COALESCE($17,'TRY'), COALESCE($18,0), COALESCE($19,0),
          COALESCE($20,'classic'), $21, $22,
          $23, $24, $25,
          $26
        ) RETURNING id
        `,
        [
          firmaId,
          code,
          project_name,
          trimOrNull(req.body.description),
          req.body.type_id || null,
          req.body.category_id || null,
          statusId,
          priorityId,
          req.body.partner_id || null,
          req.body.manager_user_id || req.user?.id || null,
          req.body.sponsor_user_id || null,
          trimOrNull(req.body.department_code),
          req.body.plant_id || null,
          req.body.warehouse_id || null,
          plan_start,
          plan_end,
          trimOrNull(req.body.currency_code),
          req.body.planned_budget,
          req.body.expected_revenue,
          req.body.approach,
          trimOrNull(req.body.portfolio_code),
          req.body.crm_opportunity_id || null,
          req.body.sales_order_id || null,
          req.body.sales_order_line_id || null,
          trimOrNull(req.body.cost_center_code),
          req.user?.id || null,
        ]
      );
      const projectId = ins.rows[0].id;
      if (req.body.manager_user_id || req.user?.id) {
        const role = await client.query(`SELECT id FROM prj_project_roles WHERE role_code='PM' LIMIT 1`);
        await client.query(
          `
          INSERT INTO project_members (project_id, user_id, role_id, can_view_budget, can_edit_budget, can_view_costs)
          VALUES ($1,$2,$3,TRUE,TRUE,TRUE)
          ON CONFLICT (project_id, user_id) DO NOTHING
          `,
          [projectId, req.body.manager_user_id || req.user.id, role.rows[0]?.id || null]
        );
      }
      return projectId;
    });

    res.status(201).json(await projectDetail(row));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT * FROM projects WHERE id=$1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const cur = existing.rows[0];
    const firmaId = firmaIdFromReq(req);
    if (firmaId && Number(cur.company_id) !== Number(firmaId)) {
      return res.status(403).json({ hata: 'Bu firma için proje erişimi yok.' });
    }
    if (cur.is_archived && req.body.is_archived !== false) {
      return res.status(400).json({ hata: 'Arşivlenmiş proje düzenlenemez (önce arşivden çıkarın).' });
    }

    const pick = (key, transform = (v) => v) =>
      (Object.prototype.hasOwnProperty.call(req.body, key) ? transform(req.body[key]) : cur[key]);

    const plan_start = pick('plan_start_date');
    const plan_end = pick('plan_end_date');
    if (plan_start && plan_end && String(plan_end) < String(plan_start)) {
      return res.status(400).json({ hata: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    }

    await pool.query(
      `
      UPDATE projects SET
        project_name=$2, description=$3, type_id=$4, category_id=$5, status_id=$6, priority_id=$7,
        partner_id=$8, manager_user_id=$9, sponsor_user_id=$10, department_code=$11,
        plant_id=$12, warehouse_id=$13, plan_start_date=$14, plan_end_date=$15,
        actual_start_date=$16, actual_end_date=$17, currency_code=$18,
        planned_budget=$19, expected_revenue=$20, percent_complete=$21, approach=$22,
        portfolio_code=$23, cost_center_code=$24, is_archived=$25, is_active=$26,
        updated_by=$27, updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
      `,
      [
        req.params.id,
        pick('project_name', trimOrNull) || cur.project_name,
        pick('description', trimOrNull),
        pick('type_id'),
        pick('category_id'),
        pick('status_id'),
        pick('priority_id'),
        pick('partner_id'),
        pick('manager_user_id'),
        pick('sponsor_user_id'),
        pick('department_code', trimOrNull),
        pick('plant_id'),
        pick('warehouse_id'),
        plan_start,
        plan_end,
        pick('actual_start_date'),
        pick('actual_end_date'),
        pick('currency_code', trimOrNull) || cur.currency_code,
        pick('planned_budget'),
        pick('expected_revenue'),
        pick('percent_complete'),
        pick('approach') || cur.approach,
        pick('portfolio_code', trimOrNull),
        pick('cost_center_code', trimOrNull),
        pick('is_archived'),
        pick('is_active'),
        req.user?.id || null,
      ]
    );
    res.json(await projectDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/archive', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE projects SET is_archived=TRUE, updated_at=CURRENT_TIMESTAMP, updated_by=$2 WHERE id=$1 RETURNING id`,
      [req.params.id, req.user?.id || null]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    res.json(await projectDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', async (req, res, next) => {
  try {
    const { user_id, role_id, can_view_budget, can_edit_budget, can_view_costs } = req.body;
    if (!user_id) return res.status(400).json({ hata: 'user_id zorunlu.' });
    const r = await pool.query(
      `
      INSERT INTO project_members (project_id, user_id, role_id, can_view_budget, can_edit_budget, can_view_costs)
      VALUES ($1,$2,$3,COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,FALSE))
      ON CONFLICT (project_id, user_id) DO UPDATE SET
        role_id=EXCLUDED.role_id,
        can_view_budget=EXCLUDED.can_view_budget,
        can_edit_budget=EXCLUDED.can_edit_budget,
        can_view_costs=EXCLUDED.can_view_costs,
        is_active=TRUE
      RETURNING *
      `,
      [req.params.id, user_id, role_id || null, can_view_budget, can_edit_budget, can_view_costs]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/phases', async (req, res, next) => {
  try {
    const p = await pool.query(`SELECT company_id FROM projects WHERE id=$1`, [req.params.id]);
    if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const phase_name = trimOrNull(req.body.phase_name);
    if (!phase_name) return res.status(400).json({ hata: 'phase_name zorunlu.' });
    const code =
      trimOrNull(req.body.phase_code) ||
      (await withTransaction(pool, async (c) => sonrakiKod(c, 'PRJ_PHASE')));
    const r = await pool.query(
      `
      INSERT INTO project_phases (
        project_id, company_id, phase_code, phase_name, parent_phase_id, line_no,
        plan_start_date, plan_end_date, description
      ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,10),$7,$8,$9)
      RETURNING *
      `,
      [
        req.params.id,
        p.rows[0].company_id,
        code,
        phase_name,
        req.body.parent_phase_id || null,
        req.body.line_no,
        req.body.plan_start_date || null,
        req.body.plan_end_date || null,
        trimOrNull(req.body.description),
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE projects SET is_active=FALSE, is_archived=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
