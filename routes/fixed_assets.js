/**
 * Sabit kıymet CRUD + düz hat amortisman stub (P2).
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq, requireCompanyRecord } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextDocumentNo } = require('../src/utils/belgeNo');

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`company_id=$${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`status=$${params.length}`);
    }
    if (req.query.asset_code) {
      params.push(`%${req.query.asset_code}%`);
      where.push(`asset_code ILIKE $${params.length}`);
    }
    const r = await pool.query(
      `SELECT * FROM fixed_assets ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY asset_code LIMIT 500`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', requireCompanyRecord('fixed_assets'), async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM fixed_assets WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Sabit kıymet bulunamadı.' });
    const runs = await pool.query(
      `SELECT * FROM fixed_asset_depreciation_runs WHERE asset_id=$1 ORDER BY id DESC LIMIT 24`,
      [req.params.id],
    );
    res.json({ ...r.rows[0], amortisman_log: runs.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = companyIdFromReq(req) || b.company_id || null;
    const code = b.asset_code || await nextDocumentNo(pool, 'SABIT_KIYMET').catch(() => `SK${Date.now()}`);
    const cost = Number(b.acquisition_cost) || 0;
    const r = await pool.query(
      `INSERT INTO fixed_assets
        (company_id, asset_code, asset_name, class_code, acquisition_date, acquisition_cost,
         depreciation_method, useful_life_months, accumulated_depreciation, net_value, status, gl_account_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        firmaId, code, b.asset_name || code, b.class_code || null,
        b.acquisition_date || new Date().toISOString().slice(0, 10), cost,
        b.depreciation_method || 'DuzHat', Number(b.useful_life_months) || 60,
        Number(b.accumulated_depreciation) || 0,
        b.net_value != null ? Number(b.net_value) : cost,
        b.status || 'Aktif', b.gl_account_id || null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

router.put('/:id', requireCompanyRecord('fixed_assets'), async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE fixed_assets SET
        asset_name=COALESCE($2, asset_name),
        class_code=COALESCE($3, class_code),
        depreciation_method=COALESCE($4, depreciation_method),
        useful_life_months=COALESCE($5, useful_life_months),
        status=COALESCE($6, status),
        gl_account_id=COALESCE($7, gl_account_id)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, b.asset_name, b.class_code, b.depreciation_method,
        b.useful_life_months != null ? Number(b.useful_life_months) : null,
        b.status, b.gl_account_id || null,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Sabit kıymet bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

/** Düz hat aylık amortisman stub — GL fişi opsiyonel sonraki */
router.post('/:id/amortisman', requireCompanyRecord('fixed_assets'), async (req, res) => {
  try {
    const result = await withTransaction(pool, async (client) => {
      const a = await client.query(`SELECT * FROM fixed_assets WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const asset = a.rows[0];
      if (!asset) {
        const e = new Error('Sabit kıymet bulunamadı.');
        e.status = 404;
        throw e;
      }
      const life = Math.max(1, Number(asset.useful_life_months) || 60);
      const cost = Number(asset.acquisition_cost) || 0;
      const accum = Number(asset.accumulated_depreciation) || 0;
      const monthly = Math.round((cost / life) * 100) / 100;
      const amount = Math.min(monthly, Math.max(0, cost - accum));
      if (amount <= 0) {
        const e = new Error('Amortisman tamamlanmış veya tutar yok.');
        e.status = 409;
        throw e;
      }
      const newAccum = accum + amount;
      const net = Math.max(0, cost - newAccum);
      await client.query(
        `UPDATE fixed_assets SET accumulated_depreciation=$2, net_value=$3,
          status=CASE WHEN $3<=0.01 THEN 'AmortiTamam' ELSE status END
         WHERE id=$1`,
        [asset.id, newAccum, net],
      );
      const now = new Date();
      const log = await client.query(
        `INSERT INTO fixed_asset_depreciation_runs
          (asset_id, company_id, run_date, period_year, period_month, amount, book_value_after, description)
         VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7) RETURNING *`,
        [
          asset.id, asset.company_id, now.getFullYear(), now.getMonth() + 1,
          amount, net, req.body?.description || 'Düz hat aylık amortisman',
        ],
      );
      return { asset_id: asset.id, amount, net_value: net, run: log.rows[0] };
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 400).json({ hata: err.message });
  }
});

module.exports = router;
