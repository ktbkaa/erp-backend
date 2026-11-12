const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { assertPermission, reqUserCode } = require('../src/utils/yetki');
const {
    getQcOrder,
    saveQcOrder,
    approveQcOrder,
    createQcOrder,
} = require('../src/services/kaliteService');

function parseQty(v, fallback = null) {
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.direction) {
            params.push(req.query.direction);
            where.push(`e.direction = $${params.length}`);
        }
        if (req.query.status) {
            params.push(req.query.status);
            where.push(`e.status = $${params.length}`);
        }
        if (req.query.item_id) {
            params.push(Number(req.query.item_id));
            where.push(`e.item_id = $${params.length}`);
        }
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`e.company_id = $${params.length}`);
        }
        const ids = await pool.query(
            `
            SELECT e.id FROM qc_orders e
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY e.id DESC
            LIMIT 500
            `,
            params
        );
        const out = [];
        for (const r of ids.rows) out.push(await getQcOrder(pool, r.id));
        res.json(out);
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
        const e = await getQcOrder(pool, req.params.id);
        if (!e) return res.status(404).json({ hata: 'KK emri bulunamadı.' });
        res.json(e);
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

/** Manuel / form Yeni — emir oluştur */
router.post('/', async (req, res) => {
    try {
        const kullanici = await assertPermission(pool, reqUserCode(req), 'can_quality_control');
        const body = req.body || {};
        const direction = String(body.direction || '').toUpperCase();
        if (!['GKK', 'CKK'].includes(direction)) {
            return res.status(400).json({ hata: 'direction GKK veya CKK olmalı.', kod: 'ERR-VAL-001' });
        }
        const itemId = Number(body.item_id);
        const warehouseId = Number(body.warehouse_id);
        const quantity = parseQty(body.quantity);
        if (!itemId || !warehouseId || quantity == null || quantity <= 0) {
            return res.status(400).json({
                hata: 'item_id, warehouse_id ve quantity zorunlu.',
                kod: 'ERR-VAL-001',
            });
        }
        const firmaId = Number(body.company_id) || companyIdFromReq(req) || null;
        const id = await withTransaction(pool, async (client) => {
            const planId = Number(body.plan_id) || null;
            const emir = await createQcOrder(client, {
                direction,
                stokId: itemId,
                partiId: Number(body.lot_id) || null,
                depoId: warehouseId,
                hedefDepoId: Number(body.target_warehouse_id) || null,
                quantity,
                kaynakTipi: body.source_type || 'MANUEL',
                kaynakId: Number(body.source_id) || null,
                stokHareketId: Number(body.item_movement_id) || null,
                description: body.description || null,
                projectCode: body.project_code || null,
                companyId: firmaId,
                orderNo: body.order_no || null,
                planId,
            });
            if (Array.isArray(body.olcumler) && body.olcumler.length) {
                await saveQcOrder(client, emir.id, {
                    olcumler: body.olcumler,
                    uygunMiktar: parseQty(body.accepted_quantity, 0),
                    uygunsuzMiktar: parseQty(body.rejected_quantity, 0),
                    numuneMiktar: parseQty(body.sample_quantity),
                    description: body.description,
                    kullanici,
                });
            } else if (body.accepted_quantity != null || body.rejected_quantity != null || body.sample_quantity != null) {
                await saveQcOrder(client, emir.id, {
                    olcumler: [],
                    uygunMiktar: parseQty(body.accepted_quantity, 0),
                    uygunsuzMiktar: parseQty(body.rejected_quantity, 0),
                    numuneMiktar: parseQty(body.sample_quantity),
                    description: body.description,
                    kullanici,
                });
            }
            return emir.id;
        });
        res.status(201).json(await getQcOrder(pool, id));
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({
                hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                kod: 'ERR-FK-23503',
            });
        }
        res.status(err.status || 500).json({ hata: err.message, kod: err.kod || 'ERR-API-500' });
    }
});

