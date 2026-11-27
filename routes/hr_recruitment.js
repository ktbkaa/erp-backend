const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { annualLeaveEntitlementDays } = require('../src/services/hrPayrollService');

// ---- İş ilanları ----
router.get('/ilanlar', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT j.*, d.department_name, p.position_name
       FROM hr_job_requisitions j
       LEFT JOIN hr_departments d ON d.id = j.department_id
       LEFT JOIN hr_positions p ON p.id = j.position_id
       WHERE ($1::int IS NULL OR j.company_id=$1)
       ORDER BY j.id DESC`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/ilanlar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.title) return res.status(400).json({ hata: 'company_id ve title zorunlu.' });
    const id = await withTransaction(pool, async (client) => {
      const no = b.requisition_no || (await sonrakiKod(client, 'HR_JOB_REQ'));
      const ins = await client.query(
        `INSERT INTO hr_job_requisitions (
           company_id, requisition_no, title, department_id, position_id, status, headcount, description
         ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,'Acik'),COALESCE($7,1),$8) RETURNING id`,
        [firmaId, no, b.title, b.department_id || null, b.position_id || null, b.status, b.headcount, b.description || null],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_job_requisitions WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- Adaylar ----
router.get('/adaylar', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT c.*, j.title AS requisition_title, e.employee_no
       FROM hr_candidates c
       LEFT JOIN hr_job_requisitions j ON j.id = c.requisition_id
       LEFT JOIN hr_employees e ON e.id = c.employee_id
       WHERE ($1::int IS NULL OR c.company_id=$1)
       ORDER BY c.id DESC`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/adaylar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.first_name || !b.last_name) {
      return res.status(400).json({ hata: 'company_id, first_name, last_name zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = b.candidate_no || (await sonrakiKod(client, 'HR_CANDIDATE'));
      const ins = await client.query(
        `INSERT INTO hr_candidates (
           company_id, candidate_no, first_name, last_name, email, phone, requisition_id, status, description
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Aday'),$9) RETURNING id`,
        [
          firmaId, no, b.first_name, b.last_name, b.email || null, b.phone || null,
          b.requisition_id || null, b.status, b.description || null,
        ],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_candidates WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/** Adayı personel kaydına dönüştür — mükerrer personel engeli */
router.post('/adaylar/:id/ise-al', async (req, res) => {
  try {
    const b = req.body || {};
    const out = await withTransaction(pool, async (client) => {
      const candQ = await client.query(`SELECT * FROM hr_candidates WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const cand = candQ.rows[0];
      if (!cand) {
        const err = new Error('Aday bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (cand.employee_id) {
        const err = new Error('Bu aday zaten personele dönüştürülmüş.');
        err.status = 409;
        throw err;
      }
      if (cand.email) {
        const dup = await client.query(
          `SELECT id, employee_no FROM hr_employees
           WHERE company_id=$1 AND lower(email)=lower($2) AND is_active=TRUE LIMIT 1`,
          [cand.company_id, cand.email],
        );
        if (dup.rows[0]) {
          const err = new Error(`Aynı e-posta ile aktif personel var: ${dup.rows[0].employee_no}`);
          err.status = 409;
          throw err;
        }
      }
      let deptId = b.department_id || null;
      let posId = b.position_id || null;
      if (cand.requisition_id) {
        const reqn = await client.query(`SELECT * FROM hr_job_requisitions WHERE id=$1`, [cand.requisition_id]);
        if (reqn.rows[0]) {
          deptId = deptId || reqn.rows[0].department_id;
          posId = posId || reqn.rows[0].position_id;
        }
      }
      const hireDate = b.hire_date || new Date().toISOString().slice(0, 10);
      const empNo = b.employee_no || (await sonrakiKod(client, 'HR_EMPLOYEE'));
      const emp = await client.query(
        `INSERT INTO hr_employees (
           company_id, employee_no, first_name, last_name, email, phone,
           department_id, position_id, hire_date, employment_status, contract_type
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Aktif',COALESCE($10,'BelirsizSureli'))
         RETURNING *`,
        [
          cand.company_id, empNo, cand.first_name, cand.last_name, cand.email, cand.phone,
          deptId, posId, hireDate, b.contract_type,
        ],
      );
      await client.query(
        `UPDATE hr_candidates SET status='IseAlindi', employee_id=$2 WHERE id=$1`,
        [cand.id, emp.rows[0].id],
      );
      await client.query(
        `INSERT INTO hr_employment_history (employee_id, company_id, change_type, effective_date, department_id, position_id, description)
         VALUES ($1,$2,'IseGiris',$3,$4,$5,$6)`,
        [emp.rows[0].id, cand.company_id, hireDate, deptId, posId, `Aday ${cand.candidate_no} işe alındı`],
      );
      // Onboarding checklist
      const tasks = [
        ['SOZLESME', 'İş sözleşmesi imzası'],
        ['KIMLIK', 'Kimlik / SGK belgeleri'],
        ['ZIMMET', 'Zimmet teslimi'],
        ['HESAP', 'Kullanıcı hesabı talebi'],
        ['ORIENTASYON', 'Oryantasyon eğitimi'],
      ];
      for (const [code, name] of tasks) {
        await client.query(
          `INSERT INTO hr_onboarding_tasks (company_id, employee_id, task_code, task_name, status)
           VALUES ($1,$2,$3,$4,'Bekliyor')`,
          [cand.company_id, emp.rows[0].id, code, name],
        );
      }
      return emp.rows[0];
    });
    res.status(201).json(out);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

// ---- Onboarding ----
router.get('/onboarding', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`t.company_id=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`t.employee_id=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT t.*, e.employee_no, e.first_name, e.last_name
       FROM hr_onboarding_tasks t
       JOIN hr_employees e ON e.id = t.employee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY t.id`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/onboarding/:id/tamamla', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_onboarding_tasks SET status='Tamamlandi', completed_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Görev bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- Zimmet ----
router.get('/zimmetler', async (req, res) => {
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
      `SELECT a.*, e.employee_no, e.first_name, e.last_name
       FROM hr_asset_assignments a
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

router.post('/zimmetler', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.employee_id || !b.asset_code || !b.asset_name) {
      return res.status(400).json({ hata: 'company_id, employee_id, asset_code, asset_name zorunlu.' });
    }
    const r = await pool.query(
      `INSERT INTO hr_asset_assignments (
         company_id, employee_id, asset_code, asset_name, assigned_at, status, description
       ) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),'Zimmette',$6)
       RETURNING *`,
      [firmaId, b.employee_id, b.asset_code, b.asset_name, b.assigned_at, b.description || null],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/zimmetler/:id/iade', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_asset_assignments SET status='Iade', returned_at=COALESCE($2,CURRENT_DATE)
       WHERE id=$1 AND status='Zimmette' RETURNING *`,
      [req.params.id, req.body?.returned_at || null],
    );
    if (!r.rows[0]) return res.status(400).json({ hata: 'Zimmet iade edilemedi.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ---- İşten çıkış ----
router.get('/cikislar', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT t.*, e.employee_no, e.first_name, e.last_name, e.hire_date
       FROM hr_terminations t
       JOIN hr_employees e ON e.id = t.employee_id
       WHERE ($1::int IS NULL OR t.company_id=$1)
       ORDER BY t.id DESC`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/cikislar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.employee_id || !b.termination_date || !b.reason_code) {
      return res.status(400).json({ hata: 'company_id, employee_id, termination_date, reason_code zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const no = b.termination_no || (await sonrakiKod(client, 'HR_TERMINATION'));
      const emp = await client.query(`SELECT * FROM hr_employees WHERE id=$1`, [b.employee_id]);
      if (!emp.rows[0]) {
        const err = new Error('Personel bulunamadı.');
        err.status = 404;
        throw err;
      }
      const hire = new Date(emp.rows[0].hire_date);
      const term = new Date(b.termination_date);
      const years = (term - hire) / (365.25 * 24 * 3600 * 1000);
      // Kıdem: 1 yıl+ ve işveren feshi / haklı neden dışı — uzman onayı gerektirir
      const reason = b.reason_code;
      const employerTerm = ['IsverenFeshi', 'Anlasmali', 'Emeklilik'].includes(reason);
      const severanceEligible = years >= 1 && employerTerm && reason !== 'Istifa';
      const noticeEligible = ['IsverenFeshi', 'Istifa'].includes(reason);
      const unusedLeave = Number(b.unused_leave_days || 0);

      let monthlyGross = 0;
      const sal = await client.query(
        `SELECT gross_amount FROM hr_employee_salaries
         WHERE employee_id=$1 AND effective_from <= $2::date
           AND (effective_to IS NULL OR effective_to >= $2::date)
         ORDER BY effective_from DESC LIMIT 1`,
        [b.employee_id, b.termination_date],
      );
      if (sal.rows[0]) monthlyGross = Number(sal.rows[0].gross_amount);
      const daily = monthlyGross / 30;
      const severance = severanceEligible ? Math.round(years * monthlyGross * 100) / 100 : 0;
      // İhbar: yaklaşık kıdem dilimine göre (4857 md.17) — kesin hukuk yorumu değildir
      let noticeWeeks = 0;
      if (noticeEligible) {
        if (years < 0.5) noticeWeeks = 2;
        else if (years < 1.5) noticeWeeks = 4;
        else if (years < 3) noticeWeeks = 6;
        else noticeWeeks = 8;
      }
      const noticeAmt = Math.round(noticeWeeks * 7 * daily * 100) / 100;
      const unusedAmt = Math.round(unusedLeave * daily * 100) / 100;
      const other = Number(b.other_amount || 0);
      const ded = Number(b.deduction_amount || 0);
      const net = Math.round((severance + noticeAmt + unusedAmt + other - ded) * 100) / 100;
      const detail = {
        service_years: Math.round(years * 100) / 100,
        monthly_gross: monthlyGross,
        note: 'Hesaplar ön hesaplamadır; İK uzmanı onayı gerekir. Kıdem tavanı ve vergi kesintileri ayrıca doğrulanmalıdır.',
        annual_leave_entitlement_ref: annualLeaveEntitlementDays({ serviceYears: Math.floor(years) }),
      };
      const ins = await client.query(
        `INSERT INTO hr_terminations (
           company_id, termination_no, employee_id, notice_date, last_work_date, termination_date,
           reason_code, reason_name, status,
           severance_eligible, notice_eligible, unused_leave_days,
           severance_amount, notice_amount, unused_leave_amount, other_amount, deduction_amount,
           net_settlement, calc_detail, description
         ) VALUES (
           $1,$2,$3,$4,COALESCE($5,$6),$6,$7,$8,'Taslak',
           $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
         ) RETURNING id`,
        [
          firmaId, no, b.employee_id, b.notice_date || null, b.last_work_date, b.termination_date,
          reason, b.reason_name || reason,
          severanceEligible, noticeEligible, unusedLeave,
          severance, noticeAmt, unusedAmt, other, ded, net,
          JSON.stringify(detail), b.description || null,
        ],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_terminations WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/cikislar/:id/onayla', async (req, res) => {
  try {
    const out = await withTransaction(pool, async (client) => {
      const cur = await client.query(`SELECT * FROM hr_terminations WHERE id=$1 FOR UPDATE`, [req.params.id]);
      const t = cur.rows[0];
      if (!t) {
        const err = new Error('İşten çıkış kaydı bulunamadı.');
        err.status = 404;
        throw err;
      }
      if (!['Taslak', 'Kontrol'].includes(t.status)) {
        const err = new Error(`Bu durumda onaylanamaz: ${t.status}`);
        err.status = 409;
        throw err;
      }
      // Açık zimmet kontrolü
      const assets = await client.query(
        `SELECT COUNT(*)::int AS c FROM hr_asset_assignments WHERE employee_id=$1 AND status='Zimmette'`,
        [t.employee_id],
      );
      if (assets.rows[0].c > 0) {
        const err = new Error(`Açık zimmet var (${assets.rows[0].c}). Önce iade edin.`);
        err.status = 400;
        throw err;
      }
      await client.query(
        `UPDATE hr_employees SET
           employment_status='Ayrildi', is_active=FALSE, termination_date=$2, updated_at=CURRENT_TIMESTAMP
         WHERE id=$1`,
        [t.employee_id, t.termination_date],
      );
      await client.query(
        `INSERT INTO hr_employment_history (employee_id, company_id, change_type, effective_date, description)
         VALUES ($1,$2,'IstenCikis',$3,$4)`,
        [t.employee_id, t.company_id, t.termination_date, `Çıkış ${t.termination_no} / ${t.reason_code}`],
      );
      const upd = await client.query(
        `UPDATE hr_terminations SET status='Onaylandi' WHERE id=$1 RETURNING *`,
        [t.id],
      );
      return upd.rows[0];
    });
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

// ---- Çıkış nedenleri (parametre) ----
router.get('/cikis-nedenleri', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT * FROM hr_termination_reasons
       WHERE (company_id IS NULL OR company_id=$1 OR $1 IS NULL)
       ORDER BY reason_code`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/cikis-nedenleri/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM hr_termination_reasons WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Neden bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/cikis-nedenleri', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id || null;
    if (!b.reason_code || !b.reason_name) {
      return res.status(400).json({ hata: 'reason_code ve reason_name zorunlu.' });
    }
    const r = await pool.query(
      `INSERT INTO hr_termination_reasons (
         company_id, country_code, reason_code, reason_name,
         severance_default, notice_default, requires_document, is_active, description
       ) VALUES (
         $1, COALESCE($2,'TR'), $3, $4,
         COALESCE($5,FALSE), COALESCE($6,FALSE), COALESCE($7,FALSE), COALESCE($8,TRUE), $9
       ) RETURNING *`,
      [
        firmaId, b.country_code, b.reason_code, b.reason_name,
        b.severance_default, b.notice_default, b.requires_document, b.is_active, b.description || null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/cikis-nedenleri/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE hr_termination_reasons SET
         reason_name = COALESCE($2, reason_name),
         severance_default = COALESCE($3, severance_default),
         notice_default = COALESCE($4, notice_default),
         requires_document = COALESCE($5, requires_document),
         is_active = COALESCE($6, is_active),
         description = COALESCE($7, description),
         country_code = COALESCE($8, country_code)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, b.reason_name, b.severance_default, b.notice_default,
        b.requires_document, b.is_active, b.description, b.country_code,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Neden bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/cikis-nedenleri/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE hr_termination_reasons SET is_active=FALSE WHERE id=$1 RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Neden bulunamadı.' });
    res.json({ silindi: false, pasife_alindi: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
