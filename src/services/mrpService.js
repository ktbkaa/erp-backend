const { depoBakiyeListesi } = require('./stokHareketService');

/**
 * MRP motoru — parametre destekli (konsol):
 * 1) Bağımsız ihtiyaç (BI + SO ± tahmin iskeleti)
 * 2) BOM patlatma → bağımlı
 * 3) Brüt → net (stok / SA / UE / opsiyonel PR)
 * 4) Öneri + mesaj günlüğü
 */

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function truthy(v, fallback = false) {
    if (v === undefined || v === null || v === '') return fallback;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'evet', 'yes', 'on'].includes(s)) return true;
    if (['0', 'false', 'hayir', 'hayır', 'no', 'off'].includes(s)) return false;
    return fallback;
}

function toIdList(v) {
    if (v == null || v === '') return [];
    const arr = Array.isArray(v) ? v : String(v).split(',');
    return [...new Set(arr.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
}

function toStrList(v) {
    if (v == null || v === '') return [];
    const arr = Array.isArray(v) ? v : String(v).split(',');
    return [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))];
}

/** pg Date / string → YYYY-MM-DD */
function toDateStr(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return null;
}

function addDays(dateStr, days) {
    const base = toDateStr(dateStr) || toDateStr(new Date());
    const d = new Date(`${base}T12:00:00`);
    d.setDate(d.getDate() + Number(days || 0));
    return toDateStr(d);
}

function todayStr() {
    return toDateStr(new Date());
}

/** Varsayılan konsol parametreleri */
function defaultMrpParametre(partial = {}) {
    const start = toDateStr(partial.start_date) || todayStr();
    const end = toDateStr(partial.end_date) || addDays(start, 90);
    return {
        start_date: start,
        end_date: end,
        notes: partial.notes || '',
        // Stok
        include_order_level_items: truthy(partial.include_order_level_items, false),
        ignore_safety_when_no_demand: truthy(partial.ignore_safety_when_no_demand, true),
        negative_stock_as_zero: truthy(partial.negative_stock_as_zero, true),
        include_passive_items: truthy(partial.include_passive_items, false),
        supply_in_period_as_available: truthy(partial.supply_in_period_as_available, true),
        safety_stock_date_type: partial.safety_stock_date_type || 'ihtiyac',
        item_mrp_param_control: partial.item_mrp_param_control || 'durdur',
        // Satınalma
        consider_po: truthy(partial.consider_po, true),
        open_po_as_on_hand: truthy(partial.open_po_as_on_hand, true),
        ignore_frozen_po: truthy(partial.ignore_frozen_po, false),
        consider_pr: truthy(partial.consider_pr, false),
        ignore_po_without_delivery_date: truthy(partial.ignore_po_without_delivery_date, true),
        check_po_approval: truthy(partial.check_po_approval, false),
        check_pr_approval: truthy(partial.check_pr_approval, false),
        // Satış
        ignore_so_without_ship_date: truthy(partial.ignore_so_without_ship_date, false),
        check_so_approval: truthy(partial.check_so_approval, false),
        so_forecast_mode: partial.so_forecast_mode || 'sales_orders',
        // Üretim
        open_wo_as_on_hand: truthy(partial.open_wo_as_on_hand, true),
        ignore_frozen_production: truthy(partial.ignore_frozen_production, false),
        ignore_min_production_qty: truthy(partial.ignore_min_production_qty, false),
        wo_program_mode: partial.wo_program_mode || 'isemri',
        bulk_explode_warning: partial.bulk_explode_warning || 'uyar',
        planned_wo_mode: partial.planned_wo_mode || 'dahil',
        // Modül kesim
        po_cutoff_date: toDateStr(partial.po_cutoff_date) || end,
        so_cutoff_date: toDateStr(partial.so_cutoff_date) || end,
        wo_cutoff_date: toDateStr(partial.wo_cutoff_date) || end,
        // Kapsam (boş = hepsi)
        warehouse_ids: toIdList(partial.warehouse_ids),
        wo_type_ids: toIdList(partial.wo_type_ids),
        so_order_types: toStrList(partial.so_order_types),
        po_movement_code_ids: toIdList(partial.po_movement_code_ids),
        pr_movement_code_ids: toIdList(partial.pr_movement_code_ids),
        // İskelet: MPS / satış tahmin satırları
        mps_rows: Array.isArray(partial.mps_rows) ? partial.mps_rows : [],
        forecast_rows: Array.isArray(partial.forecast_rows) ? partial.forecast_rows : [],
    };
}