/** Form Kaydet — üst Kaydet PUT ile ölçüm + miktar yazar */
router.put('/:id', async (req, res) => {
    try {
        const kullanici = await assertPermission(pool, reqUserCode(req), 'can_quality_control');
        const body = req.body || {};
        const emirId = Number(req.params.id);
        await withTransaction(pool, async (client) => {
            const cur = await client.query(`SELECT * FROM qc_orders WHERE id=$1 FOR UPDATE`, [emirId]);
            if (!cur.rows[0]) throw Object.assign(new Error('KK emri bulunamadı.'), { status: 404 });
            if (['Onayli', 'Red', 'Iptal'].includes(cur.rows[0].status)) {
                throw Object.assign(new Error(`Emir kilitli: ${cur.rows[0].status}`), { status: 400 });
            }
            const unlocked = ['Acik', 'Kaydedildi', 'Kismi'].includes(cur.rows[0].status);
            if (unlocked) {
                await client.query(
                    `
                    UPDATE qc_orders SET
                        item_id = COALESCE($2, item_id),
                        lot_id = COALESCE($3, lot_id),
                        warehouse_id = COALESCE($4, warehouse_id),
                        target_warehouse_id = COALESCE($5, target_warehouse_id),
                        plan_id = COALESCE($6, plan_id),
                        quantity = COALESCE($7, quantity),
                        sample_quantity = COALESCE($8, sample_quantity),
                        source_type = COALESCE($9, source_type),
                        source_id = COALESCE($10, source_id),
                        description = COALESCE($11, description),
                        project_code = COALESCE($12, project_code),
                        company_id = COALESCE($13, company_id)
                    WHERE id=$1
                    `,
                    [
                        emirId,
                        Number(body.item_id) || null,
                        body.lot_id != null && body.lot_id !== '' ? Number(body.lot_id) : null,
                        Number(body.warehouse_id) || null,
                        body.target_warehouse_id != null && body.target_warehouse_id !== ''
                            ? Number(body.target_warehouse_id) : null,
                        Number(body.plan_id) || null,
                        parseQty(body.quantity),
                        parseQty(body.sample_quantity),
                        body.source_type != null ? String(body.source_type) : null,
                        body.source_id != null && body.source_id !== '' ? Number(body.source_id) : null,
                        body.description != null ? body.description : null,
                        body.project_code != null ? body.project_code : null,
                        Number(body.company_id) || null,
                    ]
                );
            }
            await saveQcOrder(client, emirId, {
                olcumler: Array.isArray(body.olcumler) ? body.olcumler : [],
                uygunMiktar: parseQty(body.accepted_quantity),
                uygunsuzMiktar: parseQty(body.rejected_quantity),
                numuneMiktar: parseQty(body.sample_quantity),
                description: body.description,
                kullanici,
            });
        });
        res.json(await getQcOrder(pool, emirId));
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({
                hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                kod: 'ERR-FK-23503',
            });
        }
        res.status(err.status || 500).json({ hata: err.message, kod: err.kod || 'ERR-API-500' });
    }
});

router.post('/:id/kaydet', async (req, res) => {
    try {
        const kullanici = await assertPermission(pool, reqUserCode(req), 'can_quality_control');
        await withTransaction(pool, async (client) => {
            await saveQcOrder(client, Number(req.params.id), {
                olcumler: req.body.olcumler || [],
                uygunMiktar: req.body.accepted_quantity,
                uygunsuzMiktar: req.body.rejected_quantity,
                numuneMiktar: req.body.sample_quantity,
                description: req.body.description,
                kullanici,
            });
        });
        res.json(await getQcOrder(pool, req.params.id));
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({
                hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                kod: 'ERR-FK-23503',
            });
        }
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.post('/:id/onayla', async (req, res) => {
    try {
        const kullanici = await assertPermission(pool, reqUserCode(req), 'can_quality_control');
        await withTransaction(pool, async (client) => {
            await approveQcOrder(client, Number(req.params.id), {
                onay: req.body.onay !== false && req.body.onay !== 'Hayir',
                uygunMiktar: req.body.accepted_quantity,
                uygunsuzMiktar: req.body.rejected_quantity,
                hedefDepoId: req.body.target_warehouse_id,
                retNedenId: req.body.rejection_reason_id,
                description: req.body.description,
                kullanici,
            });
        });
        res.json(await getQcOrder(pool, req.params.id));
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({
                hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                kod: 'ERR-FK-23503',
            });
        }
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.post('/:id/reddet', async (req, res) => {
    try {
        const kullanici = await assertPermission(pool, reqUserCode(req), 'can_quality_control');
        await withTransaction(pool, async (client) => {
            const emir = await client.query('SELECT quantity FROM qc_orders WHERE id=$1', [req.params.id]);
            if (!emir.rows[0]) throw Object.assign(new Error('Emir yok'), { status: 404 });
            await approveQcOrder(client, Number(req.params.id), {
                onay: false,
                uygunMiktar: 0,
                uygunsuzMiktar: Number(emir.rows[0].quantity),
                retNedenId: req.body.rejection_reason_id,
                description: req.body.description,
                kullanici,
            });
        });
        res.json(await getQcOrder(pool, req.params.id));
    } catch (err) {
        if (err.code === '23503') {
            return res.status(409).json({
                hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                kod: 'ERR-FK-23503',
            });
        }
        res.status(err.status || 500).json({ hata: err.message });
    }
});

module.exports = router;
