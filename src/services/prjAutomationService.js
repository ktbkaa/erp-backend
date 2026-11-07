/**
 * PRJ otomasyon çalıştırıcı — idempotent (event_key unique).
 * Test ortamında e-posta göndermez; log + in-app payload üretir.
 */
const pool = require('../../db');

async function runAutomation(triggerCode, payload = {}, { eventKey } = {}) {
  const key = eventKey || `${triggerCode}:${payload.work_item_id || payload.project_id || 'x'}:${Date.now()}`;
  const autos = await pool.query(
    `SELECT * FROM prj_automations WHERE is_enabled=TRUE AND trigger_code=$1 ORDER BY priority, id`,
    [triggerCode]
  );
  const results = [];
  for (const a of autos.rows) {
    const ek = `${a.automation_code}:${key}`;
    try {
      const exists = await pool.query(`SELECT 1 FROM prj_automation_logs WHERE event_key=$1`, [ek]);
      if (exists.rows[0]) {
        results.push({ automation: a.automation_code, status: 'skip' });
        continue;
      }
      const action = a.action_json || {};
      let detail = { action: action.action, payload };
      if (action.action === 'CREATE_CHECKLIST' && payload.project_id) {
        const defaults = [
          'Açık işler kapatıldı veya taşındı',
          'Maliyetler gözden geçirildi',
          'Dokümanlar arşivlendi',
          'Müşteri kabulü alındı',
          'Finans mutabakatı yapıldı',
        ];
        for (let i = 0; i < defaults.length; i++) {
          await pool.query(
            `INSERT INTO project_close_checklists (project_id, line_no, item_text) VALUES ($1,$2,$3)`,
            [payload.project_id, (i + 1) * 10, defaults[i]]
          );
        }
        detail.checklist = defaults.length;
      }
      if (action.action === 'TRANSITION' && payload.work_item_id && action.to_status) {
        const st = await pool.query(
          `SELECT id FROM prj_work_item_statuses WHERE status_code=$1`,
          [action.to_status]
        );
        if (st.rows[0]) {
          await pool.query(
            `UPDATE work_items SET status_id=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
            [payload.work_item_id, st.rows[0].id]
          );
          detail.transitioned_to = action.to_status;
        }
      }
      await pool.query(
        `
        INSERT INTO prj_automation_logs (automation_id, event_key, payload, status_code, finished_at)
        VALUES ($1,$2,$3,'ok',CURRENT_TIMESTAMP)
        `,
        [a.id, ek, JSON.stringify(detail)]
      );
      results.push({ automation: a.automation_code, status: 'ok', detail });
    } catch (err) {
      await pool.query(
        `
        INSERT INTO prj_automation_logs (automation_id, event_key, payload, status_code, error_message, finished_at)
        VALUES ($1,$2,$3,'fail',$4,CURRENT_TIMESTAMP)
        ON CONFLICT (event_key) DO NOTHING
        `,
        [a.id, ek, JSON.stringify(payload), err.message]
      ).catch(() => {});
      results.push({ automation: a.automation_code, status: 'fail', error: err.message });
    }
  }
  return results;
}

async function notifyAssigneeOnAssign(workItemId, assigneeUserId) {
  if (!assigneeUserId) return [];
  const auto = await runAutomation('WI_ASSIGNED', { work_item_id: workItemId, assignee_user_id: assigneeUserId }, {
    eventKey: `assign:${workItemId}:${assigneeUserId}`,
  });
  try {
    const { withTransaction } = require('../utils/withTransaction');
    const { notifyAssignment } = require('./prjNotifyService');
    await withTransaction(pool, async (client) => {
      const wi = await client.query(`SELECT * FROM work_items WHERE id=$1`, [workItemId]);
      if (wi.rows[0]) await notifyAssignment(client, { workItem: wi.rows[0], assigneeUserId });
    });
  } catch (_) { /* e-posta opsiyonel */ }
  return auto;
}

module.exports = { runAutomation, notifyAssigneeOnAssign };
