const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, depoStokBakiye } = require('../src/services/stokHareketService');
const { satirHesapla, belgelerToplam } = require('../src/utils/kalemHesap');
const { sevkGetir } = require('./shipment_orders');
const {
    BELGE_TIPI,
    hareketKoduBul,
    onerilenDepolar,
} = require('../src/utils/belgeOmurga');
const { rezervasyonTuket } = require('../src/services/rezervasyonService');
const { belgeHtml } = require('../src/services/belgePdfService');
const {
    pickFields,
    appendInsert,
    FATURA_BASLIK,
    FATURA_SATIR,
} = require('../src/utils/belgeAlanlari');

function nOrNull(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}

function boolOr(v, fallback = false) {
    if (typeof v === 'boolean') return v;
    if (v === undefined || v === null || v === '') return fallback;
    return ['1', 'true', 'evet', 'e', 'yes'].includes(String(v).trim().toLowerCase());
}

function satirHesapPaketi(s, kurBelge = 1) {
    const h = satirHesapla({
        quantity: s.quantity,
        unit_price: s.unit_price,
        discount_rate: s.discount_rate,
        discount_rate_2: s.discount_rate_2,
        discount_rate_3: s.discount_rate_3,
        vat_rate: s.vat_rate != null ? s.vat_rate : 20,
        vat_mode: s.vat_mode || 'Haric',
        withholding_rate: s.withholding_rate,
        excise_rate: s.excise_rate,
        exchange_rate: s.exchange_rate != null ? s.exchange_rate : kurBelge,
    });
    const bandrolOran = Number(s.bandrol_rate) || 0;
    const bandrol_amount = Math.round(((Number(h.goods_service_amount) || 0) * bandrolOran / 100) * 100) / 100;
    return { ...h, bandrol_rate: bandrolOran, bandrol_amount };
}

async function irsaliyeSatirYaz(client, irsaliyeId, s, sira, kaynakTip, kaynakId, kurBelge = 1) {
    const h = satirHesapPaketi(s, kurBelge);
    await client.query(
        `
        INSERT INTO delivery_note_lines
            (delivery_note_id, line_no, line_type, item_id, warehouse_id, quantity, uom_code,
             unit_price, price_list_id, currency_code, rate_type, exchange_rate,
             local_unit_price, local_currency_amount,
             discount_rate, discount_rate_2, discount_rate_3,
             discount_amount, discount_tutari2, discount_tutari3,
             vat_code, vat_rate, vat_mode, vat_amount,
             withholding_code, withholding_rate, withholding_amount,
             excise_code, excise_rate, excise_amount,
             bandrol_rate, bandrol_amount, tax_schema,
             due_date, due_days,
             line_description, line_description_2, line_description_3, customer_ref_code,
             lot_id, lot_no, serial_no, stock_status, raf_code, konum_code,
             invoiced_quantity, order_no,
             amount_ex_tax, amount_ttc,
             ship_emri_line_id, sales_order_line_id,
             source_document_type, source_document_id, source_document_line_id)
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,
            $13,$14,
            $15,$16,$17,
            $18,$19,$20,
            $21,$22,$23,$24,
            $25,$26,$27,
            $28,$29,$30,
            $31,$32,$33,
            $34,$35,
            $36,$37,$38,$39,
            $40,$41,$42,$43,$44,$45,
            $46,$47,
            $48,$49,
            $50,$51,
            $52,$53,$54
        )
        `,
        [
            irsaliyeId,
            s.line_no != null ? s.line_no : sira,
            s.line_type || 'S',
            s.item_id,
            s.warehouse_id || null,
            s.quantity,
            s.uom_code || null,
            s.unit_price ?? 0,
            s.price_list_id || null,
            s.currency_code || null,
            s.rate_type || null,
            s.exchange_rate != null ? s.exchange_rate : kurBelge,
            h.yp_unit_price,
            h.yp_amount,
            h.discount_rate,
            h.discount_rate_2,
            h.discount_rate_3,
            h.discount_amount,
            h.discount_tutari2,
            h.discount_tutari3,
            s.vat_code || null,
            h.vat_rate,
            h.vat_mode,
            h.vat_amount,
            s.withholding_code || null,
            h.withholding_rate,
            h.withholding_amount,
            s.excise_code || null,
            h.excise_rate,
            h.excise_amount,
            h.bandrol_rate,
            h.bandrol_amount,
            s.tax_schema || null,
            s.due_date || null,
            nOrNull(s.due_days),
            s.line_description || null,
            s.line_description_2 || null,
            s.line_description_3 || null,
            s.customer_ref_code || null,
            s.lot_id || null,
            s.lot_no || null,
            s.serial_no || null,
            s.stock_status || 'Kullanilabilir',
            s.raf_code || null,
            s.konum_code || null,
            s.invoiced_quantity ?? 0,
            s.order_no || null,
            h.amount_ex_tax,
            h.amount_ttc,
            s.ship_emri_line_id || null,
            s.sales_order_line_id || null,
            s.source_document_type || kaynakTip,
            s.source_document_id || kaynakId,
            s.source_document_line_id || s.ship_emri_line_id || s.sales_order_line_id || null,
        ],
    );
    return { ...s, ...h };
}

