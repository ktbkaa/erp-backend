/**
 * Kalite — ölçüm cihazı ve kalibrasyon kayıtları
 * /kk-cihazlar, /kk-kalibrasyonlar
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

async function ensureSeries(client, seriesCode, prefix, screenCode, screenName) {
  await client.query(
    `INSERT INTO number_series (series_code, prefix, description, last_number, screen_code, screen_name, is_active)
     VALUES ($1,$2,$3,0,$4,$5,TRUE)
     ON CONFLICT (series_code) DO NOTHING`,
    [seriesCode, prefix, screenName, screenCode, screenName],
  );
  const locked = await client.query(
    `SELECT last_number FROM number_series WHERE series_code=$1 FOR UPDATE`,
    [seriesCode],
  );
  const n = Number(locked.rows[0].last_number) + 1;
  await client.query(`UPDATE number_series SET last_number=$1 WHERE series_code=$2`, [n, seriesCode]);
  return `${prefix}${String(n).padStart(5, '0')}`;
}

async function getInstrument(id) {
  const r = await pool.query(
    `SELECT i.*, c.company_code, p.plant_code, p.plant_name,
            u.user_code AS responsible_user_code
     FROM qc_instruments i
     LEFT JOIN companies c ON c.id = i.company_id
     LEFT JOIN plants p ON p.id = i.plant_id
     LEFT JOIN users u ON u.id = i.responsible_user_id
     WHERE i.id=$1`,
    [id],
  );
  return r.rows[0] || null;
}

async function getCalibration(id) {
  const r = await pool.query(
    `SELECT k.*, i.instrument_code, i.instrument_name, i.serial_no
     FROM qc_calibrations k
     JOIN qc_instruments i ON i.id = k.instrument_id
     WHERE k.id=$1`,
    [id],
  );
  return r.rows[0] || null;
}

// ─── Cihazlar ───
router.get('/cihazlar', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`i.company_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`i.status = $${params.length}`);
    }
    const sql = `
      SELECT i.id, i.instrument_code, i.instrument_name, i.instrument_type,
             i.serial_no, i.status, i.next_calibration_date, i.location_code,
             i.company_id, i.is_active
      FROM qc_instruments i
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY i.instrument_code
      LIMIT 500`;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/cihazlar/:id', async (req, res) => {
  try {
    const row = await getInstrument(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Cihaz bulunamadı.' });
    const cals = await pool.query(
      `SELECT id, calibration_no, calibration_date, result_status, next_due_date, status
       FROM qc_calibrations WHERE instrument_id=$1 ORDER BY calibration_date DESC`,
      [row.id],
    );
    res.json({ ...row, calibrations: cals.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/cihazlar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = companyIdFromReq(req) || b.company_id;
    if (!firmaId || !b.instrument_name) {
      return res.status(400).json({ hata: 'company_id ve instrument_name zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const code = b.instrument_code
        || await ensureSeries(client, 'KK_CIHAZ', 'CIH', 'kk-cihazlar', 'Kalite Cihazları');
      const r = await client.query(
        `INSERT INTO qc_instruments (
           company_id, plant_id, instrument_code, instrument_name, instrument_type,
           serial_no, manufacturer, model_name, measurement_range, accuracy_class,
           location_code, responsible_user_id, status, next_calibration_date,
           calibration_interval_days, is_active, description
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'Aktif'),$14,
                   COALESCE($15,365),COALESCE($16,TRUE),$17)
         RETURNING id`,
        [
          firmaId, b.plant_id || null, code, b.instrument_name,
          b.instrument_type || 'Olcum', b.serial_no || null, b.manufacturer || null,
          b.model_name || null, b.measurement_range || null, b.accuracy_class || null,
          b.location_code || null, b.responsible_user_id || null, b.status || 'Aktif',
          b.next_calibration_date || null, b.calibration_interval_days, b.is_active !== false,
          b.description || null,
        ],
      );
      return r.rows[0].id;
    });
    res.status(201).json(await getInstrument(id));
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 400).json({ hata: err.message });
  }
});

router.put('/cihazlar/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE qc_instruments SET
         instrument_name = COALESCE($2, instrument_name),
         instrument_type = COALESCE($3, instrument_type),
         serial_no = COALESCE($4, serial_no),
         manufacturer = COALESCE($5, manufacturer),
         model_name = COALESCE($6, model_name),
         measurement_range = COALESCE($7, measurement_range),
         accuracy_class = COALESCE($8, accuracy_class),
         location_code = COALESCE($9, location_code),
         responsible_user_id = COALESCE($10, responsible_user_id),
         status = COALESCE($11, status),
         next_calibration_date = COALESCE($12::date, next_calibration_date),
         calibration_interval_days = COALESCE($13, calibration_interval_days),
         plant_id = COALESCE($14, plant_id),
         is_active = COALESCE($15, is_active),
         description = COALESCE($16, description),
         updated_at = CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING id`,
      [
        req.params.id, b.instrument_name, b.instrument_type, b.serial_no,
        b.manufacturer, b.model_name, b.measurement_range, b.accuracy_class,
        b.location_code, b.responsible_user_id, b.status, b.next_calibration_date,
        b.calibration_interval_days, b.plant_id, b.is_active, b.description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Cihaz bulunamadı.' });
    res.json(await getInstrument(r.rows[0].id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

// ─── Kalibrasyonlar ───
router.get('/kalibrasyonlar', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req);
    const params = [];
    const where = [];
    if (firmaId) {
      params.push(firmaId);
      where.push(`k.company_id = $${params.length}`);
    }
    if (req.query.instrument_id) {
      params.push(Number(req.query.instrument_id));
      where.push(`k.instrument_id = $${params.length}`);
    }
    const sql = `
      SELECT k.id, k.calibration_no, k.calibration_date, k.result_status,
             k.next_due_date, k.status, k.certificate_no,
             i.instrument_code, i.instrument_name
      FROM qc_calibrations k
      JOIN qc_instruments i ON i.id = k.instrument_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY k.calibration_date DESC, k.id DESC
      LIMIT 500`;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/kalibrasyonlar/:id', async (req, res) => {
  try {
    const row = await getCalibration(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kalibrasyon bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/kalibrasyonlar', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = companyIdFromReq(req) || b.company_id;
    if (!firmaId || !b.instrument_id) {
      return res.status(400).json({ hata: 'company_id ve instrument_id zorunlu.' });
    }
    const calDate = b.calibration_date || new Date().toISOString().slice(0, 10);
    const inst = await pool.query(`SELECT * FROM qc_instruments WHERE id=$1`, [b.instrument_id]);
    if (!inst.rows[0]) return res.status(404).json({ hata: 'Cihaz bulunamadı.' });
    const interval = Number(inst.rows[0].calibration_interval_days || 365);
    const nextDue = b.next_due_date || (() => {
      const d = new Date(calDate);
      d.setDate(d.getDate() + interval);
      return d.toISOString().slice(0, 10);
    })();
    const id = await withTransaction(pool, async (client) => {
      const code = b.calibration_no
        || await ensureSeries(client, 'KK_KAL', 'KAL', 'kk-kalibrasyonlar', 'Kalibrasyonlar');
      const r = await client.query(
        `INSERT INTO qc_calibrations (
           company_id, instrument_id, calibration_no, calibration_date, due_date,
           performed_by, lab_name, certificate_no, result_status, deviation_note,
           next_due_date, cost_amount, currency_code, status, description
         ) VALUES ($1,$2,$3,$4::date,$5::date,$6,$7,$8,COALESCE($9,'Uygun'),$10,
                   $11::date,$12,COALESCE($13,'TRY'),COALESCE($14,'Tamamlandi'),$15)
         RETURNING id`,
        [
          firmaId, b.instrument_id, code, calDate, b.due_date || null,
          b.performed_by || null, b.lab_name || null, b.certificate_no || null,
          b.result_status || 'Uygun', b.deviation_note || null, nextDue,
          b.cost_amount ?? null, b.currency_code || 'TRY', b.status || 'Tamamlandi',
          b.description || null,
        ],
      );
      await client.query(
        `UPDATE qc_instruments SET next_calibration_date=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
        [b.instrument_id, nextDue],
      );
      return r.rows[0].id;
    });
    res.status(201).json(await getCalibration(id));
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 400).json({ hata: err.message });
  }
});

router.put('/kalibrasyonlar/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await pool.query(
      `UPDATE qc_calibrations SET
         result_status = COALESCE($2, result_status),
         performed_by = COALESCE($3, performed_by),
         lab_name = COALESCE($4, lab_name),
         certificate_no = COALESCE($5, certificate_no),
         deviation_note = COALESCE($6, deviation_note),
         next_due_date = COALESCE($7::date, next_due_date),
         cost_amount = COALESCE($8, cost_amount),
         status = COALESCE($9, status),
         description = COALESCE($10, description),
         updated_at = CURRENT_TIMESTAMP
       WHERE id=$1 RETURNING id, instrument_id, next_due_date`,
      [
        req.params.id, b.result_status, b.performed_by, b.lab_name,
        b.certificate_no, b.deviation_note, b.next_due_date, b.cost_amount,
        b.status, b.description,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kalibrasyon bulunamadı.' });
    if (r.rows[0].next_due_date) {
      await pool.query(
        `UPDATE qc_instruments SET next_calibration_date=$2 WHERE id=$1`,
        [r.rows[0].instrument_id, r.rows[0].next_due_date],
      );
    }
    res.json(await getCalibration(r.rows[0].id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

module.exports = router;
