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
               s.stok_kodu, s.stok_adi, s.birim AS stok_birim,
               ue.emir_no,
               f.firma_kodu, f.firma_adi
        FROM uretim_planlari up
        JOIN stoklar s ON s.id = up.stok_id
        LEFT JOIN uretim_emirleri ue ON ue.id = up.uretim_emri_id
        LEFT JOIN firmalar f ON f.id = up.firma_id
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
            where.push(`up.firma_id = $${params.length}`);
        }
        if (req.query.durum) {
            params.push(req.query.durum);
            where.push(`up.durum = $${params.length}`);
        }
        if (req.query.plan_no) {
            params.push(`%${req.query.plan_no}%`);
            where.push(`up.plan_no ILIKE $${params.length}`);
        }
        if (req.query.stok_kodu) {
            params.push(`%${req.query.stok_kodu}%`);
            where.push(`s.stok_kodu ILIKE $${params.length}`);
        }
        const sql = `
            SELECT up.id
            FROM uretim_planlari up
            JOIN stoklar s ON s.id = up.stok_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY up.id DESC
            LIMIT 500
        `;
        const liste = await pool.query(sql, params);
        const sonuc = [];
        for (const row of liste.rows) {
            sonuc.push(await planGetir(row.id));
        }
        res.json(sonuc);
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
            plan_no, firma_id, stok_id, miktar, birim,
            planlanan_baslangic, teslim_tarihi, baslatildi, sabit,
            durum, malzeme, mrp_sonuc_id, aciklama,
        } = req.body || {};
        if (!stok_id || miktar == null || Number(miktar) <= 0) {
            return res.status(400).json({ hata: 'stok_id ve pozitif miktar zorunlu.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const no = plan_no || (await sonrakiBelgeNo(client, 'URETIM_PLAN'));
            const r = await client.query(
                `
                INSERT INTO uretim_planlari
                    (plan_no, firma_id, stok_id, miktar, birim,
                     planlanan_baslangic, teslim_tarihi, baslatildi, sabit,
                     durum, malzeme, mrp_sonuc_id, aciklama)
                VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,FALSE),COALESCE($9,FALSE),
                        COALESCE($10,'Acik'),COALESCE($11,FALSE),$12,$13)
                RETURNING id
                `,
                [
                    no,
                    firma_id || firmaIdFromReq(req) || null,
                    stok_id,
                    miktar,
                    birim || null,
                    planlanan_baslangic || null,
                    teslim_tarihi || null,
                    typeof baslatildi === 'boolean' ? baslatildi : null,
                    typeof sabit === 'boolean' ? sabit : null,
                    durum || null,
                    typeof malzeme === 'boolean' ? malzeme : null,
                    mrp_sonuc_id || null,
                    aciklama || null,
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
            'firma_id', 'stok_id', 'miktar', 'birim',
            'planlanan_baslangic', 'teslim_tarihi', 'baslatildi', 'sabit',
            'durum', 'malzeme', 'mrp_sonuc_id', 'aciklama',
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
            `UPDATE uretim_planlari SET ${sets.join(',')} WHERE id=$1 RETURNING id`,
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
            `DELETE FROM uretim_planlari WHERE id=$1 RETURNING id`,
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
 * Body opsiyonel: urun_agaci_id, rota_id, hammadde_depo_id, mamul_depo_id, is_yeri_id, emir_tipi_id
 */
router.post('/:id/cevir', async (req, res) => {
    try {
        const planId = Number(req.params.id);
        const body = req.body || {};
        const sonuc = await withTransaction(pool, async (client) => {
            const planRes = await client.query(
                'SELECT * FROM uretim_planlari WHERE id=$1 FOR UPDATE',
                [planId]
            );
            const plan = planRes.rows[0];
            if (!plan) throw new Error('Üretim planı bulunamadı.');
            if (plan.uretim_emri_id) throw new Error('Plan zaten iş emrine çevrilmiş.');
            if (plan.durum === 'Iptal' || plan.durum === 'Kapali') {
                throw new Error(`Plan durumu çevrilemez: ${plan.durum}`);
            }

            let isYeriId = body.is_yeri_id || null;
            let hmDepo = body.hammadde_depo_id || null;
            let mamDepo = body.mamul_depo_id || null;
            let agacId = body.urun_agaci_id || null;
            let rotaId = body.rota_id || null;

            if (!agacId) {
                const bom = await client.query(
                    `SELECT id FROM urun_agaclari
                     WHERE mamul_stok_id=$1 AND aktif IS DISTINCT FROM FALSE
                     ORDER BY id LIMIT 1`,
                    [plan.stok_id]
                );
                agacId = bom.rows[0]?.id || null;
            }
            if (!rotaId) {
                const rota = await client.query(
                    `SELECT id FROM rotalar
                     WHERE stok_id=$1 AND aktif IS DISTINCT FROM FALSE
                     ORDER BY id LIMIT 1`,
                    [plan.stok_id]
                );
                rotaId = rota.rows[0]?.id || null;
            }
            if (!agacId || !rotaId) {
                throw new Error('Stok için ürün ağacı veya rota bulunamadı.');
            }

            if (!isYeriId) {
                const iy = await client.query('SELECT id FROM is_yerleri ORDER BY id LIMIT 1');
                isYeriId = iy.rows[0]?.id || null;
            }
            if (!hmDepo || !mamDepo) {
                const d = await client.query(
                    `SELECT id, depo_kodu FROM depolar
                     WHERE ($1::int IS NULL OR is_yeri_id = $1)
                     ORDER BY id LIMIT 10`,
                    [isYeriId]
                );
                const rows = d.rows;
                if (!hmDepo) {
                    hmDepo = rows.find((x) => /HMD|HAM/i.test(x.depo_kodu))?.id || rows[0]?.id;
                }
                if (!mamDepo) {
                    mamDepo = rows.find((x) => /MAM/i.test(x.depo_kodu))?.id
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
                INSERT INTO uretim_emirleri
                    (emir_no, stok_id, urun_agaci_id, rota_id, is_yeri_id,
                     hammadde_depo_id, mamul_depo_id, planlanan_miktar, durum, planli_kesin,
                     kaynak_belge_tipi, kaynak_belge_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Acik','Planli','UretimPlan',$9)
                RETURNING id, emir_no
                `,
                [no, plan.stok_id, agacId, rotaId, isYeriId, hmDepo, mamDepo, plan.miktar, planId]
            );

            await client.query(
                `
                UPDATE uretim_planlari SET
                    uretim_emri_id = $2,
                    durum = 'Baslatildi',
                    baslatildi = TRUE
                WHERE id = $1
                `,
                [planId, emir.rows[0].id]
            );

            return emir.rows[0];
        });
        const plan = await planGetir(planId);
        res.status(201).json({ ...plan, olusan_emir: sonuc });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

module.exports = router;
