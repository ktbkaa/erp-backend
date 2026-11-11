const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq, andCompany } = require('../src/utils/firmaScope');
const { runAutomation } = require('../src/services/prjAutomationService');

/** Liste: proje bütçe özetleri (UI) */
router.get('/', async (req, res, next) => {
  try {
    if (req.query.project_id) {
      const p = await pool.query(`SELECT * FROM projects WHERE id=$1`, [req.query.project_id]);
      if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
      const actual = Number(p.rows[0].actual_cost || 0);
      const planned = Number(p.rows[0].planned_budget || 0);
      const revenue = Number(p.rows[0].actual_revenue || p.rows[0].expected_revenue || 0);
      return res.json([{
        id: p.rows[0].id,
        project_code: p.rows[0].project_code,
        project_name: p.rows[0].project_name,
        planned_budget: planned,
        actual_cost: actual,
        variance: planned - actual,
        gross_result: revenue - actual,
      }]);
    }
    const firmaId = companyIdFromReq(req);
    const params = [];
    let where = 'WHERE p.is_active=TRUE AND p.is_archived=FALSE';
    where += andCompany('p.company_id', firmaId, params);
    const r = await pool.query(
      `
      SELECT p.id, p.project_code, p.project_name, p.currency_code,
             p.planned_budget, p.actual_cost,
             (p.planned_budget - p.actual_cost) AS variance,
             (COALESCE(p.actual_revenue, p.expected_revenue, 0) - p.actual_cost) AS gross_result
      FROM projects p
      ${where}
      ORDER BY p.id DESC LIMIT 200
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/lines', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT *, (planned_amount - COALESCE(actual_amount,0)) AS remaining_amount
      FROM project_budget_lines
      WHERE project_id=$1 AND is_active=TRUE
      ORDER BY line_no, id
      `,
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/lines', async (req, res, next) => {
  try {
    const p = await pool.query(`SELECT company_id FROM projects WHERE id=$1`, [req.params.projectId]);
    if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const {
      category_code, category_name, planned_qty, uom_code, unit_price,
      currency_code, exchange_rate, planned_amount, description, line_no,
    } = req.body;
    if (!category_code || !category_name) {
      return res.status(400).json({ hata: 'category_code ve category_name zorunlu.' });
    }
    const amount =
      planned_amount != null
        ? Number(planned_amount)
        : Number(planned_qty || 0) * Number(unit_price || 0) * Number(exchange_rate || 1);
    const r = await pool.query(
      `
      INSERT INTO project_budget_lines (
        project_id, company_id, line_no, category_code, category_name,
        planned_qty, uom_code, unit_price, currency_code, exchange_rate,
        planned_amount, description
      ) VALUES ($1,$2,COALESCE($3::numeric,10),$4,$5,$6,$7,$8,COALESCE($9,'TRY'),COALESCE($10::numeric,1),$11,$12)
      RETURNING *
      `,
      [
        req.params.projectId, p.rows[0].company_id, line_no, category_code, category_name,
        planned_qty || 0, uom_code || null, unit_price || 0, currency_code, exchange_rate,
        amount, description || null,
      ]
    );
    const sum = await pool.query(
      `SELECT COALESCE(SUM(planned_amount),0) AS t FROM project_budget_lines WHERE project_id=$1 AND is_active`,
      [req.params.projectId]
    );
    await pool.query(`UPDATE projects SET planned_budget=$2 WHERE id=$1`, [
      req.params.projectId,
      sum.rows[0].t,
    ]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/costs', async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT * FROM project_cost_entries
      WHERE project_id=$1
        AND ($2::bool IS NULL OR is_commitment = $2)
      ORDER BY entry_date DESC, id DESC
      `,
      [req.params.projectId, req.query.commitment === undefined ? null : req.query.commitment === 'true']
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:projectId/costs', async (req, res, next) => {
  try {
    const p = await pool.query(`SELECT * FROM projects WHERE id=$1`, [req.params.projectId]);
    if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const {
      category_code, amount, currency_code, exchange_rate, source_module,
      source_table, source_id, is_commitment, work_item_id, description, entry_date,
    } = req.body;
    if (!category_code || amount == null || !source_module || !source_table || !source_id) {
      return res.status(400).json({
        hata: 'category_code, amount, source_module, source_table, source_id zorunlu.',
      });
    }
    const rate = Number(exchange_rate || 1);
    const amt = Number(amount);
    const r = await pool.query(
      `
      INSERT INTO project_cost_entries (
        project_id, company_id, work_item_id, entry_date, category_code,
        amount, currency_code, exchange_rate, amount_company,
        source_module, source_table, source_id, is_commitment, description
      ) VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,COALESCE($7,'TRY'),$8,$9,$10,$11,$12,COALESCE($13,FALSE),$14)
      ON CONFLICT (source_module, source_table, source_id, category_code) DO UPDATE SET
        amount = EXCLUDED.amount,
        amount_company = EXCLUDED.amount_company,
        exchange_rate = EXCLUDED.exchange_rate
      RETURNING *
      `,
      [
        req.params.projectId, p.rows[0].company_id, work_item_id || null, entry_date,
        category_code, amt, currency_code, rate, amt * rate,
        source_module, source_table, source_id, is_commitment, description || null,
      ]
    );

    // Gerçekleşen (taahhüt değil) toplamı projeye yaz
    const sum = await pool.query(
      `
      SELECT COALESCE(SUM(COALESCE(amount_company, amount)),0) AS t
      FROM project_cost_entries WHERE project_id=$1 AND is_commitment=FALSE
      `,
      [req.params.projectId]
    );
    await pool.query(`UPDATE projects SET actual_cost=$2 WHERE id=$1`, [
      req.params.projectId,
      sum.rows[0].t,
    ]);

    let approvalMeta = null;
    if (Number(sum.rows[0].t) > Number(p.rows[0].planned_budget || 0) && Number(p.rows[0].planned_budget) > 0) {
      await runAutomation(
        'BUDGET_OVERRUN',
        { project_id: req.params.projectId, actual: sum.rows[0].t, planned: p.rows[0].planned_budget },
        { eventKey: `budget_overrun:${req.params.projectId}:${Math.floor(Number(sum.rows[0].t))}` }
      );
      try {
        const { withTransaction } = require('../src/utils/withTransaction');
        const { notifyBudgetOverrun } = require('../src/services/prjNotifyService');
        approvalMeta = await withTransaction(pool, async (client) =>
          notifyBudgetOverrun(client, {
            project: p.rows[0],
            actual: sum.rows[0].t,
            planned: p.rows[0].planned_budget,
            userId: req.user?.id || null,
          })
        );
      } catch (err) {
        approvalMeta = { hata: err.message };
      }
    }
    res.status(201).json({ ...r.rows[0], approval_meta: approvalMeta });
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId/summary', async (req, res, next) => {
  try {
    const p = await pool.query(`SELECT * FROM projects WHERE id=$1`, [req.params.projectId]);
    if (!p.rows[0]) return res.status(404).json({ hata: 'Proje bulunamadı.' });
    const lines = await pool.query(
      `SELECT category_code, category_name,
              SUM(planned_amount) AS planned, SUM(actual_amount) AS actual
       FROM project_budget_lines WHERE project_id=$1 AND is_active
       GROUP BY category_code, category_name ORDER BY category_code`,
      [req.params.projectId]
    );
    const costs = await pool.query(
      `
      SELECT is_commitment, SUM(COALESCE(amount_company, amount)) AS total
      FROM project_cost_entries WHERE project_id=$1 GROUP BY is_commitment
      `,
      [req.params.projectId]
    );
    const actual = Number(p.rows[0].actual_cost || 0);
    const planned = Number(p.rows[0].planned_budget || 0);
    const revenue = Number(p.rows[0].actual_revenue || p.rows[0].expected_revenue || 0);
    res.json({
      project_id: p.rows[0].id,
      project_code: p.rows[0].project_code,
      currency_code: p.rows[0].currency_code,
      planned_budget: planned,
      actual_cost: actual,
      variance: planned - actual,
      overrun: planned > 0 && actual > planned,
      expected_revenue: Number(p.rows[0].expected_revenue || 0),
      actual_revenue: Number(p.rows[0].actual_revenue || 0),
      gross_result: revenue - actual,
      budget_lines: lines.rows,
      cost_buckets: costs.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
