const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function istasyonGetir(id) {
  const r = await pool.query(
    `
    SELECT ws.*,
           m.center_code, m.center_name, m.plant_id,
           i.plant_code, i.plant_name, i.company_id
    FROM work_stations ws
    JOIN work_centers m ON m.id = ws.work_center_id
    JOIN plants i ON i.id = m.plant_id
    WHERE ws.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`i.company_id = $${params.length}`);
    }
    if (req.query.work_center_id) {
      params.push(req.query.work_center_id);
      where.push(`ws.work_center_id = $${params.length}`);
    }
    if (String(req.query.is_active) === 'true') where.push(`ws.is_active IS DISTINCT FROM FALSE`);
    const result = await pool.query(
      `
      SELECT ws.*,
             m.center_code, m.center_name, m.plant_id,
             i.plant_code, i.plant_name, i.company_id
      FROM work_stations ws
      JOIN work_centers m ON m.id = ws.work_center_id
      JOIN plants i ON i.id = m.plant_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ws.id
      `,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await istasyonGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'İş istasyonu bulunamadı.' });
    const firmaId = firmaIdFromReq(req);
    if (firmaId && Number(row.company_id) !== Number(firmaId)) {
      return res.status(404).json({ hata: 'İş istasyonu bulunamadı.' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { work_center_id, station_code, station_name, is_active } = req.body || {};
    if (!work_center_id || !station_name) {
      return res.status(400).json({ hata: 'work_center_id ve station_name zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const kod = station_code || (await sonrakiKod(client, 'IS_ISTASYONU'));
      const ins = await client.query(
        `INSERT INTO work_stations (work_center_id, station_code, station_name, is_active)
         VALUES ($1,$2,$3,COALESCE($4,TRUE)) RETURNING id`,
        [work_center_id, kod, station_name, is_active]
      );
      return ins.rows[0].id;
    });
    res.status(201).json(await istasyonGetir(id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { work_center_id, station_name, is_active } = req.body || {};
    const result = await pool.query(
      `UPDATE work_stations SET
         work_center_id = COALESCE($2, work_center_id),
         station_name = COALESCE($3, station_name),
         is_active = COALESCE($4, is_active)
       WHERE id=$1 RETURNING id`,
      [req.params.id, work_center_id || null, station_name || null, is_active]
    );
    if (!result.rows[0]) return res.status(404).json({ hata: 'İş istasyonu bulunamadı.' });
    res.json(await istasyonGetir(req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM work_stations WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ hata: 'İş istasyonu bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

module.exports = router;
