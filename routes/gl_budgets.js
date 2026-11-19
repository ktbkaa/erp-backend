/**
 * GL bütçe iskeleti + gerçekleşen (yevmiye) karşılaştırma (P2).
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq, requireCompanyRecord } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`company_id=$${params.length}`);
    }
    if (req.query.fiscal_year) {
      params.push(Number(req.query.fiscal_year));
      where.push(`fiscal_year=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT * FROM gl_budgets ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY fiscal_year DESC, budget_code LIMIT 200`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', requireCompanyRecord('gl_budgets'), async (req, res) => {
  try {
    const h = await pool.query(`SELECT * FROM gl_budgets WHERE id=$1`, [req.params.id]);
    if (!h.rows[0]) return res.status(404).json({ hata: 'Bütçe bulunamadı.' });
    const lines = await pool.query(
      `SELECT * FROM gl_budget_lines WHERE budget_id=$1 ORDER BY line_no, id`,
      [req.params.id],
    );
    res.json({ ...h.rows[0], satirlar: lines.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = companyIdFromReq(req) || b.company_id || null;
    if (!b.budget_code || !b.budget_name || !b.fiscal_year) {
      return res.status(400).json({ hata: 'budget_code, budget_name, fiscal_year zorunlu.' });
    }
    const row = await withTransaction(pool, async (client) => {
      const h = await client.query(
        `INSERT INTO gl_budgets
          (company_id, budget_code, budget_name, fiscal_year, currency_code, status, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          firmaId, b.budget_code, b.budget_name, Number(b.fiscal_year),
          b.currency_code || 'TRY', b.status || 'Taslak', b.description || null,
        ],
      );
      const header = h.rows[0];
      let n = 1;
      for (const s of b.satirlar || b.lines || []) {
        await client.query(
          `INSERT INTO gl_budget_lines
            (budget_id, line_no, account_id, account_code, period_no, budget_amount, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            header.id, n++, s.account_id || null, s.account_code || null,
            s.period_no != null ? Number(s.period_no) : null,
            Number(s.budget_amount) || 0, s.description || null,
          ],
        );
      }
      const lines = await client.query(
        `SELECT * FROM gl_budget_lines WHERE budget_id=$1 ORDER BY line_no`,
        [header.id],
      );
      return { ...header, satirlar: lines.rows };
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

/** Bütçe vs gerçekleşen (yevmiye borç-alacak net) */
router.get('/:id/karsilastirma', requireCompanyRecord('gl_budgets'), async (req, res) => {
  try {
    const h = await pool.query(`SELECT * FROM gl_budgets WHERE id=$1`, [req.params.id]);
    if (!h.rows[0]) return res.status(404).json({ hata: 'Bütçe bulunamadı.' });
    const budget = h.rows[0];
    const lines = await pool.query(
      `SELECT account_code, SUM(budget_amount)::numeric AS budget_amount
       FROM gl_budget_lines WHERE budget_id=$1
       GROUP BY account_code`,
      [budget.id],
    );
    const actual = await pool.query(
      `
      SELECT COALESCE(a.account_code, '') AS account_code,
             SUM(l.debit - l.credit)::numeric AS actual_net
      FROM journal_entry_lines l
      JOIN journal_entries j ON j.id = l.document_id
      JOIN gl_accounts a ON a.id = l.account_id
      WHERE j.status IN ('Onayli','Kesin')
        AND EXTRACT(YEAR FROM j.document_date) = $1
        AND ($2::int IS NULL OR j.company_id = $2)
      GROUP BY a.account_code
      `,
      [budget.fiscal_year, budget.company_id],
    ).catch(() => ({ rows: [] }));
    const actMap = new Map(actual.rows.map((r) => [String(r.account_code), Number(r.actual_net)]));
    const rows = lines.rows.map((r) => {
      const actualNet = actMap.get(String(r.account_code)) || 0;
      const bud = Number(r.budget_amount) || 0;
      return {
        account_code: r.account_code,
        budget_amount: bud,
        actual_net: actualNet,
        variance: actualNet - bud,
        variance_pct: bud !== 0 ? Number((((actualNet - bud) / bud) * 100).toFixed(1)) : null,
      };
    });
    res.json({ budget_id: budget.id, fiscal_year: budget.fiscal_year, satirlar: rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
