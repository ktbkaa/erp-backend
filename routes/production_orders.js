const express = require('express');
const router = express.Router();
const pool = require('../db');
const { firmaIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { sonrakiBelgeNo } = require('../src/utils/belgeNo');
const { stokHareketOlustur } = require('../src/services/stokHareketService');
const { kkEmriOlustur, ckkDepoCozumle, depoBulKodVeyaRol } = require('../src/services/kaliteService');

async function tipCozumle(client, emirTipiId, siparisId) {
    if (emirTipiId) {
        const t = await client.query(
            'SELECT id, type_code, planli_kesin FROM production_order_types WHERE id=$1 AND is_active=TRUE',
            [emirTipiId]
        );
        if (!t.rows[0]) throw new Error('Üretim emri tipi bulunamadı veya is_inactive.');
        return t.rows[0];
    }
    const kod = siparisId ? 'SIP' : 'STD';
    const t = await client.query(
        'SELECT id, type_code, planli_kesin FROM production_order_types WHERE type_code=$1 AND is_active=TRUE',
        [kod]
    );
    return t.rows[0] || null;
}

function tarihGun(v) {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
}

/** BOM / rota geçerlilik + quantity aralığı kontrolü (Uyumsoft uyarlaması) */
async function bomRotaDogrula(client, { urunAgaciId, rotaId, stokId, quantity, tarih }) {
    const gun = tarihGun(tarih) || new Date().toISOString().slice(0, 10);
    const agac = await client.query(
        'SELECT * FROM boms WHERE id=$1 AND finished_good_item_id=$2',
        [urunAgaciId, stokId]
    );
    if (!agac.rows[0]) throw new Error('Ürün ağacı mamul stok ile eşleşmiyor.');
    const a = agac.rows[0];
    const aBas = tarihGun(a.valid_from);
    const aBit = tarihGun(a.valid_to);
    if (aBas && gun < aBas) {
        throw new Error(`Ürün ağacı henüz geçerli değil (başlangıç: ${aBas}).`);
    }
    if (aBit && gun > aBit) {
        throw new Error(`Ürün ağacı geçerlilik süresi dolmuş (bitiş: ${aBit}).`);
    }
    const mq = Number(quantity);
    if (a.min_quantity != null && mq < Number(a.min_quantity)) {
        throw new Error(`Planlanan quantity ağaç min (${a.min_quantity}) altında.`);
    }
    if (a.max_quantity != null && mq > Number(a.max_quantity)) {
        throw new Error(`Planlanan quantity ağaç max (${a.max_quantity}) üstünde.`);
    }

    const rota = await client.query('SELECT * FROM routings WHERE id=$1', [rotaId]);
    if (!rota.rows[0]) throw new Error('Rota bulunamadı.');
    const r = rota.rows[0];
    if (Number(r.item_id) !== Number(stokId) && !r.template) {
        throw new Error('Rota stok ile eşleşmiyor (şablon değil).');
    }
    const rBas = tarihGun(r.valid_from);
    const rBit = tarihGun(r.valid_to);
    if (rBas && gun < rBas) {
        throw new Error(`Rota henüz geçerli değil (başlangıç: ${rBas}).`);
    }
    if (rBit && gun > rBit) {
        throw new Error(`Rota geçerlilik süresi dolmuş (bitiş: ${rBit}).`);
    }

    const rotaOps = await client.query(
        'SELECT * FROM routing_operations WHERE route_id=$1 ORDER BY line_no',
        [rotaId]
    );
    if (rotaOps.rows.length === 0) throw new Error('Rotada operasyon yok.');
    return { agac: a, rota: r, rotaOps: rotaOps.rows };
}

/** BOM satırlarından emir malzemelerini yazar (önce mevcut malzemeleri siler). */
async function emirMalzemeleriDoldur(client, emirId, { urunAgaciId, planlananMiktar, agacMiktar, hammaddeDepoId }) {
    await client.query('DELETE FROM production_order_components WHERE order_id=$1', [emirId]);
    const carpan = Number(planlananMiktar) / Number(agacMiktar || 1);
    const satirlar = await client.query(
        `
        SELECT s.*, st.uom_code AS stok_birim
        FROM bom_lines s
        JOIN items st ON st.id = s.component_item_id
        WHERE s.product_bom_id = $1
        ORDER BY COALESCE(s.line_no, 0), s.id
        `,
        [urunAgaciId],
    );
    let sira = 1;
    for (const sat of satirlar.rows) {
        await client.query(
            `
            INSERT INTO production_order_components
                (order_id, item_id, planlanan_quantity, tuketilen_quantity, uom_code, line_no, warehouse_id)
            VALUES ($1,$2,$3,0,$4,$5,$6)
            `,
            [
                emirId,
                sat.component_item_id,
                Number(sat.quantity) * carpan,
                sat.uom_code || sat.stok_birim || null,
                sat.line_no != null ? sat.line_no : sira,
                hammaddeDepoId || null,
            ],
        );
        sira += 1;
    }
    return satirlar.rows.length;
}

/** Rota operasyonlarını emre yazar (önce mevcut operasyonları siler). */
async function emirOperasyonlariDoldur(client, emirId, { rotaOps, planlananMiktar, bilesenCarpan }) {
    await client.query('DELETE FROM production_order_operations WHERE order_id=$1', [emirId]);
    const plan = Number(planlananMiktar);
    const carpan = Number(bilesenCarpan) > 0 ? Number(bilesenCarpan) : plan;
    let ilk = true;
    let n = 0;
    for (const op of rotaOps) {
        const opIns = await client.query(
            `
            INSERT INTO production_order_operations
                (order_id, line_no, operation_code, operation_name, work_center_id,
                 output_item_id, sonraki_line_no, planlanan_quantity, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING id
            `,
            [
                emirId,
                op.line_no,
                op.operation_code,
                op.operation_name,
                op.work_center_id,
                op.output_item_id,
                op.sonraki_line_no,
                plan,
                ilk ? 'Hazir' : 'Bekliyor',
            ],
        );
        ilk = false;
        n += 1;
        const bilesenler = await client.query(
            'SELECT * FROM routing_operation_components WHERE operasyon_id=$1',
            [op.id],
        );
        for (const b of bilesenler.rows) {
            await client.query(
                `
                INSERT INTO production_order_operation_components
                    (operasyon_id, item_id, planlanan_quantity, uom_code)
                VALUES ($1,$2,$3,$4)
                `,
                [opIns.rows[0].id, b.item_id, Number(b.quantity) * carpan, b.uom_code],
            );
        }
    }
    return n;
}

async function emirDetayDoldurulabilirMi(client, emirId) {
    const emir = await client.query(
        `SELECT id, status, is_started, produced_quantity FROM production_orders WHERE id=$1 FOR UPDATE`,
        [emirId],
    );
    if (!emir.rows[0]) throw new Error('Üretim emri bulunamadı.');
    const e = emir.rows[0];
    if (['Kapali', 'Iptal'].includes(e.status)) {
        throw new Error('Kapalı/iptal emirde detay yenilenemez.');
    }
    if (e.is_started || Number(e.produced_quantity) > 0) {
        throw new Error('Başlatılmış veya üretimi olan emirde detaylar silinip yeniden doldurulamaz.');
    }
    const tuk = await client.query(
        `SELECT COALESCE(SUM(tuketilen_quantity),0)::numeric AS t FROM production_order_components WHERE order_id=$1`,
        [emirId],
    );
    if (Number(tuk.rows[0].t) > 0) {
        throw new Error('Tüketimi olan malzemeler varken detay yenilenemez.');
    }
    return e;
}

async function emirOlustur(client, opts) {
    const {
        item_id,
        product_bom_id,
        route_id,
        plant_id,
        company_id,
        component_warehouse_id,
        wip_warehouse_id,
        fg_warehouse_id,
        planlanan_quantity,
        sales_order_id,
        order_type_id,
        status,
        is_started,
        cikis_type,
        giris_type,
        silindi,
        source_document_type,
        source_document_id,
        order_date,
        plan_start,
        plan_end,
        end_date,
        uom_code,
        acik_kapali,
        onayli,
        yayinlandi,
        is_printed,
        product_girisi_tamamlandi,
        description,
        planli_kesin,
    } = opts;

    const type = await tipCozumle(client, order_type_id, sales_order_id);
    const { agac, rotaOps } = await bomRotaDogrula(client, {
        urunAgaciId: product_bom_id,
        rotaId: route_id,
        stokId: item_id,
        quantity: planlanan_quantity,
        tarih: order_date,
    });

    const stok = await client.query('SELECT uom_code FROM items WHERE id=$1', [item_id]);
    const no = await sonrakiBelgeNo(client, 'URETIM_EMRI');
    const durumVal = status || (sales_order_id ? 'OnayBekliyor' : 'Acik');
    const emir = await client.query(
        `
        INSERT INTO production_orders
            (order_no, item_id, product_bom_id, route_id, plant_id, company_id,
             component_warehouse_id, wip_warehouse_id, fg_warehouse_id,
             planlanan_quantity, status, sales_order_id, order_type_id, planli_kesin,
             is_started, cikis_type, giris_type, silindi,
             source_document_type, source_document_id,
             order_date, start_date, plan_start, plan_end, end_date,
             uom_code, acik_kapali, onayli, yayinlandi, is_printed, product_girisi_tamamlandi, description)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
        RETURNING id
        `,
        [
            no,
            item_id,
            product_bom_id,
            route_id,
            plant_id || null,
            company_id || null,
            component_warehouse_id,
            wip_warehouse_id || null,
            fg_warehouse_id,
            planlanan_quantity,
            durumVal,
            sales_order_id || null,
            type?.id || null,
            planli_kesin || type?.planli_kesin || 'Kesin',
            typeof is_started === 'boolean' ? is_started : false,
            cikis_type || 'Manuel',
            giris_type || 'Manuel',
            typeof silindi === 'boolean' ? silindi : false,
            source_document_type || null,
            source_document_id || null,
            tarihGun(order_date) || new Date().toISOString().slice(0, 10),
            tarihGun(order_date) || new Date().toISOString().slice(0, 10),
            plan_start || null,
            plan_end || null,
            tarihGun(end_date),
            uom_code || stok.rows[0]?.uom_code || null,
            acik_kapali || (durumVal === 'Kapali' || durumVal === 'Iptal' ? 'Kapali' : 'Acik'),
            !!onayli,
            !!yayinlandi,
            !!is_printed,
            !!product_girisi_tamamlandi,
            description || null,
        ],
    );
    const emirId = emir.rows[0].id;
    const carpan = Number(planlanan_quantity) / Number(agac.quantity || 1);
    await emirOperasyonlariDoldur(client, emirId, {
        rotaOps,
        planlananMiktar: planlanan_quantity,
        bilesenCarpan: carpan,
    });
    await emirMalzemeleriDoldur(client, emirId, {
        urunAgaciId: product_bom_id,
        planlananMiktar: planlanan_quantity,
        agacMiktar: agac.quantity,
        hammaddeDepoId: component_warehouse_id,
    });
    return emirId;
}

async function emirGetir(id) {
    const e = await pool.query(
        `
        SELECT ue.*, s.item_code, s.item_name, s.item_type,
               hd.warehouse_code AS hammadde_depo_kodu,
               md.warehouse_code AS mamul_depo_kodu,
               yd.warehouse_code AS yari_mamul_depo_kodu,
               ua.bom_code, r.route_code,
               type.type_code AS emir_tipi_kodu,
               type.type_name AS emir_tipi_adi,
               sp.order_no AS sales_order_no
        FROM production_orders ue
        JOIN items s ON s.id = ue.item_id
        LEFT JOIN warehouses hd ON hd.id = ue.component_warehouse_id
        LEFT JOIN warehouses md ON md.id = ue.fg_warehouse_id
        LEFT JOIN warehouses yd ON yd.id = ue.wip_warehouse_id
        LEFT JOIN boms ua ON ua.id = ue.product_bom_id
        LEFT JOIN routings r ON r.id = ue.route_id
        LEFT JOIN production_order_types type ON type.id = ue.order_type_id
        LEFT JOIN sales_orders sp ON sp.id = ue.sales_order_id
        WHERE ue.id = $1
        `,
        [id]
    );
    if (!e.rows[0]) return null;

    const ops = await pool.query(
        `
        SELECT o.*,
               m.center_code, m.center_name,
               cs.item_code AS cikti_stok_kodu,
               cs.item_name AS cikti_stok_adi
        FROM production_order_operations o
        LEFT JOIN work_centers m ON m.id = o.work_center_id
        LEFT JOIN items cs ON cs.id = o.output_item_id
        WHERE o.order_id = $1
        ORDER BY o.line_no
        `,
        [id]
    );

    const operasyonlar = [];
    for (const op of ops.rows) {
        const bilesenler = await pool.query(
            `
            SELECT b.*, st.item_code, st.item_name, st.item_type
            FROM production_order_operation_components b
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
                      status: sonraki.status,
                  }
                : null,
        });
    }

    const is_active = operasyonlar.find((o) => o.status === 'Hazir') || null;
    const minSira = operasyonlar.length ? Math.min(...operasyonlar.map((o) => Number(o.line_no) || 0)) : null;
    const maxSira = operasyonlar.length ? Math.max(...operasyonlar.map((o) => Number(o.line_no) || 0)) : null;
    const opsEnrich = operasyonlar.map((o) => ({
        ...o,
        ilk_operasyon: minSira != null && Number(o.line_no) === minSira,
        son_operasyon: maxSira != null && Number(o.line_no) === maxSira,
        is_merkezi_kodu: o.center_code || null,
        is_merkezi_adi: o.center_name || null,
    }));

    const malz = await pool.query(
        `
        SELECT b.*, st.item_code, st.item_name, st.item_type,
               d.warehouse_code, d.warehouse_name
        FROM production_order_components b
        JOIN items st ON st.id = b.item_id
        LEFT JOIN warehouses d ON d.id = b.warehouse_id
        WHERE b.order_id = $1
        ORDER BY COALESCE(b.line_no, 0), b.id
        `,
        [id],
    );

    return {
        ...e.rows[0],
        operasyonlar: opsEnrich,
        malzemeler: malz.rows,
        bilesenler: malz.rows,
        aktif_operasyon: is_active,
    };
}

router.get('/', async (req, res) => {
    try {
        const liste = await (() => { const firmaId = firmaIdFromReq(req); const params = []; let sql = 'SELECT id FROM production_orders'; if (firmaId) { params.push(firmaId); sql += ' WHERE company_id = $' + params.length; } sql += ' ORDER BY id DESC'; return pool.query(sql, params); })();
        const result = [];
        for (const r of liste.rows) result.push(await emirGetir(r.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * Açık satış siparişi kalemleri — iş emrine aday (Uyumsoft sipariş→iş emri uyarlaması)
 * id = siparis_detay.id
 */
router.get('/siparis-adaylari', async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                sd.id,
                sd.id AS sales_order_line_id,
                s.id AS sales_order_id,
                s.order_no,
                s.status AS siparis_durum,
                s.order_date,
                c.partner_code, c.partner_name,
                sd.item_id,
                st.item_code, st.item_name, st.item_type,
                sd.quantity AS siparis_miktar,
                COALESCE(ue_sum.uretim_plan, 0) AS uretim_planlanan,
                GREATEST(sd.quantity - COALESCE(ue_sum.uretim_plan, 0), 0) AS remaining_quantity,
                ua.id AS onerilen_agac_id,
                ua.bom_code AS onerilen_agac_kodu,
                r.id AS onerilen_rota_id,
                r.route_code AS onerilen_rota_kodu
            FROM sales_order_lines sd
            JOIN sales_orders s ON s.id = sd.sales_order_id
            JOIN items st ON st.id = sd.item_id
            LEFT JOIN partners c ON c.id = s.partner_id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(ue.planlanan_quantity),0) AS uretim_plan
                FROM production_orders ue
                WHERE ue.sales_order_id = s.id AND ue.item_id = sd.item_id
                  AND ue.status NOT IN ('Iptal')
            ) ue_sum ON TRUE
            LEFT JOIN LATERAL (
                SELECT ua2.id, ua2.bom_code
                FROM boms ua2
                WHERE ua2.finished_good_item_id = sd.item_id
                  AND (ua2.valid_from IS NULL OR ua2.valid_from <= CURRENT_DATE)
                  AND (ua2.valid_to IS NULL OR ua2.valid_to >= CURRENT_DATE)
                ORDER BY ua2.id DESC LIMIT 1
            ) ua ON TRUE
            LEFT JOIN LATERAL (
                SELECT r2.id, r2.route_code
                FROM routings r2
                WHERE r2.item_id = sd.item_id
                  AND (r2.valid_from IS NULL OR r2.valid_from <= CURRENT_DATE)
                  AND (r2.valid_to IS NULL OR r2.valid_to >= CURRENT_DATE)
                ORDER BY r2.varsayilan DESC NULLS LAST, r2.id DESC LIMIT 1
            ) r ON TRUE
            WHERE s.order_type IN ('SatisSiparis', 'AlinanSiparis')
              AND s.status IN ('Onayli', 'Acik', 'KismiSevk', 'SevkEdildi')
              AND st.item_type IN ('Mamul', 'YariMamul')
              AND sd.quantity > COALESCE(ue_sum.uretim_plan, 0)
            ORDER BY s.order_date DESC NULLS LAST, s.id DESC, sd.id
            `
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/siparis-adaylari/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                sd.id,
                sd.id AS sales_order_line_id,
                s.id AS sales_order_id,
                s.order_no,
                s.status AS siparis_durum,
                sd.item_id,
                st.item_code, st.item_name,
                sd.quantity AS siparis_miktar,
                GREATEST(sd.quantity - COALESCE((
                    SELECT SUM(ue.planlanan_quantity) FROM production_orders ue
                    WHERE ue.sales_order_id=s.id AND ue.item_id=sd.item_id AND ue.status<>'Iptal'
                ),0),0) AS remaining_quantity
            FROM sales_order_lines sd
            JOIN sales_orders s ON s.id = sd.sales_order_id
            JOIN items st ON st.id = sd.item_id
            WHERE sd.id = $1
            `,
            [req.params.id]
        );
        if (!result.rows[0]) return res.status(404).json({ hata: 'Sipariş kalemi bulunamadı.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const emir = await emirGetir(req.params.id);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json(emir);
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/**
 * PRDT13 — satış siparişinden iş emri
 */
router.post('/satis-siparisinden', async (req, res) => {
    try {
        const {
            sales_order_id,
            item_id,
            product_bom_id,
            route_id,
            plant_id,
            component_warehouse_id,
            wip_warehouse_id,
            fg_warehouse_id,
            planlanan_quantity,
            order_type_id,
        } = req.body;
        if (!sales_order_id || !item_id || !product_bom_id || !route_id || !component_warehouse_id || !fg_warehouse_id) {
            return res.status(400).json({
                hata: 'sales_order_id, item_id, product_bom_id, route_id, component_warehouse_id, fg_warehouse_id zorunlu.',
            });
        }

        const siparis = await pool.query(
            `SELECT s.*,
                    (SELECT COALESCE(SUM(sd.quantity),0) FROM sales_order_lines sd
                     WHERE sd.sales_order_id=s.id AND sd.item_id=$2) AS kalem_miktar
             FROM sales_orders s WHERE s.id=$1`,
            [sales_order_id, item_id]
        );
        if (!siparis.rows[0]) return res.status(404).json({ hata: 'Satış siparişi bulunamadı.' });
        const quantity = planlanan_quantity || Number(siparis.rows[0].kalem_miktar);
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ hata: 'Sipariş kaleminde quantity yok; planlanan_quantity verin.' });
        }

        const id = await withTransaction(pool, async (client) =>
            emirOlustur(client, {
                item_id,
                product_bom_id,
                route_id,
                plant_id,
                component_warehouse_id,
                wip_warehouse_id,
                fg_warehouse_id,
                planlanan_quantity: quantity,
                sales_order_id,
                order_type_id,
                status: 'OnayBekliyor',
            })
        );

        res.status(201).json(await emirGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Toplu iş emri — birden fazla sipariş kaleminden
 * Body: { ortak?: { warehouses, type }, kalemler: [{ sales_order_id, item_id, ... }] }
 */
router.post('/toplu', async (req, res) => {
    try {
        const ortak = req.body.ortak || {};
        const kalemler = req.body.kalemler || req.body.satirlar || [];
        if (!Array.isArray(kalemler) || kalemler.length === 0) {
            return res.status(400).json({ hata: 'kalemler zorunlu (en az 1).' });
        }

        const olusturulan = [];
        const hatalar = [];

        await withTransaction(pool, async (client) => {
            for (let i = 0; i < kalemler.length; i += 1) {
                const k = kalemler[i];
                const sales_order_id = k.sales_order_id || ortak.sales_order_id;
                const item_id = k.item_id;
                const product_bom_id = k.product_bom_id || ortak.product_bom_id;
                const route_id = k.route_id || ortak.route_id;
                const component_warehouse_id = k.component_warehouse_id || ortak.component_warehouse_id;
                const fg_warehouse_id = k.fg_warehouse_id || ortak.fg_warehouse_id;
                const wip_warehouse_id = k.wip_warehouse_id || ortak.wip_warehouse_id;
                const plant_id = k.plant_id || ortak.plant_id;
                const order_type_id = k.order_type_id || ortak.order_type_id;
                let planlanan_quantity = k.planlanan_quantity;

                try {
                    if (!item_id || !product_bom_id || !route_id || !component_warehouse_id || !fg_warehouse_id) {
                        throw new Error('item_id, product_bom_id, route_id, warehouses zorunlu.');
                    }
                    if (!planlanan_quantity && sales_order_id) {
                        const mq = await client.query(
                            `SELECT COALESCE(SUM(quantity),0) AS m FROM sales_order_lines
                             WHERE sales_order_id=$1 AND item_id=$2`,
                            [sales_order_id, item_id]
                        );
                        planlanan_quantity = Number(mq.rows[0].m);
                    }
                    if (!planlanan_quantity || planlanan_quantity <= 0) {
                        throw new Error('planlanan_quantity yok.');
                    }
                    const id = await emirOlustur(client, {
                        item_id,
                        product_bom_id,
                        route_id,
                        plant_id,
                        component_warehouse_id,
                        wip_warehouse_id,
                        fg_warehouse_id,
                        planlanan_quantity,
                        sales_order_id: sales_order_id || null,
                        order_type_id,
                        status: sales_order_id ? 'OnayBekliyor' : 'Acik',
                    });
                    const noRow = await client.query('SELECT order_no FROM production_orders WHERE id=$1', [id]);
                    olusturulan.push({ index: i, id, order_no: noRow.rows[0]?.order_no });
                } catch (e) {
                    hatalar.push({ index: i, hata: e.message, item_id, sales_order_id });
                }
            }
            if (olusturulan.length === 0) {
                throw new Error(
                    hatalar.map((h) => `#${h.index + 1}: ${h.hata}`).join('; ') || 'Hiç emir oluşmadı.'
                );
            }
        });

        res.status(201).json({
            olusturulan_sayisi: olusturulan.length,
            hata_sayisi: hatalar.length,
            olusturulan,
            hatalar,
            emirler: await Promise.all(olusturulan.map((o) => emirGetir(o.id))),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Mamul için tek iş emri: rota operasyonları sırayla kopyalanır.
 */
router.post('/', async (req, res) => {
    try {
        const b = req.body || {};
        const {
            item_id,
            product_bom_id,
            route_id,
            component_warehouse_id,
            fg_warehouse_id,
            planlanan_quantity,
        } = b;

        if (!item_id || !product_bom_id || !route_id || !component_warehouse_id || !fg_warehouse_id || !planlanan_quantity) {
            return res.status(400).json({
                hata: 'item_id, product_bom_id, route_id, component_warehouse_id, fg_warehouse_id, planlanan_quantity zorunlu.',
            });
        }

        const id = await withTransaction(pool, async (client) => emirOlustur(client, b));

        res.status(201).json(await emirGetir(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

function tuketimDepoSec(emir, stokTipi) {
    // Hammadde Ana depodan; yarı mamul YM depodan
    if (stokTipi === 'YariMamul') {
        return emir.wip_warehouse_id || emir.component_warehouse_id;
    }
    return emir.component_warehouse_id;
}

function ciktiDepoSec(emir, ciktiStokTipi) {
    if (ciktiStokTipi === 'Mamul') return emir.fg_warehouse_id;
    if (ciktiStokTipi === 'YariMamul') return emir.wip_warehouse_id || emir.fg_warehouse_id;
    return emir.fg_warehouse_id;
}

/**
 * Sıradaki (Hazir) operasyonu tamamla.
 * Body: { quantity? } — yoksa operasyon planlanan miktarı
 */
router.post('/:id/operasyon-tamamla', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        const result = await withTransaction(pool, async (client) => {
            const emirRes = await client.query(
                'SELECT * FROM production_orders WHERE id=$1 FOR UPDATE',
                [emirId]
            );
            const emir = emirRes.rows[0];
            if (!emir) throw new Error('Üretim emri bulunamadı.');
            if (['Kapali', 'Iptal'].includes(emir.status)) {
                throw new Error(`Emir kapalı/iptal: ${emir.status}`);
            }

            const opRes = await client.query(
                `
                SELECT * FROM production_order_operations
                WHERE order_id=$1 AND status='Hazir'
                ORDER BY line_no LIMIT 1 FOR UPDATE
                `,
                [emirId]
            );
            const op = opRes.rows[0];
            if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

            const quantity = Number(req.body.quantity || op.planlanan_quantity);
            if (quantity <= 0) throw new Error('quantity > 0 olmalı.');
            const kalan = Number(op.planlanan_quantity) - Number(op.produced_quantity);
            if (quantity - kalan > 1e-9) throw new Error(`Fazla üretim engellendi. Kalan=${kalan}`);

            const rate = quantity / Number(op.planlanan_quantity);
            const bilesenler = await client.query(
                `
                SELECT b.*, st.item_type, st.uom_code AS stock_uom
                FROM production_order_operation_components b
                JOIN items st ON st.id = b.item_id
                WHERE b.operasyon_id=$1 FOR UPDATE
                `,
                [op.id]
            );

            // Bileşenleri tipine göre depodan grupla ve tüket
            const depoGrup = new Map();
            for (const b of bilesenler.rows) {
                const depoId = tuketimDepoSec(emir, b.item_type);
                if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
                depoGrup.get(depoId).push({
                    item_id: b.item_id,
                    quantity: Number(b.planlanan_quantity) * rate,
                    direction: -1,
                    uom_code: b.uom_code || b.stock_uom,
                });
                await client.query(
                    `UPDATE production_order_operation_components
                     SET tuketilen_quantity = tuketilen_quantity + $1 WHERE id=$2`,
                    [Number(b.planlanan_quantity) * rate, b.id]
                );
            }

            let tuketimHareketId = null;
            for (const [depoId, satirlar] of depoGrup.entries()) {
                const h = await stokHareketOlustur(client, {
                    hareketTipi: 'URETIM_TUKETIM',
                    isYeriId: emir.plant_id,
                    depoId,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    description: `${emir.order_no} / ${op.operation_code} tüketim`,
                    satirlar,
                });
                tuketimHareketId = h.hareket.id;
            }

            // Çıktı stoğu ilgili depoya (KK gerekliyse ÇKK + Kalitede)
            let mamulHareketId = null;
            if (op.output_item_id) {
                const cikti = await client.query(
                    'SELECT id, uom_code, item_type, kalite_control_gerekli FROM items WHERE id=$1',
                    [op.output_item_id]
                );
                const kkGerekli = Boolean(cikti.rows[0].kalite_control_gerekli);
                let ciktiDepo = ciktiDepoSec(emir, cikti.rows[0].item_type);
                let hedefMamul = null;
                if (kkGerekli) {
                    const ckk = await ckkDepoCozumle(client);
                    if (!ckk) throw new Error('ÇKK deposu tanımlı değil (CKK_DEPO_KODU / warehouse_rolu=CKK).');
                    ciktiDepo = ckk.id;
                    const mam = await depoBulKodVeyaRol(client, { kodParam: 'MAMUL_DEPO_KODU', role: 'Mamul' });
                    hedefMamul = mam?.id || null;
                }
                const h = await stokHareketOlustur(client, {
                    hareketTipi: 'URETIM_GIRIS',
                    isYeriId: emir.plant_id,
                    depoId: ciktiDepo,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    description: `${emir.order_no} / ${op.operation_code} çıktı`,
                    satirlar: [{
                        item_id: op.output_item_id,
                        quantity,
                        direction: 1,
                        uom_code: cikti.rows[0].uom_code,
                        stock_status: kkGerekli ? 'Kalitede' : 'Kullanilabilir',
                    }],
                });
                mamulHareketId = h.hareket.id;
                if (kkGerekli) {
                    await kkEmriOlustur(client, {
                        direction: 'CKK',
                        stokId: op.output_item_id,
                        partiId: h.satirlar[0]?.lot_id || null,
                        depoId: ciktiDepo,
                        hedefDepoId: hedefMamul,
                        quantity,
                        kaynakTipi: 'URETIM_EMRI',
                        kaynakId: emirId,
                        stokHareketId: mamulHareketId,
                        description: `${emir.order_no} ÇKK`,
                    });
                }
            }

            const yeniUretilen = Number(op.produced_quantity) + quantity;
            const opDurum = yeniUretilen + 1e-9 >= Number(op.planlanan_quantity) ? 'Tamamlandi' : 'Hazir';
            await client.query(
                `UPDATE production_order_operations
                 SET produced_quantity=$1, status=$2 WHERE id=$3`,
                [yeniUretilen, opDurum, op.id]
            );

            // Sıradaki operasyonu Hazir yap
            if (opDurum === 'Tamamlandi' && op.sonraki_line_no) {
                await client.query(
                    `
                    UPDATE production_order_operations
                    SET status='Hazir'
                    WHERE order_id=$1 AND line_no=$2 AND status='Bekliyor'
                    `,
                    [emirId, op.sonraki_line_no]
                );
            }

            // Tüm ops tamamsa emri kapat; mamul miktarını güncelle
            if (op.output_item_id === emir.item_id) {
                await client.query(
                    `UPDATE production_orders
                     SET produced_quantity = produced_quantity + $1, status='Uretimde'
                     WHERE id=$2`,
                    [quantity, emirId]
                );
            }

            const kalanOps = await client.query(
                `SELECT COUNT(*)::int AS c FROM production_order_operations
                 WHERE order_id=$1 AND status <> 'Tamamlandi'`,
                [emirId]
            );
            if (kalanOps.rows[0].c === 0) {
                await client.query(
                    `UPDATE production_orders SET status='Kapali' WHERE id=$1`,
                    [emirId]
                );
            }

            const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
            await client.query(
                `
                INSERT INTO production_receipts
                    (giris_no, order_id, quantity, consumption_movement_id, finished_good_movement_id)
                VALUES ($1,$2,$3,$4,$5)
                `,
                [girisNo, emirId, quantity, tuketimHareketId, mamulHareketId]
            );

            return { operasyon_id: op.id, operation_code: op.operation_code, quantity };
        });

        res.status(201).json({
            tamamlanan: result,
            emir: await emirGetir(emirId),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

// Tüm Hazir operasyonları sırayla bitir (demo/kolay yol)
router.post('/:id/uretim-giris', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        let emir = await emirGetir(emirId);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });

        const adimlar = [];
        while (emir.aktif_operasyon) {
            const r = await tamamlaOperasyonInternal(emirId, req.body.quantity);
            adimlar.push(r.tamamlanan);
            emir = r.emir;
            if (emir.status === 'Kapali') break;
        }
        res.status(201).json({ adimlar, emir });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

async function tamamlaOperasyonInternal(emirId, miktarOpsiyonel) {
    const result = await withTransaction(pool, async (client) => {
        const emirRes = await client.query(
            'SELECT * FROM production_orders WHERE id=$1 FOR UPDATE',
            [emirId]
        );
        const emir = emirRes.rows[0];
        if (!emir) throw new Error('Üretim emri bulunamadı.');

        const opRes = await client.query(
            `
            SELECT * FROM production_order_operations
            WHERE order_id=$1 AND status='Hazir'
            ORDER BY line_no LIMIT 1 FOR UPDATE
            `,
            [emirId]
        );
        const op = opRes.rows[0];
        if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

        const quantity = Number(miktarOpsiyonel || op.planlanan_quantity);
        const rate = quantity / Number(op.planlanan_quantity);

        const bilesenler = await client.query(
            `
            SELECT b.*, st.item_type, st.uom_code AS stock_uom
            FROM production_order_operation_components b
            JOIN items st ON st.id = b.item_id
            WHERE b.operasyon_id=$1 FOR UPDATE
            `,
            [op.id]
        );

        const depoGrup = new Map();
        for (const b of bilesenler.rows) {
            const depoId = tuketimDepoSec(emir, b.item_type);
            if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
            depoGrup.get(depoId).push({
                item_id: b.item_id,
                quantity: Number(b.planlanan_quantity) * rate,
                direction: -1,
                uom_code: b.uom_code || b.stock_uom,
            });
            await client.query(
                `UPDATE production_order_operation_components
                 SET tuketilen_quantity = tuketilen_quantity + $1 WHERE id=$2`,
                [Number(b.planlanan_quantity) * rate, b.id]
            );
        }

        let tuketimHareketId = null;
        for (const [depoId, satirlar] of depoGrup.entries()) {
            const h = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_TUKETIM',
                isYeriId: emir.plant_id,
                depoId,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                description: `${emir.order_no} / ${op.operation_code} tüketim`,
                satirlar,
            });
            tuketimHareketId = h.hareket.id;
        }

        let mamulHareketId = null;
        if (op.output_item_id) {
            const cikti = await client.query(
                'SELECT id, uom_code, item_type FROM items WHERE id=$1',
                [op.output_item_id]
            );
            const ciktiDepo = ciktiDepoSec(emir, cikti.rows[0].item_type);
            const h = await stokHareketOlustur(client, {
                hareketTipi: 'URETIM_GIRIS',
                isYeriId: emir.plant_id,
                depoId: ciktiDepo,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                description: `${emir.order_no} / ${op.operation_code} çıktı`,
                satirlar: [{
                    item_id: op.output_item_id,
                    quantity,
                    direction: 1,
                    uom_code: cikti.rows[0].uom_code,
                }],
            });
            mamulHareketId = h.hareket.id;
        }

        await client.query(
            `UPDATE production_order_operations
             SET produced_quantity = produced_quantity + $1, status='Tamamlandi' WHERE id=$2`,
            [quantity, op.id]
        );

        if (op.sonraki_line_no) {
            await client.query(
                `
                UPDATE production_order_operations
                SET status='Hazir'
                WHERE order_id=$1 AND line_no=$2 AND status='Bekliyor'
                `,
                [emirId, op.sonraki_line_no]
            );
        }

        if (op.output_item_id === emir.item_id) {
            await client.query(
                `UPDATE production_orders
                 SET produced_quantity = produced_quantity + $1, status='Uretimde' WHERE id=$2`,
                [quantity, emirId]
            );
        }

        const kalanOps = await client.query(
            `SELECT COUNT(*)::int AS c FROM production_order_operations
             WHERE order_id=$1 AND status <> 'Tamamlandi'`,
            [emirId]
        );
        if (kalanOps.rows[0].c === 0) {
            await client.query(`UPDATE production_orders SET status='Kapali' WHERE id=$1`, [emirId]);
        }

        const girisNo = await sonrakiBelgeNo(client, 'URETIM_GIRIS');
        await client.query(
            `
            INSERT INTO production_receipts
                (giris_no, order_id, quantity, consumption_movement_id, finished_good_movement_id)
            VALUES ($1,$2,$3,$4,$5)
            `,
            [girisNo, emirId, quantity, tuketimHareketId, mamulHareketId]
        );

        return { operation_code: op.operation_code, quantity };
    });

    return { tamamlanan: result, emir: await emirGetir(emirId) };
}

router.put('/:id', async (req, res) => {
    try {
        const b = req.body || {};
        const allowed = ['Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'];
        if (b.status && !allowed.includes(b.status)) {
            return res.status(400).json({ hata: `Geçersiz status. İzin verilen: ${allowed.join(', ')}` });
        }
        if (b.planli_kesin && !['Planli', 'Kesin'].includes(b.planli_kesin)) {
            return res.status(400).json({ hata: "planli_kesin 'Planli' veya 'Kesin' olmalı." });
        }
        if (b.acik_kapali && !['Acik', 'Kapali'].includes(b.acik_kapali)) {
            return res.status(400).json({ hata: "acik_kapali 'Acik' veya 'Kapali' olmalı." });
        }
        let tipPlanli = b.planli_kesin || null;
        if (b.order_type_id && !tipPlanli) {
            const t = await pool.query('SELECT planli_kesin FROM production_order_types WHERE id=$1', [b.order_type_id]);
            tipPlanli = t.rows[0]?.planli_kesin || null;
        }

        const id = await withTransaction(pool, async (client) => {
            const mevcut = await client.query(
                `SELECT * FROM production_orders WHERE id=$1 FOR UPDATE`,
                [req.params.id],
            );
            if (!mevcut.rows[0]) {
                const err = new Error('Üretim emri bulunamadı.');
                err.status = 404;
                throw err;
            }
            const m = mevcut.rows[0];
            const yeniAgac = b.product_bom_id != null ? Number(b.product_bom_id) : Number(m.product_bom_id);
            const yeniRota = b.route_id != null ? Number(b.route_id) : Number(m.route_id);
            const yeniStok = b.item_id != null ? Number(b.item_id) : Number(m.item_id);
            const yeniMiktar = b.planlanan_quantity != null ? Number(b.planlanan_quantity) : Number(m.planlanan_quantity);

            if (b.product_bom_id != null || b.route_id != null || b.item_id != null) {
                await bomRotaDogrula(client, {
                    urunAgaciId: yeniAgac,
                    rotaId: yeniRota,
                    stokId: yeniStok,
                    quantity: yeniMiktar,
                    tarih: b.order_date || m.order_date,
                });
            }

            let acikKapali = b.acik_kapali || null;
            if (!acikKapali && b.status) {
                acikKapali = ['Kapali', 'Iptal'].includes(b.status) ? 'Kapali' : 'Acik';
            }

            const upd = await client.query(
                `
                UPDATE production_orders SET
                    planlanan_quantity = COALESCE($2, planlanan_quantity),
                    status = COALESCE($3, status),
                    sales_order_id = COALESCE($4, sales_order_id),
                    order_type_id = COALESCE($5, order_type_id),
                    planli_kesin = COALESCE($6, planli_kesin),
                    is_started = COALESCE($7, is_started),
                    cikis_type = COALESCE($8, cikis_type),
                    giris_type = COALESCE($9, giris_type),
                    silindi = COALESCE($10, silindi),
                    source_document_type = COALESCE($11, source_document_type),
                    source_document_id = COALESCE($12, source_document_id),
                    plant_id = COALESCE($13, plant_id),
                    component_warehouse_id = COALESCE($14, component_warehouse_id),
                    wip_warehouse_id = COALESCE($15, wip_warehouse_id),
                    fg_warehouse_id = COALESCE($16, fg_warehouse_id),
                    item_id = COALESCE($17, item_id),
                    product_bom_id = COALESCE($18, product_bom_id),
                    route_id = COALESCE($19, route_id),
                    order_date = COALESCE($20, order_date),
                    start_date = COALESCE($20, start_date),
                    plan_start = COALESCE($21, plan_start),
                    plan_end = COALESCE($22, plan_end),
                    end_date = COALESCE($23, end_date),
                    uom_code = COALESCE($24, uom_code),
                    acik_kapali = COALESCE($25, acik_kapali),
                    onayli = COALESCE($26, onayli),
                    yayinlandi = COALESCE($27, yayinlandi),
                    is_printed = COALESCE($28, is_printed),
                    product_girisi_tamamlandi = COALESCE($29, product_girisi_tamamlandi),
                    description = COALESCE($30, description)
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    b.planlanan_quantity ?? null,
                    b.status || null,
                    b.sales_order_id !== undefined ? b.sales_order_id : null,
                    b.order_type_id || null,
                    tipPlanli,
                    typeof b.is_started === 'boolean' ? b.is_started : null,
                    b.cikis_type || null,
                    b.giris_type || null,
                    typeof b.silindi === 'boolean' ? b.silindi : null,
                    b.source_document_type || null,
                    b.source_document_id !== undefined ? b.source_document_id : null,
                    b.plant_id || null,
                    b.component_warehouse_id || null,
                    b.wip_warehouse_id !== undefined ? b.wip_warehouse_id : null,
                    b.fg_warehouse_id || null,
                    b.item_id || null,
                    b.product_bom_id || null,
                    b.route_id || null,
                    tarihGun(b.order_date),
                    b.plan_start || null,
                    b.plan_end || null,
                    tarihGun(b.end_date),
                    b.uom_code || null,
                    acikKapali,
                    typeof b.onayli === 'boolean' ? b.onayli : null,
                    typeof b.yayinlandi === 'boolean' ? b.yayinlandi : null,
                    typeof b.is_printed === 'boolean' ? b.is_printed : null,
                    typeof b.product_girisi_tamamlandi === 'boolean' ? b.product_girisi_tamamlandi : null,
                    b.description !== undefined ? b.description : null,
                ],
            );

            const malzemeler = Array.isArray(b.malzemeler) ? b.malzemeler
                : (Array.isArray(b.bilesenler) ? b.bilesenler : null);
            if (malzemeler) {
                await client.query('DELETE FROM production_order_components WHERE order_id=$1', [req.params.id]);
                let sira = 1;
                for (const row of malzemeler) {
                    if (!row?.item_id) continue;
                    await client.query(
                        `
                        INSERT INTO production_order_components
                            (order_id, item_id, planlanan_quantity, tuketilen_quantity, uom_code, line_no, warehouse_id)
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                        `,
                        [
                            req.params.id,
                            row.item_id,
                            row.planlanan_quantity ?? row.quantity ?? 0,
                            row.tuketilen_quantity ?? 0,
                            row.uom_code || null,
                            row.line_no != null ? row.line_no : sira,
                            row.warehouse_id || null,
                        ],
                    );
                    sira += 1;
                }
            }

            if (Array.isArray(b.operasyonlar)) {
                for (const op of b.operasyonlar) {
                    if (!op?.id) continue;
                    await client.query(
                        `
                        UPDATE production_order_operations SET
                            planlanan_quantity = COALESCE($2, planlanan_quantity),
                            operation_name = COALESCE($3, operation_name),
                            work_center_id = COALESCE($4, work_center_id),
                            status = COALESCE($5, status)
                        WHERE id=$1 AND order_id=$6
                        `,
                        [
                            op.id,
                            op.planlanan_quantity ?? null,
                            op.operation_name || null,
                            op.work_center_id || null,
                            op.status || null,
                            req.params.id,
                        ],
                    );
                }
            }

            return upd.rows[0].id;
        });

        res.json(await emirGetir(id));
    } catch (err) {
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** BOM + rota + miktardan malzeme ve operasyon satırlarını yeniden üretir. */
router.post('/:id/detaylari-doldur', async (req, res) => {
    try {
        const result = await withTransaction(pool, async (client) => {
            await emirDetayDoldurulabilirMi(client, req.params.id);
            const emir = await client.query('SELECT * FROM production_orders WHERE id=$1', [req.params.id]);
            const e = emir.rows[0];
            const { agac, rotaOps } = await bomRotaDogrula(client, {
                urunAgaciId: e.product_bom_id,
                rotaId: e.route_id,
                stokId: e.item_id,
                quantity: e.planlanan_quantity,
                tarih: e.order_date,
            });
            const carpan = Number(e.planlanan_quantity) / Number(agac.quantity || 1);
            const opN = await emirOperasyonlariDoldur(client, e.id, {
                rotaOps,
                planlananMiktar: e.planlanan_quantity,
                bilesenCarpan: carpan,
            });
            const malN = await emirMalzemeleriDoldur(client, e.id, {
                urunAgaciId: e.product_bom_id,
                planlananMiktar: e.planlanan_quantity,
                agacMiktar: agac.quantity,
                hammaddeDepoId: e.component_warehouse_id,
            });
            return { operasyon: opN, malzeme: malN };
        });
        const emir = await emirGetir(req.params.id);
        res.json({ ...emir, _doldurulan: result });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Emir üzerinde ürün ağacı / rota değişikliği.
 * Body: { product_bom_id?, route_id?, detaylari_doldur?: true }
 */
router.post('/:id/bom-rota-degistir', async (req, res) => {
    try {
        const { product_bom_id, route_id, detaylari_doldur = true } = req.body || {};
        if (product_bom_id == null && route_id == null) {
            return res.status(400).json({ hata: 'product_bom_id veya route_id gerekli.' });
        }
        await withTransaction(pool, async (client) => {
            await emirDetayDoldurulabilirMi(client, req.params.id);
            const emir = await client.query('SELECT * FROM production_orders WHERE id=$1', [req.params.id]);
            const e = emir.rows[0];
            const yeniAgac = product_bom_id != null ? Number(product_bom_id) : Number(e.product_bom_id);
            const yeniRota = route_id != null ? Number(route_id) : Number(e.route_id);
            const { agac, rotaOps } = await bomRotaDogrula(client, {
                urunAgaciId: yeniAgac,
                rotaId: yeniRota,
                stokId: e.item_id,
                quantity: e.planlanan_quantity,
                tarih: e.order_date,
            });
            await client.query(
                `UPDATE production_orders SET product_bom_id=$2, route_id=$3 WHERE id=$1`,
                [e.id, yeniAgac, yeniRota],
            );
            if (detaylari_doldur) {
                const carpan = Number(e.planlanan_quantity) / Number(agac.quantity || 1);
                await emirOperasyonlariDoldur(client, e.id, {
                    rotaOps,
                    planlananMiktar: e.planlanan_quantity,
                    bilesenCarpan: carpan,
                });
                await emirMalzemeleriDoldur(client, e.id, {
                    urunAgaciId: yeniAgac,
                    planlananMiktar: e.planlanan_quantity,
                    agacMiktar: agac.quantity,
                    hammaddeDepoId: e.component_warehouse_id,
                });
            }
        });
        res.json(await emirGetir(req.params.id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/** PRDT02 / PRDT03 — iş emri onay */
router.post('/:id/onayla', async (req, res) => {
    try {
        const upd = await pool.query(
            `
            UPDATE production_orders
            SET status = 'Acik', onayli = TRUE, acik_kapali = 'Acik'
            WHERE id = $1 AND status IN ('Taslak', 'OnayBekliyor')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!upd.rows[0]) {
            return res.status(400).json({
                hata: 'Emir onaylanamadı (bulunamadı veya status Taslak/OnayBekliyor değil).',
            });
        }
        res.json(await emirGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

/** İş emrini başlat (is_started = true) */
router.post('/:id/baslat', async (req, res) => {
    try {
        const upd = await pool.query(
            `
            UPDATE production_orders
            SET is_started = TRUE,
                status = CASE WHEN status = 'Acik' THEN 'Uretimde' ELSE status END
            WHERE id = $1
              AND COALESCE(is_started, FALSE) = FALSE
              AND status IN ('Acik', 'Uretimde', 'OnayBekliyor')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!upd.rows[0]) {
            return res.status(400).json({
                hata: 'Emir başlatılamadı (bulunamadı, zaten başlatılmış veya status accepted değil).',
            });
        }
        res.json(await emirGetir(upd.rows[0].id));
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM production_orders WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json({ silindi: true, id: Number(req.params.id) });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

module.exports = router;
