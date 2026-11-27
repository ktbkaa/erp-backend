const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const {
  satirlariRezerveEt,
  rezervasyonIptalTek,
} = require('../src/services/rezervasyonService');

async function rezervasyonGetir(id) {
  const r = await pool.query(
    `
    SELECT r.*,
           s.item_code, s.item_name, s.uom_code AS stok_birim,
           sp.order_no, sp.status AS siparis_durum,
           d.warehouse_code, d.warehouse_name
    FROM item_reservations r
    JOIN items s ON s.id = r.item_id
    LEFT JOIN sales_orders sp ON sp.id = r.sales_order_id
    LEFT JOIN warehouses d ON d.id = r.warehouse_id
    WHERE r.id = $1
    `,
    [id]
  );
  return r.rows[0] || null;
}

router.get('/', async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    if (req.query.sales_order_id) {
      params.push(Number(req.query.sales_order_id));
      where.push(`r.sales_order_id = $${params.length}`);
    }
    if (req.query.item_id) {
      params.push(Number(req.query.item_id));
      where.push(`r.item_id = $${params.length}`);
    }
    if (req.query.warehouse_id) {
      params.push(Number(req.query.warehouse_id));
      where.push(`r.warehouse_id = $${params.length}`);
    }
    if (req.query.item_code) {
      params.push(`%${String(req.query.item_code).trim()}%`);
      where.push(`s.item_code ILIKE $${params.length}`);
    }
    if (req.query.rezervasyon_no) {
      params.push(`%${String(req.query.rezervasyon_no).trim()}%`);
      where.push(`r.rezervasyon_no ILIKE $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`r.status = $${params.length}`);
    } else if (req.query.hepsi !== '1' && req.query.all !== '1') {
      where.push(`r.status = 'Aktif'`);
    }
    const r = await pool.query(
      `
      SELECT r.*,
             s.item_code, s.item_name,
             sp.order_no,
             d.warehouse_code, d.warehouse_name
      FROM item_reservations r
      JOIN items s ON s.id = r.item_id
      LEFT JOIN sales_orders sp ON sp.id = r.sales_order_id
      LEFT JOIN warehouses d ON d.id = r.warehouse_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.id DESC
      LIMIT 500
      `,
      params
    );
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await rezervasyonGetir(req.params.id);
    if (!row) return res.status(404).json({ hata: 'Rezervasyon bulunamadı.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

/**
 * Yeni rezervasyon(lar).
 * Body: {
 *   sales_order_id,
 *   warehouse_id?,          // satırda yoksa varsayılan
 *   satirlar: [{ sales_order_line_id?, item_id, warehouse_id?, quantity }]
 * }
 */
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const siparisId = Number(body.sales_order_id);
    if (!siparisId) return res.status(400).json({ hata: 'sales_order_id zorunlu.' });
    const satirlar = body.satirlar || body.kalemler || [];
    if (!Array.isArray(satirlar) || !satirlar.length) {
      return res.status(400).json({ hata: 'En az bir stok satırı seçin.' });
    }
    const olusan = await withTransaction(pool, async (client) => satirlariRezerveEt(client, siparisId, {
      depoId: body.warehouse_id ? Number(body.warehouse_id) : null,
      satirlar,
    }));
    const detay = [];
    for (const o of olusan) detay.push(await rezervasyonGetir(o.id));
    res.status(201).json({
      id: detay[0]?.id,
      rezervasyonlar: detay,
      count: detay.length,
      sales_order_id: siparisId,
      ...detay[0],
    });
  } catch (err) {
    next(err);
  }
});

/** Tek rezervasyon iptal */
router.post('/:id/iptal', async (req, res, next) => {
  try {
    await withTransaction(pool, async (client) => {
      await rezervasyonIptalTek(client, Number(req.params.id));
    });
    res.json(await rezervasyonGetir(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await withTransaction(pool, async (client) => {
      await rezervasyonIptalTek(client, Number(req.params.id));
    });
    res.json({ silindi: true, id: Number(req.params.id), iptal: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
