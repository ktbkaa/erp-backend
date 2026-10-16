const express = require('express');
const router = express.Router();
const pool = require('../db');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiKod } = require('../src/utils/kodUretici');

async function planGetir(id) {
    const p = await pool.query('SELECT * FROM kk_kontrol_planlari WHERE id=$1', [id]);
    if (!p.rows[0]) return null;
    const k = await pool.query('SELECT * FROM kk_kriterleri WHERE plan_id=$1 ORDER BY sira_no, id', [id]);
    return { ...p.rows[0], kriterler: k.rows };
}

router.get('/', async (_req, res) => {
    try {
        const liste = await pool.query('SELECT id FROM kk_kontrol_planlari ORDER BY plan_kodu');
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
        const { plan_kodu, plan_adi, yon, aciklama, kriterler, aktif } = req.body;
        if (!plan_adi) return res.status(400).json({ hata: 'plan_adi zorunlu.' });
        const id = await withTransaction(pool, async (client) => {
            const kod = plan_kodu || (await sonrakiKod(client, 'KK_PLAN'));
            const r = await client.query(
                `
                INSERT INTO kk_kontrol_planlari (plan_kodu, plan_adi, yon, aciklama, aktif)
                VALUES ($1,$2,COALESCE($3,'GKK'),$4,COALESCE($5,TRUE)) RETURNING id
                `,
                [kod, plan_adi, yon, aciklama || null, aktif]
            );
            const planId = r.rows[0].id;
            for (const [i, k] of (kriterler || []).entries()) {
                if (!k.kriter_kodu || !k.kriter_adi) continue;
                await client.query(
                    `
                    INSERT INTO kk_kriterleri
                        (plan_id, sira_no, kriter_kodu, kriter_adi, olcum_tipi, min_deger, max_deger, hedef_deger, birim, zorunlu)
                    VALUES ($1,$2,$3,$4,COALESCE($5,'Sayisal'),$6,$7,$8,$9,COALESCE($10,TRUE))
                    `,
                    [planId, k.sira_no || i + 1, k.kriter_kodu, k.kriter_adi, k.olcum_tipi,
                        k.min_deger, k.max_deger, k.hedef_deger, k.birim, k.zorunlu]
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
        const { plan_adi, yon, aciklama, aktif, kriterler } = req.body;
        await withTransaction(pool, async (client) => {
            const u = await client.query(
                `
                UPDATE kk_kontrol_planlari SET
                    plan_adi=COALESCE($2,plan_adi),
                    yon=COALESCE($3,yon),
                    aciklama=COALESCE($4,aciklama),
                    aktif=COALESCE($5,aktif)
                WHERE id=$1 RETURNING id
                `,
                [req.params.id, plan_adi, yon, aciklama, aktif]
            );
            if (!u.rows[0]) {
                const err = new Error('Plan bulunamadı.');
                err.status = 404;
                throw err;
            }
            if (Array.isArray(kriterler)) {
                await client.query('DELETE FROM kk_kriterleri WHERE plan_id=$1', [req.params.id]);
                for (const [i, k] of kriterler.entries()) {
                    if (!k.kriter_kodu || !k.kriter_adi) continue;
                    await client.query(
                        `
                        INSERT INTO kk_kriterleri
                            (plan_id, sira_no, kriter_kodu, kriter_adi, olcum_tipi, min_deger, max_deger, hedef_deger, birim, zorunlu)
                        VALUES ($1,$2,$3,$4,COALESCE($5,'Sayisal'),$6,$7,$8,$9,COALESCE($10,TRUE))
                        `,
                        [req.params.id, k.sira_no || i + 1, k.kriter_kodu, k.kriter_adi, k.olcum_tipi,
                            k.min_deger, k.max_deger, k.hedef_deger, k.birim, k.zorunlu]
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
        const r = await pool.query('DELETE FROM kk_kontrol_planlari WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Plan bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