async function irsaliyeToplamlariGuncelle(client, irsaliyeId, satirHesaplari, altiIskonto = 0) {
    const t = belgelerToplam(satirHesaplari);
    const bandrol = satirHesaplari.reduce((a, s) => a + (Number(s.bandrol_amount) || 0), 0);
    const alti = Number(altiIskonto) || 0;
    const genel = Math.round(((Number(t.grand_total) || 0) - alti) * 100) / 100;
    await client.query(
        `
        UPDATE delivery_notes SET
            subtotal = $2,
            total_discount = $3,
            tax_amount = $4,
            total_excise = $5,
            total_withholding = $6,
            total_bandrol = $7,
            delivery_footer_discount = $8,
            grand_total = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [
            irsaliyeId,
            t.subtotal,
            t.total_discount,
            t.tax_amount,
            t.total_excise,
            t.total_withholding,
            Math.round(bandrol * 100) / 100,
            alti,
            genel,
        ],
    );
}

async function irsaliyeGetir(id) {
    const i = await pool.query(
        `
        SELECT ir.*, c.partner_code, c.partner_name,
               COALESCE(ir.tax_id, c.tax_id) AS tax_id,
               COALESCE(ir.tax_office, c.tax_office) AS tax_office,
               c.email AS cari_email, c.telefon AS cari_telefon,
               d.warehouse_code, d.warehouse_name,
               sp.order_no, se.shipment_no,
               hk.movement_code, hk.movement_name,
               sc.partner_code AS sevk_cari_kodu, sc.partner_name AS sevk_cari_adi
        FROM delivery_notes ir
        JOIN partners c ON c.id = ir.partner_id
        JOIN warehouses d ON d.id = ir.warehouse_id
        LEFT JOIN sales_orders sp ON sp.id = ir.sales_order_id
        LEFT JOIN shipment_orders se ON se.id = ir.shipment_order_id
        LEFT JOIN movement_codes hk ON hk.id = ir.movement_code_id
        LEFT JOIN partners sc ON sc.id = ir.ship_to_partner_id
        WHERE ir.id = $1
        `,
        [id]
    );
    if (!i.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT s.*, st.item_code, st.item_name,
               dd.warehouse_code AS satir_depo_kodu, dd.warehouse_name AS satir_depo_adi,
               fl.list_code AS fiyat_liste_kodu, fl.list_name AS fiyat_liste_adi
        FROM delivery_note_lines s
        JOIN items st ON st.id = s.item_id
        LEFT JOIN warehouses dd ON dd.id = s.warehouse_id
        LEFT JOIN price_lists fl ON fl.id = s.price_list_id
        WHERE s.delivery_note_id = $1
        ORDER BY s.line_no, s.id
        `,
        [id]
    );
    return { ...i.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

function validateSevkAlanlari(body) {
    const eksik = [];
    if (!body.ship_city) eksik.push('ship_city');
    if (!body.ship_district) eksik.push('ship_district');
    if (!body.ship_country) eksik.push('ship_country');
    if (!body.ship_postal_code) eksik.push('ship_postal_code');
    const tasiyiciOk = Boolean(body.carrier_title || body.carrier_tax_id);
    const soforOk = Boolean(body.driver_name && body.driver_last_name && body.driver_national_id);
    if (!tasiyiciOk && !soforOk) {
        eksik.push('tasiyici (title/tax_id) veya sofor (first_name+last_name+tckn)');
    }
    return eksik;
}

/** Onay öncesi depo bakiyesi kontrolü (UI için) */
async function depoKontrolEt(client, depoId, satirlar) {
    const sonuclar = [];
    let accepted = true;
    for (const s of satirlar) {
        const bakiye = await depoStokBakiye(client, depoId, s.item_id);
        const istenen = Number(s.quantity);
        const ok = bakiye + 1e-9 >= istenen;
        if (!ok) accepted = false;
        const oneriler = ok ? [] : await onerilenDepolar(client, s.item_id, istenen, depoId);
        sonuclar.push({
            item_id: s.item_id,
            item_code: s.item_code,
            item_name: s.item_name,
            quantity: istenen,
            bakiye,
            yeterli: ok,
            onerilen_depolar: oneriler,
        });
    }
    return { accepted, satirlar: sonuclar, warehouse_id: depoId };
}

router.get('/', async (req, res) => {
    try {
        const firmaId = firmaIdFromReq(req);
        const params = [];
        let sql = 'SELECT id FROM delivery_notes';
        if (firmaId) { params.push(firmaId); sql += ` WHERE company_id = $${params.length}`; }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
        const result = [];
        for (const r of liste.rows) result.push(await irsaliyeGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await irsaliyeGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Depo bakiyesi ön kontrol (P04) */
router.get('/:id/depo-kontrol', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        const depoId = Number(req.query.warehouse_id || ir.warehouse_id);
        const result = await depoKontrolEt(pool, depoId, ir.satirlar);
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** Belge zinciri timeline */
router.get('/:id/zincir', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        const adimlar = [];
        if (ir.sales_order_id) {
            const sp = await pool.query(
                `SELECT id, order_no AS no, status, quotation_id, source_document_type, source_document_id
                 FROM sales_orders WHERE id=$1`,
                [ir.sales_order_id]
            );
            if (sp.rows[0]?.quotation_id) {
                const tk = await pool.query(
                    `SELECT id, quotation_no AS no, status FROM sales_quotations WHERE id=$1`,
                    [sp.rows[0].quotation_id]
                );
                if (tk.rows[0]) adimlar.push({ type: BELGE_TIPI.SATIS_TEKLIF, ...tk.rows[0] });
            }
            if (sp.rows[0]) adimlar.push({ type: BELGE_TIPI.SATIS_SIPARIS, ...sp.rows[0] });
        }
        if (ir.shipment_order_id) {
            const se = await pool.query(
                `SELECT id, shipment_no AS no, status FROM shipment_orders WHERE id=$1`,
                [ir.shipment_order_id]
            );
            if (se.rows[0]) adimlar.push({ type: BELGE_TIPI.SEVK_EMRI, ...se.rows[0] });
        }
        adimlar.push({
            type: BELGE_TIPI.IRSALIYE,
            id: ir.id,
            no: ir.delivery_note_no,
            status: ir.status,
            source_document_type: ir.source_document_type,
            source_document_id: ir.source_document_id,
        });
        const fat = await pool.query(
            `SELECT id, invoice_no AS no, status FROM invoices WHERE delivery_note_id=$1 ORDER BY id`,
            [ir.id]
        );
        for (const f of fat.rows) adimlar.push({ type: BELGE_TIPI.SATIS_FATURA, ...f });
        res.json({ delivery_note_id: ir.id, adimlar });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

function baslikKaynak(body) {
    let kaynakTip = body.source_document_type || null;
    let kaynakId = body.source_document_id || null;
    if (!kaynakTip && body.shipment_order_id) {
        kaynakTip = BELGE_TIPI.SEVK_EMRI;
        kaynakId = body.shipment_order_id;
    } else if (!kaynakTip && body.sales_order_id) {
        kaynakTip = BELGE_TIPI.SATIS_SIPARIS;
        kaynakId = body.sales_order_id;
    }
    return { kaynakTip, kaynakId };
}

async function irsaliyeBaslikUpsert(client, { id, body, hkId, no, kaynakTip, kaynakId }) {
    const vals = {
        ozellestirme_no: body.ozellestirme_no || 'TR1.2.1',
        scenario: body.scenario || 'TEMELIRSALIYE',
        delivery_note_type: body.delivery_note_type || 'SEVK',
        delivery_date: body.delivery_date || null,
        delivery_time: body.delivery_time || null,
        ship_date: body.ship_date || null,
        ship_time: body.ship_time || null,
        actual_ship_date: body.actual_ship_date || body.ship_date || null,
        actual_ship_time: body.actual_ship_time || body.ship_time || null,
        partner_id: body.partner_id,
        sales_order_id: body.sales_order_id || null,
        shipment_order_id: body.shipment_order_id || null,
        warehouse_id: body.warehouse_id,
        movement_code_id: hkId,
        company_id: body.company_id || null,
        plant_id: body.plant_id || null,
        project_code: body.project_code || null,
        region: body.region || null,
        currency_code: body.currency_code || 'TRY',
        rate_type: body.rate_type || 'TCMB-SATIS',
        exchange_rate: body.exchange_rate != null ? body.exchange_rate : 1,
        rate_option: body.rate_option || 'SevkTarihi',
        e_document_status: body.e_document_status || 'Hazir',
        due_date: body.due_date || null,
        due_days: nOrNull(body.due_days),
        payment_plan: body.payment_plan || null,
        payment_method: body.payment_method || null,
        delivery_term_code: body.delivery_term_code || null,
        carrier_company: body.carrier_company || null,
        carrier: body.carrier || null,
        sales_rep: body.sales_rep || null,
        invoice_status: body.invoice_status || 'Irsaliye',
        is_printed: boolOr(body.is_printed, false),
        print_local_currency: boolOr(body.print_local_currency, false),
        document_series: body.document_series || null,
        document_sequence: body.document_sequence || null,
        gib_number: body.gib_number || null,
        uuid_ettn: body.uuid_ettn || null,
        mailbox_alias: body.mailbox_alias || null,
        purchase_pre_delivery: body.purchase_pre_delivery || null,
        paper_series: body.paper_series || null,
        paper_sequence: body.paper_sequence || null,
        paper_document_date: body.paper_document_date || null,
        portal_sent_date: body.portal_sent_date || null,
        ecommerce_web: body.ecommerce_web || null,
        ecommerce_name: body.ecommerce_name || null,
        ecommerce_last_name: body.ecommerce_last_name || null,
        ecommerce_email: body.ecommerce_email || null,
        ship_to_partner_id: body.ship_to_partner_id || null,
        ship_address_type: body.ship_address_type || null,
        ship_name: body.ship_name || null,
        ship_last_name: body.ship_last_name || null,
        ship_to_address: body.ship_to_address || null,
        ship_address_1: body.ship_address_1 || null,
        ship_address_2: body.ship_address_2 || null,
        ship_address_3: body.ship_address_3 || null,
        ship_city: body.ship_city || null,
        ship_district: body.ship_district || null,
        ship_country: body.ship_country || 'TR',
        ship_postal_code: body.ship_postal_code || null,
        ship_phone_1: body.ship_phone_1 || null,
        ship_phone_2: body.ship_phone_2 || null,
        customs: body.customs || null,
        bill_address_1: body.bill_address_1 || null,
        bill_address_2: body.bill_address_2 || null,
        bill_address_3: body.bill_address_3 || null,
        bill_postal_code: body.bill_postal_code || null,
        bill_country: body.bill_country || null,
        bill_city: body.bill_city || null,
        bill_district: body.bill_district || null,
        contract_code: body.contract_code || null,
        partner_title: body.partner_title || null,
        partner_title_2: body.partner_title_2 || null,
        tax_office: body.tax_office || null,
        tax_id: body.tax_id || null,
        withholding_code: body.withholding_code || null,
        withholding_rate: body.withholding_rate ?? 0,
        withholding_amount: body.withholding_amount ?? 0,
        tax_schema: body.tax_schema || null,
        special_movement_type: body.special_movement_type || null,
        fin_due_date: body.fin_due_date || null,
        fin_due_days: nOrNull(body.fin_due_days),
        stock_date: body.stock_date || null,
        vehicle_code: body.vehicle_code || null,
        vehicle_plate: body.vehicle_plate || null,
        trailer_plate: body.trailer_plate || null,
        delivered_by: body.delivered_by || null,
        driver_name: body.driver_name || null,
        driver_last_name: body.driver_last_name || null,
        driver_national_id: body.driver_national_id || null,
        driver_mobile: body.driver_mobile || null,
        cargo_no: body.cargo_no || null,
        vehicle_description: body.vehicle_description || null,
        carrier_title: body.carrier_title || null,
        carrier_tax_id: body.carrier_tax_id || null,
        description: body.description || null,
        description_2: body.description_2 || null,
        description_3: body.description_3 || null,
        public_note: body.public_note || null,
        internal_note: body.internal_note || null,
        delivery_footer_discount: body.delivery_footer_discount ?? 0,
        status: body.status || 'Taslak',
        source_document_type: kaynakTip,
        source_document_id: kaynakId,
        iade_mi: boolOr(body.iade_mi, false),
    };

    if (!id) {
        const ins = await client.query(
            `
            INSERT INTO delivery_notes (
                delivery_note_no, ozellestirme_no, scenario, delivery_note_type,
                delivery_date, delivery_time, ship_date, ship_time,
                actual_ship_date, actual_ship_time,
                partner_id, sales_order_id, shipment_order_id, warehouse_id, movement_code_id,
                company_id, plant_id, project_code, region,
                currency_code, rate_type, exchange_rate, rate_option, e_document_status,
                due_date, due_days, payment_plan, payment_method, delivery_term_code,
                carrier_company, carrier, sales_rep, invoice_status,
                is_printed, print_local_currency, document_series, document_sequence, gib_number,
                mailbox_alias, purchase_pre_delivery, paper_series, paper_sequence,
                paper_document_date, portal_sent_date,
                ecommerce_web, ecommerce_name, ecommerce_last_name, ecommerce_email,
                ship_to_partner_id, ship_address_type, ship_name, ship_last_name, ship_to_address,
                ship_address_1, ship_address_2, ship_address_3, ship_city, ship_district, ship_country, ship_postal_code,
                ship_phone_1, ship_phone_2, customs,
                bill_address_1, bill_address_2, bill_address_3, bill_postal_code, bill_country, bill_city, bill_district,
                contract_code, partner_title, partner_title_2, tax_office, tax_id,
                withholding_code, withholding_rate, withholding_amount, tax_schema, special_movement_type,
                fin_due_date, fin_due_days, stock_date,
                vehicle_code, vehicle_plate, trailer_plate, delivered_by,
                driver_name, driver_last_name, driver_national_id, driver_mobile, cargo_no, vehicle_description,
                carrier_title, carrier_tax_id,
                description, description_2, description_3, public_note, internal_note,
                delivery_footer_discount, status, source_document_type, source_document_id, iade_mi
            ) VALUES (
                $1,$2,$3,$4,
                COALESCE($5::date,CURRENT_DATE), COALESCE($6::time,CURRENT_TIME),
                COALESCE($7::date,CURRENT_DATE), COALESCE($8::time,CURRENT_TIME),
                COALESCE($9::date,CURRENT_DATE), COALESCE($10::time,CURRENT_TIME),
                $11,$12,$13,$14,$15,
                $16,$17,$18,$19,
                $20,$21,$22,$23,$24,
                $25,$26,$27,$28,$29,
                $30,$31,$32,$33,
                $34,$35,$36,$37,$38,
                $39,$40,$41,$42,
                $43,$44,
                $45,$46,$47,$48,
                $49,$50,$51,$52,$53,
                $54,$55,$56,$57,$58,COALESCE($59,'TR'),$60,
                $61,$62,$63,
                $64,$65,$66,$67,$68,$69,$70,
                $71,$72,$73,$74,$75,
                $76,$77,$78,$79,$80,
                $81,$82,$83,
                $84,$85,$86,$87,
                $88,$89,$90,$91,$92,$93,
                $94,$95,
                $96,$97,$98,$99,$100,
                $101,COALESCE($102,'Taslak'),$103,$104,$105
            ) RETURNING id
            `,
            [
                no, vals.ozellestirme_no, vals.scenario, vals.delivery_note_type,
                vals.delivery_date, vals.delivery_time, vals.ship_date, vals.ship_time,
                vals.actual_ship_date, vals.actual_ship_time,
                vals.partner_id, vals.sales_order_id, vals.shipment_order_id, vals.warehouse_id, vals.movement_code_id,
                vals.company_id, vals.plant_id, vals.project_code, vals.region,
                vals.currency_code, vals.rate_type, vals.exchange_rate, vals.rate_option, vals.e_document_status,
                vals.due_date, vals.due_days, vals.payment_plan, vals.payment_method, vals.delivery_term_code,
                vals.carrier_company, vals.carrier, vals.sales_rep, vals.invoice_status,
                vals.is_printed, vals.print_local_currency, vals.document_series, vals.document_sequence, vals.gib_number,
                vals.mailbox_alias, vals.purchase_pre_delivery, vals.paper_series, vals.paper_sequence,
                vals.paper_document_date, vals.portal_sent_date,
                vals.ecommerce_web, vals.ecommerce_name, vals.ecommerce_last_name, vals.ecommerce_email,
                vals.ship_to_partner_id, vals.ship_address_type, vals.ship_name, vals.ship_last_name, vals.ship_to_address,
                vals.ship_address_1, vals.ship_address_2, vals.ship_address_3, vals.ship_city, vals.ship_district, vals.ship_country, vals.ship_postal_code,
                vals.ship_phone_1, vals.ship_phone_2, vals.customs,
                vals.bill_address_1, vals.bill_address_2, vals.bill_address_3, vals.bill_postal_code, vals.bill_country, vals.bill_city, vals.bill_district,
                vals.contract_code, vals.partner_title, vals.partner_title_2, vals.tax_office, vals.tax_id,
                vals.withholding_code, vals.withholding_rate, vals.withholding_amount, vals.tax_schema, vals.special_movement_type,
                vals.fin_due_date, vals.fin_due_days, vals.stock_date,
                vals.vehicle_code, vals.vehicle_plate, vals.trailer_plate, vals.delivered_by,
                vals.driver_name, vals.driver_last_name, vals.driver_national_id, vals.driver_mobile, vals.cargo_no, vals.vehicle_description,
                vals.carrier_title, vals.carrier_tax_id,
                vals.description, vals.description_2, vals.description_3, vals.public_note, vals.internal_note,
                vals.delivery_footer_discount, vals.status, vals.source_document_type, vals.source_document_id, vals.iade_mi,
            ],
        );
        return ins.rows[0].id;
    }

    await client.query(
        `
        UPDATE delivery_notes SET
            ozellestirme_no=COALESCE($2, ozellestirme_no),
            scenario=COALESCE($3, scenario),
            delivery_note_type=COALESCE($4, delivery_note_type),
            delivery_date=COALESCE($5::date, delivery_date),
            delivery_time=COALESCE($6::time, delivery_time),
            ship_date=COALESCE($7::date, ship_date),
            ship_time=COALESCE($8::time, ship_time),
            actual_ship_date=COALESCE($9::date, actual_ship_date),
            actual_ship_time=COALESCE($10::time, actual_ship_time),
            partner_id=COALESCE($11, partner_id),
            sales_order_id=$12, shipment_order_id=$13,
            warehouse_id=COALESCE($14, warehouse_id),
            movement_code_id=COALESCE($15, movement_code_id),
            company_id=$16, plant_id=$17, project_code=$18, region=$19,
            currency_code=COALESCE($20, currency_code),
            rate_type=COALESCE($21, rate_type),
            exchange_rate=COALESCE($22, exchange_rate),
            rate_option=COALESCE($23, rate_option),
            e_document_status=COALESCE($24, e_document_status),
            due_date=$25, due_days=$26, payment_plan=$27, payment_method=$28, delivery_term_code=$29,
            carrier_company=$30, carrier=$31, sales_rep=$32, invoice_status=COALESCE($33, invoice_status),
            is_printed=COALESCE($34, is_printed), print_local_currency=COALESCE($35, print_local_currency),
            document_series=$36, document_sequence=$37, gib_number=$38,
            mailbox_alias=$39, purchase_pre_delivery=$40, paper_series=$41, paper_sequence=$42,
            paper_document_date=$43, portal_sent_date=$44,
            ecommerce_web=$45, ecommerce_name=$46, ecommerce_last_name=$47, ecommerce_email=$48,
            ship_to_partner_id=$49, ship_address_type=$50, ship_name=$51, ship_last_name=$52, ship_to_address=$53,
            ship_address_1=$54, ship_address_2=$55, ship_address_3=$56, ship_city=$57, ship_district=$58,
            ship_country=COALESCE($59, ship_country), ship_postal_code=$60,
            ship_phone_1=$61, ship_phone_2=$62, customs=$63,
            bill_address_1=$64, bill_address_2=$65, bill_address_3=$66, bill_postal_code=$67,
            bill_country=$68, bill_city=$69, bill_district=$70,
            contract_code=$71, partner_title=$72, partner_title_2=$73, tax_office=$74, tax_id=$75,
            withholding_code=$76, withholding_rate=COALESCE($77, withholding_rate), withholding_amount=COALESCE($78, withholding_amount),
            tax_schema=$79, special_movement_type=$80,
            fin_due_date=$81, fin_due_days=$82, stock_date=$83,
            vehicle_code=$84, vehicle_plate=$85, trailer_plate=$86, delivered_by=$87,
            driver_name=$88, driver_last_name=$89, driver_national_id=$90, driver_mobile=$91, cargo_no=$92, vehicle_description=$93,
            carrier_title=$94, carrier_tax_id=$95,
            description=$96, description_2=$97, description_3=$98, public_note=$99, internal_note=$100,
            delivery_footer_discount=COALESCE($101, delivery_footer_discount),
            status=COALESCE($102, status),
            source_document_type=COALESCE($103, source_document_type),
            source_document_id=COALESCE($104, source_document_id),
            iade_mi=COALESCE($105, iade_mi),
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$1
        `,
        [
            id,
            vals.ozellestirme_no, vals.scenario, vals.delivery_note_type,
            vals.delivery_date, vals.delivery_time, vals.ship_date, vals.ship_time,
            vals.actual_ship_date, vals.actual_ship_time,
            vals.partner_id, vals.sales_order_id, vals.shipment_order_id, vals.warehouse_id, vals.movement_code_id,
            vals.company_id, vals.plant_id, vals.project_code, vals.region,
            vals.currency_code, vals.rate_type, vals.exchange_rate, vals.rate_option, vals.e_document_status,
            vals.due_date, vals.due_days, vals.payment_plan, vals.payment_method, vals.delivery_term_code,
            vals.carrier_company, vals.carrier, vals.sales_rep, vals.invoice_status,
            vals.is_printed, vals.print_local_currency, vals.document_series, vals.document_sequence, vals.gib_number,
            vals.mailbox_alias, vals.purchase_pre_delivery, vals.paper_series, vals.paper_sequence,
            vals.paper_document_date, vals.portal_sent_date,
            vals.ecommerce_web, vals.ecommerce_name, vals.ecommerce_last_name, vals.ecommerce_email,
            vals.ship_to_partner_id, vals.ship_address_type, vals.ship_name, vals.ship_last_name, vals.ship_to_address,
            vals.ship_address_1, vals.ship_address_2, vals.ship_address_3, vals.ship_city, vals.ship_district,
            vals.ship_country, vals.ship_postal_code,
            vals.ship_phone_1, vals.ship_phone_2, vals.customs,
            vals.bill_address_1, vals.bill_address_2, vals.bill_address_3, vals.bill_postal_code,
            vals.bill_country, vals.bill_city, vals.bill_district,
            vals.contract_code, vals.partner_title, vals.partner_title_2, vals.tax_office, vals.tax_id,
            vals.withholding_code, vals.withholding_rate, vals.withholding_amount, vals.tax_schema, vals.special_movement_type,
            vals.fin_due_date, vals.fin_due_days, vals.stock_date,
            vals.vehicle_code, vals.vehicle_plate, vals.trailer_plate, vals.delivered_by,
            vals.driver_name, vals.driver_last_name, vals.driver_national_id, vals.driver_mobile, vals.cargo_no, vals.vehicle_description,
            vals.carrier_title, vals.carrier_tax_id,
            vals.description, vals.description_2, vals.description_3, vals.public_note, vals.internal_note,
            vals.delivery_footer_discount, vals.status, vals.source_document_type, vals.source_document_id, vals.iade_mi,
        ],
    );
    return id;
}

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const satirlar = body.satirlar || body.kalemler;
        if (!body.partner_id || !body.warehouse_id) {
            return res.status(400).json({ hata: 'partner_id ve warehouse_id zorunlu.' });
        }
        if (!Array.isArray(satirlar) || !satirlar.length) {
            return res.status(400).json({ hata: 'satirlar zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const no = body.delivery_note_no || (await sonrakiBelgeNo(client, 'IRSALIYE'));
            const hk = await hareketKoduBul(client, BELGE_TIPI.IRSALIYE, body.movement_code_id || null);
            if (!hk) throw new Error('Satış irsaliye hareket kodu tanımlı değil (SIR-01).');
            const { kaynakTip, kaynakId } = baslikKaynak(body);
            const iid = await irsaliyeBaslikUpsert(client, {
                id: null, body, hkId: hk.id, no, kaynakTip, kaynakId,
            });
            const kurBelge = body.exchange_rate != null ? Number(body.exchange_rate) : 1;
            const hesaplar = [];
            let sira = 1;
            for (const s of satirlar) {
                if (!s.item_id || !s.quantity) throw new Error('Satırda item_id ve quantity zorunlu.');
                hesaplar.push(await irsaliyeSatirYaz(client, iid, s, sira++, kaynakTip, kaynakId, kurBelge));
            }
            await irsaliyeToplamlariGuncelle(client, iid, hesaplar, body.delivery_footer_discount);
            return iid;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const body = req.body || {};
        const raw = body.satirlar || body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'FaturayaDonustu', 'Iptal', 'Kapali'];
        if (body.status && !allowed.includes(body.status)) {
            return res.status(400).json({ hata: 'Geçersiz status.' });
        }
        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT * FROM delivery_notes WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('İrsaliye bulunamadı.');
                e.status = 404;
                throw e;
            }
            const m = mevcut.rows[0];
            const merged = {
                ...m,
                ...body,
                partner_id: body.partner_id != null ? body.partner_id : m.partner_id,
                warehouse_id: body.warehouse_id != null ? body.warehouse_id : m.warehouse_id,
            };
            const { kaynakTip, kaynakId } = baslikKaynak(merged);
            await irsaliyeBaslikUpsert(client, {
                id: Number(req.params.id),
                body: merged,
                hkId: body.movement_code_id || m.movement_code_id,
                no: m.delivery_note_no,
                kaynakTip: kaynakTip || m.source_document_type,
                kaynakId: kaynakId || m.source_document_id,
            });
            if (Array.isArray(raw)) {
                await client.query('DELETE FROM delivery_note_lines WHERE delivery_note_id=$1', [req.params.id]);
                const kurBelge = merged.exchange_rate != null ? Number(merged.exchange_rate) : 1;
                const hesaplar = [];
                let sira = 1;
                for (const s of raw) {
                    if (!s.item_id || !s.quantity) continue;
                    hesaplar.push(await irsaliyeSatirYaz(
                        client,
                        Number(req.params.id),
                        s,
                        sira++,
                        s.source_document_type || kaynakTip || m.source_document_type,
                        s.source_document_id || kaynakId || m.source_document_id,
                        kurBelge,
                    ));
                }
                await irsaliyeToplamlariGuncelle(client, Number(req.params.id), hesaplar, merged.delivery_footer_discount);
            }
            return Number(req.params.id);
        });
        res.json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** Onay + stok çıkışı (SATIS_CIKIS) — P02 hareket bağ, P04 depo doğrulama */
router.post('/:id/onayla', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (ir.status !== 'Taslak') return res.status(400).json({ hata: 'Sadece Taslak onaylanır.' });

        const eksik = validateSevkAlanlari(ir);
        if (eksik.length) {
            return res.status(400).json({
                hata: `e-İrsaliye zorunlu alanlar eksik: ${eksik.join(', ')}`,
            });
        }

        const depoId = Number(req.body.warehouse_id || ir.warehouse_id);
        if (!depoId) return res.status(400).json({ hata: 'warehouse_id zorunlu.' });

        // Ön kontrol — UI'ya detaylı yanıt
        const kontrol = await depoKontrolEt(pool, depoId, ir.satirlar);
        if (!kontrol.accepted && req.body.zorla !== true) {
            // STOK_NEGATIF / eksi izin stok motorunda da kontrol edilecek;
            // burada erken ve zengin hata dönüyoruz.
            const hk = await hareketKoduBul(pool, BELGE_TIPI.IRSALIYE, ir.movement_code_id);
            const param = await pool.query(
                `SELECT value FROM system_parameters WHERE parametre_code='STOK_NEGATIF' LIMIT 1`
            );
            const negatifOk = Boolean(hk?.eksi_balance_izin)
                || ['evet', 'true', '1', 'yes', 'e'].includes(
                    String(param.rows[0]?.value || '').trim().toLowerCase()
                );
            if (!negatifOk) {
                return res.status(400).json({
                    hata: 'Yetersiz depo bakiyesi. Depo seçimini değiştirin veya stok girişi yapın.',
                    kod: 'YETERSIZ_STOK',
                    depo_kontrol: kontrol,
                });
            }
        }

        await withTransaction(pool, async (client) => {
            if (depoId !== Number(ir.warehouse_id)) {
                await client.query(`UPDATE delivery_notes SET warehouse_id=$2 WHERE id=$1`, [ir.id, depoId]);
            }

            let hkId = ir.movement_code_id;
            if (!hkId) {
                const hk = await hareketKoduBul(client, BELGE_TIPI.IRSALIYE);
                if (!hk) throw new Error('Satış irsaliye hareket kodu zorunlu (SIR-01).');
                hkId = hk.id;
                await client.query(`UPDATE delivery_notes SET movement_code_id=$2 WHERE id=$1`, [ir.id, hkId]);
            }

            const hareket = await stokHareketOlustur(client, {
                hareketTipi: 'SATIS_CIKIS',
                depoId,
                belgeTipi: 'IRSALIYE',
                belgeId: ir.id,
                description: `İrsaliye ${ir.delivery_note_no}`,
                hareketKoduId: hkId,
                satirlar: ir.satirlar.map((s) => ({
                    item_id: s.item_id,
                    quantity: s.quantity,
                    direction: -1,
                    uom_code: s.uom_code,
                })),
            });

            // Açık quantity: sipariş satırlarında irsaliye_edilen artır + rezervasyon tüket
            for (const s of ir.satirlar) {
                if (s.sales_order_line_id) {
                    await client.query(
                        `UPDATE sales_order_lines
                         SET delivered_quantity = COALESCE(delivered_quantity,0) + $2
                         WHERE id=$1`,
                        [s.sales_order_line_id, s.quantity]
                    );
                    await rezervasyonTuket(client, {
                        siparisDetayId: s.sales_order_line_id,
                        quantity: s.quantity,
                    });
                }
            }

            await client.query(
                `UPDATE delivery_notes SET status='Onayli', stock_movement_id=$2, warehouse_id=$3 WHERE id=$1`,
                [ir.id, hareket.hareket.id, depoId]
            );
        });
        res.json(await irsaliyeGetir(ir.id));
    } catch (err) {
        const status = err.code === 'YETERSIZ_STOK' ? 400 : 500;
        res.status(status).json({
            hata: err.message,
            kod: err.code || undefined,
            detay: err.detay || undefined,
        });
    }
});

/** Sevk emrinden irsaliye — P01 ref omurga + satır bağ */
router.post('/sevk-emrinden', async (req, res) => {
    try {
        const { shipment_order_id } = req.body;
        if (!shipment_order_id) return res.status(400).json({ hata: 'shipment_order_id zorunlu.' });
        const sevk = await sevkGetir(shipment_order_id);
        if (!sevk) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        if (!['Onayli', 'Taslak'].includes(sevk.status)) {
            return res.status(400).json({ hata: `Sevk durumu accepted değil: ${sevk.status}` });
        }

        const depoId = Number(req.body.warehouse_id || sevk.warehouse_id);
        if (!depoId) return res.status(400).json({ hata: 'warehouse_id zorunlu.' });

        const body = {
            ...req.body,
            partner_id: sevk.partner_id,
            warehouse_id: depoId,
            sales_order_id: sevk.sales_order_id,
            shipment_order_id: sevk.id,
            ship_to_address: req.body.ship_to_address || sevk.ship_to_address,
            ship_city: req.body.ship_city || sevk.ship_city,
            ship_district: req.body.ship_district || sevk.ship_district,
            ship_country: req.body.ship_country || sevk.ship_country || 'TR',
            ship_postal_code: req.body.ship_postal_code || sevk.ship_postal_code,
            description: req.body.description || `Sipariş No: ${sevk.order_no} — Sevk ${sevk.shipment_no}`,
            status: 'Taslak',
        };

        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'IRSALIYE');
            const hk = await hareketKoduBul(client, BELGE_TIPI.IRSALIYE, body.movement_code_id || null);
            if (!hk) throw new Error('Satış irsaliye hareket kodu tanımlı değil.');

            const baslik = await client.query(
                `
                INSERT INTO delivery_notes
                    (delivery_note_no, partner_id, sales_order_id, shipment_order_id, warehouse_id, movement_code_id,
                     ship_to_address, ship_city, ship_district, ship_country, ship_postal_code,
                     vehicle_plate, trailer_plate, driver_name, driver_last_name, driver_national_id,
                     carrier_title, carrier_tax_id, description, status,
                     source_document_type, source_document_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'TR'),$11,$12,$13,$14,$15,$16,$17,$18,$19,'Taslak',
                        $20,$21)
                RETURNING id
                `,
                [
                    no, body.partner_id, body.sales_order_id, body.shipment_order_id, body.warehouse_id, hk.id,
                    body.ship_to_address, body.ship_city, body.ship_district, body.ship_country, body.ship_postal_code,
                    body.vehicle_plate || null, body.trailer_plate || null,
                    body.driver_name || null, body.driver_last_name || null, body.driver_national_id || null,
                    body.carrier_title || null, body.carrier_tax_id || null, body.description,
                    BELGE_TIPI.SEVK_EMRI, sevk.id,
                ]
            );
            const iid = baslik.rows[0].id;
            for (const s of sevk.satirlar) {
                await client.query(
                    `INSERT INTO delivery_note_lines
                        (delivery_note_id, line_no, item_id, quantity, uom_code,
                         ship_emri_line_id, sales_order_line_id,
                         source_document_type, source_document_id, source_document_line_id)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                    [
                        iid, s.line_no, s.item_id, s.quantity, s.uom_code,
                        s.id, s.sales_order_line_id || null,
                        BELGE_TIPI.SEVK_EMRI, sevk.id, s.id,
                    ]
                );
            }
            await client.query(
                `UPDATE shipment_orders SET status='IrsaliyeDonustu' WHERE id=$1`,
                [sevk.id]
            );
            return iid;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** İrsaliye → Satış faturası — Onaylı + GİB gönderildi; numaratörden no kabul edilir */
router.post('/:id/fatura-olustur', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (ir.status !== 'Onayli') {
            return res.status(400).json({
                hata: `Fatura yalnızca Onaylı irsaliyeden oluşturulur (mevcut: ${ir.status}). Önce irsaliyeyi onaylayın.`,
                kod: 'IRSALIYE_DURUM_KILIDI',
            });
        }
        if (String(ir.e_document_status || '') !== 'Gonderildi') {
            return res.status(400).json({
                hata: 'Fatura oluşturmak için irsaliyenin e-belge durumu GİB’e gönderilmiş (Gonderildi) olmalıdır.',
                kod: 'IRSALIYE_GIB_KILIDI',
                e_document_status: ir.e_document_status || null,
            });
        }

        const faturaId = await withTransaction(pool, async (client) => {
            const no = (req.body.invoice_no && String(req.body.invoice_no).trim())
                || (await sonrakiBelgeNo(client, 'FATURA'));
            const hk = await hareketKoduBul(client, BELGE_TIPI.SATIS_FATURA);
            const kurBelge = Number(ir.exchange_rate) > 0 ? Number(ir.exchange_rate) : 1;

            const kalemler = [];
            for (const s of (ir.satirlar || [])) {
                const stok = await client.query(
                    'SELECT sales_price, uom_code FROM items WHERE id=$1',
                    [s.item_id]
                );
                const fiyat = req.body.birim_fiyatlar?.[s.item_id]
                    ?? (s.unit_price != null && Number(s.unit_price) > 0
                        ? Number(s.unit_price)
                        : Number(stok.rows[0]?.sales_price || 0));
                const h = satirHesapPaketi({
                    ...s,
                    unit_price: fiyat,
                    quantity: s.quantity,
                    vat_rate: s.vat_rate != null ? s.vat_rate : (req.body.vat_rate ?? 20),
                    discount_rate: s.discount_rate != null ? s.discount_rate : (req.body.discount_rate ?? 0),
                }, kurBelge);
                kalemler.push({
                    line_no: s.line_no,
                    item_id: s.item_id,
                    quantity: s.quantity,
                    uom_code: s.uom_code || stok.rows[0]?.uom_code,
                    unit_price: fiyat,
                    warehouse_id: s.warehouse_id || ir.warehouse_id || null,
                    price_list_id: s.price_list_id || null,
                    currency_code: s.currency_code || ir.currency_code || 'TRY',
                    rate_type: s.rate_type || ir.rate_type || null,
                    exchange_rate: h.exchange_rate,
                    local_unit_price: h.yp_unit_price,
                    local_currency_amount: h.yp_amount,
                    vat_code: s.vat_code || null,
                    withholding_code: s.withholding_code || null,
                    excise_code: s.excise_code || null,
                    tax_schema: s.tax_schema || null,
                    line_type: s.line_type || 'S',
                    line_description: s.line_description || null,
                    line_description_2: s.line_description_2 || null,
                    line_description_3: s.line_description_3 || null,
                    customer_ref_code: s.customer_ref_code || null,
                    due_date: s.due_date || null,
                    due_days: s.due_days != null ? s.due_days : null,
                    order_no: s.order_no || null,
                    serial_no: s.serial_no || null,
                    delivery_line_id: s.id,
                    sales_order_line_id: s.sales_order_line_id || null,
                    ...h,
                });
            }
            const top = belgelerToplam(kalemler);
            const bandrol = kalemler.reduce((a, k) => a + (Number(k.bandrol_amount) || 0), 0);
            const vadeGun = ir.due_days != null ? ir.due_days : ir.fin_due_days;

            const baslikKaynak = {
                invoice_category: 'SATIS',
                scenario: 'TICARIFATURA',
                ozellestirme_no: 'TR1.2',
                invoice_date: req.body.invoice_date || ir.delivery_date
                    || new Date().toISOString().slice(0, 10),
                currency_code: ir.currency_code || 'TRY',
                exchange_rate: kurBelge,
                rate_type: ir.rate_type || 'TCMB-SATIS',
                rate_option: ir.rate_option || 'BelgeTarihi',
                region: ir.region || null,
                delivery_note_id: ir.id,
                sales_order_id: ir.sales_order_id || null,
                movement_code_id: hk?.id || null,
                company_id: ir.company_id || null,
                plant_id: ir.plant_id || null,
                warehouse_id: ir.warehouse_id || null,
                price_list_id: ir.price_list_id || null,
                project_code: ir.project_code || null,
                sales_rep: ir.sales_rep || null,
                payment_method: ir.payment_method || null,
                payment_plan: ir.payment_plan || null,
                payment_term_code: ir.payment_term_code || null,
                delivery_term_code: ir.delivery_term_code || null,
                due_date: ir.due_date || ir.fin_due_date || null,
                due_days: vadeGun,
                payment_due_days: vadeGun,
                e_document_status: 'Hazir',
                document_series: ir.document_series || null,
                document_sequence: ir.document_sequence || null,
                gib_number: ir.gib_number || null,
                ship_to_address: ir.ship_to_address || null,
                ship_to_partner_id: ir.ship_to_partner_id || null,
                ship_address_type: ir.ship_address_type || null,
                ship_name: ir.ship_name || null,
                ship_last_name: ir.ship_last_name || null,
                ship_address_1: ir.ship_address_1 || null,
                ship_address_2: ir.ship_address_2 || null,
                ship_address_3: ir.ship_address_3 || null,
                ship_phone_1: ir.ship_phone_1 || null,
                ship_phone_2: ir.ship_phone_2 || null,
                ship_city: ir.ship_city || null,
                ship_district: ir.ship_district || null,
                ship_country: ir.ship_country || null,
                ship_postal_code: ir.ship_postal_code || null,
                customs: ir.customs || null,
                bill_address_1: ir.bill_address_1 || null,
                bill_address_2: ir.bill_address_2 || null,
                bill_address_3: ir.bill_address_3 || null,
                bill_postal_code: ir.bill_postal_code || null,
                bill_country: ir.bill_country || null,
                bill_city: ir.bill_city || null,
                bill_district: ir.bill_district || null,
                contract_code: ir.contract_code || null,
                partner_title: ir.partner_title || null,
                partner_title_2: ir.partner_title_2 || null,
                tax_office: ir.tax_office || null,
                tax_id: ir.tax_id || null,
                withholding_code: ir.withholding_code || null,
                withholding_rate: ir.withholding_rate ?? 0,
                withholding_amount: ir.withholding_amount ?? 0,
                tax_schema: ir.tax_schema || null,
                special_movement_type: ir.special_movement_type || null,
                fin_due_date: ir.fin_due_date || null,
                fin_due_days: ir.fin_due_days ?? null,
                stock_date: ir.stock_date || null,
                description: ir.description || `İrsaliye No: ${ir.delivery_note_no}`,
                description_2: ir.description_2 || null,
                description_3: ir.description_3 || null,
                public_note: ir.public_note || null,
                internal_note: ir.internal_note || null,
                invoice_footer_discount: ir.delivery_footer_discount ?? 0,
                total_excise: top.total_excise || 0,
                total_withholding: top.total_withholding || 0,
                total_bandrol: bandrol,
                remaining_amount: top.payable_amount,
                status: 'Taslak',
                source_document_type: BELGE_TIPI.IRSALIYE,
                source_document_id: ir.id,
            };
            const extras = pickFields(baslikKaynak, FATURA_BASLIK);
            delete extras.uuid_ettn;
            const baslik = appendInsert(
                ['invoice_no', 'partner_id', 'invoice_type', 'total_amount', 'net_amount',
                    'total_discount', 'tax_amount', 'payable_amount', 'uuid_ettn'],
                [no, ir.partner_id, 'Satis', top.total_amount, top.net_amount,
                    top.total_discount, top.tax_amount, top.payable_amount, null],
                extras
            );
            const cols = [];
            const vals = [];
            const ph = [];
            baslik.cols.forEach((c, i) => {
                cols.push(c);
                if (c === 'uuid_ettn') {
                    ph.push('gen_random_uuid()');
                } else {
                    vals.push(baslik.vals[i]);
                    ph.push(`$${vals.length}`);
                }
            });
            const fIns = await client.query(
                `INSERT INTO invoices (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING id`,
                vals
            );
            const fid = fIns.rows[0].id;
            for (const k of kalemler) {
                const satirEx = pickFields({
                    ...k,
                    net_unit_price: k.unit_price,
                    source_document_type: BELGE_TIPI.IRSALIYE,
                    source_document_id: ir.id,
                    source_document_line_id: k.delivery_line_id,
                }, FATURA_SATIR);
                const sat = appendInsert(
                    ['invoice_id', 'item_id', 'quantity', 'unit_price', 'total_amount', 'goods_service_amount'],
                    [fid, k.item_id, k.quantity, k.unit_price, k.satir_toplam, k.goods_service_amount],
                    satirEx
                );
                await client.query(
                    `INSERT INTO invoice_lines (${sat.cols.join(',')}) VALUES (${sat.placeholders})`,
                    sat.vals
                );
                if (k.sales_order_line_id) {
                    await client.query(
                        `UPDATE sales_order_lines
                         SET invoiced_quantity = COALESCE(invoiced_quantity,0) + $2
                         WHERE id=$1`,
                        [k.sales_order_line_id, k.quantity]
                    );
                }
                if (k.delivery_line_id) {
                    await client.query(
                        `UPDATE delivery_note_lines
                         SET invoiced_quantity = COALESCE(invoiced_quantity,0) + $2
                         WHERE id=$1`,
                        [k.delivery_line_id, k.quantity]
                    ).catch(() => {});
                }
            }
            await client.query(
                `UPDATE delivery_notes
                 SET status='FaturayaDonustu', invoice_status='Faturalandi'
                 WHERE id=$1`,
                [ir.id]
            );
            return fid;
        });

        const f = await pool.query(
            `SELECT f.*, c.partner_code, c.partner_name FROM invoices f JOIN partners c ON c.id=f.partner_id WHERE f.id=$1`,
            [faturaId]
        );
        const kalemler = await pool.query(
            `SELECT fd.*, s.item_code, s.item_name FROM invoice_lines fd
             JOIN items s ON s.id=fd.item_id WHERE fd.invoice_id=$1 ORDER BY fd.id`,
            [faturaId]
        );
        res.status(201).json({
            ok: true,
            fatura: { ...f.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows },
            irsaliye: await irsaliyeGetir(ir.id),
            yonlendir: 'fatura-yonetimi',
            message: 'Fatura ekranına yönlendiriliyorsunuz',
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** GET /delivery_notes/:id/yazdir — HTML+QR yazdırma (SAL-010) */
router.get('/:id/yazdir', async (req, res) => {
    try {
        const ir = await irsaliyeGetir(req.params.id);
        if (!ir) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        const html = belgeHtml({
            baslik: 'Satış İrsaliyesi',
            belgeNo: ir.delivery_note_no,
            tarih: ir.delivery_date || ir.created_at,
            cari: ir,
            satirlar: ir.satirlar || ir.kalemler || [],
            ekstra: { uuid_ettn: ir.uuid_ettn, description: ir.description },
        });
        res.type('html').send(html);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});
router.get('/:id/pdf', (req, res) => res.redirect(302, `/delivery_notes/${req.params.id}/yazdir`));

/** POST /delivery_notes/:id/iade — satış iade irsaliyesi (ters stok girişi) */
router.post('/:id/iade', async (req, res) => {
    try {
        const source = await irsaliyeGetir(req.params.id);
        if (!source) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (source.status !== 'Onayli' && source.status !== 'FaturayaDonustu') {
            return res.status(400).json({ hata: 'Yalnızca onaylı irsaliyeden iade oluşturulur.' });
        }
        const depoId = Number(req.body.warehouse_id || source.warehouse_id);
        const id = await withTransaction(pool, async (client) => {
            const no = await sonrakiBelgeNo(client, 'IRSALIYE').catch(() => `SIA-${Date.now()}`);
            const baslik = await client.query(
                `
                INSERT INTO delivery_notes
                  (delivery_note_no, partner_id, warehouse_id, sales_order_id, status, description,
                   source_document_type, source_document_id, delivery_date)
                VALUES ($1,$2,$3,$4,'Taslak',$5,'SATIS_IADE',$6,CURRENT_DATE)
                RETURNING id
                `,
                [
                    no, source.partner_id, depoId, source.sales_order_id,
                    `İade ← ${source.delivery_note_no}`, source.id,
                ]
            ).catch(async (err) => {
                // minimal kolon seti
                if (String(err.message).includes('column')) {
                    return client.query(
                        `INSERT INTO delivery_notes (delivery_note_no, partner_id, warehouse_id, status, description)
                         VALUES ($1,$2,$3,'Taslak',$4) RETURNING id`,
                        [no, source.partner_id, depoId, `İade ← ${source.delivery_note_no}`]
                    );
                }
                throw err;
            });
            const iadeId = baslik.rows[0].id;
            let sira = 1;
            for (const s of source.satirlar || []) {
                const quantity = req.body.miktarlar?.[s.id] != null
                    ? Number(req.body.miktarlar[s.id])
                    : Number(s.quantity);
                if (quantity <= 0) continue;
                await client.query(
                    `
                    INSERT INTO delivery_note_lines
                      (delivery_note_id, line_no, item_id, quantity, uom_code, sales_order_line_id)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [iadeId, sira++, s.item_id, quantity, s.uom_code || null, s.sales_order_line_id || null]
                ).catch(async () => {
                    await client.query(
                        `INSERT INTO delivery_note_lines (delivery_note_id, item_id, quantity, uom_code)
                         VALUES ($1,$2,$3,$4)`,
                        [iadeId, s.item_id, quantity, s.uom_code || null]
                    );
                });
            }
            // Stok girişi (iade)
            const satirlar = await client.query(
                `SELECT * FROM delivery_note_lines WHERE delivery_note_id=$1`,
                [iadeId]
            );
            if (satirlar.rows.length) {
                const hareket = await stokHareketOlustur(client, {
                    hareketTipi: 'IADE_GIRIS',
                    depoId,
                    belgeTipi: 'SATIS_IADE',
                    belgeId: iadeId,
                    description: `Satış iade ${no}`,
                    depoZorunluAtla: true,
                    satirlar: satirlar.rows.map((s) => ({
                        item_id: s.item_id,
                        quantity: s.quantity,
                        direction: 1,
                        uom_code: s.uom_code,
                    })),
                });
                await client.query(
                    `UPDATE delivery_notes SET status='Onayli', stock_movement_id=$2 WHERE id=$1`,
                    [iadeId, hareket.hareket.id]
                ).catch(() =>
                    client.query(`UPDATE delivery_notes SET status='Onayli' WHERE id=$1`, [iadeId])
                );
            }
            return iadeId;
        });
        res.status(201).json(await irsaliyeGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message, kod: err.code, detay: err.detay });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const mevcut = await pool.query('SELECT status FROM delivery_notes WHERE id=$1', [req.params.id]);
        if (!mevcut.rows[0]) return res.status(404).json({ hata: 'İrsaliye bulunamadı.' });
        if (mevcut.rows[0].status === 'Onayli' || mevcut.rows[0].status === 'FaturayaDonustu') {
            return res.status(400).json({ hata: 'Onaylı/faturalanmış irsaliye silinemez.' });
        }
        await pool.query('DELETE FROM delivery_notes WHERE id=$1', [req.params.id]);
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.irsaliyeGetir = irsaliyeGetir;
