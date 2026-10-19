/**
 * Soft-delete destekli basit tanım CRUD router fabrikası.
 * DELETE → aktif=false (TANIM_SOFT_DELETE=Evet, varsayılan).
 */
const express = require('express');
const pool = require('../../db');
const { withTransaction } = require('./withTransaction');
const { sonrakiKod } = require('./kodUretici');
const { parametreAl } = require('./yetki');

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

/**
 * @param {object} opts
 * @param {string} opts.table
 * @param {string} opts.codeCol
 * @param {string} opts.nameCol
 * @param {string} opts.seriKodu - kod_serileri.seri_kodu
 * @param {string[]} [opts.extraCols] - insert/update extra columns
 * @param {string} [opts.orderBy]
 * @param {string} [opts.notFound]
 */
function createTanimRouter(opts) {
  const {
    table,
    codeCol,
    nameCol,
    seriKodu,
    extraCols = [],
    orderBy = codeCol,
    notFound = 'Kayıt bulunamadı.',
  } = opts;

  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const where = [];
      if (req.query.aktif === 'true') where.push('aktif = TRUE');
      if (req.query.aktif === 'false') where.push('aktif = FALSE');
      // cascade filtreleri (ulke_kodu vb.)
      const params = [];
      for (const col of ['ulke_kodu', 'kaynak_pb', 'hedef_pb']) {
        if (req.query[col] && extraCols.includes(col)) {
          params.push(req.query[col]);
          where.push(`${col} = $${params.length}`);
        }
      }
      const sql = `SELECT * FROM ${table} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
      res.json((await pool.query(sql, params)).rows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ hata: notFound });
      res.json(r.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const name = trimOrNull(req.body[nameCol]);
      if (!name) return res.status(400).json({ hata: `${nameCol} zorunlu.` });
      const row = await withTransaction(pool, async (client) => {
        const kod = trimOrNull(req.body[codeCol]) || (await sonrakiKod(client, seriKodu));
        const cols = [codeCol, nameCol, ...extraCols, 'aktif'];
        const vals = [
          kod,
          name,
          ...extraCols.map((c) => {
            const v = req.body[c];
            if (typeof v === 'number') return v;
            if (typeof v === 'boolean') return v;
            return trimOrNull(v);
          }),
          typeof req.body.aktif === 'boolean' ? req.body.aktif : true,
        ];
        const ph = cols.map((_, i) => `$${i + 1}`).join(',');
        const ins = await client.query(
          `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) RETURNING *`,
          vals
        );
        return ins.rows[0];
      });
      res.status(201).json(row);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ hata: 'Kod zaten var.' });
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const name = trimOrNull(req.body[nameCol]);
      if (!name) return res.status(400).json({ hata: `${nameCol} zorunlu.` });
      const sets = [`${nameCol} = $2`];
      const params = [req.params.id, name];
      for (const c of extraCols) {
        if (req.body[c] !== undefined) {
          params.push(typeof req.body[c] === 'string' ? trimOrNull(req.body[c]) : req.body[c]);
          sets.push(`${c} = $${params.length}`);
        }
      }
      if (typeof req.body.aktif === 'boolean') {
        params.push(req.body.aktif);
        sets.push(`aktif = $${params.length}`);
      }
      const upd = await pool.query(
        `UPDATE ${table} SET ${sets.join(', ')} WHERE id=$1 RETURNING *`,
        params
      );
      if (!upd.rows[0]) return res.status(404).json({ hata: notFound });
      res.json(upd.rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const soft = String(await parametreAl(pool, 'TANIM_SOFT_DELETE', 'Evet')).toLowerCase() === 'evet';
      if (soft) {
        const r = await pool.query(
          `UPDATE ${table} SET aktif=FALSE WHERE id=$1 RETURNING id`,
          [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: notFound });
        return res.json({ silindi: true, soft: true, id: Number(req.params.id) });
      }
      const r = await pool.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ hata: notFound });
      res.json({ silindi: true, soft: false, id: Number(req.params.id) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createTanimRouter, trimOrNull };
