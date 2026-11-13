const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const productionOrders = require('./production_orders');
const { getProductionParams } = require('../src/services/productionParamsService');

async function getReceipt(id) {
    const g = await pool.query(
        `
        SELECT ug.*,
               ue.order_no, ue.item_id, ue.planned_quantity, ue.produced_quantity, ue.status AS emir_durum,
               ue.plant_id AS emir_plant_id, ue.company_id AS emir_company_id,
               s.item_code, s.item_name, s.uom_code AS item_uom,
               op.operation_code, op.operation_name, op.line_no AS operation_line_no,
               op.planned_quantity AS op_planned_quantity, op.produced_quantity AS op_produced_quantity,
               pd.warehouse_code AS product_warehouse_code, pd.warehouse_name AS product_warehouse_name,
               md.warehouse_code AS material_warehouse_code, md.warehouse_name AS material_warehouse_name
        FROM production_receipts ug
        JOIN production_orders ue ON ue.id = ug.order_id
        JOIN items s ON s.id = ue.item_id
        LEFT JOIN production_order_operations op ON op.id = ug.operation_id
        LEFT JOIN warehouses pd ON pd.id = ug.product_warehouse_id
        LEFT JOIN warehouses md ON md.id = ug.material_warehouse_id
        WHERE ug.id = $1
        `,
        [id]
    );
    if (!g.rows[0]) return null;
    const malzemeler = await pool.query(
        `SELECT * FROM production_receipt_materials WHERE receipt_id=$1 ORDER BY is_byproduct, line_no, id`,
        [id]
    ).catch(() => ({ rows: [] }));
    const rows = malzemeler.rows || [];
    return {
        ...g.rows[0],
        malzemeler: rows.filter((r) => !r.is_byproduct),
        yan_urunler: rows.filter((r) => r.is_byproduct),
    };
}

