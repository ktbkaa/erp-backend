const { depoBakiyeListesi } = require('./stokHareketService');

/**
 * MRP motoru (klasik + Canias/Odoo sadeleştirilmiş):
 * 1) Bağımsız ihtiyaç (manuel BI + açık satış siparişi kalanı)
 * 2) BOM patlatma → bağımlı ihtiyaç
 * 3) Brüt → net (eldeki + açık SA + açık UE − emniyet − ROP)
 * 4) Öneri: Satınalma / Üretim emri / Yeterli
 */

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
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

async function loadStokMap(pool, { stokId = null, firmaId = null } = {}) {
    const params = [];
    let where = 'WHERE s.is_active IS DISTINCT FROM FALSE';
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
                COALESCE(s.temin_suresi_days, 0)::int AS temin_suresi_days
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

async function loadSupplyMaps(pool, { isYeriId = null, stokId = null } = {}) {
    const bakiyeler = await depoBakiyeListesi(pool, { stokStatu: 'Kullanilabilir', stokId });
    const kullanilabilir = new Map();
    for (const b of bakiyeler) {
        const k = String(b.item_id);
        kullanilabilir.set(k, (kullanilabilir.get(k) || 0) + num(b.bakiye));
    }

    const sas = await pool.query(
        `SELECT ss.item_id,
                SUM(GREATEST(ss.quantity - COALESCE(ss.giren_quantity,0), 0))::numeric AS acik_siparis
         FROM purchase_order_lines ss
         JOIN purchase_orders s ON s.id = ss.purchase_order_id
         WHERE s.status NOT IN ('Iptal', 'Kapali')
         GROUP BY ss.item_id`
    );
    const acikSiparis = new Map(sas.rows.map((r) => [String(r.item_id), num(r.acik_siparis)]));

    let ueSql = `
        SELECT item_id,
               SUM(GREATEST(planlanan_quantity - COALESCE(produced_quantity,0), 0))::numeric AS plan_uretim
        FROM production_orders
        WHERE status NOT IN ('Kapali', 'Iptal', 'Tamamlandi')`;
    const ueParams = [];
    if (isYeriId) {
        ueParams.push(isYeriId);
        ueSql += ` AND plant_id = $${ueParams.length}`;
    }
    ueSql += ' GROUP BY item_id';
    const ueArz = await pool.query(ueSql, ueParams).catch(() => ({ rows: [] }));
    const planUretim = new Map(ueArz.rows.map((r) => [String(r.item_id), num(r.plan_uretim)]));

    return { kullanilabilir, acikSiparis, planUretim };
}

/**
 * Bağımsız ihtiyaç: manuel BI + açık satış siparişi kalan quantity
 */
async function loadIndependentDemand(pool, { isYeriId = null, firmaId = null } = {}) {
    const demand = new Map(); // stokId -> { qty, date, sources: [] }

    const bump = (stokId, qty, date, source) => {
        const k = String(stokId);
        if (!demand.has(k)) demand.set(k, { qty: 0, date: date || null, sources: [] });
        const d = demand.get(k);
        d.qty += num(qty);
        if (date && (!d.date || date < d.date)) d.date = date;
        d.sources.push(source);
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
    try {
        const bi = await pool.query(biSql, biParams);
        bi.rows.forEach((r) => {
            bump(r.item_id, r.quantity, toDateStr(r.ihtiyac_date), `BI:${r.ihtiyac_no}`);
        });
    } catch (_) {
        // tablo yoksa (migrate öncesi) atla
    }

    // Açık satış siparişi kalanı
    const soParams = [];
    let soSql = `
        SELECT sd.item_id,
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
    soSql += ' GROUP BY sd.item_id';
    const so = await pool.query(soSql, soParams).catch(() => ({ rows: [] }));
    so.rows.forEach((r) => {
        if (num(r.kalan) > 0) {
            bump(r.item_id, r.kalan, toDateStr(r.ihtiyac_date), 'SatışSipariş');
        }
    });

    return demand;
}

function lotSize(net, stok) {
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
 * @returns {Promise<object[]>} sonuç satırları
 */
async function mrpHesapla(pool, {
    isYeriId = null,
    firmaId = null,
    stokId = null,
} = {}) {
    const stokMap = await loadStokMap(pool, { stokId: null, firmaId });
    const bomByParent = await loadBomChildren(pool);
    const { kullanilabilir, acikSiparis, planUretim } = await loadSupplyMaps(pool, { isYeriId, stokId });
    const independent = await loadIndependentDemand(pool, { isYeriId, firmaId });

    // brüt = bağımsız + bağımlı
    const bagimsiz = new Map();
    const bagimli = new Map();
    const parentOf = new Map(); // child -> one parent (gösterim)
    const needDate = new Map();

    independent.forEach((d, k) => {
        bagimsiz.set(k, (bagimsiz.get(k) || 0) + d.qty);
        if (d.date) needDate.set(k, d.date);
    });

    // Açık üretim emri bileşenleri → bağımlı ihtiyaç (çift patlatma yok)
    try {
        let bSql = `
            SELECT ub.item_id,
                   SUM(GREATEST(ub.planlanan_quantity - COALESCE(ub.tuketilen_quantity,0), 0))::numeric AS ihtiyac
            FROM production_order_components ub
            JOIN production_orders ue ON ue.id = ub.order_id
            WHERE ue.status NOT IN ('Kapali', 'Iptal', 'Tamamlandi')`;
        const bParams = [];
        if (isYeriId) {
            bParams.push(isYeriId);
            bSql += ` AND ue.plant_id = $${bParams.length}`;
        }
        bSql += ' GROUP BY ub.item_id';
        const br = await pool.query(bSql, bParams);
        br.rows.forEach((r) => {
            const cid = String(r.item_id);
            bagimli.set(cid, (bagimli.get(cid) || 0) + num(r.ihtiyac));
        });
    } catch (_) { /* ignore */ }

    // Patlatma: üretim tipi bağımsız ihtiyaçlar → bileşen bağımlı ihtiyaç
    const queue = [];
    independent.forEach((d, k) => {
        const st = stokMap.get(k);
        if (st && isUretim(st) && d.qty > 0) queue.push({ stokId: k, qty: d.qty, date: d.date, depth: 0 });
    });

    const visitedExplosion = new Set();
    while (queue.length) {
        const job = queue.shift();
        const key = `${job.stokId}:${job.qty}:${job.depth}`;
        if (visitedExplosion.has(key) || job.depth > 12) continue;
        visitedExplosion.add(key);

        const children = bomByParent.get(String(job.stokId)) || [];
        const parent = stokMap.get(String(job.stokId));
        for (const ch of children) {
            const baz = num(ch.baz_miktar) || 1;
            const need = (num(ch.bilesen_miktar) / baz) * num(job.qty);
            if (need <= 0) continue;
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
                // Alt mamul için de patlat (brüt bağımlı üzerinden)
                queue.push({ stokId: cid, qty: need, date: childDate, depth: job.depth + 1 });
            }
        }
    }

    // Tüm ilgili items
    const ids = new Set([
        ...bagimsiz.keys(),
        ...bagimli.keys(),
        ...[...stokMap.keys()].filter((id) => {
            const s = stokMap.get(id);
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
        const bi = bagimsiz.get(id) || 0;
        const bd = bagimli.get(id) || 0;
        const emniyet = num(s.safety_stock);
        const rop = num(s.reorder_level);
        const eldeki = kullanilabilir.get(id) || 0;
        const siparis = acikSiparis.get(id) || 0;
        const uretim = planUretim.get(id) || 0;
        const brut = bi + bd;
        // ROP: eldeki + arz < ROP ise farkı nete ekle
        const ropGap = rop > 0 ? Math.max(0, rop - (eldeki + siparis + uretim)) : 0;
        const netRaw = Math.max(0, brut + emniyet + ropGap - eldeki - siparis - uretim);
        const onerilen = lotSize(netRaw, s);
        let oneri = 'Yeterli';
        if (onerilen > 0) oneri = isUretim(s) ? 'Üretim emri' : 'Satınalma';

        const ihtiyacTarihi = needDate.get(id) || null;
        const planlananBaslangic = ihtiyacTarihi
            ? addDays(ihtiyacTarihi, -num(s.temin_suresi_days))
            : addDays(null, -num(s.temin_suresi_days));

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
            reorder_point: rop,
            available_stock: eldeki,
            acik_satinalma: siparis,
            planlanan_production: uretim,
            acik_uretim_ihtiyaci: bd, // geriye uyum (eski kolon)
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

    return results.filter((r) =>
        stokId
        || r.net_ihtiyac > 0
        || r.brut_ihtiyac > 0
        || r.safety_stock > 0
        || r.reorder_point > 0
        || r.available_stock !== 0
        || r.acik_satinalma > 0
        || r.planlanan_production > 0);
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
} = {}) {
    const { sonrakiKod } = require('../utils/kodUretici');
    const no = await sonrakiKod(client, 'MRP_CALISMA');
    const ins = await client.query(
        `INSERT INTO mrp_runs
            (run_no, company_id, plant_id, status, parametre_json, description, created_by)
         VALUES ($1,$2,$3,'Calisiyor',$4::jsonb,$5,$6)
         RETURNING *`,
        [no, firmaId, isYeriId, JSON.stringify(parametre || {}), description, created_by]
    );
    const calisma = ins.rows[0];

    const liste = await mrpHesapla(client, { firmaId, isYeriId });
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
                calisma.id, r.item_id, r.level ?? r.seviye ?? 0, r.source_item_id,
                r.brut_ihtiyac, r.bagimsiz_ihtiyac, r.bagimli_ihtiyac,
                r.safety_stock, r.reorder_point, r.available_stock,
                r.acik_satinalma, r.planlanan_production, r.net_ihtiyac, r.onerilen_quantity,
                r.oneri, r.ihtiyac_date, r.planlanan_start, r.uom_code,
            ]
        );
    }

    const upd = await client.query(
        `UPDATE mrp_runs SET
            status = 'Tamamlandi',
            end_ts = CURRENT_TIMESTAMP,
            line_sayisi = $2,
            net_pozitif = $3
         WHERE id = $1 RETURNING *`,
        [calisma.id, liste.length, netPozitif]
    );
    return { calisma: upd.rows[0], sonuclar: liste };
}

module.exports = {
    mrpHesapla,
    mrpCalistir,
    loadIndependentDemand,
};
