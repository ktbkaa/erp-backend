const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { transitionWorkItem } = require('../src/services/prjWorkflowService');

const DEFAULT_COLS = ['OPEN', 'TODO', 'IN_PROGRESS', 'REVIEW', 'APPROVAL', 'DONE'];

async function ensureBoard(client, projectId, companyId) {
  let b = await client.query(
    `SELECT * FROM prj_boards WHERE project_id=$1 AND is_active=TRUE ORDER BY id LIMIT 1`,
    [projectId]
  );
  if (b.rows[0]) return b.rows[0];
  const code = await sonrakiKod(client, 'PRJ_BOARD');
  const wf = await client.query(`SELECT id FROM prj_workflows WHERE is_default=TRUE LIMIT 1`);
  const ins = await client.query(
    `
    INSERT INTO prj_boards (company_id, project_id, board_code, board_name, board_type, workflow_id)
    VALUES ($1,$2,$3,'Kanban','kanban',$4) RETURNING *
    `,
    [companyId, projectId, code, wf.rows[0]?.id || null]
  );
  const board = ins.rows[0];
  let line = 10;
  for (const map of DEFAULT_COLS) {
    const st = await client.query(
      `SELECT id, status_name FROM prj_work_item_statuses WHERE status_code=$1`,
      [map]
    );
    if (!st.rows[0]) continue;
    await client.query(
      `
      INSERT INTO prj_board_columns (board_id, status_id, column_name, line_no, wip_limit)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (board_id, status_id) DO NOTHING
      `,
      [board.id, st.rows[0].id, st.rows[0].status_name, line, map === 'IN_PROGRESS' ? 5 : null]
    );
    line += 10;
  }
  return board;
}

router.get('/', async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    if (!projectId) return res.status(400).json({ hata: 'project_id zorunlu.' });
    const board = await withTransaction(pool, async (client) => {
      const p = await client.query(`SELECT id, company_id FROM projects WHERE id=$1`, [projectId]);
      if (!p.rows[0]) throw Object.assign(new Error('Proje bulunamadı.'), { status: 404 });
      const firmaId = firmaIdFromReq(req);
      if (firmaId && Number(p.rows[0].company_id) !== Number(firmaId)) {
        throw Object.assign(new Error('Firma erişimi yok.'), { status: 403 });
      }
      return ensureBoard(client, projectId, p.rows[0].company_id);
    });

    const cols = await pool.query(
      `
      SELECT c.*, s.status_code, s.status_name
      FROM prj_board_columns c
      JOIN prj_work_item_statuses s ON s.id = c.status_id
      WHERE c.board_id=$1 AND c.is_active=TRUE
      ORDER BY c.line_no
      `,
      [board.id]
    );
    const items = await pool.query(
      `
      SELECT w.id, w.work_item_no, w.title, w.status_id, w.priority_id, w.assignee_user_id,
             w.plan_end_date, w.percent_complete, w.board_rank, w.estimated_hours,
             s.status_code, pr.priority_code, pr.priority_name,
             TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS assignee_name,
             CASE WHEN w.plan_end_date < CURRENT_DATE AND COALESCE(s.is_done,FALSE)=FALSE THEN TRUE ELSE FALSE END AS is_overdue
      FROM work_items w
      LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
      LEFT JOIN prj_work_item_priorities pr ON pr.id = w.priority_id
      LEFT JOIN users u ON u.id = w.assignee_user_id
      WHERE w.project_id=$1 AND w.is_active=TRUE AND w.parent_id IS NULL
      ORDER BY w.board_rank NULLS LAST, w.id
      `,
      [projectId]
    );

    const columns = cols.rows.map((c) => {
      const cards = items.rows.filter((i) => Number(i.status_id) === Number(c.status_id));
      return {
        ...c,
        card_count: cards.length,
        wip_exceeded: c.wip_limit != null && cards.length > c.wip_limit,
        cards,
      };
    });

    res.json({ board, columns });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

router.post('/move', async (req, res, next) => {
  try {
    const { work_item_id, to_status_id, board_rank } = req.body;
    if (!work_item_id || !to_status_id) {
      return res.status(400).json({ hata: 'work_item_id ve to_status_id zorunlu.' });
    }
    const wi = await pool.query(`SELECT project_id, status_id FROM work_items WHERE id=$1`, [work_item_id]);
    if (!wi.rows[0]) return res.status(404).json({ hata: 'İş bulunamadı.' });

    const board = await pool.query(
      `SELECT id FROM prj_boards WHERE project_id=$1 AND is_active LIMIT 1`,
      [wi.rows[0].project_id]
    );
    if (board.rows[0]) {
      const col = await pool.query(
        `SELECT wip_limit FROM prj_board_columns WHERE board_id=$1 AND status_id=$2`,
        [board.rows[0].id, to_status_id]
      );
      if (col.rows[0]?.wip_limit != null) {
        const cnt = await pool.query(
          `SELECT COUNT(*)::int AS c FROM work_items WHERE project_id=$1 AND status_id=$2 AND is_active AND id<>$3`,
          [wi.rows[0].project_id, to_status_id, work_item_id]
        );
        if (cnt.rows[0].c >= col.rows[0].wip_limit) {
          return res.status(400).json({ hata: `WIP limiti aşıldı (${col.rows[0].wip_limit}).` });
        }
      }
    }

    await transitionWorkItem(pool, {
      workItemId: work_item_id,
      toStatusId: to_status_id,
      note: 'board-move',
      userId: req.user?.id,
    });
    if (board_rank != null) {
      await pool.query(`UPDATE work_items SET board_rank=$2 WHERE id=$1`, [work_item_id, board_rank]);
    }
    const row = await pool.query(
      `SELECT w.*, s.status_code, s.status_name FROM work_items w
       LEFT JOIN prj_work_item_statuses s ON s.id=w.status_id WHERE w.id=$1`,
      [work_item_id]
    );
    res.json(row.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

module.exports = router;