/** İş emrinden malzeme önizleme (form doldurma) */
router.get('/onizleme', async (req, res) => {
    try {
        const orderId = Number(req.query.order_id);
        const quantity = req.query.quantity != null ? Number(req.query.quantity) : null;
        if (!orderId) return res.status(400).json({ hata: 'order_id zorunlu.' });
        const emir = await productionOrders.getProductionOrder(orderId);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });

        let op = null;
        if (req.query.operation_id) {
            op = (emir.operasyonlar || []).find((o) => Number(o.id) === Number(req.query.operation_id));
        } else {
            op = (emir.operasyonlar || []).find((o) => o.status === 'Hazir')
                || (emir.operasyonlar || [])[0];
        }
        const plannedOp = Number(op?.planned_quantity || emir.planned_quantity || 1);
        const producedOp = Number(op?.produced_quantity || 0);
        const remainingOp = Math.max(0, plannedOp - producedOp);
        const prodParams = await getProductionParams(pool, emir.company_id, emir.plant_id);
        let maxExtra = 0;
        if (prodParams.allow_over_production) {
            maxExtra = plannedOp * (Number(prodParams.over_production_pct) || 0) / 100;
        }
        const maxAllowed = remainingOp + maxExtra;
        const qty = quantity != null && quantity > 0
            ? quantity
            : (remainingOp > 0 ? remainingOp : plannedOp);
        const rate = op && Number(op.planned_quantity) > 0 ? qty / Number(op.planned_quantity) : 1;

        let comps = [];
        if (op?.id) {
            const r = await pool.query(
                `
                SELECT b.*, st.item_code, st.item_name, st.item_type, st.uom_code AS stock_uom
                FROM production_order_operation_components b
                JOIN items st ON st.id = b.item_id
                WHERE b.operation_id=$1
                ORDER BY b.id
                `,
                [op.id]
            );
            comps = r.rows;
        }
        if (!comps.length) {
            const r = await pool.query(
                `
                SELECT b.*, st.item_code, st.item_name, st.item_type, st.uom_code AS stock_uom
                FROM production_order_components b
                JOIN items st ON st.id = b.item_id
                WHERE b.order_id=$1
                ORDER BY COALESCE(b.line_no, b.id), b.id
                `,
                [orderId]
            );
            comps = r.rows;
        }

        const malzemeler = comps.map((b, i) => {
            const unit = Number(b.planned_quantity) || 0;
            const miktar = unit * rate;
            return {
                line_no: b.line_no != null ? b.line_no : i + 1,
                line_type: b.item_type || 'Hammadde',
                item_id: b.item_id,
                item_code: b.item_code,
                item_name: b.item_name,
                alternative_no: '',
                quantity_type: 'Net',
                unit_quantity: unit,
                quantity: miktar,
                scrap_quantity: 0,
                rework_quantity: 0,
                gross_quantity: miktar,
                net_quantity: miktar,
                uom_code: b.uom_code || b.stock_uom,
                warehouse_id: b.warehouse_id || emir.component_warehouse_id || null,
                is_byproduct: false,
            };
        });

        res.json({
            order_id: orderId,
            order_no: emir.order_no,
            item_id: emir.item_id,
            item_code: emir.item_code,
            item_name: emir.item_name,
            plant_id: emir.plant_id,
            company_id: emir.company_id,
            planned_quantity: emir.planned_quantity,
            produced_quantity: emir.produced_quantity,
            operation_id: op?.id || null,
            operation_code: op?.operation_code || null,
            operation_name: op?.operation_name || null,
            work_center_id: op?.work_center_id || null,
            quantity: qty,
            net_quantity: qty,
            gross_quantity: qty,
            scrap_quantity: 0,
            rework_quantity: 0,
            uom_code: emir.uom_code || null,
            product_warehouse_id: emir.fg_warehouse_id || null,
            material_warehouse_id: emir.component_warehouse_id || null,
            wip_warehouse_id: emir.wip_warehouse_id || null,
            op_planned_quantity: plannedOp,
            op_produced_quantity: producedOp,
            op_remaining_quantity: remainingOp,
            max_allowed_quantity: maxAllowed,
            production_params: {
                allow_over_production: prodParams.allow_over_production,
                over_production_pct: prodParams.over_production_pct,
                allow_under_production: prodParams.allow_under_production,
                under_production_pct: prodParams.under_production_pct,
                enforce_op_sequence: prodParams.enforce_op_sequence,
                require_material_consume: prodParams.require_material_consume,
            },
            malzemeler,
            yan_urunler: [],
            operasyonlar: emir.operasyonlar || [],
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`(ug.company_id = $${params.length} OR ue.company_id = $${params.length})`);
        }
        if (req.query.source_type) {
            params.push(String(req.query.source_type));
            where.push(`COALESCE(ug.source_type, 'Operasyonel') = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT ug.id FROM production_receipts ug
            JOIN production_orders ue ON ue.id = ug.order_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY ug.id DESC LIMIT 500
            `,
            params
        );
        const result = [];
        for (const r of liste.rows) result.push(await getReceipt(r.id));
        res.json(result);
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({
                hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                kod: 'ERR-FK-23503',
            });
        }
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const giris = await getReceipt(req.params.id);
        if (!giris) return res.status(404).json({ hata: 'Üretim girişi bulunamadı.' });
        res.json(giris);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Operasyonel veya hızlı üretim girişi */
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const orderId = Number(body.order_id);
        if (!orderId) return res.status(400).json({ hata: 'order_id zorunlu.' });
        if (body.quantity == null || !(Number(body.quantity) > 0)) {
            return res.status(400).json({ hata: 'quantity > 0 zorunlu.' });
        }

        const materials = [
            ...(Array.isArray(body.malzemeler) ? body.malzemeler : []),
            ...(Array.isArray(body.yan_urunler)
                ? body.yan_urunler.map((m) => ({ ...m, is_byproduct: true }))
                : []),
            ...(Array.isArray(body.materials) ? body.materials : []),
        ];

        const r = await productionOrders.tamamlaOperasyonInternal(orderId, {
            quantity: Number(body.quantity),
            operation_id: body.operation_id || null,
            consume_materials: body.consume_materials !== false,
            materials,
            product_warehouse_id: body.product_warehouse_id,
            material_warehouse_id: body.material_warehouse_id,
            wip_warehouse_id: body.wip_warehouse_id,
            scrap_warehouse_id: body.scrap_warehouse_id,
            byproduct_warehouse_id: body.byproduct_warehouse_id,
            plant_id: body.plant_id,
            company_id: body.company_id || companyIdFromReq(req),
            work_center_id: body.work_center_id,
            actual_work_center_id: body.actual_work_center_id,
            source_type: body.source_type || (body.quick ? 'Hizli' : 'Operasyonel'),
            net_quantity: body.net_quantity,
            gross_quantity: body.gross_quantity,
            scrap_quantity: body.scrap_quantity,
            rework_quantity: body.rework_quantity,
            uom_code: body.uom_code,
            serial_no: body.serial_no,
            shift_code: body.shift_code,
            started_at: body.started_at,
            ended_at: body.ended_at,
            description: body.description,
            receipt_no: body.receipt_no || null,
            receipt_date: body.receipt_date || null,
            skip_qc: Boolean(body.skip_qc),
            quick: Boolean(body.quick),
        });

        const receiptId = r.tamamlanan?.receipt_id;
        if (receiptId) return res.status(201).json(await getReceipt(receiptId));
        res.status(201).json({ ...r.tamamlanan, emir: r.emir });
    } catch (err) {
        res.status(err.status || 400).json({ hata: err.message });
    }
});

router.put('/:id', (_req, res) => {
    res.status(409).json({ hata: 'Üretim girişi stok hareketi üretir; düzeltilemez. Kaydı silip yeniden oluşturun.' });
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query(`DELETE FROM production_receipts WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Üretim girişi bulunamadı.' });
        res.json({ is_deleted: true, id: Number(r.rows[0].id) });
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({ hata: 'Bağlı stok hareketleri nedeniyle silinemedi.' });
        }
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
