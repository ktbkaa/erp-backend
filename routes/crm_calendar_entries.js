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
        fWhere.push(`COALESCE(planlanan_date, created_at) >= $${fParams.length}::date`);
      }
      if (bit) {
        fParams.push(bit);
        fWhere.push(`COALESCE(planlanan_date, created_at) <= $${fParams.length}::date`);
      }
      const fr = await pool.query(
        `
        SELECT id, konu AS baslik, planlanan_date AS start_at, status, 'faaliyet' AS source
        FROM crm_activities
        ${fWhere.length ? `WHERE ${fWhere.join(' AND ')}` : ''}
        ORDER BY planlanan_date NULLS LAST
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
        gWhere.push(`COALESCE(son_date, created_at) >= $${gParams.length}::date`);
      }
      if (bit) {
        gParams.push(bit);
        gWhere.push(`COALESCE(son_date, created_at) <= $${gParams.length}::date`);
      }
      const gr = await pool.query(
        `
        SELECT id, baslik, son_date AS start_at, status, 'gorev' AS source
        FROM crm_tasks
        ${gWhere.length ? `WHERE ${gWhere.join(' AND ')}` : ''}
        ORDER BY son_date NULLS LAST
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
    const { baslik, start_at, end_at, type, partner_id, lead_id, firsat_id, user_code, description } = req.body || {};
    if (!baslik || !start_at) {
      return res.status(400).json({ hata: 'baslik ve start_at zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO crm_calendar_entries
        (baslik, start_at, end_at, type, partner_id, lead_id, firsat_id, user_code, description)
      VALUES ($1,$2,$3,COALESCE($4,'Toplanti'),$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [baslik, start_at, end_at || null, type, partner_id || null, lead_id || null, firsat_id || null, user_code || null, description || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM crm_calendar_entries WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
