const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');

async function rotaGetir(id) {
    const baslik = await pool.query(
        `
        SELECT r.*,
               s.item_code, s.item_name, s.item_type,
               ua.bom_code, ua.bom_name
        FROM routings r
        JOIN items s ON s.id = r.item_id
        LEFT JOIN boms ua ON ua.id = r.product_bom_id
        WHERE r.id = $1
        `,
        [id]
    );
    if (!baslik.rows[0]) return null;

    const ops = await pool.query(
        `
        SELECT o.*,
               m.center_code, m.center_name,
               cs.item_code AS cikti_stok_kodu,
               cs.item_name AS cikti_stok_adi
        FROM routing_operations o
        LEFT JOIN work_centers m ON m.id = o.work_center_id
        LEFT JOIN items cs ON cs.id = o.output_item_id
        WHERE o.route_id = $1
        ORDER BY o.line_no
        `,
        [id]
    );

    const operasyonlar = [];
    for (const op of ops.rows) {
        const bilesenler = await pool.query(
            `
            SELECT b.*, st.item_code, st.item_name, st.item_type
            FROM routing_operation_components b
            JOIN items st ON st.id = b.item_id
            WHERE b.operasyon_id = $1
            ORDER BY b.id
            `,
            [op.id]
        );
        const sonraki = ops.rows.find((x) => x.line_no === op.sonraki_line_no);
        operasyonlar.push({
            ...op,
            bilesenler: bilesenler.rows,
            sonraki_operasyon: sonraki
                ? {
                      line_no: sonraki.line_no,
                      operation_code: sonraki.operation_code,
                      operation_name: sonraki.operation_name,
                  }
                : null,
        });
    }

    return { ...baslik.rows[0], operasyonlar };
}

