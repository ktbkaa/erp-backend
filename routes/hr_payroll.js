const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const {
  getParamSet, loadParams, calculateEmployeePayroll, calculateForEmployee, round2,
} = require('../src/services/hrPayrollService');

async function parametreSetGetir(id) {
  const set = await pool.query(`SELECT * FROM hr_payroll_param_sets WHERE id=$1`, [id]);
  if (!set.rows[0]) return null;
  const vals = await pool.query(
    `SELECT id, param_key, param_value, value_text, description
     FROM hr_payroll_param_values WHERE param_set_id=$1 ORDER BY param_key`,
    [id],
  );
  const brackets = await pool.query(
    `SELECT id, line_no, up_to_amount, rate, fixed_amount
     FROM hr_payroll_tax_brackets WHERE param_set_id=$1 ORDER BY line_no`,
    [id],
  );
  return {
    ...set.rows[0],
    param_values: vals.rows,
    tax_brackets: brackets.rows,
    values: Object.fromEntries(vals.rows.map((v) => [v.param_key, Number(v.param_value)])),
    brackets: brackets.rows,
  };
}

async function syncParamChildren(client, setId, paramValues, taxBrackets) {
  if (Array.isArray(paramValues)) {
    await client.query(`DELETE FROM hr_payroll_param_values WHERE param_set_id=$1`, [setId]);
    for (const v of paramValues) {
      if (!v.param_key || v.param_value == null) continue;
      await client.query(
        `INSERT INTO hr_payroll_param_values (param_set_id, param_key, param_value, value_text, description)
         VALUES ($1,$2,$3,$4,$5)`,
        [setId, v.param_key, v.param_value, v.value_text || null, v.description || null],
      );
    }
  }
  if (Array.isArray(taxBrackets)) {
    await client.query(`DELETE FROM hr_payroll_tax_brackets WHERE param_set_id=$1`, [setId]);
    let line = 10;
    for (const b of taxBrackets) {
      if (b.rate == null) continue;
      await client.query(
        `INSERT INTO hr_payroll_tax_brackets (param_set_id, line_no, up_to_amount, rate, fixed_amount)
         VALUES ($1,$2,$3,$4,COALESCE($5,0))`,
        [setId, b.line_no || line, b.up_to_amount ?? null, b.rate, b.fixed_amount],
      );
      line += 10;
    }
  }
}

