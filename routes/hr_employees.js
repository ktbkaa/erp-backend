const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');
const { annualLeaveEntitlementDays } = require('../src/services/hrPayrollService');

async function personelGetir(id) {
  const r = await pool.query(
    `
    SELECT e.*,
           d.department_code, d.department_name,
           p.position_code, p.position_name,
           m.employee_no AS manager_employee_no,
           CONCAT(COALESCE(m.first_name,''),' ',COALESCE(m.last_name,'')) AS manager_name,
           c.calendar_code, c.calendar_name,
           s.shift_code, s.shift_name,
           u.user_code, u.username
    FROM hr_employees e
    LEFT JOIN hr_departments d ON d.id = e.department_id
    LEFT JOIN hr_positions p ON p.id = e.position_id
    LEFT JOIN hr_employees m ON m.id = e.manager_employee_id
    LEFT JOIN hr_work_calendars c ON c.id = e.work_calendar_id
    LEFT JOIN hr_shifts s ON s.id = e.shift_id
    LEFT JOIN users u ON u.id = e.user_id
    WHERE e.id = $1
    `,
    [id],
  );
  return r.rows[0] || null;
}

function assertNoManagerCycle(employeeId, managerId) {
  if (!managerId) return;
  if (Number(employeeId) && Number(employeeId) === Number(managerId)) {
    const err = new Error('Personel kendi yöneticisi olamaz.');
    err.status = 400;
    throw err;
  }
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`e.company_id = $${params.length}`);
    }
    if (req.query.employment_status) {
      params.push(req.query.employment_status);
      where.push(`e.employment_status = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      where.push(`(e.employee_no ILIKE $${params.length} OR e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length})`);
    }
    const sql = `
      SELECT e.id, e.employee_no, e.first_name, e.last_name, e.employment_status,
             e.hire_date, e.department_id, e.position_id, e.manager_employee_id,
             e.company_id, e.is_active, e.email, e.phone,
             d.department_name, p.position_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      LEFT JOIN hr_positions p ON p.id = e.position_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.employee_no
      LIMIT 1000
    `;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await personelGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Personel bulunamadı.' });
    const firmaId = firmaIdFromReq(req);
    if (firmaId && Number(row.company_id) !== Number(firmaId)) {
      return res.status(404).json({ hata: 'Personel bulunamadı.' });
    }
    const hist = await pool.query(
      `SELECT * FROM hr_employment_history WHERE employee_id=$1 ORDER BY effective_date DESC, id DESC`,
      [row.id],
    );
    const salaries = await pool.query(
      `SELECT id, effective_from, effective_to, wage_type, gross_amount, currency_code
       FROM hr_employee_salaries WHERE employee_id=$1 ORDER BY effective_from DESC`,
      [row.id],
    );
    // Hassas alanları (national_id) yalnızca yanıtta bırak — UI yetkisi ayrıca kısıtlanmalı
    res.json({ ...row, history: hist.rows, salaries: salaries.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.first_name || !b.last_name || !b.hire_date) {
      return res.status(400).json({ hata: 'company_id, first_name, last_name, hire_date zorunlu.' });
    }
    assertNoManagerCycle(null, b.manager_employee_id);
    const id = await withTransaction(pool, async (client) => {
      const no = b.employee_no || (await sonrakiKod(client, 'HR_EMPLOYEE'));
      const ins = await client.query(
        `
        INSERT INTO hr_employees (
          company_id, plant_id, employee_no, first_name, last_name, national_id, birth_date,
          nationality_code, country_code, gender, marital_status, blood_type,
          email, phone, mobile_phone, address, emergency_contact_name, emergency_contact_phone,
          department_id, position_id, manager_employee_id, user_id, hire_date, contract_type,
          employment_status, probation_end_date, contract_end_date, work_calendar_id, shift_id,
          cost_center_code, employee_type, iban, bank_name, sgk_sicil_no, description
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          COALESCE($8,'TR'),COALESCE($9,'TR'),$10,$11,$12,
          $13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,COALESCE($24,'BelirsizSureli'),
          COALESCE($25,'Aktif'),$26,$27,$28,$29,
          $30,COALESCE($31,'Normal'),$32,$33,$34,$35
        ) RETURNING id
        `,
        [
          firmaId, b.plant_id || null, no, b.first_name, b.last_name, b.national_id || null, b.birth_date || null,
          b.nationality_code, b.country_code, b.gender || null, b.marital_status || null, b.blood_type || null,
          b.email || null, b.phone || null, b.mobile_phone || null, b.address || null,
          b.emergency_contact_name || null, b.emergency_contact_phone || null,
          b.department_id || null, b.position_id || null, b.manager_employee_id || null, b.user_id || null,
          b.hire_date, b.contract_type, b.employment_status, b.probation_end_date || null, b.contract_end_date || null,
          b.work_calendar_id || null, b.shift_id || null, b.cost_center_code || null, b.employee_type,
          b.iban || null, b.bank_name || null, b.sgk_sicil_no || null, b.description || null,
        ],
      );
      const empId = ins.rows[0].id;
      await client.query(
        `INSERT INTO hr_employment_history (
           employee_id, company_id, change_type, effective_date, department_id, position_id,
           manager_employee_id, plant_id, cost_center_code, description
         ) VALUES ($1,$2,'IseGiris',$3,$4,$5,$6,$7,$8,$9)`,
        [
          empId, firmaId, b.hire_date, b.department_id || null, b.position_id || null,
          b.manager_employee_id || null, b.plant_id || null, b.cost_center_code || null, 'İşe giriş kaydı',
        ],
      );
      if (b.gross_amount != null) {
        await client.query(
          `INSERT INTO hr_employee_salaries (employee_id, company_id, effective_from, wage_type, gross_amount, currency_code)
           VALUES ($1,$2,$3,COALESCE($4,'Aylik'),$5,COALESCE($6,'TRY'))`,
          [empId, firmaId, b.hire_date, b.wage_type, b.gross_amount, b.currency_code],
        );
      }
      return empId;
    });
    res.status(201).json(await personelGetir(id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const mevcut = await personelGetir(req.params.id);
    if (!mevcut) return res.status(404).json({ hata: 'Personel bulunamadı.' });
    assertNoManagerCycle(mevcut.id, b.manager_employee_id ?? mevcut.manager_employee_id);

    // Yönetici döngü kontrolü (yukarı yürüyüş)
    if (b.manager_employee_id) {
      let cur = Number(b.manager_employee_id);
      const seen = new Set([Number(mevcut.id)]);
      while (cur) {
        if (seen.has(cur)) {
          return res.status(400).json({ hata: 'Yönetici hiyerarşisinde döngü oluşur.' });
        }
        seen.add(cur);
        const r = await pool.query(`SELECT manager_employee_id FROM hr_employees WHERE id=$1`, [cur]);
        cur = r.rows[0]?.manager_employee_id ? Number(r.rows[0].manager_employee_id) : null;
      }
    }

    await withTransaction(pool, async (client) => {
      await client.query(
        `
        UPDATE hr_employees SET
          plant_id = COALESCE($2, plant_id),
          first_name = COALESCE($3, first_name),
          last_name = COALESCE($4, last_name),
          national_id = COALESCE($5, national_id),
          birth_date = COALESCE($6, birth_date),
          email = COALESCE($7, email),
          phone = COALESCE($8, phone),
          mobile_phone = COALESCE($9, mobile_phone),
          address = COALESCE($10, address),
          emergency_contact_name = COALESCE($11, emergency_contact_name),
          emergency_contact_phone = COALESCE($12, emergency_contact_phone),
          department_id = COALESCE($13, department_id),
          position_id = COALESCE($14, position_id),
          manager_employee_id = COALESCE($15, manager_employee_id),
          user_id = COALESCE($16, user_id),
          contract_type = COALESCE($17, contract_type),
          employment_status = COALESCE($18, employment_status),
          work_calendar_id = COALESCE($19, work_calendar_id),
          shift_id = COALESCE($20, shift_id),
          cost_center_code = COALESCE($21, cost_center_code),
          employee_type = COALESCE($22, employee_type),
          iban = COALESCE($23, iban),
          bank_name = COALESCE($24, bank_name),
          sgk_sicil_no = COALESCE($25, sgk_sicil_no),
          description = COALESCE($26, description),
          marital_status = COALESCE($27, marital_status),
          blood_type = COALESCE($28, blood_type),
          is_active = COALESCE($29, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id=$1
        `,
        [
          mevcut.id, b.plant_id, b.first_name, b.last_name, b.national_id, b.birth_date,
          b.email, b.phone, b.mobile_phone, b.address, b.emergency_contact_name, b.emergency_contact_phone,
          b.department_id, b.position_id, b.manager_employee_id, b.user_id, b.contract_type,
          b.employment_status, b.work_calendar_id, b.shift_id, b.cost_center_code, b.employee_type,
          b.iban, b.bank_name, b.sgk_sicil_no, b.description, b.marital_status, b.blood_type,
          b.is_active,
        ],
      );

      const orgChanged =
        (b.department_id != null && Number(b.department_id) !== Number(mevcut.department_id)) ||
        (b.position_id != null && Number(b.position_id) !== Number(mevcut.position_id)) ||
        (b.manager_employee_id != null && Number(b.manager_employee_id) !== Number(mevcut.manager_employee_id));
      if (orgChanged) {
        const eff = b.effective_date || new Date().toISOString().slice(0, 10);
        await client.query(
          `UPDATE hr_employment_history SET end_date=$2
           WHERE employee_id=$1 AND end_date IS NULL AND change_type IN ('IseGiris','Organizasyon')`,
          [mevcut.id, eff],
        );
        await client.query(
          `INSERT INTO hr_employment_history (
             employee_id, company_id, change_type, effective_date, department_id, position_id,
             manager_employee_id, plant_id, cost_center_code, description
           ) VALUES ($1,$2,'Organizasyon',$3,$4,$5,$6,$7,$8,$9)`,
          [
            mevcut.id, mevcut.company_id, eff,
            b.department_id ?? mevcut.department_id,
            b.position_id ?? mevcut.position_id,
            b.manager_employee_id ?? mevcut.manager_employee_id,
            b.plant_id ?? mevcut.plant_id,
            b.cost_center_code ?? mevcut.cost_center_code,
            b.history_note || 'Organizasyon değişikliği',
          ],
        );
      }
    });
    res.json(await personelGetir(mevcut.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

/** Yıllık izin hak ediş önerisi (4857 md.53) */
router.get('/:id/izin-hakedis', async (req, res) => {
  try {
    const row = await personelGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Personel bulunamadı.' });
    const asOf = req.query.as_of || new Date().toISOString().slice(0, 10);
    const hire = new Date(row.hire_date);
    const asOfD = new Date(asOf);
    let years = (asOfD - hire) / (365.25 * 24 * 3600 * 1000);
    if (years < 0) years = 0;
    let age = null;
    if (row.birth_date) {
      age = (asOfD - new Date(row.birth_date)) / (365.25 * 24 * 3600 * 1000);
    }
    const days = annualLeaveEntitlementDays({
      serviceYears: years,
      age: age != null ? Math.floor(age) : null,
      underground: req.query.underground === 'true',
    });
    res.json({
      employee_id: row.id,
      employee_no: row.employee_no,
      hire_date: row.hire_date,
      as_of: asOf,
      service_years: Math.floor(years * 100) / 100,
      entitlement_days: days,
      rule: '4857 md.53 asgari süreler (sözleşme ile artırılabilir)',
      source: 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4857.pdf',
    });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // Soft: pasife al
    const r = await pool.query(
      `UPDATE hr_employees SET is_active=FALSE, employment_status='Pasif', updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING id`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Personel bulunamadı.' });
    res.json({ silindi: false, pasife_alindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
