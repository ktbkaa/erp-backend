const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const bas = req.query.bas || req.query.baslangic;
    const bit = req.query.bit || req.query.bitis;
    const params = [];
    const where = [];
    if (bas) {
      params.push(bas);
      where.push(`a.start_at >= $${params.length}::timestamp`);
    }
    if (bit) {
      params.push(bit);
      where.push(`a.start_at <= $${params.length}::timestamp`);
    }
    if (req.query.user_code) {
      params.push(req.query.user_code);
      where.push(`a.user_code = $${params.length}`);
    }

    const ajanda = await pool.query(
      `
      SELECT a.*, c.partner_name, 'ajanda' AS source
      FROM crm_calendar_entries a
      LEFT JOIN partners c ON c.id = a.partner_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.start_at
      `,
      params
    );

    // Faaliyet + görev birleşik görünüm (varsa)
    let faaliyetler = [];
    let gorevler = [];
    try {
      const fParams = [];
      const fWhere = [];
      if (bas) {
        fParams.push(bas);
        fWhere.push(`COALESCE(planned_date, created_at) >= $${fParams.length}::date`);
      }
      if (bit) {
        fParams.push(bit);
        fWhere.push(`COALESCE(planned_date, created_at) <= $${fParams.length}::date`);
      }
      const fr = await pool.query(
        `
        SELECT id, subject AS title, planned_date AS start_at, status, 'faaliyet' AS source
        FROM crm_activities
        ${fWhere.length ? `WHERE ${fWhere.join(' AND ')}` : ''}
        ORDER BY planned_date NULLS LAST
        LIMIT 200
        `,
        fParams
      );
      faaliyetler = fr.rows;
    } catch (_) { /* tablo/kolon farkı */ }

    try {
      const gParams = [];
      const gWhere = [];
      if (bas) {
        gParams.push(bas);
        gWhere.push(`COALESCE(due_date, created_at) >= $${gParams.length}::date`);
      }
      if (bit) {
        gParams.push(bit);
        gWhere.push(`COALESCE(due_date, created_at) <= $${gParams.length}::date`);
      }
      const gr = await pool.query(
        `
        SELECT id, title, due_date AS start_at, status, 'gorev' AS source
        FROM crm_tasks
        ${gWhere.length ? `WHERE ${gWhere.join(' AND ')}` : ''}
        ORDER BY due_date NULLS LAST
        LIMIT 200
        `,
        gParams
      );
      gorevler = gr.rows;
    } catch (_) { /* ignore */ }

    const birlesik = [
      ...ajanda.rows,
      ...faaliyetler,
      ...gorevler,
    ].sort((a, b) => String(a.start_at || '').localeCompare(String(b.start_at || '')));

    // UI liste varsayılanı dizi ister; ?detay=1 ile tam nesne
    if (String(req.query.detay || '') === '1') {
      return res.json({ ajanda: ajanda.rows, faaliyetler, gorevler, birlesik });
    }
    res.json(String(req.query.birlesik || '') === '1' ? birlesik : ajanda.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title: baslik, start_at, end_at, type, partner_id, lead_id, opportunity_id, user_code, description } = req.body || {};
    if (!baslik || !start_at) {
      return res.status(400).json({ hata: 'baslik ve start_at zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO crm_calendar_entries
        (title, start_at, end_at, type, partner_id, lead_id, opportunity_id, user_code, description)
      VALUES ($1,$2,$3,COALESCE($4,'Toplanti'),$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [baslik, start_at, end_at || null, type, partner_id || null, lead_id || null, opportunity_id || null, user_code || null, description || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM crm_calendar_entries WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.start_at) {
      return res.status(400).json({ hata: 'title ve start_at zorunlu.' });
    }
    const r = await pool.query(
      `UPDATE crm_calendar_entries SET
         title = $2, start_at = $3, end_at = $4, type = COALESCE($5, type),
         partner_id = $6, lead_id = $7, opportunity_id = $8,
         user_code = COALESCE($9, user_code), description = $10
       WHERE id = $1
       RETURNING *`,
      [req.params.id, b.title, b.start_at, b.end_at || null, b.type || null,
        b.partner_id || null, b.lead_id || null, b.opportunity_id || null,
        b.user_code || null, b.description || null]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM crm_calendar_entries WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
