const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const {
  normalizeParams,
  assertOperationQtyAllowed,
  DEFAULTS,
} = require('../src/services/productionParamsService');
const { auditYaz } = require('../src/services/auditService');

async function getRow(id) {
  const r = await pool.query(
    `
    SELECT p.*,
           c.company_code, c.company_name,
           iy.plant_code, iy.plant_name
    FROM production_parameters p
    JOIN companies c ON c.id = p.company_id
    LEFT JOIN plants iy ON iy.id = p.plant_id
    WHERE p.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

/** Tüm firmalar için parametre kapsam + tolerans senaryo doğrulaması */
router.get('/dogrula', async (req, res) => {
  try {
    const firms = await pool.query(
      `SELECT c.id, c.company_code, c.company_name,
              (SELECT COUNT(*) FROM production_parameters p
               WHERE p.company_id=c.id AND p.plant_id IS NULL AND p.is_active) AS firma_param_cnt,
              (SELECT COUNT(*) FROM production_parameters p
               WHERE p.company_id=c.id AND p.plant_id IS NOT NULL AND p.is_active) AS plant_param_cnt
       FROM companies c
       ORDER BY c.company_code`
    );

    const scenarios = [];
    for (const f of firms.rows) {
      const pr = await pool.query(
        `SELECT * FROM production_parameters
         WHERE company_id=$1 AND plant_id IS NULL AND is_active=TRUE LIMIT 1`,
        [f.id]
      );
      const params = normalizeParams(pr.rows[0] || { company_id: f.id });
      const op = { planned_quantity: 100, produced_quantity: 90 }; // kalan 10

      let rejectOver = null;
      try {
        assertOperationQtyAllowed(params, op, 15); // 15 > kalan 10
        rejectOver = false;
      } catch (e) {
        rejectOver = e.code === 'ERR-MFG-OVERPROD';
      }

      const expectedBlock = !params.allow_over_production
        || (params.allow_over_production && Number(params.over_production_pct) === 0);

      scenarios.push({
        company_id: f.id,
        company_code: f.company_code,
        company_name: f.company_name,
        has_firma_param: Number(f.firma_param_cnt) > 0,
        plant_param_cnt: Number(f.plant_param_cnt),
        allow_over_production: params.allow_over_production,
        over_production_pct: params.over_production_pct,
        allow_under_production: params.allow_under_production,
        under_production_pct: params.under_production_pct,
        enforce_op_sequence: params.enforce_op_sequence,
        require_material_consume: params.require_material_consume,
        scenario: 'plan=100 uretilen=90 kalan=10 giris=15',
        over_rejected: rejectOver,
        expected_block: expectedBlock,
        scenario_ok: expectedBlock ? rejectOver === true : rejectOver === false,
        using_defaults: !pr.rows[0],
      });
    }

    const missing = scenarios.filter((s) => !s.has_firma_param);
    const failed = scenarios.filter((s) => !s.scenario_ok);
    res.json({
      checked_at: new Date().toISOString(),
      defaults: DEFAULTS,
      firm_count: scenarios.length,
      missing_param_count: missing.length,
      scenario_fail_count: failed.length,
      ok: missing.length === 0 && failed.length === 0,
      satirlar: scenarios,
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Eksik firma parametrelerini güvenli varsayılanla tamamla */
router.post('/eksikleri-tamamla', async (req, res) => {
  try {
    const ins = await pool.query(
      `INSERT INTO production_parameters (
         company_id, plant_id,
         allow_over_production, over_production_pct,
         allow_under_production, under_production_pct,
         enforce_op_sequence, require_material_consume, auto_close_on_complete,
         description, is_active
       )
       SELECT c.id, NULL,
              FALSE, 0, TRUE, 0, TRUE, TRUE, TRUE,
              'Otomatik tamamlandı — güvenli varsayılan', TRUE
       FROM companies c
       WHERE NOT EXISTS (
         SELECT 1 FROM production_parameters p
         WHERE p.company_id=c.id AND p.plant_id IS NULL AND p.is_active=TRUE
       )
       RETURNING id, company_id`
    );
    await auditYaz(pool, {
      tablo: 'uretim-parametreleri',
      kayitId: null,
      action: 'POST',
      kullaniciKodu: req.user?.user_code || req.get?.('x-kullanici-kodu') || null,
      yeni: { completed: ins.rows.length, ids: ins.rows.map((r) => r.id) },
      request_path: 'POST /uretim-parametreleri/eksikleri-tamamla',
    });
    res.json({ completed: ins.rows.length, rows: ins.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = ['p.is_active = TRUE OR TRUE']; // liste: aktif+pasif
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`p.company_id = $${params.length}`);
    }
    if (req.query.company_id) {
      params.push(Number(req.query.company_id));
      where.push(`p.company_id = $${params.length}`);
    }
    const rows = await pool.query(
      `
      SELECT p.*,
             c.company_code, c.company_name,
             iy.plant_code, iy.plant_name
      FROM production_parameters p
      JOIN companies c ON c.id = p.company_id
      LEFT JOIN plants iy ON iy.id = p.plant_id
      WHERE ${where.join(' AND ')}
      ORDER BY c.company_code, iy.plant_code NULLS FIRST, p.id
      `,
      params
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getRow(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Üretim parametresi bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const companyId = Number(b.company_id || companyIdFromReq(req));
    if (!companyId) return res.status(400).json({ hata: 'company_id zorunlu.' });
    const plantId = b.plant_id != null && b.plant_id !== '' ? Number(b.plant_id) : null;
    const n = normalizeParams({ ...b, company_id: companyId, plant_id: plantId });
    const ins = await pool.query(
      `
      INSERT INTO production_parameters (
        company_id, plant_id,
        allow_over_production, over_production_pct,
        allow_under_production, under_production_pct,
        enforce_op_sequence, require_material_consume, auto_close_on_complete,
        description, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,TRUE))
      RETURNING id
      `,
      [
        companyId,
        plantId,
        n.allow_over_production,
        n.over_production_pct,
        n.allow_under_production,
        n.under_production_pct,
        n.enforce_op_sequence,
        n.require_material_consume,
        n.auto_close_on_complete,
        b.description || null,
        b.is_active,
      ]
    );
    res.status(201).json(await getRow(ins.rows[0].id));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        hata: 'Bu firma / iş yeri için üretim parametresi zaten var.',
        kod: 'ERR-DUP-PARAM',
      });
    }
    res.status(400).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const cur = await getRow(req.params.id);
    if (!cur) return res.status(404).json({ hata: 'Üretim parametresi bulunamadı.' });
    const n = normalizeParams({ ...cur, ...b });
    const plantId = b.plant_id !== undefined
      ? (b.plant_id != null && b.plant_id !== '' ? Number(b.plant_id) : null)
      : cur.plant_id;
    await pool.query(
      `
      UPDATE production_parameters SET
        company_id = COALESCE($2, company_id),
        plant_id = $3,
        allow_over_production = $4,
        over_production_pct = $5,
        allow_under_production = $6,
        under_production_pct = $7,
        enforce_op_sequence = $8,
        require_material_consume = $9,
        auto_close_on_complete = $10,
        description = COALESCE($11, description),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [
        req.params.id,
        b.company_id != null ? Number(b.company_id) : null,
        plantId,
        n.allow_over_production,
        n.over_production_pct,
        n.allow_under_production,
        n.under_production_pct,
        n.enforce_op_sequence,
        n.require_material_consume,
        n.auto_close_on_complete,
        b.description !== undefined ? b.description : null,
        typeof b.is_active === 'boolean' ? b.is_active : null,
      ]
    );
    res.json(await getRow(req.params.id));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        hata: 'Bu firma / iş yeri için üretim parametresi zaten var.',
        kod: 'ERR-DUP-PARAM',
      });
    }
    res.status(400).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      'DELETE FROM production_parameters WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Üretim parametresi bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
