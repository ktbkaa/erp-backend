const { withTransaction } = require('../utils/withTransaction');
const { runAutomation } = require('./prjAutomationService');

async function transitionWorkItem(pool, { workItemId, transitionCode, toStatusId, note, userId }) {
  const result = await withTransaction(pool, async (client) => {
    const wiR = await client.query(`SELECT * FROM work_items WHERE id=$1 FOR UPDATE`, [workItemId]);
    if (!wiR.rows[0]) throw Object.assign(new Error('İş kaydı bulunamadı.'), { status: 404 });
    const wi = wiR.rows[0];
    const proj = await client.query(`SELECT * FROM projects WHERE id=$1`, [wi.project_id]);
    let wfId = proj.rows[0]?.workflow_id;
    if (!wfId) {
      const d = await client.query(`SELECT id FROM prj_workflows WHERE is_default=TRUE LIMIT 1`);
      wfId = d.rows[0]?.id;
    }
    let tr;
    if (transitionCode) {
      const t = await client.query(
        `
        SELECT * FROM prj_workflow_transitions
        WHERE workflow_id=$1 AND transition_code=$2 AND is_active=TRUE
          AND (from_status_id IS NULL OR from_status_id=$3)
        `,
        [wfId, transitionCode, wi.status_id]
      );
      tr = t.rows[0];
    } else if (toStatusId) {
      const t = await client.query(
        `
        SELECT * FROM prj_workflow_transitions
        WHERE workflow_id=$1 AND to_status_id=$2 AND is_active=TRUE
          AND (from_status_id IS NULL OR from_status_id=$3)
        LIMIT 1
        `,
        [wfId, toStatusId, wi.status_id]
      );
      tr = t.rows[0] || {
        to_status_id: toStatusId,
        block_if_open_children: true,
        require_fields: null,
        transition_code: 'FREE_MOVE',
      };
    }
    if (!tr) throw Object.assign(new Error('Geçersiz veya yetkisiz geçiş.'), { status: 400 });

    if (tr.require_fields?.length) {
      for (const f of tr.require_fields) {
        if (wi[f] == null || wi[f] === '') {
          throw Object.assign(new Error(`Zorunlu alan: ${f}`), { status: 400 });
        }
      }
    }

    const doneSt = await client.query(`SELECT id FROM prj_work_item_statuses WHERE is_done=TRUE`);
    const doneIds = new Set(doneSt.rows.map((x) => Number(x.id)));
    if (tr.block_if_open_children && doneIds.has(Number(tr.to_status_id))) {
      const kids = await client.query(
        `
        SELECT w.id FROM work_items w
        LEFT JOIN prj_work_item_statuses s ON s.id = w.status_id
        WHERE w.parent_id=$1 AND w.is_active=TRUE AND COALESCE(s.is_done,FALSE)=FALSE
          AND COALESCE(s.is_cancelled,FALSE)=FALSE
        `,
        [wi.id]
      );
      if (kids.rows[0]) {
        throw Object.assign(new Error('Açık alt görevler varken tamamlanamaz.'), { status: 400 });
      }
    }

    await client.query(
      `UPDATE work_items SET status_id=$2, updated_by=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [wi.id, tr.to_status_id, userId || null]
    );
    await client.query(
      `
      INSERT INTO work_item_history (work_item_id, user_id, field_name, old_value, new_value)
      VALUES ($1,$2,'status_id',$3,$4)
      `,
      [wi.id, userId || null, String(wi.status_id), String(tr.to_status_id)]
    );
    if (note) {
      await client.query(
        `INSERT INTO work_item_comments (work_item_id, user_id, body) VALUES ($1,$2,$3)`,
        [wi.id, userId || null, `[Geçiş:${tr.transition_code}] ${note}`]
      );
    }
    if (wi.parent_id) {
      const open = await client.query(
        `
        SELECT COUNT(*)::int AS c FROM work_items w
        LEFT JOIN prj_work_item_statuses s ON s.id=w.status_id
        WHERE w.parent_id=$1 AND w.is_active AND COALESCE(s.is_done,FALSE)=FALSE
          AND COALESCE(s.is_cancelled,FALSE)=FALSE
        `,
        [wi.parent_id]
      );
      if (open.rows[0].c === 0) {
        await client.query(`UPDATE work_items SET percent_complete=100 WHERE id=$1`, [wi.parent_id]);
      }
    }
    return {
      wi_id: wi.id,
      to_status_id: tr.to_status_id,
      transition_code: tr.transition_code,
      parent_id: wi.parent_id,
    };
  });

  if (result.parent_id) {
    await runAutomation(
      'WI_ALL_CHILDREN_DONE',
      { work_item_id: result.parent_id, child_id: result.wi_id },
      { eventKey: `children_done:${result.parent_id}:${result.wi_id}` }
    );
  }
  await runAutomation(
    'WI_STATUS',
    { work_item_id: result.wi_id, to_status_id: result.to_status_id },
    { eventKey: `status:${result.wi_id}:${result.transition_code}:${Date.now()}` }
  );
  return result;
}

module.exports = { transitionWorkItem };