function makeLogger() {
    const messages = [];
    const push = (level, code, message) => {
        messages.push({
            level: String(level || 'INFO').toUpperCase(),
            code: code || null,
            message: String(message || ''),
        });
    };
    return {
        messages,
        info: (code, msg) => push('INFO', code, msg),
        warn: (code, msg) => push('WARN', code, msg),
        error: (code, msg) => push('ERROR', code, msg),
    };
}

/**
 * Transaction içinde başarısız sorgu tüm Tx'i öldürmesin diye SAVEPOINT kullan.
 * Pool üzerindeki tek sorgular için doğrudan query.
 */
async function safeQuery(pool, sql, params = []) {
    if (!pool || typeof pool.query !== 'function') return { rows: [] };
    // Client (transaction) mi?
    const isClient = typeof pool.release === 'function' || pool._connected === true
        || (pool.constructor && /Client/i.test(pool.constructor.name));
    if (!isClient) {
        try {
            return await pool.query(sql, params);
        } catch (_) {
            return { rows: [] };
        }
    }
    const sp = `mrp_sp_${Math.random().toString(36).slice(2, 10)}`;
    try {
        await pool.query(`SAVEPOINT ${sp}`);
        const r = await pool.query(sql, params);
        await pool.query(`RELEASE SAVEPOINT ${sp}`);
        return r;
    } catch (err) {
        try { await pool.query(`ROLLBACK TO SAVEPOINT ${sp}`); } catch (_) { /* ignore */ }
        return { rows: [], error: err };
    }
}

async function loadStokMap(pool, { stokId = null, firmaId = null, includePassive = false } = {}) {
    const params = [];
    let where = includePassive ? 'WHERE 1=1' : 'WHERE s.is_active IS DISTINCT FROM FALSE';
    if (stokId) {
        params.push(stokId);
        where += ` AND s.id = $${params.length}`;
    }
    if (firmaId) {
        params.push(firmaId);
        where += ` AND (s.company_id IS NULL OR s.company_id = $${params.length})`;
    }
    const r = await pool.query(
        `SELECT s.id, s.item_code, s.item_name, s.item_type, s.tedarik_type, s.uom_code,
                COALESCE(s.safety_stock, 0)::numeric AS safety_stock,
                COALESCE(s.reorder_level, 0)::numeric AS reorder_level,
                s.fixed_order_quantity,
                COALESCE(s.temin_suresi_days, 0)::int AS temin_suresi_days,
                s.is_active
         FROM items s ${where}
         ORDER BY s.item_code`,
        params
    );
    const map = new Map();
    r.rows.forEach((row) => map.set(String(row.id), row));
    return map;
}

async function loadBomChildren(pool) {
    const r = await pool.query(
        `SELECT ua.finished_good_item_id, ua.quantity AS baz_miktar,
                us.component_item_id, us.quantity AS bilesen_miktar, us.uom_code
         FROM boms ua
         JOIN bom_lines us ON us.product_bom_id = ua.id
         WHERE ua.is_active IS DISTINCT FROM FALSE
           AND (us.parent_line_id IS NULL)
         ORDER BY ua.finished_good_item_id, us.line_no`
    );
    const byParent = new Map();
    for (const row of r.rows) {
        const k = String(row.finished_good_item_id);
        if (!byParent.has(k)) byParent.set(k, []);
        byParent.get(k).push(row);
    }
    return byParent;
}

