const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { depoTransfer } = require('../src/services/stokHareketService');
const {
    kkEmriOlustur,
    gkkDepoCozumle,
    depoBulKodVeyaRol,
} = require('../src/services/kaliteService');
const { assertYetki, reqKullaniciKodu } = require('../src/utils/yetki');

async function kontrolGetir(id) {
    const k = await pool.query(
        `
        SELECT gk.*,
               sas.order_no,
               mk.receipt_no,
               kd.warehouse_code AS kaynak_depo_kodu,
               kd.warehouse_name AS kaynak_depo_adi,
               hd.warehouse_code AS hedef_depo_kodu,
               hd.warehouse_name AS hedef_depo_adi
        FROM incoming_inspections gk
        LEFT JOIN purchase_orders sas ON sas.id = gk.purchase_order_id
        LEFT JOIN goods_receipts mk ON mk.id = gk.goods_receipt_id
        LEFT JOIN warehouses kd ON kd.id = gk.source_warehouse_id
        LEFT JOIN warehouses hd ON hd.id = gk.target_warehouse_id
        WHERE gk.id = $1
        `,
        [id]
    );
    if (!k.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT gl.*,
               COALESCE(gl.item_code, st.item_code) AS item_code,
               COALESCE(gl.item_name, st.item_name) AS item_name
        FROM incoming_inspection_lines gl
        JOIN items st ON st.id = gl.item_id
        WHERE gl.inspection_id = $1
        ORDER BY gl.line_no, gl.id
        `,
        [id]
    );
    return { ...k.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const params = [];
        const where = [];
        if (req.query.status) {
            params.push(req.query.status);
            where.push(`gk.status = $${params.length}`);
        }
        const firmaId = firmaIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`(
              gk.company_id = $${params.length}
              OR (gk.company_id IS NULL AND EXISTS (
                SELECT 1 FROM purchase_orders po
                WHERE po.id = gk.purchase_order_id AND po.company_id = $${params.length}
              ))
              OR (gk.company_id IS NULL AND EXISTS (
                SELECT 1 FROM plants p
                WHERE p.id = gk.plant_id AND p.company_id = $${params.length}
              ))
            )`);
        }
        if (req.query.purchase_order_id) {
            params.push(Number(req.query.purchase_order_id));
            where.push(`gk.purchase_order_id = $${params.length}`);
        }
        const ids = await pool.query(
            `
            SELECT gk.id FROM incoming_inspections gk
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY gk.id DESC
            LIMIT 500
            `,
            params
        );
        const out = [];
        for (const r of ids.rows) out.push(await kontrolGetir(r.id));
        res.json(out);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await kontrolGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Giriş kontrol bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const b = req.body || {};
        await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                `SELECT * FROM incoming_inspections WHERE id=$1 FOR UPDATE`,
                [req.params.id]
            );
            if (!mevcut.rows[0]) {
                throw Object.assign(new Error('Giriş kontrol bulunamadı.'), { status: 404 });
            }
            if (['Onayli', 'Red', 'Iptal'].includes(mevcut.rows[0].status)) {
                throw Object.assign(new Error(`Belge kilitli: ${mevcut.rows[0].status}`), { status: 400 });
            }
            if (b.description != null || b.inspected_by != null) {
                await client.query(
                    `UPDATE incoming_inspections SET
                        description = COALESCE($2, description),
                        inspected_by = COALESCE($3, inspected_by)
                     WHERE id=$1`,
                    [req.params.id, b.description ?? null, b.inspected_by ?? null]
                );
            }
            if (Array.isArray(b.satirlar)) {
                for (const s of b.satirlar) {
                    if (!s.id) continue;
                    const accepted = Number(s.accepted_quantity ?? s.received_quantity ?? 0);
                    const rejected = Number(s.rejected_quantity ?? 0);
                    const ordered = Number(s.ordered_quantity);
                    const received = Number(s.received_quantity);
                    const matchOk = s.match_ok != null
                        ? Boolean(s.match_ok)
                        : Math.abs((ordered || received) - accepted) < 1e-9 && rejected < 1e-9;
                    await client.query(
                        `UPDATE incoming_inspection_lines SET
                            accepted_quantity=$2,
                            rejected_quantity=$3,
                            match_ok=$4,
                            description=COALESCE($5, description)
                         WHERE id=$1 AND inspection_id=$6`,
                        [s.id, accepted, rejected, matchOk, s.description || null, req.params.id]
                    );
                }
            }
        });
        res.json(await kontrolGetir(req.params.id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/**
 * Onay: sipariş ürün/miktar tutuyorsa Giriş Depo → Giriş Kalite (GKK) transfer + GKK emri.
 * Body: { satirlar?: [{ id, accepted_quantity, rejected_quantity, match_ok }] }
 */
router.post('/:id/onayla', async (req, res) => {
    try {
        const kullanici = await assertYetki(pool, reqKullaniciKodu(req), 'kalite_control').catch(() => ({
            id: null,
            user_code: reqKullaniciKodu(req) || 'system',
        }));
        await withTransaction(pool, async (client) => {
            const bel = await client.query(
                `SELECT * FROM incoming_inspections WHERE id=$1 FOR UPDATE`,
                [req.params.id]
            );
            if (!bel.rows[0]) throw Object.assign(new Error('Giriş kontrol bulunamadı.'), { status: 404 });
            const belge = bel.rows[0];
            if (['Onayli', 'Red', 'Iptal'].includes(belge.status)) {
                throw Object.assign(new Error(`Belge zaten ${belge.status}.`), { status: 409 });
            }

            const satirlarBody = Array.isArray(req.body?.satirlar) ? req.body.satirlar : [];
            for (const s of satirlarBody) {
                if (!s.id) continue;
                const accepted = Number(s.accepted_quantity ?? 0);
                const rejected = Number(s.rejected_quantity ?? 0);
                await client.query(
                    `UPDATE incoming_inspection_lines SET
                        accepted_quantity=$2, rejected_quantity=$3,
                        match_ok=$4, description=COALESCE($5, description)
                     WHERE id=$1 AND inspection_id=$6`,
                    [
                        s.id, accepted, rejected,
                        s.match_ok != null ? Boolean(s.match_ok) : (accepted > 0 && rejected < 1e-9),
                        s.description || null, req.params.id,
                    ]
                );
            }

            const satirlar = await client.query(
                `SELECT * FROM incoming_inspection_lines WHERE inspection_id=$1 ORDER BY line_no, id`,
                [req.params.id]
            );
            if (!satirlar.rows.length) throw new Error('Kontrol satırı yok.');

            for (const s of satirlar.rows) {
                const accepted = Number(s.accepted_quantity);
                const received = Number(s.received_quantity);
                const ordered = Number(s.ordered_quantity);
                if (accepted <= 0) {
                    throw new Error(`Satır ${s.line_no}: kabul miktarı > 0 olmalı (ürün/miktar tutuşması).`);
                }
                if (Math.abs(accepted - received) > 1e-6) {
                    throw new Error(
                        `Satır ${s.line_no}: kabul edilen (${accepted}) mal kabul miktarı (${received}) ile tutmuyor.`
                    );
                }
                // Sipariş satırı varsa miktarın aşılmaması; tam eşleşme tercih
                if (ordered > 0 && accepted - ordered > 1e-6) {
                    throw new Error(
                        `Satır ${s.line_no}: kabul (${accepted}) sipariş miktarını (${ordered}) aşıyor.`
                    );
                }
            }

            const gkk = belge.target_warehouse_id
                ? (await client.query(`SELECT * FROM warehouses WHERE id=$1`, [belge.target_warehouse_id])).rows[0]
                : await gkkDepoCozumle(client, belge.plant_id);
            if (!gkk) throw new Error('Giriş kalite deposu (GKK) tanımlı değil.');

            const hammadde = await depoBulKodVeyaRol(client, {
                kodParam: 'HAMMADDE_DEPO_KODU',
                role: 'Hammadde',
                plantId: belge.plant_id,
            });

            for (const s of satirlar.rows) {
                const accepted = Number(s.accepted_quantity);
                if (accepted <= 0) continue;

                const tr = await depoTransfer(client, {
                    kaynakDepoId: belge.source_warehouse_id,
                    hedefDepoId: gkk.id,
                    isYeriId: belge.plant_id,
                    stokId: s.item_id,
                    quantity: accepted,
                    uom_code: s.uom_code,
                    stokStatu: 'Kullanilabilir',
                    belgeTipi: 'GIRIS_KONTROL',
                    belgeId: Number(req.params.id),
                    description: `Giriş kontrol ${belge.inspection_no} → GKK`,
                    depoZorunluAtla: true,
                });
                // GKK'da Kalitede tut
                await client.query(
                    `UPDATE stock_movement_lines SET stock_status='Kalitede'
                     WHERE movement_id=$1 AND direction=1`,
                    [tr.giris.hareket.id]
                );

                await kkEmriOlustur(client, {
                    direction: 'GKK',
                    stokId: s.item_id,
                    depoId: gkk.id,
                    hedefDepoId: hammadde?.id || null,
                    quantity: accepted,
                    kaynakTipi: 'GIRIS_KONTROL',
                    kaynakId: Number(req.params.id),
                    stokHareketId: tr.giris.hareket.id,
                    description: `Giriş kontrol ${belge.inspection_no}`,
                });

                await client.query(
                    `UPDATE incoming_inspection_lines SET match_ok=TRUE WHERE id=$1`,
                    [s.id]
                );
            }

            await client.query(
                `UPDATE incoming_inspections SET
                    status='Onayli',
                    target_warehouse_id=$2,
                    approved_at=CURRENT_TIMESTAMP,
                    inspected_by=COALESCE($3, inspected_by)
                 WHERE id=$1`,
                [req.params.id, gkk.id, kullanici?.user_code || req.body?.inspected_by || null]
            );
        });
        res.json(await kontrolGetir(req.params.id));
    } catch (err) {
        res.status(err.status || 400).json({ hata: err.message });
    }
});

router.post('/:id/reddet', async (req, res) => {
    try {
        const upd = await pool.query(
            `UPDATE incoming_inspections SET status='Red', description=COALESCE($2, description)
             WHERE id=$1 AND status='Acik' RETURNING id`,
            [req.params.id, req.body?.description || null]
        );
        if (!upd.rows[0]) {
            return res.status(400).json({ hata: 'Reddedilemedi (bulunamadı veya Acik değil).' });
        }
        res.json(await kontrolGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
