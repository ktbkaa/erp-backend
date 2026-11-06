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
    return (raw || []).map((k, i) => {
        const h = satirHesapla(k);
        return {
            line_no: k.line_no || i + 1,
            item_id: k.item_id,
            quantity: k.quantity,
            uom_code: k.uom_code || null,
            unit_price: k.unit_price,
            line_type: k.line_type || 'S',
            line_description: k.line_description || null,
            currency_code: k.currency_code || null,
            rate_type: k.rate_type || null,
            exchange_rate: k.exchange_rate != null ? Number(k.exchange_rate) : null,
            warehouse_id: k.warehouse_id || null,
            project_code: k.project_code || null,
            region: k.region || null,
            delivery_date: k.delivery_date || null,
            ...h,
        };
    }).filter((s) => s.item_id && Number(s.quantity) > 0);
}

function resolveCompanyId(req, body = {}) {
    const fromBody = body.company_id != null && body.company_id !== ''
        ? Number(body.company_id)
        : null;
    if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
    const fromHdr = firmaIdFromReq(req);
    if (Number.isFinite(Number(fromHdr)) && Number(fromHdr) > 0) return Number(fromHdr);
    return null;
}

async function insertSatirlar(client, quotationId, satirlar) {
    for (const s of satirlar) {
        await client.query(
            `
            INSERT INTO sales_quotation_lines
                (quotation_id, line_no, item_id, quantity, uom_code, unit_price,
                 discount_rate, discount_rate_2, discount_rate_3,
                 discount_amount, discount_tutari2, discount_tutari3,
                 vat_rate, vat_amount, vat_mode,
                 goods_service_amount, amount_ex_tax, amount_ttc,
                 line_type, line_description, currency_code, rate_type, exchange_rate,
                 warehouse_id, project_code, region, delivery_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
            `,
            [
                quotationId, s.line_no, s.item_id, s.quantity, s.uom_code, s.unit_price,
                s.discount_rate ?? 0, s.discount_rate_2 ?? 0, s.discount_rate_3 ?? 0,
                s.discount_amount ?? 0, s.discount_tutari2 ?? 0, s.discount_tutari3 ?? 0,
                s.vat_rate ?? 0, s.vat_amount ?? 0, s.vat_mode || 'Haric',
                s.goods_service_amount ?? 0, s.amount_ex_tax ?? s.goods_service_amount ?? 0,
                s.amount_ttc ?? s.satir_toplam ?? 0,
                s.line_type || 'S', s.line_description || null,
                s.currency_code || null, s.rate_type || null, s.exchange_rate,
                s.warehouse_id || null, s.project_code || null, s.region || null,
                s.delivery_date || null,
            ]
        );
    }
}

