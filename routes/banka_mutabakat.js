/**
 * Banka ekstresi + satır eşleştirme (temel mutabakat).
 * Tam otomatik import / AI eşleşme sonraki faz.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

router.get('/', async (req, res) => {
  try {
    const firmaId = companyIdFromReq(req) || Number(req.query.company_id) || null;
    const params = [];
    let where = '';
    if (firmaId) {
      params.push(firmaId);
      where = `WHERE company_id=$${params.length}`;
    }
    const r = await pool.query(
      `SELECT * FROM bank_statements ${where} ORDER BY statement_date DESC, id DESC LIMIT 200`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const h = await pool.query(`SELECT * FROM bank_statements WHERE id=$1`, [req.params.id]);
    if (!h.rows[0]) return res.status(404).json({ hata: 'Ekstre bulunamadı.' });
    const firmaId = companyIdFromReq(req);
    if (firmaId && Number(h.rows[0].company_id) !== Number(firmaId)) {
      return res.status(404).json({ hata: 'Ekstre bulunamadı (firma kapsamı).' });
    }
    const lines = await pool.query(
      `SELECT * FROM bank_statement_lines WHERE statement_id=$1 ORDER BY line_no, id`,
      [req.params.id]
    );
    res.json({ ...h.rows[0], satirlar: lines.rows });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const firmaId = companyIdFromReq(req) || b.company_id || null;
    const row = await withTransaction(pool, async (client) => {
      const h = await client.query(
        `INSERT INTO bank_statements
          (company_id, bank_account_id, statement_date, reference_no, opening_balance,
           closing_balance, currency_code, status, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          firmaId, b.bank_account_id || null, b.statement_date || new Date().toISOString().slice(0, 10),
          b.reference_no || null, Number(b.opening_balance) || 0,
          b.closing_balance != null ? Number(b.closing_balance) : null,
          b.currency_code || 'TRY', b.status || 'Taslak', b.description || null,
        ]
      );
      const header = h.rows[0];
      const satirlar = b.satirlar || b.lines || [];
      let n = 1;
      for (const s of satirlar) {
        await client.query(
          `INSERT INTO bank_statement_lines
            (statement_id, line_no, value_date, amount, direction, counterparty_name, description, external_ref)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            header.id, n++, s.value_date || header.statement_date,
            Number(s.amount) || 0, Number(s.direction) || 1,
            s.counterparty_name || null, s.description || null, s.external_ref || null,
          ]
        );
      }
      const lines = await client.query(
        `SELECT * FROM bank_statement_lines WHERE statement_id=$1 ORDER BY line_no`,
        [header.id]
      );
      return { ...header, satirlar: lines.rows };
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(err.status || 400).json({ hata: err.message });
  }
});

/** Satırı nakit hareketi ile eşleştir */
router.post('/satirlar/:lineId/eslestir', async (req, res) => {
  try {
    const lineId = Number(req.params.lineId);
    const cashId = Number(req.body?.cash_movement_id || req.body?.matched_cash_movement_id);
    if (!cashId) return res.status(400).json({ hata: 'cash_movement_id zorunlu.' });
    const r = await pool.query(
      `UPDATE bank_statement_lines
       SET matched_cash_movement_id=$2, match_status='Eslesmis'
       WHERE id=$1 RETURNING *`,
      [lineId, cashId]
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Ekstre satırı bulunamadı.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

/** Basit otomatik eşleştirme: tutar+yön+tarih ±3 gün */
router.post('/:id/otomatik-eslestir', async (req, res) => {
  try {
    const stmt = await pool.query(`SELECT * FROM bank_statements WHERE id=$1`, [req.params.id]);
    if (!stmt.rows[0]) return res.status(404).json({ hata: 'Ekstre bulunamadı.' });
    const lines = await pool.query(
      `SELECT * FROM bank_statement_lines WHERE statement_id=$1 AND match_status='Acik'`,
      [req.params.id]
    );
    let matched = 0;
    for (const line of lines.rows) {
      const cand = await pool.query(
        `
        SELECT id FROM fin_cash_movements
        WHERE ABS(amount - $1) < 0.01
          AND direction = $3
          AND ABS(EXTRACT(EPOCH FROM (movement_date::timestamp - $2::timestamp))/86400) <= 3
        ORDER BY ABS(EXTRACT(EPOCH FROM (movement_date::timestamp - $2::timestamp)))
        LIMIT 1
        `,
        [Number(line.amount), line.value_date || stmt.rows[0].statement_date, Number(line.direction) || 1]
      ).catch(() => ({ rows: [] }));
      if (cand.rows[0]) {
        await pool.query(
          `UPDATE bank_statement_lines SET matched_cash_movement_id=$2, match_status='Eslesmis' WHERE id=$1`,
          [line.id, cand.rows[0].id]
        );
        matched += 1;
      }
    }
    const refreshed = await pool.query(
      `SELECT * FROM bank_statement_lines WHERE statement_id=$1 ORDER BY line_no`,
      [req.params.id]
    );
    res.json({ matched, satirlar: refreshed.rows });
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

module.exports = router;
