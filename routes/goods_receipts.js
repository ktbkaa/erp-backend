const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur, assertStokDepoIzin } = require('../src/services/stokHareketService');
const { kkEmriOlustur, gkkDepoCozumle, depoBulKodVeyaRol } = require('../src/services/kaliteService');
const { parametreAl } = require('../src/utils/yetki');

async function kabulGetir(id) {
    const k = await pool.query(`
        SELECT mk.*, sas.order_no, sas.partner_id, d.warehouse_code, d.warehouse_name
        FROM goods_receipts mk
        JOIN purchase_orders sas ON sas.id = mk.purchase_order_id
        JOIN warehouses d ON d.id = mk.warehouse_id
        WHERE mk.id = $1
    `, [id]);
    if (!k.rows[0]) return null;
    const satirlar = await pool.query(`
        SELECT mks.*, st.item_code, st.item_name
        FROM goods_receipt_lines mks
        JOIN items st ON st.id = mks.item_id
        WHERE mks.receipt_id = $1 ORDER BY mks.id
    `, [id]);
    return { ...k.rows[0], satirlar: satirlar.rows };
}

router.get('/', async (req, res) => {
    try {
        const liste = await (() => { const firmaId = firmaIdFromReq(req); const params = []; let sql = 'SELECT id FROM goods_receipts'; if (firmaId) { params.push(firmaId); sql += ' WHERE company_id = $' + params.length; } sql += ' ORDER BY id DESC'; return pool.query(sql, params); })();
        const result = [];
        for (const r of liste.rows) result.push(await kabulGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Satınalma siparişinden mal kabul + Ana Depo stok girişi
 * Body: { purchase_order_id, warehouse_id, satirlar?: [{ order_line_id, quantity }] }
 * satirlar yoksa kalan miktarın tamamı alınır.
 */
router.post('/', async (req, res) => {
    try {
        const {
            purchase_order_id, warehouse_id, satirlar, company_id,
            vendor_delivery_note_no, delivery_date, vendor_invoice_no,
            receipt_date, description, internal_note, gkk_gerekli, received_by,
            status: kabulDurum, vendor_delivery_note_id,
        } = req.body;
        if (!purchase_order_id || !warehouse_id) {
            return res.status(400).json({ hata: 'purchase_order_id ve warehouse_id zorunlu.' });
        }
        // vendor_invoice_no zorunlu değil — yalnızca irsaliye/sipariş ile kabul yapılabilir

        const id = await withTransaction(pool, async (client) => {
            const siparis = await client.query(
                'SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE',
                [purchase_order_id]
            );
            if (!siparis.rows[0]) throw new Error('Sipariş bulunamadı.');
            if (['Iptal', 'Kapali'].includes(siparis.rows[0].status)) {
                throw new Error(`Sipariş kapalı/iptal: ${siparis.rows[0].status}`);
            }

            const depo = await client.query('SELECT * FROM warehouses WHERE id = $1', [warehouse_id]);
            if (!depo.rows[0]) throw new Error('Depo bulunamadı.');

            const siparisSatirlari = await client.query(
                'SELECT * FROM purchase_order_lines WHERE purchase_order_id = $1 FOR UPDATE',
                [purchase_order_id]
            );

            let kabulSatirlari = satirlar;
            if (!Array.isArray(kabulSatirlari) || kabulSatirlari.length === 0) {
                if (vendor_delivery_note_id) {
                    const irsSat = await client.query(
                        `SELECT * FROM vendor_delivery_note_lines WHERE delivery_note_id=$1 ORDER BY id`,
                        [vendor_delivery_note_id]
                    );
                    kabulSatirlari = irsSat.rows
                        .map((s) => ({
                            order_line_id: s.order_line_id,
                            item_id: s.item_id,
                            quantity: Number(s.quantity) - Number(s.accepted_flag || 0),
                            uom_code: s.uom_code,
                            unit_price: s.unit_price,
                            _irsaliye_satir_id: s.id,
                        }))
                        .filter((s) => s.quantity > 0 && s.order_line_id);
                } else {
                    kabulSatirlari = siparisSatirlari.rows
                        .map((s) => ({
                            order_line_id: s.id,
                            quantity: Number(s.quantity) - Number(s.giren_quantity),
                        }))
                        .filter((s) => s.quantity > 0);
                }
            } else {
                // UI serbest satır: item_id → order_line_id eşle
                kabulSatirlari = kabulSatirlari.map((ks) => {
                    if (ks.order_line_id) return ks;
                    const hit = siparisSatirlari.rows.find(
                        (s) => Number(s.item_id) === Number(ks.item_id)
                            && Number(s.quantity) - Number(s.giren_quantity) > 0
                    );
                    return hit ? { ...ks, order_line_id: hit.id } : ks;
                }).filter((ks) => ks.order_line_id && Number(ks.quantity) > 0);
            }
            if (kabulSatirlari.length === 0) throw new Error('Kabul edilecek kalan quantity yok.');

            if (vendor_delivery_note_id) {
                const ir = await client.query(
                    `SELECT * FROM vendor_delivery_notes WHERE id=$1 FOR UPDATE`,
                    [vendor_delivery_note_id]
                );
                if (!ir.rows[0]) throw new Error('Tedarikçi irsaliyesi bulunamadı.');
                if (['Kapali', 'Iptal'].includes(ir.rows[0].status)) {
                    throw new Error(`İrsaliye kapalı/iptal: ${ir.rows[0].status}`);
                }
                if (Number(ir.rows[0].partner_id) !== Number(siparis.rows[0].partner_id)) {
                    throw new Error('İrsaliye tedarikçisi sipariş tedarikçisi ile uyuşmuyor.');
                }
            }

            const hareketSatirlari = [];
            const islenen = [];
            const kkSatirlari = [];
            const gkkDepo = await gkkDepoCozumle(client);
            const hammaddeDepo = await depoBulKodVeyaRol(client, {
                kodParam: 'HAMMADDE_DEPO_KODU',
                role: 'Hammadde',
            });
            const depoZorunlu = String(await parametreAl(client, 'STOK_DEPO_ZORUNLU', 'Evet')).toLowerCase() === 'evet';

            for (const ks of kabulSatirlari) {
                const satir = siparisSatirlari.rows.find((x) => x.id === Number(ks.order_line_id));
                if (!satir) throw new Error(`Sipariş satırı yok: ${ks.order_line_id}`);
                const kalan = Number(satir.quantity) - Number(satir.giren_quantity);
                const quantity = Number(ks.quantity);
                if (quantity <= 0) throw new Error('Kabul miktarı > 0 olmalı.');
                if (quantity - kalan > 1e-9) {
                    throw new Error(`Fazla kabul engellendi. Satır=${satir.id}, kalan=${kalan}, istenen=${quantity}`);
                }

                const stok = await client.query(
                    `SELECT id, uom_code, kalite_control_gerekli, varsayilan_giris_warehouse_id, lot_politika
                     FROM items WHERE id=$1`,
                    [satir.item_id]
                );
                if (!stok.rows[0]) throw new Error(`Stok yok: ${satir.item_id}`);
                const kkGerekli = Boolean(stok.rows[0].kalite_control_gerekli);
                let hedefDepoId = warehouse_id;
                if (kkGerekli) {
                    if (!gkkDepo) throw new Error('GKK deposu tanımlı değil (GKK_DEPO_KODU / warehouse_rolu=GKK).');
                    hedefDepoId = gkkDepo.id;
                } else if (stok.rows[0].varsayilan_giris_warehouse_id) {
                    hedefDepoId = stok.rows[0].varsayilan_giris_warehouse_id;
                }

                if (depoZorunlu) {
                    try {
                        await assertStokDepoIzin(client, satir.item_id, hedefDepoId);
                    } catch (e) {
                        // Mal kabulde tanımsızsa item_warehouses otomatik oluştur (ilk kabul)
                        await client.query(
                            `
                            INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active, varsayilan_giris)
                            VALUES ($1,$2,$3,TRUE,$4)
                            ON CONFLICT (item_id, warehouse_id) DO UPDATE SET is_active=TRUE
                            `,
                            [satir.item_id, hedefDepoId, siparis.rows[0].plant_id || null, !kkGerekli]
                        );
                    }
                }

                await client.query(
                    `UPDATE purchase_order_lines
                     SET giren_quantity = giren_quantity + $1 WHERE id = $2`,
                    [quantity, satir.id]
                );

                hareketSatirlari.push({
                    item_id: satir.item_id,
                    quantity,
                    direction: 1,
                    uom_code: satir.uom_code || stok.rows[0].uom_code,
                    stock_status: kkGerekli ? 'Kalitede' : 'Kullanilabilir',
                    warehouse_id: hedefDepoId,
                    kk: kkGerekli,
                });
                islenen.push({
                    order_line_id: satir.id,
                    item_id: satir.item_id,
                    quantity,
                    warehouse_id: hedefDepoId,
                    kk: kkGerekli,
                });
            }

            // Depo bazında grupla (GKK vs normal)
            const depoGrup = new Map();
            for (const s of hareketSatirlari) {
                const key = `${s.warehouse_id}|${s.stock_status}`;
                if (!depoGrup.has(key)) depoGrup.set(key, { depoId: s.warehouse_id, satirlar: [] });
                depoGrup.get(key).satirlar.push(s);
            }

            const { hareketKoduBul, BELGE_TIPI } = require('../src/utils/belgeOmurga');
            const hk = await hareketKoduBul(client, BELGE_TIPI.MAL_KABUL);
            let anaHareketId = null;

            for (const grup of depoGrup.values()) {
                const hareket = await stokHareketOlustur(client, {
                    hareketTipi: 'SATINALMA_GIRIS',
                    isYeriId: siparis.rows[0].plant_id,
                    depoId: grup.depoId,
                    belgeTipi: 'MAL_KABUL',
                    description: `SAS ${siparis.rows[0].order_no} mal kabul`,
                    hareketKoduId: hk?.id || null,
                    satirlar: grup.satirlar,
                });
                if (!anaHareketId) anaHareketId = hareket.hareket.id;

                for (const sat of hareket.satirlar) {
                    const source = hareketSatirlari.find(
                        (x) => x.item_id === sat.item_id && x.kk && x.warehouse_id === grup.depoId
                    );
                    if (source?.kk) {
                        kkSatirlari.push({
                            item_id: sat.item_id,
                            lot_id: sat.lot_id,
                            quantity: sat.quantity,
                            warehouse_id: grup.depoId,
                            movement_id: hareket.hareket.id,
                        });
                    }
                }
            }

            const kabulNo = await sonrakiBelgeNo(client, 'MAL_KABUL');
            const firmaId = company_id || siparis.rows[0].company_id || firmaIdFromReq(req) || null;
            const kabul = await client.query(
                `INSERT INTO goods_receipts (
                    receipt_no, purchase_order_id, warehouse_id, stock_movement_id, company_id, plant_id,
                    vendor_delivery_note_no, delivery_date, vendor_invoice_no,
                    receipt_date, description, internal_note, gkk_gerekli, received_by, status,
                    vendor_delivery_note_id
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,CURRENT_DATE),$11,$12,$13,$14,COALESCE($15,'Onayli'),$16)
                 RETURNING id`,
                [
                    kabulNo, purchase_order_id, warehouse_id, anaHareketId, firmaId, siparis.rows[0].plant_id || null,
                    vendor_delivery_note_no || null, delivery_date || null, vendor_invoice_no || null,
                    receipt_date || null, description || null, internal_note || null,
                    gkk_gerekli === true || gkk_gerekli === 'true' || gkk_gerekli === 'Evet',
                    received_by || null, kabulDurum || 'Onayli',
                    vendor_delivery_note_id || null,
                ]
            );
            const kabulId = kabul.rows[0].id;

            for (const s of islenen) {
                const uiSat = Array.isArray(kabulSatirlari)
                    ? kabulSatirlari.find((x) => Number(x.order_line_id) === Number(s.order_line_id)
                        || Number(x.item_id) === Number(s.item_id))
                    : null;
                await client.query(
                    `INSERT INTO goods_receipt_lines (
                        receipt_id, order_line_id, item_id, quantity,
                        accepted_flag, reddedilen, uom_code, unit_price, lot_no, serial_no,
                        stock_status, raf_code, son_kullanma_date, line_description
                     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
                    [
                        kabulId, s.order_line_id, s.item_id, s.quantity,
                        uiSat?.accepted_flag ?? s.quantity, uiSat?.reddedilen ?? 0,
                        uiSat?.uom_code || null, uiSat?.unit_price ?? null,
                        uiSat?.lot_no || null, uiSat?.serial_no || null,
                        uiSat?.stock_status || (s.kk ? 'Kalitede' : 'Kullanilabilir'),
                        uiSat?.raf_code || null, uiSat?.son_kullanma_date || null,
                        uiSat?.line_description || null,
                    ]
                );
                if (vendor_delivery_note_id) {
                    const irsSatId = uiSat?._irsaliye_satir_id;
                    if (irsSatId) {
                        await client.query(
                            `UPDATE vendor_delivery_note_lines
                             SET accepted_flag = COALESCE(accepted_flag,0) + $1 WHERE id=$2`,
                            [s.quantity, irsSatId]
                        );
                    } else {
                        await client.query(
                            `UPDATE vendor_delivery_note_lines
                             SET accepted_flag = COALESCE(accepted_flag,0) + $1
                             WHERE delivery_note_id=$2 AND (
                               order_line_id=$3 OR (order_line_id IS NULL AND item_id=$4)
                             )`,
                            [s.quantity, vendor_delivery_note_id, s.order_line_id, s.item_id]
                        );
                    }
                }
            }

            if (vendor_delivery_note_id) {
                const kalan = await client.query(
                    `SELECT COUNT(*)::int AS n FROM vendor_delivery_note_lines
                     WHERE delivery_note_id=$1 AND COALESCE(accepted_flag,0) + 1e-9 < quantity`,
                    [vendor_delivery_note_id]
                );
                const yeniDurum = kalan.rows[0].n === 0 ? 'Kapali' : 'Kismi';
                await client.query(
                    `UPDATE vendor_delivery_notes SET status=$2 WHERE id=$1`,
                    [vendor_delivery_note_id, yeniDurum]
                );
            }

            for (const kk of kkSatirlari) {
                await kkEmriOlustur(client, {
                    direction: 'GKK',
                    stokId: kk.item_id,
                    partiId: kk.lot_id,
                    depoId: kk.warehouse_id,
                    hedefDepoId: hammaddeDepo?.id || null,
                    quantity: kk.quantity,
                    kaynakTipi: 'MAL_KABUL',
                    kaynakId: kabulId,
                    stokHareketId: kk.movement_id,
                    description: `Mal kabul ${kabulNo}`,
                });
            }

            // Sipariş durumu
            const guncel = await client.query(
                'SELECT quantity, giren_quantity FROM purchase_order_lines WHERE purchase_order_id = $1',
                [purchase_order_id]
            );
            const hepsi = guncel.rows.every((r) => Number(r.giren_quantity) + 1e-9 >= Number(r.quantity));
            const hic = guncel.rows.every((r) => Number(r.giren_quantity) === 0);
            const status = hepsi ? 'Kapali' : hic ? 'Onayli' : 'KismiTeslim';
            await client.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', [status, purchase_order_id]);

            if (anaHareketId) {
                await client.query(
                    'UPDATE stock_movements SET document_id = $1 WHERE id = $2',
                    [kabulId, anaHareketId]
                );
            }

            return kabulId;
        });

        res.status(201).json(await kabulGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const row = await kabulGetir(req.params.id);
        if (!row) return res.status(404).json({ hata: 'Mal kabul bulunamadı.' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM goods_receipts WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Mal kabul bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Mal kabul → Alış faturası (REQ-PUR-006 / REQ-FIN-001 / P13)
 * POST /mal-kabuller/:id/fatura-olustur
 */
router.post('/:id/fatura-olustur', async (req, res, next) => {
    try {
        const kabulId = Number(req.params.id);
        const faturaId = await withTransaction(pool, async (client) => {
            const kLock = await client.query(
                `SELECT * FROM goods_receipts WHERE id = $1 FOR UPDATE`,
                [kabulId]
            );
            if (!kLock.rows[0]) throw Object.assign(new Error('Mal kabul bulunamadı.'), { status: 404 });
            const k = await client.query(
                `SELECT mk.*, sas.partner_id, sas.id AS purchase_order_id, sas.order_no
                 FROM goods_receipts mk
                 JOIN purchase_orders sas ON sas.id = mk.purchase_order_id
                 WHERE mk.id = $1`,
                [kabulId]
            );
            const mevcut = await client.query(
                `SELECT id FROM invoices WHERE goods_receipt_id = $1 LIMIT 1`,
                [kabulId]
            );
            if (mevcut.rows[0]) {
                throw Object.assign(new Error(`Bu mal kabul zaten faturalandı (fatura id=${mevcut.rows[0].id}).`), { status: 409 });
            }
            const satirlar = await client.query(
                `SELECT mks.*, COALESCE(ss.unit_price, 0) AS unit_price, ss.uom_code
                 FROM goods_receipt_lines mks
                 LEFT JOIN purchase_order_lines ss ON ss.id = mks.order_line_id
                 WHERE mks.receipt_id = $1 ORDER BY mks.id`,
                [kabulId]
            );
            if (!satirlar.rows.length) throw Object.assign(new Error('Mal kabul satırı yok.'), { status: 400 });

            const no = await sonrakiBelgeNo(client, 'ALIS_FATURA');
            let toplam = 0;
            let toplamKdv = 0;
            const kdvOran = Number(req.body.vat_rate ?? 20);
            for (const s of satirlar.rows) {
                const satir = Number(s.quantity) * Number(s.unit_price || 0);
                toplam += satir;
                toplamKdv += satir * (kdvOran / 100);
            }
            const f = await client.query(
                `INSERT INTO invoices (
                    invoice_no, partner_id, invoice_type, total_amount,
                    net_amount, tax_amount, payable_amount,
                    goods_receipt_id, purchase_order_id, source_document_type, source_document_id,
                    status, payment_term_code, currency_code, exchange_rate
                 ) VALUES ($1,$2,'Alis',$3,$3,$4,$5,$6,$7,'MAL_KABUL',$6,'Taslak',$8,'TRY',1)
                 RETURNING id`,
                [
                    no, k.rows[0].partner_id, toplam, toplamKdv, toplam + toplamKdv,
                    kabulId, k.rows[0].purchase_order_id, req.body.payment_term_code || null,
                ]
            );
            const id = f.rows[0].id;
            for (const s of satirlar.rows) {
                const satir = Number(s.quantity) * Number(s.unit_price || 0);
                await client.query(
                    `INSERT INTO invoice_lines
                      (invoice_id, item_id, quantity, unit_price, total_amount, uom_code, vat_rate, vat_amount, goods_service_amount)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [
                        id, s.item_id, s.quantity, s.unit_price || 0, satir,
                        s.uom_code || null, kdvOran, satir * (kdvOran / 100), satir,
                    ]
                );
            }
            return id;
        });
        const fatura = await pool.query(
            `SELECT f.*, c.partner_code, c.partner_name FROM invoices f
             JOIN partners c ON c.id = f.partner_id WHERE f.id = $1`,
            [faturaId]
        );
        const kalemler = await pool.query(
            `SELECT fd.*, s.item_code, s.item_name FROM invoice_lines fd
             JOIN items s ON s.id = fd.item_id WHERE fd.invoice_id = $1 ORDER BY fd.id`,
            [faturaId]
        );
        res.status(201).json({ ...fatura.rows[0], kalemler: kalemler.rows, satirlar: kalemler.rows });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /mal-kabuller/:id/iade — alış iade (stok çıkışı)
 */
router.post('/:id/iade', async (req, res, next) => {
    try {
        const { stokHareketOlustur } = require('../src/services/stokHareketService');
        const kabulId = Number(req.params.id);
        const result = await withTransaction(pool, async (client) => {
            const k = await client.query(`SELECT * FROM goods_receipts WHERE id=$1`, [kabulId]);
            if (!k.rows[0]) throw Object.assign(new Error('Mal kabul bulunamadı.'), { status: 404 });
            const satirlar = await client.query(
                `SELECT * FROM goods_receipt_lines WHERE receipt_id=$1`,
                [kabulId]
            );
            if (!satirlar.rows.length) throw Object.assign(new Error('Satır yok.'), { status: 400 });
            const depoId = Number(req.body.warehouse_id || k.rows[0].warehouse_id);
            const hareket = await stokHareketOlustur(client, {
                hareketTipi: 'IADE_CIKIS',
                depoId,
                belgeTipi: 'ALIS_IADE',
                belgeId: kabulId,
                description: `Alış iade ← MK ${k.rows[0].receipt_no}`,
                depoZorunluAtla: true,
                satirlar: satirlar.rows.map((s) => ({
                    item_id: s.item_id,
                    quantity: req.body.miktarlar?.[s.id] != null
                        ? Number(req.body.miktarlar[s.id])
                        : Number(s.quantity),
                    direction: -1,
                })).filter((s) => s.quantity > 0),
            });
            return { goods_receipt_id: kabulId, stock_movement_id: hareket.hareket.id, movement_no: hareket.hareket.movement_no };
        });
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
