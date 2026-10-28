const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

router.get('/takvimler', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT * FROM hr_work_calendars
       WHERE ($1::int IS NULL OR company_id=$1)
       ORDER BY calendar_code, version_no DESC`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/takvimler/:id', async (req, res) => {
  try {
    const cal = await pool.query(`SELECT * FROM hr_work_calendars WHERE id=$1`, [req.params.id]);
    if (!cal.rows[0]) return res.status(404).json({ hata: 'Takvim bulunamadı.' });
    res.json(cal.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/takvimler', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.calendar_name) {
      return res.status(400).json({ hata: 'company_id ve calendar_name zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const kod = b.calendar_code || (await sonrakiKod(client, 'HR_CAL'));
      const ver = await client.query(
        `SELECT COALESCE(MAX(version_no),0)+1 AS v FROM hr_work_calendars WHERE company_id=$1 AND calendar_code=$2`,
        [firmaId, kod],
      );
      const version = b.version_no || ver.rows[0].v;
      if (b.is_active !== false) {
        await client.query(
          `UPDATE hr_work_calendars SET is_active=FALSE WHERE company_id=$1 AND calendar_code=$2`,
          [firmaId, kod],
        );
      }
      const ins = await client.query(
        `INSERT INTO hr_work_calendars (
           company_id, calendar_code, calendar_name, country_code, version_no,
           work_days_per_week, daily_presence_hours, daily_net_hours, break_minutes,
           weekly_net_hours, is_active, effective_from, effective_to, description
         ) VALUES (
           $1,$2,$3,COALESCE($4,'TR'),$5,
           COALESCE($6::numeric,5), COALESCE($7::numeric,9), COALESCE($8::numeric,8), COALESCE($9::int,60),
           COALESCE($10::numeric,40), COALESCE($11,TRUE), $12, $13, $14
         ) RETURNING id`,
        [
          firmaId, kod, b.calendar_name, b.country_code, version,
          b.work_days_per_week, b.daily_presence_hours, b.daily_net_hours, b.break_minutes,
          b.weekly_net_hours, b.is_active !== false, b.effective_from || null, b.effective_to || null,
          b.description || b.notes || null,
        ],
      );
      return ins.rows[0].id;
    });
    const full = await pool.query(`SELECT * FROM hr_work_calendars WHERE id=$1`, [id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/takvimler/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE hr_work_calendars SET
         calendar_name = COALESCE($2, calendar_name),
         work_days_per_week = COALESCE($3, work_days_per_week),
         daily_presence_hours = COALESCE($4, daily_presence_hours),
         daily_net_hours = COALESCE($5, daily_net_hours),
         break_minutes = COALESCE($6, break_minutes),
         weekly_net_hours = COALESCE($7, weekly_net_hours),
         is_active = COALESCE($8, is_active),
         effective_to = COALESCE($9, effective_to),
         description = COALESCE($10, description)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, b.calendar_name, b.work_days_per_week, b.daily_presence_hours,
        b.daily_net_hours, b.break_minutes, b.weekly_net_hours, b.is_active,
        b.effective_to, b.description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Takvim bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/vardiyalar', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const r = await pool.query(
      `SELECT * FROM hr_shifts WHERE ($1::int IS NULL OR company_id=$1) ORDER BY shift_code`,
      [firmaId || null],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/vardiyalar/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM hr_shifts WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Vardiya bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/vardiyalar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.shift_name || !b.start_time || !b.end_time) {
      return res.status(400).json({ hata: 'company_id, shift_name, start_time, end_time zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const kod = b.shift_code || (await sonrakiKod(client, 'HR_SHIFT'));
      const ins = await client.query(
        `INSERT INTO hr_shifts (
           company_id, shift_code, shift_name, start_time, end_time, break_minutes,
           crosses_midnight, net_hours, is_active, description
         ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,60),COALESCE($7,FALSE),$8,COALESCE($9,TRUE),$10)
         RETURNING id`,
        [
          firmaId, kod, b.shift_name, b.start_time, b.end_time, b.break_minutes,
          b.crosses_midnight, b.net_hours || null, b.is_active, b.description || null,
        ],
      );
      return ins.rows[0].id;
    });
    const row = await pool.query(`SELECT * FROM hr_shifts WHERE id=$1`, [id]);
    res.status(201).json(row.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/vardiyalar/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE hr_shifts SET
         shift_name = COALESCE($2, shift_name),
         start_time = COALESCE($3, start_time),
         end_time = COALESCE($4, end_time),
         break_minutes = COALESCE($5, break_minutes),
         crosses_midnight = COALESCE($6, crosses_midnight),
         net_hours = COALESCE($7, net_hours),
         is_active = COALESCE($8, is_active),
         description = COALESCE($9, description)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, b.shift_name, b.start_time, b.end_time, b.break_minutes,
        b.crosses_midnight, b.net_hours, b.is_active, b.description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Vardiya bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/vardiyalar/:id', async (req, res) => {
  try {
    const used = await pool.query(`SELECT 1 FROM hr_employees WHERE shift_id=$1 LIMIT 1`, [req.params.id]);
    if (used.rows[0]) {
      await pool.query(`UPDATE hr_shifts SET is_active=FALSE WHERE id=$1`, [req.params.id]);
      return res.json({ silindi: false, pasife_alindi: true, id: Number(req.params.id) });
    }
    const r = await pool.query(`DELETE FROM hr_shifts WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Vardiya bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/vardiya-atamalari', async (req, res) => {
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
      `SELECT a.*, e.employee_no, e.first_name, e.last_name, s.shift_code, s.shift_name
       FROM hr_shift_assignments a
       JOIN hr_employees e ON e.id = a.employee_id
       JOIN hr_shifts s ON s.id = a.shift_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.start_date DESC`,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/vardiya-atamalari/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.*, e.employee_no, e.first_name, e.last_name, s.shift_code, s.shift_name
       FROM hr_shift_assignments a
       JOIN hr_employees e ON e.id = a.employee_id
       JOIN hr_shifts s ON s.id = a.shift_id
       WHERE a.id=$1`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Atama bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/vardiya-atamalari', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = firmaIdFromReq(req) || b.company_id;
    if (!firmaId || !b.employee_id || !b.shift_id || !b.start_date) {
      return res.status(400).json({ hata: 'company_id, employee_id, shift_id, start_date zorunlu.' });
    }
    const r = await pool.query(
      `INSERT INTO hr_shift_assignments (company_id, employee_id, shift_id, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [firmaId, b.employee_id, b.shift_id, b.start_date, b.end_date || null],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/vardiya-atamalari/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE hr_shift_assignments SET
         shift_id = COALESCE($2, shift_id),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date)
       WHERE id=$1 RETURNING *`,
      [req.params.id, b.shift_id, b.start_date, b.end_date],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Atama bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/vardiya-atamalari/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM hr_shift_assignments WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Atama bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/tatiller', async (req, res) => {
  try {
    const firmaId = firmaIdFromReq(req);
    const year = req.query.year ? Number(req.query.year) : null;
    const r = await pool.query(
      `SELECT * FROM hr_public_holidays
       WHERE ($1::int IS NULL OR company_id IS NULL OR company_id=$1)
         AND ($2::int IS NULL OR year_no=$2)
       ORDER BY holiday_date`,
      [firmaId || null, year],
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/tatiller/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM hr_public_holidays WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Tatil bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/tatiller', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.holiday_date || !b.holiday_name) {
      return res.status(400).json({ hata: 'holiday_date ve holiday_name zorunlu.' });
    }
    const firmaId = firmaIdFromReq(req) || b.company_id || null;
    const year = b.year_no || Number(String(b.holiday_date).slice(0, 4));
    const r = await pool.query(
      `INSERT INTO hr_public_holidays (
         company_id, country_code, holiday_date, holiday_name, is_half_day, year_no
       ) VALUES ($1,COALESCE($2,'TR'),$3,$4,COALESCE($5,FALSE),$6)
       ON CONFLICT (country_code, holiday_date, company_id) DO UPDATE SET
         holiday_name=EXCLUDED.holiday_name,
         is_half_day=EXCLUDED.is_half_day,
         year_no=EXCLUDED.year_no
       RETURNING *`,
      [firmaId, b.country_code, b.holiday_date, b.holiday_name, b.is_half_day, year],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/tatiller/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE hr_public_holidays SET
         holiday_date = COALESCE($2, holiday_date),
         holiday_name = COALESCE($3, holiday_name),
         is_half_day = COALESCE($4, is_half_day),
         year_no = COALESCE($5, year_no),
         country_code = COALESCE($6, country_code)
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, b.holiday_date, b.holiday_name, b.is_half_day,
        b.year_no, b.country_code,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Tatil bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/tatiller/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM hr_public_holidays WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Tatil bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
