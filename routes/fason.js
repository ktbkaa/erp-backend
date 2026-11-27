/**
 * Fason Yönetimi API — tanımlar, sipariş, sevk, tüketim, iade, teslimat, emanet stok.
 */
const express = require('express');
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const fason = require('../src/services/fasonService');

const router = express.Router();

function userCode(req) {
  return req.user?.user_code || req.headers['x-kullanici-kodu'] || null;
}

function companyId(req) {
  return companyIdFromReq(req) || null;
}

// ─── Parametreler ───────────────────────────────────────────────────────────
router.get('/parametreler', async (req, res) => {
  try {
    const cid = companyId(req);
    if (!cid) return res.json([]);
    const r = await pool.query(`SELECT * FROM subcontract_parameters WHERE company_id=$1`, [cid]);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/parametreler', async (req, res) => {
  try {
    const cid = companyId(req) || req.body.company_id;
    if (!cid) return res.status(400).json({ hata: 'company_id zorunlu.' });
    const b = req.body;
    const r = await pool.query(
      `
      INSERT INTO subcontract_parameters (
        company_id, ship_warehouse_id, default_scrap_tolerance_pct, max_scrap_pct,
        allow_partial_delivery, allow_over_receipt, over_receipt_tolerance_pct,
        under_delivery_tolerance_pct, qc_required, qc_on_receipt, block_production_until_qc,
        require_qc_before_consume, order_approval_required,
        price_approval_limit, auto_create_po, auto_create_op_demand, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (company_id) DO UPDATE SET
        ship_warehouse_id=EXCLUDED.ship_warehouse_id,
        default_scrap_tolerance_pct=EXCLUDED.default_scrap_tolerance_pct,
        max_scrap_pct=EXCLUDED.max_scrap_pct,
        allow_partial_delivery=EXCLUDED.allow_partial_delivery,
        allow_over_receipt=EXCLUDED.allow_over_receipt,
        over_receipt_tolerance_pct=EXCLUDED.over_receipt_tolerance_pct,
        under_delivery_tolerance_pct=EXCLUDED.under_delivery_tolerance_pct,
        qc_required=EXCLUDED.qc_required,
        qc_on_receipt=EXCLUDED.qc_on_receipt,
        block_production_until_qc=EXCLUDED.block_production_until_qc,
        require_qc_before_consume=EXCLUDED.require_qc_before_consume,
        order_approval_required=EXCLUDED.order_approval_required,
        price_approval_limit=EXCLUDED.price_approval_limit,
        auto_create_po=EXCLUDED.auto_create_po,
        auto_create_op_demand=EXCLUDED.auto_create_op_demand,
        notes=EXCLUDED.notes,
        updated_at=NOW()
      RETURNING *
      `,
      [
        cid, b.ship_warehouse_id || null,
        b.default_scrap_tolerance_pct ?? 2, b.max_scrap_pct ?? 5,
        b.allow_partial_delivery !== false, Boolean(b.allow_over_receipt),
        b.over_receipt_tolerance_pct ?? 0, b.under_delivery_tolerance_pct ?? 0,
        b.qc_required !== false,
        b.qc_on_receipt != null ? Boolean(b.qc_on_receipt) : b.qc_required !== false,
        b.block_production_until_qc !== false,
        Boolean(b.require_qc_before_consume),
        Boolean(b.order_approval_required),
        b.price_approval_limit ?? null, Boolean(b.auto_create_po),
        b.auto_create_op_demand !== false, b.notes || null,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/parametreler/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `
      UPDATE subcontract_parameters SET
        ship_warehouse_id=COALESCE($2,ship_warehouse_id),
        default_scrap_tolerance_pct=COALESCE($3,default_scrap_tolerance_pct),
        max_scrap_pct=COALESCE($4,max_scrap_pct),
        allow_partial_delivery=COALESCE($5,allow_partial_delivery),
        allow_over_receipt=COALESCE($6,allow_over_receipt),
        over_receipt_tolerance_pct=COALESCE($7,over_receipt_tolerance_pct),
        under_delivery_tolerance_pct=COALESCE($8,under_delivery_tolerance_pct),
        qc_required=COALESCE($9,qc_required),
        qc_on_receipt=COALESCE($10,qc_on_receipt),
        block_production_until_qc=COALESCE($11,block_production_until_qc),
        require_qc_before_consume=COALESCE($12,require_qc_before_consume),
        order_approval_required=COALESCE($13,order_approval_required),
        price_approval_limit=COALESCE($14,price_approval_limit),
        auto_create_po=COALESCE($15,auto_create_po),
        auto_create_op_demand=COALESCE($16,auto_create_op_demand),
        notes=COALESCE($17,notes),
        updated_at=NOW()
      WHERE id=$1 RETURNING *
      `,
      [
        req.params.id, b.ship_warehouse_id, b.default_scrap_tolerance_pct, b.max_scrap_pct,
        b.allow_partial_delivery, b.allow_over_receipt, b.over_receipt_tolerance_pct,
        b.under_delivery_tolerance_pct, b.qc_required, b.qc_on_receipt,
        b.block_production_until_qc, b.require_qc_before_consume, b.order_approval_required,
        b.price_approval_limit, b.auto_create_po, b.auto_create_op_demand, b.notes,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Parametre yok.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ─── Operasyon tanımları ────────────────────────────────────────────────────
router.get('/operasyonlar', async (req, res) => {
  try {
    const params = [];
    let sql = `SELECT * FROM subcontract_operation_defs WHERE 1=1`;
    const cid = companyId(req);
    if (cid) {
      params.push(cid);
      sql += ` AND (company_id = $${params.length} OR company_id IS NULL)`;
    }
    if (req.query.is_active !== undefined) {
      params.push(req.query.is_active === 'true' || req.query.is_active === true);
      sql += ` AND is_active = $${params.length}`;
    }
    sql += ' ORDER BY operation_code';
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/operasyonlar', async (req, res) => {
  try {
    const b = req.body;
    if (!b.operation_code || !b.operation_name) {
      return res.status(400).json({ hata: 'operation_code ve operation_name zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO subcontract_operation_defs
        (company_id, operation_code, operation_name, description, uom_code, std_time_hours,
         pricing_method, qc_required, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,TRUE))
      RETURNING *
      `,
      [
        companyId(req) || b.company_id || null, b.operation_code, b.operation_name,
        b.description || null, b.uom_code || null, b.std_time_hours || null,
        b.pricing_method || 'Adet', b.qc_required !== false, b.is_active,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ hata: err.message });
  }
});

router.put('/operasyonlar/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `
      UPDATE subcontract_operation_defs SET
        operation_name=COALESCE($2,operation_name),
        description=COALESCE($3,description),
        uom_code=COALESCE($4,uom_code),
        std_time_hours=COALESCE($5,std_time_hours),
        pricing_method=COALESCE($6,pricing_method),
        qc_required=COALESCE($7,qc_required),
        is_active=COALESCE($8,is_active),
        updated_at=NOW()
      WHERE id=$1 RETURNING *
      `,
      [
        req.params.id, b.operation_name, b.description, b.uom_code, b.std_time_hours,
        b.pricing_method, b.qc_required, b.is_active,
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Operasyon yok.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/operasyonlar/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM subcontract_operation_defs WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Operasyon yok.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(409).json({ hata: err.message, kod: 'ERR-FK' });
  }
});

// ─── Fiyatlar ───────────────────────────────────────────────────────────────
router.get('/fiyatlar', async (req, res) => {
  try {
    const params = [];
    let sql = `
      SELECT f.*, c.partner_code, c.partner_name, o.operation_code, o.operation_name,
             s.item_code, s.item_name
      FROM subcontract_prices f
      JOIN partners c ON c.id = f.partner_id
      LEFT JOIN subcontract_operation_defs o ON o.id = f.operation_def_id
      LEFT JOIN items s ON s.id = f.item_id
      WHERE 1=1`;
    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      sql += ` AND f.partner_id=$${params.length}`;
    }
    const cid = companyId(req);
    if (cid) {
      params.push(cid);
      sql += ` AND (f.company_id=$${params.length} OR f.company_id IS NULL)`;
    }
    sql += ' ORDER BY f.id DESC';
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/fiyatlar', async (req, res) => {
  try {
    const b = req.body;
    if (!b.partner_id || b.unit_price == null) {
      return res.status(400).json({ hata: 'partner_id ve unit_price zorunlu.' });
    }
    const r = await pool.query(
      `
      INSERT INTO subcontract_prices
        (company_id, partner_id, operation_def_id, item_id, pricing_method, unit_price,
         currency_code, valid_from, valid_to, min_qty, notes, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,CURRENT_DATE),$9,$10,$11,COALESCE($12,TRUE))
      RETURNING *
      `,
      [
        companyId(req) || b.company_id || null, b.partner_id, b.operation_def_id || null,
        b.item_id || null, b.pricing_method || 'Adet', b.unit_price,
        b.currency_code || 'TRY', b.valid_from || null, b.valid_to || null,
        b.min_qty || null, b.notes || null, b.is_active,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.put('/fiyatlar/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `
      UPDATE subcontract_prices SET
        unit_price=COALESCE($2,unit_price),
        pricing_method=COALESCE($3,pricing_method),
        currency_code=COALESCE($4,currency_code),
        valid_to=COALESCE($5,valid_to),
        min_qty=COALESCE($6,min_qty),
        notes=COALESCE($7,notes),
        is_active=COALESCE($8,is_active),
        updated_at=NOW()
      WHERE id=$1 RETURNING *
      `,
      [req.params.id, b.unit_price, b.pricing_method, b.currency_code, b.valid_to, b.min_qty, b.notes, b.is_active],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Fiyat yok.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.delete('/fiyatlar/:id', async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM subcontract_prices WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ hata: 'Fiyat yok.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ─── Siparişler ─────────────────────────────────────────────────────────────
router.get('/siparisler', async (req, res) => {
  try {
    const params = [];
    let sql = `SELECT id FROM subcontract_orders WHERE 1=1`;
    const cid = companyId(req);
    if (cid) {
      params.push(cid);
      sql += ` AND company_id=$${params.length}`;
    }
    if (req.query.partner_id) {
      params.push(Number(req.query.partner_id));
      sql += ` AND partner_id=$${params.length}`;
    }
    if (req.query.production_order_id) {
      params.push(Number(req.query.production_order_id));
      sql += ` AND production_order_id=$${params.length}`;
    }
    if (req.query.status) {
      params.push(req.query.status);
      sql += ` AND status=$${params.length}`;
    }
    sql += ' ORDER BY id DESC LIMIT 500';
    const ids = await pool.query(sql, params);
    const out = [];
    for (const row of ids.rows) out.push(await fason.fetchOrder(pool, row.id));
    res.json(out);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/siparisler/:id', async (req, res) => {
  try {
    const row = await fason.fetchOrder(pool, req.params.id);
    if (!row) return res.status(404).json({ hata: 'Fason siparişi yok.' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/siparisler', async (req, res) => {
  try {
    const b = req.body;
    if (!b.partner_id) return res.status(400).json({ hata: 'partner_id zorunlu.' });
    const satirlar = b.satirlar || b.lines || [];
    if (!satirlar.length && !b.production_order_id) {
      return res.status(400).json({ hata: 'satirlar veya production_order_id gerekli.' });
    }

    const id = await withTransaction(pool, async (client) => {
      if (b.from_work_order || (b.production_order_id && !satirlar.length)) {
        const created = await fason.createOrderFromWorkOrder(client, {
          productionOrderId: b.production_order_id,
          partnerId: b.partner_id,
          operationIds: b.operation_ids,
          companyId: companyId(req) || b.company_id,
          userCode: userCode(req),
          orderMode: b.order_mode || 'Operasyon',
        });
        return created.id;
      }

      await client.query(`UPDATE partners SET is_subcontractor=TRUE WHERE id=$1 AND is_subcontractor=FALSE`, [b.partner_id]);
      const no = b.order_no || await nextDocumentNo(client, 'FASON_SIPARIS');
      const baslik = await client.query(
        `
        INSERT INTO subcontract_orders
          (company_id, plant_id, order_no, order_date, partner_id, production_order_id, route_id,
           order_mode, status, planned_delivery_date, currency_code, exchange_rate, description, created_by)
        VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8,COALESCE($9,'Acik'),$10,$11,COALESCE($12,1),$13,$14)
        RETURNING id
        `,
        [
          companyId(req) || b.company_id || null, b.plant_id || null, no, b.order_date || null,
          b.partner_id, b.production_order_id || null, b.route_id || null,
          b.order_mode || 'Operasyon', b.status || 'Acik', b.planned_delivery_date || null,
          b.currency_code || 'TRY', b.exchange_rate || 1, b.description || null, userCode(req),
        ],
      );
      let lineNo = 10;
      for (const s of satirlar) {
        const qty = Number(s.ordered_qty ?? s.quantity ?? 0);
        const price = Number(s.unit_price || 0);
        await client.query(
          `
          INSERT INTO subcontract_order_lines
            (order_id, line_no, production_order_id, production_order_operation_id, operation_def_id,
             item_id, operation_code, operation_name, uom_code, ordered_qty, unit_price, line_amount,
             tax_rate, due_date, notes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          `,
          [
            baslik.rows[0].id, s.line_no || lineNo,
            s.production_order_id || b.production_order_id || null,
            s.production_order_operation_id || null, s.operation_def_id || null,
            s.item_id || null, s.operation_code || null, s.operation_name || null,
            s.uom_code || null, qty, price, qty * price,
            s.tax_rate || 0, s.due_date || null, s.notes || null,
          ],
        );
        if (s.production_order_operation_id) {
          await client.query(
            `
            UPDATE production_order_operations SET
              is_subcontract=TRUE,
              subcontractor_partner_id=$2,
              estimated_unit_price=COALESCE($3, estimated_unit_price),
              subcontract_status='SiparisBekliyor'
            WHERE id=$1
            `,
            [s.production_order_operation_id, b.partner_id, price || null],
          );
        }
        lineNo += 10;
      }
      await fason.refreshOrderLineTotals(client, baslik.rows[0].id);
      if (b.production_order_id) {
        await client.query(
          `UPDATE production_orders SET is_subcontract=TRUE, subcontractor_partner_id=COALESCE(subcontractor_partner_id,$2) WHERE id=$1`,
          [b.production_order_id, b.partner_id],
        );
      }
      return baslik.rows[0].id;
    });

    res.status(201).json(await fason.fetchOrder(pool, id));
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.code });
  }
});

router.put('/siparisler/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `
      UPDATE subcontract_orders SET
        planned_delivery_date=COALESCE($2,planned_delivery_date),
        description=COALESCE($3,description),
        status=COALESCE($4,status),
        currency_code=COALESCE($5,currency_code),
        exchange_rate=COALESCE($6,exchange_rate),
        updated_by=$7,
        updated_at=NOW()
      WHERE id=$1 RETURNING id
      `,
      [
        req.params.id, b.planned_delivery_date, b.description, b.status,
        b.currency_code, b.exchange_rate, userCode(req),
      ],
    );
    if (!r.rows[0]) return res.status(404).json({ hata: 'Sipariş yok.' });
    res.json(await fason.fetchOrder(pool, req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.post('/siparisler/:id/sevk', async (req, res) => {
  try {
    const result = await withTransaction(pool, (client) => fason.shipMaterials(client, {
      orderId: Number(req.params.id),
      fromWarehouseId: req.body.from_warehouse_id || req.body.warehouse_id,
      lines: req.body.satirlar || req.body.lines || [],
      companyId: companyId(req),
      userCode: userCode(req),
      description: req.body.description,
    }));
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.code, detay: err.detay });
  }
});

router.post('/siparisler/:id/tuketim', async (req, res) => {
  try {
    const result = await withTransaction(pool, (client) => fason.reportConsumption(client, {
      orderId: Number(req.params.id),
      lines: req.body.satirlar || req.body.lines || [],
      companyId: companyId(req),
      userCode: userCode(req),
      description: req.body.description,
    }));
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.code });
  }
});

router.post('/siparisler/:id/iade', async (req, res) => {
  try {
    const result = await withTransaction(pool, (client) => fason.returnMaterials(client, {
      orderId: Number(req.params.id),
      toWarehouseId: req.body.to_warehouse_id || req.body.warehouse_id,
      lines: req.body.satirlar || req.body.lines || [],
      companyId: companyId(req),
      userCode: userCode(req),
      description: req.body.description,
      reason: req.body.reason,
      quarantine: Boolean(req.body.quarantine || req.body.qc_required),
    }));
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.code });
  }
});

router.post('/siparisler/:id/teslimat', async (req, res) => {
  try {
    const result = await withTransaction(pool, (client) => fason.receiveProduct(client, {
      orderId: Number(req.params.id),
      toWarehouseId: req.body.to_warehouse_id || req.body.warehouse_id,
      lines: req.body.satirlar || req.body.lines || [],
      companyId: companyId(req),
      userCode: userCode(req),
      description: req.body.description,
      createQc: req.body.create_qc,
    }));
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message, kod: err.code });
  }
});

router.post('/teslimat-satirlari/:id/kalite', async (req, res) => {
  try {
    const result = await withTransaction(pool, (client) => fason.applyQcResult(client, {
      receiptLineId: Number(req.params.id),
      acceptedQty: req.body.accepted_qty,
      rejectedQty: req.body.rejected_qty,
      userCode: userCode(req),
    }));
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

router.post('/siparisler/:id/iptal', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE subcontract_orders SET status='Iptal', updated_at=NOW(), updated_by=$2 WHERE id=$1 AND status NOT IN ('Tamamlandi') RETURNING id`,
      [req.params.id, userCode(req)],
    );
    if (!r.rows[0]) return res.status(409).json({ hata: 'Sipariş iptal edilemez.' });
    res.json(await fason.fetchOrder(pool, req.params.id));
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// ─── Listeler: sevk / tüketim / teslimat / emanet ────────────────────────────
router.get('/sevkiyatlar', async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT s.*, c.partner_code, c.partner_name, o.order_no
      FROM subcontract_shipments s
      JOIN partners c ON c.id=s.partner_id
      JOIN subcontract_orders o ON o.id=s.order_id
      ORDER BY s.id DESC LIMIT 300
      `,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/tuketimler', async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT t.*, c.partner_code, c.partner_name, o.order_no
      FROM subcontract_consumptions t
      JOIN partners c ON c.id=t.partner_id
      JOIN subcontract_orders o ON o.id=t.order_id
      ORDER BY t.id DESC LIMIT 300
      `,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/teslimatlar', async (req, res) => {
  try {
    const cid = companyId(req);
    const params = [];
    let where = '';
    if (cid) {
      params.push(cid);
      where = `WHERE t.company_id=$${params.length}`;
    }
    const r = await pool.query(
      `
      SELECT t.*, c.partner_code, c.partner_name, o.order_no,
             q.order_no AS qc_order_no, q.status AS qc_status
      FROM subcontract_receipts t
      JOIN partners c ON c.id=t.partner_id
      JOIN subcontract_orders o ON o.id=t.order_id
      LEFT JOIN qc_orders q ON q.id=t.qc_order_id
      ${where}
      ORDER BY t.id DESC LIMIT 300
      `,
      params,
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/emanet-stok', async (req, res) => {
  try {
    const rows = await fason.emanetBalances(pool, {
      partnerId: req.query.partner_id ? Number(req.query.partner_id) : null,
      companyId: companyId(req),
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

router.get('/rapor/ozet', async (req, res) => {
  try {
    const cid = companyId(req);
    const params = [];
    let where = '';
    if (cid) {
      params.push(cid);
      where = `WHERE company_id=$${params.length}`;
    }
    const sip = await pool.query(
      `
      SELECT status, COUNT(*)::int AS adet, COALESCE(SUM(estimated_amount),0)::numeric AS tahmini,
             COALESCE(SUM(actual_amount),0)::numeric AS gerceklesen,
             COALESCE(SUM(invoiced_amount),0)::numeric AS faturalanan
      FROM subcontract_orders ${where}
      GROUP BY status ORDER BY status
      `,
      params,
    );
    const emanet = await fason.emanetBalances(pool, { companyId: cid });
    res.json({ siparis_durum: sip.rows, emanet_kalem: emanet.length, emanet_ornek: emanet.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});

// WO'dan fason sipariş
router.post('/is-emri/:id/siparis-olustur', async (req, res) => {
  try {
    const created = await withTransaction(pool, (client) => fason.createOrderFromWorkOrder(client, {
      productionOrderId: Number(req.params.id),
      partnerId: req.body.partner_id,
      operationIds: req.body.operation_ids,
      companyId: companyId(req),
      userCode: userCode(req),
      orderMode: req.body.order_mode || 'Operasyon',
    }));
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

/**
 * Fason sipariş → taslak alış faturası (hizmet bedeli).
 * Mükerrer: aynı sipariş için açık Alis fatura varsa 409.
 */
router.post('/siparisler/:id/fatura-olustur', async (req, res) => {
  try {
    const order = await fason.fetchOrder(pool, req.params.id);
    if (!order) return res.status(404).json({ hata: 'Fason sipariş bulunamadı.' });
    const mevcut = await pool.query(
      `SELECT id, invoice_no FROM invoices
       WHERE source_document_type='FASON_SIPARIS' AND source_document_id=$1
         AND COALESCE(status,'') <> 'Iptal'
       LIMIT 1`,
      [order.id],
    );
    if (mevcut.rows[0]) {
      return res.status(409).json({
        hata: `Bu fason sipariş için fatura zaten var: ${mevcut.rows[0].invoice_no}`,
        invoice_id: mevcut.rows[0].id,
      });
    }
    const qty = Number(order.qty_accepted) || Number(order.qty_received) || Number(order.qty_ordered) || 0;
    const price = Number(order.unit_price) || Number(order.estimated_unit_price) || 0;
    const net = Math.round(qty * price * 100) / 100;
    if (!(qty > 0) || !(price >= 0)) {
      return res.status(400).json({ hata: 'Fatura için kabul/teslim miktarı ve birim fiyat gerekli.' });
    }
    const { nextDocumentNo } = require('../src/utils/belgeNo');
    const fatura = await withTransaction(pool, async (client) => {
      const no = await nextDocumentNo(client, 'ALIS_FATURA').catch(() => `AF${Date.now()}`);
      const h = await client.query(
        `INSERT INTO invoices
          (invoice_no, partner_id, invoice_type, invoice_date, status, company_id,
           currency_code, net_amount, payable_amount, total_amount, description,
           source_document_type, source_document_id)
         VALUES ($1,$2,'Alis',CURRENT_DATE,'Taslak',$3,$4,$5,$5,$5,$6,'FASON_SIPARIS',$7)
         RETURNING *`,
        [
          no, order.partner_id, order.company_id || companyId(req),
          order.currency_code || 'TRY', net,
          `Fason hizmet ${order.order_no}`, order.id,
        ],
      );
      const inv = h.rows[0];
      await client.query(
        `INSERT INTO invoice_lines
          (invoice_id, line_no, item_id, quantity, unit_price, net_unit_price, total_amount, line_description)
         VALUES ($1,1,$2,$3,$4,$4,$5,$6)`,
        [
          inv.id, order.item_id || null, qty, price, net,
          `Fason ${order.operation_name || order.operation_code || 'hizmet'}`,
        ],
      );
      await client.query(
        `UPDATE subcontract_orders SET invoiced_amount=COALESCE(invoiced_amount,0)+$2, updated_at=NOW() WHERE id=$1`,
        [order.id, net],
      ).catch(() => {});
      return inv;
    });
    res.status(201).json(fatura);
  } catch (err) {
    res.status(err.status || 500).json({ hata: err.message });
  }
});

module.exports = router;