async function loadSupplyMaps(pool, {
    isYeriId = null,
    stokId = null,
    parametre = {},
    log = null,
} = {}) {
    const p = defaultMrpParametre(parametre);
    const bakiyeler = await depoBakiyeListesi(pool, { stokStatu: 'Kullanilabilir', stokId });
    const kullanilabilir = new Map();
    let skippedWh = 0;
    for (const b of bakiyeler) {
        if (p.warehouse_ids.length && !p.warehouse_ids.includes(Number(b.warehouse_id))) {
            skippedWh += 1;
            continue;
        }
        let qty = num(b.bakiye);
        if (p.negative_stock_as_zero && qty < 0) qty = 0;
        const k = String(b.item_id);
        kullanilabilir.set(k, (kullanilabilir.get(k) || 0) + qty);
    }
    if (skippedWh && log) {
        log.info('WH_FILTER', `${skippedWh} depo bakiyesi kapsam dışı bırakıldı.`);
    }

    const acikSiparis = new Map();
    if (p.consider_po) {
        const poParams = [];
        let poSql = `
            SELECT ss.item_id,
                   SUM(GREATEST(ss.quantity - COALESCE(ss.giren_quantity,0), 0))::numeric AS acik_siparis
            FROM purchase_order_lines ss
            JOIN purchase_orders s ON s.id = ss.purchase_order_id
            WHERE s.status NOT IN ('Iptal', 'Kapali')
              AND COALESCE(s.silindi, FALSE) IS DISTINCT FROM TRUE`;
        if (p.check_po_approval) {
            poSql += ` AND (s.approved_by IS NOT NULL OR s.onay_date IS NOT NULL OR s.status ILIKE '%onay%')`;
        }
        if (p.ignore_po_without_delivery_date) {
            poSql += ` AND s.delivery_date IS NOT NULL`;
        }
        if (p.po_cutoff_date) {
            poParams.push(p.po_cutoff_date);
            poSql += ` AND (s.delivery_date IS NULL OR s.delivery_date <= $${poParams.length}::date)`;
        }
        if (p.po_movement_code_ids.length) {
            poParams.push(p.po_movement_code_ids);
            poSql += ` AND s.movement_code_id = ANY($${poParams.length}::bigint[])`;
        }
        if (isYeriId) {
            poParams.push(isYeriId);
            poSql += ` AND (s.plant_id IS NULL OR s.plant_id = $${poParams.length})`;
        }
        poSql += ' GROUP BY ss.item_id';
        const sas = await safeQuery(pool, poSql, poParams);
        if (sas.error && log) log.warn('PO_LOAD', `Satınalma siparişleri okunamadı: ${sas.error.message}`);
        sas.rows.forEach((r) => acikSiparis.set(String(r.item_id), num(r.acik_siparis)));
        if (!p.open_po_as_on_hand) {
            acikSiparis.clear();
            if (log) log.info('PO_OFF', 'Açık satınalma siparişleri eldeki sayılmadı.');
        }
    } else if (log) {
        log.info('PO_SKIP', 'Satınalma siparişleri dikkate alınmadı.');
    }

    // Opsiyonel: açık satınalma talepleri arz
    if (p.consider_pr) {
        const prParams = [];
        let prSql = `
            SELECT tl.item_id,
                   SUM(COALESCE(tl.quantity, 0))::numeric AS acik_talep
            FROM purchase_requisition_lines tl
            JOIN purchase_requisitions t ON t.id = tl.requisition_id
            WHERE t.status NOT IN ('Iptal', 'Kapali', 'Kapandi')
              AND COALESCE(t.silindi, FALSE) IS DISTINCT FROM TRUE
              AND tl.item_id IS NOT NULL`;
        if (p.check_pr_approval) {
            prSql += ` AND (t.approved_by_user_id IS NOT NULL OR t.onay_date IS NOT NULL OR t.status ILIKE '%onay%')`;
        }
        if (isYeriId) {
            prParams.push(isYeriId);
            prSql += ` AND (t.plant_id IS NULL OR t.plant_id = $${prParams.length})`;
        }
        prSql += ' GROUP BY tl.item_id';
        const pr = await safeQuery(pool, prSql, prParams);
        if (pr.error && log) log.warn('PR_LOAD', `Satınalma talepleri okunamadı: ${pr.error.message}`);
        let prCount = 0;
        pr.rows.forEach((r) => {
            const k = String(r.item_id);
            const q = num(r.acik_talep);
            if (q <= 0) return;
            acikSiparis.set(k, (acikSiparis.get(k) || 0) + q);
            prCount += 1;
        });
        if (log && prCount) log.info('PR_SUPPLY', `${prCount} kalemde açık satınalma talebi arza eklendi.`);
    }

    const planUretim = new Map();
    if (p.open_wo_as_on_hand) {
        const ueParams = [];
        let ueSql = `
            SELECT item_id,
                   SUM(GREATEST(planlanan_quantity - COALESCE(produced_quantity,0), 0))::numeric AS plan_uretim
            FROM production_orders
            WHERE status NOT IN ('Kapali', 'Iptal', 'Tamamlandi')
              AND COALESCE(silindi, FALSE) IS DISTINCT FROM TRUE`;
        if (isYeriId) {
            ueParams.push(isYeriId);
            ueSql += ` AND plant_id = $${ueParams.length}`;
        }
        if (p.wo_type_ids.length) {
            ueParams.push(p.wo_type_ids);
            ueSql += ` AND order_type_id = ANY($${ueParams.length}::bigint[])`;
        }
        if (p.wo_cutoff_date) {
            ueParams.push(p.wo_cutoff_date);
            ueSql += ` AND (
                (end_date IS NULL AND plan_end IS NULL)
                OR COALESCE(end_date, plan_end) <= $${ueParams.length}::date
            )`;
        }
        if (p.planned_wo_mode === 'kesin') {
            ueSql += ` AND COALESCE(planli_kesin, FALSE) = TRUE`;
        }
        ueSql += ' GROUP BY item_id';
        const ueArz = await safeQuery(pool, ueSql, ueParams);
        if (ueArz.error && log) log.warn('WO_LOAD', `İş emri arzı okunamadı: ${ueArz.error.message}`);
        ueArz.rows.forEach((r) => planUretim.set(String(r.item_id), num(r.plan_uretim)));
    } else if (log) {
        log.info('WO_OFF', 'Açık iş emri miktarı eldeki sayılmadı.');
    }

    return { kullanilabilir, acikSiparis, planUretim };
}

