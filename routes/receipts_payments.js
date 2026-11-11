const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { addPartnerLedgerEntry } = require('../src/services/cariHareketService');
const { companyIdFromReq } = require('../src/utils/firmaScope');

async function fetchById(id) {
  const r = await pool.query(
    `
    SELECT t.*, c.partner_code, c.partner_name
    FROM receipts_payments t
    JOIN partners c ON c.id = t.partner_id
    WHERE t.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      where.push(`t.partner_id = $${params.length}`);
    }
    if (req.query.type) {
      params.push(req.query.type);
      where.push(`t.type = $${params.length}`);
    }
    const firmaId = companyIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`c.company_id = $${params.length}`);
    }
    const sql = `
      SELECT t.*, c.partner_code, c.partner_name
      FROM receipts_payments t
      JOIN partners c ON c.id = t.partner_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.id DESC
    `;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await fetchById(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, partner_id, amount, currency_code, payment_method, invoice_id, description, document_date, status } = req.body || {};
    if (!type || !['Tahsilat', 'Odeme'].includes(type)) {
      return res.status(400).json({ hata: 'type Tahsilat veya Odeme olmalı.' });
    }
    if (!partner_id || amount == null) {
      return res.status(400).json({ hata: 'partner_id ve tutar zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const seri = type === 'Tahsilat' ? 'TAHSILAT' : 'ODEME';
      const no = await nextDocumentNo(client, seri);
      const r = await client.query(
        `
        INSERT INTO receipts_payments
          (document_no, type, partner_id, amount, currency_code, payment_method, invoice_id, status, description, document_date)
        VALUES ($1,$2,$3,$4,COALESCE($5,'TRY'),COALESCE($6,'Nakit'),$7,COALESCE($8,'Onayli'),$9,COALESCE($10,CURRENT_DATE))
        RETURNING id
        `,
        [no, type, partner_id, Number(amount), currency_code, payment_method, invoice_id || null, status, description || null, document_date || null]
      );
      const newId = r.rows[0].id;
      const onayDurum = (status || 'Onayli') === 'Onayli';
      if (onayDurum) {
        await addPartnerLedgerEntry(client, {
          cariId: partner_id,
          direction: type === 'Tahsilat' ? 'Alacak' : 'Borc',
          amount: Number(amount),
          paraBirimi: currency_code || 'TRY',
          belgeTipi: type === 'Tahsilat' ? 'TAHSILAT' : 'ODEME',
          belgeId: newId,
          description: description || `${type} ${no}`,
          hareketTarihi: document_date || null,
        });
      }
      return newId;
    });
    res.status(201).json(await fetchById(id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/onayla', async (req, res, next) => {
  try {
    const row = await fetchById(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    if (row.status === 'Onayli') return res.json(row);
    await withTransaction(pool, async (client) => {
      await client.query(`UPDATE receipts_payments SET status='Onayli' WHERE id=$1`, [row.id]);
      await addPartnerLedgerEntry(client, {
        cariId: row.partner_id,
        direction: row.type === 'Tahsilat' ? 'Alacak' : 'Borc',
        amount: Number(row.amount),
        paraBirimi: row.currency_code || 'TRY',
        belgeTipi: row.type === 'Tahsilat' ? 'TAHSILAT' : 'ODEME',
        belgeId: row.id,
        description: row.description || `${row.type} ${row.document_no}`,
        hareketTarihi: row.document_date,
      });
    });
    res.json(await fetchById(row.id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const mevcut = await fetchById(req.params.id);
    if (!mevcut) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    if (mevcut.status === 'Onayli') {
      return res.status(409).json({ hata: 'Onaylı tahsilat/ödeme düzeltilemez. İptal edip yeniden oluşturun.' });
    }
    const b = req.body || {};
    if (b.type && !['Tahsilat', 'Odeme'].includes(b.type)) {
      return res.status(400).json({ hata: 'type Tahsilat veya Odeme olmalı.' });
    }
    await pool.query(
      `UPDATE receipts_payments SET
         type = COALESCE($2, type),
         partner_id = COALESCE($3, partner_id),
         amount = COALESCE($4::numeric, amount),
         currency_code = COALESCE($5, currency_code),
         payment_method = COALESCE($6, payment_method),
         invoice_id = $7,
         status = COALESCE($8, status),
         description = $9,
         document_date = COALESCE($10::date, document_date),
         project_code = $11,
         plant_id = COALESCE($12, plant_id),
         cash_account_code = $13,
         bank_account_code = $14,
         cheque_no = $15,
         due_date = $16::date,
         exchange_rate = COALESCE($17::numeric, exchange_rate),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        req.params.id, b.type || null, b.partner_id || null,
        b.amount != null && b.amount !== '' ? Number(b.amount) : null,
        b.currency_code || null, b.payment_method || null, b.invoice_id || null,
        b.status || null, b.description || null, b.document_date || null,
        b.project_code || null, b.plant_id || null, b.cash_account_code || null,
        b.bank_account_code || null, b.cheque_no || null, b.due_date || null,
        b.exchange_rate != null && b.exchange_rate !== '' ? b.exchange_rate : null,
      ]
    );
    res.json(await fetchById(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM receipts_payments WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ is_deleted: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