router.get('/', async (req, res) => {
    try {
        const firmaId = firmaIdFromReq(req);
        const params = [];
        let sql = 'SELECT id FROM sales_quotations';
        if (firmaId) {
            params.push(firmaId);
            // Aktif firma + (eski) company_id boş kayıtlar — kayıp liste olmasın
            sql += ` WHERE (company_id = $${params.length} OR company_id IS NULL)`;
        }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
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
        const body = req.body || {};
        const {
            partner_id, quotation_date, valid_date, currency_code, description,
            movement_code_id, status, firsat_id, lead_id, source_document_type, source_document_id,
            plant_id, payment_term_code, payment_method, delivery_term_code,
            exchange_rate, discount_rate, project_code,
            public_note, internal_note, customer_quotation_no, price_list_id, delivery_date,
        } = body;
        const raw = body.satirlar || body.kalemler;
        if (!partner_id) return res.status(400).json({ hata: 'partner_id zorunlu.' });
        if (!Array.isArray(raw) || !raw.length) return res.status(400).json({ hata: 'satirlar zorunlu.' });
        const satirlar = hazirSatirlar(raw);
        if (!satirlar.length) {
            return res.status(400).json({ hata: 'En az bir stok satırı (miktar > 0) gerekli.' });
        }
        const top = belgelerToplam(satirlar);
        const company_id = resolveCompanyId(req, body);

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
                     firsat_id, lead_id, source_document_type, source_document_id,
                     company_id, plant_id, payment_term_code, payment_method,
                     delivery_term_code, exchange_rate, discount_rate,
                     project_code, public_note, internal_note,
                     customer_quotation_no, price_list_id, delivery_date,
                     subtotal, tax_amount, grand_total)
                VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,COALESCE($5,'TRY'),
                        COALESCE($6,'Taslak'),$7,$8,$9,$10,$11,$12,$13,
                        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
                        $27,$28,$29)
                RETURNING id
                `,
                [
                    no, partner_id, quotation_date || null, valid_date || null, currency_code,
                    status || 'Taslak', hk, description || null, top.total_amount,
                    firsat_id || null, lead_id || null,
                    source_document_type || (firsat_id ? 'CRM_FIRSAT' : null),
                    source_document_id || firsat_id || null,
                    company_id, plant_id || null,
                    payment_term_code || null, payment_method || null, delivery_term_code || null,
                    exchange_rate != null ? Number(exchange_rate) : null,
                    discount_rate != null ? Number(discount_rate) : null,
                    project_code || null, public_note || null, internal_note || null,
                    customer_quotation_no || null, price_list_id || null, delivery_date || null,
                    top.subtotal, top.tax_amount, top.grand_total,
                ]
            );
            const tid = baslik.rows[0].id;
            await insertSatirlar(client, tid, satirlar);
            return tid;
        });
        res.status(201).json(await teklifGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const body = req.body || {};
        const {
            partner_id, quotation_date, valid_date, currency_code, description,
            movement_code_id, status, firsat_id, lead_id,
            plant_id, payment_term_code, payment_method, delivery_term_code,
            exchange_rate, discount_rate, project_code,
            public_note, internal_note, customer_quotation_no, price_list_id, delivery_date,
        } = body;
        const raw = body.satirlar || body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'SipariseDonustu', 'Red', 'Iptal', 'Kapali'];
        if (status && !allowed.includes(status)) return res.status(400).json({ hata: 'Geçersiz status.' });
        const company_id = resolveCompanyId(req, body);

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id, status, company_id FROM sales_quotations WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('Teklif bulunamadı.');
                e.status = 404;
                throw e;
            }
            let toplam = null;
            let satirlar = null;
            let top = null;
            if (Array.isArray(raw)) {
                satirlar = hazirSatirlar(raw);
                top = belgelerToplam(satirlar);
                toplam = top.total_amount;
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
                    lead_id = COALESCE($11, lead_id),
                    company_id = COALESCE($12, company_id),
                    plant_id = COALESCE($13, plant_id),
                    payment_term_code = COALESCE($14, payment_term_code),
                    payment_method = COALESCE($15, payment_method),
                    delivery_term_code = COALESCE($16, delivery_term_code),
                    exchange_rate = COALESCE($17, exchange_rate),
                    discount_rate = COALESCE($18, discount_rate),
                    project_code = COALESCE($19, project_code),
                    public_note = COALESCE($20, public_note),
                    internal_note = COALESCE($21, internal_note),
                    customer_quotation_no = COALESCE($22, customer_quotation_no),
                    price_list_id = COALESCE($23, price_list_id),
                    delivery_date = COALESCE($24::date, delivery_date),
                    subtotal = COALESCE($25, subtotal),
                    tax_amount = COALESCE($26, tax_amount),
                    grand_total = COALESCE($27, grand_total),
                    updated_at = NOW()
                WHERE id=$1
                `,
                [
                    req.params.id, partner_id || null, quotation_date || null, valid_date || null,
                    currency_code || null, status || null, movement_code_id || null, description ?? null, toplam,
                    firsat_id || null, lead_id || null,
                    company_id || mevcut.rows[0].company_id || null,
                    plant_id || null, payment_term_code || null, payment_method || null,
                    delivery_term_code || null,
                    exchange_rate != null ? Number(exchange_rate) : null,
                    discount_rate != null ? Number(discount_rate) : null,
                    project_code || null, public_note ?? null, internal_note ?? null,
                    customer_quotation_no || null, price_list_id || null, delivery_date || null,
                    top ? top.subtotal : null, top ? top.tax_amount : null, top ? top.grand_total : null,
                ]
            );
            if (satirlar) {
                await client.query('DELETE FROM sales_quotation_lines WHERE quotation_id=$1', [req.params.id]);
                await insertSatirlar(client, Number(req.params.id), satirlar);
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
                     source_document_type, source_document_id, company_id, plant_id,
                     delivery_date, payment_term_code, payment_method, delivery_term_code,
                     exchange_rate, discount_rate, subtotal, tax_amount, grand_total,
                     public_note, internal_note, project_code)
                VALUES ($1,$2,$3,$4,CURRENT_DATE,'SatisSiparis',$5,'Onayli',$6,$7,$8,$9,$10,$11,
                        $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
                RETURNING id
                `,
                [
                    no, teklif.partner_id, teklif.partner_code, teklif.partner_name, teklif.total_amount,
                    teklif.id, hk?.id || null, teklif.currency_code || 'TRY',
                    `Teklif ${teklif.quotation_no} dönüşümü`,
                    BELGE_TIPI.SATIS_TEKLIF, teklif.id,
                    teklif.company_id || (typeof resolveCompanyId === 'function' ? resolveCompanyId(req, req.body) : null) || null,
                    teklif.plant_id || null,
                    teklif.delivery_date || teklif.valid_date || null,
                    teklif.payment_term_code || null, teklif.payment_method || null,
                    teklif.delivery_term_code || null,
                    teklif.exchange_rate != null ? Number(teklif.exchange_rate) : null,
                    teklif.discount_rate != null ? Number(teklif.discount_rate) : null,
                    teklif.subtotal != null ? Number(teklif.subtotal) : teklif.total_amount,
                    teklif.tax_amount != null ? Number(teklif.tax_amount) : null,
                    teklif.grand_total != null ? Number(teklif.grand_total) : teklif.total_amount,
                    teklif.public_note || null, teklif.internal_note || null,
                    teklif.project_code || null,
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