/**
 * Bağımsız ihtiyaç: BI + SO (± tahmin iskeleti / MPS iskeleti)
 */
async function loadIndependentDemand(pool, {
    isYeriId = null,
    firmaId = null,
    parametre = {},
    log = null,
} = {}) {
    const p = defaultMrpParametre(parametre);
    const demand = new Map();
    let skippedSoNoDate = 0;
    let skippedSoApproval = 0;
    let shiftedDates = 0;

    const bump = (stokId, qty, date, source) => {
        const k = String(stokId);
        if (!demand.has(k)) demand.set(k, { qty: 0, date: date || null, sources: [] });
        const d = demand.get(k);
        d.qty += num(qty);
        if (date && (!d.date || date < d.date)) d.date = date;
        d.sources.push(source);
    };

    const inHorizon = (dateStr) => {
        if (!dateStr) return true;
        if (p.start_date && dateStr < p.start_date) return false;
        if (p.end_date && dateStr > p.end_date) return false;
        return true;
    };

    // Manuel / tahmin BI
    const biParams = [];
    let biSql = `
        SELECT item_id, quantity, ihtiyac_date, source, ihtiyac_no
        FROM mrp_independent_requirements
        WHERE is_active IS DISTINCT FROM FALSE`;
    if (isYeriId) {
        biParams.push(isYeriId);
        biSql += ` AND (plant_id IS NULL OR plant_id = $${biParams.length})`;
    }
    if (firmaId) {
        biParams.push(firmaId);
        biSql += ` AND (company_id IS NULL OR company_id = $${biParams.length})`;
    }
    const bi = await safeQuery(pool, biSql, biParams);
    bi.rows.forEach((r) => {
        let dt = toDateStr(r.ihtiyac_date);
        if (dt && p.start_date && dt < p.start_date) {
            if (log) log.warn('BI_DATE', `${r.ihtiyac_no} ihtiyaç tarihi ${dt} ufuk başından önce — ${p.start_date} alındı.`);
            dt = p.start_date;
            shiftedDates += 1;
        }
        if (dt && !inHorizon(dt) && p.end_date && dt > p.end_date) {
            if (log) log.info('BI_SKIP', `${r.ihtiyac_no} ufuk dışında atlandı (${dt}).`);
            return;
        }
        bump(r.item_id, r.quantity, dt, `BI:${r.ihtiyac_no}`);
    });

    const mode = String(p.so_forecast_mode || 'sales_orders');
    const useSo = mode === 'sales_orders' || mode === 'both' || mode === 'Satış Siparişleri';
    const useFc = mode === 'forecasts' || mode === 'both' || mode === 'Satış Tahminleri';

    if (useSo) {
        const soParams = [];
        let soSql = `
            SELECT s.order_no, s.order_type, s.status, s.approved_by, s.onay_date,
                   s.delivery_date, s.order_date,
                   sd.item_id,
                   SUM(GREATEST(
                     COALESCE(sd.bekleyen_quantity, sd.quantity - COALESCE(sd.shipped_quantity,0) - COALESCE(sd.delivered_quantity_x,0)),
                     0
                   ))::numeric AS kalan,
                   MIN(COALESCE(sd.delivery_date, s.delivery_date, s.order_date)) AS ihtiyac_date
            FROM sales_order_lines sd
            JOIN sales_orders s ON s.id = sd.sales_order_id
            WHERE s.status NOT IN ('Iptal', 'Kapali')
              AND sd.item_id IS NOT NULL`;
        if (isYeriId) {
            soParams.push(isYeriId);
            soSql += ` AND (s.plant_id IS NULL OR s.plant_id = $${soParams.length})`;
        }
        if (firmaId) {
            soParams.push(firmaId);
            soSql += ` AND (s.company_id IS NULL OR s.company_id = $${soParams.length})`;
        }
        if (p.so_order_types.length) {
            soParams.push(p.so_order_types);
            soSql += ` AND s.order_type = ANY($${soParams.length}::text[])`;
        }
        if (p.so_cutoff_date) {
            soParams.push(p.so_cutoff_date);
            soSql += ` AND COALESCE(sd.delivery_date, s.delivery_date, s.order_date) <= $${soParams.length}::date`;
        }
        soSql += ' GROUP BY s.order_no, s.order_type, s.status, s.approved_by, s.onay_date, s.delivery_date, s.order_date, sd.item_id';
        const so = await safeQuery(pool, soSql, soParams);
        if (so.error && log) log.warn('SO_LOAD', `Satış siparişleri okunamadı: ${so.error.message}`);
        so.rows.forEach((r) => {
            if (num(r.kalan) <= 0) return;
            if (p.check_so_approval && !(r.approved_by || r.onay_date || String(r.status || '').toLowerCase().includes('onay'))) {
                skippedSoApproval += 1;
                return;
            }
            if (p.ignore_so_without_ship_date && !r.delivery_date && !r.ihtiyac_date) {
                skippedSoNoDate += 1;
                if (log) log.warn('SO_NODATE', `SO ${r.order_no} teslim tarihi boş — atlandı.`);
                return;
            }
            let dt = toDateStr(r.ihtiyac_date);
            if (dt && p.start_date && dt < p.start_date) {
                if (log) log.warn('SO_DATE', `SO ${r.order_no} ihtiyaç tarihi ${dt} geride — ${p.start_date} alındı.`);
                dt = p.start_date;
                shiftedDates += 1;
            }
            if (dt && p.end_date && dt > p.end_date) return;
            bump(r.item_id, r.kalan, dt, `SO:${r.order_no}`);
        });
    } else if (log) {
        log.info('SO_SKIP', 'Satış siparişleri çalışma tipine göre dahil edilmedi.');
    }

    // Satış tahmin iskeleti (manuel satırlar)
    if (useFc && Array.isArray(p.forecast_rows)) {
        for (const row of p.forecast_rows) {
            const itemId = num(row.item_id);
            const qty = num(row.quantity);
            if (!itemId || qty <= 0) continue;
            const dt = toDateStr(row.ihtiyac_date) || p.start_date;
            if (dt && p.end_date && dt > p.end_date) continue;
            bump(itemId, qty, dt, `Tahmin:${row.code || row.id || ''}`);
        }
        if (log && p.forecast_rows.length) {
            log.info('FC_SKELETON', `${p.forecast_rows.length} satış tahmin satırı bağımsız ihtiyaca eklendi.`);
        }
    }

    // MPS iskeleti
    if (Array.isArray(p.mps_rows) && p.mps_rows.length) {
        for (const row of p.mps_rows) {
            const itemId = num(row.item_id);
            const qty = num(row.quantity);
            if (!itemId || qty <= 0) continue;
            const dt = toDateStr(row.ihtiyac_date) || p.start_date;
            bump(itemId, qty, dt, `MPS:${row.code || row.id || ''}`);
        }
        if (log) log.info('MPS_SKELETON', `${p.mps_rows.length} MPS satırı bağımsız ihtiyaca eklendi.`);
    }

    if (log && skippedSoNoDate) log.info('SO_NODATE_SUM', `${skippedSoNoDate} satış siparişi tarihsiz atlandı.`);
    if (log && skippedSoApproval) log.info('SO_APPROVAL', `${skippedSoApproval} satış siparişi onay kontrolünden geçemedi.`);
    if (log && shiftedDates) log.info('DATE_SHIFT', `${shiftedDates} belge tarihi ufuk başına kaydırıldı.`);

    return demand;
}

