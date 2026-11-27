const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');

async function sevkGetir(id) {
    const s = await pool.query(
        `
        SELECT se.*, c.partner_code, c.partner_name, sp.order_no,
               d.warehouse_code, d.warehouse_name, hk.movement_code, hk.movement_name
        FROM shipment_orders se
        JOIN partners c ON c.id = se.partner_id
        JOIN sales_orders sp ON sp.id = se.sales_order_id
        JOIN warehouses d ON d.id = se.warehouse_id
        LEFT JOIN movement_codes hk ON hk.id = se.movement_code_id
        WHERE se.id = $1
        `,
        [id]
    );
    if (!s.rows[0]) return null;
    const satirlar = await pool.query(
        `
        SELECT ss.*, st.item_code, st.item_name
        FROM shipment_order_lines ss
        JOIN items st ON st.id = ss.item_id
        WHERE ss.ship_id = $1
        ORDER BY ss.line_no, ss.id
        `,
        [id]
    );
    return { ...s.rows[0], satirlar: satirlar.rows, kalemler: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await (() => { const firmaId = firmaIdFromReq(req); const params = []; let sql = 'SELECT id FROM shipment_orders'; if (firmaId) { params.push(firmaId); sql += ' WHERE company_id = $' + params.length; } sql += ' ORDER BY id DESC'; return pool.query(sql, params); })();
        const result = [];
        for (const r of liste.rows) result.push(await sevkGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await sevkGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            sales_order_id, warehouse_id, ship_date, ship_to_address, ship_city, ship_district,
            ship_country, ship_postal_code, description, movement_code_id, status,
        } = req.body;
        let satirlar = req.body.satirlar || req.body.kalemler;

        if (!sales_order_id || !warehouse_id) {
            return res.status(400).json({ hata: 'sales_order_id ve warehouse_id zorunlu.' });
        }

        const id = await withTransaction(pool, async (client) => {
            const sip = await client.query(
                `SELECT s.*, c.partner_code, c.partner_name,
                        c.bill_address_1, c.address, c.il, c.district, c.country, c.postal_code
                 FROM sales_orders s JOIN partners c ON c.id = s.partner_id WHERE s.id=$1`,
                [sales_order_id]
            );
            if (!sip.rows[0]) throw new Error('Satış siparişi bulunamadı.');
            const siparis = sip.rows[0];

            if (!Array.isArray(satirlar) || !satirlar.length) {
                const kalemler = await client.query(
                    `SELECT * FROM sales_order_lines WHERE sales_order_id=$1 ORDER BY id`,
                    [sales_order_id]
                );
                satirlar = kalemler.rows.map((k, i) => ({
                    line_no: i + 1,
                    item_id: k.item_id,
                    sales_order_line_id: k.id,
                    quantity: k.quantity,
                    uom_code: k.stock_uom || k.uom_code,
                })).filter((x) => x.item_id);
                if (!satirlar.length) throw new Error('Siparişte item_id’li kalem yok.');
            }

            const no = await sonrakiBelgeNo(client, 'SEVK_EMRI');
            let hk = movement_code_id || null;
            if (!hk) {
                const d = await client.query(
                    `SELECT id FROM movement_codes WHERE document_type='SevkEmri' AND is_active ORDER BY id LIMIT 1`
                );
                hk = d.rows[0]?.id || null;
            }

            const baslik = await client.query(
                `
                INSERT INTO shipment_orders
                    (shipment_no, sales_order_id, partner_id, warehouse_id, ship_date, ship_to_address,
                     ship_city, ship_district, ship_country, ship_postal_code, status, movement_code_id, description)
                VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6,$7,$8,$9,$10,
                        COALESCE($11,'Taslak'),$12,$13)
                RETURNING id
                `,
                [
                    no, sales_order_id, siparis.partner_id, warehouse_id, ship_date || null,
                    ship_to_address || siparis.ship_to_address || siparis.bill_address_1 || siparis.address,
                    ship_city || siparis.il, ship_district || siparis.district,
                    ship_country || siparis.country || 'TR', ship_postal_code || siparis.postal_code,
                    status || 'Taslak', hk, description || `Sipariş ${siparis.order_no}`,
                ]
            );
            const sid = baslik.rows[0].id;
            for (const s of satirlar) {
                if (!s.item_id || !s.quantity) throw new Error('Satırda item_id ve quantity zorunlu.');
                await client.query(
                    `
                    INSERT INTO shipment_order_lines
                        (ship_id, line_no, item_id, sales_order_line_id, quantity, uom_code)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    `,
                    [sid, s.line_no || 1, s.item_id, s.sales_order_line_id || null, s.quantity, s.uom_code || null]
                );
            }
            return sid;
        });
        res.status(201).json(await sevkGetir(id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            warehouse_id, ship_date, ship_to_address, ship_city, ship_district, ship_country,
            ship_postal_code, description, movement_code_id, status,
        } = req.body;
        const raw = req.body.satirlar || req.body.kalemler;
        const allowed = ['Taslak', 'Onayli', 'IrsaliyeDonustu', 'Iptal', 'Kapali'];
        if (status && !allowed.includes(status)) return res.status(400).json({ hata: 'Geçersiz status.' });

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query('SELECT id FROM shipment_orders WHERE id=$1 FOR UPDATE', [req.params.id]);
            if (!mevcut.rows[0]) {
                const e = new Error('Sevk emri bulunamadı.');
                e.status = 404;
                throw e;
            }
            await client.query(
                `
                UPDATE shipment_orders SET
                    warehouse_id = COALESCE($2, warehouse_id),
                    ship_date = COALESCE($3::date, ship_date),
                    ship_to_address = COALESCE($4, ship_to_address),
                    ship_city = COALESCE($5, ship_city),
                    ship_district = COALESCE($6, ship_district),
                    ship_country = COALESCE($7, ship_country),
                    ship_postal_code = COALESCE($8, ship_postal_code),
                    status = COALESCE($9, status),
                    movement_code_id = COALESCE($10, movement_code_id),
                    description = COALESCE($11, description)
                WHERE id=$1
                `,
                [
                    req.params.id, warehouse_id || null, ship_date || null, ship_to_address ?? null,
                    ship_city ?? null, ship_district ?? null, ship_country ?? null, ship_postal_code ?? null,
                    status || null, movement_code_id || null, description ?? null,
                ]
            );
            if (Array.isArray(raw)) {
                await client.query('DELETE FROM shipment_order_lines WHERE ship_id=$1', [req.params.id]);
                for (const s of raw) {
                    if (!s.item_id || !s.quantity) continue;
                    await client.query(
                        `
                        INSERT INTO shipment_order_lines
                            (ship_id, line_no, item_id, sales_order_line_id, quantity, uom_code)
                        VALUES ($1,$2,$3,$4,$5,$6)
                        `,
                        [req.params.id, s.line_no || 1, s.item_id, s.sales_order_line_id || null, s.quantity, s.uom_code || null]
                    );
                }
            }
            return Number(req.params.id);
        });
        res.json(await sevkGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const r = await pool.query('DELETE FROM shipment_orders WHERE id=$1 RETURNING id', [req.params.id]);
        if (!r.rows[0]) return res.status(404).json({ hata: 'Sevk emri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
module.exports.sevkGetir = sevkGetir;
