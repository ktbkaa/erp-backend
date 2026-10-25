const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const country = (req.query.country_code || 'TR').toUpperCase();
    const r = await pool.query(
      `
      SELECT vk.*,
        (SELECT rate FROM fin_tax_rates vo
         WHERE vo.tax_code_id=vk.id
           AND vo.valid_from<=CURRENT_DATE
           AND (vo.valid_to IS NULL OR vo.valid_to>=CURRENT_DATE)
         ORDER BY vo.valid_from DESC LIMIT 1) AS rate
      FROM fin_tax_codes vk
      WHERE vk.is_active AND vk.country_code=$1
      ORDER BY vk.tax_code
      `,
      [country]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/oranlar', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM fin_tax_rates WHERE tax_code_id=$1 ORDER BY valid_from DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
