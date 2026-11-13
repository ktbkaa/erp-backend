const express = require('express');
const router = express.Router();
const pool = require('../db');
const { companyIdFromReq } = require('../src/utils/firmaScope');
const { withTransaction } = require('../src/utils/withTransaction');
const { nextDocumentNo } = require('../src/utils/belgeNo');
const { createStockMovement } = require('../src/services/stokHareketService');
const { createQcOrder, resolveOutgoingQcWarehouse, resolveOutgoingQcTargetWarehouse } = require('../src/services/kaliteService');
const {
    getProductionParams,
    assertOperationQtyAllowed,
    assertOrderCloseQtyAllowed,
} = require('../src/services/productionParamsService');

async function resolveType(client, emirTipiId, siparisId) {
    if (emirTipiId) {
        const t = await client.query(
            'SELECT id, type_code, planned_firm FROM production_order_types WHERE id=$1 AND is_active=TRUE',
            [emirTipiId]
        );
        if (!t.rows[0]) throw new Error('Üretim emri tipi bulunamadı veya pasif.');
        return t.rows[0];
    }
    const kod = siparisId ? 'SIP' : 'STD';
    const t = await client.query(
        'SELECT id, type_code, planned_firm FROM production_order_types WHERE type_code=$1 AND is_active=TRUE',
        [kod]
    );
    return t.rows[0] || null;
}

function dateDay(v) {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
}

/** Plan / bitiş: tarih+saat — datetime-local veya ISO kabul eder */
function dateTimeValue(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) return null;
        return v;
    }
    const s = String(v).trim();
    if (!s) return null;
    // YYYY-MM-DDTHH:mm(:ss)? — Postgres kabul eder
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.length === 16 ? `${s}:00` : s;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s;
    // Yalnız tarih → gün başı
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00`;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
}

/** BOM / rota geçerlilik + quantity aralığı kontrolü (Uyumsoft uyarlaması) */
async function validateBomRouting(client, { urunAgaciId, rotaId, stokId, quantity, tarih }) {
    const gun = dateDay(tarih) || new Date().toISOString().slice(0, 10);
    const agac = await client.query(
        'SELECT * FROM boms WHERE id=$1 AND finished_good_item_id=$2',
        [urunAgaciId, stokId]
    );
    if (!agac.rows[0]) throw new Error('Ürün ağacı mamul stok ile eşleşmiyor.');
    const a = agac.rows[0];
    const aBas = dateDay(a.valid_from);
    const aBit = dateDay(a.valid_to);
    if (aBas && gun < aBas) {
        throw new Error(`Ürün ağacı henüz geçerli değil (başlangıç: ${aBas}).`);
    }
    if (aBit && gun > aBit) {
        throw new Error(`Ürün ağacı geçerlilik süresi dolmuş (bitiş: ${aBit}).`);
    }
    const mq = Number(quantity);
    if (a.min_quantity != null && mq < Number(a.min_quantity)) {
        throw new Error(`Planlanan miktar ağaç min (${a.min_quantity}) altında.`);
    }
    if (a.max_quantity != null && mq > Number(a.max_quantity)) {
        throw new Error(`Planlanan miktar ağaç max (${a.max_quantity}) üstünde.`);
    }

    const rota = await client.query('SELECT * FROM routings WHERE id=$1', [rotaId]);
    if (!rota.rows[0]) throw new Error('Rota bulunamadı.');
    const r = rota.rows[0];
    if (Number(r.item_id) !== Number(stokId) && !r.template) {
        throw new Error('Rota stok ile eşleşmiyor (şablon değil).');
    }
    const rBas = dateDay(r.valid_from);
    const rBit = dateDay(r.valid_to);
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
async function fillOrderMaterials(client, emirId, { urunAgaciId, planlananMiktar, agacMiktar, hammaddeDepoId }) {
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
                (order_id, item_id, planned_quantity, consumed_quantity, uom_code, line_no, warehouse_id)
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
async function fillOrderOperations(client, emirId, { rotaOps, planlananMiktar, bilesenCarpan }) {
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
                 output_item_id, next_line_no, planned_quantity, status)
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
                op.next_line_no,
                plan,
                ilk ? 'Hazir' : 'Bekliyor',
            ],
        );
        ilk = false;
        n += 1;
        const bilesenler = await client.query(
            'SELECT * FROM routing_operation_components WHERE operation_id=$1',
            [op.id],
        );
        for (const b of bilesenler.rows) {
            await client.query(
                `
                INSERT INTO production_order_operation_components
                    (operation_id, item_id, planned_quantity, uom_code)
                VALUES ($1,$2,$3,$4)
                `,
                [opIns.rows[0].id, b.item_id, Number(b.quantity) * carpan, b.uom_code],
            );
        }
    }
    return n;
}

async function canFillOrderDetails(client, emirId) {
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
        `SELECT COALESCE(SUM(consumed_quantity),0)::numeric AS t FROM production_order_components WHERE order_id=$1`,
        [emirId],
    );
    if (Number(tuk.rows[0].t) > 0) {
        throw new Error('Tüketimi olan malzemeler varken detay yenilenemez.');
    }
    return e;
}

async function createOrder(client, opts) {
    const {
        item_id,
        product_bom_id,
        route_id,
        plant_id,
        company_id,
        component_warehouse_id,
        wip_warehouse_id,
        fg_warehouse_id,
        planned_quantity,
        sales_order_id,
        order_type_id,
        status,
        is_started,
        issue_type,
        receipt_type,
        is_deleted: silindi,
        source_document_type,
        source_document_id,
        order_date,
        plan_start,
        plan_end,
        end_date,
        uom_code,
        is_open,
        is_approved: onayli,
        is_released: yayinlandi,
        is_printed,
        product_receipt_completed,
        description,
        planned_firm,
        project_code,
    } = opts;

    const type = await resolveType(client, order_type_id, sales_order_id);
    const { agac, rotaOps } = await validateBomRouting(client, {
        urunAgaciId: product_bom_id,
        rotaId: route_id,
        stokId: item_id,
        quantity: planned_quantity,
        tarih: order_date,
    });

    const stok = await client.query('SELECT uom_code FROM items WHERE id=$1', [item_id]);
    const no = await nextDocumentNo(client, 'URETIM_EMRI');
    const durumVal = status || (sales_order_id ? 'OnayBekliyor' : 'Acik');
    const emir = await client.query(
        `
        INSERT INTO production_orders
            (order_no, item_id, product_bom_id, route_id, plant_id, company_id,
             component_warehouse_id, wip_warehouse_id, fg_warehouse_id,
             planned_quantity, status, sales_order_id, order_type_id, planned_firm,
             is_started, issue_type, receipt_type, is_deleted,
             source_document_type, source_document_id,
             order_date, start_date, plan_start, plan_end, end_date,
             uom_code, is_open, is_approved, is_released, is_printed, product_receipt_completed, description,
             project_code)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)
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
            planned_quantity,
            durumVal,
            sales_order_id || null,
            type?.id || null,
            planned_firm || type?.planned_firm || 'Kesin',
            typeof is_started === 'boolean' ? is_started : false,
            issue_type || 'Manuel',
            receipt_type || 'Manuel',
            typeof silindi === 'boolean' ? silindi : false,
            source_document_type || null,
            source_document_id || null,
            dateDay(order_date) || new Date().toISOString().slice(0, 10),
            dateDay(order_date) || new Date().toISOString().slice(0, 10),
            dateTimeValue(plan_start),
            dateTimeValue(plan_end),
            dateTimeValue(end_date),
            uom_code || stok.rows[0]?.uom_code || null,
            is_open || (durumVal === 'Kapali' || durumVal === 'Iptal' ? 'Kapali' : 'Acik'),
            !!onayli,
            !!yayinlandi,
            !!is_printed,
            !!product_receipt_completed,
            description || null,
            project_code || null,
        ],
    );
    const emirId = emir.rows[0].id;
    const carpan = Number(planned_quantity) / Number(agac.quantity || 1);
    await fillOrderOperations(client, emirId, {
        rotaOps,
        planlananMiktar: planned_quantity,
        bilesenCarpan: carpan,
    });
    await fillOrderMaterials(client, emirId, {
        urunAgaciId: product_bom_id,
        planlananMiktar: planned_quantity,
        agacMiktar: agac.quantity,
        hammaddeDepoId: component_warehouse_id,
    });
    return emirId;
}