router.get('/', async (req, res) => {
    try {
        const onlyMamul = req.query.type !== 'hepsi';
        const firmaId = firmaIdFromReq(req);
        const params = [];
        const where = [];
        if (onlyMamul) where.push(`s.item_type = 'Mamul'`);
        if (firmaId) {
            params.push(firmaId);
            where.push(`r.company_id = $${params.length}`);
        }
        const liste = await pool.query(
            `
            SELECT r.id
            FROM routings r
            JOIN items s ON s.id = r.item_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY r.id DESC
            `,
            params
        );
        const result = [];
        for (const r of liste.rows) result.push(await rotaGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const rota = await rotaGetir(req.params.id);
        if (!rota) return res.status(404).json({ hata: 'Rota bulunamadı.' });
        res.json(rota);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * operasyonlar: [{
 *   line_no, operation_code, operation_name, work_center_id, sure_dk,
 *   output_item_id, sonraki_line_no,
 *   bilesenler: [{ item_id, quantity, uom_code }]
 * }]
 */
router.post('/', async (req, res) => {
    try {
        const {
            item_id,
            product_bom_id,
            route_code,
            route_name,
            operasyonlar,
            template,
            varsayilan,
            valid_from,
            valid_to,
        } = req.body;
        if (!item_id || !route_code || !route_name || !Array.isArray(operasyonlar) || operasyonlar.length === 0) {
            return res.status(400).json({ hata: 'item_id, route_code, route_name ve operasyonlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            let firmaId = firmaIdFromReq(req) || Number(req.body.company_id) || null;
            if (!firmaId) {
                const st = await client.query('SELECT company_id FROM items WHERE id=$1', [item_id]);
                firmaId = st.rows[0]?.company_id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO routings
                    (item_id, product_bom_id, route_code, route_name, template, varsayilan,
                     valid_from, valid_to, company_id)
                VALUES ($1,$2,$3,$4,COALESCE($5,FALSE),COALESCE($6,FALSE),$7,$8,$9)
                RETURNING id
                `,
                [
                    item_id,
                    product_bom_id || null,
                    route_code,
                    route_name,
                    template,
                    varsayilan,
                    valid_from || null,
                    valid_to || null,
                    firmaId,
                ]
            );
            const rotaId = baslik.rows[0].id;

            for (const op of operasyonlar) {
                const opIns = await client.query(
                    `
                    INSERT INTO routing_operations
                        (route_id, line_no, operation_code, operation_name, work_center_id,
                         sure_dk, output_item_id, sonraki_line_no)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                    RETURNING id
                    `,
                    [
                        rotaId,
                        op.line_no,
                        op.operation_code,
                        op.operation_name,
                        op.work_center_id || null,
                        op.sure_dk || 0,
                        op.output_item_id || null,
                        op.sonraki_line_no || null,
                    ]
                );
                for (const b of op.bilesenler || []) {
                    await client.query(
                        `
                        INSERT INTO routing_operation_components (operasyon_id, item_id, quantity, uom_code)
                        VALUES ($1,$2,$3,$4)
                        `,
                        [opIns.rows[0].id, b.item_id, b.quantity, b.uom_code || null]
                    );
                }
            }
            return rotaId;
        });

        res.status(201).json(await rotaGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            route_name,
            item_id,
            product_bom_id,
            operasyonlar,
            template,
            varsayilan,
            valid_from,
            valid_to,
        } = req.body;
        if (!route_name) return res.status(400).json({ hata: 'route_name zorunlu.' });

        const kayitId = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM routings WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const err = new Error('Rota bulunamadı.');
                err.status = 404;
                throw err;
            }
            const agacGuncelle = Object.prototype.hasOwnProperty.call(req.body, 'product_bom_id');
            await client.query(
                `
                UPDATE routings SET
                    route_name=$2,
                    item_id=COALESCE($3, item_id),
                    product_bom_id=CASE WHEN $4::boolean THEN $5 ELSE product_bom_id END,
                    template=COALESCE($6, template),
                    varsayilan=COALESCE($7, varsayilan),
                    valid_from=COALESCE($8, valid_from),
                    valid_to=COALESCE($9, valid_to)
                WHERE id=$1
                `,
                [
                    req.params.id,
                    route_name,
                    item_id || null,
                    agacGuncelle,
                    product_bom_id || null,
                    template,
                    varsayilan,
                    valid_from || null,
                    valid_to || null,
                ]
            );
            if (Array.isArray(operasyonlar)) {
                const eskiOps = await client.query(
                    'SELECT id FROM routing_operations WHERE route_id=$1',
                    [req.params.id]
                );
                for (const op of eskiOps.rows) {
                    await client.query('DELETE FROM routing_operation_components WHERE operasyon_id=$1', [op.id]);
                }
                await client.query('DELETE FROM routing_operations WHERE route_id=$1', [req.params.id]);

                for (const op of operasyonlar) {
                    if (!op.operation_code && !op.operation_name) continue;
                    const opIns = await client.query(
                        `
                        INSERT INTO routing_operations
                            (route_id, line_no, operation_code, operation_name, work_center_id,
                             sure_dk, output_item_id, sonraki_line_no)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                        RETURNING id
                        `,
                        [
                            req.params.id,
                            op.line_no || 10,
                            op.operation_code || null,
                            op.operation_name || null,
                            op.work_center_id || null,
                            op.sure_dk || 0,
                            op.output_item_id || null,
                            op.sonraki_line_no || null,
                        ]
                    );
                    for (const b of op.bilesenler || []) {
                        if (!b.item_id) continue;
                        await client.query(
                            `
                            INSERT INTO routing_operation_components (operasyon_id, item_id, quantity, uom_code)
                            VALUES ($1,$2,$3,$4)
                            `,
                            [opIns.rows[0].id, b.item_id, b.quantity || 0, b.uom_code || null]
                        );
                    }
                }
            }
            return Number(req.params.id);
        });

        res.json(await rotaGetir(kayitId));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM routings WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Rota bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