function lotSize(net, stok, { ignoreMin = false } = {}) {
    if (ignoreMin) return net;
    const fixed = num(stok.fixed_order_quantity);
    if (fixed > 0) return Math.ceil(net / fixed) * fixed;
    return net;
}

function isUretim(stok) {
    const t = String(stok?.tedarik_type || '').toLowerCase();
    return t.includes('uret');
}

/**
 * BOM patlatmalı MRP hesaplaması (bellekte).
 * @returns {Promise<{ results: object[], messages: object[], parametre: object }>}
 */
async function mrpHesapla(pool, {
    isYeriId = null,
    firmaId = null,
    stokId = null,
    parametre = {},
} = {}) {
    const p = defaultMrpParametre(parametre);
    const log = makeLogger();
    log.info('START', `MRP ufuk ${p.start_date} → ${p.end_date}`);

    const stokMap = await loadStokMap(pool, {
        stokId: null,
        firmaId,
        includePassive: p.include_passive_items,
    });
    const bomByParent = await loadBomChildren(pool);
    const { kullanilabilir, acikSiparis, planUretim } = await loadSupplyMaps(pool, {
        isYeriId, stokId, parametre: p, log,
    });
    const independent = await loadIndependentDemand(pool, {
        isYeriId, firmaId, parametre: p, log,
    });

    const bagimsiz = new Map();
    const bagimli = new Map();
    const parentOf = new Map();
    const needDate = new Map();

    independent.forEach((d, k) => {
        bagimsiz.set(k, (bagimsiz.get(k) || 0) + d.qty);
        if (d.date) needDate.set(k, d.date);
    });

    // Açık UE bileşenleri → bağımlı
    {
        const bParams = [];
        let bSql = `
            SELECT ub.item_id,
                   SUM(GREATEST(ub.planlanan_quantity - COALESCE(ub.tuketilen_quantity,0), 0))::numeric AS ihtiyac
            FROM production_order_components ub
            JOIN production_orders ue ON ue.id = ub.order_id
            WHERE ue.status NOT IN ('Kapali', 'Iptal', 'Tamamlandi')`;
        if (isYeriId) {
            bParams.push(isYeriId);
            bSql += ` AND ue.plant_id = $${bParams.length}`;
        }
        if (p.wo_type_ids.length) {
            bParams.push(p.wo_type_ids);
            bSql += ` AND ue.order_type_id = ANY($${bParams.length}::bigint[])`;
        }
        bSql += ' GROUP BY ub.item_id';
        const br = await safeQuery(pool, bSql, bParams);
        br.rows.forEach((r) => {
            const cid = String(r.item_id);
            bagimli.set(cid, (bagimli.get(cid) || 0) + num(r.ihtiyac));
        });
    }

    const queue = [];
    independent.forEach((d, k) => {
        const st = stokMap.get(k);
        if (st && isUretim(st) && d.qty > 0) queue.push({ stokId: k, qty: d.qty, date: d.date, depth: 0 });
    });

    const visitedExplosion = new Set();
    let explodeCount = 0;
    while (queue.length) {
        const job = queue.shift();
        const key = `${job.stokId}:${job.qty}:${job.depth}`;
        if (visitedExplosion.has(key) || job.depth > 12) continue;
        visitedExplosion.add(key);

        const children = bomByParent.get(String(job.stokId)) || [];
        if (!children.length && p.bulk_explode_warning === 'uyar') {
            const st = stokMap.get(String(job.stokId));
            if (st && isUretim(st)) {
                log.warn('BOM_MISSING', `${st.item_code}: üretim tipi ama aktif BOM yok.`);
            }
        }
        const parent = stokMap.get(String(job.stokId));
        for (const ch of children) {
            const baz = num(ch.baz_miktar) || 1;
            const need = (num(ch.bilesen_miktar) / baz) * num(job.qty);
            if (need <= 0) continue;
            explodeCount += 1;
            const cid = String(ch.component_item_id);
            bagimli.set(cid, (bagimli.get(cid) || 0) + need);
            if (!parentOf.has(cid)) parentOf.set(cid, Number(job.stokId));
            const lead = num(parent?.temin_suresi_days);
            const childDate = job.date ? addDays(job.date, -lead) : null;
            if (childDate && (!needDate.has(cid) || childDate < needDate.get(cid))) {
                needDate.set(cid, childDate);
            }
            const childSt = stokMap.get(cid);
            if (childSt && isUretim(childSt)) {
                queue.push({ stokId: cid, qty: need, date: childDate, depth: job.depth + 1 });
            }
        }
    }
    if (explodeCount) log.info('BOM_EXPLODE', `${explodeCount} bileşen satırı patlatıldı.`);

    const ids = new Set([
        ...bagimsiz.keys(),
        ...bagimli.keys(),
        ...[...stokMap.keys()].filter((id) => {
            const s = stokMap.get(id);
            if (p.ignore_safety_when_no_demand) {
                return (bagimsiz.get(id) || 0) + (bagimli.get(id) || 0) > 0
                    || (kullanilabilir.get(id) || 0) !== 0;
            }
            return num(s.safety_stock) > 0 || num(s.reorder_level) > 0
                || (kullanilabilir.get(id) || 0) !== 0;
        }),
    ]);
    if (stokId) {
        ids.clear();
        ids.add(String(stokId));
    }

    const results = [];
    for (const id of ids) {
        const s = stokMap.get(id);
        if (!s) continue;
        if (!p.include_passive_items && s.is_active === false) continue;

        const bi = bagimsiz.get(id) || 0;
        const bd = bagimli.get(id) || 0;
        const brut = bi + bd;
        let emniyet = num(s.safety_stock);
        if (p.ignore_safety_when_no_demand && brut <= 0) emniyet = 0;
        const reorder = num(s.reorder_level);
        const eldeki = kullanilabilir.get(id) || 0;
        const siparis = acikSiparis.get(id) || 0;
        const uretim = planUretim.get(id) || 0;
        // Sipariş seviyesine göre takip: kapalıyken yalnızca ROP’lu / talepsiz / stoksuz kalemleri atla
        if (!p.include_order_level_items
            && brut <= 0 && eldeki === 0 && reorder > 0 && siparis === 0 && uretim === 0) {
            continue;
        }
        const applyRopGap = reorder > 0 && (p.include_order_level_items || brut > 0 || eldeki !== 0);
        const ropGap = applyRopGap ? Math.max(0, reorder - (eldeki + siparis + uretim)) : 0;
        const netRaw = Math.max(0, brut + emniyet + ropGap - eldeki - siparis - uretim);
        const onerilen = lotSize(netRaw, s, { ignoreMin: p.ignore_min_production_qty });
        let oneri = 'Yeterli';
        if (onerilen > 0) oneri = isUretim(s) ? 'Üretim emri' : 'Satınalma';

        let ihtiyacTarihi = needDate.get(id) || null;
        if (!ihtiyacTarihi && emniyet > 0 && p.safety_stock_date_type === 'ihtiyac') {
            ihtiyacTarihi = p.start_date;
        }
        const planlananBaslangic = ihtiyacTarihi
            ? addDays(ihtiyacTarihi, -num(s.temin_suresi_days))
            : addDays(p.start_date, -num(s.temin_suresi_days));

        results.push({
            id: s.id,
            item_id: s.id,
            item_code: s.item_code,
            item_name: s.item_name,
            item_type: s.item_type,
            tedarik_type: s.tedarik_type,
            uom_code: s.uom_code,
            level: parentOf.has(id) ? 1 : 0,
            source_item_id: parentOf.get(id) || null,
            bagimsiz_ihtiyac: bi,
            bagimli_ihtiyac: bd,
            brut_ihtiyac: brut,
            safety_stock: emniyet,
            reorder_point: reorder,
            available_stock: eldeki,
            acik_satinalma: siparis,
            planlanan_production: uretim,
            acik_uretim_ihtiyaci: bd,
            net_ihtiyac: netRaw,
            onerilen_quantity: onerilen,
            oneri,
            ihtiyac_date: ihtiyacTarihi,
            planlanan_start: planlananBaslangic,
            temin_suresi_days: num(s.temin_suresi_days),
        });
    }

    results.sort((a, b) => {
        if (b.net_ihtiyac !== a.net_ihtiyac) return b.net_ihtiyac - a.net_ihtiyac;
        return String(a.item_code).localeCompare(String(b.item_code), 'tr');
    });

    const filtered = results.filter((r) =>
        stokId
        || r.net_ihtiyac > 0
        || r.brut_ihtiyac > 0
        || r.safety_stock > 0
        || r.reorder_point > 0
        || r.available_stock !== 0
        || r.acik_satinalma > 0
        || r.planlanan_production > 0);

    log.info('DONE', `${filtered.length} sonuç satırı · net>0: ${filtered.filter((r) => r.net_ihtiyac > 0).length}`);

    return { results: filtered, messages: log.messages, parametre: p };
}

