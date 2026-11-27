const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function planGetir(id) {
    const p = await pool.query('SELECT * FROM qc_control_plans WHERE id=$1', [id]);
    if (!p.rows[0]) return null;
    const k = await pool.query('SELECT * FROM qc_criteria WHERE plan_id=$1 ORDER BY line_no, id', [id]);
    return { ...p.rows[0], kriterler: k.rows };
}

router.get('/', async (_req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM qc_control_plans ORDER BY plan_code');
        const out = [];
        for (const r of liste.rows) out.push(await planGetir(r.id));
        res.json(out);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const p = await planGetir(req.params.id);
        if (!p) return res.status(404).json({ hata: 'Plan bulunamadı.' });
        res.json(p);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { plan_code, plan_name, direction, description, kriterler, is_active } = req.body;
        if (!plan_name) return res.status(400).json({ hata: 'plan_name zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const kod = plan_code || (await sonrakiKod(client, 'KK_PLAN'));
            const r = await client.query(
                `
                INSERT INTO qc_control_plans (plan_code, plan_name, direction, description, is_active)
                VALUES ($1,$2,COALESCE($3,'GKK'),$4,COALESCE($5,TRUE)) RETURNING id
                `,
                [kod, plan_name, direction, description || null, is_active]
            );
            const planId = r.rows[0].id;
            for (const [i, k] of (kriterler || []).entries()) {
                if (!k.kriter_code || !k.kriter_name) continue;
                await client.query(
                    `
                    INSERT INTO qc_criteria
                        (plan_id, line_no, kriter_code, kriter_name, olcum_type, min_value, max_value, target_value, uom_code, zorunlu)
                    VALUES ($1,$2,$3,$4,COALESCE($5,'Sayisal'),$6,$7,$8,$9,COALESCE($10,TRUE))
                    `,
                    [planId, k.line_no || i + 1, k.kriter_code, k.kriter_name, k.olcum_type,
                        k.min_value, k.max_value, k.target_value, k.uom_code, k.zorunlu]
                );
            }
            return planId;
        });
        res.status(201).json(await planGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { plan_name, direction, description, is_active, kriterler } = req.body;
        await withTransaction(pool, async (client) => {
            const u = await client.query(
                `
                UPDATE qc_control_plans SET
                    plan_name=COALESCE($2,plan_name),
                    direction=COALESCE($3,direction),
                    description=COALESCE($4,description),
                    is_active=COALESCE($5,is_active)
                WHERE id=$1 RETURNING id
                `,
                [req.params.id, plan_name, direction, description, is_active]
            );
            if (!u.rows[0]) {
                const err = new Error('Plan bulunamadı.');
                err.status = 404;
                throw err;
            }
            if (Array.isArray(kriterler)) {
                await client.query('DELETE FROM qc_criteria WHERE plan_id=$1', [req.params.id]);
                for (const [i, k] of kriterler.entries()) {
                    if (!k.kriter_code || !k.kriter_name) continue;
                    await client.query(
                        `
                        INSERT INTO qc_criteria
                            (plan_id, line_no, kriter_code, kriter_name, olcum_type, min_value, max_value, target_value, uom_code, zorunlu)
                        VALUES ($1,$2,$3,$4,COALESCE($5,'Sayisal'),$6,$7,$8,$9,COALESCE($10,TRUE))
                        `,
                        [req.params.id, k.line_no || i + 1, k.kriter_code, k.kriter_name, k.olcum_type,
                            k.min_value, k.max_value, k.target_value, k.uom_code, k.zorunlu]
                    );
                }
            }
        });
        res.json(await planGetir(req.params.id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM qc_control_plans WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Plan bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
