const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { cariHareketEkle } = require('../src/services/cariHareketService');

async function getir(id) {
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
    const row = await getir(req.params.id);
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
      return res.status(400).json({ hata: 'partner_id ve amount zorunlu.' });
    }
    const id = await withTransaction(pool, async (client) => {
      const seri = type === 'Tahsilat' ? 'TAHSILAT' : 'ODEME';
      const no = await sonrakiBelgeNo(client, seri);
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
        await cariHareketEkle(client, {
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
    res.status(201).json(await getir(id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/onayla', async (req, res, next) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    if (row.status === 'Onayli') return res.json(row);
    await withTransaction(pool, async (client) => {
      await client.query(`UPDATE receipts_payments SET status='Onayli' WHERE id=$1`, [row.id]);
      await cariHareketEkle(client, {
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
    res.json(await getir(row.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM receipts_payments WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Kayıt bulunamadı.' });
    res.json({ silindi: true, id: Number(req.params.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