async function getQcOrder(id) {
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
            WHERE b.operation_id = $1
            ORDER BY b.id
            `,
            [op.id]
        );
        const sonraki = ops.rows.find((x) => x.line_no === op.next_line_no);
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

/** company_id boş kalan emirleri iş yerinden / stok-firma bağından onar */
async function healNullCompanyOrders(client = pool) {
    await client.query(`
        UPDATE production_orders ue
        SET company_id = p.company_id
        FROM plants p
        WHERE ue.company_id IS NULL
          AND ue.plant_id = p.id
          AND p.company_id IS NOT NULL
    `);
    await client.query(`
        UPDATE production_orders ue
        SET company_id = icp.company_id
        FROM (
            SELECT DISTINCT ON (item_id) item_id, company_id
            FROM item_company_params
            WHERE company_id IS NOT NULL
            ORDER BY item_id, id
        ) icp
        WHERE ue.company_id IS NULL
          AND ue.item_id = icp.item_id
    `);
}

router.get('/', async (req, res) => {
    try {
        await healNullCompanyOrders().catch(() => {});
        const firmaId = companyIdFromReq(req);
        const params = [];
        let sql = 'SELECT id FROM production_orders';
        if (firmaId) {
            params.push(firmaId);
            sql += ` WHERE company_id = $${params.length}`;
        }
        sql += ' ORDER BY id DESC';
        const liste = await pool.query(sql, params);
        const result = [];
        for (const r of liste.rows) result.push(await getQcOrder(r.id));
        res.json(result);
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

/** Üretim girişi formu — operasyon lookup (order_id ile süzülür) */
router.get('/operasyon-lookup', async (req, res) => {
    try {
        const params = [];
        const where = [];
        // Emir seçiliyse o emrin tüm operasyonları (kapalı dahil — kullanıcı görsün).
        // Emir yoksa yalnızca girişe uygun aktif durumlar.
        if (req.query.order_id) {
            params.push(Number(req.query.order_id));
            where.push(`o.order_id = $${params.length}`);
        } else {
            where.push(`o.status IN ('Hazir','Bekliyor','Uretimde')`);
        }
        const firmaId = companyIdFromReq(req);
        if (firmaId) {
            params.push(firmaId);
            where.push(`ue.company_id = $${params.length}`);
        }
        const r = await pool.query(
            `
            SELECT o.id, o.order_id, o.line_no, o.operation_code, o.operation_name, o.status,
                   o.planned_quantity, o.produced_quantity, o.work_center_id,
                   ue.order_no
            FROM production_order_operations o
            JOIN production_orders ue ON ue.id = o.order_id
            WHERE ${where.join(' AND ')}
            ORDER BY o.order_id DESC, o.line_no
            LIMIT 1000
            `,
            params
        );
        res.json(r.rows);
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
                SELECT COALESCE(SUM(ue.planned_quantity),0) AS uretim_plan
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
                ORDER BY r2.is_default DESC NULLS LAST, r2.id DESC LIMIT 1
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
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
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
                    SELECT SUM(ue.planned_quantity) FROM production_orders ue
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
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        let emir = await getQcOrder(req.params.id);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });

        // Malzeme/rota boşsa ve emir henüz üretime geçmediyse BOM+rotadan otomatik doldur
        const malEmpty = !(emir.malzemeler || []).length;
        const opEmpty = !(emir.operasyonlar || []).length;
        if ((malEmpty || opEmpty) && emir.product_bom_id && emir.route_id
            && !emir.is_started && Number(emir.produced_quantity || 0) <= 0
            && !['Kapali', 'Iptal'].includes(emir.status)) {
            try {
                await withTransaction(pool, async (client) => {
                    await canFillOrderDetails(client, emir.id);
                    const { agac, rotaOps } = await validateBomRouting(client, {
                        urunAgaciId: emir.product_bom_id,
                        rotaId: emir.route_id,
                        stokId: emir.item_id,
                        quantity: emir.planned_quantity,
                        tarih: emir.order_date,
                    });
                    const carpan = Number(emir.planned_quantity) / Number(agac.quantity || 1);
                    if (opEmpty) {
                        await fillOrderOperations(client, emir.id, {
                            rotaOps,
                            planlananMiktar: emir.planned_quantity,
                            bilesenCarpan: carpan,
                        });
                    }
                    if (malEmpty) {
                        await fillOrderMaterials(client, emir.id, {
                            urunAgaciId: emir.product_bom_id,
                            planlananMiktar: emir.planned_quantity,
                            agacMiktar: agac.quantity,
                            hammaddeDepoId: emir.component_warehouse_id,
                        });
                    }
                });
                emir = await getQcOrder(emir.id);
            } catch (_) {
                /* doldurma mümkün değilse mevcut kaydı döndür */
            }
        }
        res.json(emir);
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
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
            planned_quantity,
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
        const quantity = planned_quantity || Number(siparis.rows[0].kalem_miktar);
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ hata: 'Sipariş kaleminde miktar yok; planned_quantity verin.' });
        }

        const firmaId = companyIdFromReq(req) || siparis.rows[0].company_id || null;
        const id = await withTransaction(pool, async (client) =>
            createOrder(client, {
                item_id,
                product_bom_id,
                route_id,
                plant_id,
                company_id: req.body.company_id || firmaId,
                component_warehouse_id,
                wip_warehouse_id,
                fg_warehouse_id,
                planned_quantity: quantity,
                sales_order_id,
                order_type_id,
                status: 'OnayBekliyor',
            })
        );

        res.status(201).json(await getQcOrder(id));
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
                let planned_quantity = k.planned_quantity;

                try {
                    if (!item_id || !product_bom_id || !route_id || !component_warehouse_id || !fg_warehouse_id) {
                        throw new Error('item_id, product_bom_id, route_id, warehouses zorunlu.');
                    }
                    if (!planned_quantity && sales_order_id) {
                        const mq = await client.query(
                            `SELECT COALESCE(SUM(quantity),0) AS m FROM sales_order_lines
                             WHERE sales_order_id=$1 AND item_id=$2`,
                            [sales_order_id, item_id]
                        );
                        planned_quantity = Number(mq.rows[0].m);
                    }
                    if (!planned_quantity || planned_quantity <= 0) {
                        throw new Error('planned_quantity yok.');
                    }
                    const id = await createOrder(client, {
                        item_id,
                        product_bom_id,
                        route_id,
                        plant_id,
                        company_id: k.company_id || ortak.company_id || companyIdFromReq(req) || null,
                        component_warehouse_id,
                        wip_warehouse_id,
                        fg_warehouse_id,
                        planned_quantity,
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
            emirler: await Promise.all(olusturulan.map((o) => getQcOrder(o.id))),
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
            planned_quantity,
        } = b;

        if (!item_id || !product_bom_id || !route_id || !component_warehouse_id || !fg_warehouse_id || !planned_quantity) {
            return res.status(400).json({
                hata: 'item_id, product_bom_id, route_id, component_warehouse_id, fg_warehouse_id, planned_quantity zorunlu.',
            });
        }

        const firmaId = companyIdFromReq(req);
        const payload = {
            ...b,
            company_id: b.company_id || firmaId || null,
        };
        // İş yerinden firma türet (body/header boşsa)
        if (!payload.company_id && payload.plant_id) {
            const pr = await pool.query('SELECT company_id FROM plants WHERE id=$1', [payload.plant_id]);
            payload.company_id = pr.rows[0]?.company_id || null;
        }

        const id = await withTransaction(pool, async (client) => createOrder(client, payload));

        res.status(201).json(await getQcOrder(id));
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

function pickConsumptionWarehouse(emir, stokTipi) {
    // Hammadde Ana depodan; yarı mamul YM depodan
    if (stokTipi === 'YariMamul') {
        return emir.wip_warehouse_id || emir.component_warehouse_id;
    }
    return emir.component_warehouse_id;
}

function pickOutputWarehouse(emir, ciktiStokTipi) {
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

            const quantity = Number(req.body.quantity || op.planned_quantity);
            if (quantity <= 0) throw new Error('quantity > 0 olmalı.');
            const prodParams = await getProductionParams(client, emir.company_id, emir.plant_id);
            assertOperationQtyAllowed(prodParams, op, quantity);

            const rate = quantity / Number(op.planned_quantity);
            const bilesenler = await client.query(
                `
                SELECT b.*, st.item_type, st.uom_code AS stock_uom
                FROM production_order_operation_components b
                JOIN items st ON st.id = b.item_id
                WHERE b.operation_id=$1 FOR UPDATE
                `,
                [op.id]
            );

            // Bileşenleri tipine göre depodan grupla ve tüket
            const depoGrup = new Map();
            for (const b of bilesenler.rows) {
                const depoId = pickConsumptionWarehouse(emir, b.item_type);
                if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
                depoGrup.get(depoId).push({
                    item_id: b.item_id,
                    quantity: Number(b.planned_quantity) * rate,
                    direction: -1,
                    uom_code: b.uom_code || b.stock_uom,
                });
                await client.query(
                    `UPDATE production_order_operation_components
                     SET consumed_quantity = consumed_quantity + $1 WHERE id=$2`,
                    [Number(b.planned_quantity) * rate, b.id]
                );
            }

            let tuketimHareketId = null;
            for (const [depoId, satirlar] of depoGrup.entries()) {
                const h = await createStockMovement(client, {
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

            // Üretim çıktısı her zaman Çıkış Kalite (CKK) deposuna; onay sonrası Mamul/YarıMamul
            let mamulHareketId = null;
            if (op.output_item_id) {
                const cikti = await client.query(
                    'SELECT id, uom_code, item_type, quality_control_required FROM items WHERE id=$1',
                    [op.output_item_id]
                );
                const ckk = await resolveOutgoingQcWarehouse(client, emir.plant_id);
                if (!ckk) throw new Error('Çıkış kalite deposu tanımlı değil (CKK_DEPO_KODU / warehouse_role=CKK).');
                const ciktiDepo = ckk.id;
                const hedefDepo = await resolveOutgoingQcTargetWarehouse(client, op.output_item_id, emir.plant_id);
                // CKK/hedef depo izinlerini otomatik aç (kalite akışı)
                for (const wid of [ciktiDepo, hedefDepo?.id].filter(Boolean)) {
                    await client.query(
                        `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
                         SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
                           SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
                         )`,
                        [op.output_item_id, wid, emir.plant_id]
                    );
                }
                const h = await createStockMovement(client, {
                    hareketTipi: 'URETIM_GIRIS',
                    isYeriId: emir.plant_id,
                    depoId: ciktiDepo,
                    belgeTipi: 'URETIM_EMRI_OP',
                    belgeId: op.id,
                    description: `${emir.order_no} / ${op.operation_code} çıktı → Çıkış Kalite`,
                    depoZorunluAtla: true,
                    satirlar: [{
                        item_id: op.output_item_id,
                        quantity,
                        direction: 1,
                        uom_code: cikti.rows[0].uom_code,
                        stock_status: 'Kalitede',
                    }],
                });
                mamulHareketId = h.hareket.id;
                await createQcOrder(client, {
                    direction: 'CKK',
                    stokId: op.output_item_id,
                    partiId: h.satirlar[0]?.lot_id || null,
                    depoId: ciktiDepo,
                    hedefDepoId: hedefDepo?.id || null,
                    quantity,
                    kaynakTipi: 'URETIM_EMRI',
                    kaynakId: emirId,
                    stokHareketId: mamulHareketId,
                    description: `${emir.order_no} çıkış kalite (${cikti.rows[0].item_type || 'Mamul'})`,
                });
            }

            const yeniUretilen = Number(op.produced_quantity) + quantity;
            const opDurum = yeniUretilen + 1e-9 >= Number(op.planned_quantity) ? 'Tamamlandi' : 'Hazir';
            await client.query(
                `UPDATE production_order_operations
                 SET produced_quantity=$1, status=$2 WHERE id=$3`,
                [yeniUretilen, opDurum, op.id]
            );

            // Sıradaki operasyonu Hazir yap
            if (opDurum === 'Tamamlandi' && op.next_line_no) {
                await client.query(
                    `
                    UPDATE production_order_operations
                    SET status='Hazir'
                    WHERE order_id=$1 AND line_no=$2 AND status='Bekliyor'
                    `,
                    [emirId, op.next_line_no]
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
            if (kalanOps.rows[0].c === 0 && prodParams.auto_close_on_complete) {
                const emirFresh = await client.query(
                    'SELECT planned_quantity, produced_quantity FROM production_orders WHERE id=$1',
                    [emirId]
                );
                assertOrderCloseQtyAllowed(prodParams, emirFresh.rows[0] || emir);
                await client.query(
                    `UPDATE production_orders SET status='Kapali' WHERE id=$1`,
                    [emirId]
                );
            }

            const girisNo = await nextDocumentNo(client, 'URETIM_GIRIS');
            await client.query(
                `
                INSERT INTO production_receipts
                    (receipt_no, order_id, quantity, consumption_movement_id, finished_good_movement_id)
                VALUES ($1,$2,$3,$4,$5)
                `,
                [girisNo, emirId, quantity, tuketimHareketId, mamulHareketId]
            );

            return { operation_id: op.id, operation_code: op.operation_code, quantity };
        });

        res.status(201).json({
            tamamlanan: result,
            emir: await getQcOrder(emirId),
        });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

// Tüm Hazir operasyonları sırayla bitir (demo/kolay yol) — body opsiyonel alanlarla tek adım da olabilir
router.post('/:id/uretim-giris', async (req, res) => {
    try {
        const emirId = Number(req.params.id);
        let emir = await getQcOrder(emirId);
        if (!emir) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });

        const body = req.body || {};
        // Tek operasyon / hızlı giriş: operation_id veya quick bayrağı
        if (body.operation_id || body.quick || body.single_step) {
            const r = await tamamlaOperasyonInternal(emirId, body);
            return res.status(201).json({ adimlar: [r.tamamlanan], emir: r.emir, receipt_id: r.tamamlanan?.receipt_id });
        }

        const adimlar = [];
        while (emir.aktif_operasyon) {
            const r = await tamamlaOperasyonInternal(emirId, {
                quantity: body.quantity,
                consume_materials: body.consume_materials,
                product_warehouse_id: body.product_warehouse_id,
                material_warehouse_id: body.material_warehouse_id,
            });
            adimlar.push(r.tamamlanan);
            emir = r.emir;
            if (emir.status === 'Kapali') break;
        }
        res.status(201).json({ adimlar, emir });
    } catch (err) {
        res.status(400).json({ hata: err.message });
    }
});

/**
 * Operasyon tamamla + stok tüketim/giriş + production_receipts kaydı.
 * opts: quantity, operation_id, consume_materials, materials[], product_warehouse_id,
 *       material_warehouse_id, header extras, skip_qc
 */
async function tamamlaOperasyonInternal(emirId, miktarOrOpts = null) {
    const opts = (miktarOrOpts && typeof miktarOrOpts === 'object' && !Array.isArray(miktarOrOpts))
        ? miktarOrOpts
        : { quantity: miktarOrOpts };
    const result = await withTransaction(pool, async (client) => {
        const emirRes = await client.query(
            'SELECT * FROM production_orders WHERE id=$1 FOR UPDATE',
            [emirId]
        );
        const emir = emirRes.rows[0];
        if (!emir) throw new Error('Üretim emri bulunamadı.');

        let op;
        if (opts.operation_id) {
            const opRes = await client.query(
                `SELECT * FROM production_order_operations WHERE id=$1 AND order_id=$2 FOR UPDATE`,
                [Number(opts.operation_id), emirId]
            );
            op = opRes.rows[0];
            if (!op) throw new Error('Operasyon bulunamadı.');
            if (!['Hazir', 'Bekliyor', 'Uretimde'].includes(op.status)) {
                throw new Error(`Operasyon durumu uygun değil: ${op.status}`);
            }
        } else {
            const opRes = await client.query(
                `
                SELECT * FROM production_order_operations
                WHERE order_id=$1 AND status='Hazir'
                ORDER BY line_no LIMIT 1 FOR UPDATE
                `,
                [emirId]
            );
            op = opRes.rows[0];
        }
        if (!op) throw new Error('Tamamlanacak Hazir operasyon yok.');

        const quantity = Number(opts.quantity != null ? opts.quantity : op.planned_quantity);
        if (!(quantity > 0)) throw new Error('Miktar > 0 olmalı.');
        const prodParams = await getProductionParams(client, emir.company_id, emir.plant_id);
        if (prodParams.enforce_op_sequence && op.status === 'Bekliyor') {
            const earlier = await client.query(
                `
                SELECT COUNT(*)::int AS c FROM production_order_operations
                WHERE order_id=$1 AND line_no < $2 AND status <> 'Tamamlandi'
                `,
                [emirId, op.line_no]
            );
            if (earlier.rows[0].c > 0) {
                throw Object.assign(
                    new Error('Önceki operasyonlar tamamlanmadan bu operasyona giriş yapılamaz (üretim parametresi: operasyon sırası zorunlu).'),
                    { status: 400, code: 'ERR-MFG-OP-SEQ' }
                );
            }
        }
        assertOperationQtyAllowed(prodParams, op, quantity);
        const rate = Number(op.planned_quantity) > 0 ? quantity / Number(op.planned_quantity) : 1;
        const consume = opts.consume_materials !== false;
        if (prodParams.require_material_consume && consume === false) {
            throw Object.assign(
                new Error('Malzeme tüketimi zorunlu (üretim parametreleri).'),
                { status: 400, code: 'ERR-MFG-CONSUME' }
            );
        }

        const bilesenler = await client.query(
            `
            SELECT b.*, st.item_type, st.uom_code AS stock_uom, st.item_code, st.item_name
            FROM production_order_operation_components b
            JOIN items st ON st.id = b.item_id
            WHERE b.operation_id=$1 FOR UPDATE
            `,
            [op.id]
        );

        const depoGrup = new Map();
        const materialSnapshot = [];
        if (consume) {
            const manual = Array.isArray(opts.materials)
                ? opts.materials.filter((m) => m && m.item_id && Number(m.quantity) > 0 && !m.is_byproduct)
                : [];
            if (manual.length) {
                for (const [i, m] of manual.entries()) {
                    const depoId = Number(m.warehouse_id)
                        || Number(opts.material_warehouse_id)
                        || pickConsumptionWarehouse(emir, m.line_type || m.item_type);
                    if (!depoId) throw new Error('Malzeme çıkış deposu gerekli.');
                    if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
                    depoGrup.get(depoId).push({
                        item_id: Number(m.item_id),
                        quantity: Number(m.quantity),
                        direction: -1,
                        uom_code: m.uom_code || null,
                    });
                    materialSnapshot.push({ ...m, line_no: m.line_no || i + 1, is_byproduct: false });
                }
            } else {
                for (const [i, b] of bilesenler.rows.entries()) {
                    const qty = Number(b.planned_quantity) * rate;
                    const depoId = Number(opts.material_warehouse_id)
                        || pickConsumptionWarehouse(emir, b.item_type);
                    if (!depoGrup.has(depoId)) depoGrup.set(depoId, []);
                    depoGrup.get(depoId).push({
                        item_id: b.item_id,
                        quantity: qty,
                        direction: -1,
                        uom_code: b.uom_code || b.stock_uom,
                    });
                    await client.query(
                        `UPDATE production_order_operation_components
                         SET consumed_quantity = consumed_quantity + $1 WHERE id=$2`,
                        [qty, b.id]
                    );
                    materialSnapshot.push({
                        line_no: b.line_no || i + 1,
                        line_type: b.item_type || 'Hammadde',
                        item_id: b.item_id,
                        item_code: b.item_code,
                        item_name: b.item_name,
                        unit_quantity: Number(b.planned_quantity),
                        quantity: qty,
                        net_quantity: qty,
                        gross_quantity: qty,
                        scrap_quantity: 0,
                        rework_quantity: 0,
                        uom_code: b.uom_code || b.stock_uom,
                        warehouse_id: depoId,
                        is_byproduct: false,
                    });
                }
            }
        }

        let tuketimHareketId = null;
        for (const [depoId, satirlar] of depoGrup.entries()) {
            const h = await createStockMovement(client, {
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

        // Yan ürünler (opsiyonel giriş)
        const byproducts = Array.isArray(opts.materials)
            ? opts.materials.filter((m) => m && m.is_byproduct && m.item_id && Number(m.quantity) > 0)
            : [];
        for (const [i, m] of byproducts.entries()) {
            const depoId = Number(m.warehouse_id) || Number(opts.byproduct_warehouse_id) || Number(opts.product_warehouse_id);
            if (!depoId) continue;
            await createStockMovement(client, {
                hareketTipi: 'URETIM_GIRIS',
                isYeriId: emir.plant_id,
                depoId,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                description: `${emir.order_no} yan ürün`,
                depoZorunluAtla: true,
                satirlar: [{
                    item_id: Number(m.item_id),
                    quantity: Number(m.quantity),
                    direction: 1,
                    uom_code: m.uom_code || null,
                    stock_status: 'Kullanilabilir',
                }],
            });
            materialSnapshot.push({ ...m, line_no: m.line_no || 900 + i, is_byproduct: true });
        }

        let mamulHareketId = null;
        let productWarehouseId = Number(opts.product_warehouse_id) || null;
        if (op.output_item_id) {
            const cikti = await client.query(
                'SELECT id, uom_code, item_type FROM items WHERE id=$1',
                [op.output_item_id]
            );
            let girisDepoId = productWarehouseId;
            if (!girisDepoId) {
                const ckk = await resolveOutgoingQcWarehouse(client, emir.plant_id);
                if (!ckk) throw new Error('Çıkış kalite deposu tanımlı değil (CKK_DEPO_KODU / warehouse_role=CKK).');
                girisDepoId = ckk.id;
            }
            productWarehouseId = girisDepoId;
            const hedefDepo = await resolveOutgoingQcTargetWarehouse(client, op.output_item_id, emir.plant_id);
            for (const wid of [girisDepoId, hedefDepo?.id].filter(Boolean)) {
                await client.query(
                    `INSERT INTO item_warehouses (item_id, warehouse_id, plant_id, is_active)
                     SELECT $1,$2,$3,TRUE WHERE NOT EXISTS (
                       SELECT 1 FROM item_warehouses WHERE item_id=$1 AND warehouse_id=$2
                     )`,
                    [op.output_item_id, wid, emir.plant_id]
                );
            }
            const h = await createStockMovement(client, {
                hareketTipi: 'URETIM_GIRIS',
                isYeriId: emir.plant_id,
                depoId: girisDepoId,
                belgeTipi: 'URETIM_EMRI_OP',
                belgeId: op.id,
                description: `${emir.order_no} / ${op.operation_code} çıktı`,
                depoZorunluAtla: true,
                satirlar: [{
                    item_id: op.output_item_id,
                    quantity,
                    direction: 1,
                    uom_code: cikti.rows[0].uom_code,
                    stock_status: opts.skip_qc ? 'Kullanilabilir' : 'Kalitede',
                }],
            });
            mamulHareketId = h.hareket.id;
            if (!opts.skip_qc) {
                await createQcOrder(client, {
                    direction: 'CKK',
                    stokId: op.output_item_id,
                    partiId: h.satirlar[0]?.lot_id || null,
                    depoId: girisDepoId,
                    hedefDepoId: hedefDepo?.id || null,
                    quantity,
                    kaynakTipi: 'URETIM_EMRI',
                    kaynakId: emirId,
                    stokHareketId: mamulHareketId,
                    description: `${emir.order_no} çıkış kalite (${cikti.rows[0].item_type || 'Mamul'})`,
                });
            }
        }

        await client.query(
            `UPDATE production_order_operations
             SET produced_quantity = produced_quantity + $1,
                 status=CASE WHEN produced_quantity + $1 + 1e-9 >= planned_quantity THEN 'Tamamlandi' ELSE 'Hazir' END
             WHERE id=$2`,
            [quantity, op.id]
        );

        if (op.next_line_no) {
            await client.query(
                `
                UPDATE production_order_operations
                SET status='Hazir'
                WHERE order_id=$1 AND line_no=$2 AND status='Bekliyor'
                `,
                [emirId, op.next_line_no]
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
        if (kalanOps.rows[0].c === 0 && prodParams.auto_close_on_complete) {
            const emirFresh = await client.query(
                'SELECT planned_quantity, produced_quantity FROM production_orders WHERE id=$1',
                [emirId]
            );
            assertOrderCloseQtyAllowed(prodParams, emirFresh.rows[0] || emir);
            await client.query(`UPDATE production_orders SET status='Kapali' WHERE id=$1`, [emirId]);
            if (emir.project_code) {
                try {
                    const { fromProductionOrder } = require('../src/services/prjCostService');                    const refreshed = await client.query(`SELECT * FROM production_orders WHERE id=$1`, [emirId]);
                    await fromProductionOrder(client, { order: refreshed.rows[0] });
                } catch (_) { /* PRJ yoksa sessiz */ }
            }
        }

        const netQty = opts.net_quantity != null ? Number(opts.net_quantity) : quantity;
        const grossQty = opts.gross_quantity != null ? Number(opts.gross_quantity) : quantity;
        const scrapQty = opts.scrap_quantity != null ? Number(opts.scrap_quantity) : 0;
        const reworkQty = opts.rework_quantity != null ? Number(opts.rework_quantity) : 0;
        const girisNo = opts.receipt_no || await nextDocumentNo(client, 'URETIM_GIRIS');
        const ins = await client.query(
            `
            INSERT INTO production_receipts
                (receipt_no, order_id, quantity, consumption_movement_id, finished_good_movement_id,
                 plant_id, operation_id, work_center_id, actual_work_center_id, source_type,
                 consume_materials, net_quantity, gross_quantity, scrap_quantity, rework_quantity,
                 uom_code, serial_no, shift_code, product_warehouse_id, material_warehouse_id,
                 wip_warehouse_id, scrap_warehouse_id, byproduct_warehouse_id,
                 started_at, ended_at, description, company_id, receipt_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,COALESCE($28,CURRENT_DATE))
            RETURNING id
            `,
            [
                girisNo, emirId, quantity, tuketimHareketId, mamulHareketId,
                opts.plant_id || emir.plant_id || null,
                op.id,
                opts.work_center_id || op.work_center_id || null,
                opts.actual_work_center_id || opts.work_center_id || op.work_center_id || null,
                opts.source_type || 'Operasyonel',
                consume,
                netQty, grossQty, scrapQty, reworkQty,
                opts.uom_code || null,
                opts.serial_no || null,
                opts.shift_code || null,
                productWarehouseId,
                Number(opts.material_warehouse_id) || null,
                Number(opts.wip_warehouse_id) || null,
                Number(opts.scrap_warehouse_id) || null,
                Number(opts.byproduct_warehouse_id) || null,
                opts.started_at || null,
                opts.ended_at || null,
                opts.description || null,
                opts.company_id || emir.company_id || null,
                opts.receipt_date || null,
            ]
        );
        const receiptId = ins.rows[0].id;
        for (const [i, m] of materialSnapshot.entries()) {
            await client.query(
                `
                INSERT INTO production_receipt_materials (
                  receipt_id, line_no, line_type, item_id, item_code, item_name, alternative_no,
                  quantity_type, unit_quantity, quantity, scrap_quantity, rework_quantity,
                  gross_quantity, net_quantity, uom_code, warehouse_id, warehouse_code, warehouse_name,
                  warehouse_balance, lot_no, note, revision, brand, feature_3, general_feature_1,
                  entry_mode, source_ref, source_material_id, is_byproduct
                ) VALUES (
                  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
                )
                `,
                [
                    receiptId, m.line_no || i + 1, m.line_type || null, m.item_id || null,
                    m.item_code || null, m.item_name || null, m.alternative_no || null,
                    m.quantity_type || 'Net', m.unit_quantity ?? null, Number(m.quantity) || 0,
                    Number(m.scrap_quantity) || 0, Number(m.rework_quantity) || 0,
                    (m.gross_quantity ?? Number(m.quantity)) || 0, (m.net_quantity ?? Number(m.quantity)) || 0,
                    m.uom_code || null, m.warehouse_id || null, m.warehouse_code || null, m.warehouse_name || null,
                    m.warehouse_balance ?? null, m.lot_no || null, m.note || null, m.revision || null,
                    m.brand || null, m.feature_3 || null, m.general_feature_1 || null,
                    m.entry_mode || null, m.source_ref || null, m.source_material_id || null,
                    Boolean(m.is_byproduct),
                ]
            );
        }

        return {
            operation_code: op.operation_code,
            operation_id: op.id,
            quantity,
            receipt_id: receiptId,
            receipt_no: girisNo,
        };
    });

    return { tamamlanan: result, emir: await getQcOrder(emirId) };
}

router.put('/:id', async (req, res) => {
    try {
        const b = req.body || {};
        const allowed = ['Taslak', 'OnayBekliyor', 'Acik', 'Uretimde', 'Kapali', 'Iptal'];
        if (b.status && !allowed.includes(b.status)) {
            return res.status(400).json({ hata: `Geçersiz durum. İzin verilen: ${allowed.join(', ')}` });
        }
        if (b.planned_firm && !['Planli', 'Kesin'].includes(b.planned_firm)) {
            return res.status(400).json({ hata: "planned_firm 'Planli' veya 'Kesin' olmalı." });
        }
        if (b.is_open && !['Acik', 'Kapali'].includes(b.is_open)) {
            return res.status(400).json({ hata: "is_open 'Acik' veya 'Kapali' olmalı." });
        }
        let tipPlanli = b.planned_firm || null;
        if (b.order_type_id && !tipPlanli) {
            const t = await pool.query('SELECT planned_firm FROM production_order_types WHERE id=$1', [b.order_type_id]);
            tipPlanli = t.rows[0]?.planned_firm || null;
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
            const yeniMiktar = b.planned_quantity != null ? Number(b.planned_quantity) : Number(m.planned_quantity);

            if (b.product_bom_id != null || b.route_id != null || b.item_id != null) {
                await validateBomRouting(client, {
                    urunAgaciId: yeniAgac,
                    rotaId: yeniRota,
                    stokId: yeniStok,
                    quantity: yeniMiktar,
                    tarih: b.order_date || m.order_date,
                });
            }

            let acikKapali = b.is_open || null;
            if (!acikKapali && b.status) {
                acikKapali = ['Kapali', 'Iptal'].includes(b.status) ? 'Kapali' : 'Acik';
            }

            const upd = await client.query(
                `
                UPDATE production_orders SET
                    planned_quantity = COALESCE($2, planned_quantity),
                    status = COALESCE($3, status),
                    sales_order_id = COALESCE($4, sales_order_id),
                    order_type_id = COALESCE($5, order_type_id),
                    planned_firm = COALESCE($6, planned_firm),
                    is_started = COALESCE($7, is_started),
                    issue_type = COALESCE($8, issue_type),
                    receipt_type = COALESCE($9, receipt_type),
                    is_deleted = COALESCE($10, is_deleted),
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
                    is_open = COALESCE($25, is_open),
                    is_approved = COALESCE($26, is_approved),
                    is_released = COALESCE($27, is_released),
                    is_printed = COALESCE($28, is_printed),
                    product_receipt_completed = COALESCE($29, product_receipt_completed),
                    description = COALESCE($30, description),
                    project_code = COALESCE($31, project_code)
                WHERE id = $1
                RETURNING id
                `,
                [
                    req.params.id,
                    b.planned_quantity ?? null,
                    b.status || null,
                    b.sales_order_id !== undefined ? b.sales_order_id : null,
                    b.order_type_id || null,
                    tipPlanli,
                    typeof b.is_started === 'boolean' ? b.is_started : null,
                    b.issue_type || null,
                    b.receipt_type || null,
                    typeof b.is_deleted === 'boolean' ? b.is_deleted : null,
                    b.source_document_type || null,
                    b.source_document_id !== undefined ? b.source_document_id : null,
                    b.plant_id || null,
                    b.component_warehouse_id || null,
                    b.wip_warehouse_id !== undefined ? b.wip_warehouse_id : null,
                    b.fg_warehouse_id || null,
                    b.item_id || null,
                    b.product_bom_id || null,
                    b.route_id || null,
                    dateDay(b.order_date),
                    dateTimeValue(b.plan_start),
                    dateTimeValue(b.plan_end),
                    dateTimeValue(b.end_date),
                    b.uom_code || null,
                    acikKapali,
                    typeof b.is_approved === 'boolean' ? b.is_approved : null,
                    typeof b.is_released === 'boolean' ? b.is_released : null,
                    typeof b.is_printed === 'boolean' ? b.is_printed : null,
                    typeof b.product_receipt_completed === 'boolean' ? b.product_receipt_completed : null,
                    b.description !== undefined ? b.description : null,
                    b.project_code !== undefined ? b.project_code : null,
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
                            (order_id, item_id, planned_quantity, consumed_quantity, uom_code, line_no, warehouse_id)
                        VALUES ($1,$2,$3,$4,$5,$6,$7)
                        `,
                        [
                            req.params.id,
                            row.item_id,
                            row.planned_quantity ?? row.quantity ?? 0,
                            row.consumed_quantity ?? 0,
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
                            planned_quantity = COALESCE($2, planned_quantity),
                            operation_name = COALESCE($3, operation_name),
                            work_center_id = COALESCE($4, work_center_id),
                            status = COALESCE($5, status)
                        WHERE id=$1 AND order_id=$6
                        `,
                        [
                            op.id,
                            op.planned_quantity ?? null,
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

        res.json(await getQcOrder(id));
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(err.status || 500).json({ hata: err.message });
    }
});

/** BOM + rota + miktardan malzeme ve operasyon satırlarını yeniden üretir. */
router.post('/:id/detaylari-doldur', async (req, res) => {
    try {
        const result = await withTransaction(pool, async (client) => {
            await canFillOrderDetails(client, req.params.id);
            const emir = await client.query('SELECT * FROM production_orders WHERE id=$1', [req.params.id]);
            const e = emir.rows[0];
            const { agac, rotaOps } = await validateBomRouting(client, {
                urunAgaciId: e.product_bom_id,
                rotaId: e.route_id,
                stokId: e.item_id,
                quantity: e.planned_quantity,
                tarih: e.order_date,
            });
            const carpan = Number(e.planned_quantity) / Number(agac.quantity || 1);
            const opN = await fillOrderOperations(client, e.id, {
                rotaOps,
                planlananMiktar: e.planned_quantity,
                bilesenCarpan: carpan,
            });
            const malN = await fillOrderMaterials(client, e.id, {
                urunAgaciId: e.product_bom_id,
                planlananMiktar: e.planned_quantity,
                agacMiktar: agac.quantity,
                hammaddeDepoId: e.component_warehouse_id,
            });
            return { operasyon: opN, material: malN };
        });
        const emir = await getQcOrder(req.params.id);
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
            await canFillOrderDetails(client, req.params.id);
            const emir = await client.query('SELECT * FROM production_orders WHERE id=$1', [req.params.id]);
            const e = emir.rows[0];
            const yeniAgac = product_bom_id != null ? Number(product_bom_id) : Number(e.product_bom_id);
            const yeniRota = route_id != null ? Number(route_id) : Number(e.route_id);
            const { agac, rotaOps } = await validateBomRouting(client, {
                urunAgaciId: yeniAgac,
                rotaId: yeniRota,
                stokId: e.item_id,
                quantity: e.planned_quantity,
                tarih: e.order_date,
            });
            await client.query(
                `UPDATE production_orders SET product_bom_id=$2, route_id=$3 WHERE id=$1`,
                [e.id, yeniAgac, yeniRota],
            );
            if (detaylari_doldur) {
                const carpan = Number(e.planned_quantity) / Number(agac.quantity || 1);
                await fillOrderOperations(client, e.id, {
                    rotaOps,
                    planlananMiktar: e.planned_quantity,
                    bilesenCarpan: carpan,
                });
                await fillOrderMaterials(client, e.id, {
                    urunAgaciId: yeniAgac,
                    planlananMiktar: e.planned_quantity,
                    agacMiktar: agac.quantity,
                    hammaddeDepoId: e.component_warehouse_id,
                });
            }
        });
        res.json(await getQcOrder(req.params.id));
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
            SET status = 'Acik', is_approved = TRUE, is_open = 'Acik'
            WHERE id = $1 AND status IN ('Taslak', 'OnayBekliyor')
            RETURNING id
            `,
            [req.params.id]
        );
        if (!upd.rows[0]) {
            return res.status(400).json({
                hata: 'Emir onaylanamadı (bulunamadı veya durumu Taslak/OnayBekliyor değil).',
            });
        }
        res.json(await getQcOrder(upd.rows[0].id));
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
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
                hata: 'Emir başlatılamadı (bulunamadı, zaten başlatılmış veya durumu uygun değil).',
            });
        }
        res.json(await getQcOrder(upd.rows[0].id));
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM production_orders WHERE id=$1 RETURNING id`, [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ hata: 'Üretim emri bulunamadı.' });
        res.json({ is_deleted: true, id: Number(req.params.id) });
    } catch (err) {
        if (err.code === '23503') {
                    return res.status(409).json({
                        hata: 'Kayıt bağlı veriler nedeniyle silinemedi veya güncellenemedi. Önce ilişkili kayıtları kaldırın.',
                        kod: 'ERR-FK-23503',
                    });
                }
        res.status(500).json({ hata: err.message });
    }
});

router.tamamlaOperasyonInternal = tamamlaOperasyonInternal;
router.getProductionOrder = getQcOrder;
module.exports = router;
