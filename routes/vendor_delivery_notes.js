/**
 * Tedarikçi irsaliyeleri — mal kabul kaynağı.
 * Açık/kısmi delivery_notes seçilebilir; tamamen işlenenler listeden düşer.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function getir(id) {
  const t = await pool.query(
    `
    SELECT ti.*, c.partner_code, c.partner_name, sas.order_no
    FROM vendor_delivery_notes ti
    JOIN partners c ON c.id = ti.partner_id
    LEFT JOIN purchase_orders sas ON sas.id = ti.purchase_order_id
    WHERE ti.id = $1
    `,
    [id]
  );
  if (!t.rows[0]) return null;
  const satirlar = await pool.query(
    `
    SELECT s.*, st.item_code, st.item_name,
           (s.quantity - COALESCE(s.accepted_flag,0)) AS remaining_quantity
    FROM vendor_delivery_note_lines s
    JOIN items st ON st.id = s.item_id
    WHERE s.delivery_note_id = $1
    ORDER BY s.id
    `,
    [id]
  );
  return { ...t.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
  try {
    const params = [];
    const where = [];
    const firmaId = firmaIdFromReq(req);
    if (firmaId) {
      params.push(firmaId);
      where.push(`ti.company_id = $${params.length}`);
    }
    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      where.push(`ti.partner_id = $${params.length}`);
    }
    if (req.query.purchase_order_id) {
      params.push(Number(req.query.purchase_order_id));
      where.push(`ti.purchase_order_id = $${params.length}`);
    }
    // varsayılan: yalnızca işlenebilir (Acik/Kismi)
    if (req.query.acik !== '0' && req.query.hepsi !== '1') {
      where.push(`ti.status IN ('Acik','Kismi')`);
    }
    const sql = `
      SELECT ti.id FROM vendor_delivery_notes ti
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ti.id DESC`;
    const liste = await pool.query(sql, params);
    const result = [];
    for (const r of liste.rows) result.push(await getir(r.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await getir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Tedarikçi irsaliyesi bulunamadı.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      partner_id, purchase_order_id, delivery_note_no, delivery_date, description, satirlar, plant_id,
    } = req.body;
    if (!partner_id) return res.status(400).json({ hata: 'partner_id zorunlu.' });
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'satirlar zorunlu.' });
    }
    const firmaId = firmaIdFromReq(req);
    const id = await withTransaction(pool, async (client) => {
      let no = delivery_note_no;
      if (!no) no = await sonrakiBelgeNo(client, 'TEDARIKCI_IRSALIYE');
      const baslik = await client.query(
        `INSERT INTO vendor_delivery_notes
          (delivery_note_no, company_id, plant_id, partner_id, purchase_order_id, delivery_date, description, status)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6,CURRENT_DATE),$7,'Acik') RETURNING id`,
        [no, firmaId, plant_id || null, partner_id, purchase_order_id || null, delivery_date || null, description || null]
      );
      const docId = baslik.rows[0].id;
      for (const s of satirlar) {
        if (!s.item_id || s.quantity == null) continue;
        await client.query(
          `INSERT INTO vendor_delivery_note_lines
            (delivery_note_id, order_line_id, item_id, quantity, uom_code, unit_price, line_description)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            docId, s.order_line_id || null, s.item_id, s.quantity,
            s.uom_code || null, s.unit_price ?? 0, s.line_description || null,
          ]
        );
      }
      return docId;
    });
    res.status(201).json(await getir(id));
  } catch (err) {
    res.status(400).json({ hata: err.message });
  }
});

module.exports = router;
