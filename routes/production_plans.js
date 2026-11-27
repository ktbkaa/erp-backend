const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { firmaIdFromReq } = require('../src/utils/firmaScope');

async function planGetir(id) {
    const r = await pool.query(
        `
        SELECT up.*,
               s.item_code, s.item_name, s.uom_code AS stok_birim,
               ue.order_no,
               f.company_code, f.company_name
        FROM production_plans up
        JOIN items s ON s.id = up.item_id
        LEFT JOIN production_orders ue ON ue.id = up.production_order_id
        LEFT JOIN companies f ON f.id = up.company_id
        WHERE up.id = $1
        `,
        [id]
    );
    return r.rows[0] || null;
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`up.company_id = $${params.length}`);
        }
        if (req.query.status) {
            params.push(req.query.status);
            where.push(`up.status = $${params.length}`);
        }
        if (req.query.plan_no) {
            params.push(`%${req.query.plan_no}%`);
            where.push(`up.plan_no ILIKE $${params.length}`);
        }
        if (req.query.item_code) {
            params.push(`%${req.query.item_code}%`);
            where.push(`s.item_code ILIKE $${params.length}`);
        }
        const sql = `
            SELECT up.id
            FROM production_plans up
            JOIN items s ON s.id = up.item_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY up.id DESC
            LIMIT 500
        `;
        const liste = await pool.query(sql, params);
        const result = [];
        for (const row of liste.rows) {
            result.push(await planGetir(row.id));
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await planGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Üretim planı bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            plan_no, company_id, item_id, quantity, uom_code,
            planlanan_start, delivery_date, is_started, fixed,
            status, malzeme, mrp_result_id, description,
        } = req.body || {};
        if (!item_id || quantity == null || Number(quantity) <= 0) {
            return res.status(400).json({ hata: 'item_id ve pozitif quantity zorunlu.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const no = plan_no || (await sonrakiBelgeNo(client, 'URETIM_PLAN'));
            const r = await client.query(
                `
                INSERT INTO production_plans
                    (plan_no, company_id, item_id, quantity, uom_code,
                     planlanan_start, delivery_date, is_started, fixed,
                     status, malzeme, mrp_result_id, description)
                VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,FALSE),COALESCE($9,FALSE),
                        COALESCE($10,'Acik'),COALESCE($11,FALSE),$12,$13)
                RETURNING id
                `,
                [
                    no,
                    company_id || firmaIdFromReq(req) || null,
                    item_id,
                    quantity,
                    uom_code || null,
                    planlanan_start || null,
                    delivery_date || null,
                    typeof is_started === 'boolean' ? is_started : null,
                    typeof fixed === 'boolean' ? fixed : null,
                    status || null,
                    typeof malzeme === 'boolean' ? malzeme : null,
                    mrp_result_id || null,
                    description || null,
                ]
            );
            return r.rows[0].id;
        });
        res.status(201).json(await planGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const fields = [
            'company_id', 'item_id', 'quantity', 'uom_code',
            'planlanan_start', 'delivery_date', 'is_started', 'fixed',
            'status', 'malzeme', 'mrp_result_id', 'description',
        ];
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
            `UPDATE production_plans SET ${sets.join(',')} WHERE id=$1 RETURNING id`,
            params
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Üretim planı bulunamadı.' });
        res.json(await planGetir(req.params.id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query(
            `DELETE FROM production_plans WHERE id=$1 RETURNING id`,
            [req.params.id]
        );
        if (!r.rows[0]) return res.status(404).json({ hata: 'Üretim planı bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Plan → üretim emri (minimal: varsayılan BOM/rota/depo).
 * Body opsiyonel: product_bom_id, route_id, component_warehouse_id, fg_warehouse_id, plant_id, order_type_id
 */
router.post('/:id/cevir', async (req, res) => {
    try {
        const planId = Number(req.params.id);
        const body = req.body || {};
        const result = await withTransaction(pool, async (client) => {
            const planRes = await client.query(
                'SELECT * FROM production_plans WHERE id=$1 FOR UPDATE',
                [planId]
            );
            const plan = planRes.rows[0];
            if (!plan) throw new Error('Üretim planı bulunamadı.');
            if (plan.production_order_id) throw new Error('Plan zaten iş emrine çevrilmiş.');
            if (plan.status === 'Iptal' || plan.status === 'Kapali') {
                throw new Error(`Plan durumu çevrilemez: ${plan.status}`);
            }

            let isYeriId = body.plant_id || null;
            let hmDepo = body.component_warehouse_id || null;
            let mamDepo = body.fg_warehouse_id || null;
            let agacId = body.product_bom_id || null;
            let rotaId = body.route_id || null;

            if (!agacId) {
                const bom = await client.query(
                    `SELECT id FROM boms
                     WHERE finished_good_item_id=$1 AND is_active IS DISTINCT FROM FALSE
                     ORDER BY id LIMIT 1`,
                    [plan.item_id]
                );
                agacId = bom.rows[0]?.id || null;
            }
            if (!rotaId) {
                const rota = await client.query(
                    `SELECT id FROM routings
                     WHERE item_id=$1 AND is_active IS DISTINCT FROM FALSE
                     ORDER BY id LIMIT 1`,
                    [plan.item_id]
                );
                rotaId = rota.rows[0]?.id || null;
            }
            if (!agacId || !rotaId) {
                throw new Error('Stok için ürün ağacı veya rota bulunamadı.');
            }

            if (!isYeriId) {
                const iy = await client.query('SELECT id FROM plants ORDER BY id LIMIT 1');
                isYeriId = iy.rows[0]?.id || null;
            }
            if (!hmDepo || !mamDepo) {
                const d = await client.query(
                    `SELECT id, warehouse_code FROM warehouses
                     WHERE ($1::int IS NULL OR plant_id = $1)
                     ORDER BY id LIMIT 10`,
                    [isYeriId]
                );
                const rows = d.rows;
                if (!hmDepo) {
                    hmDepo = rows.find((x) => /HMD|HAM/i.test(x.warehouse_code))?.id || rows[0]?.id;
                }
                if (!mamDepo) {
                    mamDepo = rows.find((x) => /MAM/i.test(x.warehouse_code))?.id
                        || rows[rows.length - 1]?.id
                        || rows[0]?.id;
                }
            }
            if (!hmDepo || !mamDepo) {
                throw new Error('Hammadde/mamul depo bulunamadı.');
            }

            const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
            const emir = await client.query(
                `
                INSERT INTO production_orders
                    (order_no, item_id, product_bom_id, route_id, plant_id,
                     component_warehouse_id, fg_warehouse_id, planlanan_quantity, status, planli_kesin,
                     source_document_type, source_document_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik','Planli','UretimPlan',$9)
                RETURNING id, order_no
                `,
                [no, plan.item_id, agacId, rotaId, isYeriId, hmDepo, mamDepo, plan.quantity, planId]
            );

            await client.query(
                `
                UPDATE production_plans SET
                    production_order_id = $2,
                    status = 'Baslatildi',
                    is_started = TRUE
                WHERE id = $1
                `,
                [planId, emir.rows[0].id]
            );

            return emir.rows[0];
        });
        const plan = await planGetir(planId);
        res.status(201).json({ ...plan, olusan_emir: result });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

module.exports = router;
