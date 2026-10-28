const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { kullaniciGetir, reqKullaniciKodu } = require('../src/utils/yetki');

function dakikaFarki(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000);
}

router.get('/ham', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`r.company_id=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`r.employee_id=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT r.*, e.employee_no, e.first_name, e.last_name
       FROM hr_attendance_raw r
       LEFT JOIN hr_employees e ON e.id = r.employee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY r.event_time DESC LIMIT 1000`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/ham', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.event_time || !b.event_type) {
      return res.status(400).json({ hata: 'company_id, event_time, event_type zorunlu.' });
    }
    if (b.source_record_id) {
      const dup = await pool.query(
        `SELECT id FROM hr_attendance_raw WHERE company_id=$1 AND source_system=$2 AND source_record_id=$3`,
        [firmaId, b.source_system || 'MANUAL', b.source_record_id],
      );
      if (dup.rows[0]) {
        return res.status(409).json({ hata: 'Mükerrer PDKS kaydı.', id: dup.rows[0].id });
      }
    }
    const r = await pool.query(
      `INSERT INTO hr_attendance_raw (
         company_id, employee_id, device_code, source_system, source_record_id,
         event_time, event_type, raw_payload, is_duplicate
       ) VALUES ($1,$2,$3,COALESCE($4,'MANUAL'),$5,$6,$7,$8,FALSE)
       RETURNING *`,
      [
        firmaId, b.employee_id || null, b.device_code || null, b.source_system,
        b.source_record_id || null, b.event_time, b.event_type,
        b.raw_payload ? JSON.stringify(b.raw_payload) : null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/gunluk', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`d.company_id=$${params.length}`);
    }
    if (req.query.employee_id) {
      params.push(req.query.employee_id);
      where.push(`d.employee_id=$${params.length}`);
    }
    if (req.query.from) {
      params.push(req.query.from);
      where.push(`d.work_date>=$${params.length}`);
    }
    if (req.query.to) {
      params.push(req.query.to);
      where.push(`d.work_date<=$${params.length}`);
    }
    const r = await pool.query(
      `SELECT d.*, e.employee_no, e.first_name, e.last_name
       FROM hr_attendance_days d
       JOIN hr_employees e ON e.id = d.employee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY d.work_date DESC, e.employee_no
       LIMIT 1000`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

/**
 * Ham giriş/çıkışlardan günlük puantaj üret.
 * Planlanan süre personel takviminden; gerçekleşen giriş-çıkış farkından (ara dinlenme düşülerek).
 */
router.post('/isle', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    const employeeId = b.employee_id;
    const workDate = b.work_date;
    if (!firmaId || !employeeId || !workDate) {
      return res.status(400).json({ hata: 'company_id, employee_id, work_date zorunlu.' });
    }
    const out = await withTransaction(pool, async (client) => {
      const emp = await client.query(`SELECT * FROM hr_employees WHERE id=$1`, [employeeId]);
      if (!emp.rows[0]) {
        const err = new Error('Personel bulunamadı.');
        err.status = 404;
        throw err;
      }
      const dayStart = `${workDate} 00:00:00`;
      const dayEnd = `${workDate} 23:59:59`;
      const raw = await client.query(
        `SELECT * FROM hr_attendance_raw
         WHERE company_id=$1 AND employee_id=$2
           AND event_time >= $3::timestamp AND event_time <= $4::timestamp
           AND COALESCE(is_duplicate,FALSE)=FALSE
         ORDER BY event_time`,
        [firmaId, employeeId, dayStart, dayEnd],
      );
      const giris = raw.rows.find((x) => x.event_type === 'Giris');
      const cikis = [...raw.rows].reverse().find((x) => x.event_type === 'Cikis');

      let planned = 480;
      let breakMin = 60;
      if (emp.rows[0].work_calendar_id) {
        const cal = await client.query(`SELECT * FROM hr_work_calendars WHERE id=$1`, [emp.rows[0].work_calendar_id]);
        if (cal.rows[0]) {
          breakMin = Number(cal.rows[0].break_minutes || 60);
          planned = Math.round(Number(cal.rows[0].daily_net_hours || 8) * 60);
        }
      }
      // Hafta tatili / resmi tatil
      const wd = new Date(workDate + 'T12:00:00').getDay();
      const workDays = emp.rows[0].work_calendar_id
        ? Number((await client.query(`SELECT work_days_per_week FROM hr_work_calendars WHERE id=$1`, [emp.rows[0].work_calendar_id])).rows[0]?.work_days_per_week || 5)
        : 5;
      const isWeekend = workDays <= 5 ? (wd === 0 || wd === 6) : (wd === 0);
      const holiday = await client.query(
        `SELECT 1 FROM hr_public_holidays
         WHERE holiday_date=$1::date AND (company_id IS NULL OR company_id=$2) LIMIT 1`,
        [workDate, firmaId],
      );
      if (isWeekend || holiday.rows[0]) planned = 0;

      let actual = 0;
      let missing = false;
      if (giris && cikis) {
        actual = Math.max(0, dakikaFarki(giris.event_time, cikis.event_time) - breakMin);
      } else if (!giris && !cikis && planned === 0) {
        actual = 0;
      } else {
        missing = true;
      }
      const overtime = Math.max(0, actual - planned);
      const late = 0;
      const early = 0;

      const existing = await client.query(
        `SELECT id FROM hr_attendance_days WHERE employee_id=$1 AND work_date=$2`,
        [employeeId, workDate],
      );
      const status = missing ? 'EksikKayit' : 'Hesaplandi';
      const desc = b.description || (missing ? 'Eksik giriş/çıkış' : null);
      let row;
      if (existing.rows[0]) {
        const upd = await client.query(
          `UPDATE hr_attendance_days SET
             planned_minutes=$2, actual_minutes=$3, break_minutes=$4,
             late_minutes=$5, early_leave_minutes=$6, overtime_minutes=$7,
             status=$8, description=$9
           WHERE id=$1 RETURNING *`,
          [existing.rows[0].id, planned, actual, breakMin, late, early, overtime, status, desc],
        );
        row = upd.rows[0];
      } else {
        const ins = await client.query(
          `INSERT INTO hr_attendance_days (
             company_id, employee_id, work_date,
             planned_minutes, actual_minutes, break_minutes,
             late_minutes, early_leave_minutes, overtime_minutes,
             status, description
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING *`,
          [firmaId, employeeId, workDate, planned, actual, breakMin, late, early, overtime, status, desc],
        );
        row = ins.rows[0];
      }
      row.undertime_minutes = Math.max(0, planned - actual);
      row.first_in = giris?.event_time || null;
      row.last_out = cikis?.event_time || null;
      return row;
    });
    res.json(out);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

/** Manuel puantaj düzeltmesi — ham PDKS kayıtları silinmez; gerekçe description'da tutulur */
router.post('/gunluk/:id/duzelt', async (req, res) => {
  try {
    const b = req.body || {};
    const user = await kullaniciGetir(pool, reqKullaniciKodu(req));
    const reason = b.correction_reason || b.reason || 'Manuel düzeltme';
    const who = user?.user_code || user?.username || 'sistem';
    const r = await pool.query(
      `UPDATE hr_attendance_days SET
         actual_minutes = COALESCE($2, actual_minutes),
         overtime_minutes = COALESCE($3, overtime_minutes),
         late_minutes = COALESCE($4, late_minutes),
         early_leave_minutes = COALESCE($5, early_leave_minutes),
         leave_minutes = COALESCE($6, leave_minutes),
         status='ManuelDuzeltme',
         description = $7
       WHERE id=$1 RETURNING *`,
      [
        req.params.id,
        b.actual_minutes, b.overtime_minutes, b.late_minutes,
        b.early_leave_minutes, b.leave_minutes,
        `${reason} | düzelten=${who}`,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Puantaj günü bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