// ---- Parametre setleri ----
router.get('/parametreler', async (req, res) => {
  try {
    const country = req.query.country_code;
    const r = await pool.query(
      `SELECT * FROM hr_payroll_param_sets
       WHERE ($1::text IS NULL OR country_code=$1)
       ORDER BY country_code, effective_from DESC`,
      [country || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/parametreler/:id', async (req, res) => {
  try {
    const row = await parametreSetGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Parametre seti bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/parametreler', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.country_code || !b.set_code || !b.set_name || !b.effective_from) {
      return res.status(400).json({ hata: 'country_code, set_code, set_name, effective_from zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `INSERT INTO hr_payroll_param_sets (
           country_code, set_code, set_name, effective_from, effective_to,
           source_url, source_note, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,TRUE))
         RETURNING id`,
        [
          b.country_code, b.set_code, b.set_name, b.effective_from, b.effective_to || null,
          b.source_url || null, b.source_note || null, b.is_active,
        ],
      );
      const setId = ins.rows[0].id;
      await syncParamChildren(
        client,
        setId,
        b.param_values || b.satirlar || null,
        b.tax_brackets || null,
      );
      return setId;
    });
    res.status(201).json(await parametreSetGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/parametreler/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const id = await withTransaction(pool, async (client) => {
      const upd = await client.query(
        `UPDATE hr_payroll_param_sets SET
           set_name = COALESCE($2, set_name),
           effective_from = COALESCE($3, effective_from),
           effective_to = COALESCE($4, effective_to),
           source_url = COALESCE($5, source_url),
           source_note = COALESCE($6, source_note),
           is_active = COALESCE($7, is_active)
         WHERE id=$1 RETURNING id`,
        [
          req.params.id, b.set_name, b.effective_from, b.effective_to,
          b.source_url, b.source_note, b.is_active,
        ],
      );
      if (!upd.rows[0]) {
        const err = new Error('Parametre seti bulunamadı.');
        err.status = 404;
        throw err;
      }
      await syncParamChildren(
        client,
        Number(req.params.id),
        b.param_values || b.satirlar,
        b.tax_brackets,
      );
      return Number(req.params.id);
    });
    res.json(await parametreSetGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/parametreler/:id', async (req, res) => {
  try {
    const used = await pool.query(
      `SELECT 1 FROM hr_payroll_runs WHERE param_set_id=$1 LIMIT 1`,
      [req.params.id],
    );
    if (used.rows[0]) {
      await pool.query(`UPDATE hr_payroll_param_sets SET is_active=FALSE WHERE id=$1`, [req.params.id]);
      return res.json({ silindi: false, pasife_alindi: true, id: Number(req.params.id) });
    }
    const r = await pool.query(`DELETE FROM hr_payroll_param_sets WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Parametre seti bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Simülasyon: brüt → net (kalıcı kayıt yok) */
router.post('/hesapla-sim', async (req, res) => {
  try {
    const b = req.body || {};
    if (b.gross == null) return res.status(400).json({ hata: 'gross zorunlu.' });
    const result = await calculateForEmployee(pool, {
      employeeId: b.employee_id || null,
      gross: Number(b.gross),
      onDate: b.on_date || null,
      previousCumulativeTaxBase: Number(b.previous_cumulative_tax_base || 0),
      employerDiscount: b.employer_discount !== false,
      advanceDeduction: Number(b.advance_deduction || 0),
      otherDeductions: Number(b.other_deductions || 0),
      paramSetId: b.param_set_id || null,
      countryCode: b.country_code || 'TR',
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

// ---- Ücretler ----
router.get('/ucretler', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`s.company_id=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`s.employee_id=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT s.*, e.employee_no, e.first_name, e.last_name
       FROM hr_employee_salaries s
       JOIN hr_employees e ON e.id = s.employee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY s.effective_from DESC`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/ucretler', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.employee_id || !b.gross_amount || !b.effective_from) {
      return res.status(400).json({ hata: 'company_id, employee_id, gross_amount, effective_from zorunlu.' });
    }
    const out = await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE hr_employee_salaries SET effective_to=$2::date - INTERVAL '1 day'
         WHERE employee_id=$1 AND effective_to IS NULL AND effective_from < $2::date`,
        [b.employee_id, b.effective_from],
      );
      const ins = await client.query(
        `INSERT INTO hr_employee_salaries (
           employee_id, company_id, effective_from, effective_to, wage_type, gross_amount, currency_code, description
         ) VALUES ($1,$2,$3,$4,COALESCE($5,'Aylik'),$6,COALESCE($7,'TRY'),$8)
         RETURNING *`,
        [
          b.employee_id, firmaId, b.effective_from, b.effective_to || null,
          b.wage_type, b.gross_amount, b.currency_code, b.description || null,
        ],
      );
      await client.query(
        `INSERT INTO hr_employment_history (
           employee_id, company_id, change_type, effective_date, salary_amount, currency_code, description
         ) VALUES ($1,$2,'Ucret',$3,$4,COALESCE($5,'TRY'),$6)`,
        [b.employee_id, firmaId, b.effective_from, b.gross_amount, b.currency_code, b.description || 'Ücret güncelleme'],
      );
      return ins.rows[0];
    });
    res.status(201).json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- Avans ----
router.get('/avanslar', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`a.company_id=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`a.employee_id=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT a.*, e.employee_no, e.first_name, e.last_name,
              (a.paid_amount - a.deducted_amount) AS remaining_balance
       FROM hr_advances a
       JOIN hr_employees e ON e.id = a.employee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.id DESC`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/avanslar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.employee_id || b.amount == null) {
      return res.status(400).json({ hata: 'company_id, employee_id, amount zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = b.advance_no || (await sonrakiKod(client, 'HR_ADVANCE'));
      const ins = await client.query(
        `INSERT INTO hr_advances (
           company_id, advance_no, employee_id, request_date, amount, currency_code, status, description
         ) VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,COALESCE($6,'TRY'),COALESCE($7,'Taslak'),$8)
         RETURNING id`,
        [firmaId, no, b.employee_id, b.request_date, b.amount, b.currency_code, b.status, b.description || null],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_advances WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/avanslar/:id/onayla', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_advances SET status='Onaylandi'
       WHERE id=$1 AND status IN ('Taslak','OnayBekliyor') RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Avans onaylanamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/avanslar/:id/ode', async (req, res) => {
  try {
    const paid = req.body?.paid_amount;
    const r = await pool.query(
      `UPDATE hr_advances SET
         status='Odendi',
         paid_amount = COALESCE($2, amount)
       WHERE id=$1 AND status='Onaylandi' RETURNING *`,
      [req.params.id, paid],
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Yalnızca onaylı avans ödenebilir.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- Dönemler ----
router.get('/donemler', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT * FROM hr_payroll_periods
       WHERE ($1::int IS NULL OR company_id=$1)
       ORDER BY year_no DESC, month_no DESC`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/donemler', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.year_no || !b.month_no) {
      return res.status(400).json({ hata: 'company_id, year_no, month_no zorunlu.' });
    }
    const y = Number(b.year_no);
    const m = Number(b.month_no);
    const code = b.period_code || `${y}-${String(m).padStart(2, '0')}`;
    const start = b.start_date || `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = b.end_date || new Date(y, m, 0).toISOString().slice(0, 10);
    const paramSet = await getParamSet(pool, { countryCode: b.country_code || 'TR', onDate: start });
    const r = await pool.query(
      `INSERT INTO hr_payroll_periods (
         company_id, period_code, year_no, month_no, start_date, end_date, status, country_code, param_set_id
       ) VALUES ($1,$2,$3,$4,$5,$6,'Acik',COALESCE($7,'TR'),$8)
       RETURNING *`,
      [firmaId, code, y, m, start, endDate, b.country_code, paramSet?.id || null],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- Bordro çalışmaları ----
router.get('/calismalar', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT r.*, p.period_code, p.year_no, p.month_no
       FROM hr_payroll_runs r
       JOIN hr_payroll_periods p ON p.id = r.period_id
       WHERE ($1::int IS NULL OR r.company_id=$1)
       ORDER BY r.id DESC`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/calismalar/:id', async (req, res) => {
  try {
    const run = await pool.query(
      `SELECT r.*, p.period_code, p.year_no, p.month_no, p.start_date, p.end_date
       FROM hr_payroll_runs r
       JOIN hr_payroll_periods p ON p.id = r.period_id
       WHERE r.id=$1`,
      [req.params.id],
    );
    if (!run.rows[0]) return res.status(404).json({ hata: 'Bordro çalışması bulunamadı.' });
    const lines = await pool.query(
      `SELECT l.*, e.employee_no, e.first_name, e.last_name
       FROM hr_payroll_lines l
       JOIN hr_employees e ON e.id = l.employee_id
       WHERE l.run_id=$1
       ORDER BY e.employee_no`,
      [req.params.id],
    );
    res.json({ ...run.rows[0], lines: lines.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/calismalar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.period_id) {
      return res.status(400).json({ hata: 'company_id ve period_id zorunlu.' });
    }
    const period = await pool.query(`SELECT * FROM hr_payroll_periods WHERE id=$1`, [b.period_id]);
    if (!period.rows[0]) return res.status(404).json({ hata: 'Dönem bulunamadı.' });
    if (period.rows[0].status === 'Kesin') {
      return res.status(409).json({ hata: 'Kesinleşmiş dönem için yeni çalışma açılamaz; düzeltme bordrosu kullanın.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = b.run_no || (await sonrakiKod(client, 'HR_PAYROLL_RUN'));
      const ins = await client.query(
        `INSERT INTO hr_payroll_runs (
           company_id, period_id, run_no, status, param_set_id, description
         ) VALUES ($1,$2,$3,'Taslak',$4,$5) RETURNING id`,
        [firmaId, b.period_id, no, period.rows[0].param_set_id, b.description || null],
      );
      await client.query(`UPDATE hr_payroll_periods SET status='Hesaplama' WHERE id=$1 AND status='Acik'`, [b.period_id]);
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_payroll_runs WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Dönem için aktif personelleri hesapla */
router.post('/calismalar/:id/hesapla', async (req, res) => {
  try {
    const out = await withTransaction(pool, async (client) => {
      const runQ = await client.query(
        `SELECT r.*, p.start_date, p.end_date, p.country_code, p.year_no, p.month_no
         FROM hr_payroll_runs r
         JOIN hr_payroll_periods p ON p.id = r.period_id
         WHERE r.id=$1 FOR UPDATE`,
        [req.params.id],
      );
      const run = runQ.rows[0];
      if (!run) {
        const err = new Error('Bordro çalışması bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (['Kesin', 'Iptal'].includes(run.status)) {
        const err = new Error(`Bu durumda hesaplama yapılamaz: ${run.status}`);
        err.status = 409;
        throw err;
      }
      const paramSetId = run.param_set_id || (await getParamSet(client, {
        countryCode: run.country_code || 'TR',
        onDate: run.end_date,
      }))?.id;
      if (!paramSetId) {
        const err = new Error('Bordro parametre seti bulunamadı.');
        err.status = 400;
        throw err;
      }
      const params = await loadParams(client, paramSetId);

      await client.query(`DELETE FROM hr_payroll_lines WHERE run_id=$1`, [run.id]);

      const emps = await client.query(
        `SELECT e.* FROM hr_employees e
         WHERE e.company_id=$1 AND e.is_active=TRUE AND e.employment_status='Aktif'
         ORDER BY e.employee_no`,
        [run.company_id],
      );

      let totalGross = 0;
      let totalNet = 0;
      let totalEr = 0;
      let count = 0;

      for (const emp of emps.rows) {
        const sal = await client.query(
          `SELECT * FROM hr_employee_salaries
           WHERE employee_id=$1 AND effective_from <= $2::date
             AND (effective_to IS NULL OR effective_to >= $2::date)
           ORDER BY effective_from DESC LIMIT 1`,
          [emp.id, run.end_date],
        );
        if (!sal.rows[0]) continue;
        const gross = Number(sal.rows[0].gross_amount);

        // Önceki ayların kümülatif matrahı (aynı yıl, önceki kesinleşmiş satırlar)
        const prev = await client.query(
          `SELECT COALESCE(MAX(l.cumulative_tax_base),0) AS cum
           FROM hr_payroll_lines l
           JOIN hr_payroll_runs r2 ON r2.id = l.run_id
           JOIN hr_payroll_periods p2 ON p2.id = r2.period_id
           WHERE l.employee_id=$1 AND r2.status='Kesin'
             AND p2.year_no=$2
             AND (p2.year_no < $2 OR (p2.year_no=$2 AND p2.month_no < $3))`,
          [emp.id, run.year_no, run.month_no],
        );
        const prevCum = Number(prev.rows[0]?.cum || 0);

        // Ödenmiş avanslardan kalan mahsup
        const adv = await client.query(
          `SELECT COALESCE(SUM(paid_amount - deducted_amount),0) AS rem
           FROM hr_advances
           WHERE employee_id=$1 AND status IN ('Odendi','Mahsup') AND paid_amount > deducted_amount`,
          [emp.id],
        );
        let advanceDeduction = round2(Math.min(Number(adv.rows[0].rem || 0), gross * 0.5));

        const calc = calculateEmployeePayroll({
          gross,
          previousCumulativeTaxBase: prevCum,
          employerDiscount: true,
          advanceDeduction,
          otherDeductions: 0,
          params,
        });

        await client.query(
          `INSERT INTO hr_payroll_lines (
             run_id, employee_id, company_id,
             gross_wage, sgk_employee, unemployment_employee, income_tax_base, cumulative_tax_base,
             income_tax, income_tax_exemption, stamp_tax, stamp_tax_exemption,
             other_deductions, advance_deduction, net_wage,
             sgk_employer, unemployment_employer, employer_cost, calc_detail
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
          [
            run.id, emp.id, run.company_id,
            calc.gross_wage, calc.sgk_employee, calc.unemployment_employee,
            calc.income_tax_base, calc.cumulative_tax_base,
            calc.income_tax, calc.income_tax_exemption, calc.stamp_tax, calc.stamp_tax_exemption,
            calc.other_deductions, calc.advance_deduction, calc.net_wage,
            calc.sgk_employer, calc.unemployment_employer, calc.employer_cost,
            JSON.stringify(calc.calc_detail),
          ],
        );

        if (advanceDeduction > 0) {
          // Kısmi mahsup — avanslara dağıt
          const openAdvs = await client.query(
            `SELECT * FROM hr_advances
             WHERE employee_id=$1 AND status IN ('Odendi','Mahsup') AND paid_amount > deducted_amount
             ORDER BY id FOR UPDATE`,
            [emp.id],
          );
          let left = advanceDeduction;
          for (const a of openAdvs.rows) {
            if (left <= 0) break;
            const rem = round2(Number(a.paid_amount) - Number(a.deducted_amount));
            const take = Math.min(rem, left);
            const newDed = round2(Number(a.deducted_amount) + take);
            const st = newDed >= Number(a.paid_amount) - 0.001 ? 'Mahsup' : 'Odendi';
            await client.query(
              `UPDATE hr_advances SET deducted_amount=$2, status=$3 WHERE id=$1`,
              [a.id, newDed, st],
            );
            left = round2(left - take);
          }
        }

        totalGross = round2(totalGross + calc.gross_wage);
        totalNet = round2(totalNet + calc.net_wage);
        totalEr = round2(totalEr + calc.employer_cost);
        count += 1;
      }

      const upd = await client.query(
        `UPDATE hr_payroll_runs SET
           status='Hesaplandi', employee_count=$2, total_gross=$3, total_net=$4,
           total_employer_cost=$5, param_set_id=$6, calculated_at=CURRENT_TIMESTAMP
         WHERE id=$1 RETURNING *`,
        [run.id, count, totalGross, totalNet, totalEr, paramSetId],
      );
      return upd.rows[0];
    });
    const lines = await pool.query(`SELECT COUNT(*)::int AS c FROM hr_payroll_lines WHERE run_id=$1`, [out.id]);
    res.json({ ...out, line_count: lines.rows[0].c });
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/calismalar/:id/onayla', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_payroll_runs SET status='Onaylandi'
       WHERE id=$1 AND status='Hesaplandi' RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Yalnızca Hesaplandi durumundaki çalışma onaylanabilir.' });
    await pool.query(
      `UPDATE hr_payroll_periods SET status='Onay' WHERE id=$1`,
      [r.rows[0].period_id],
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/calismalar/:id/kesinlestir', async (req, res) => {
  try {
    const out = await withTransaction(pool, async (client) => {
      const cur = await client.query(`SELECT * FROM hr_payroll_runs WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const run = cur.rows[0];
      if (!run) {
        const err = new Error('Bordro çalışması bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (run.status !== 'Onaylandi') {
        const err = new Error('Yalnızca Onaylandi durumundaki çalışma kesinleştirilebilir.');
        err.status = 409;
        throw err;
      }
      // Mükerrer kesinleştirme / mükerrer muhasebe engeli
      if (run.journal_entry_id) {
        const err = new Error('Bu çalışma zaten muhasebeleşmiş.');
        err.status = 409;
        throw err;
      }
      const upd = await client.query(
        `UPDATE hr_payroll_runs SET status='Kesin', finalized_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
        [run.id],
      );
      await client.query(`UPDATE hr_payroll_periods SET status='Kesin' WHERE id=$1`, [run.period_id]);
      return upd.rows[0];
    });
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

module.exports = router;
