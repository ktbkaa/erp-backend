const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM account_determination_rules ORDER BY id`);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { rule_code, document_type, debit_account_code, credit_account_code, description, is_active } = req.body || {};
    if (!rule_code || !document_type) {
      return res.status(400).json({ hata: 'rule_code ve document_type zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO account_determination_rules
        (rule_code, document_type, debit_account_code, credit_account_code, description, is_active)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE))
      RETURNING *
      `,
      [rule_code, document_type, debit_account_code || null, credit_account_code || null, description || null, is_active]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const fields = ['rule_code', 'document_type', 'debit_account_code', 'credit_account_code', 'description', 'is_active'];
    const sets = [];
    const params = [req.params.id];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        params.push(req.body[f]);
        sets.push(`${f}=$${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ hata: 'Güncellenecek alan yok.' });
    const r = await pool.query(
      `UPDATE account_determination_rules SET ${sets.join(',')} WHERE id=$1 RETURNING *`,
      params
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM account_determination_rules WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kural bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
