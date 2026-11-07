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

async function wouldCreateCycle(client, childId, newParentId) {
  if (!newParentId) return false;
  if (Number(childId) === Number(newParentId)) return true;
  let cur = Number(newParentId);
  const seen = new Set([Number(childId)]);
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    const r = await client.query(`SELECT parent_id FROM work_items WHERE id=$1`, [cur]);
    cur = r.rows[0]?.parent_id ? Number(r.rows[0].parent_id) : null;
  }
  return false;
}

async function workItemDetail(id) {
  const r = await pool.query(
    `
    SELECT w.*,
           t.type_code, t.type_name,
           s.status_code, s.status_name, s.is_done,
           pr.priority_code, pr.priority_name,
           p.project_code, p.project_name,
           TRIM(CONCAT(COALESCE(a.first_name,''),' ',COALESCE(a.last_name,''))) AS assignee_name,
           TRIM(CONCAT(COALESCE(rp.first_name,''),' ',COALESCE(rp.last_name,''))) AS reporter_name
    FROM work_items w
    JOIN projects p ON p.id = w.project_id
    LEFT JOIN prj_work_item_types t ON t.id = w.type_id
    LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
    LEFT JOIN prj_work_item_priorities pr ON pr.id = w.priority_id
    LEFT JOIN users a ON a.id = w.assignee_user_id
    LEFT JOIN users rp ON rp.id = w.reporter_user_id
    WHERE w.id=$1
    `,
    [id]
  );
  if (!r.rows[0]) return null;
  const [children, relations, logs, comments] = await Promise.all([
    pool.query(
      `SELECT id, work_item_no, title, status_id, percent_complete, assignee_user_id
       FROM work_items WHERE parent_id=$1 AND is_active=TRUE ORDER BY id`,
      [id]
    ),
    pool.query(
      `
      SELECT r.*, rt.relation_code, rt.relation_name,
             wf.work_item_no AS from_no, wt.work_item_no AS to_no
      FROM work_item_relations r
      JOIN prj_relation_types rt ON rt.id = r.relation_type_id
      JOIN work_items wf ON wf.id = r.from_work_item_id
      JOIN work_items wt ON wt.id = r.to_work_item_id
      WHERE r.from_work_item_id=$1 OR r.to_work_item_id=$1
      `,
      [id]
    ),
    pool.query(
      `SELECT * FROM work_logs WHERE work_item_id=$1 ORDER BY work_date DESC, id DESC LIMIT 100`,
      [id]
    ),
    pool.query(
      `SELECT c.*, u.user_code,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS user_name
       FROM work_item_comments c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.work_item_id=$1 ORDER BY c.id DESC LIMIT 100`,
      [id]
    ),
  ]);
  return {
    ...r.rows[0],
    children: children.rows,
    relations: relations.rows,
    work_logs: logs.rows,
    comments: comments.rows,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    let where = 'WHERE w.is_active=TRUE';
    where += andFirma('w.company_id', firmaId, params);
    if (req.query.project_id) {
      params.push(req.query.project_id);
      where += ` AND w.project_id=$${params.length}`;
    }
    if (req.query.parent_id === 'null') where += ' AND w.parent_id IS NULL';
    else if (req.query.parent_id) {
      params.push(req.query.parent_id);
      where += ` AND w.parent_id=$${params.length}`;
    }
    if (req.query.assignee_user_id) {
      params.push(req.query.assignee_user_id);
      where += ` AND w.assignee_user_id=$${params.length}`;
    }
    if (req.query.status_code) {
      params.push(req.query.status_code);
      where += ` AND s.status_code=$${params.length}`;
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      where += ` AND (w.work_item_no ILIKE $${params.length} OR w.title ILIKE $${params.length})`;
    }
    const sql = `
      SELECT w.*,
             t.type_code, t.type_name,
             s.status_code, s.status_name,
             pr.priority_code, pr.priority_name,
             p.project_code, p.project_name,
             TRIM(CONCAT(COALESCE(a.first_name,''),' ',COALESCE(a.last_name,''))) AS assignee_name
      FROM work_items w
      JOIN projects p ON p.id = w.project_id
      LEFT JOIN prj_work_item_types t ON t.id = w.type_id
      LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
      LEFT JOIN prj_work_item_priorities pr ON pr.id = w.priority_id
      LEFT JOIN users a ON a.id = w.assignee_user_id
      ${where}
      ORDER BY w.backlog_rank NULLS LAST, w.id DESC
      LIMIT 500
    `;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await workItemDetail(req.params.id);
    if (!row) return res.status(404).json({ hata: 'İş kaydı bulunamadı.' });
    const firmaId = firmaIdFromReq(req);
    if (firmaId && Number(row.company_id) !== Number(firmaId)) {
      return res.status(403).json({ hata: 'Bu firma için erişim yok.' });
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const title = trimOrNull(req.body.title);
    const project_id = req.body.project_id;
    if (!title || !project_id) {
      return res.status(400).json({ hata: 'title ve project_id zorunlu.' });
    }
    const plan_start = req.body.plan_start_date || null;
    const plan_end = req.body.plan_end_date || null;
    if (plan_start && plan_end && plan_end < plan_start) {
      return res.status(400).json({ hata: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    }

    const id = await withTransaction(pool, async (client) => {
      const proj = await client.query(`SELECT id, company_id FROM projects WHERE id=$1`, [project_id]);
      if (!proj.rows[0]) throw Object.assign(new Error('Proje bulunamadı.'), { status: 404 });
      const firmaId = firmaIdFromReq(req);
      if (firmaId && Number(proj.rows[0].company_id) !== Number(firmaId)) {
        throw Object.assign(new Error('Bu firma için proje erişimi yok.'), { status: 403 });
      }
      if (req.body.parent_id) {
        const par = await client.query(
          `SELECT id, project_id FROM work_items WHERE id=$1`,
          [req.body.parent_id]
        );
        if (!par.rows[0] || Number(par.rows[0].project_id) !== Number(project_id)) {
          throw Object.assign(new Error('Üst iş aynı projede olmalı.'), { status: 400 });
        }
      }
      let typeId = req.body.type_id || null;
      if (!typeId) {
        const t = await client.query(`SELECT id FROM prj_work_item_types WHERE type_code='TASK' LIMIT 1`);
        typeId = t.rows[0]?.id || null;
      }
      let statusId = req.body.status_id || null;
      if (!statusId) {
        const s = await client.query(`SELECT id FROM prj_work_item_statuses WHERE status_code='OPEN' LIMIT 1`);
        statusId = s.rows[0]?.id || null;
      }
      let priorityId = req.body.priority_id || null;
      if (!priorityId) {
        const p = await client.query(
          `SELECT id FROM prj_work_item_priorities WHERE priority_code='MEDIUM' LIMIT 1`
        );
        priorityId = p.rows[0]?.id || null;
      }
      const no =
        trimOrNull(req.body.work_item_no) || (await sonrakiKod(client, 'PRJ_WORK_ITEM'));
      const ins = await client.query(
        `
        INSERT INTO work_items (
          company_id, project_id, work_item_no, type_id, status_id, priority_id,
          title, description, parent_id, phase_id,
          assignee_user_id, reporter_user_id,
          plan_start_date, plan_end_date, estimated_hours, story_points, backlog_rank,
          labels, created_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,
          $11,$12,
          $13,$14,COALESCE($15,0),$16,$17,
          $18,$19
        ) RETURNING id
        `,
        [
          proj.rows[0].company_id,
          project_id,
          no,
          typeId,
          statusId,
          priorityId,
          title,
          trimOrNull(req.body.description),
          req.body.parent_id || null,
          req.body.phase_id || null,
          req.body.assignee_user_id || null,
          req.body.reporter_user_id || req.user?.id || null,
          plan_start,
          plan_end,
          req.body.estimated_hours,
          req.body.story_points || null,
          req.body.backlog_rank || null,
          Array.isArray(req.body.labels) ? req.body.labels : null,
          req.user?.id || null,
        ]
      );
      return ins.rows[0].id;
    });

    res.status(201).json(await workItemDetail(id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const curR = await pool.query(`SELECT * FROM work_items WHERE id=$1`, [req.params.id]);
    if (!curR.rows[0]) return res.status(404).json({ hata: 'İş kaydı bulunamadı.' });
    const cur = curR.rows[0];
    const firmaId = firmaIdFromReq(req);
    if (firmaId && Number(cur.company_id) !== Number(firmaId)) {
      return res.status(403).json({ hata: 'Bu firma için erişim yok.' });
    }
    const pick = (key, transform = (v) => v) =>
      (Object.prototype.hasOwnProperty.call(req.body, key) ? transform(req.body[key]) : cur[key]);

    const plan_start = pick('plan_start_date');
    const plan_end = pick('plan_end_date');
    if (plan_start && plan_end && String(plan_end) < String(plan_start)) {
      return res.status(400).json({ hata: 'Bitiş tarihi başlangıçtan önce olamaz.' });
    }

    await withTransaction(pool, async (client) => {
      const newParent = pick('parent_id');
      if (newParent !== cur.parent_id) {
        if (await wouldCreateCycle(client, cur.id, newParent)) {
          throw Object.assign(new Error('Döngüsel üst-alt ilişkisi engellendi.'), { status: 400 });
        }
      }
      const oldStatus = cur.status_id;
      const newStatus = pick('status_id');
      await client.query(
        `
        UPDATE work_items SET
          title=$2, description=$3, type_id=$4, status_id=$5, priority_id=$6,
          parent_id=$7, phase_id=$8, assignee_user_id=$9,
          plan_start_date=$10, plan_end_date=$11, actual_start_date=$12, actual_end_date=$13,
          estimated_hours=$14, actual_hours=$15, story_points=$16, percent_complete=$17,
          backlog_rank=$18, labels=$19, updated_by=$20, updated_at=CURRENT_TIMESTAMP
        WHERE id=$1
        `,
        [
          cur.id,
          pick('title', trimOrNull) || cur.title,
          pick('description', trimOrNull),
          pick('type_id'),
          newStatus,
          pick('priority_id'),
          newParent,
          pick('phase_id'),
          pick('assignee_user_id'),
          plan_start,
          plan_end,
          pick('actual_start_date'),
          pick('actual_end_date'),
          pick('estimated_hours'),
          pick('actual_hours'),
          pick('story_points'),
          pick('percent_complete'),
          pick('backlog_rank'),
          Object.prototype.hasOwnProperty.call(req.body, 'labels')
            ? (Array.isArray(req.body.labels) ? req.body.labels : null)
            : cur.labels,
          req.user?.id || null,
        ]
      );
      if (Number(oldStatus) !== Number(newStatus)) {
        await client.query(
          `
          INSERT INTO work_item_history (work_item_id, user_id, field_name, old_value, new_value)
          VALUES ($1,$2,'status_id',$3,$4)
          `,
          [cur.id, req.user?.id || null, String(oldStatus), String(newStatus)]
        );
      }
    });

    res.json(await workItemDetail(req.params.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

router.post('/:id/relations', async (req, res, next) => {
  try {
    const { to_work_item_id, relation_type_id, relation_code } = req.body;
    if (!to_work_item_id) return res.status(400).json({ hata: 'to_work_item_id zorunlu.' });
    const from = await pool.query(`SELECT * FROM work_items WHERE id=$1`, [req.params.id]);
    if (!from.rows[0]) return res.status(404).json({ hata: 'İş kaydı bulunamadı.' });
    let typeId = relation_type_id;
    if (!typeId && relation_code) {
      const t = await pool.query(
        `SELECT id FROM prj_relation_types WHERE relation_code=$1`,
        [relation_code]
      );
      typeId = t.rows[0]?.id;
    }
    if (!typeId) return res.status(400).json({ hata: 'relation_type_id veya relation_code zorunlu.' });

    // Cycle check for DEPENDS_ON / BLOCKS chains (simple parent walk on same relation)
    const cycle = await withTransaction(pool, async (client) => {
      let cur = Number(to_work_item_id);
      const target = Number(req.params.id);
      const seen = new Set();
      while (cur) {
        if (cur === target) return true;
        if (seen.has(cur)) break;
        seen.add(cur);
        const n = await client.query(
          `
          SELECT to_work_item_id AS next_id
          FROM work_item_relations
          WHERE from_work_item_id=$1 AND relation_type_id=$2
          LIMIT 1
          `,
          [cur, typeId]
        );
        cur = n.rows[0]?.next_id ? Number(n.rows[0].next_id) : null;
      }
      return false;
    });
    if (cycle) return res.status(400).json({ hata: 'Döngüsel bağımlılık engellendi.' });

    const r = await pool.query(
      `
      INSERT INTO work_item_relations (company_id, from_work_item_id, to_work_item_id, relation_type_id, created_by)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [from.rows[0].company_id, req.params.id, to_work_item_id, typeId, req.user?.id || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    const body = trimOrNull(req.body.body);
    if (!body) return res.status(400).json({ hata: 'body zorunlu.' });
    const r = await pool.query(
      `INSERT INTO work_item_comments (work_item_id, user_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user?.id || null, body]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/work-logs', async (req, res, next) => {
  try {
    const hours = Number(req.body.hours_spent);
    const work_date = req.body.work_date;
    if (!work_date || !(hours > 0)) {
      return res.status(400).json({ hata: 'work_date ve hours_spent (>0) zorunlu.' });
    }
    const wi = await pool.query(`SELECT * FROM work_items WHERE id=$1`, [req.params.id]);
    if (!wi.rows[0]) return res.status(404).json({ hata: 'İş kaydı bulunamadı.' });
    const userId = req.body.user_id || req.user?.id;
    if (!userId) return res.status(400).json({ hata: 'user_id zorunlu.' });

    // Basit çakışma: aynı gün + start/end çakışması
    if (req.body.start_time && req.body.end_time) {
      const clash = await pool.query(
        `
        SELECT id FROM work_logs
        WHERE user_id=$1 AND work_date=$2
          AND start_time IS NOT NULL AND end_time IS NOT NULL
          AND start_time < $4::time AND end_time > $3::time
        LIMIT 1
        `,
        [userId, work_date, req.body.start_time, req.body.end_time]
      );
      if (clash.rows[0]) {
        return res.status(400).json({ hata: 'Aynı zaman aralığında çakışan zaman kaydı var.' });
      }
    }

    const row = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `
        INSERT INTO work_logs (
          company_id, project_id, work_item_id, user_id, work_date,
          start_time, end_time, hours_spent, description, approval_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'SUBMITTED'))
        RETURNING *
        `,
        [
          wi.rows[0].company_id,
          wi.rows[0].project_id,
          wi.rows[0].id,
          userId,
          work_date,
          req.body.start_time || null,
          req.body.end_time || null,
          hours,
          trimOrNull(req.body.description),
          req.body.approval_status,
        ]
      );
      await client.query(
        `UPDATE work_items SET actual_hours = COALESCE(actual_hours,0) + $2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
        [wi.rows[0].id, hours]
      );
      return ins.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE work_items SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'İş kaydı bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
