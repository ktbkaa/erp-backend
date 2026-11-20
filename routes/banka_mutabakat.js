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

/**
 * CSV import — gövde: { csv: "tarih;tutar;yon;aciklama;ref\\n...", bank_account_id, ... }
 * Ayırıcı ; veya ,. İlk satır başlık olabilir (tarih|valör|amount|tutar).
 * MT940 desteklenmez (bilinçli).
 */
router.post('/import-csv', async (req, res) => {
  try {
    const b = req.body || {};
    const csv = String(b.csv || b.content || '');
    if (!csv.trim()) return res.status(400).json({ hata: 'csv içeriği zorunlu.' });
    const firmaId = companyIdFromReq(req) || b.company_id || null;
    const sep = csv.includes(';') ? ';' : ',';
    const rawLines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!rawLines.length) return res.status(400).json({ hata: 'CSV satırı yok.' });

    let start = 0;
    const header = rawLines[0].toLowerCase();
    if (/tarih|valör|valor|date|tutar|amount/.test(header)) start = 1;

    const satirlar = [];
    for (let i = start; i < rawLines.length; i += 1) {
      const cols = rawLines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;
      const valueDate = cols[0];
      // TR: 1.234,56 veya 1234.56
      let amount = Number(String(cols[1]).replace(',', '.'));
      if (Number.isNaN(amount)) {
        amount = Number(String(cols[1]).replace(/\./g, '').replace(',', '.'));
      }
      if (!Number.isFinite(amount) || amount === 0) continue;
      let direction = 1;
      if (cols[2]) {
        const d = cols[2].toLowerCase();
        if (d === '-1' || d === 'cikis' || d === 'çıkış' || d === 'out' || d === 'borc' || d === 'debt') direction = -1;
        else if (amount < 0) { direction = -1; amount = Math.abs(amount); }
      } else if (amount < 0) {
        direction = -1;
        amount = Math.abs(amount);
      }
      satirlar.push({
        value_date: valueDate,
        amount: Math.abs(amount),
        direction,
        description: cols[3] || null,
        external_ref: cols[4] || null,
        counterparty_name: cols[5] || null,
      });
    }
    if (!satirlar.length) return res.status(400).json({ hata: 'İçe aktarılacak satır parse edilemedi.' });

    const row = await withTransaction(pool, async (client) => {
      const h = await client.query(
        `INSERT INTO bank_statements
          (company_id, bank_account_id, statement_date, reference_no, opening_balance,
           closing_balance, currency_code, status, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'Taslak',$8) RETURNING *`,
        [
          firmaId, b.bank_account_id || null,
          b.statement_date || satirlar[0].value_date || new Date().toISOString().slice(0, 10),
          b.reference_no || `CSV-${Date.now()}`,
          Number(b.opening_balance) || 0,
          b.closing_balance != null ? Number(b.closing_balance) : null,
          b.currency_code || 'TRY',
          b.description || 'CSV import',
        ],
      );
      const headerRow = h.rows[0];
      let n = 1;
      for (const s of satirlar) {
        await client.query(
          `INSERT INTO bank_statement_lines
            (statement_id, line_no, value_date, amount, direction, counterparty_name, description, external_ref)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            headerRow.id, n++, s.value_date, s.amount, s.direction,
            s.counterparty_name, s.description, s.external_ref,
          ],
        );
      }
      const lines = await client.query(
        `SELECT * FROM bank_statement_lines WHERE statement_id=$1 ORDER BY line_no`,
        [headerRow.id],
      );
      return { ...headerRow, satirlar: lines.rows, imported: lines.rows.length };
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ hata: err.message });
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