/**
 * Geriye uyum: eski çağrılar dizi bekliyor olabilir.
 */
async function mrpHesaplaListe(pool, opts = {}) {
    const out = await mrpHesapla(pool, opts);
    return out.results;
}

/**
 * MRP çalıştır ve sonuçları kaydet.
 */
async function mrpCalistir(client, {
    firmaId = null,
    isYeriId = null,
    description = null,
    created_by = null,
    parametre = {},
    notes = null,
} = {}) {
    const { sonrakiKod } = require('../utils/kodUretici');
    const p = defaultMrpParametre(parametre);
    if (notes != null) p.notes = String(notes);

    // Geçersiz firma / iş yeri FK kırılmasın
    let safeFirma = firmaId ? Number(firmaId) : null;
    let safeIsYeri = isYeriId ? Number(isYeriId) : null;
    if (safeFirma) {
        const f = await client.query('SELECT id FROM companies WHERE id=$1', [safeFirma]);
        if (!f.rows[0]) safeFirma = null;
    }
    if (safeIsYeri) {
        const iy = await client.query('SELECT id FROM plants WHERE id=$1', [safeIsYeri]);
        if (!iy.rows[0]) safeIsYeri = null;
    }

    const no = await sonrakiKod(client, 'MRP_CALISMA');
    const ins = await client.query(
        `INSERT INTO mrp_runs
            (run_no, company_id, plant_id, status, parametre_json, description, created_by,
             start_date, end_date, notes)
         VALUES ($1,$2,$3,'Calisiyor',$4::jsonb,$5,$6,$7::date,$8::date,$9)
         RETURNING *`,
        [
            no, safeFirma, safeIsYeri, JSON.stringify(p), description, created_by,
            p.start_date, p.end_date, p.notes || null,
        ]
    );
    const calisma = ins.rows[0];

    let out;
    try {
        out = await mrpHesapla(client, { firmaId: safeFirma, isYeriId: safeIsYeri, parametre: p });
    } catch (err) {
        await client.query(
            `UPDATE mrp_runs SET status='Hata', end_ts=CURRENT_TIMESTAMP,
                notes = COALESCE(notes,'') || $2
             WHERE id=$1`,
            [calisma.id, `\nHata: ${err.message}`]
        );
        throw err;
    }

    const liste = out.results;
    let netPozitif = 0;
    for (const r of liste) {
        if (r.net_ihtiyac > 0) netPozitif += 1;
        await client.query(
            `INSERT INTO mrp_results (
                run_id, item_id, seviye, source_item_id,
                brut_ihtiyac, bagimsiz_ihtiyac, bagimli_ihtiyac,
                safety_stock, reorder_point, available_stock,
                acik_satinalma, planlanan_production, net_ihtiyac, onerilen_quantity,
                oneri, ihtiyac_date, planlanan_start, uom_code
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
             )`,
            [
                calisma.id, r.item_id, r.level ?? 0, r.source_item_id,
                r.brut_ihtiyac, r.bagimsiz_ihtiyac, r.bagimli_ihtiyac,
                r.safety_stock, r.reorder_point, r.available_stock,
                r.acik_satinalma, r.planlanan_production, r.net_ihtiyac, r.onerilen_quantity,
                r.oneri, r.ihtiyac_date, r.planlanan_start, r.uom_code,
            ]
        );
    }

    for (const m of out.messages || []) {
        await client.query(
            `INSERT INTO mrp_run_messages (run_id, level, code, message)
             VALUES ($1,$2,$3,$4)`,
            [calisma.id, m.level || 'INFO', m.code || null, m.message]
        );
    }

    const upd = await client.query(
        `UPDATE mrp_runs SET
            status = 'Tamamlandi',
            end_ts = CURRENT_TIMESTAMP,
            line_sayisi = $2,
            net_pozitif = $3,
            parametre_json = $4::jsonb
         WHERE id = $1 RETURNING *`,
        [calisma.id, liste.length, netPozitif, JSON.stringify(p)]
    );

    const msgs = await client.query(
        `SELECT * FROM mrp_run_messages WHERE run_id=$1 ORDER BY id`,
        [calisma.id]
    );

    return {
        calisma: upd.rows[0],
        sonuclar: liste,
        messages: msgs.rows,
        parametre: p,
    };
}

module.exports = {
    mrpHesapla: mrpHesaplaListe,
    mrpHesaplaDetay: mrpHesapla,
    mrpCalistir,
    loadIndependentDemand,
    defaultMrpParametre,
};
