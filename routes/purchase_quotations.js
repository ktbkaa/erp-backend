const express = require('express');
const pool = require('../db');
const { createBelgeRouter } = require('./_belgeCrud');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

const router = createBelgeRouter({
  table: 'purchase_quotations',
  lineTable: 'purchase_quotation_lines',
  fk: 'quotation_id',
  noField: 'quotation_no',
  seri: 'SATINALMA_TEKLIF',
  notFound: 'Teklif bulunamadı.',
  allowedDurum: ['Taslak', 'Onayli', 'Red', 'AnlasmayaDonustu', 'SipariseDonustu', 'Iptal', 'Kapali'],
  requireCari: true,
  linePrice: true,
  extraFields: ['istek_id', 'requisition_id', 'valid_date', 'status', 'company_id', 'plant_id', 'currency_code', 'exchange_rate'],
});

/**
 * Teklif onay — yalnızca Onaylı tekliften sipariş açılır
 * POST /satin-alma-teklifleri/:id/onayla
 */
router.post('/:id/onayla', async (req, res, next) => {
  try {
    const teklifId = Number(req.params.id);
    const r = await pool.query(
      `UPDATE purchase_quotations SET status = 'Onayli'
       WHERE id = $1 AND status IN ('Taslak','Acik')
       RETURNING id`,
      [teklifId]
    );
    if (!r.rows[0]) {
      const cur = await pool.query(`SELECT status FROM purchase_quotations WHERE id = $1`, [teklifId]);
      if (!cur.rows[0]) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
      return res.status(409).json({ hata: `Teklif onaylanamaz. Durum: ${cur.rows[0].status}` });
    }
    const row = await pool.query(
      `SELECT t.*, c.partner_code, c.partner_name FROM purchase_quotations t
       JOIN partners c ON c.id = t.partner_id WHERE t.id = $1`,
      [teklifId]
    );
    const satirlar = await pool.query(
      `SELECT ls.*, s.item_code, s.item_name FROM purchase_quotation_lines ls
       JOIN items s ON s.id = ls.item_id WHERE ls.quotation_id = $1 ORDER BY ls.id`,
      [teklifId]
    );
    res.json({ ...row.rows[0], satirlar: satirlar.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Teklif → Satınalma siparişi (REQ-PUR-004 / P40)
 * POST /satin-alma-teklifleri/:id/siparise-donustur
 * Önkoşul: status = Onayli
 */
router.post('/:id/siparise-donustur', async (req, res, next) => {
  try {
    const teklifId = Number(req.params.id);
    const siparisId = await withTransaction(pool, async (client) => {
      const t = await client.query(
        `SELECT * FROM purchase_quotations WHERE id = $1 FOR UPDATE`,
        [teklifId]
      );
      if (!t.rows[0]) throw Object.assign(new Error('Teklif bulunamadı.'), { status: 404 });
      if (t.rows[0].status !== 'Onayli') {
        throw Object.assign(
          new Error(`Yalnızca onaylı teklif siparişe dönüştürülür. Durum: ${t.rows[0].status}`),
          { status: 409 }
        );
      }
      const satirlar = await client.query(
        `SELECT * FROM purchase_quotation_lines WHERE quotation_id = $1 ORDER BY id`,
        [teklifId]
      );
      if (!satirlar.rows.length) throw Object.assign(new Error('Teklif satırı yok.'), { status: 400 });

      const no = await sonrakiBelgeNo(client, 'SATINALMA_SIPARIS');
      let toplam = 0;
      const sip = await client.query(
        `INSERT INTO purchase_orders
          (order_no, partner_id, plant_id, company_id, quotation_id, status, total_amount, payment_term_code,
           source_document_type, source_document_id)
         VALUES ($1,$2,$3,$4,$5,'Onayli',0,$6,'SATINALMA_TEKLIF',$5) RETURNING id`,
        [
          no,
          t.rows[0].partner_id,
          t.rows[0].plant_id || null,
          t.rows[0].company_id || null,
          teklifId,
          req.body.payment_term_code || null,
        ]
      );
      const id = sip.rows[0].id;
      for (const s of satirlar.rows) {
        const fiyat = Number(s.unit_price || 0);
        toplam += Number(s.quantity) * fiyat;
        await client.query(
          `INSERT INTO purchase_order_lines
            (purchase_order_id, item_id, quantity, unit_price, uom_code, item_code, item_name)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [id, s.item_id, s.quantity, fiyat, s.uom_code || null, s.item_code || null, s.item_name || null]
        );
      }
      await client.query(
        `UPDATE purchase_orders SET total_amount = $1 WHERE id = $2`,
        [toplam, id]
      );
      await client.query(
        `UPDATE purchase_quotations SET status = 'SipariseDonustu' WHERE id = $1`,
        [teklifId]
      );
      return id;
    });

    const row = await pool.query(
      `SELECT sas.*, c.partner_code, c.partner_name FROM purchase_orders sas
       JOIN partners c ON c.id = sas.partner_id WHERE sas.id = $1`,
      [siparisId]
    );
    const satirlar = await pool.query(
      `SELECT ss.*, COALESCE(ss.item_code, st.item_code) AS item_code,
              COALESCE(ss.item_name, st.item_name) AS item_name
       FROM purchase_order_lines ss
       JOIN items st ON st.id = ss.item_id WHERE ss.purchase_order_id = $1 ORDER BY ss.id`,
      [siparisId]
    );
    res.status(201).json({ ...row.rows[0], satirlar: satirlar.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
