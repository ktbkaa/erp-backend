const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');

async function vergiGetir(id) {
  const r = await pool.query(`SELECT * FROM fin_tax_codes WHERE id=$1`, [id]);
  if (!r.rows[0]) return null;
  const oranlar = await pool.query(
    `SELECT * FROM fin_tax_rates WHERE tax_code_id=$1 ORDER BY valid_from DESC`,
    [id],
  );
  const current = oranlar.rows.find((o) => {
    const from = o.valid_from ? new Date(o.valid_from) : null;
    const to = o.valid_to ? new Date(o.valid_to) : null;
    const now = new Date();
    return (!from || from <= now) && (!to || to >= now);
  });
  return {
    ...r.rows[0],
    rate: current ? Number(current.rate) : null,
    oranlar: oranlar.rows,
    satirlar: oranlar.rows,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const country = req.query.country_code ? String(req.query.country_code).toUpperCase() : null;
    const r = await pool.query(
      `
      SELECT vk.*,
        (SELECT rate FROM fin_tax_rates vo
         WHERE vo.tax_code_id=vk.id
           AND vo.valid_from<=CURRENT_DATE
           AND (vo.valid_to IS NULL OR vo.valid_to>=CURRENT_DATE)
         ORDER BY vo.valid_from DESC LIMIT 1) AS rate
      FROM fin_tax_codes vk
      WHERE ($1::text IS NULL OR vk.country_code=$1)
      ORDER BY vk.country_code, vk.tax_code
      `,
      [country],
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await vergiGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Vergi kodu bulunamadı.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/oranlar', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM fin_tax_rates WHERE tax_code_id=$1 ORDER BY valid_from DESC`,
      [req.params.id],
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.country_code || !b.tax_code || !b.tax_name) {
      return res.status(400).json({ hata: 'country_code, tax_code, tax_name zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const ins = await client.query(
        `INSERT INTO fin_tax_codes (
           country_code, tax_code, tax_name, tax_type,
           input_tax_account_code, output_tax_account_code, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,TRUE))
         RETURNING id`,
        [
          String(b.country_code).toUpperCase(), b.tax_code, b.tax_name, b.tax_type || 'KDV',
          b.input_tax_account_code || null, b.output_tax_account_code || null, b.is_active,
        ],
      );
      const taxId = ins.rows[0].id;
      const oranlar = b.oranlar || b.satirlar || [];
      for (const o of oranlar) {
        if (o.rate == null || !o.valid_from) continue;
        await client.query(
          `INSERT INTO fin_tax_rates (tax_code_id, rate, valid_from, valid_to, source_note)
           VALUES ($1,$2,$3,$4,$5)`,
          [taxId, o.rate, o.valid_from, o.valid_to || null, o.source_note || null],
        );
      }
      if (!oranlar.length && b.rate != null) {
        await client.query(
          `INSERT INTO fin_tax_rates (tax_code_id, rate, valid_from, source_note)
           VALUES ($1,$2,CURRENT_DATE,$3)`,
          [taxId, b.rate, 'UI oluşturma'],
        );
      }
      return taxId;
    });
    res.status(201).json(await vergiGetir(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    await withTransaction(pool, async (client) => {
      const upd = await client.query(
        `UPDATE fin_tax_codes SET
           tax_name = COALESCE($2, tax_name),
           tax_type = COALESCE($3, tax_type),
           input_tax_account_code = COALESCE($4, input_tax_account_code),
           output_tax_account_code = COALESCE($5, output_tax_account_code),
           is_active = COALESCE($6, is_active)
         WHERE id=$1 RETURNING id`,
        [
          req.params.id, b.tax_name, b.tax_type,
          b.input_tax_account_code, b.output_tax_account_code, b.is_active,
        ],
      );
      if (!upd.rows[0]) {
        const err = new Error('Vergi kodu bulunamadı.');
        err.status = 404;
        throw err;
      }
      const oranlar = b.oranlar || b.satirlar;
      if (Array.isArray(oranlar)) {
        await client.query(`DELETE FROM fin_tax_rates WHERE tax_code_id=$1`, [req.params.id]);
        for (const o of oranlar) {
          if (o.rate == null || !o.valid_from) continue;
          await client.query(
            `INSERT INTO fin_tax_rates (tax_code_id, rate, valid_from, valid_to, source_note)
             VALUES ($1,$2,$3,$4,$5)`,
            [req.params.id, o.rate, o.valid_from, o.valid_to || null, o.source_note || null],
          );
        }
      }
    });
    res.json(await vergiGetir(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE fin_tax_codes SET is_active=FALSE WHERE id=$1 RETURNING *`,
      [req.params.id],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Vergi kodu bulunamadı.' });
    res.json({ silindi: false, pasife_alindi: true, ...r.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
