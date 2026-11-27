const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');

async function teklifGetir(id) {
    const t = await pool.query(
        `
        SELECT t.*, c.partner_code, c.partner_name, hk.movement_code, hk.movement_name,
               f.firsat_code, f.firsat_name,
               a.lead_code, a.lead_name
        FROM sales_quotations t
        JOIN partners c ON c.id = t.partner_id
        LEFT JOIN movement_codes hk ON hk.id = t.movement_code_id
        LEFT JOIN crm_opportunities f ON f.id = t.firsat_id
        LEFT JOIN crm_leads a ON a.id = t.lead_id
        WHERE t.id = $1
        `,
        [id]
    );
    if (!t.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.item_code, st.item_name
        FROM sales_quotation_lines s
        JOIN items st ON st.id = s.item_id
        WHERE s.quotation_id = $1
        ORDER BY s.line_no, s.id
        `,
        [id]
    );
    return { ...t.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

function hazirSatirlar(raw) {
    return raw.map((k, i) => {
        const h = satirHesapla(k);
        return {
            line_no: k.line_no || i + 1,
            item_id: k.item_id,
            quantity: k.quantity,
            uom_code: k.uom_code || null,
            unit_price: k.unit_price,
            ...h,
        };
    });
}

router.get('/', async (req, res) => {
    try {
        const liste = await (() => { const firmaId = firmaIdFromReq(req); const params = []; let sql = 'SELECT id FROM sales_quotations'; if (firmaId) { params.push(firmaId); sql += ' WHERE company_id = $' + params.length; } sql += ' ORDER BY id DESC'; return pool.query(sql, params); })();
        const result = [];
        for (const r of liste.rows) result.push(await teklifGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await teklifGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            partner_id, quotation_date, valid_date, currency_code, description,
            movement_code_id, status, firsat_id, lead_id, source_document_type, source_document_id,
        } = req.body;
        const raw = req.body.satirlar || req.body.kalemler;
        if (!partner_id) return res.status(400).json({ hata: 'partner_id zorunlu.' });
        if (!Array.isArray(raw) || !raw.length) return res.status(400).json({ hata: 'satirlar zorunlu.' });
        const satirlar = hazirSatirlar(raw);
        const top = belgelerToplam(satirlar);

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATIS_TEKLIF');
            let hk = movement_code_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM movement_codes WHERE document_type='SatisTeklif' AND is_active ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }
            const baslik = await client.query(
                `
                INSERT INTO sales_quotations
                    (quotation_no, partner_id, quotation_date, valid_date, currency_code,
                     status, movement_code_id, description, total_amount,
                     firsat_id, lead_id, source_document_type, source_document_id)
                VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,COALESCE($5,'TRY'),
                        COALESCE($6,'Taslak'),$7,$8,$9,$10,$11,$12,$13)
                RETURNING id
                `,
                [
                    no, partner_id, quotation_date || null, valid_date || null, currency_code,
                    status || 'Taslak', hk, description || null, top.total_amount,
                    firsat_id || null, lead_id || null,
                    source_document_type || (firsat_id ? 'CRM_FIRSAT' : null),
                    source_document_id || firsat_id || null,
                ]
            );
            const tid = baslik.rows[0].id;
            for (const s of satirlar) {
                await client.query(
                    `
                    INSERT INTO sales_quotation_lines
                        (quotation_id, line_no, item_id, quantity, uom_code, unit_price,
                         discount_rate, discount_amount, vat_rate, vat_amount, goods_service_amount)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    `,
                    [
                        tid, s.line_no, s.item_id, s.quantity, s.uom_code, s.unit_price,
                        s.discount_rate, s.discount_amount, s.vat_rate, s.vat_amount, s.goods_service_amount,
                    ]
                );
            }
            return tid;
        });
        res.status(201).json(await teklifGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            partner_id, quotation_date, valid_date, currency_code, description,
            movement_code_id, status, firsat_id, lead_id,
        } = req.body;
        const raw = req.body.satirlar || req.body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali'];
        if (status && !allowed.includes(status)) return res.status(400).json({ hata: 'Geçersiz status.' });

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id, status FROM sales_quotations WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('Teklif bulunamadı.');
                e.status = 404;
                throw e;
            }
            let toplam = null;
            let satirlar = null;
            if (Array.isArray(raw)) {
                satirlar = hazirSatirlar(raw);
                toplam = belgelerToplam(satirlar).total_amount;
            }
            await client.query(
                `
                UPDATE sales_quotations SET
                    partner_id = COALESCE($2, partner_id),
                    quotation_date = COALESCE($3::date, quotation_date),
                    valid_date = COALESCE($4::date, valid_date),
                    currency_code = COALESCE($5, currency_code),
                    status = COALESCE($6, status),
                    movement_code_id = COALESCE($7, movement_code_id),
                    description = COALESCE($8, description),
                    total_amount = COALESCE($9, total_amount),
                    firsat_id = COALESCE($10, firsat_id),
                    lead_id = COALESCE($11, lead_id)
                WHERE id=$1
                `,
                [
                    req.params.id, partner_id || null, quotation_date || null, valid_date || null,
                    currency_code || null, status || null, movement_code_id || null, description ?? null, toplam,
                    firsat_id || null, lead_id || null,
                ]
            );
            if (satirlar) {
                await client.query('DELETE FROM sales_quotation_lines WHERE quotation_id=$1', [req.params.id]);
                for (const s of satirlar) {
                    await client.query(
                        `
                        INSERT INTO sales_quotation_lines
                            (quotation_id, line_no, item_id, quantity, uom_code, unit_price,
                             discount_rate, discount_amount, vat_rate, vat_amount, goods_service_amount)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                        `,
                        [
                            req.params.id, s.line_no, s.item_id, s.quantity, s.uom_code, s.unit_price,
                            s.discount_rate, s.discount_amount, s.vat_rate, s.vat_amount, s.goods_service_amount,
                        ]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await teklifGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Teklif → Satış Siparişi (P01 kaynak_belge + satır ref) */
router.post('/:id/siparise-donustur', async (req, res) => {
    try {
        const { BELGE_TIPI, hareketKoduBul } = require('../src/utils/belgeOmurga');
        const teklif = await teklifGetir(req.params.id);
        if (!teklif) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
        if (!['Onayli', 'Taslak'].includes(teklif.status)) {
            return res.status(400).json({ hata: `Durum dönüşüme accepted değil: ${teklif.status}` });
        }

        const siparisId = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'SATIS_SIPARIS');
            const hk = await hareketKoduBul(client, BELGE_TIPI.SATIS_SIPARIS);

            const sip = await client.query(
                `
                INSERT INTO sales_orders
                    (order_no, partner_id, partner_code, partner_name, order_date, order_type,
                     total_amount, status, quotation_id, movement_code_id, currency_code, description,
                     source_document_type, source_document_id)
                VALUES ($1,$2,$3,$4,CURRENT_DATE,'SatisSiparis',$5,'Onayli',$6,$7,$8,$9,$10,$11)
                RETURNING id
                `,
                [
                    no, teklif.partner_id, teklif.partner_code, teklif.partner_name, teklif.total_amount,
                    teklif.id, hk?.id || null, teklif.currency_code || 'TRY',
                    `Teklif ${teklif.quotation_no} dönüşümü`,
                    BELGE_TIPI.SATIS_TEKLIF, teklif.id,
                ]
            );
            const sid = sip.rows[0].id;
            for (const s of teklif.satirlar) {
                await client.query(
                    `
                    INSERT INTO sales_order_lines
                        (sales_order_id, item_id, item_code, item_name, stock_uom, quantity, unit_price, total_amount,
                         discount_rate, discount_amount, vat_rate, vat_amount, line_no, quotation_line_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                    `,
                    [
                        sid, s.item_id, s.item_code, s.item_name, s.uom_code, s.quantity, s.unit_price,
                        Number(s.goods_service_amount) + Number(s.vat_amount),
                        s.discount_rate, s.discount_amount, s.vat_rate, s.vat_amount, s.line_no,
                        s.id,
                    ]
                );
            }
            await client.query(
                `UPDATE sales_quotations SET status='SipariseDonustu' WHERE id=$1`,
                [teklif.id]
            );
            return sid;
        });

        const siparis = await pool.query('SELECT * FROM sales_orders WHERE id=$1', [siparisId]);
        res.status(201).json({
            ok: true,
            sales_order_id: siparisId,
            order_no: siparis.rows[0].order_no,
            teklif: await teklifGetir(teklif.id),
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM sales_quotations WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Teklif bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
