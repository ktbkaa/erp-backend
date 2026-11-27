const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function defaultStatusId(client, code = '10') {
  const r = await client.query(`SELECT id FROM prj_project_statuses WHERE status_code=$1`, [code]);
  return r.rows[0]?.id || null;
}

/** CRM fırsatından proje */
router.post('/from-opportunity/:id', async (req, res, next) => {
  try {
    const row = await withTransaction(pool, async (client) => {
      const f = await client.query(`SELECT * FROM crm_opportunities WHERE id=$1`, [req.params.id]);
      if (!f.rows[0]) throw Object.assign(new Error('Fırsat bulunamadı.'), { status: 404 });
      const opp = f.rows[0];
      const firmaId = firmaIdFromReq(req) || opp.company_id;
      if (!firmaId) throw Object.assign(new Error('company_id zorunlu.'), { status: 400 });
      const code = await sonrakiKod(client, 'PRJ_PROJECT');
      const statusId = await defaultStatusId(client);
      const type = await client.query(`SELECT id FROM prj_project_types WHERE type_code='MUSTERI'`);
      const ins = await client.query(
        `
        INSERT INTO projects (
          company_id, project_code, project_name, description, type_id, status_id,
          partner_id, manager_user_id, currency_code, expected_revenue,
          crm_opportunity_id, approach, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'TRY'),COALESCE($10,0),$11,'classic',$12)
        RETURNING *
        `,
        [
          firmaId,
          code,
          req.body.project_name || opp.firsat_name || opp.opportunity_name || `Fırsat ${opp.id}`,
          opp.aciklama || opp.description || null,
          type.rows[0]?.id || null,
          statusId,
          opp.partner_id || null,
          opp.takip_by_id || opp.created_by_user_id || req.user?.id || null,
          opp.para_birimi || opp.currency_code,
          opp.beklenen_gelir || opp.expected_revenue,
          opp.id,
          req.user?.id || null,
        ]
      );
      return ins.rows[0];
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

/** Satış siparişinden proje (SALT01) */
router.post('/from-sales-order/:id', async (req, res, next) => {
  try {
    const row = await withTransaction(pool, async (client) => {
      const so = await client.query(`SELECT * FROM sales_orders WHERE id=$1`, [req.params.id]);
      if (!so.rows[0]) throw Object.assign(new Error('Satış siparişi bulunamadı.'), { status: 404 });
      const o = so.rows[0];
      const firmaId = firmaIdFromReq(req) || o.company_id;
      const code = req.body.project_code || (await sonrakiKod(client, 'PRJ_PROJECT'));
      const statusId = await defaultStatusId(client);
      const type = await client.query(`SELECT id FROM prj_project_types WHERE type_code='MUSTERI'`);
      const lineId = req.body.sales_order_line_id || null;
      const ins = await client.query(
        `
        INSERT INTO projects (
          company_id, project_code, project_name, description, type_id, status_id,
          partner_id, plant_id, warehouse_id, currency_code, expected_revenue,
          sales_order_id, sales_order_line_id, approach, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'TRY'),COALESCE($11,0),$12,$13,'classic',$14)
        RETURNING *
        `,
        [
          firmaId,
          code,
          req.body.project_name || `Sipariş ${o.order_no || o.id}`,
          o.description || null,
          type.rows[0]?.id || null,
          statusId,
          o.partner_id || null,
          o.plant_id || null,
          o.warehouse_id || null,
          o.currency_code,
          o.grand_total || o.total_amount || 0,
          o.id,
          lineId,
          req.user?.id || null,
        ]
      );
      const project = ins.rows[0];
      await client.query(
        `
        INSERT INTO project_sales_links (project_id, company_id, document_type, document_id, document_line_id)
        VALUES ($1,$2,'sales_order',$3,$4)
        ON CONFLICT DO NOTHING
        `,
        [project.id, firmaId, o.id, lineId]
      );
      // Sipariş project_code güncelle (serbest alan korunur)
      await client.query(
        `UPDATE sales_orders SET project_code=COALESCE(NULLIF(project_code,''), $2) WHERE id=$1`,
        [o.id, project.project_code]
      ).catch(() => {});
      return project;
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

/** Satınalma belgesini projeye bağla (V10) */
router.post('/link-purchase', async (req, res, next) => {
  try {
    const { project_id, document_type, document_id, document_line_id, work_item_id } = req.body;
    if (!project_id || !document_type || !document_id) {
      return res.status(400).json({ hata: 'project_id, document_type, document_id zorunlu.' });
    }
    const p = await pool.query(`SELECT company_id, project_code FROM projects WHERE id=$1`, [project_id]);
    if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const r = await pool.query(
      `
      INSERT INTO project_purchase_links (project_id, company_id, work_item_id, document_type, document_id, document_line_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (document_type, document_id, document_line_id) DO UPDATE
        SET project_id=EXCLUDED.project_id, work_item_id=EXCLUDED.work_item_id
      RETURNING *
      `,
      [project_id, p.rows[0].company_id, work_item_id || null, document_type, document_id, document_line_id || null]
    );
    if (document_type === 'purchase_order') {
      await pool.query(
        `UPDATE purchase_orders SET project_code=COALESCE(NULLIF(project_code,''), $2) WHERE id=$1`,
        [document_id, p.rows[0].project_code]
      ).catch(() => {});
    }
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

/** Şablondan proje oluştur */
router.post('/from-template/:templateCode', async (req, res, next) => {
  try {
    const firmaId = firmaIdFromReq(req) || req.body.company_id;
    if (!firmaId) return res.status(400).json({ hata: 'company_id / X-Firma-Id zorunlu.' });
    const result = await withTransaction(pool, async (client) => {
      const tpl = await client.query(
        `SELECT * FROM prj_project_templates WHERE template_code=$1 AND is_active`,
        [req.params.templateCode]
      );
      if (!tpl.rows[0]) throw Object.assign(new Error('Şablon bulunamadı.'), { status: 404 });
      const t = tpl.rows[0];
      const code = req.body.project_code || (await sonrakiKod(client, 'PRJ_PROJECT'));
      const statusId = await defaultStatusId(client);
      const ins = await client.query(
        `
        INSERT INTO projects (
          company_id, project_code, project_name, description, type_id, status_id,
          partner_id, manager_user_id, approach, plan_start_date, plan_end_date, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
        `,
        [
          firmaId,
          code,
          req.body.project_name || t.template_name,
          t.description,
          t.project_type_id || req.body.type_id || null,
          statusId,
          req.body.partner_id || null,
          req.body.manager_user_id || req.user?.id || null,
          t.approach || 'classic',
          req.body.plan_start_date || null,
          req.body.plan_end_date || null,
          req.user?.id || null,
        ]
      );
      const project = ins.rows[0];
      const items = await client.query(
        `SELECT * FROM prj_project_template_items WHERE template_id=$1 ORDER BY line_no`,
        [t.id]
      );
      const phaseMap = {};
      const openStatus = await client.query(`SELECT id FROM prj_work_item_statuses WHERE status_code='OPEN'`);
      for (const it of items.rows) {
        if (it.item_kind === 'phase') {
          const ph = await client.query(
            `
            INSERT INTO project_phases (project_id, company_id, phase_code, phase_name, line_no, description)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
            `,
            [project.id, firmaId, it.code || `PH${it.line_no}`, it.title, it.line_no, it.description]
          );
          phaseMap[it.line_no] = ph.rows[0].id;
        } else if (it.item_kind === 'milestone') {
          await client.query(
            `
            INSERT INTO project_milestones (project_id, company_id, milestone_code, milestone_name)
            VALUES ($1,$2,$3,$4)
            `,
            [project.id, firmaId, it.code || `MS${it.line_no}`, it.title]
          );
        } else {
          let typeId = null;
          if (it.work_item_type_code) {
            const wt = await client.query(
              `SELECT id FROM prj_work_item_types WHERE type_code=$1`,
              [it.work_item_type_code]
            );
            typeId = wt.rows[0]?.id || null;
          }
          const no = await sonrakiKod(client, 'PRJ_WORK_ITEM');
          const est = Number(it.estimated_hours || 0);
          const phaseId = it.parent_line_no ? phaseMap[it.parent_line_no] || null : null;
          await client.query(
            `
            INSERT INTO work_items (
              company_id, project_id, work_item_no, type_id, status_id, title,
              estimated_hours, phase_id, description, created_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7::numeric,$8,$9,$10)
            `,
            [
              firmaId,
              project.id,
              no,
              typeId,
              openStatus.rows[0]?.id || null,
              it.title,
              Number.isFinite(est) ? est : 0,
              phaseId,
              it.description || null,
              req.user?.id || null,
            ]
          );
        }
      }
      return project;
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

/** Proje kapat + checklist */
router.post('/projects/:id/close', async (req, res, next) => {
  try {
    const { runAutomation } = require('../src/services/prjAutomationService');
    const done = await withTransaction(pool, async (client) => {
      const p = await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`, [req.params.id]);
      if (!p.rows[0]) throw Object.assign(new Error('Proje bulunamadı.'), { status: 404 });
      const open = await client.query(
        `
        SELECT COUNT(*)::int AS c FROM work_items w
        LEFT JOIN prj_work_item_statuses s ON s.id=w.status_id
        WHERE w.project_id=$1 AND w.is_active AND COALESCE(s.is_done,FALSE)=FALSE
          AND COALESCE(s.is_cancelled,FALSE)=FALSE
        `,
        [req.params.id]
      );
      if (open.rows[0].c > 0 && !req.body.force) {
        throw Object.assign(
          new Error(`Açık ${open.rows[0].c} iş var. force=true ile kapatabilirsiniz.`),
          { status: 400 }
        );
      }
      const st = await client.query(`SELECT id FROM prj_project_statuses WHERE status_code='80'`);
      await client.query(
        `
        UPDATE projects SET status_id=$2, closed_at=CURRENT_TIMESTAMP, close_notes=$3,
          actual_end_date=COALESCE(actual_end_date, CURRENT_DATE),
          percent_complete=100, updated_at=CURRENT_TIMESTAMP
        WHERE id=$1
        `,
        [req.params.id, st.rows[0]?.id || p.rows[0].status_id, req.body.close_notes || null]
      );
      return p.rows[0];
    });
    await runAutomation(
      'PROJECT_STATUS',
      { project_id: req.params.id, to: '80' },
      { eventKey: `project_close:${req.params.id}` }
    );
    let approvalMeta = null;
    try {
      const { notifyProjectClose } = require('../src/services/prjNotifyService');
      approvalMeta = await withTransaction(pool, async (client) => {
        const proj = await client.query(`SELECT * FROM projects WHERE id=$1`, [req.params.id]);
        return notifyProjectClose(client, { project: proj.rows[0], userId: req.user?.id || null });
      });
    } catch (err) {
      approvalMeta = { hata: err.message };
    }
    const full = await pool.query(`SELECT * FROM projects WHERE id=$1`, [req.params.id]);
    const cl = await pool.query(
      `SELECT * FROM project_close_checklists WHERE project_id=$1 ORDER BY line_no`,
      [req.params.id]
    );
    res.json({ project: full.rows[0], checklist: cl.rows, approval_meta: approvalMeta });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ hata: err.message });
    next(err);
  }
});

module.exports = router;
